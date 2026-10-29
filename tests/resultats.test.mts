// Écran « Résultats » (décision du 29 octobre) : mesures du dirigeant, rattachement de l'objectif, situation de départ, cible et
// écart, facteurs, comparaison au marché. Les valeurs attendues sont posées à la main (240 000 € + 10 % = 264 000 €), sans
// reprendre le code testé.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import { equivalences, lecturePartagee, questionsLiees } from "../src/lib/audit/partages.ts";
import { mesurer, type ContexteEvolution } from "../src/lib/moteur/evolution.ts";
import type { Mois } from "../src/lib/audit/periodes.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";
import type { ObjectifTransmis } from "../src/lib/audit/objectifs-proposes.ts";
import { composerResultats, formaterValeur, rattacherMesure, type MesureDuCompte } from "../src/lib/resultats/resultats.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const mois = (annee: number, m: number): Mois => annee * 12 + m - 1;
const OCT_2026 = mois(2026, 10);
const exact = (valeur: number) => ({ genre: "exact" as const, valeur });
const valeurs = (v: Record<string, number | string | null>) => ({ genre: "valeurs" as const, valeurs: v });
const DOUZE = ["le_mois_dernier", ...Array.from({ length: 11 }, (_, k) => `il_y_a_${k + 2}_mois`)];
const mesure = (id: string) => reel.mesures.mesures.find((m) => m.id === id)!;
// 12 mois à 20 000 € : 240 000 €.
const CA_12 = valeurs(Object.fromEntries(DOUZE.map((l) => [`${l}.chiffre_d_affaires`, 20000])));

function contexte(reponses: Reponses, o: Partial<ContexteEvolution> = {}): ContexteEvolution {
  return {
    reponses,
    ancrages: new Map(Object.keys(reponses).map((c) => [c, OCT_2026])),
    aujourdhui: OCT_2026,
    creation: mois(2016, 3),
    ancienneteMois: 127,
    donnees: new Map(reel.donnees.map((d) => [d.code, d])),
    partage: lecturePartagee(reel, reponses, equivalences(reel)),
    liees: questionsLiees(reel, equivalences(reel)),
    posees: new Set(reel.donnees.map((d) => d.code)),
    lignesActuelles: () => null,
    nomDe: (c) => `question ${c}`,
    effectifActuel: 6,
    ...o,
  };
}

function duCompte(reponses: Reponses, agent: string, o: Partial<ContexteEvolution> = {}): MesureDuCompte[] {
  const ctx = contexte(reponses, o);
  return reel.mesures.mesures
    .filter((m) => m.agents.includes(agent as never))
    .map((m) => ({ mesure: m, calcul: mesurer(m.source, ctx, m.periode?.texte), posee: true, questions: [`question ${m.code}`], libellesLignes: { instagram: "Instagram", whatsapp: "WhatsApp" } }));
}

function objectif(o: Partial<ObjectifTransmis> & { quoi: string }): ObjectifTransmis & { id: string } {
  return {
    id: "obj1",
    origine: "libre",
    phrase: o.quoi,
    proposition: null,
    mesure: o.ampleur ? "chiffre" : "reussite",
    ampleur: null,
    reussite: null,
    delaiMois: 12,
    echeance: "2027-10-29",
    indicateur: null,
    themes: [],
    partie: null,
    ...o,
  };
}

const VIDE = { notes: [], avecRepere: [], aCompleter: [] };

test("mesures : le registre passe le contrôle des données", () => {
  assert.deepEqual(controlerDonnees(reel).erreurs, []);
  assert.ok(reel.mesures.mesures.length >= 30);
});

test("mesurer : somme de mois, estimation, taux, aucune case vide ni « je ne sais pas » ne vaut zéro", () => {
  const ctx = contexte({ "ACQ-23.01": CA_12, "ACQ-02.01": { genre: "estimation", min: 30, max: 50 }, "ACQ-11.01": exact(8) });
  const ca = mesurer(mesure("chiffre-affaires-12-mois").source, ctx);
  assert.equal(ca.statut === "mesuree" && ca.valeur, 240000);
  assert.equal(ca.statut === "mesuree" && ca.periode, "octobre 2025 à septembre 2026");
  const demandes = mesurer(mesure("demandes-par-mois").source, ctx);
  assert.ok(demandes.statut === "mesuree" && demandes.valeur === 40 && demandes.estimee, "milieu de la fourchette, marqué estimé");
  const taux = mesurer(mesure("taux-transformation").source, ctx);
  assert.ok(taux.statut === "mesuree" && taux.valeur === 20 && taux.estimee, "8 ÷ 40 = 20 %, estimé car le dénominateur l'est");

  const trou = valeurs({ ...CA_12.valeurs, "il_y_a_5_mois.chiffre_d_affaires": null });
  const m = mesurer(mesure("chiffre-affaires-12-mois").source, contexte({ "ACQ-23.01": trou }));
  assert.equal(m.statut, "manquante");
  assert.match(m.statut === "manquante" ? m.raison : "", /un mois vide ne compte pas pour zéro/);
  const inconnu = mesurer(mesure("demandes-par-mois").source, contexte({ "ACQ-02.01": { genre: "inconnu" } }));
  assert.match(inconnu.statut === "manquante" ? inconnu.raison : "", /je ne sais pas/);
  const zero = mesurer(mesure("taux-transformation").source, contexte({ "ACQ-11.01": exact(3), "ACQ-02.01": exact(0) }));
  assert.match(zero.statut === "manquante" ? zero.raison : "", /vaut zéro/);
});

test("mesurer : lignes vides d'un tableau à catégories fixes, réponses de mois différents", () => {
  const msg = mesurer(mesure("messages-par-mois").source, contexte({ "COM-23.01": valeurs({ "instagram.messages_par_mois": 12, "whatsapp.messages_par_mois": 30, "linkedin.messages_par_mois": null }) }));
  assert.ok(msg.statut === "mesuree" && msg.valeur === 42);
  assert.deepEqual(msg.statut === "mesuree" && msg.lignes?.sort(), ["instagram", "whatsapp"]);
  const rien = mesurer(mesure("messages-par-mois").source, contexte({ "COM-23.01": valeurs({}) }));
  assert.equal(rien.statut, "manquante");
  // Nouveaux clients répondus en août, demandes en octobre : le taux ne mélange pas deux périodes.
  const ancrages = new Map([["ACQ-11.01", mois(2026, 8)], ["ACQ-02.01", OCT_2026]]);
  const decale = mesurer(mesure("taux-transformation").source, contexte({ "ACQ-11.01": exact(8), "ACQ-02.01": exact(40) }, { ancrages }));
  assert.match(decale.statut === "manquante" ? decale.raison : "", /mois différents \(août 2026, octobre 2026\)/);
});

test("rattachement : proposition déclarée, mots d'un objectif libre, égalité sans choix", () => {
  const acq = reel.mesures.mesures.filter((m) => m.agents.includes("ACQUISITION_CA"));
  const com = reel.mesures.mesures.filter((m) => m.agents.includes("COMM_CREATION"));
  assert.equal(rattacherMesure({ origine: "proposition", proposition: { id: "com-audience", libelle: "" }, quoi: "x" }, com)?.mesure.id, "abonnes-reseaux");
  assert.equal(rattacherMesure({ origine: "proposition", proposition: { id: "com-portee", libelle: "" }, quoi: "Augmenter la portée" }, com), null, "proposition sans mesure déclarée");
  assert.equal(rattacherMesure({ origine: "libre", proposition: null, quoi: "Augmenter mon chiffre d'affaires" }, acq)?.mesure.id, "chiffre-affaires-12-mois");
  assert.equal(rattacherMesure({ origine: "libre", proposition: null, quoi: "augmenter mon CA" }, acq)?.mesure.id, "chiffre-affaires-12-mois");
  assert.equal(rattacherMesure({ origine: "libre", proposition: null, quoi: "Signer plus de devis signés" }, acq)?.mesure.id, "devis-acceptes-par-mois");
  assert.equal(rattacherMesure({ origine: "libre", proposition: null, quoi: "Gagner en sérénité" }, acq), null);
  assert.equal(rattacherMesure({ origine: "personnel", proposition: null, quoi: "Plus d'avis et une meilleure note" }, com), null, "deux mesures à égalité : aucune");
});

test("objectif libre en % sur le chiffre d'affaires : départ, cible et écart calculés", () => {
  const v = composerResultats({
    agent: "ACQUISITION_CA",
    aujourdhui: "2026-10-29",
    objectifs: [objectif({ quoi: "Augmenter mon chiffre d'affaires", ampleur: { valeur: 10, unite: "pourcent" } })],
    mesures: duCompte({ "ACQ-23.01": CA_12, "ACQ-02.01": exact(40), "ACQ-11.01": exact(8) }, "ACQUISITION_CA"),
    evolutions: [],
    compteRendu: VIDE,
  });
  const o = v.objectifs[0];
  assert.equal(o.mesure?.id, "chiffre-affaires-12-mois");
  assert.deepEqual([o.cible?.depart, o.cible?.cible, o.cible?.ecart], [240000, 264000, 24000]);
  assert.equal(o.cible?.calcul, `${formaterValeur(240000, "euros")} + 10 %`);
  assert.equal(o.moisRestants, 12);
  assert.deepEqual(o.limites, []);
  // Les autres chiffres de l'agent sont des facteurs ; la mesure de l'objectif n'y est pas répétée.
  const ids = [...v.facteursObjectif, ...v.autresFacteurs].map((f) => f.id);
  assert.ok(ids.includes("demandes-par-mois") && ids.includes("taux-transformation") && !ids.includes("chiffre-affaires-12-mois"));
  assert.ok(v.manquantes.some((m) => m.id === "devis-envoyes-par-mois"), "une mesure sans réponse est listée comme manquante, jamais à zéro");
});

test("objectif sans cible calculable : montant sans période, % sur un taux, sens inconnu, mesure manquante", () => {
  const mesures = duCompte({ "ACQ-23.01": CA_12, "ACQ-02.01": exact(40), "ACQ-11.01": exact(8) }, "ACQUISITION_CA");
  const un = (o: ObjectifTransmis & { id: string }) => composerResultats({ agent: "ACQUISITION_CA", aujourdhui: "2026-10-29", objectifs: [o], mesures, evolutions: [], compteRendu: VIDE }).objectifs[0];
  const euros = un(objectif({ quoi: "Augmenter mon chiffre d'affaires", ampleur: { valeur: 20000, unite: "euros" } }));
  assert.equal(euros.cible, null);
  assert.equal(euros.mesure?.valeur, 240000, "la situation de départ reste donnée");
  assert.match(euros.limites[0], /quelle période porte ce montant/);
  const taux = un(objectif({ quoi: "Augmenter mon taux de transformation", ampleur: { valeur: 5, unite: "pourcent" } }));
  assert.equal(taux.cible, null);
  assert.match(taux.limites[0], /5 points de plus ou comme une hausse de 5 %/);
  const sens = un(objectif({ quoi: "Chiffre d'affaires", ampleur: { valeur: 10, unite: "pourcent" } }));
  assert.match(sens.limites[0], /sens du changement/);
  const devis = un(objectif({ quoi: "Augmenter les devis acceptés", ampleur: { valeur: 10, unite: "pourcent" } }));
  assert.equal(devis.mesure, null);
  assert.equal(devis.mesureManquante?.id, "devis-acceptes-par-mois");
  assert.match(devis.limites[0], /situation de départ n'est pas encore connue/);
  const libre = un(objectif({ quoi: "Développer ma notoriété", ampleur: { valeur: 10, unite: "pourcent" } }));
  assert.match(libre.limites[0], /Aucune question de votre questionnaire ne mesure exactement cet objectif/);
});

test("objectifs RH et Comm : proposition chiffrée, baisse, objectif personnel sans chiffre", () => {
  const com = composerResultats({
    agent: "COMM_CREATION",
    aujourdhui: "2026-10-29",
    objectifs: [objectif({ origine: "proposition", proposition: { id: "com-audience", libelle: "Augmenter mon nombre d'abonnés" }, quoi: "Augmenter mon nombre d'abonnés", phrase: "gagner 200 abonnés d'ici 6 mois", ampleur: { valeur: 200, unite: "unites" }, delaiMois: 6, echeance: "2027-04-29", themes: ["COM-37"] })],
    mesures: duCompte({ "COM-17.01": valeurs({ "instagram.abonnes": 700, "facebook.abonnes": 300, "instagram.personnes_touchees_par_mois_moyenne_des_": 2000, "facebook.personnes_touchees_par_mois_moyenne_des_": 500 }) }, "COMM_CREATION"),
    evolutions: [],
    compteRendu: VIDE,
  });
  assert.deepEqual([com.objectifs[0].cible?.depart, com.objectifs[0].cible?.cible, com.objectifs[0].cible?.ecart], [1000, 1200, 200]);
  assert.ok(com.facteursObjectif.some((f) => f.id === "personnes-touchees-par-mois"), "la portée partage le thème de l'objectif");

  const rh = composerResultats({
    agent: "RH_ORGANISATION",
    aujourdhui: "2026-10-29",
    objectifs: [objectif({ origine: "proposition", proposition: { id: "rh-turnover", libelle: "Réduire les départs de salariés" }, quoi: "Réduire les départs de salariés", ampleur: { valeur: 50, unite: "pourcent" }, themes: ["RH-32"] })],
    mesures: duCompte({ "RH-32.01": valeurs({ "demission.departs": 3, "fin_de_contrat.departs": 1 }) }, "RH_ORGANISATION"),
    evolutions: [],
    compteRendu: VIDE,
  });
  assert.deepEqual([rh.objectifs[0].cible?.depart, rh.objectifs[0].cible?.cible, rh.objectifs[0].cible?.ecart], [4, 2, -2]);
  const rhNombre = composerResultats({
    agent: "RH_ORGANISATION",
    aujourdhui: "2026-10-29",
    objectifs: [objectif({ origine: "proposition", proposition: { id: "rh-turnover", libelle: "" }, quoi: "Réduire les départs de salariés", ampleur: { valeur: 1, unite: "unites" } })],
    mesures: duCompte({ "RH-32.01": valeurs({ "demission.departs": 3 }) }, "RH_ORGANISATION"),
    evolutions: [],
    compteRendu: VIDE,
  });
  assert.equal(rhNombre.objectifs[0].cible, null, "« réduire de 1 le nombre de départs » ne dit pas sur quelle période");

  const perso = composerResultats({
    agent: "RH_ORGANISATION",
    aujourdhui: "2026-10-29",
    objectifs: [objectif({ origine: "personnel", quoi: "Que chacun sache qui fait quoi", reussite: "plus personne ne me demande", delaiMois: 3, echeance: "2027-01-29" })],
    mesures: duCompte({}, "RH_ORGANISATION"),
    evolutions: [],
    compteRendu: VIDE,
  });
  assert.equal(perso.objectifs[0].changement, null);
  assert.equal(perso.objectifs[0].cible, null);
  assert.equal(perso.objectifs[0].reussite, "plus personne ne me demande");
  assert.match(perso.objectifs[0].limites[0], /n'a pas de chiffre/);
  assert.equal(JSON.stringify(perso).includes("%"), false, "aucun pourcentage fabriqué pour un objectif sans chiffre");
});

test("une mesure dont les questions ne sont pas posées au compte n'est ni montrée ni demandée", () => {
  const mesures = duCompte({ "ACQ-23.01": CA_12 }, "ACQUISITION_CA").map((m) => (m.mesure.id.startsWith("devis") || m.mesure.id === "taux-acceptation-devis" ? { ...m, posee: false } : m));
  const v = composerResultats({ agent: "ACQUISITION_CA", aujourdhui: "2026-10-29", objectifs: [objectif({ quoi: "Augmenter mon CA", ampleur: { valeur: 5, unite: "pourcent" } })], mesures, evolutions: [], compteRendu: VIDE });
  assert.ok(![...v.manquantes, ...v.facteursObjectif, ...v.autresFacteurs].some((x) => x.id.includes("devis")));
});

test("comparaison au marché : seulement avec un repère enregistré, à côté de la valeur du même indicateur", () => {
  const mesures = duCompte({ "ACQ-10.01": valeurs({ nombre_par_mois: 20, montant_total_par_mois: 30000 }), "ACQ-10.03": valeurs({ nombre_par_mois: 6, montant_total_par_mois: 9000 }) }, "ACQUISITION_CA");
  const sans = composerResultats({ agent: "ACQUISITION_CA", aujourdhui: "2026-10-29", objectifs: [], mesures, evolutions: [], compteRendu: VIDE });
  assert.deepEqual(sans.marche, []);
  const repere = { indicateur: "ACQ-10.13", libelle: "Part des devis acceptés : 35 % (fictif)", organisme: "Organisme fictif", annee: "2025", url: "https://exemple.invalid", confiance: "indicatif" as const, perimee: false };
  const ligne = { code: "ACQ-10", nom: "Devis et relances", bloc: null, couleur: null, aValider: false, estimee: false, message: null, reperes: [repere], couverture: null };
  const avec = composerResultats({ agent: "ACQUISITION_CA", aujourdhui: "2026-10-29", objectifs: [], mesures, evolutions: [], compteRendu: { notes: [], avecRepere: [ligne], aCompleter: [] } });
  assert.equal(avec.marche.length, 1);
  assert.equal(avec.marche[0].valeur?.id, "taux-acceptation-devis");
  assert.equal(avec.marche[0].valeur?.valeur, 30, "6 ÷ 20 = 30 %");
});

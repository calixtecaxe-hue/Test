// Données partagées entre agents (src/lib/audit/partages.ts, data/partages.json) : jumelles, liens du classeur qui ne sont pas
// des partages, correspondances partie à partie, et contrôle des données.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import { assemblerQuestionnaire } from "../src/lib/audit/assemblage.ts";
import { equivalences, lecturePartagee, liensDuClasseur } from "../src/lib/audit/partages.ts";
import { constaterAgent } from "../src/lib/moteur/constat.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";
import type { CodeAgent, ProfilId } from "../src/lib/donnees/schemas.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const exact = (valeur: number) => ({ genre: "exact" as const, valeur });
const saisie = (valeur: string | string[]) => ({ genre: "saisie" as const, valeur });
const valeurs = (v: Record<string, number | string | null>) => ({ genre: "valeurs" as const, valeurs: v });

function question(agent: CodeAgent, code: string, reponses: Reponses, profils: ProfilId[] = ["chantier"]) {
  const a = assemblerQuestionnaire(reel, { agent, profils, taille: "equipe_2_5", niveau: "approfondi", reponses });
  return [...a.prealables, ...a.themes.flatMap((t) => t.questions)].find((q) => q.code === code);
}

test("partages : les six liens du classeur qui ne sont pas des partages ne rendent aucune question « déjà renseignée »", () => {
  const eq = equivalences(reel, { profils: ["chantier"], vocabulaire: null });
  for (const [a, b] of [["ACQ-21.03", "RH-07.01"], ["ACQ-21.04", "RH-06.02"], ["ACQ-21.04", "RH-05.01"], ["FIN-06.02", "ACQ-11.07"], ["COM-13.01", "ACQ-02.01"], ["COM-44.01", "ACQ-06.08"]]) {
    assert.equal(eq.get(a)?.has(b) ?? false, false, `${a} et ${b}`);
    assert.equal(eq.get(b)?.has(a) ?? false, false, `${b} et ${a}`);
  }
  // Mêmes réponses qu'à l'écran (scripts/verification/partages.mjs).
  assert.equal(question("RH_ORGANISATION", "RH-07.01", { "ACQ-21.03": exact(30) })?.dejaPosee, false);
  const heures = { D18: saisie("oui"), "ACQ-21.04": valeurs({ heures_travaillees: 300, heures_facturees: 250 }) };
  assert.equal(question("RH_ORGANISATION", "RH-06.02", heures)?.dejaPosee, false);
  assert.equal(question("RH_ORGANISATION", "RH-05.01", heures)?.dejaPosee, false);
  assert.equal(question("FINANCE_RENTABILITE", "FIN-06.02", { "ACQ-11.07": valeurs({ "midi.couverts_par_service": 40 }) }, ["restaurant"])?.dejaPosee, false);
  assert.equal(question("ACQUISITION_CA", "ACQ-02.01", { "COM-13.01": exact(900) })?.dejaPosee, false);
  const avis = { "COM-44.01": valeurs({ avis_au_total: 120, note_sur_5: 4.6, avis_recus_sur_les_6_derniers_mois: 18 }), "ACQ-03.01": saisie(["fiche_google", "plateformes"]) };
  assert.equal(question("ACQUISITION_CA", "ACQ-06.08", avis, ["restaurant"])?.dejaPosee, false);
});

test("partages : les vraies jumelles restent partagées", () => {
  const eq = equivalences(reel);
  for (const [a, b] of [["FIN-07.03", "ACQ-21.04"], ["COM-44.01", "ACQ-06.01"], ["COM-13.01", "ACQ-06.07"], ["FIN-01.01", "ACQ-13.01"]]) assert.ok(eq.get(a)?.has(b), `${a} et ${b}`);
  const avis = { "COM-44.01": valeurs({ avis_au_total: 120, note_sur_5: 4.6, avis_recus_sur_les_6_derniers_mois: 18 }), "ACQ-03.01": saisie(["fiche_google"]) };
  const q = question("ACQUISITION_CA", "ACQ-06.01", avis);
  assert.equal(q?.dejaPosee, true);
  assert.deepEqual(q?.sourcesPartage, ["COM-44.01"]);
});

test("partages : une jumelle de ma jumelle est ma jumelle (chiffre d'affaires mois par mois, Finance et RH sans l'Acquisition)", () => {
  const eq = equivalences(reel);
  assert.ok(eq.get("FIN-14.01")?.has("RH-11.01"));
  assert.ok(eq.get("RH-11.01")?.has("FIN-14.01"));
  const ca = { "FIN-14.01": valeurs({ "le_mois_dernier.chiffre_d_affaires": 50000 }) };
  const a = assemblerQuestionnaire(reel, { agent: "RH_ORGANISATION", profils: ["chantier"], taille: "equipe_2_5", niveau: "approfondi", reponses: ca, ancienneteMois: 120 });
  const q = a.themes.flatMap((t) => t.questions).find((x) => x.code === "RH-11.01");
  assert.equal(q?.dejaPosee, true);
  assert.deepEqual(q?.sourcesPartage, ["FIN-14.01"]);
});

test("partages : COM-13.01 et ACQ-02.01 ne sont la même donnée que pour une boutique en ligne", () => {
  assert.ok(equivalences(reel, { profils: ["ecommerce"], vocabulaire: null }).get("COM-13.01")?.has("ACQ-02.01"));
  assert.equal(equivalences(reel, { profils: ["commerce", "ecommerce"], vocabulaire: null }).get("COM-13.01")?.has("ACQ-02.01") ?? false, false, "« visiteurs en boutique »");
  assert.equal(equivalences(reel).get("COM-13.01")?.has("ACQ-02.01") ?? false, false, "sans compte, le lien ne vaut pas");
  // Réponses actives : les visites du site ne comptent que si le site existe (COM-13.10, posée quand « Site internet » n'est pas
  // coché dans les canaux) et que la Comm suit ce parcours (COM-10.07).
  const site = { "ACQ-03.01": saisie(["bouche_a_oreille"]), "COM-10.07": saisie("oui_au_moins_une_fois_par_mois"), "COM-13.10": saisie("oui"), "COM-13.01": exact(900) };
  assert.equal(question("ACQUISITION_CA", "ACQ-02.01", site, ["ecommerce"])?.dejaPosee, true);
  assert.equal(question("ACQUISITION_CA", "ACQ-02.01", site, ["chantier"])?.dejaPosee, false);
});

test("correspondances : COM-32.01 se compose des trois dépenses de l'Acquisition, et l'inverse", () => {
  // ACQ-07.01 (agence) n'est posée, et sa réponse ne compte, que si le dirigeant a de la publicité ou une agence (D04).
  const trois = { D04: saisie("oui"), "ACQ-07.01": exact(300), "ACQ-07.03": exact(200), "ACQ-07.04": exact(50) };
  const q = question("COMM_CREATION", "COM-32.01", trois);
  assert.equal(q?.dejaPosee, true);
  assert.deepEqual(q?.sourcesPartage, ["ACQ-07.03", "ACQ-07.01", "ACQ-07.04"]);
  const l = lecturePartagee(reel, trois, equivalences(reel));
  assert.deepEqual(l.reponse("COM-32.01"), valeurs({ creation_de_contenu_photographe_videaste: 200, agence_ou_prestataire_marketing: 300, outils_marketing: 50 }));

  // Une seule dépense connue : la question est posée, avec cette valeur reprise ; rien n'est enregistré à sa place.
  const une = question("COMM_CREATION", "COM-32.01", { "ACQ-07.03": exact(200) });
  assert.equal(une?.dejaPosee, false);
  assert.deepEqual(une?.reprise, { valeurs: { creation_de_contenu_photographe_videaste: 200 }, sources: ["ACQ-07.03"] });

  // Une estimation ne se place pas dans un champ : la partie reste à donner.
  const estimee = { ...trois, "ACQ-07.04": { genre: "estimation" as const, min: 40, max: 60 } };
  assert.equal(question("COMM_CREATION", "COM-32.01", estimee)?.dejaPosee, false);
  assert.equal(question("COMM_CREATION", "COM-32.01", estimee)?.reprise?.valeurs.outils_marketing, undefined);

  // Dans l'autre sens : chaque dépense de l'Acquisition se lit dans son champ.
  const com = { "COM-32.01": valeurs({ creation_de_contenu_photographe_videaste: 200, agence_ou_prestataire_marketing: 300, outils_marketing: 50 }) };
  const acq = question("ACQUISITION_CA", "ACQ-07.03", com);
  assert.equal(acq?.dejaPosee, true);
  assert.deepEqual(lecturePartagee(reel, com, equivalences(reel)).reponse("ACQ-07.03"), exact(200));
  // Un champ vide : la dépense reste demandée.
  const vide = { "COM-32.01": valeurs({ creation_de_contenu_photographe_videaste: 200, agence_ou_prestataire_marketing: null, outils_marketing: 50 }) };
  assert.equal(lecturePartagee(reel, vide, equivalences(reel)).reponse("ACQ-07.01"), undefined);
  // « Je ne sais pas » pour le groupe vaut pour chacune de ses dépenses.
  assert.deepEqual(lecturePartagee(reel, { "COM-32.01": { genre: "inconnu" } }, equivalences(reel)).reponse("ACQ-07.04"), { genre: "inconnu" });
});

test("correspondances : une ligne du tableau ACQ-20.02 répond à FIN-34.02 et COM-43.01 ; le tableau reprend leurs réponses", () => {
  const tableau = { "ACQ-20.02": valeurs({ "chiffres_commerciaux_demandes_clients_ch.frequence": "chaque_semaine", "chiffres_financiers_tresorerie_marge_cha.frequence": "chaque_mois", "statistiques_de_communication.frequence": "jamais" }) };
  const l = lecturePartagee(reel, tableau, equivalences(reel));
  assert.deepEqual(l.reponse("FIN-34.02"), saisie("chaque_mois"));
  assert.deepEqual(l.reponse("COM-43.01"), saisie("jamais"));
  assert.equal(question("FINANCE_RENTABILITE", "FIN-34.02", tableau)?.dejaPosee, true);
  // Les deux questions répondues : le tableau reste posé (la ligne des chiffres commerciaux manque), avec leurs réponses reprises.
  const deux = { "COM-10.07": saisie("oui_au_moins_une_fois_par_mois"), "FIN-34.02": saisie("chaque_mois"), "COM-43.01": saisie("jamais") };
  const t = question("ACQUISITION_CA", "ACQ-20.02", deux);
  assert.equal(t?.dejaPosee, false);
  assert.deepEqual(t?.reprise?.valeurs, { "chiffres_financiers_tresorerie_marge_cha.frequence": "chaque_mois", "statistiques_de_communication.frequence": "jamais" });
});

test("correspondances : la répartition par canal de la Comm se compose des trois tableaux de l'Acquisition, colonne par colonne", () => {
  const acq = {
    "ACQ-03.01": saisie(["bouche_a_oreille", "fiche_google"]),
    "ACQ-03.02": valeurs({ "bouche_a_oreille.part_des_demandes": 60, "fiche_google.part_des_demandes": 40 }),
    "ACQ-03.03": valeurs({ "bouche_a_oreille.part_des_nouveaux_clients": 70, "fiche_google.part_des_nouveaux_clients": 30 }),
    "ACQ-03.04": valeurs({ "bouche_a_oreille.part_du_chiffre_d_affaires": 80, "fiche_google.part_du_chiffre_d_affaires": 20 }),
  };
  const l = lecturePartagee(reel, acq, equivalences(reel));
  assert.deepEqual(l.reponse("COM-12.01"), valeurs({
    "bouche_a_oreille.part_des_demandes": 60, "fiche_google.part_des_demandes": 40,
    "bouche_a_oreille.part_des_nouveaux_clients": 70, "fiche_google.part_des_nouveaux_clients": 30,
    "bouche_a_oreille.part_du_chiffre_d_affaires_sur_12_mois": 80, "fiche_google.part_du_chiffre_d_affaires_sur_12_mois": 20,
  }));
  // Un seul tableau répondu : la question de la Comm est posée avec cette colonne reprise (avant le 29 octobre, elle passait
  // pour « déjà renseignée » avec un seul tableau sur trois).
  const un = { "ACQ-03.01": acq["ACQ-03.01"], "ACQ-03.02": acq["ACQ-03.02"] };
  const q = question("COMM_CREATION", "COM-12.01", un);
  assert.equal(q?.dejaPosee, false);
  assert.deepEqual(q?.reprise?.valeurs, { "bouche_a_oreille.part_des_demandes": 60, "fiche_google.part_des_demandes": 40 });
  // Dans l'autre sens, la colonne est renommée.
  const com = { "COM-12.01": l.reponse("COM-12.01")! };
  assert.deepEqual(lecturePartagee(reel, com, equivalences(reel)).reponse("ACQ-03.04"), valeurs({ "bouche_a_oreille.part_du_chiffre_d_affaires": 80, "fiche_google.part_du_chiffre_d_affaires": 20 }));
});

test("correspondances : les reprises de la RH se lisent dans la Finance, champ par champ", () => {
  const fin = { "FIN-10.01": valeurs({ reprises_par_mois: 4, retours_par_mois: 1 }), "FIN-10.03": exact(2) };
  const l = lecturePartagee(reel, fin, equivalences(reel));
  assert.deepEqual(l.reponse("RH-16.01"), valeurs({ reprises_par_mois: 4, temps_moyen_d_une_reprise: 2 }));
  const rh = { "RH-16.01": valeurs({ reprises_par_mois: 4, temps_moyen_d_une_reprise: 2 }) };
  const lr = lecturePartagee(reel, rh, equivalences(reel));
  assert.deepEqual(lr.reponse("FIN-10.03"), exact(2));
  assert.equal(lr.reponse("FIN-10.01"), undefined, "FIN-10.01 a d'autres champs : elle reste posée");
  assert.deepEqual(lr.reprise("FIN-10.01"), { valeurs: { reprises_par_mois: 4 }, sources: ["RH-16.01"] });
});

test("correspondances : le moteur lit la réponse composée (un thème n'est plus « non évalué » faute de lire l'autre agent)", () => {
  const trois = { D04: saisie("oui"), "ACQ-07.01": exact(300), "ACQ-07.03": exact(200), "ACQ-07.04": exact(50) };
  const a = assemblerQuestionnaire(reel, { agent: "COMM_CREATION", profils: ["chantier"], taille: "equipe_2_5", niveau: "approfondi", reponses: trois });
  const theme = reel.donnees.find((d) => d.code === "COM-32.01")!.theme;
  const c = constaterAgent(reel, [], a, trois, { zone: "PERIURBAINE", taille: "equipe_2_5" }).find((x) => x.theme === theme);
  assert.ok(c, theme);
  assert.ok(c.couverture === null || c.couverture.repondues >= 1, "la réponse composée compte comme une réponse du thème");
});

test("contrôle des données : un lien du classeur entre deux questions différentes doit être décrit dans data/partages.json", () => {
  assert.ok(liensDuClasseur(reel).length > 30);
  const sansDeclaration = { ...reel, partages: { ...reel.partages, pasDesPartages: reel.partages.pasDesPartages.filter((p) => p.entree !== "RH-07.01") } };
  assert.ok(controlerDonnees(sansDeclaration).erreurs.some((m) => m.includes("ACQ-21.03") && m.includes("RH-07.01")));
  const mauvaiseUnite = { ...reel, partages: { ...reel.partages, correspondances: [...reel.partages.correspondances, { cle: "RH-16.01#temps_moyen_d_une_reprise", egale: "FIN-10.01#reprises_par_mois", raison: "essai" }] } };
  assert.ok(controlerDonnees(mauvaiseUnite).erreurs.some((m) => m.includes("n'attendent pas la même réponse")));
  assert.deepEqual(controlerDonnees(reel).erreurs, []);
});

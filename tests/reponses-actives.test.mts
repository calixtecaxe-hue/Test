// Réponses actives (vérification du 28 octobre) : une réponse devenue inapplicable reste en base mais ne compte plus. Les valeurs
// attendues sont posées à la main, d'après le scénario du dirigeant, sans reprendre le code testé.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { assemblerQuestionnaire, type ContexteAssemblage } from "../src/lib/audit/assemblage.ts";
import { etatTableau, reponsesActives, type ContexteActives } from "../src/lib/audit/reponses-actives.ts";
import { prereponseDe } from "../src/lib/audit/prereponse.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const saisie = (valeur: string | string[]) => ({ genre: "saisie" as const, valeur });
const nombre = (valeur: number) => ({ genre: "exact" as const, valeur });
const valeurs = (v: Record<string, number | null>) => ({ genre: "valeurs" as const, valeurs: v });
const ctxActif = (o: Partial<ContexteActives> = {}): ContexteActives => ({ profils: ["chantier"], taille: "equipe_2_5", ancienneteMois: 120, ...o });
const codes = (o: Partial<ContexteAssemblage>) => {
  const a = assemblerQuestionnaire(reel, { agent: "RH_ORGANISATION", profils: ["chantier"], taille: "equipe_2_5", niveau: "approfondi", reponses: {}, ancienneteMois: 120, ...o });
  return new Set(a.themes.flatMap((t) => t.questions.map((q) => q.code)));
};

test("chaîne A → B → C : quand A ferme B, la réponse à B ne garde pas C ouverte", () => {
  // RH-04.01 (tâches confiées) > 0 ouvre RH-04.02 (tâches reprises) ; RH-04.02 > 0 ouvre RH-04.03 (pourquoi).
  const avant: Reponses = { "RH-04.01": nombre(3), "RH-04.02": nombre(2), "RH-04.03": saisie("manque_de_competence") };
  assert.ok(codes({ reponses: avant }).has("RH-04.03"), "A > 0 et B > 0 : C est posée");
  const apres: Reponses = { ...avant, "RH-04.01": nombre(0) };
  const c = codes({ reponses: apres });
  assert.ok(!c.has("RH-04.02"), "A = 0 : B n'est plus posée");
  assert.ok(!c.has("RH-04.03"), "A = 0 : C n'est plus posée non plus, même si B gardait une réponse");
  const actives = reponsesActives(reel, apres, ctxActif());
  assert.equal(actives["RH-04.02"], undefined);
  assert.equal(actives["RH-04.03"], undefined);
  assert.deepEqual(actives["RH-04.01"], nombre(0));
  // Retour au choix précédent : les réponses gardées en base reviennent.
  assert.ok(codes({ reponses: avant }).has("RH-04.03"));
});

test("source sans réponse et inapplicable : la question qui la lit est écartée, pas « en attente »", () => {
  // D08 fournisseurs = non ferme FIN-20.03 ; FIN-20.08 lit FIN-20.03 : elle ne doit ni s'afficher, ni attendre.
  const a = assemblerQuestionnaire(reel, { agent: "FINANCE_RENTABILITE", profils: ["chantier"], taille: "equipe_2_5", niveau: "approfondi", ancienneteMois: 120, reponses: { "D08.achats": saisie("oui"), "D08.sous_traitance": saisie("non"), "D08.fournisseurs": saisie("non") } });
  const toutes = new Set(a.themes.flatMap((t) => t.questions.map((q) => q.code)));
  assert.ok(!toutes.has("FIN-20.03") && !toutes.has("FIN-20.08"));
});

test("répartition par canal : un canal retiré sort de la réponse, la répartition n'est plus juste et ne compte plus", () => {
  const base: Reponses = { "ACQ-03.01": saisie(["bouche_a_oreille", "reseaux_sociaux"]), "ACQ-03.02": valeurs({ "bouche_a_oreille.part_des_demandes": 60, "reseaux_sociaux.part_des_demandes": 40 }) };
  assert.deepEqual(reponsesActives(reel, base, ctxActif())["ACQ-03.02"], base["ACQ-03.02"], "deux canaux, 60 + 40 = 100 : la répartition compte");
  const retire = { ...base, "ACQ-03.01": saisie(["bouche_a_oreille"]) };
  assert.equal(reponsesActives(reel, retire, ctxActif())["ACQ-03.02"], undefined, "réseaux décochés : il reste 60 sur 100, la répartition ne compte plus");
  assert.deepEqual(base["ACQ-03.02"], valeurs({ "bouche_a_oreille.part_des_demandes": 60, "reseaux_sociaux.part_des_demandes": 40 }), "rien n'est modifié dans la réponse enregistrée");
});

test("répartition par canal : un canal ajouté sans valeur rend la répartition à revoir ; une case laissée vide à l'enregistrement ne l'est pas", () => {
  const avecNouveau: Reponses = { "ACQ-03.01": saisie(["bouche_a_oreille", "reseaux_sociaux", "fiche_google"]), "ACQ-03.02": valeurs({ "bouche_a_oreille.part_des_demandes": 60, "reseaux_sociaux.part_des_demandes": 40 }) };
  assert.equal(reponsesActives(reel, avecNouveau, ctxActif())["ACQ-03.02"], undefined, "fiche Google ajoutée : sa part est inconnue, rien n'est inventé ni redistribué");
  const videVolontaire: Reponses = { ...avecNouveau, "ACQ-03.02": valeurs({ "bouche_a_oreille.part_des_demandes": 60, "reseaux_sociaux.part_des_demandes": 40, "fiche_google.part_des_demandes": null }) };
  assert.ok(reponsesActives(reel, videVolontaire, ctxActif())["ACQ-03.02"], "fiche Google affichée et laissée vide à l'enregistrement : la répartition compte");
});

test("état d'un tableau : lignes nouvelles, lignes retirées, total", () => {
  const spec = reel.banque.find((q) => q.donnee === "ACQ-03.02")!.reponse;
  assert.equal(spec?.type, "tableau");
  if (spec?.type !== "tableau") return;
  const e = etatTableau(spec, { "a.part_des_demandes": 70, "b.part_des_demandes": 30 }, ["a", "c"]);
  assert.deepEqual(e.valeurs, { "a.part_des_demandes": 70 });
  assert.deepEqual(e.nouvelles, ["c"]);
  assert.equal(e.retirees, true);
  assert.equal(e.somme, 70);
  assert.equal(e.juste, false);
  assert.equal(e.utilisable, false);
  const juste = etatTableau(spec, { "a.part_des_demandes": 33.3, "b.part_des_demandes": 66.7 }, ["a", "b"]);
  assert.equal(juste.utilisable, true);
});

test("coût par canal : le coût d'un canal décoché sort du total proposé à la Finance (FIN-05.02)", () => {
  // Détail complet : publicité payante déclarée (D04), coûts par canal 0 + 150, agence 100, contenu 200, outils 80, Comm 300.
  const detail: Reponses = {
    D04: saisie("oui"),
    "ACQ-03.01": saisie(["bouche_a_oreille", "reseaux_sociaux"]),
    "ACQ-03.05": valeurs({ "bouche_a_oreille.depense_par_mois": 0, "reseaux_sociaux.depense_par_mois": 150 }),
    "ACQ-07.01": nombre(100),
    "ACQ-07.03": nombre(200),
    "ACQ-07.04": nombre(80),
    "COM-32.02": valeurs({ "community_manager.par_mois": 300 }),
  };
  const ctx = ctxActif({ profils: ["chantier"] });
  assert.equal(prereponseDe(reel.prereponses, "FIN-05.02", reponsesActives(reel, detail, ctx))?.total, 830, "0 + 150 + 100 + 200 + 80 + 300");
  const decoche = { ...detail, "ACQ-03.01": saisie(["bouche_a_oreille"]) };
  assert.equal(prereponseDe(reel.prereponses, "FIN-05.02", reponsesActives(reel, decoche, ctx))?.total, 680, "réseaux sociaux décochés : 150 € de moins");
  const sansPub = { ...detail, D04: saisie("non") };
  assert.equal(prereponseDe(reel.prereponses, "FIN-05.02", reponsesActives(reel, sansPub, ctx))?.total, 580, "plus de publicité payante : coût par canal et agence ne comptent plus");
});

test("taille : une réponse RH réservée aux 6 personnes et plus ne compte plus quand l'entreprise passe à 4", () => {
  const r: Reponses = { "RH-32.01": valeurs({ "demission.departs": 2 }) };
  assert.ok(reponsesActives(reel, r, ctxActif({ taille: "structure_6_plus" }))["RH-32.01"]);
  assert.equal(reponsesActives(reel, r, ctxActif({ taille: "equipe_2_5" }))["RH-32.01"], undefined);
});

test("sous-question de cadrage : « en service ? » gardé d'avant ne compte plus quand l'investissement repasse à « non »", () => {
  // D12 = oui ouvre « Est-il déjà en service ? » (D12.en_service) ; « oui » pose FIN-28.01 et FIN-28.02. D12 repassé à « non » :
  // la sous-question n'est plus posée, le thème FIN-28 est masqué, ses questions disparaissent.
  const fin = (reponses: Reponses) => {
    const a = assemblerQuestionnaire(reel, { agent: "FINANCE_RENTABILITE", profils: ["chantier"], taille: "equipe_2_5", niveau: "approfondi", ancienneteMois: 120, reponses });
    return new Set(a.themes.flatMap((t) => t.questions.map((q) => q.code)));
  };
  const oui: Reponses = { D12: saisie("oui"), "D12.en_service": saisie("oui"), "FIN-28.01": nombre(2) };
  assert.ok(fin(oui).has("FIN-28.01"));
  const non: Reponses = { ...oui, D12: saisie("non") };
  assert.ok(!fin(non).has("FIN-28.01") && !fin(non).has("FIN-28.02"), "investissement « non » : plus de questions sur sa mise en service");
  const actives = reponsesActives(reel, non, ctxActif());
  assert.equal(actives["D12.en_service"], undefined, "la réponse gardée à la sous-question ne compte plus");
  assert.equal(actives["FIN-28.01"], undefined, "ni la réponse à la question qu'elle ouvrait");
  assert.deepEqual(reponsesActives(reel, oui, ctxActif())["FIN-28.01"], nombre(2), "retour à « oui » : la réponse gardée compte de nouveau");
});

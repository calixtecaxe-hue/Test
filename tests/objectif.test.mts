// Tests de l'interprétation de l'objectif libre (src/lib/objectif/interpreter.ts).
// Lancer avec : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  interpreterObjectif,
  resumerObjectif,
  QUESTION_DELAI,
  QUESTION_RESULTAT,
  QUESTION_RESULTAT_ET_DELAI,
  type CodeAgent,
} from "../src/lib/objectif/interpreter.ts";

const AUJOURDHUI = new Date("2026-10-12T09:00:00Z");

function lire(texte: string, agent: CodeAgent = "ACQUISITION_CA") {
  return interpreterObjectif(texte, agent, AUJOURDHUI);
}

function complet(texte: string, agent: CodeAgent = "ACQUISITION_CA") {
  const r = lire(texte, agent);
  assert.equal(r.statut, "complet", `« ${texte} » devrait être complet : ${JSON.stringify(r)}`);
  return r.statut === "complet" ? r.objectif : (undefined as never);
}

test("passer de 10 à 15 nouveaux clients par mois dans 6 mois", () => {
  const o = complet("Je veux passer de 10 à 15 nouveaux clients par mois dans 6 mois.");
  assert.equal(o.metric, "nouveaux_clients_mensuels");
  assert.equal(o.current_value, 10);
  assert.equal(o.target_value, 15);
  assert.equal(o.target_change, 50);
  assert.equal(o.unit, "clients/mois");
  assert.equal(o.deadline.duree_mois, 6);
  assert.equal(o.deadline.echeance, "2027-04-12");
  assert.equal(o.audit_agent, "ACQUISITION_CA");
});

test("augmenter le chiffre d'affaires de 20 % dans les 12 prochains mois", () => {
  const o = complet("Je veux augmenter mon chiffre d'affaires de 20 % dans les 12 prochains mois.");
  assert.equal(o.metric, "chiffre_affaires");
  assert.equal(o.target_change, 20);
  assert.equal(o.current_value, null);
  assert.equal(o.target_value, null);
  assert.equal(o.deadline.duree_mois, 12);
});

test("améliorer la marge de 8 % d'ici la fin de l'année (Finance)", () => {
  const o = complet("Je veux améliorer ma marge de 8 % d'ici la fin de l'année.", "FINANCE_RENTABILITE");
  assert.equal(o.metric, "marge");
  assert.equal(o.target_change, 8);
  assert.equal(o.deadline.echeance, "2026-12-31");
  assert.equal(o.deadline.duree_mois, 3);
});

test("réduire le coût d'acquisition de 25 % dans les 9 prochains mois", () => {
  const o = complet("Je veux réduire mon coût d'acquisition de 25 % dans les 9 prochains mois.");
  assert.equal(o.metric, "cout_acquisition");
  assert.equal(o.target_change, -25);
  assert.equal(o.deadline.duree_mois, 9);
});

test("« améliorer » le turnover veut dire le baisser", () => {
  const o = complet("Je souhaite améliorer mon turnover de 20 % d'ici 12 mois", "RH_ORGANISATION");
  assert.equal(o.metric, "turnover");
  assert.equal(o.target_change, -20);
});

test("réduire le turnover de 20 % sur 12 mois (RH)", () => {
  const o = complet("Réduire mon turnover de 20 % sur 12 mois", "RH_ORGANISATION");
  assert.equal(o.target_change, -20);
  assert.equal(o.deadline.duree_mois, 12);
});

test("conversion des publications Instagram (Comm)", () => {
  const o = complet(
    "Augmenter de 20 % la conversion de mes publications Instagram en achats d'ici 12 mois",
    "COMM_CREATION"
  );
  assert.equal(o.metric, "conversion_publications");
  assert.equal(o.target_change, 20);
});

test("atteindre 100 nouveaux clients par mois, avec délai", () => {
  const o = complet("Je veux atteindre 100 nouveaux clients par mois d'ici 1 an");
  assert.equal(o.metric, "nouveaux_clients_mensuels");
  assert.equal(o.target_value, 100);
  assert.equal(o.target_change, null);
  assert.equal(o.deadline.duree_mois, 12);
});

test("valeur absolue en euros et nombre en lettres", () => {
  const o = complet("Gagner 5 000 € de trésorerie dans six mois", "FINANCE_RENTABILITE");
  assert.equal(o.metric, "tresorerie");
  assert.equal(o.target_delta, 5000);
  assert.equal(o.unit, "€");
  assert.equal(o.deadline.duree_mois, 6);
});

test("doubler le chiffre d'affaires en 2 ans", () => {
  const o = complet("Doubler mon chiffre d'affaires en 2 ans");
  assert.equal(o.target_change, 100);
  assert.equal(o.deadline.duree_mois, 24);
});

test("objectif vague : on demande le résultat mesurable et le délai", () => {
  const r = lire("Je veux développer mon entreprise.");
  assert.deepEqual(r, {
    statut: "incomplet",
    manque: "resultat_et_delai",
    question: QUESTION_RESULTAT_ET_DELAI,
  });
});

test("champ vide : même question que pour un objectif vague", () => {
  const r = lire("   ");
  assert.equal(r.statut, "incomplet");
});

test("résultat sans délai : on ne demande que le délai", () => {
  for (const texte of ["Je veux augmenter mon CA de 20 %.", "Je veux atteindre 100 nouveaux clients par mois."]) {
    const r = lire(texte);
    assert.deepEqual(r, { statut: "incomplet", manque: "delai", question: QUESTION_DELAI }, texte);
  }
});

test("délai sans résultat : on ne demande que le résultat", () => {
  const r = lire("Je veux faire mieux dans les 6 prochains mois");
  assert.deepEqual(r, { statut: "incomplet", manque: "resultat", question: QUESTION_RESULTAT });
});

test("la précision s'ajoute au texte d'origine", () => {
  const premiere = "Je veux augmenter mon CA de 20 %.";
  assert.equal(lire(premiere).statut, "incomplet");
  const o = complet(`${premiere} Dans 12 mois.`);
  assert.equal(o.target_change, 20);
  assert.equal(o.deadline.duree_mois, 12);
});

test("objectif d'un autre agent : orientation vers le bon agent", () => {
  const r = lire("Je veux améliorer ma marge de 8 % d'ici la fin de l'année.", "ACQUISITION_CA");
  assert.equal(r.statut, "hors_perimetre");
  if (r.statut === "hors_perimetre") assert.equal(r.agent_suggere, "FINANCE_RENTABILITE");
});

test("le coût d'acquisition reste chez Acquisition, pas chez Finance", () => {
  const r = lire("Réduire mon coût d'acquisition de 25 % dans 9 mois", "FINANCE_RENTABILITE");
  assert.equal(r.statut, "hors_perimetre");
  if (r.statut === "hors_perimetre") assert.equal(r.agent_suggere, "ACQUISITION_CA");
});

test("même texte, même résultat", () => {
  const texte = "Passer de 10 à 15 nouveaux clients par mois dans 6 mois";
  assert.deepEqual(lire(texte), lire(texte));
});

test("résumé lisible", () => {
  const o = complet("Je veux passer de 10 à 15 nouveaux clients par mois dans 6 mois.");
  assert.equal(resumerObjectif(o), "Nouveaux clients par mois : de 10 à 15 (+50 %), d'ici 6 mois");
  const p = complet("Je veux augmenter mon chiffre d'affaires de 20 % dans les 12 prochains mois.");
  assert.equal(resumerObjectif(p), "Chiffre d'affaires : +20 %, d'ici 12 mois");
});

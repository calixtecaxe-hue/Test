// Ce que le dirigeant a déjà essayé pour son objectif (src/lib/audit/tentatives.ts, data/deja-tente.json).
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import { lireTentatives, tentativesTransmises, validerTentatives } from "../src/lib/audit/tentatives.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const def = reel.dejaTente;
const action = (quoi: string, resultat: string | null = null, duree: string | null = null) => ({ quoi, resultat, duree });

test("déjà essayé : la question, ses choix et la limite d'actions viennent du fichier de données", () => {
  assert.equal(def.question, "Avez-vous déjà essayé quelque chose pour atteindre cet objectif ?");
  assert.deepEqual(def.resultat.options.map((o) => o.id), ["a_fonctionne", "en_partie", "sans_resultat", "arrete_avant", "trop_tot"]);
  assert.equal(def.action.max, 3);
  assert.deepEqual(controlerDonnees(reel).erreurs, []);
});

test("déjà essayé : réponses acceptées", () => {
  assert.equal(validerTentatives(def, { deja: "non", actions: [] }).ok, true);
  assert.equal(validerTentatives(def, { deja: "oui", actions: [] }).ok, true, "« oui » avant d'écrire l'action");
  const r = validerTentatives(def, { deja: "oui", actions: [action("  Relancer   les devis  ", "sans_resultat", "1_a_3_mois"), action("Publier chaque semaine", "arrete_avant", null)] });
  assert.ok(r.ok);
  assert.equal(r.tentatives.actions[0].quoi, "Relancer les devis", "espaces en trop retirés");
  // « non » garde les actions déjà écrites : elles ne comptent plus, mais reviennent avec « oui ».
  assert.equal(validerTentatives(def, { deja: "non", actions: [action("Relancer les devis")] }).ok, true);
});

test("déjà essayé : réponses refusées", () => {
  assert.equal(validerTentatives(def, { deja: "peut-etre", actions: [] }).ok, false);
  assert.equal(validerTentatives(def, { deja: "oui", actions: [action("a"), action("b"), action("c"), action("d")] }).ok, false, "4 actions");
  assert.equal(validerTentatives(def, { deja: "oui", actions: [action("x".repeat(401))] }).ok, false, "texte trop long");
  assert.equal(validerTentatives(def, { deja: "oui", actions: [action("x", "inconnu")] }).ok, false, "résultat inconnu");
  assert.equal(validerTentatives(def, { deja: "oui", actions: [action("x", null, "deux_ans")] }).ok, false, "durée inconnue");
  assert.equal(validerTentatives(def, "oui").ok, false);
  assert.equal(lireTentatives(def, { n: 1 }), null, "une valeur mal formée en base ne s'affiche pas");
});

test("déjà essayé : ce que reçoivent le compte rendu et l'IA", () => {
  assert.deepEqual(tentativesTransmises(def, null), { deja: null, actions: [] }, "sans réponse");
  assert.deepEqual(tentativesTransmises(def, { deja: "non", actions: [action("Relancer les devis", "sans_resultat")] }), { deja: false, actions: [] }, "« non » : les actions gardées ne comptent pas");
  assert.deepEqual(
    tentativesTransmises(def, { deja: "oui", actions: [action("Relancer les devis", "arrete_avant", "moins_d_1_mois"), action("", "en_partie")] }),
    { deja: true, actions: [{ quoi: "Relancer les devis", resultat: "Je l'ai arrêté avant de voir le résultat", duree: "Moins d'1 mois" }] },
    "libellés transmis ; une action sans description est ignorée"
  );
});

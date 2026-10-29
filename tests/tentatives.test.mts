// Ce que le dirigeant a déjà essayé pour son objectif (src/lib/audit/tentatives.ts, data/deja-tente.json).
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import { lireTentatives, resumeTentatives, tentativesTransmises, validerTentatives } from "../src/lib/audit/tentatives.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const def = reel.dejaTente;

test("déjà essayé : la question, son aide et la réponse « rien essayé » viennent du fichier de données", () => {
  assert.equal(def.question, "Qu'avez-vous déjà essayé pour atteindre cet objectif ?");
  assert.equal(def.aide, "Vous pouvez préciser ce que vous avez fait, ce que cela a donné et les difficultés rencontrées.");
  assert.equal(def.rien, "Je n'ai encore rien essayé.");
  assert.deepEqual(def.precisions.resultat.options.map((o) => o.id), ["a_fonctionne", "en_partie", "sans_resultat", "arrete_avant", "trop_tot"]);
  assert.deepEqual(controlerDonnees(reel).erreurs, []);
});

test("déjà essayé : réponses acceptées", () => {
  const r = validerTentatives(def, { etat: "essaye", texte: "  Relancer   les devis  par téléphone ", resultat: "sans_resultat", duree: "1_a_3_mois" });
  assert.ok(r.ok);
  assert.equal(r.tentatives.etat === "essaye" && r.tentatives.texte, "Relancer les devis par téléphone", "espaces en trop retirés");
  assert.equal(validerTentatives(def, { etat: "essaye", texte: "Relancer les devis", resultat: null, duree: null }).ok, true, "précisions facultatives");
  assert.equal(validerTentatives(def, { etat: "rien" }).ok, true);
  assert.equal(validerTentatives(def, { etat: "rien", texte: "écrit avant" }).ok, true, "un texte écrit avant reste gardé");
  assert.equal(validerTentatives(def, { etat: "essaye", texte: "x", resultat: null, duree: null, reprisDe: "cmabcdefghij0123456789xyz" }).ok, true);
});

test("déjà essayé : réponses refusées", () => {
  assert.equal(validerTentatives(def, { etat: "peut-etre" }).ok, false);
  assert.equal(validerTentatives(def, { etat: "essaye", texte: "x".repeat(def.longueurMax + 1), resultat: null, duree: null }).ok, false, "texte trop long");
  assert.equal(validerTentatives(def, { etat: "essaye", texte: "x", resultat: "inconnu", duree: null }).ok, false, "résultat inconnu");
  assert.equal(validerTentatives(def, { etat: "essaye", texte: "x", resultat: null, duree: "deux_ans" }).ok, false, "durée inconnue");
  assert.equal(validerTentatives(def, { etat: "essaye", texte: "x", resultat: null, duree: null, reprisDe: "../autre" }).ok, false, "objectif d'origine mal formé");
  assert.equal(lireTentatives(def, { n: 1 }), null, "une valeur mal formée en base ne s'affiche pas");
});

test("déjà essayé : une absence de réponse n'est jamais « rien essayé »", () => {
  assert.deepEqual(tentativesTransmises(def, null), { statut: "sans_reponse" });
  assert.deepEqual(tentativesTransmises(def, { etat: "rien", texte: "écrit avant" }), { statut: "rien_essaye" }, "le texte gardé ne compte pas");
  assert.deepEqual(tentativesTransmises(def, { etat: "essaye", texte: "  ", resultat: null, duree: null }), { statut: "sans_reponse" });
  assert.deepEqual(tentativesTransmises(def, { etat: "essaye", texte: "Relancer les devis", resultat: "arrete_avant", duree: "moins_d_1_mois" }), {
    statut: "essaye",
    texte: "Relancer les devis",
    resultat: "Je l'ai arrêté avant de voir le résultat",
    duree: "Moins d'1 mois",
  });
  assert.equal(resumeTentatives(def, { etat: "essaye", texte: "Relancer les devis", resultat: "sans_resultat", duree: null }), "Relancer les devis (pas de résultat)");
  assert.equal(resumeTentatives(def, { etat: "rien" }), "Je n'ai encore rien essayé.");
  assert.equal(resumeTentatives(def, null), null);
});

test("déjà essayé : la forme du premier essai ({ deja, actions }) se lit encore", () => {
  assert.deepEqual(lireTentatives(def, { deja: "non", actions: [] }), { etat: "rien" });
  assert.deepEqual(lireTentatives(def, { deja: "oui", actions: [{ quoi: "Relancer les devis", resultat: "en_partie", duree: null }, { quoi: "Publier", resultat: null, duree: null }] }), {
    etat: "essaye",
    texte: "Relancer les devis\nPublier",
    resultat: "en_partie",
    duree: null,
  });
});

// Option « aucun » d'une question à cases (demande du propriétaire, 27 octobre) : elle se coche seule. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { appliquerExclusives, optionsExclusives, validerSelonSpec, type ReponseSpec } from "../src/lib/donnees/reponse-spec.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const ctx = { lignesDeclencheur: () => [] };
const cases = (code: string) => reel.banque.find((q) => q.donnee === code)!.reponse as Extract<ReponseSpec, { type: "cases" }>;

test("les options « Aucun », « Aucune … », « Rien … » sont exclusives ; les autres non", () => {
  assert.deepEqual(optionsExclusives(cases("COM-08.01").options), ["aucun"]);
  assert.deepEqual(optionsExclusives(cases("COM-10.03").options), ["aucun"]);
  assert.deepEqual(optionsExclusives(cases("RH-09.02").options), ["aucune_urgence_de_ce_type"]);
  assert.deepEqual(optionsExclusives(cases("ACQ-03.01").options), []);
});

test("cocher « Aucun » décoche le reste ; cocher une autre option décoche « Aucun »", () => {
  const o = cases("COM-10.03").options;
  assert.deepEqual(appliquerExclusives(o, ["linkedin", "instagram"], ["linkedin", "instagram", "aucun"]), ["aucun"]);
  assert.deepEqual(appliquerExclusives(o, ["aucun"], ["aucun", "facebook"]), ["facebook"]);
  assert.deepEqual(appliquerExclusives(o, ["linkedin", "facebook"], ["facebook"]), ["facebook"]);
});

test("le serveur refuse « Aucun » coché avec une autre option", () => {
  const s = cases("COM-10.03");
  assert.equal(validerSelonSpec(s, { genre: "saisie", valeur: ["aucun"] }, ctx).ok, true);
  assert.equal(validerSelonSpec(s, { genre: "saisie", valeur: ["aucun", "linkedin"] }, ctx).ok, false);
});

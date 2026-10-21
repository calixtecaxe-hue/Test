// La formule regardée avant le compte suit le parcours dans l'adresse comme simple préférence (src/lib/formule-url.ts). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { adresseAvecPreselection, lirePreselection } from "../src/lib/formule-url.ts";

test("la préférence se reporte d'une étape à l'autre et se relit à l'identique", () => {
  const p = { nombreAgents: 3, periode: "annuel" as const };
  const url = adresseAvecPreselection("/inscription/metier", p);
  assert.equal(url, "/inscription/metier?agents=3&periode=annuel");
  assert.deepEqual(lirePreselection(url.slice(url.indexOf("?"))), p);
});

test("sans préférence, l'adresse reste nue", () => {
  assert.equal(adresseAvecPreselection("/formule", { nombreAgents: null, periode: null }), "/formule");
  assert.equal(adresseAvecPreselection("/formule", { nombreAgents: 2, periode: null }), "/formule?agents=2");
});

test("une adresse falsifiée ou incohérente est ignorée, jamais devinée", () => {
  assert.deepEqual(lirePreselection(""), { nombreAgents: null, periode: null });
  assert.deepEqual(lirePreselection("?agents=1&periode=mensuel"), { nombreAgents: null, periode: "mensuel" }, "pas d'offre à 1 agent");
  assert.deepEqual(lirePreselection("?agents=9&periode=hebdo"), { nombreAgents: null, periode: null });
  assert.deepEqual(lirePreselection("?agents=abc"), { nombreAgents: null, periode: null });
  assert.deepEqual(lirePreselection("?agents=4&periode=annuel&choix=ADMIN"), { nombreAgents: 4, periode: "annuel" }, "les agents ne se lisent plus dans l'adresse");
});

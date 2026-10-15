// La formule choisie avant l'inscription voyage dans l'adresse (src/lib/formule-url.ts). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { adresseInscription, lireFormuleDansAdresse } from "../src/lib/formule-url.ts";

const A3 = ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION"] as const;

test("l'adresse d'inscription porte la formule et se relit à l'identique", () => {
  const f = { nombreAgents: 3, periode: "annuel" as const, agents: [...A3] };
  const url = adresseInscription(f);
  assert.match(url, /^\/inscription\?agents=3&periode=annuel&choix=ACQUISITION_CA%2CFINANCE_RENTABILITE%2CRH_ORGANISATION$/);
  assert.deepEqual(lireFormuleDansAdresse(url.slice(url.indexOf("?"))), f);
});

test("une adresse falsifiée ou incohérente est ignorée, jamais devinée", () => {
  const ok = (s: string) => lireFormuleDansAdresse(s);
  assert.equal(ok(""), null);
  assert.equal(ok("?agents=3&periode=annuel"), null, "pas d'agents choisis");
  assert.equal(ok("?agents=3&periode=annuel&choix=ACQUISITION_CA,FINANCE_RENTABILITE"), null, "2 agents pour un palier à 3");
  assert.equal(ok("?agents=1&periode=mensuel&choix=ACQUISITION_CA"), null, "pas d'offre à 1 agent");
  assert.equal(ok("?agents=9&periode=mensuel&choix=ACQUISITION_CA"), null);
  assert.equal(ok("?agents=2&periode=hebdo&choix=ACQUISITION_CA,FINANCE_RENTABILITE"), null);
  assert.equal(ok("?agents=2&periode=mensuel&choix=ACQUISITION_CA,ADMIN"), null, "agent inconnu");
  assert.equal(ok("?agents=2&periode=mensuel&choix=ACQUISITION_CA,ACQUISITION_CA"), null, "doublon");
  assert.equal(ok("?agents=abc&periode=mensuel&choix=ACQUISITION_CA"), null);
  assert.deepEqual(ok("?agents=2&periode=mensuel&choix=ACQUISITION_CA,FINANCE_RENTABILITE"), { nombreAgents: 2, periode: "mensuel", agents: ["ACQUISITION_CA", "FINANCE_RENTABILITE"] });
});

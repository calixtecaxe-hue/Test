// Tests des règles d'abonnement (src/lib/abonnement.ts). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { agentsProposables, contrainteDuCompte, nombresAgentsProposables, validerChoix } from "../src/lib/abonnement.ts";
import { OFFRES, formaterEuros, prixAnnuelCentimesHT, prixMensuelEquivalentAnnuelCentimesHT } from "../src/lib/offres.ts";

const { routage } = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const libre = contrainteDuCompte(routage, { metierPrecis: "boulanger-patissier", sousVariantes: [], categorie: "commerce-stock" });
const reglementee = contrainteDuCompte(routage, { metierPrecis: "avocat", sousVariantes: [], categorie: "professions-reglementees" });

test("paliers et prix : 2, 3 et 4 agents à 59,99 / 79,99 / 99,99 € HT, pas d'offre à 1 agent", () => {
  assert.deepEqual(OFFRES.map((o) => [o.nombreAgents, o.prixMensuelCentimesHT]), [[2, 5999], [3, 7999], [4, 9999]]);
});

test("annuel : le prix par mois affiché est celui de la remise, et comparé au prix mensuel", () => {
  const mensuel = OFFRES.map((o) => formaterEuros(prixMensuelEquivalentAnnuelCentimesHT(o.prixMensuelCentimesHT)).replace(/\s/g, " "));
  assert.deepEqual(mensuel, ["50,99 €", "67,99 €", "84,99 €"]);
  assert.equal(prixAnnuelCentimesHT(5999), 61190);
});

test("un compte ordinaire peut souscrire 2, 3 ou 4 agents, tous proposés", () => {
  assert.deepEqual(nombresAgentsProposables(libre), [2, 3, 4]);
  assert.equal(agentsProposables(libre).length, 4);
});

test("profession réglementée : pas d'agent Comm, 3 agents au maximum", () => {
  assert.deepEqual(agentsProposables(reglementee), ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION"]);
  assert.deepEqual(nombresAgentsProposables(reglementee), [2, 3]);
});

test("un choix correct est accepté, sans doublon", () => {
  const r = validerChoix({ nombreAgents: 2, periode: "annuel", agents: ["ACQUISITION_CA", "FINANCE_RENTABILITE", "ACQUISITION_CA"] }, libre);
  assert.ok(r.ok);
});

test("aucun agent n'est coché d'avance : un choix vide ou incomplet est refusé", () => {
  const vide = validerChoix({ nombreAgents: 3, periode: "mensuel", agents: [] }, libre);
  assert.ok(!vide.ok && vide.erreur.champ === "agents");
  const incomplet = validerChoix({ nombreAgents: 3, periode: "mensuel", agents: ["ACQUISITION_CA", "RH_ORGANISATION"] }, libre);
  assert.ok(!incomplet.ok && /exactement 3/.test(incomplet.erreur.message));
  const trop = validerChoix({ nombreAgents: 2, periode: "mensuel", agents: ["ACQUISITION_CA", "RH_ORGANISATION", "COMM_CREATION"] }, libre);
  assert.ok(!trop.ok);
});

test("refuse une formule à 1 agent, inconnue, une période ou un agent inconnus", () => {
  assert.ok(!validerChoix({ nombreAgents: 1, periode: "mensuel", agents: ["ACQUISITION_CA"] }, libre).ok);
  assert.ok(!validerChoix({ nombreAgents: 5, periode: "mensuel", agents: [] }, libre).ok);
  assert.ok(!validerChoix({ nombreAgents: 2, periode: "hebdomadaire" as never, agents: ["ACQUISITION_CA", "RH_ORGANISATION"] }, libre).ok);
  const inconnu = validerChoix({ nombreAgents: 2, periode: "mensuel", agents: ["ACQUISITION_CA", "ASTRONAUTE"] }, libre);
  assert.ok(!inconnu.ok && inconnu.erreur.message === "Agent non reconnu.");
});

test("profession réglementée : l'agent Comm et la formule à 4 agents sont refusés côté serveur", () => {
  const comm = validerChoix({ nombreAgents: 2, periode: "mensuel", agents: ["ACQUISITION_CA", "COMM_CREATION"] }, reglementee);
  assert.ok(!comm.ok && comm.erreur.champ === "agents");
  const quatre = validerChoix({ nombreAgents: 4, periode: "mensuel", agents: ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"] }, reglementee);
  assert.ok(!quatre.ok && quatre.erreur.champ === "nombreAgents" && /3 agents au maximum/.test(quatre.erreur.message));
  const trois = validerChoix({ nombreAgents: 3, periode: "annuel", agents: ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION"] }, reglementee);
  assert.ok(trois.ok);
});

test("un métier de la communication n'a pas l'agent Comm sans être une profession réglementée : 3 agents au plus", () => {
  const com = contrainteDuCompte(routage, { metierPrecis: "communication-et-marketing", sousVariantes: ["projets-ponctuels"], categorie: "agences-services-entreprises" });
  assert.deepEqual(com.agentsExclus, ["COMM_CREATION"]);
  assert.deepEqual(nombresAgentsProposables(com), [2, 3]);
  assert.ok(!agentsProposables(com).includes("COMM_CREATION"));
  assert.ok(!validerChoix({ nombreAgents: 4, periode: "mensuel", agents: ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"] }, com).ok);
  assert.ok(validerChoix({ nombreAgents: 3, periode: "annuel", agents: ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION"] }, com).ok);
});

test("une activité cochée sans agent Comm l'enlève pour tout le compte (règle la plus prudente)", () => {
  const mixte = contrainteDuCompte(routage, { metierPrecis: "consultant", sousVariantes: ["strategie-management-et-organisation", "conseil-juridique"], categorie: "agences-services-entreprises" });
  assert.deepEqual(mixte.agentsExclus, ["COMM_CREATION"]);
  assert.equal(mixte.nombreMaxAgents, 3);
  const simple = contrainteDuCompte(routage, { metierPrecis: "consultant", sousVariantes: ["strategie-management-et-organisation"], categorie: "agences-services-entreprises" });
  assert.deepEqual(simple.agentsExclus, []);
});

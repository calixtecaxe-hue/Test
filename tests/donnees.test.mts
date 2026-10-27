// Tests des fichiers de données et de leur contrôle (src/lib/donnees/). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import type { EnsembleDonnees } from "../src/lib/donnees/schemas.ts";

const dossier = join(fileURLToPath(new URL("..", import.meta.url)), "data");
const reel = chargerDepuisDisque(dossier);
const copie = (): EnsembleDonnees => structuredClone(reel);

test("les fichiers du dépôt passent le contrôle sans erreur ; seules les règles à préciser sont signalées", () => {
  const r = controlerDonnees(reel);
  assert.deepEqual(r.erreurs, []);
  const inattendus = r.avertissements.filter((a) => !a.startsWith("Règle à préciser") && !a.startsWith("Le thème noté ") && !/^(Le métier|L'activité|La catégorie|\d+ métier|\d+ indicateurs de références|Effets d'actions à valider|La réponse de |Sens à trancher|Aucun plafond quotidien|Objectifs proposés par agent|\d+ donnée\(s\) retirée\(s\)|Vocabulaires par métier : proposition)/.test(a));
  assert.deepEqual(inattendus, []);
  assert.equal(r.avertissements.filter((a) => a.startsWith("Règle à préciser")).length, 2);
});

test("une condition ou un masquage du classeur sans règle d'affichage est une erreur", () => {
  const e = copie();
  delete e.reglesAffichage.conditions["D06 · si devis ou propositions"];
  delete e.reglesAffichage.masquages["Sans stock"];
  const r = controlerDonnees(e);
  assert.ok(r.erreurs.some((m) => m.includes("D06 · si devis ou propositions")));
  assert.ok(r.erreurs.some((m) => m.includes("Sans stock")));
});

test("une règle d'affichage qui porte sur une réponse inconnue est une erreur", () => {
  const e = copie();
  e.reglesAffichage.conditions["D07 · si stock"] = { cle: "D99", op: "egal", valeur: "oui" };
  assert.ok(controlerDonnees(e).erreurs.some((m) => m.includes("D99")));
});

test("le nombre de thèmes par agent est celui du document de règles", () => {
  const par = (a: string) => reel.themes.filter((t) => t.agent === a).length;
  assert.equal(par("ACQUISITION_CA"), 23);
  assert.equal(par("FINANCE_RENTABILITE"), 48);
  assert.equal(par("RH_ORGANISATION"), 49);
  assert.equal(par("COMM_CREATION"), 61);
});

test("Finance : le bloc Stock compte 9 thèmes, masqués sans stock", () => {
  const stock = reel.themes.filter((t) => t.masquePour === "Sans stock");
  assert.equal(stock.length, 9);
  assert.deepEqual(stock.map((t) => t.code), Array.from({ length: 9 }, (_, i) => `FIN-${37 + i}`));
});

test("les quatre natures de notation, et seulement elles", () => {
  const natures = new Set(reel.themes.map((t) => t.nature));
  assert.deepEqual([...natures].sort(), ["coherence", "contexte", "marche", "pratique"]);
  assert.equal(reel.themes.filter((t) => t.nature === "contexte").length, 11);
});

test("RH se règle sur la taille, les autres agents sur le profil", () => {
  for (const d of reel.donnees) {
    const agent = reel.themes.find((t) => t.code === d.theme)?.agent;
    assert.equal("tailles" in d, agent === "RH_ORGANISATION", d.code);
    assert.equal("profils" in d, agent !== "RH_ORGANISATION", d.code);
  }
});

test("le classeur contient 65 déclencheurs, 13 scénarios, 14 problèmes de communication", () => {
  assert.equal(reel.declencheurs.length, 65);
  assert.equal(reel.scenarios.length, 13);
  assert.equal(reel.diagnosticComm.problemes.length, 14);
  assert.deepEqual(reel.diagnosticComm.ordreLectureChiffres.slice(0, 2), ["Clients", "CA"]);
});

test("le routage compte 11 catégories (10 + Fabrication à créer) ; l'agriculture n'existe pas", () => {
  assert.equal(reel.routage.categories.length, 11);
  assert.ok(!reel.routage.categories.some((c) => /agricult/i.test(c.libelle)));
  assert.ok(!reel.routage.metiers.some((m) => /agricult/i.test(m.libelle)));
});

test("professions réglementées : pas de Comm, 3 agents au maximum, un profil par métier", () => {
  assert.deepEqual(reel.routage.reglementees.agentsExclus, ["COMM_CREATION"]);
  assert.equal(reel.routage.reglementees.nombreMaxAgents, 3);
  const metiers = reel.routage.metiers.filter((m) => m.categorie === "professions-reglementees");
  assert.ok(metiers.length > 0);
  for (const m of metiers) assert.ok(m.profils && m.profils.length > 0, m.id);
});

test("une donnée demandée sans question écrite est signalée manquante, jamais inventée", () => {
  const r = controlerDonnees(reel);
  assert.equal(r.statistiques["questions écrites"], reel.banque.length);
  assert.equal(r.statistiques["questions manquantes"], r.statistiques["données demandées"] - reel.banque.length);
  assert.ok(r.statistiques["questions manquantes"] >= 0);
  const sansBanque = controlerDonnees({ ...reel, banque: [] });
  assert.equal(sansBanque.statistiques["questions écrites"], 0);
  assert.equal(sansBanque.statistiques["questions manquantes"], sansBanque.statistiques["données demandées"]);
});

// Le contrôle doit refuser ce qu'il est censé refuser.

test("refuse un code de donnée en double", () => {
  const e = copie();
  e.donnees.push(structuredClone(e.donnees[0]));
  assert.match(controlerDonnees(e).erreurs.join("\n"), /en double parmi les données/);
});

test("refuse une donnée dont le thème n'existe pas", () => {
  const e = copie();
  e.donnees[0].theme = "ACQ-99";
  assert.match(controlerDonnees(e).erreurs.join("\n"), /thème inconnu/);
});

test("refuse un déclencheur inconnu", () => {
  const e = copie();
  e.donnees[0].declencheurs = ["D99"];
  assert.match(controlerDonnees(e).erreurs.join("\n"), /déclencheur inconnu/);
});

test("refuse un thème Contexte qui porte un impact", () => {
  const e = copie();
  const t = e.themes.find((x) => x.nature === "contexte")!;
  t.impact = { type: "qualifie", sur: null };
  assert.match(controlerDonnees(e).erreurs.join("\n"), /Contexte \(non noté\)/);
});

test("refuse un thème noté sans impact", () => {
  const e = copie();
  const t = e.themes.find((x) => x.nature === "marche")!;
  t.impact = { type: "aucun", sur: null };
  assert.match(controlerDonnees(e).erreurs.join("\n"), /n'a aucun impact/);
});

test("refuse une donnée demandée sans format de réponse", () => {
  const e = copie();
  const d = e.donnees.find((x) => x.mode === "demandee")!;
  d.format = null;
  assert.match(controlerDonnees(e).erreurs.join("\n"), /pas de format de réponse/);
});

test("refuse un métier d'une catégorie inconnue", () => {
  const e = copie();
  e.routage.metiers[0].categorie = "inconnue";
  assert.match(controlerDonnees(e).erreurs.join("\n"), /catégorie inconnue/);
});

test("signale une référence vers un code qui n'existe pas", () => {
  const e = copie();
  e.donnees[0].entrees = ["ACQ-99.99"];
  assert.match(controlerDonnees(e).avertissements.join("\n"), /introuvable : ACQ-99.99/);
});

test("banque : une question doit viser une donnée demandée, une seule fois", () => {
  const e = copie();
  const demandee = e.donnees.find((x) => x.mode === "demandee")!;
  const calculee = e.donnees.find((x) => x.mode === "calculee")!;
  e.banque = [
    { donnee: demandee.code, texte: "Combien de {demande} ?", aide: null, repli: null },
    { donnee: demandee.code, texte: "Autre texte", aide: null, repli: null },
    { donnee: calculee.code, texte: "Texte", aide: null, repli: null },
    { donnee: "ACQ-99.99", texte: "Texte", aide: null, repli: null },
  ];
  const erreurs = controlerDonnees(e).erreurs.join("\n");
  assert.match(erreurs, /a 2 questions/);
  assert.match(erreurs, /donnée non demandée/);
  assert.match(erreurs, /donnée inconnue/);
});

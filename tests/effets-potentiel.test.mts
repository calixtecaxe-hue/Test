// Application d'un taux d'effet sourcé aux volumes d'un client. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { borneBasseDeLEnsemble, potentielAction } from "../src/lib/effets/potentiel.ts";
import type { Reference } from "../src/lib/references/types.ts";
import type { ContexteReference } from "../src/lib/references/cascade.ts";

const AUJOURDHUI = new Date("2026-10-19T10:00:00Z");
const EFFET = { id: "EFF-ACQ-01", nationalAutorise: false };
const CONTEXTE: ContexteReference = { metier: "electricien", sousVariante: null, famille: "artisan-chantier", zone: "URBAINE_DENSE", taille: "equipe_2_5" };
const SOURCE = { organisme: "Fédération du bâtiment", titre: "Étude 2026", url: "https://www.capeb.fr/e", datePublication: "2026-05", dateConsultation: "2026-10-19", pays: "France", population: "Artisans du bâtiment", echantillon: 400, definition: "Part des devis relancés signés", extrait: "18 % des devis relancés sont signés.", niveau: 2 as const };
const ref = (over: Partial<Reference> = {}): Reference => ({
  id: "r1", themeId: "ACQ-10", indicateurId: "EFF-ACQ-01", niveau: "metier", metier: "electricien", famille: null, sousVariante: null, zone: "toutes", trancheTaille: "toutes",
  valeurCentrale: 10, borneBasse: 5, borneHaute: 15, statistique: "médiane", unite: "pourcent", periode: "effet", sens: "plus_haut_mieux", source: SOURCE, secondeSource: null, confiance: "indicatif",
  statut: "actif", dateExpiration: "2027-01-19", version: 1, actif: true, nbUtilisations: 0, motif: null, creeLe: "2026-10-19T00:00:00Z", ...over,
});

test("avec un taux sourcé, le potentiel est une fourchette appliquée au montant en jeu du client", () => {
  const p = potentielAction({ effet: EFFET, references: [ref()], contexte: CONTEXTE, enJeu: 28_000, aujourdhui: AUJOURDHUI });
  assert.equal(p.genre, "chiffre");
  if (p.genre !== "chiffre") return;
  assert.deepEqual([p.bas, p.central, p.haut], [1400, 2800, 4200]);
  assert.equal(p.enJeu, 28_000);
  assert.equal(p.confiance, "indicatif");
  assert.equal(p.niveau, "metier");
  assert.equal(p.source.url, "https://www.capeb.fr/e");
  assert.equal(p.aReverifier, false);
});

test("sans bornes dans la source, la fourchette se réduit à la valeur centrale", () => {
  const p = potentielAction({ effet: EFFET, references: [ref({ borneBasse: null, borneHaute: null })], contexte: CONTEXTE, enJeu: 1000, aujourdhui: AUJOURDHUI });
  assert.ok(p.genre === "chiffre" && p.bas === 100 && p.haut === 100);
});

test("sans taux sourcé, seul le montant en jeu est donné, jamais un gain", () => {
  for (const references of [[], [ref({ statut: "a_revoir", actif: false })], [ref({ statut: "aucune_reference", valeurCentrale: null, source: null, confiance: null, actif: false, motif: "Aucune source" })]]) {
    const p = potentielAction({ effet: EFFET, references, contexte: CONTEXTE, enJeu: 28_000, aujourdhui: AUJOURDHUI });
    assert.deepEqual(p, { genre: "en_jeu", enJeu: 28_000, motif: "aucun_taux_source" });
  }
});

test("le taux d'un autre métier ne s'applique pas ; celui de la famille, si", () => {
  const autre = ref({ metier: "plombier" });
  assert.equal(potentielAction({ effet: EFFET, references: [autre], contexte: CONTEXTE, enJeu: 100, aujourdhui: AUJOURDHUI }).genre, "en_jeu");
  const famille = ref({ niveau: "famille", metier: null, famille: "artisan-chantier" });
  const p = potentielAction({ effet: EFFET, references: [autre, famille], contexte: CONTEXTE, enJeu: 100, aujourdhui: AUJOURDHUI });
  assert.ok(p.genre === "chiffre" && p.niveau === "famille");
});

test("un taux jamais appliqué à l'échelle nationale (un effet ne se transpose pas d'un secteur à l'autre)", () => {
  const national = ref({ niveau: "national", metier: null });
  assert.equal(potentielAction({ effet: EFFET, references: [national], contexte: CONTEXTE, enJeu: 100, aujourdhui: AUJOURDHUI }).genre, "en_jeu");
});

test("une échéance dépassée : le taux reste utilisé et est signalé à revérifier", () => {
  const p = potentielAction({ effet: EFFET, references: [ref({ dateExpiration: "2026-09-01" })], contexte: CONTEXTE, enJeu: 100, aujourdhui: AUJOURDHUI });
  assert.ok(p.genre === "chiffre" && p.aReverifier === true);
});

test("un volume inconnu ou invalide : aucun chiffre", () => {
  for (const enJeu of [null, NaN, -5]) assert.deepEqual(potentielAction({ effet: EFFET, references: [ref()], contexte: CONTEXTE, enJeu, aujourdhui: AUJOURDHUI }), { genre: "aucun", motif: "volume_inconnu" });
});

test("on n'additionne jamais les effets de plusieurs actions : la borne basse de l'ensemble est le plus grand effet, pas la somme", () => {
  const a = potentielAction({ effet: EFFET, references: [ref({ valeurCentrale: 6, borneBasse: null, borneHaute: null })], contexte: CONTEXTE, enJeu: 1000, aujourdhui: AUJOURDHUI });
  const b = potentielAction({ effet: EFFET, references: [ref({ valeurCentrale: 4, borneBasse: null, borneHaute: null })], contexte: CONTEXTE, enJeu: 1000, aujourdhui: AUJOURDHUI });
  const sans = { genre: "en_jeu" as const, enJeu: 500, motif: "aucun_taux_source" as const };
  assert.equal(borneBasseDeLEnsemble([a, b, sans]), 60);
  assert.equal(borneBasseDeLEnsemble([sans]), null);
});

// Tests du moteur (src/lib/moteur/) : notation, chaîne de calcul, période commune et
// constat par thème. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import {
  choisirSeuil,
  noter,
  noterFourchette,
  noterMarcheBas,
  noterMarcheHaut,
  noterPratique,
  type Seuil,
} from "../src/lib/moteur/notation.ts";
import { appliquerLeviers, gainAvecCapacite, ramenerAuMois, volumeFinal, SEMAINES_PAR_MOIS } from "../src/lib/moteur/chaine.ts";
import { constaterAgent } from "../src/lib/moteur/constat.ts";
import { assemblerQuestionnaire } from "../src/lib/audit/assemblage.ts";
import { ancienneteEnMois, moisMinimumDExistence } from "../src/lib/audit/affichage.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const saisie = (valeur: string | string[]) => ({ genre: "saisie" as const, valeur });

// --- Notation ----------------------------------------------------------------------

test("la moyenne du marché est orange, le vert est au-dessus", () => {
  assert.equal(noterMarcheHaut(30.01, 30, 20), "vert");
  assert.equal(noterMarcheHaut(30, 30, 20), "orange");
  assert.equal(noterMarcheHaut(20, 20 + 0, 20), "orange");
  assert.equal(noterMarcheHaut(19.99, 30, 20), "rouge");
});

test("un indicateur où plus bas vaut mieux se note à l'envers", () => {
  assert.equal(noterMarcheBas(2, 5, 10), "vert");
  assert.equal(noterMarcheBas(5, 5, 10), "orange");
  assert.equal(noterMarcheBas(10, 5, 10), "orange");
  assert.equal(noterMarcheBas(10.1, 5, 10), "rouge");
});

test("deux sens : fourchette verte, orange à moins d'un point, rouge au-delà", () => {
  assert.equal(noterFourchette(40, 30, 50), "vert");
  assert.equal(noterFourchette(30, 30, 50), "vert");
  assert.equal(noterFourchette(50, 30, 50), "vert");
  assert.equal(noterFourchette(50.5, 30, 50), "orange");
  assert.equal(noterFourchette(51, 30, 50), "orange");
  assert.equal(noterFourchette(51.01, 30, 50), "rouge");
  assert.equal(noterFourchette(29.5, 30, 50), "orange");
  assert.equal(noterFourchette(10, 30, 50), "rouge");
  assert.equal(noterFourchette(52, 30, 50, 3), "orange");
});

test("une pratique est absente, partielle ou en place", () => {
  assert.equal(noterPratique("en_place"), "vert");
  assert.equal(noterPratique("partielle"), "orange");
  assert.equal(noterPratique("absente"), "rouge");
});

test("noter refuse une valeur du mauvais genre au lieu de deviner", () => {
  assert.equal(noter({ type: "pratique" }, 12), null);
  assert.equal(noter({ type: "marche_haut", moyenne: 1, rougeSous: 0 }, "en_place"), null);
});

test("le seuil le plus précis (zone, taille) l'emporte ; sans seuil, rien", () => {
  const base = { theme: "ACQ-02", donnee: "ACQ-02.01", source: "S" } as const;
  const general: Seuil = { ...base, notation: { type: "marche_haut", moyenne: 10, rougeSous: 5 } };
  const rural: Seuil = { ...base, notation: { type: "marche_haut", moyenne: 6, rougeSous: 3 }, zones: ["RURALE"] };
  const ruralSeul: Seuil = { ...base, notation: { type: "marche_haut", moyenne: 4, rougeSous: 2 }, zones: ["RURALE"], tailles: ["seul"] };
  const liste = [general, rural, ruralSeul];
  assert.equal(choisirSeuil(liste, "ACQ-02.01", "RURALE", "seul"), ruralSeul);
  assert.equal(choisirSeuil(liste, "ACQ-02.01", "RURALE", "equipe_2_5"), rural);
  assert.equal(choisirSeuil(liste, "ACQ-02.01", "URBAINE_DENSE", "seul"), general);
  assert.equal(choisirSeuil(liste, "ACQ-02.02", "RURALE", "seul"), null);
  assert.equal(choisirSeuil([rural], "ACQ-02.01", "URBAINE_DENSE", "seul"), null);
});

// --- Période commune -------------------------------------------------------------------

test("une valeur par jour est ramenée au mois : par jour × jours ouverts par semaine × 4,3", () => {
  assert.equal(SEMAINES_PAR_MOIS, 4.3);
  assert.ok(Math.abs(ramenerAuMois(2, "jour", 5) - 43) < 1e-9);
  assert.ok(Math.abs(ramenerAuMois(10, "semaine") - 43) < 1e-9);
  assert.equal(ramenerAuMois(120, "an"), 10);
  assert.equal(ramenerAuMois(30, "trimestre"), 10);
  assert.equal(ramenerAuMois(7, "mois"), 7);
});

test("sans jours d'ouverture valides, une valeur par jour n'est pas ramenée au mois", () => {
  assert.throws(() => ramenerAuMois(2, "jour"), RangeError);
  assert.throws(() => ramenerAuMois(2, "jour", 0), RangeError);
  assert.throws(() => ramenerAuMois(2, "jour", 8), RangeError);
});

// --- Chaîne de calcul ------------------------------------------------------------------

const chaine = { entrant: 100, etapes: [{ id: "contact_rdv", taux: 0.5 }, { id: "rdv_devis", taux: 0.8 }, { id: "devis_vente", taux: 0.25 }] };

test("le volume final est le produit des taux de la chaîne", () => {
  assert.ok(Math.abs(volumeFinal(chaine) - 10) < 1e-9);
});

test("deux leviers d'étapes différentes se multiplient, ils ne s'additionnent pas", () => {
  const r = appliquerLeviers(chaine, [{ etape: "contact_rdv", nouveauTaux: 0.6 }, { etape: "devis_vente", nouveauTaux: 0.3 }]);
  assert.ok(r.ok);
  // 100 × 0,6 × 0,8 × 0,3 = 14,4 ; la somme des gains isolés (12 et 12) donnerait 14 ≠ 14,4.
  assert.ok(Math.abs(r.apres - 14.4) < 1e-9);
  const g1 = volumeFinal(chaine, [{ etape: "contact_rdv", nouveauTaux: 0.6 }]) - 10;
  const g2 = volumeFinal(chaine, [{ etape: "devis_vente", nouveauTaux: 0.3 }]) - 10;
  assert.ok(Math.abs(r.gain - (g1 + g2)) > 0.1, "le gain combiné diffère de la somme des gains");
});

test("deux leviers sur la même étape : aucun chiffre inventé, la règle est à préciser", () => {
  const r = appliquerLeviers(chaine, [{ etape: "devis_vente", nouveauTaux: 0.3 }, { etape: "devis_vente", nouveauTaux: 0.35 }]);
  assert.equal(r.ok, false);
  assert.deepEqual(!r.ok && r.etapes, ["devis_vente"]);
});

test("un levier sur une étape inconnue est refusé", () => {
  assert.throws(() => appliquerLeviers(chaine, [{ etape: "inconnue", nouveauTaux: 0.5 }]), RangeError);
});

test("la capacité plafonne le gain immédiat ; deux chiffres quand elle bloque", () => {
  const g = gainAvecCapacite(10, 14.4, 12);
  assert.equal(g.capaciteBloque, true);
  assert.ok(Math.abs(g.immediat - 2) < 1e-9);
  assert.ok(Math.abs(g.apresCapacite - 4.4) < 1e-9);
  const libre = gainAvecCapacite(10, 14.4, 20);
  assert.equal(libre.capaciteBloque, false);
  assert.equal(libre.immediat, libre.apresCapacite);
  // Déjà à la limite : aucun gain immédiat, jamais négatif.
  assert.equal(gainAvecCapacite(10, 14, 8).immediat, 0);
});

// --- Constat par thème ------------------------------------------------------------------

const ctx = { agent: "ACQUISITION_CA" as const, profils: ["chantier" as const], taille: "equipe_2_5" as const, niveau: "approfondi" as const };
const tous: Reponses = Object.fromEntries(reel.declencheurs.map((d) => [d.code, saisie("oui")]));

function themeNote() {
  const a = assemblerQuestionnaire(reel, { ...ctx, reponses: tous });
  const t = a.themes.find((x) => x.theme.nature === "marche" && x.questions.filter((q) => q.format === "%" || q.format === "Nombre" || q.format === "€").length >= 2)!;
  const scalaires = t.questions.filter((q) => ["%", "Nombre", "€"].includes(q.format ?? ""));
  return { a, t, cible: scalaires[0].code, autre: scalaires[1].code };
}

test("sans seuil dans data/seuils.json, un thème noté sort « règle manquante », jamais une couleur inventée", () => {
  const { a, t, cible } = themeNote();
  const rep: Reponses = { ...tous, ...Object.fromEntries(t.questions.map((q) => [q.code, { genre: "exact" as const, valeur: 5 }])) };
  const c = constaterAgent(reel, [], a, rep, { zone: "PERIURBAINE", taille: "equipe_2_5" }).find((x) => x.theme === t.theme.code)!;
  assert.equal(c.statut, "regle_manquante");
  assert.equal(c.couleur, null);
  assert.ok(cible);
});

test("avec un seuil et au moins 50 % de réponses, le thème est noté", () => {
  const { a, t, cible } = themeNote();
  const seuil: Seuil = { theme: t.theme.code, donnee: cible, notation: { type: "marche_haut", moyenne: 10, rougeSous: 5 }, source: "Référence X" };
  const rep = (v: number): Reponses => ({ ...tous, ...Object.fromEntries(t.questions.map((q) => [q.code, { genre: "exact" as const, valeur: v }])) });
  const par = (v: number) => constaterAgent(reel, [seuil], a, rep(v), { zone: "PERIURBAINE", taille: "equipe_2_5" }).find((x) => x.theme === t.theme.code)!;
  assert.equal(par(12).couleur, "vert");
  assert.equal(par(10).couleur, "orange");
  assert.equal(par(3).couleur, "rouge");
  assert.equal(par(12).statut, "note");
  assert.equal(par(12).aValider, false);
});

test("un seuil sans source est « à valider »", () => {
  const { a, t, cible } = themeNote();
  const seuil: Seuil = { theme: t.theme.code, donnee: cible, notation: { type: "marche_haut", moyenne: 10, rougeSous: 5 }, source: null };
  const rep: Reponses = { ...tous, ...Object.fromEntries(t.questions.map((q) => [q.code, { genre: "exact" as const, valeur: 12 }])) };
  const c = constaterAgent(reel, [seuil], a, rep, { zone: "PERIURBAINE", taille: "equipe_2_5" }).find((x) => x.theme === t.theme.code)!;
  assert.equal(c.couleur, "vert");
  assert.equal(c.aValider, true);
});

test("une estimation note avec le milieu et le dit", () => {
  const { a, t, cible } = themeNote();
  const seuil: Seuil = { theme: t.theme.code, donnee: cible, notation: { type: "marche_haut", moyenne: 10, rougeSous: 5 }, source: "S" };
  const rep: Reponses = { ...tous, ...Object.fromEntries(t.questions.map((q) => [q.code, { genre: "exact" as const, valeur: 1 }])), [cible]: { genre: "estimation", min: 12, max: 20 } };
  const c = constaterAgent(reel, [seuil], a, rep, { zone: "PERIURBAINE", taille: "equipe_2_5" }).find((x) => x.theme === t.theme.code)!;
  assert.equal(c.couleur, "vert");
  assert.equal(c.estimee, true);
});

test("moins de 50 % de réponses : « non évalué » ; « je ne sais pas » compte comme sans réponse", () => {
  const { a, t, cible } = themeNote();
  const seuil: Seuil = { theme: t.theme.code, donnee: cible, notation: { type: "marche_haut", moyenne: 10, rougeSous: 5 }, source: "S" };
  const rep: Reponses = { ...tous, ...Object.fromEntries(t.questions.map((q) => [q.code, { genre: "inconnu" as const }])), [cible]: { genre: "exact", valeur: 50 } };
  const c = constaterAgent(reel, [seuil], a, rep, { zone: "PERIURBAINE", taille: "equipe_2_5" }).find((x) => x.theme === t.theme.code)!;
  if (t.questions.length > 2) assert.equal(c.statut, "non_evalue");
  const aucune = constaterAgent(reel, [seuil], a, tous, { zone: "PERIURBAINE", taille: "equipe_2_5" }).find((x) => x.theme === t.theme.code)!;
  assert.equal(aucune.statut, "non_evalue");
  assert.equal(aucune.couleur, null);
});

test("la donnée notée en « je ne sais pas » ne donne jamais de couleur, même si le thème est couvert", () => {
  const { a, t, cible } = themeNote();
  const seuil: Seuil = { theme: t.theme.code, donnee: cible, notation: { type: "marche_haut", moyenne: 10, rougeSous: 5 }, source: "S" };
  const rep: Reponses = { ...tous, ...Object.fromEntries(t.questions.map((q) => [q.code, { genre: "exact" as const, valeur: 12 }])), [cible]: { genre: "inconnu" } };
  const c = constaterAgent(reel, [seuil], a, rep, { zone: "PERIURBAINE", taille: "equipe_2_5" }).find((x) => x.theme === t.theme.code)!;
  assert.equal(c.couleur, null);
  assert.notEqual(c.statut, "note");
});

test("deux indicateurs notés dans un même thème : la règle d'agrégation est à préciser", () => {
  const { a, t, cible, autre } = themeNote();
  const s = (donnee: string): Seuil => ({ theme: t.theme.code, donnee, notation: { type: "marche_haut", moyenne: 10, rougeSous: 5 }, source: "S" });
  const rep: Reponses = { ...tous, ...Object.fromEntries(t.questions.map((q) => [q.code, { genre: "exact" as const, valeur: 12 }])) };
  const c = constaterAgent(reel, [s(cible), s(autre)], a, rep, { zone: "PERIURBAINE", taille: "equipe_2_5" }).find((x) => x.theme === t.theme.code)!;
  assert.equal(c.statut, "regle_manquante");
});

test("un thème de contexte n'est pas noté ; un thème masqué est masqué, pas « non évalué »", () => {
  const a = assemblerQuestionnaire(reel, { ...ctx, agent: "RH_ORGANISATION", taille: "seul", reponses: tous });
  const constats = constaterAgent(reel, [], a, tous, { zone: "PERIURBAINE", taille: "seul" });
  assert.ok(constats.some((c) => c.statut === "masque"));
  assert.ok(!constats.some((c) => c.statut === "masque" && c.couleur !== null));
  const ctxt = constats.filter((c) => c.statut === "contexte");
  for (const c of ctxt) assert.equal(c.nature, "contexte");
});

test("le constat ne produit aucun score global", () => {
  const a = assemblerQuestionnaire(reel, { ...ctx, reponses: tous });
  const constats = constaterAgent(reel, [], a, tous, { zone: "PERIURBAINE", taille: "equipe_2_5" });
  for (const c of constats) assert.deepEqual(Object.keys(c).sort(), ["aValider", "couleur", "couverture", "estimee", "nature", "nom", "raison", "statut", "theme"]);
});

// --- Ancienneté (D01) -------------------------------------------------------------------

test("l'ancienneté se compte en mois révolus", () => {
  assert.equal(ancienneteEnMois(new Date("2025-10-15T00:00:00Z"), new Date("2026-10-15T00:00:00Z")), 12);
  assert.equal(ancienneteEnMois(new Date("2025-10-16T00:00:00Z"), new Date("2026-10-15T00:00:00Z")), 11);
  assert.equal(ancienneteEnMois(new Date("2026-12-01T00:00:00Z"), new Date("2026-10-15T00:00:00Z")), 0);
});

test("la période « si plus de N mois d'existence » est lue, les autres formulations ne masquent rien", () => {
  assert.equal(moisMinimumDExistence("Si plus de 12 mois d'existence (sinon masquée)"), 12);
  assert.equal(moisMinimumDExistence("Si plus de 24 mois d'existence (sinon masquée)"), 24);
  assert.equal(moisMinimumDExistence("Période adaptée : depuis la création si moins de 12 mois"), null);
  assert.equal(moisMinimumDExistence(null), null);
});

test("une entreprise récente ne se voit pas poser les questions qui exigent 12 mois d'existence", () => {
  const rep: Reponses = tous;
  const jeune = assemblerQuestionnaire(reel, { ...ctx, reponses: rep, ancienneteMois: 4 });
  const ancienne = assemblerQuestionnaire(reel, { ...ctx, reponses: rep, ancienneteMois: 60 });
  const inconnue = assemblerQuestionnaire(reel, { ...ctx, reponses: rep });
  const n = (x: typeof jeune) => x.themes.reduce((s, t) => s + t.questions.length, 0);
  assert.ok(n(jeune) < n(ancienne));
  assert.equal(n(inconnue), n(ancienne));
  const exigeantes = reel.donnees.filter((d) => moisMinimumDExistence(d.periode) === 12).map((d) => d.code);
  const poseesJeune = new Set(jeune.themes.flatMap((t) => t.questions.map((q) => q.code)));
  for (const c of exigeantes) assert.ok(!poseesJeune.has(c), c);
});

// Tests de la spécification de réponse (src/lib/donnees/reponse-spec.ts) et de sa
// validation côté serveur. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { proposerSpec, reponseSpec, validerSelonSpec, type ReponseSpec } from "../src/lib/donnees/reponse-spec.ts";
import { specDeLaDonnee, validerReponse } from "../src/lib/audit/validation.ts";
import { assemblerQuestionnaire } from "../src/lib/audit/assemblage.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import { aUneReponse, reponseSchema } from "../src/lib/audit/reponse.ts";
import type { EnsembleDonnees } from "../src/lib/donnees/schemas.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const aucuneLigne = { lignesDeclencheur: () => [] as string[] };
const saisie = (valeur: string | string[]) => ({ genre: "saisie" as const, valeur });
const valeurs = (v: Record<string, number | string | null>) => ({ genre: "valeurs" as const, valeurs: v });

// --- Propositions tirées du format du classeur -------------------------------------------

test("un format simple donne une spécification sûre", () => {
  assert.deepEqual(proposerSpec("€").spec, { type: "nombre", unite: "euros" });
  assert.deepEqual(proposerSpec("%").spec, { type: "nombre", unite: "pourcent" });
  assert.deepEqual(proposerSpec("Heures").spec, { type: "nombre", unite: "heures" });
  assert.deepEqual(proposerSpec("€ par heure").spec, { type: "nombre", unite: "euros_par_heure" });
  assert.deepEqual(proposerSpec("Oui / non").spec, { type: "oui_non" });
  assert.deepEqual(proposerSpec("Mois et année").spec, { type: "date_mois" });
  assert.equal(proposerSpec("Nombre").certitude, "sure");
});

test("les tranches du classeur deviennent des options ; « je ne sais pas » n'en est pas une", () => {
  const p = proposerSpec("Tranches : 0 · 1-3 h · 3-6 h · 6-10 h · plus de 10 h · je ne sais pas");
  assert.equal(p.certitude, "sure");
  assert.ok(p.spec?.type === "choix");
  assert.deepEqual(p.spec.options.map((o) => o.libelle), ["0", "1-3 h", "3-6 h", "6-10 h", "plus de 10 h"]);
  assert.equal(new Set(p.spec.options.map((o) => o.id)).size, 5);
  assert.deepEqual(proposerSpec("Toujours / parfois / jamais").spec, {
    type: "choix",
    options: [{ id: "toujours", libelle: "Toujours" }, { id: "parfois", libelle: "Parfois" }, { id: "jamais", libelle: "Jamais" }],
  });
  assert.equal(proposerSpec("Oui / partielle / non").spec?.type, "choix");
});

test("un format ambigu n'est jamais deviné : « Choix » sans liste, tableaux, plusieurs champs", () => {
  for (const f of ["Choix", "Cases à cocher", "Nombre et €", "3 nombres", "Tableau par poste (€)", "€ par ligne", "Tranches en %", "Oui chiffré / estimation / non", "Nombre ou %", null, ""]) {
    const p = proposerSpec(f);
    assert.equal(p.spec, null, String(f));
    assert.equal(p.certitude, "a_definir", String(f));
  }
  assert.match(proposerSpec("Choix").indice ?? "", /listez les options/);
  assert.match(proposerSpec("Nombre et €").indice ?? "", /plusieurs champs/);
  assert.match(proposerSpec("Tableau par poste (€)").indice ?? "", /tableau/);
});

test("sur les données réelles, toute spécification proposée est valide et sans option en double", () => {
  for (const d of reel.donnees.filter((x) => x.mode === "demandee" || x.mode === "partagee")) {
    const p = proposerSpec(d.format);
    if (p.spec) assert.ok(reponseSpec.safeParse(p.spec).success, `${d.code} ${d.format}`);
  }
});

// --- Définition d'une spécification ------------------------------------------------------

test("une spécification mal formée est refusée", () => {
  const mal = (s: unknown) => assert.equal(reponseSpec.safeParse(s).success, false, JSON.stringify(s));
  mal({ type: "choix", options: [{ id: "a", libelle: "A" }] }); // une seule option
  mal({ type: "choix", options: [{ id: "a", libelle: "A" }, { id: "a", libelle: "B" }] }); // doublon
  mal({ type: "nombre", unite: "kilos" });
  mal({ type: "composite", champs: [{ id: "x", libelle: "X", spec: { type: "nombre", unite: "euros" } }] });
  mal({ type: "composite", champs: [{ id: "x", libelle: "X", spec: { type: "nombre", unite: "euros" } }, { id: "x", libelle: "Y", spec: { type: "nombre", unite: "euros" } }] });
  mal({ type: "tableau", lignes: { source: "fixe", items: [{ id: "a", libelle: "A" }] }, colonnes: [{ id: "c", libelle: "C", spec: { type: "texte" } }], total: { colonne: "c", valeur: 100 } });
  mal({ type: "tableau", lignes: { source: "declencheur", cle: "canaux" }, colonnes: [{ id: "c", libelle: "C", spec: { type: "nombre", unite: "euros" } }] });
  mal({ type: "cases", options: [{ id: "a", libelle: "A" }, { id: "b", libelle: "B" }], minChoix: 3, maxChoix: 1 });
  mal({ type: "choix", options: [{ id: "Majuscule", libelle: "A" }, { id: "b", libelle: "B" }] });
});

// --- Validation d'une réponse -------------------------------------------------------------

const nombre: ReponseSpec = { type: "nombre", unite: "pourcent", min: 0, max: 100 };

test("un nombre respecte ses bornes ; exact et fourchette passent, un texte non", () => {
  assert.ok(validerSelonSpec(nombre, { genre: "exact", valeur: 40 }, aucuneLigne).ok);
  assert.ok(validerSelonSpec(nombre, { genre: "exact", valeur: 0 }, aucuneLigne).ok);
  assert.ok(!validerSelonSpec(nombre, { genre: "exact", valeur: 101 }, aucuneLigne).ok);
  assert.ok(!validerSelonSpec(nombre, { genre: "exact", valeur: -1 }, aucuneLigne).ok);
  assert.ok(validerSelonSpec(nombre, { genre: "estimation", min: 30, max: 40 }, aucuneLigne).ok);
  assert.ok(!validerSelonSpec(nombre, { genre: "estimation", min: 30, max: 140 }, aucuneLigne).ok);
  assert.ok(!validerSelonSpec(nombre, saisie("beaucoup"), aucuneLigne).ok);
});

test("« je ne sais pas » et « je ne suis pas cette donnée » passent pour toute spécification", () => {
  const specs: ReponseSpec[] = [nombre, { type: "oui_non" }, { type: "choix", options: [{ id: "a", libelle: "A" }, { id: "b", libelle: "B" }] }, { type: "texte" }];
  for (const s of specs) for (const g of ["inconnu", "non_suivi"] as const) assert.ok(validerSelonSpec(s, { genre: g }, aucuneLigne).ok);
});

test("un choix refuse une option qui n'existe pas ; des cases refusent un doublon et respectent leurs bornes", () => {
  const choix: ReponseSpec = { type: "choix", options: [{ id: "a", libelle: "A" }, { id: "b", libelle: "B" }] };
  assert.ok(validerSelonSpec(choix, saisie("a"), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(choix, saisie("z"), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(choix, saisie(["a"]), aucuneLigne).ok);
  const cases: ReponseSpec = { type: "cases", options: [{ id: "a", libelle: "A" }, { id: "b", libelle: "B" }, { id: "c", libelle: "C" }], minChoix: 1, maxChoix: 2 };
  assert.ok(validerSelonSpec(cases, saisie(["a", "c"]), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(cases, saisie([]), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(cases, saisie(["a", "b", "c"]), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(cases, saisie(["a", "a"]), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(cases, saisie(["x"]), aucuneLigne).ok);
});

test("une date est un mois réel, pas dans le futur", () => {
  const d: ReponseSpec = { type: "date_mois" };
  assert.ok(validerSelonSpec(d, saisie("2021-03"), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(d, saisie("2021-13"), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(d, saisie("2999-01"), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(d, saisie("03/2021"), aucuneLigne).ok);
});

const composite: ReponseSpec = {
  type: "composite",
  champs: [
    { id: "nombre", libelle: "Nombre de devis", spec: { type: "nombre", unite: "nombre", min: 0 } },
    { id: "montant", libelle: "Montant moyen", spec: { type: "nombre", unite: "euros", min: 0 } },
  ],
};

test("plusieurs champs : chaque valeur est contrôlée, un champ peut rester vide, un champ inconnu est refusé", () => {
  assert.ok(validerSelonSpec(composite, valeurs({ nombre: 12, montant: 850 }), aucuneLigne).ok);
  assert.ok(validerSelonSpec(composite, valeurs({ nombre: 12 }), aucuneLigne).ok);
  assert.ok(validerSelonSpec(composite, valeurs({ nombre: 12, montant: null }), aucuneLigne).ok);
  const v = validerSelonSpec(composite, valeurs({ nombre: 12, montant: -5 }), aucuneLigne);
  assert.ok(!v.ok && /Montant moyen/.test(v.message));
  assert.ok(!validerSelonSpec(composite, valeurs({ nombre: 12, pirate: 1 }), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(composite, saisie("12"), aucuneLigne).ok);
});

const tableauCanaux: ReponseSpec = {
  type: "tableau",
  lignes: { source: "declencheur", cle: "D03" },
  colonnes: [
    { id: "part", libelle: "Part des demandes", spec: { type: "nombre", unite: "pourcent", min: 0, max: 100 } },
    { id: "cout", libelle: "Dépense", spec: { type: "nombre", unite: "euros", min: 0 } },
  ],
  total: { colonne: "part", valeur: 100 },
};

test("un tableau dont les lignes viennent d'un cadrage : seules les lignes cochées existent, le total est contrôlé", () => {
  const ctx = { lignesDeclencheur: (c: string) => (c === "D03" ? ["site", "fiche_google"] : []) };
  assert.ok(validerSelonSpec(tableauCanaux, valeurs({ "site.part": 60, "fiche_google.part": 40, "site.cout": 500 }), ctx).ok);
  assert.ok(validerSelonSpec(tableauCanaux, valeurs({}), ctx).ok);
  const total = validerSelonSpec(tableauCanaux, valeurs({ "site.part": 60, "fiche_google.part": 30 }), ctx);
  assert.ok(!total.ok && /total/.test(total.message), "le total doit faire 100");
  assert.ok(!validerSelonSpec(tableauCanaux, valeurs({ "salons.part": 100 }), ctx).ok, "un canal non coché n'a pas de ligne");
  assert.ok(!validerSelonSpec(tableauCanaux, valeurs({ "site.part": 120, "fiche_google.part": -20 }), ctx).ok);
  assert.ok(validerSelonSpec(tableauCanaux, valeurs({ "site.part": 99.7, "fiche_google.part": 0.1 }), ctx).ok, "tolérance d'arrondi de 0,5");
});

test("un tableau à lignes libres accepte des noms et limite le nombre de lignes", () => {
  const libre: ReponseSpec = { type: "tableau", lignes: { source: "libre", max: 3 }, colonnes: [{ id: "montant", libelle: "Montant", spec: { type: "nombre", unite: "euros" } }] };
  assert.ok(validerSelonSpec(libre, valeurs({ "1.nom": "Crédit camion", "1.montant": 9000, "2.montant": 1200 }), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(libre, valeurs({ "4.montant": 1 }), aucuneLigne).ok);
});

test("la réponse structurée est reconnue comme une réponse seulement si une valeur est renseignée", () => {
  assert.equal(aUneReponse({ genre: "valeurs", valeurs: { a: null, b: "" } }), false);
  assert.equal(aUneReponse({ genre: "valeurs", valeurs: { a: null, b: 0 } }), true, "zéro est une valeur");
  assert.ok(reponseSchema.safeParse({ genre: "valeurs", valeurs: { a: 1 } }).success);
  assert.ok(!reponseSchema.safeParse({ genre: "valeurs", valeurs: { a: Infinity } }).success);
  assert.ok(!reponseSchema.safeParse({ genre: "valeurs", valeurs: { a: { x: 1 } } }).success);
});

// --- Branchement sur la banque et l'assemblage ---------------------------------------------

function avecBanque(code: string, reponse: ReponseSpec | null): EnsembleDonnees {
  const e: EnsembleDonnees = structuredClone(reel);
  e.banque = [{ donnee: code, texte: "Question de test", aide: null, repli: null, reponse }];
  return e;
}
const donneeAvecFormat = (f: string) => reel.donnees.find((d) => d.mode === "demandee" && d.format === f)!;

test("la spécification de la banque l'emporte sur celle du classeur ; sinon celle du classeur ; sinon aucune", () => {
  const nombreSimple = donneeAvecFormat("Nombre");
  assert.equal(specDeLaDonnee(reel, nombreSimple.code).source, "classeur");
  const choixLibre = donneeAvecFormat("Choix");
  assert.deepEqual(specDeLaDonnee(reel, choixLibre.code), { spec: null, source: null });
  const e = avecBanque(choixLibre.code, { type: "choix", options: [{ id: "a", libelle: "A" }, { id: "b", libelle: "B" }] });
  assert.equal(specDeLaDonnee(e, choixLibre.code).source, "banque");
});

test("le serveur refuse une réponse qui ne correspond pas à la spécification, et accepte une qui correspond", () => {
  const choixLibre = donneeAvecFormat("Choix");
  const e = avecBanque(choixLibre.code, { type: "choix", options: [{ id: "a", libelle: "A" }, { id: "b", libelle: "B" }] });
  assert.ok(validerReponse(e, choixLibre.code, { genre: "saisie", valeur: "a" }).ok);
  assert.ok(!validerReponse(e, choixLibre.code, { genre: "saisie", valeur: "zzz" }).ok);
  assert.ok(!validerReponse(e, choixLibre.code, { genre: "exact", valeur: 3 }).ok);
  assert.ok(validerReponse(e, choixLibre.code, { genre: "inconnu" }).ok);
  // Sans spécification, un texte libre reste permis mais pas un chiffre ni des valeurs.
  assert.ok(validerReponse(reel, choixLibre.code, { genre: "saisie", valeur: "texte libre" }).ok);
  assert.ok(!validerReponse(reel, choixLibre.code, { genre: "valeurs", valeurs: { a: 1 } }).ok);
});

test("le serveur contrôle les lignes d'un tableau avec les réponses déjà données au cadrage", () => {
  const cible = reel.donnees.find((d) => (d.mode === "demandee" || d.mode === "partagee") && d.format === "Tableau par canal")!;
  const e = avecBanque(cible.code, tableauCanaux);
  const deja = { D03: saisie(["site"]) };
  assert.ok(validerReponse(e, cible.code, { genre: "valeurs", valeurs: { "site.part": 100 } }, deja).ok);
  assert.ok(!validerReponse(e, cible.code, { genre: "valeurs", valeurs: { "salons.part": 100 } }, deja).ok);
  assert.ok(!validerReponse(e, cible.code, { genre: "valeurs", valeurs: { "site.part": 100 } }, {}).ok, "sans canal coché, aucune ligne");
});

test("l'assemblage transmet la spécification et en précise l'origine", () => {
  const choixLibre = donneeAvecFormat("Choix");
  const spec: ReponseSpec = { type: "choix", options: [{ id: "a", libelle: "A" }, { id: "b", libelle: "B" }] };
  const e = avecBanque(choixLibre.code, spec);
  const rep = Object.fromEntries(reel.declencheurs.map((d) => [d.code, saisie("oui")]));
  const agent = reel.themes.find((t) => t.code === choixLibre.theme)!.agent;
  const a = assemblerQuestionnaire(e, { agent, profils: ["chantier"], taille: "equipe_2_5", niveau: "approfondi", reponses: rep });
  const toutes = a.themes.flatMap((t) => t.questions);
  const q = toutes.find((x) => x.code === choixLibre.code);
  if (q) {
    assert.deepEqual(q.spec, spec);
    assert.equal(q.specSource, "banque");
  }
  assert.ok(toutes.some((x) => x.specSource === "classeur" && x.spec?.type === "nombre"));
  assert.ok(toutes.some((x) => x.specSource === null && x.spec === null), "les questions à définir restent en saisie libre");
});

test("le contrôle signale une réponse de banque qui s'écarte du format du classeur ou dont le cadrage n'existe pas", () => {
  const nombreSimple = donneeAvecFormat("%");
  const e = avecBanque(nombreSimple.code, { type: "oui_non" });
  assert.ok(controlerDonnees(e).avertissements.some((a) => a.includes(nombreSimple.code) && a.includes("s'écarte")));
  const cible = reel.donnees.find((d) => (d.mode === "demandee" || d.mode === "partagee") && d.format === "Tableau par canal")!;
  const mauvais = avecBanque(cible.code, { ...tableauCanaux, lignes: { source: "declencheur", cle: "D99" } } as ReponseSpec);
  assert.ok(controlerDonnees(mauvais).erreurs.some((m) => m.includes("D99")));
});

test("les chiffres du contrôle : ce que le classeur permet de déduire et ce que la banque doit définir", () => {
  const r = controlerDonnees(reel);
  const deduit = r.statistiques["données posées dont la réponse se déduit du format"];
  const adefinir = r.statistiques["données posées dont la réponse reste à définir dans la banque"];
  assert.equal(deduit + adefinir, reel.donnees.filter((d) => d.mode === "demandee" || d.mode === "partagee").length);
  assert.ok(deduit > 150 && adefinir > 150);
});

// --- Du formulaire à la réponse --------------------------------------------------------------

import { construireReponse, saisieInitiale } from "../src/lib/audit/saisie.ts";

test("la saisie d'un chiffre devient une réponse exacte ou une fourchette, un champ vide ne devient rien", () => {
  const nb: ReponseSpec = { type: "nombre", unite: "euros", min: 0 };
  assert.deepEqual(construireReponse(nb, { sous: "exact", exact: "1 250,5" }, aucuneLigne), { reponse: { genre: "exact", valeur: 1250.5 }, erreur: null });
  assert.deepEqual(construireReponse(nb, { sous: "exact", exact: "  " }, aucuneLigne), { reponse: null, erreur: null });
  assert.deepEqual(construireReponse(nb, { sous: "estimation", min: "30", max: "40" }, aucuneLigne).reponse, { genre: "estimation", min: 30, max: 40 });
  assert.equal(construireReponse(nb, { sous: "estimation", min: "30", max: "" }, aucuneLigne).reponse, null, "il manque la deuxième borne : rien n'est envoyé, sans erreur");
  assert.equal(construireReponse(nb, { sous: "estimation", min: "30", max: "" }, aucuneLigne).erreur, null);
  assert.match(construireReponse(nb, { sous: "estimation", min: "40", max: "30" }, aucuneLigne).erreur ?? "", /minimum/);
  assert.match(construireReponse(nb, { sous: "exact", exact: "abc" }, aucuneLigne).erreur ?? "", /pas un nombre lisible/);
  assert.match(construireReponse(nb, { sous: "exact", exact: "-5" }, aucuneLigne).erreur ?? "", /inférieure à 0/);
});

test("un tableau saisi devient des valeurs « ligne.colonne » contrôlées ; le total est vérifié avant l'envoi", () => {
  const ctx = { lignesDeclencheur: () => ["site", "fiche_google"] };
  const ok = construireReponse(tableauCanaux, { champs: { "site.part": "60", "fiche_google.part": "40", "site.cout": "1 200" } }, ctx);
  assert.deepEqual(ok.reponse, { genre: "valeurs", valeurs: { "site.part": 60, "fiche_google.part": 40, "site.cout": 1200 } });
  const faux = construireReponse(tableauCanaux, { champs: { "site.part": "60", "fiche_google.part": "30" } }, ctx);
  assert.match(faux.erreur ?? "", /total/);
  assert.match(construireReponse(tableauCanaux, { champs: { "site.part": "beaucoup" } }, ctx).erreur ?? "", /Part des demandes/);
  assert.deepEqual(construireReponse(tableauCanaux, { champs: { "site.part": "" } }, ctx), { reponse: null, erreur: null });
});

test("un champ à plusieurs valeurs : les champs vides sont ignorés", () => {
  const r = construireReponse(composite, { champs: { nombre: "12", montant: "" } }, aucuneLigne);
  assert.deepEqual(r.reponse, { genre: "valeurs", valeurs: { nombre: 12 } });
});

test("sans spécification, un texte libre ; une réponse enregistrée se réaffiche à l'identique", () => {
  assert.deepEqual(construireReponse(null, { texte: " Particuliers " }, aucuneLigne).reponse, { genre: "saisie", valeur: "Particuliers" });
  assert.equal(construireReponse(null, { texte: "" }, aucuneLigne).reponse, null);
  const nb: ReponseSpec = { type: "nombre", unite: "pourcent" };
  assert.deepEqual(saisieInitiale(nb, { genre: "exact", valeur: 12.5 }), { sous: "exact", exact: "12,5" });
  assert.deepEqual(saisieInitiale(nb, { genre: "estimation", min: 3, max: 4 }), { sous: "estimation", min: "3", max: "4" });
  assert.deepEqual(saisieInitiale({ type: "oui_non" }, { genre: "saisie", valeur: "non" }), { choix: "non" });
  assert.deepEqual(saisieInitiale({ type: "cases", options: [{ id: "a", libelle: "A" }, { id: "b", libelle: "B" }] }, { genre: "saisie", valeur: ["a"] }), { cases: ["a"] });
  const rt = construireReponse(composite, saisieInitiale(composite, { genre: "valeurs", valeurs: { nombre: 12, montant: 850.5 } }), aucuneLigne);
  assert.deepEqual(rt.reponse, { genre: "valeurs", valeurs: { nombre: 12, montant: 850.5 } }, "aller-retour sans perte");
});

// --- Liste libre et tableau dont les lignes viennent d'une liste ------------------------------------

import { idsDeListe } from "../src/lib/donnees/reponse-spec.ts";

test("une liste libre : bornes, doublons, éléments vides", () => {
  const liste: ReponseSpec = { type: "liste", max: 3, min: 1 };
  assert.ok(validerSelonSpec(liste, saisie(["Particuliers", "Artisans"]), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(liste, saisie(["A", "B", "C", "D"]), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(liste, saisie([]), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(liste, saisie(["A", "a"]), aucuneLigne).ok, "doublon à la casse près");
  assert.ok(!validerSelonSpec(liste, saisie(["A", " "]), aucuneLigne).ok);
  assert.ok(!validerSelonSpec(liste, saisie("A"), aucuneLigne).ok);
  assert.deepEqual(construireReponse(liste, { liste: ["  Particuliers ", "", "Artisans"] }, aucuneLigne).reponse, { genre: "saisie", valeur: ["Particuliers", "Artisans"] });
});

test("des identifiants de ligne stables, sans accent, uniques", () => {
  assert.deepEqual(idsDeListe(["Particuliers", "Collectivités", "collectivites"]), ["particuliers", "collectivites", "collectivites_2"]);
});

test("un tableau dont les lignes sont les éléments d'une liste précédente", () => {
  const t: ReponseSpec = {
    type: "tableau",
    lignes: { source: "donnee", code: "ACQ-01.01" },
    colonnes: [{ id: "part", libelle: "Part du CA", spec: { type: "nombre", unite: "pourcent", min: 0, max: 100 } }],
    total: { colonne: "part", valeur: 100 },
  };
  assert.ok(reponseSpec.safeParse(t).success);
  const ctx = { lignesDeclencheur: () => [], elementsDeListe: (c: string) => (c === "ACQ-01.01" ? ["Particuliers", "Collectivités"] : []) };
  assert.ok(validerSelonSpec(t, valeurs({ "particuliers.part": 70, "collectivites.part": 30 }), ctx).ok);
  assert.ok(!validerSelonSpec(t, valeurs({ "particuliers.part": 70, "collectivites.part": 20 }), ctx).ok);
  assert.ok(!validerSelonSpec(t, valeurs({ "artisans.part": 100 }), ctx).ok, "un type de client absent de la liste n'a pas de ligne");
});

test("le contrôle exige que la liste source d'un tableau soit une liste dans la banque", () => {
  const cible = reel.donnees.find((d) => d.mode === "demandee" && d.format === "% par ligne")!;
  const t: ReponseSpec = { type: "tableau", lignes: { source: "donnee", code: "ACQ-01.01" }, colonnes: [{ id: "part", libelle: "Part", spec: { type: "nombre", unite: "pourcent" } }] };
  const e: EnsembleDonnees = structuredClone(reel);
  e.banque = [{ donnee: cible.code, texte: "T", aide: null, repli: null, reponse: t }];
  assert.ok(controlerDonnees(e).erreurs.some((m) => m.includes("ACQ-01.01") && m.includes("liste")));
  e.banque.push({ donnee: "ACQ-01.01", texte: "Vos types de clients", aide: null, repli: null, reponse: { type: "liste", max: 4 } });
  assert.deepEqual(controlerDonnees(e).erreurs, []);
});

test("une case d'une ligne qui n'existe plus (canal décoché) est ignorée au lieu de bloquer le tableau", () => {
  const ctx = { lignesDeclencheur: () => ["site"] };
  const r = construireReponse(tableauCanaux, { champs: { "site.part": "100", "fiche_google.part": "0", "fiche_google.cout": "300" } }, ctx);
  assert.deepEqual(r, { reponse: { genre: "valeurs", valeurs: { "site.part": 100 } }, erreur: null });
  const aucune = construireReponse(tableauCanaux, { champs: { "fiche_google.part": "10" } }, ctx);
  assert.deepEqual(aucune, { reponse: null, erreur: null });
});

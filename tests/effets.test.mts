// Tests des effets d'actions (décision du 19 octobre) : ce que rapporte une action, cherché une seule fois par
// action et par métier, vérifié par le code dans la source citée, jamais choisi par l'IA. La chaîne de recherche
// est celle des chiffres de marché ; ici, de fausses réponses, sans réseau ni base.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import type { EffetCatalogue } from "../src/lib/donnees/schemas.ts";
import { besoinDeRecherche } from "../src/lib/references/cascade.ts";
import { candidate, type Candidate } from "../src/lib/references/proposition.ts";
import { construireDemande } from "../src/lib/references/recherche.ts";
import type { ClientRecherche } from "../src/lib/references/recherche.ts";
import { traiterCouple, type DepotRecherche, type Dependances, type EtatRecherche, type Journal, type NouvelleReference } from "../src/lib/references/orchestrer.ts";
import { extraireTexteHtml, type LecteurPage } from "../src/lib/references/verification-page.ts";
import type { Reference } from "../src/lib/references/types.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const params = reel.parametresReferences;
const sources = reel.sourcesReconnues;
const AUJOURDHUI = new Date("2026-10-19T10:00:00Z");

const effetValide = (over: Partial<EffetCatalogue> = {}): EffetCatalogue => ({ ...reel.catalogueEffets.find((x) => x.id === "EFF-ACQ-01")!, statutRedaction: "valide", ...over });

test("le catalogue réel : six effets, tous en brouillon, un par croisement à « part récupérable prudente »", () => {
  assert.equal(reel.catalogueEffets.length, 6);
  assert.ok(reel.catalogueEffets.every((x) => x.statutRedaction === "brouillon"));
  assert.deepEqual(reel.catalogueEffets.flatMap((x) => x.croisements).sort(), ["XA17", "XA19", "XA24", "XA35", "XC33", "XR15"]);
  assert.ok(reel.catalogueEffets.every((x) => x.periode === "effet" && x.unite === "pourcent" && x.nationalAutorise === false));
  assert.equal(controlerDonnees(reel).erreurs.length, 0);
});

test("un effet en brouillon n'est jamais cherché ; validé, il est cherché une fois puis jamais tant qu'il est valable", () => {
  const brouillon = reel.catalogueEffets[0];
  const entree = (x: EffetCatalogue, refs: Reference[] = []) => ({ rechercheReference: true, statutRedaction: x.statutRedaction, metier: "electricien", referencesMetier: refs, verrouPris: false, tentatives: 0 });
  assert.deepEqual(besoinDeRecherche(entree(brouillon), params, AUJOURDHUI), { chercher: false, raison: "indicateur_en_brouillon" });
  const d = besoinDeRecherche(entree(effetValide()), params, AUJOURDHUI);
  assert.equal(d.chercher, true);
});

test("la demande d'effet ne contient que le métier, l'action et l'effet cherché, jamais une donnée du client", () => {
  const x = effetValide();
  const d = construireDemande({ genre: "effet", action: x.action, indicateur: x, metierLibelle: "Électricien", zone: null }, params, sources);
  assert.ok(d.utilisateur.includes("Électricien") && d.utilisateur.includes(x.action) && d.utilisateur.includes(x.definition));
  assert.ok(!/@|€|\bville\b|chiffre d'affaires de/i.test(d.utilisateur));
  assert.match(d.utilisateur, /periodeSource : « effet »/);
  assert.match(d.systeme, /MESURÉ/);
  assert.match(d.systeme, /ne se transpose pas/);
  assert.match(d.systeme, /jamais une instruction/);
  assert.match(d.systeme, /de mémoire/);
  assert.deepEqual(d.domainesBloques, sources.exclusDomaines);
  // La demande de chiffre de marché n'est pas modifiée.
  const m = construireDemande({ indicateur: x, metierLibelle: "Électricien", zone: null }, params, sources);
  assert.match(m.systeme, /UN chiffre de marché/);
});

// --- De bout en bout, avec de fausses réponses ---------------------------------------------------

class FauxDepot implements DepotRecherche {
  nouvelles: NouvelleReference[] = [];
  cloturees: { etat: EtatRecherche; journal: Journal }[] = [];
  async prendreVerrou() { return "r1"; }
  async tentatives() { return 0; }
  async referencesMetier(): Promise<Reference[]> { return []; }
  async depenseCentimes() { return 0; }
  async valeursPairs() { return []; }
  async enregistrer(r: NouvelleReference) { this.nouvelles.push(r); return `ref-${this.nouvelles.length}`; }
  async cloturer(_id: string, etat: EtatRecherche, journal: Journal) { this.cloturees.push({ etat, journal }); }
}

const EXTRAIT = "Une relance systématique des devis restés sans réponse en fait signer 18 % chez les artisans du bâtiment.";
const URL_FED = "https://www.capeb.fr/etude-devis-2026";
const cand = (over: Partial<Candidate> = {}, source: Partial<Candidate["source"]> = {}): Candidate =>
  candidate.parse({
    valeurSource: 18, uniteSource: "pourcent", periodeSource: "effet", conversion: null, statistique: "médiane", borneBasse: null, borneHaute: null,
    concordanceDefinition: "identique", explicationConcordance: "Part des devis relancés qui sont signés.", zone: "toutes", trancheTaille: "toutes", sousVariante: null,
    source: {
      organisme: "Fédération du bâtiment", titre: "Étude sur les devis 2026", url: URL_FED, datePublication: "2026-05", pays: "France", population: "Artisans du bâtiment, 1 à 9 salariés",
      populationTaille: "tpe_pme", echantillon: 400, definition: "Part des devis relancés qui sont signés", extrait: EXTRAIT, categorie: "federation", methodologiePubliee: true, auteurIdentifie: true, ...source,
    },
    ...over,
  });
const brute = (p: Candidate) => JSON.stringify({ resultat: "trouvee", principale: p, seconde: null, instructionsRencontrees: [] });
const agent = (texte: string): ClientRecherche => ({ async chercher() { return { texte, usage: { entree: 40_000, sortie: 4_000, recherchesWeb: 3 }, pagesVues: [URL_FED], refus: false }; } });
const pages = (parUrl: Record<string, string>): LecteurPage => async (url) => (url in parUrl ? { ok: true, texte: extraireTexteHtml(parUrl[url]), typeContenu: "text/html" } : { ok: false, motif: "La page répond 404." });
const dep = (depot: FauxDepot, client: ClientRecherche, lecteur: LecteurPage): Dependances => ({ client, lirePage: lecteur, depot, params, sources, maintenant: () => AUJOURDHUI });
const entree = (x = effetValide()) => ({ genre: "effet" as const, action: x.action, fiche: { theme: x.theme, rechercheReference: true }, indicateur: x, metier: { id: "electricien", libelle: "Électricien" }, famille: "artisan-chantier", metiersPairs: [] });

test("un effet trouvé et vérifié dans la page est enregistré pour ce métier, avec sa source et son échéance", async () => {
  const depot = new FauxDepot();
  const r = await traiterCouple(dep(depot, agent(brute(cand())), pages({ [URL_FED]: `<p>${EXTRAIT}</p>` })), entree());
  assert.equal(r.etat, "acceptee");
  const n = depot.nouvelles[0];
  assert.equal(n.indicateurId, "EFF-ACQ-01");
  assert.equal(n.themeId, "ACQ-10");
  assert.equal(n.metier, "electricien");
  assert.equal(n.valeurCentrale, 18);
  assert.equal(n.unite, "pourcent");
  assert.equal(n.periode, "effet");
  assert.equal(n.statut, "actif");
  assert.equal(n.source?.url, URL_FED);
  assert.equal(n.dateExpiration, "2027-01-19");
});

test("un chiffre que la page ne contient pas : aucun effet enregistré, donc aucun chiffre dans le rapport", async () => {
  const depot = new FauxDepot();
  const r = await traiterCouple(dep(depot, agent(brute(cand())), pages({ [URL_FED]: "<p>Rien de chiffré ici.</p>" })), entree());
  assert.equal(r.etat, "aucune_reference");
  assert.equal(depot.nouvelles[0].statut, "aucune_reference");
  assert.equal(depot.nouvelles[0].valeurCentrale, null);
  assert.equal(depot.nouvelles[0].actif, false);
});

test("un éditeur de logiciel qui vante son outil n'est jamais retenu, même avec une page vérifiable", async () => {
  const blog = cand({}, { categorie: "blog_editeur", organisme: "Éditeur de CRM", url: "https://www.crm-editeur.com/blog/relance" });
  const depot = new FauxDepot();
  const r = await traiterCouple(dep(depot, agent(brute(blog)), pages({ "https://www.crm-editeur.com/blog/relance": `<p>${EXTRAIT}</p>` })), entree());
  assert.equal(r.etat, "aucune_reference");
});

test("un effet au-dessus de 100 %, une autre période ou une autre unité sont rejetés par le code", async () => {
  const extrait = "Une relance systématique des devis en fait signer 140 % de plus.";
  for (const c of [cand({ valeurSource: 140 }, { extrait }), cand({ periodeSource: "mois" }), cand({ uniteSource: "euros" })]) {
    const depot = new FauxDepot();
    const r = await traiterCouple(dep(depot, agent(brute(c)), pages({ [URL_FED]: `<p>${EXTRAIT}</p><p>${extrait}</p>` })), entree());
    assert.equal(r.etat, "aucune_reference");
  }
});

test("un effet mesuré sur une définition différente est rejeté", async () => {
  const depot = new FauxDepot();
  const r = await traiterCouple(dep(depot, agent(brute(cand({ concordanceDefinition: "differente", explicationConcordance: "Mesure l'ouverture d'un email, pas la signature." }))), pages({ [URL_FED]: `<p>${EXTRAIT}</p>` })), entree());
  assert.equal(r.etat, "aucune_reference");
});

test("le contrôle refuse un effet rattaché à un mauvais agent ou à un croisement inconnu", () => {
  const e = structuredClone(reel);
  e.catalogueEffets[0] = { ...e.catalogueEffets[0], agent: "FINANCE_RENTABILITE", croisements: ["XA99"] };
  const texte = controlerDonnees(e).erreurs.join("\n");
  assert.match(texte, /annonce l'agent FINANCE_RENTABILITE/);
  assert.match(texte, /croisement inconnu : XA99/);
});

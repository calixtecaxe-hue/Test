// Tests des références de marché, étape a : catalogue des thèmes, forme d'une référence, cascade,
// décision de lancer une recherche, échéances, contexte d'un compte et affichage d'un thème sans
// référence. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { besoinDeRecherche, choisirReference, echeanceDeMiseAJour, type ContexteReference } from "../src/lib/references/cascade.ts";
import { activitePrincipale, contexteReference } from "../src/lib/references/contexte.ts";
import { reference, type Reference } from "../src/lib/references/types.ts";
import { constaterAgent } from "../src/lib/moteur/constat.ts";
import { presenterConstat } from "../src/lib/moteur/affichage-constat.ts";
import { assemblerQuestionnaire } from "../src/lib/audit/assemblage.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";
import { METIER_ABSENT } from "../src/lib/routage.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const params = reel.parametresReferences;
const AUJOURDHUI = new Date("2026-10-15T10:00:00Z");

// --- Catalogue -------------------------------------------------------------------------

test("le catalogue a une fiche par thème, et seuls les thèmes de nature Marché cherchent une référence", () => {
  assert.equal(reel.catalogue.length, reel.themes.length);
  for (const t of reel.themes) {
    const f = reel.catalogue.find((x) => x.theme === t.code)!;
    assert.ok(f, `fiche manquante pour ${t.code}`);
    if (t.nature !== "marche") {
      assert.equal(f.rechercheReference, false, `${t.code} (${t.nature}) ne doit jamais déclencher de recherche`);
      assert.deepEqual(f.indicateurs, []);
      assert.ok(f.motif);
    }
  }
  const aChercher = reel.catalogue.filter((f) => f.rechercheReference);
  assert.ok(aChercher.length > 0 && aChercher.every((f) => f.nature === "marche" && f.indicateurs.length > 0));
});

test("un volume absolu qui dépend de la taille ne se compare pas à un marché", () => {
  const f = reel.catalogue.find((x) => x.theme === "FIN-37")!;
  assert.equal(f.nature, "marche");
  assert.equal(f.rechercheReference, false);
  assert.match(f.motif ?? "", /taille/);
});

test("tout indicateur du catalogue est en brouillon : aucune recherche ne part sans validation", () => {
  const indicateurs = reel.catalogue.flatMap((f) => f.indicateurs);
  assert.ok(indicateurs.length > 0);
  assert.ok(indicateurs.every((i) => i.statutRedaction === "brouillon"));
  // Les bornes ne reposent que sur la logique : une part est entre 0 et 100, rien d'autre n'est inventé.
  for (const i of indicateurs.filter((x) => x.unite === "pourcent")) assert.deepEqual(i.bornesVraisemblance, { min: 0, max: 100 });
  for (const i of indicateurs.filter((x) => x.unite !== "pourcent")) assert.equal(i.bornesVraisemblance.max, null);
});

test("le contrôle des données accepte le catalogue et signale les brouillons", async () => {
  const { contr } = await import("../src/lib/donnees/controle.ts").then((m) => ({ contr: m.controlerDonnees(reel) }));
  assert.deepEqual(contr.erreurs, []);
  assert.ok(contr.avertissements.some((a) => a.includes("en brouillon")));
});

// --- Forme d'une référence ------------------------------------------------------------

const SOURCE = {
  organisme: "Fédération professionnelle X",
  titre: "Baromètre 2026",
  url: "https://exemple.fr/barometre-2026.pdf",
  datePublication: "2026-03",
  dateConsultation: "2026-10-01",
  pays: "France",
  population: "TPE du secteur",
  echantillon: 420,
  definition: "Part des devis signés",
  extrait: "Le taux de signature médian est de 32 %.",
  niveau: 1,
};

let n = 0;
function ref(over: Partial<Record<keyof Reference, unknown>> = {}): Reference {
  n++;
  return reference.parse({
    id: `r${n}`,
    themeId: "ACQ-10",
    indicateurId: "ACQ-10.13",
    niveau: "metier",
    metier: "electricien",
    famille: null,
    sousVariante: null,
    zone: "toutes",
    trancheTaille: "toutes",
    valeurCentrale: 32,
    borneBasse: 25,
    borneHaute: 40,
    statistique: "médiane",
    unite: "pourcent",
    periode: "mois",
    sens: "plus_haut_mieux",
    source: SOURCE,
    secondeSource: null,
    confiance: "solide",
    statut: "actif",
    dateExpiration: "2027-01-15",
    version: 1,
    actif: true,
    nbUtilisations: 0,
    motif: null,
    creeLe: "2026-10-01T00:00:00.000Z",
    ...over,
  });
}

test("aucune valeur de marché sans source citée", () => {
  assert.throws(() => ref({ source: null }), /source/i);
  assert.throws(() => ref({ valeurCentrale: null }), /valeur/i);
  assert.throws(() => ref({ confiance: null }), /confiance/i);
});

test("« aucune_reference » n'a pas de valeur et dit pourquoi", () => {
  assert.throws(() => ref({ statut: "aucune_reference", motif: null, valeurCentrale: null, source: null, confiance: null, actif: false }), /motif/);
  assert.throws(() => ref({ statut: "aucune_reference", motif: "rien trouvé" }), /valeur/);
  const ok = ref({ statut: "aucune_reference", motif: "Aucune source officielle", valeurCentrale: null, borneBasse: null, borneHaute: null, source: null, confiance: null, actif: false });
  assert.equal(ok.statut, "aucune_reference");
});

test("bornes inversées et niveau sans clé sont refusés", () => {
  assert.throws(() => ref({ borneBasse: 50, borneHaute: 10 }), /borne/);
  assert.throws(() => ref({ niveau: "metier", metier: null }), /métier/);
  assert.throws(() => ref({ niveau: "famille", metier: null, famille: null }), /famille/);
});

// --- Cascade ---------------------------------------------------------------------------

const IND = { id: "ACQ-10.13", nationalAutorise: false };
const CLIENT: ContexteReference = { metier: "electricien", sousVariante: null, famille: "artisan-chantier", zone: "PERIURBAINE", taille: "equipe_2_5" };

test("la référence la plus précise l'emporte : métier + zone + taille avant métier seul", () => {
  const generale = ref({ valeurCentrale: 30 });
  const zone = ref({ zone: "PERIURBAINE", valeurCentrale: 31 });
  const fine = ref({ zone: "PERIURBAINE", trancheTaille: "equipe_2_5", valeurCentrale: 33 });
  assert.equal(choisirReference([generale, zone, fine], IND, CLIENT, AUJOURDHUI)?.reference.valeurCentrale, 33);
  assert.equal(choisirReference([generale, zone], IND, CLIENT, AUJOURDHUI)?.reference.valeurCentrale, 31);
  assert.equal(choisirReference([generale], IND, CLIENT, AUJOURDHUI)?.reference.valeurCentrale, 30);
});

test("une référence d'une autre zone, d'une autre taille ou d'une autre activité ne s'applique pas", () => {
  const rurale = ref({ zone: "RURALE" });
  const grande = ref({ trancheTaille: "structure_6_plus" });
  const autreActivite = ref({ sousVariante: "syndic" });
  assert.equal(choisirReference([rurale, grande, autreActivite], IND, CLIENT, AUJOURDHUI), null);
  const bonne = ref({ sousVariante: "transaction", valeurCentrale: 28 });
  assert.equal(choisirReference([bonne], IND, { ...CLIENT, sousVariante: "transaction" }, AUJOURDHUI)?.reference.valeurCentrale, 28);
});

test("sans référence au niveau métier, on retombe sur la famille ; le national seulement si l'indicateur l'autorise", () => {
  const famille = ref({ niveau: "famille", metier: null, famille: "artisan-chantier", valeurCentrale: 27 });
  const national = ref({ niveau: "national", metier: null, valeurCentrale: 20 });
  assert.equal(choisirReference([famille, national], IND, CLIENT, AUJOURDHUI)?.niveau, "famille");
  assert.equal(choisirReference([national], IND, CLIENT, AUJOURDHUI), null);
  const r = choisirReference([national], { ...IND, nationalAutorise: true }, CLIENT, AUJOURDHUI);
  assert.equal(r?.niveau, "national");
  // La famille d'un autre secteur ne s'applique jamais.
  assert.equal(choisirReference([ref({ niveau: "famille", metier: null, famille: "commerce" })], IND, CLIENT, AUJOURDHUI), null);
});

test("le métier passe avant la famille, même moins précis", () => {
  const metier = ref({ valeurCentrale: 30 });
  const famille = ref({ niveau: "famille", metier: null, famille: "artisan-chantier", zone: "PERIURBAINE", trancheTaille: "equipe_2_5", valeurCentrale: 99 });
  assert.equal(choisirReference([famille, metier], IND, CLIENT, AUJOURDHUI)?.niveau, "metier");
});

test("un métier absent de la liste n'utilise que la famille", () => {
  const metier = ref();
  const famille = ref({ niveau: "famille", metier: null, famille: "artisan-chantier", valeurCentrale: 27 });
  const r = choisirReference([metier, famille], IND, { ...CLIENT, metier: null }, AUJOURDHUI);
  assert.equal(r?.niveau, "famille");
});

test("rejetée, à revoir, inactive, sans valeur ou d'un autre indicateur : jamais utilisée", () => {
  const exclues = [
    ref({ statut: "rejete" }),
    ref({ statut: "a_revoir" }),
    ref({ actif: false }),
    ref({ statut: "aucune_reference", motif: "x", valeurCentrale: null, borneBasse: null, borneHaute: null, source: null, confiance: null, actif: true }),
    ref({ indicateurId: "ACQ-10.14" }),
  ];
  assert.equal(choisirReference(exclues, IND, CLIENT, AUJOURDHUI), null);
  assert.equal(choisirReference([...exclues, ref({ statut: "valide_fondateur", valeurCentrale: 35 })], IND, CLIENT, AUJOURDHUI)?.reference.valeurCentrale, 35);
});

test("à précision égale, la plus confiante puis la plus récente", () => {
  const indicative = ref({ confiance: "indicatif", valeurCentrale: 10, creeLe: "2026-10-10T00:00:00.000Z" });
  const solide = ref({ confiance: "solide", valeurCentrale: 20, creeLe: "2026-09-01T00:00:00.000Z" });
  assert.equal(choisirReference([indicative, solide], IND, CLIENT, AUJOURDHUI)?.reference.valeurCentrale, 20);
  const recente = ref({ confiance: "solide", valeurCentrale: 21, creeLe: "2026-10-05T00:00:00.000Z" });
  assert.equal(choisirReference([solide, recente], IND, CLIENT, AUJOURDHUI)?.reference.valeurCentrale, 21);
});

test("une référence périmée reste utilisée mais est signalée à revérifier", () => {
  const vieille = ref({ dateExpiration: "2026-01-01" });
  const r = choisirReference([vieille], IND, CLIENT, AUJOURDHUI)!;
  assert.equal(r.perimee, true);
  assert.equal(choisirReference([ref()], IND, CLIENT, AUJOURDHUI)!.perimee, false);
});

// --- Faut-il chercher ? ----------------------------------------------------------------

const BESOIN = { rechercheReference: true, statutRedaction: "valide" as const, metier: "electricien", referencesMetier: [] as Reference[], verrouPris: false, tentatives: 0 };

test("une recherche part pour un couple indicateur + métier validé, sans référence ni échec récent", () => {
  assert.deepEqual(besoinDeRecherche(BESOIN, params, AUJOURDHUI), { chercher: true, raison: "a_chercher" });
});

test("aucune recherche pour un thème sans comparaison, un indicateur en brouillon ou un métier inconnu", () => {
  assert.equal(besoinDeRecherche({ ...BESOIN, rechercheReference: false }, params, AUJOURDHUI).raison, "pas_de_recherche_pour_ce_theme");
  assert.equal(besoinDeRecherche({ ...BESOIN, statutRedaction: "brouillon" }, params, AUJOURDHUI).raison, "indicateur_en_brouillon");
  assert.equal(besoinDeRecherche({ ...BESOIN, metier: null }, params, AUJOURDHUI).raison, "metier_inconnu");
});

test("pas de recherche quand une référence de métier existe, qu'un verrou est pris ou que le plafond est atteint", () => {
  assert.equal(besoinDeRecherche({ ...BESOIN, referencesMetier: [ref()] }, params, AUJOURDHUI).raison, "reference_metier_active");
  assert.equal(besoinDeRecherche({ ...BESOIN, verrouPris: true }, params, AUJOURDHUI).raison, "recherche_en_cours");
  assert.equal(besoinDeRecherche({ ...BESOIN, tentatives: 4 }, params, AUJOURDHUI).raison, "plafond_de_tentatives");
  assert.equal(besoinDeRecherche({ ...BESOIN, tentatives: 3 }, params, AUJOURDHUI).chercher, true);
});

test("un échec récent bloque la recherche 90 jours, pas davantage", () => {
  const echec = (creeLe: string) => ref({ statut: "aucune_reference", motif: "Rien de vérifiable", valeurCentrale: null, borneBasse: null, borneHaute: null, source: null, confiance: null, actif: false, creeLe });
  assert.equal(besoinDeRecherche({ ...BESOIN, referencesMetier: [echec("2026-09-01T00:00:00.000Z")] }, params, AUJOURDHUI).raison, "aucune_reference_recente");
  assert.equal(besoinDeRecherche({ ...BESOIN, referencesMetier: [echec("2026-06-01T00:00:00.000Z")] }, params, AUJOURDHUI).chercher, true);
});

// --- Échéances --------------------------------------------------------------------------

test("mise à jour tous les 3 mois par défaut, réglable par catégorie, sans débordement de fin de mois", () => {
  assert.equal(echeanceDeMiseAJour(new Date("2026-10-15T00:00:00Z"), "artisan-chantier", params), "2027-01-15");
  const sur = { ...params, miseAJour: { moisParDefaut: 3, moisParCategorie: { commerce: 6, restauration: 1 } } };
  assert.equal(echeanceDeMiseAJour(new Date("2026-10-15T00:00:00Z"), "commerce", sur), "2027-04-15");
  assert.equal(echeanceDeMiseAJour(new Date("2026-10-15T00:00:00Z"), "restauration", sur), "2026-11-15");
  assert.equal(echeanceDeMiseAJour(new Date("2026-01-31T00:00:00Z"), "x", { ...params, miseAJour: { moisParDefaut: 1, moisParCategorie: {} } }), "2026-02-28");
  assert.equal(echeanceDeMiseAJour(new Date("2027-11-30T00:00:00Z"), "x", params), "2028-02-29");
});

// --- Contexte d'un compte ---------------------------------------------------------------

test("l'activité principale : celle par défaut si elle est cochée, « Autre » seule la prend, sinon la première cochée", () => {
  assert.equal(activitePrincipale(reel.routage, "agence-immobiliere", ["gestion-locative", "transaction"]), "transaction");
  assert.equal(activitePrincipale(reel.routage, "agence-immobiliere", []), "transaction");
  assert.equal(activitePrincipale(reel.routage, "agence-immobiliere", ["syndic", "gestion-locative"]), "gestion-locative");
  assert.equal(activitePrincipale(reel.routage, "electricien", []), null);
});

test("le contexte d'un compte donne famille, zone et taille ; un métier absent n'a que sa famille", () => {
  const c = contexteReference(reel.routage, { metierPrecis: "agence-immobiliere", sousVariantes: ["gestion-locative"], categorie: "transaction-cycle-long", typeZone: "URBAINE_DENSE", effectif: 3 })!;
  assert.equal(c.metier, "agence-immobiliere");
  assert.equal(c.sousVariante, "gestion-locative");
  assert.equal(c.famille, "prestation-recurrente");
  assert.equal(c.taille, "equipe_2_5");
  const absent = contexteReference(reel.routage, { metierPrecis: METIER_ABSENT, sousVariantes: [], categorie: "commerce", typeZone: "RURALE", effectif: 1 })!;
  assert.equal(absent.metier, null);
  assert.equal(absent.famille, "commerce");
  assert.equal(absent.taille, "seul");
});

// --- Thème de nature Marché dans le constat ---------------------------------------------

const ctxAudit = { agent: "ACQUISITION_CA" as const, profils: ["chantier" as const], taille: "equipe_2_5" as const, niveau: "approfondi" as const };
const tous: Reponses = Object.fromEntries(reel.declencheurs.map((d) => [d.code, { genre: "saisie" as const, valeur: "oui" }]));
const assemblage = assemblerQuestionnaire(reel, { ...ctxAudit, reponses: tous });
const repondu: Reponses = { ...tous, ...Object.fromEntries(assemblage.themes.flatMap((t) => t.questions.map((q) => [q.code, { genre: "exact" as const, valeur: 5 }]))) };
const contexteClient = { zone: "PERIURBAINE", taille: "equipe_2_5" };

function themeAvecIndicateur() {
  const t = assemblage.themes.find((x) => reel.catalogue.find((f) => f.theme === x.theme.code)?.rechercheReference)!;
  assert.ok(t, "un thème de nature Marché avec indicateurs doit être posé à ce profil");
  const fiche = reel.catalogue.find((f) => f.theme === t.theme.code)!;
  return { theme: t.theme.code, indicateur: fiche.indicateurs[0] };
}

test("un thème de nature Marché sans référence reste affiché, sans comparaison et sans message d'erreur", () => {
  const { theme } = themeAvecIndicateur();
  const c = constaterAgent(reel, [], assemblage, repondu, contexteClient).find((x) => x.theme === theme)!;
  assert.equal(c.statut, "aucune_reference");
  assert.equal(c.couleur, null);
  assert.deepEqual(c.reperes, []);
  assert.ok(c.indicateursSansReference.length > 0);
  const p = presenterConstat(c);
  assert.equal(p.comparaisonMarche, false);
  assert.ok(p.message && !/règle|seuil|manquant|référence/i.test(p.message));
});

test("avec une référence applicable, le thème porte son repère : organisme, année, niveau, confiance", () => {
  const { theme, indicateur } = themeAvecIndicateur();
  const r = ref({ themeId: theme, indicateurId: indicateur.id, metier: null, niveau: "famille", famille: "artisan-chantier", sens: "plus_haut_mieux", unite: "pourcent" });
  const c = constaterAgent(reel, [], assemblage, repondu, {
    ...contexteClient,
    references: [r],
    contexteReference: { ...CLIENT, famille: "artisan-chantier" },
    aujourdhui: AUJOURDHUI,
  }).find((x) => x.theme === theme)!;
  assert.equal(c.statut, "reference_disponible");
  assert.equal(c.reperes.length, 1);
  assert.deepEqual({ ...c.reperes[0], referenceId: undefined }, {
    indicateur: indicateur.id, libelle: indicateur.libelle, niveau: "famille", organisme: "Fédération professionnelle X", annee: "2026",
    url: SOURCE.url, confiance: "solide", perimee: false, referenceId: undefined, version: 1,
  });
  assert.equal(presenterConstat(c).comparaisonMarche, true);
});

test("un thème de nature Pratique ou Cohérence garde « règle manquante » en interne, et un texte neutre pour le client", () => {
  const constats = constaterAgent(reel, [], assemblage, repondu, contexteClient);
  const pratique = constats.find((c) => c.nature === "pratique" && c.statut === "regle_manquante");
  assert.ok(pratique, "au moins un thème de pratique sans règle d'écrite");
  const p = presenterConstat(pratique!);
  assert.equal(p.comparaisonMarche, false);
  assert.ok(p.message && !/règle|seuil|manquant/i.test(p.message));
});

test("aucun statut ne montre au client un mot technique", () => {
  const constats = constaterAgent(reel, [], assemblage, repondu, contexteClient);
  for (const c of constats) {
    const msg = presenterConstat(c).message;
    if (msg) assert.ok(!/règle manquante|seuil|aucune_reference|data\//i.test(msg), `${c.theme} : ${msg}`);
  }
});

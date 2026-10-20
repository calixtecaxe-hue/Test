// Routage invisible : métier → catégorie → profil(s) d'entreprise.
//
// Le dirigeant choisit son métier (et, pour quelques métiers, ce qu'il fait réellement : « Cochez
// tout ce que vous faites ») ; le système le rattache en coulisse à une catégorie de modèle
// économique, puis aux profils qui pilotent les questions, les mots et les calculs (CLAUDE.md
// section 5). Les règles sont dans `data/routage.json` : ajouter un métier, c'est ajouter une
// entrée à ce fichier.
//
// Plusieurs activités cochées : le client a le socle une seule fois, plus le bloc de chaque
// activité, sans doublon. Pour l'accès à l'agent Comm, la règle la plus prudente l'emporte. Cochée
// seule, « Autre (précisez) » donne le questionnaire de l'activité par défaut du métier.
//
// Ce fichier n'importe que des types : il se teste directement avec Node.

import { PROFILS } from "./donnees/constantes.ts";
import type { CodeAgent, ProfilId, Routage } from "./donnees/schemas.ts";

// « Mon métier n'est pas dans la liste » : le client choisit lui-même une catégorie.
export const METIER_ABSENT = "absent";

export type StockMetier = "oui" | "non" | "a_demander";
export type AgentCommMetier = "oui" | "non" | "a_trancher";

export type ResultatRoutage = {
  metier: string;
  // Catégorie principale (celle de la première activité retenue), stockée sur le compte.
  categorie: { id: string; numero: number; libelle: string };
  // Toutes les catégories retenues (une par activité cochée).
  categories: string[];
  sousVariantes: string[];
  // « Autre (précisez) » seul : le questionnaire de l'activité par défaut s'applique.
  autre: boolean;
  // Profils retenus, dans l'ordre canonique. Le premier sert de profil principal.
  profils: ProfilId[];
  // Profils qui s'ajoutent selon une réponse posée plus tard (« vend en ligne »).
  profilsConditionnels: { profil: ProfilId; condition: string }[];
  // Stock : oui si une activité en a, « à demander » si une seule question suffit à trancher.
  stock: StockMetier;
  // Agent Comm : non si une activité l'exclut (règle la plus prudente), « à trancher » tant que la
  // décision est ouverte (l'agent reste proposé).
  agentComm: AgentCommMetier;
  reglementee: boolean;
  // Le questionnaire de cette catégorie reste à créer : aucun profil n'est rattaché.
  questionnaireACreer: boolean;
  agentsExclus: CodeAgent[];
  nombreMaxAgents: number | null;
};

export type ErreurRoutage = { champ: "metierPrecis" | "sousVariantes" | "categorieAbsente"; message: string };

export type OptionsRoutage = {
  // « Autre (précisez) » est cochée.
  autre?: boolean;
  // Catégorie choisie par le client qui ne trouve pas son métier.
  categorieAbsente?: string;
};

export function trouverMetier(routage: Routage, id: string) {
  return routage.metiers.find((m) => m.id === id);
}

// Les métiers dans l'ordre alphabétique français, pour la liste de l'inscription.
export function metiersTries(routage: Routage) {
  return [...routage.metiers].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
}

type Partie = {
  categorie: string;
  stock: StockMetier;
  agentComm: AgentCommMetier;
  profils?: ProfilId[];
  profilsImposes?: ProfilId[];
};

function fusionnerStock(parts: Partie[]): StockMetier {
  if (parts.some((p) => p.stock === "oui")) return "oui";
  if (parts.some((p) => p.stock === "a_demander")) return "a_demander";
  return "non";
}

// La règle la plus prudente l'emporte : une activité sans agent Comm l'enlève pour tout le compte.
function fusionnerComm(parts: Partie[]): AgentCommMetier {
  if (parts.some((p) => p.agentComm === "non")) return "non";
  if (parts.some((p) => p.agentComm === "a_trancher")) return "a_trancher";
  return "oui";
}

export function router(
  routage: Routage,
  metierId: string,
  sousVariantesCochees: string[],
  options: OptionsRoutage = {}
): { ok: true; routage: ResultatRoutage } | { ok: false; erreur: ErreurRoutage } {
  let parts: Partie[];
  let cochees: string[] = [];
  let autre = false;
  let profilsDuMetier: ProfilId[] = [];

  if (metierId === METIER_ABSENT) {
    // Métier absent de la liste : la catégorie est celle que le client a choisie.
    const c = routage.categories.find((x) => x.id === options.categorieAbsente);
    if (!c) return { ok: false, erreur: { champ: "categorieAbsente", message: "Choisissez ce qui ressemble le plus à votre activité." } };
    if (sousVariantesCochees.length > 0) return { ok: false, erreur: { champ: "sousVariantes", message: "Ce métier n'a pas d'activités à préciser." } };
    if (c.reglementee) return { ok: false, erreur: { champ: "categorieAbsente", message: "Pour une profession réglementée, choisissez votre métier dans la liste." } };
    parts = [{ categorie: c.id, stock: "a_demander", agentComm: "oui" }];
    return resultat(routage, METIER_ABSENT, parts, [], false, []);
  }

  const metier = trouverMetier(routage, metierId);
  if (!metier) return { ok: false, erreur: { champ: "metierPrecis", message: "Métier non reconnu." } };
  profilsDuMetier = metier.profils ?? [];

  const variantes = metier.sousVariantes ?? [];
  const demandees = [...new Set(sousVariantesCochees)];
  if (variantes.length === 0) {
    if (demandees.length > 0) return { ok: false, erreur: { champ: "sousVariantes", message: "Ce métier n'a pas d'activités à préciser." } };
    parts = [{ categorie: metier.categorie, stock: metier.stock, agentComm: metier.agentComm }];
  } else {
    if (demandees.some((c) => !variantes.some((v) => v.id === c))) {
      return { ok: false, erreur: { champ: "sousVariantes", message: "Activité non reconnue pour ce métier." } };
    }
    if (demandees.length === 0 && !options.autre) {
      return { ok: false, erreur: { champ: "sousVariantes", message: "Cochez au moins une activité, ou « Autre »." } };
    }
    cochees = variantes.map((v) => v.id).filter((id) => demandees.includes(id));
    if (cochees.length === 0) {
      // « Autre » seule : l'activité par défaut du métier.
      autre = true;
      const defaut = variantes.find((v) => v.defaut) ?? variantes[0];
      parts = [defaut];
    } else {
      parts = cochees.map((id) => variantes.find((v) => v.id === id)!);
    }
  }
  return resultat(routage, metier.id, parts, cochees, autre, profilsDuMetier, metier.profilsImposes ?? []);
}

function resultat(
  routage: Routage,
  metierId: string,
  parts: Partie[],
  cochees: string[],
  autre: boolean,
  profilsDuMetier: ProfilId[],
  profilsImposes: ProfilId[] = []
): { ok: true; routage: ResultatRoutage } | { ok: false; erreur: ErreurRoutage } {
  const categories = parts.map((p) => routage.categories.find((c) => c.id === p.categorie));
  if (categories.some((c) => !c)) return { ok: false, erreur: { champ: "metierPrecis", message: "Métier non reconnu." } };
  const cats = categories as NonNullable<(typeof categories)[number]>[];

  // Profils : ceux de chaque catégorie retenue, ou, quand elle n'en donne pas (professions
  // réglementées), ceux de l'activité ou du métier.
  const retenus = new Set<ProfilId>();
  parts.forEach((p, i) => {
    const imposes = p.profilsImposes ?? profilsImposes;
    const base = imposes.length > 0 ? imposes : cats[i].profils.length > 0 ? cats[i].profils : p.profils ?? profilsDuMetier;
    base.forEach((x) => retenus.add(x));
  });
  const profils = PROFILS.filter((p) => retenus.has(p));
  const premiere = cats[0];
  const reglementee = cats.some((c) => c.reglementee);
  const agentComm = fusionnerComm(parts);
  const agentsExclus = new Set<CodeAgent>();
  if (reglementee) routage.reglementees.agentsExclus.forEach((a) => agentsExclus.add(a));
  if (agentComm === "non") agentsExclus.add("COMM_CREATION");

  const conditionnels = new Map<string, { profil: ProfilId; condition: string }>();
  for (const c of cats) for (const pc of c.profilsConditionnels) conditionnels.set(`${pc.profil}|${pc.condition}`, pc);

  return {
    ok: true,
    routage: {
      metier: metierId,
      categorie: { id: premiere.id, numero: premiere.numero, libelle: premiere.libelle },
      categories: [...new Set(cats.map((c) => c.id))],
      sousVariantes: cochees,
      autre,
      profils,
      profilsConditionnels: [...conditionnels.values()],
      stock: fusionnerStock(parts),
      agentComm,
      reglementee,
      questionnaireACreer: cats.some((c) => c.aCreer === true) && profils.length === 0,
      agentsExclus: [...agentsExclus],
      nombreMaxAgents: reglementee ? routage.reglementees.nombreMaxAgents : null,
    },
  };
}

// --- Ce qu'un compte déjà créé est autorisé à faire --------------------------------------

// Ce que l'on garde du compte pour retrouver son routage : le métier et ce qu'il a coché.
export type CompteRoutable = { metierPrecis: string; sousVariantes: string[]; categorie: string };

// Routage d'un compte, recalculé à chaque fois d'après les données (jamais figé à l'inscription :
// une règle qui change doit s'appliquer aux comptes existants). Un identifiant de métier ancien,
// qui n'existe plus dans la liste, retombe sur la catégorie enregistrée.
export function routageDuCompte(routage: Routage, c: CompteRoutable): ResultatRoutage | null {
  const metier = trouverMetier(routage, c.metierPrecis);
  const avecActivites = (metier?.sousVariantes?.length ?? 0) > 0;
  const r = router(routage, c.metierPrecis, c.sousVariantes, { autre: avecActivites && c.sousVariantes.length === 0, categorieAbsente: c.categorie });
  return r.ok ? r.routage : null;
}

export type ContrainteDuCompte = { agentsExclus: CodeAgent[]; nombreMaxAgents: number | null; reglementee: boolean };

export function contrainteDepuisCompte(routage: Routage, c: CompteRoutable): ContrainteDuCompte {
  const r = routageDuCompte(routage, c);
  if (r) return { agentsExclus: r.agentsExclus, nombreMaxAgents: r.nombreMaxAgents, reglementee: r.reglementee };
  const categorie = routage.categories.find((x) => x.id === c.categorie);
  if (categorie?.reglementee) {
    return { agentsExclus: routage.reglementees.agentsExclus, nombreMaxAgents: routage.reglementees.nombreMaxAgents, reglementee: true };
  }
  return { agentsExclus: [], nombreMaxAgents: null, reglementee: false };
}

export type ExclusionsAcquisition = NonNullable<Routage["reglementees"]["acquisitionExclut"]>;

// Ce que l'audit Acquisition ne pose pas à ce compte : vide pour un métier non réglementé.
export function exclusionsAcquisition(routage: Routage, c: CompteRoutable): ExclusionsAcquisition | null {
  return contrainteDepuisCompte(routage, c).reglementee ? routage.reglementees.acquisitionExclut ?? null : null;
}

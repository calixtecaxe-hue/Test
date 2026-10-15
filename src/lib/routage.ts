// Routage invisible : métier → catégorie → profil(s) d'entreprise.
//
// Le dirigeant choisit son métier (et, pour quelques métiers, ses activités) ;
// le système le rattache en coulisse à une catégorie de modèle économique, puis
// aux profils qui pilotent les questions, les mots et les calculs (CLAUDE.md
// section 5). Les règles sont dans `data/routage.json` : ajouter un métier, c'est
// ajouter une entrée à ce fichier.
//
// Ce fichier n'importe que des types : il se teste directement avec Node.

import { PROFILS } from "./donnees/constantes.ts";
import type { CodeAgent, ProfilId, Routage } from "./donnees/schemas.ts";

export type ResultatRoutage = {
  metier: string;
  categorie: { id: string; numero: number; libelle: string };
  sousVariantes: string[];
  // Profils retenus, dans l'ordre canonique. Le premier sert de profil principal.
  profils: ProfilId[];
  // Profils qui s'ajoutent selon une réponse posée plus tard (« vend en ligne »).
  profilsConditionnels: { profil: ProfilId; condition: string }[];
  blocStock: boolean;
  reglementee: boolean;
  agentsExclus: CodeAgent[];
  nombreMaxAgents: number | null;
};

export type ErreurRoutage = { champ: "metierPrecis" | "sousVariantes"; message: string };

export function trouverMetier(routage: Routage, id: string) {
  return routage.metiers.find((m) => m.id === id);
}

// Les métiers dans l'ordre alphabétique français, pour la liste de l'inscription.
export function metiersTries(routage: Routage) {
  return [...routage.metiers].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
}

export function router(
  routage: Routage,
  metierId: string,
  sousVariantesCochees: string[]
): { ok: true; routage: ResultatRoutage } | { ok: false; erreur: ErreurRoutage } {
  const metier = trouverMetier(routage, metierId);
  if (!metier) return { ok: false, erreur: { champ: "metierPrecis", message: "Métier non reconnu." } };
  const categorie = routage.categories.find((c) => c.id === metier.categorie);
  if (!categorie) return { ok: false, erreur: { champ: "metierPrecis", message: "Métier non reconnu." } };

  // La sous-variante n'existe que pour les métiers qui regroupent plusieurs activités.
  const cochees = [...new Set(sousVariantesCochees)];
  const variantes = metier.sousVariantes ?? [];
  if (variantes.length === 0) {
    if (cochees.length > 0) {
      return { ok: false, erreur: { champ: "sousVariantes", message: "Ce métier n'a pas d'activités à préciser." } };
    }
  } else {
    if (cochees.length === 0) {
      return { ok: false, erreur: { champ: "sousVariantes", message: "Cochez au moins une activité." } };
    }
    if (cochees.some((c) => !variantes.some((v) => v.id === c))) {
      return { ok: false, erreur: { champ: "sousVariantes", message: "Activité non reconnue pour ce métier." } };
    }
  }

  // Profil de base : celui de la catégorie, ou celui du métier pour les professions réglementées.
  const base: ProfilId[] = categorie.profils.length > 0 ? categorie.profils : metier.profils ?? [];
  // Chaque activité cochée apporte ses profils (ou ceux de la catégorie si elle n'en précise pas).
  const retenus = new Set<ProfilId>();
  if (cochees.length === 0) base.forEach((p) => retenus.add(p));
  for (const id of cochees) {
    const v = variantes.find((x) => x.id === id);
    (v?.profils ?? base).forEach((p) => retenus.add(p));
  }
  const profils = PROFILS.filter((p) => retenus.has(p));

  return {
    ok: true,
    routage: {
      metier: metier.id,
      categorie: { id: categorie.id, numero: categorie.numero, libelle: categorie.libelle },
      sousVariantes: variantes.map((v) => v.id).filter((id) => cochees.includes(id)),
      profils,
      profilsConditionnels: categorie.profilsConditionnels,
      blocStock: categorie.blocStock,
      reglementee: categorie.reglementee,
      agentsExclus: categorie.reglementee ? routage.reglementees.agentsExclus : [],
      nombreMaxAgents: categorie.reglementee ? routage.reglementees.nombreMaxAgents : null,
    },
  };
}

export type ExclusionsAcquisition = NonNullable<Routage["reglementees"]["acquisitionExclut"]>;

// Ce que l'audit Acquisition ne pose pas à ce compte : vide pour un métier non réglementé.
export function exclusionsAcquisition(routage: Routage, categorieId: string): ExclusionsAcquisition | null {
  const categorie = routage.categories.find((c) => c.id === categorieId);
  return categorie?.reglementee ? routage.reglementees.acquisitionExclut ?? null : null;
}

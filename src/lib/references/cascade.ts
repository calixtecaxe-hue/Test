// Choix de la référence applicable à un client : la plus précise disponible (cahier « références de
// marché », partie 3.2). Fonctions pures : le moteur lit les références, il ne les cherche jamais.
//
//   1. métier + sous-variante + zone + taille   2. métier + zone   3. métier
//   4. famille de modèle économique (catégorie)  5. national tous secteurs, seulement si l'indicateur
//      se compare d'un secteur à l'autre (`nationalAutorise` dans le catalogue).
//
// À l'intérieur d'un niveau, la référence la plus spécifique l'emporte (sous-variante, puis zone, puis
// taille), puis la plus confiante, puis la plus récente.

import type { IndicateurCatalogue, ParametresReferences } from "../donnees/schemas.ts";
import { estUtilisable, type NiveauReference, type Reference, type Taille, type Zone } from "./types.ts";

export type ContexteReference = {
  // null : métier absent de la liste, seule la famille s'applique.
  metier: string | null;
  // Activité principale retenue (règle provisoire : voir contexte.ts), ou null.
  sousVariante: string | null;
  // Catégorie de routage, utilisée comme famille de modèle économique.
  famille: string;
  zone: Zone;
  taille: Taille;
};

export type ReferenceRetenue = {
  reference: Reference;
  niveau: NiveauReference;
  // Ce que la référence précise réellement : sert à citer le niveau de repli dans le rapport.
  precision: { sousVariante: boolean; zone: boolean; taille: boolean };
  // Échéance dépassée : la référence reste utilisée (un rapport n'est jamais bloqué) mais à revérifier.
  perimee: boolean;
};

function specificite(r: Reference): number {
  return (r.sousVariante ? 4 : 0) + (r.zone !== "toutes" ? 2 : 0) + (r.trancheTaille !== "toutes" ? 1 : 0);
}

function correspond(r: Reference, c: ContexteReference): boolean {
  if (r.sousVariante !== null && r.sousVariante !== c.sousVariante) return false;
  if (r.zone !== "toutes" && r.zone !== c.zone) return false;
  if (r.trancheTaille !== "toutes" && r.trancheTaille !== c.taille) return false;
  return true;
}

const RANG_CONFIANCE = { solide: 1, indicatif: 0 } as const;

function meilleure(candidates: Reference[]): Reference | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) =>
      specificite(b) - specificite(a) ||
      RANG_CONFIANCE[b.confiance ?? "indicatif"] - RANG_CONFIANCE[a.confiance ?? "indicatif"] ||
      b.creeLe.localeCompare(a.creeLe) ||
      b.version - a.version
  )[0];
}

export function choisirReference(
  references: Reference[],
  indicateur: Pick<IndicateurCatalogue, "id" | "nationalAutorise">,
  contexte: ContexteReference,
  aujourdhui: Date
): ReferenceRetenue | null {
  const utilisables = references.filter((r) => r.indicateurId === indicateur.id && estUtilisable(r) && correspond(r, contexte));
  const parNiveau: Record<NiveauReference, Reference[]> = {
    metier: contexte.metier === null ? [] : utilisables.filter((r) => r.niveau === "metier" && r.metier === contexte.metier),
    famille: utilisables.filter((r) => r.niveau === "famille" && r.famille === contexte.famille),
    national: indicateur.nationalAutorise ? utilisables.filter((r) => r.niveau === "national") : [],
  };
  for (const niveau of ["metier", "famille", "national"] as const) {
    const r = meilleure(parNiveau[niveau]);
    if (r) {
      const jour = aujourdhui.toISOString().slice(0, 10);
      return {
        reference: r,
        niveau,
        precision: { sousVariante: r.sousVariante !== null, zone: r.zone !== "toutes", taille: r.trancheTaille !== "toutes" },
        perimee: r.dateExpiration !== null && r.dateExpiration < jour,
      };
    }
  }
  return null;
}

// --- Faut-il lancer une recherche ? (partie 3.3, 3.4) ----------------------------------

export type RaisonRecherche =
  | "a_chercher"
  | "pas_de_recherche_pour_ce_theme"
  | "indicateur_en_brouillon"
  | "metier_inconnu"
  | "reference_metier_active"
  | "aucune_reference_recente"
  | "recherche_en_cours"
  | "plafond_de_tentatives";

export type ContexteRecherche = {
  // Le thème se compare-t-il à un marché, et l'indicateur est-il validé ? (catalogue)
  rechercheReference: boolean;
  statutRedaction: "brouillon" | "valide";
  metier: string | null;
  // Références (toutes versions) de ce couple indicateur + métier, au niveau métier.
  referencesMetier: Reference[];
  // Une recherche est déjà en cours pour ce couple (verrou anti-doublon).
  verrouPris: boolean;
  // Recherches déjà menées pour ce couple (journal).
  tentatives: number;
};

export function besoinDeRecherche(c: ContexteRecherche, params: ParametresReferences, aujourdhui: Date): { chercher: boolean; raison: RaisonRecherche } {
  const non = (raison: RaisonRecherche) => ({ chercher: false, raison });
  if (!c.rechercheReference) return non("pas_de_recherche_pour_ce_theme");
  if (c.statutRedaction !== "valide") return non("indicateur_en_brouillon");
  if (c.metier === null) return non("metier_inconnu");
  if (c.referencesMetier.some((r) => r.niveau === "metier" && estUtilisable(r))) return non("reference_metier_active");
  const limite = new Date(aujourdhui.getTime() - params.aucuneReferenceNouvelleTentativeJours * 86_400_000);
  if (c.referencesMetier.some((r) => r.statut === "aucune_reference" && new Date(r.creeLe) > limite)) return non("aucune_reference_recente");
  if (c.verrouPris) return non("recherche_en_cours");
  if (c.tentatives >= params.rechercheMaxParCouple) return non("plafond_de_tentatives");
  return { chercher: true, raison: "a_chercher" };
}

// Date d'échéance d'une référence : fréquence par catégorie, 3 mois par défaut.
export function echeanceDeMiseAJour(depuis: Date, famille: string, params: ParametresReferences): string {
  const mois = params.miseAJour.moisParCategorie[famille] ?? params.miseAJour.moisParDefaut;
  const premier = Date.UTC(depuis.getUTCFullYear(), depuis.getUTCMonth() + mois, 1);
  const joursDuMois = new Date(Date.UTC(new Date(premier).getUTCFullYear(), new Date(premier).getUTCMonth() + 1, 0)).getUTCDate();
  // Le 31 janvier + 1 mois donne le 28 ou 29 février, jamais le 3 mars.
  return new Date(premier + (Math.min(depuis.getUTCDate(), joursDuMois) - 1) * 86_400_000).toISOString().slice(0, 10);
}

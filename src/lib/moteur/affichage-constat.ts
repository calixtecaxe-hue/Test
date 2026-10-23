// Ce que le client voit d'un constat (cahier « références de marché », partie 5.2) : un thème sans
// référence s'affiche avec ses propres chiffres, sans comparaison au marché et sans message
// d'erreur. Les mots « règle manquante », « seuil » ou « référence absente » n'apparaissent jamais.
//
// Les phrases ci-dessous sont des textes provisoires, à relire par le propriétaire du produit.

import type { Constat, StatutTheme } from "./constat.ts";

export type PresentationConstat = {
  // Le thème est montré avec une comparaison au marché.
  comparaisonMarche: boolean;
  // Une phrase sobre pour le client, ou null s'il n'y a rien à dire.
  message: string | null;
};

const SANS_COMPARAISON = "Ce thème est analysé à partir de vos propres chiffres, sans repère de marché.";

const MESSAGES: Record<StatutTheme, string | null> = {
  masque: null,
  contexte: null,
  non_evalue: "Il manque des réponses pour évaluer ce thème.",
  note: null,
  reference_disponible: null,
  aucune_reference: SANS_COMPARAISON,
  sans_comparaison: SANS_COMPARAISON,
  regle_manquante: SANS_COMPARAISON,
};

export function presenterConstat(c: Constat): PresentationConstat {
  return { comparaisonMarche: c.statut === "reference_disponible" || (c.statut === "note" && c.reperes.length > 0), message: MESSAGES[c.statut] };
}

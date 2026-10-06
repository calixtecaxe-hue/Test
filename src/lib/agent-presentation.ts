import type { Agent } from "./agents";

// Ce que chaque agent traite concrètement, affiché sous son titre. Pour les
// agents de diagnostic autres qu'Acquisition, seuls les thèmes de CLAUDE.md
// section 3 sont repris : rien n'est inventé en attendant leurs questionnaires.

export type Presentation = {
  accroche: string;
  atouts: string[];
};

export const PRESENTATIONS: Record<Agent["code"], Presentation> = {
  ACQUISITION_CA: {
    accroche:
      "Il s'attaque à cinq points du parcours commercial de votre entreprise.",
    atouts: [
      "Attirer",
      "Convertir",
      "Chiffre d'affaires",
      "Fidéliser",
      "Piloter",
    ],
  },
  FINANCE_RENTABILITE: {
    accroche:
      "Il lit la santé opérationnelle de votre entreprise à partir des ratios que vous déclarez.",
    atouts: ["Marge", "Trésorerie", "Structure de coûts"],
  },
  RH_ORGANISATION: {
    accroche: "Il lit les signaux organisationnels de votre entreprise.",
    atouts: ["Turnover", "Charge de travail", "Clarté des rôles"],
  },
  COMM_CREATION: {
    accroche: "Il travaille à partir de vos publications existantes.",
    atouts: [
      "Analyse de vos publications",
      "Indicateurs chiffrés de performance",
      "Propositions de contenu, à votre demande",
    ],
  },
};

// Les cinq axes et les 23 thèmes de l'agent Acquisition & Chiffre d'affaires.
export const AXES_ACQUISITION: { titre: string; themes: string[] }[] = [
  {
    titre: "Attirer",
    themes: [
      "Cible",
      "Volume de contacts",
      "Canaux",
      "Prospection active",
      "Partenaires",
      "Présence en ligne (dont avis clients)",
      "Budget et coût d'acquisition",
    ],
  },
  {
    titre: "Convertir",
    themes: [
      "Réactivité",
      "Rendez-vous",
      "Devis et relances",
      "Transformation",
      "Durée du cycle de vente",
    ],
  },
  {
    titre: "Chiffre d'affaires",
    themes: [
      "Prix et honoraires",
      "Négociation",
      "Panier moyen",
      "Répartition du CA",
    ],
  },
  {
    titre: "Fidéliser",
    themes: ["Clients récurrents", "Recommandation", "Carnet de commandes"],
  },
  {
    titre: "Piloter",
    themes: [
      "Suivi commercial",
      "Productivité",
      "Capacité commerciale",
      "Saisonnalité",
    ],
  },
];

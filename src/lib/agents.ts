// Les quatre agents (CLAUDE.md section 3). Décision produit : les quatre
// sont affichés « Disponible » sur le site. Seul le questionnaire de
// l'agent Acquisition & CA existe pour l'instant ; rien n'est inventé sur le
// contenu des trois autres.

export type Agent = {
  code: "ACQUISITION_CA" | "FINANCE_RENTABILITE" | "RH_ORGANISATION" | "COMM_CREATION";
  nom: string;
  nature: "diagnostic" | "génératif";
  couvre: string;
  neFaitJamais: string | null;
  couleur: "bleu" | "blanc" | "rouge";
  disponible: boolean;
};

export const AGENTS: Agent[] = [
  {
    code: "ACQUISITION_CA",
    nom: "Acquisition & Chiffre d'affaires",
    nature: "diagnostic",
    couvre: "Génération de contacts, conversion, chiffre d'affaires, honoraires.",
    neFaitJamais: "Jugement de qualité créative d'un contenu.",
    couleur: "bleu",
    disponible: true,
  },
  {
    code: "FINANCE_RENTABILITE",
    nom: "Finance & Rentabilité",
    nature: "diagnostic",
    couvre:
      "Santé opérationnelle via ratios déclarés : marge, trésorerie, structure de coûts.",
    neFaitJamais:
      "Fiscalité, comptabilité, conformité — c'est le métier de l'expert-comptable.",
    couleur: "blanc",
    disponible: true,
  },
  {
    code: "RH_ORGANISATION",
    nom: "RH & Organisation",
    nature: "diagnostic",
    couvre: "Signaux organisationnels : turnover, charge, clarté des rôles.",
    neFaitJamais: "Droit du travail, contrats, médiation de conflit.",
    couleur: "rouge",
    disponible: true,
  },
  {
    code: "COMM_CREATION",
    nom: "Comm & Création de contenu",
    nature: "génératif",
    couvre:
      "Analyse des publications existantes et de leurs indicateurs de performance ; génère des propositions de contenu.",
    neFaitJamais: null,
    couleur: "blanc",
    disponible: true,
  },
];

export const couleurAgent: Record<
  Agent["couleur"],
  { texte: string; halo: string; barre: string }
> = {
  bleu: {
    texte: "var(--blue-1)",
    halo: "var(--blue-1)",
    barre: "linear-gradient(90deg, var(--blue-1), var(--blue-2))",
  },
  blanc: {
    texte: "var(--white-1)",
    halo: "var(--white-2)",
    barre: "linear-gradient(90deg, var(--white-2), var(--white-1))",
  },
  rouge: {
    texte: "var(--red-1)",
    halo: "var(--red-1)",
    barre: "linear-gradient(90deg, var(--red-2), var(--red-1))",
  },
};

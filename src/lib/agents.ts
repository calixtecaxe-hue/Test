// Les quatre agents (CLAUDE.md section 3). Seul Acquisition & CA est
// construit pour l'instant — les trois autres sont décrits tels que prévus
// mais marqués « bientôt disponible », rien n'est inventé sur leur contenu.

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
    disponible: false,
  },
  {
    code: "RH_ORGANISATION",
    nom: "RH & Organisation",
    nature: "diagnostic",
    couvre: "Signaux organisationnels : turnover, charge, clarté des rôles.",
    neFaitJamais: "Droit du travail, contrats, médiation de conflit.",
    couleur: "rouge",
    disponible: false,
  },
  {
    code: "COMM_CREATION",
    nom: "Comm & Création de contenu",
    nature: "génératif",
    couvre:
      "Analyse des publications existantes et de leurs indicateurs de performance ; génère des propositions de contenu.",
    neFaitJamais: null,
    couleur: "blanc",
    disponible: false,
  },
];

export const couleurAgent: Record<Agent["couleur"], { texte: string; halo: string }> = {
  bleu: { texte: "var(--blue-1)", halo: "var(--blue-1)" },
  blanc: { texte: "var(--white-1)", halo: "var(--white-2)" },
  rouge: { texte: "var(--red-1)", halo: "var(--red-1)" },
};

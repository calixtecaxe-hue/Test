// Les quatre agents (CLAUDE.md section 3). Décision produit : les quatre
// sont affichés « Disponible » sur le site. Seul le questionnaire de
// l'agent Acquisition & CA existe pour l'instant ; rien n'est inventé sur le
// contenu des trois autres.

export type Agent = {
  code: "ACQUISITION_CA" | "FINANCE_RENTABILITE" | "RH_ORGANISATION" | "COMM_CREATION";
  slug: string;
  nom: string;
  // La question à laquelle l'agent répond (CLAUDE.md section 9).
  question: string;
  nature: "diagnostic" | "génératif";
  couvre: string;
  neFaitJamais: string | null;
  couleur: "bleu" | "blanc" | "rouge";
  disponible: boolean;
  // Exemple d'objectif montré sous les champs de l'écran « Votre objectif » : une proposition de rédaction,
  // en rapport avec ce que l'agent traite, à valider par le propriétaire.
  exempleObjectif: { quoi: string; valeur: number; unite: "pourcent" | "euros" | "unites"; delaiMois: number };
};

export const AGENTS: Agent[] = [
  {
    code: "ACQUISITION_CA",
    slug: "acquisition-chiffre-affaires",
    nom: "Acquisition & Chiffre d'affaires",
    question: "Quels leviers comblent l'écart à votre objectif ?",
    nature: "diagnostic",
    couvre: "Génération de contacts, conversion, chiffre d'affaires, honoraires.",
    neFaitJamais: "Jugement de qualité créative d'un contenu.",
    couleur: "bleu",
    disponible: true,
    exempleObjectif: { quoi: "augmenter mon chiffre d'affaires", valeur: 10, unite: "pourcent", delaiMois: 6 },
  },
  {
    code: "FINANCE_RENTABILITE",
    slug: "finance-rentabilite",
    nom: "Finance & Rentabilité",
    question: "Votre objectif est-il rentable et finançable ?",
    nature: "diagnostic",
    couvre:
      "Santé opérationnelle via ratios déclarés : marge, trésorerie, structure de coûts.",
    neFaitJamais:
      "Fiscalité, comptabilité, conformité — c'est le métier de l'expert-comptable.",
    couleur: "blanc",
    disponible: true,
    exempleObjectif: { quoi: "améliorer ma marge", valeur: 5, unite: "pourcent", delaiMois: 6 },
  },
  {
    code: "RH_ORGANISATION",
    slug: "rh-organisation",
    nom: "RH & Organisation",
    question: "Votre organisation peut-elle porter votre objectif ?",
    nature: "diagnostic",
    couvre: "Signaux organisationnels : turnover, charge, clarté des rôles.",
    neFaitJamais: "Droit du travail, contrats, médiation de conflit.",
    couleur: "rouge",
    disponible: true,
    exempleObjectif: { quoi: "baisser le turnover", valeur: 5, unite: "pourcent", delaiMois: 3 },
  },
  {
    code: "COMM_CREATION",
    slug: "comm-creation-contenu",
    nom: "Comm & Création de contenu",
    question: "Votre présence en ligne génère-t-elle assez de contacts ?",
    nature: "génératif",
    couvre:
      "Analyse des publications existantes et de leurs indicateurs de performance ; génère des propositions de contenu.",
    neFaitJamais: null,
    couleur: "blanc",
    disponible: true,
    exempleObjectif: { quoi: "augmenter les contacts venus d'internet", valeur: 20, unite: "pourcent", delaiMois: 6 },
  },
];

export const couleurAgent: Record<
  Agent["couleur"],
  { texte: string; halo: string; barre: string; canal: string }
> = {
  bleu: {
    canal: "var(--blue-rgb)",
    texte: "var(--blue-1)",
    halo: "var(--blue-1)",
    barre: "linear-gradient(90deg, var(--blue-1), var(--blue-2))",
  },
  blanc: {
    canal: "var(--ink)",
    texte: "var(--white-1)",
    halo: "var(--white-2)",
    barre: "linear-gradient(90deg, var(--white-2), var(--white-1))",
  },
  rouge: {
    canal: "var(--red-rgb)",
    texte: "var(--red-1)",
    halo: "var(--red-1)",
    barre: "linear-gradient(90deg, var(--red-2), var(--red-1))",
  },
};

export function agentParSlug(slug: string): Agent | undefined {
  return AGENTS.find((agent) => agent.slug === slug);
}

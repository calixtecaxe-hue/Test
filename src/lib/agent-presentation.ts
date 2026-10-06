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
      "Il passe en revue tout votre parcours commercial, du premier contact au chiffre d'affaires encaissé, et vous dit où agir en priorité.",
    atouts: [
      "Mesure vos contacts et vos canaux",
      "Analyse votre conversion",
      "Compare vos prix et honoraires au marché",
      "Suit votre fidélisation et votre productivité",
    ],
  },
  FINANCE_RENTABILITE: {
    accroche:
      "Il lit la santé opérationnelle de votre entreprise à partir des ratios que vous déclarez.",
    atouts: [
      "Suit votre marge",
      "Surveille votre trésorerie",
      "Analyse votre structure de coûts",
      "Ne traite ni fiscalité ni comptabilité",
    ],
  },
  RH_ORGANISATION: {
    accroche: "Il lit les signaux organisationnels de votre entreprise.",
    atouts: [
      "Repère les signaux de turnover",
      "Mesure la charge de travail",
      "Vérifie la clarté des rôles",
      "Ne traite ni droit du travail ni contrats",
    ],
  },
  COMM_CREATION: {
    accroche:
      "Il part des publications que vous avez déjà faites et vous propose des contenus, à votre demande.",
    atouts: [
      "Analyse vos publications existantes",
      "Lit leurs indicateurs de performance",
      "Propose des contenus, à votre demande",
      "Ne se déclenche jamais automatiquement",
    ],
  },
};

// « Comment il travaille » : trois colonnes de lignes dépliables.
export type Colonne = {
  etiquette: string;
  lignes: { titre: string; texte: string; provisoire?: boolean }[];
};

function colonnesDiagnostic(exemple: string): Colonne[] {
  return [
    {
      etiquette: "Questionnaire",
      lignes: [
        {
          titre: "Votre profil",
          texte:
            "À l'inscription, vous indiquez votre métier, votre nombre de collaborateurs, votre zone géographique et votre chiffre d'affaires.",
        },
        {
          titre: "Votre questionnaire",
          texte:
            "Ensuite, un questionnaire est établi en fonction de votre profil. Vous y répondez à votre rythme : vos réponses sont enregistrées au fur et à mesure.",
        },
        {
          titre: "Une estimation vaut mieux que rien",
          texte:
            "Si vous ne connaissez pas la réponse exacte, donnez une estimation : une réponse approximative est plus utile qu'une absence de réponse. Si vous n'en avez vraiment aucune idée, vous pouvez passer la question, mais plus vous répondez, plus votre compte rendu est précis.",
        },
      ],
    },
    {
      etiquette: "Stratégie",
      lignes: [
        {
          titre: "Ce qui fonctionne déjà",
          texte:
            "À partir de vos réponses, CAXE construit une stratégie pour votre entreprise. Elle s'appuie sur ce qui fonctionne déjà.",
        },
        {
          titre: "Ce qui vous freine",
          texte: "Elle s'attaque en priorité à ce qui vous freine.",
        },
        {
          titre: "Quoi faire, dans quel ordre",
          texte:
            "Vous savez quoi améliorer, quelles actions mettre en place, et dans quel ordre.",
        },
      ],
    },
    {
      etiquette: "Suivi",
      lignes: [
        {
          titre: "Un objectif daté",
          texte: `Chaque action devient un objectif daté. Par exemple : ${exemple}`,
        },
        {
          titre: "Un point à la date prévue",
          texte:
            "À la date prévue, CAXE fait le point avec vous. Si l'objectif est atteint, vous passez à la suite.",
        },
        {
          titre: "Une autre piste si besoin",
          texte:
            "Sinon, on cherche ce qui a bloqué et on vous propose une autre piste.",
        },
      ],
    },
  ];
}

// Ligne d'attente : le contenu de cette rubrique n'est pas encore fourni
// (CLAUDE.md : ne pas inventer). À remplacer dès que le détail existe.
const PROVISOIRE = {
  titre: "Détail à venir",
  texte: "Cette rubrique sera complétée prochainement.",
  provisoire: true,
};

export const COLONNES: Record<Agent["code"], Colonne[]> = {
  ACQUISITION_CA: colonnesDiagnostic(
    "décrocher 5 rendez-vous de plus par mois d'ici 3 semaines.",
  ),
  FINANCE_RENTABILITE: colonnesDiagnostic(
    "relancer les factures dont le délai de paiement est dépassé, d'ici 2 semaines.",
  ),
  RH_ORGANISATION: colonnesDiagnostic(
    "écrire en une page le rôle de chaque poste, d'ici 3 semaines.",
  ),
  COMM_CREATION: [
    {
      etiquette: "Publications",
      lignes: [
        {
          titre: "Vos publications existantes",
          texte: "L'agent analyse les publications que vous avez déjà faites.",
        },
        PROVISOIRE,
        PROVISOIRE,
      ],
    },
    {
      etiquette: "Indicateurs",
      lignes: [
        {
          titre: "Des indicateurs chiffrés",
          texte: "Il s'appuie sur des indicateurs chiffrés de performance.",
        },
        PROVISOIRE,
        PROVISOIRE,
      ],
    },
    {
      etiquette: "Propositions",
      lignes: [
        {
          titre: "Des propositions de contenu",
          texte: "Il génère des propositions de contenu pour vous.",
        },
        {
          titre: "À votre demande",
          texte:
            "Elles ne sont lancées que quand vous le demandez, jamais automatiquement.",
        },
        {
          titre: "Lancé depuis votre rapport",
          texte:
            "Depuis le rapport de l'agent Acquisition & Chiffre d'affaires, le bouton « Voir des propositions de contenu » lance cet agent, à votre demande.",
        },
      ],
    },
  ],
};

// Mis de côté, hors page pour l'instant : la carte « Ce qu'il couvre » de
// l'agent Acquisition (cinq axes, 23 thèmes). Le balisage figure dans le
// commit 2e643e4 ; les données restent ici pour un usage ultérieur.
export const INTRO_COUVRE_ACQUISITION =
  "Tout le parcours qui va du premier contact au chiffre d'affaires encaissé :";

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

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
      "Il passe en revue votre communication, de votre offre à vos publications, et vous dit où agir en priorité.",
    atouts: [
      "Passe en revue votre offre et votre positionnement",
      "Évalue vos canaux et votre présence en ligne",
      "Mesure la portée et l'engagement de vos publications",
      "Propose des contenus, à votre demande",
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

// Les 54 thèmes de l'agent Comm & Création de contenu, en huit groupes (fournis
// par le client), mis de côté pour un usage ultérieur. Chaque thème est
// [titre, précision]. La numérotation suit l'ordre : groupe 1 = thèmes 1 à 9, etc.
export type GroupeComm = {
  titre: string;
  note?: string;
  themes: [string, string?][];
};

export const GROUPES_COMM: GroupeComm[] = [
  {
    titre: "Identité et offre",
    themes: [
      ["Positionnement", "ce que l'entreprise fait, pour qui"],
      ["Cible", "à qui elle parle, et si c'est bien celle qui achète"],
      ["Promesse", "la raison de la choisir, en une phrase"],
      [
        "Force de l'offre",
        "ce que le client obtient, en combien de temps, avec quel effort",
      ],
      [
        "Garantie ou réduction du risque",
        "ce qui enlève la peur de se tromper",
      ],
      ["Ton et personnalité"],
      ["Cohérence de marque", "même logo, mêmes couleurs, même voix partout"],
      [
        "Éléments de réassurance",
        "avis, certifications, références, ancienneté",
      ],
      [
        "Preuve et expertise",
        "réalisations, avant-après, chiffres, cas clients",
      ],
    ],
  },
  {
    titre: "Présence et canaux",
    themes: [
      ["Réseaux actifs", "lesquels, et lesquels sont réellement tenus"],
      ["Adéquation canal-cible", "est-il là où sa clientèle se trouve"],
      [
        "Les quatre canaux d'acquisition",
        "contact direct à des gens connus, contact direct à des inconnus, contenu organique, publicité payante",
      ],
      ["Site web", "existence, actualité"],
      ["Fiche Google Business", "complétude, photos, horaires, publications"],
      ["Canaux possédés", "base email, fichier contacts, groupe privé"],
      [
        "Référencement local",
        "apparaît-il quand on cherche son métier dans sa ville",
      ],
    ],
  },
  {
    titre: "De la publication au contact",
    themes: [
      ["Portée", "combien de personnes touchées"],
      ["Engagement", "combien réagissent"],
      ["Clic", "combien vont plus loin"],
      [
        "Appel à l'action",
        "les publications disent-elles quoi faire, et où ça mène",
      ],
      [
        "Raison de laisser ses coordonnées",
        "guide, estimation, diagnostic gratuit",
      ],
      [
        "Contacts entrants par la comm",
        "messages privés, commentaires, demandes",
      ],
      ["Réactivité aux messages", "en combien de temps on répond"],
    ],
  },
  {
    titre: "Stratégie de contenu",
    themes: [
      ["Objectif", "notoriété, acquisition, fidélisation, recrutement"],
      ["Lignes éditoriales", "les deux ou trois sujets récurrents"],
      ["Équilibre des formats", "texte, photo, vidéo, carrousel"],
      ["Répartition par intention", "vendre, montrer, expliquer, incarner"],
      ["Planification", "calendrier ou publication au gré du temps"],
      [
        "Veille concurrentielle",
        "ce que font les concurrents, et ce qui marche chez eux",
      ],
    ],
  },
  {
    titre: "Production",
    themes: [
      ["Qui produit", "dirigeant, collaborateur, prestataire, personne"],
      ["Temps consacré par semaine"],
      ["Moyens", "budget, outils, matériel"],
      ["Rythme réel", "fréquence et surtout régularité"],
      ["Réemploi du contenu", "décliné sur plusieurs canaux ou refait à zéro"],
      ["Réserve d'avance", "du contenu prêt, ou tout dans l'urgence"],
    ],
  },
  {
    titre: "Performance",
    themes: [
      ["Taux d'engagement"],
      ["Évolution de l'audience", "croissance, stagnation, érosion"],
      ["Rendement de l'audience", "contacts générés rapportés aux abonnés"],
      ["Contenus les plus performants"],
      ["Écart entre ce qui marche et ce qui est publié"],
      ["Contenus les moins performants", "ce qui est produit en vain"],
      ["Notoriété", "on parle de l'entreprise sans qu'elle le provoque"],
      ["Suivi des chiffres", "le dirigeant regarde-t-il ses statistiques"],
    ],
  },
  {
    titre: "Vitrines et relation",
    themes: [
      ["Avis clients", "volume, note, fraîcheur"],
      ["Sollicitation d'avis", "l'entreprise demande, ou attend"],
      [
        "Réponse aux avis",
        "répond-on, en combien de temps, aux négatifs comme aux positifs",
      ],
      ["Relation avec la communauté", "réponses aux commentaires"],
      [
        "Partenaires et relais",
        "prescripteurs, autres entreprises, presse locale",
      ],
    ],
  },
  {
    titre: "Qualité et pertinence des publications",
    note: "L'IA lit les publications réelles et les évalue contre une grille fixe. Même post, même grille, même résultat. À vérifier au regard de CLAUDE.md section 2 (l'IA ne note pas) avant toute construction.",
    themes: [
      ["Accroche", "la première ligne retient-elle"],
      ["Angle", "le post parle-t-il du client ou de l'entreprise"],
      [
        "Bénéfice explicite",
        "un bénéfice concret, ou seulement une caractéristique",
      ],
      ["Preuve", "un chiffre, un avant-après, un témoignage"],
      ["Appel à l'action", "le post dit-il quoi faire ensuite"],
      [
        "Alignement avec la cible déclarée",
        "ce qui est publié correspond-il au thème 2",
      ],
    ],
  },
];

// Parcours « mise en place » : pour le dirigeant sans présence. L'agent
// produit un plan de démarrage, pas un diagnostic.
export const PARCOURS_MISE_EN_PLACE = {
  // Thèmes repris du parcours amélioration (numéros ci-dessus).
  repris: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 31, 32, 44],
  // Groupes supprimés : ils mesurent un existant qui n'existe pas.
  groupesSupprimes: [3, 6, 8],
  propres: [
    ["Aisance devant la caméra", "faut-il bâtir sans le dirigeant à l'image"],
    ["Matière disponible", "photos de réalisations, avant-après existants"],
    ["Relais interne", "quelqu'un dans l'entreprise pourrait-il s'en charger"],
    ["Tentatives passées", "a-t-il déjà essayé et abandonné, et pourquoi"],
  ] as [string, string][],
};

// Thèmes qui alimentent la génération de contenu et n'ont pas besoin de seuil :
// groupe 1 (1 à 9), lignes éditoriales (25), répartition par intention (27),
// contenus les plus performants (39), contenus les moins performants (41), et
// les quatre thèmes propres au parcours mise en place (55 à 58).
export const THEMES_GENERATION = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 27, 39, 41, 55, 56, 57, 58,
];

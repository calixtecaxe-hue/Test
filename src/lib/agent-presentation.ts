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
      "Il passe en revue la santé financière de votre entreprise, des marges à la trésorerie, et vous dit où agir en priorité.",
    atouts: [
      "Mesure vos marges et votre rentabilité",
      "Analyse vos coûts et vos dépenses récurrentes",
      "Suit votre trésorerie et vos encaissements",
      "Évalue vos financements et vos investissements",
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

// Les 40 thèmes de l'agent Finance & Rentabilité, en huit groupes (fournis par
// le client), mis de côté pour un usage ultérieur. Chaque thème est
// [titre, précision]. La numérotation suit l'ordre : groupe 1 = thèmes 1 à 7, etc.
// Aucune question ni aucun seuil ne sont fournis à ce stade : à marquer comme
// manquants le moment venu (CLAUDE.md section 14).
export const GROUPES_FINANCE: GroupeComm[] = [
  {
    titre: "Marges et rentabilité",
    themes: [
      [
        "Rentabilité opérationnelle globale",
        "ce que l'activité conserve après les coûts retenus dans une définition explicite, sur une période commune ; à distinguer des mouvements bancaires et du résultat fiscal",
      ],
      [
        "Coûts directs et coût de revient",
        "dépenses nécessaires à la réalisation d'une vente ou d'une prestation, avec une méthode claire pour les coûts partagés",
      ],
      [
        "Marge par offre ou activité",
        "contribution des différentes familles de produits, prestations ou activités, et éventuelles activités déficitaires",
      ],
      [
        "Rentabilité par type de client ou d'affaire",
        "effet des coûts spécifiques, du temps consacré et des dépenses de service sur la marge réellement conservée",
      ],
      [
        "Temps consommé et rentabilité des prestations",
        "écart entre le temps prévu et le temps réellement consacré, traduit en coût lorsque les données le permettent",
      ],
      [
        "Évolution et érosion des marges",
        "variation de la marge dans le temps et effets des variations de coûts, des remises déjà pratiquées ou du mélange d'activités",
      ],
      [
        "Niveau d'activité nécessaire à l'équilibre",
        "chiffre d'affaires nécessaire pour couvrir les coûts selon un modèle documenté, puis écart avec l'activité observée ; le seuil de rentabilité est un indicateur de gestion, distinct du compte de résultat",
      ],
    ],
  },
  {
    titre: "Structure et maîtrise des coûts",
    themes: [
      [
        "Poids des charges fixes",
        "dépenses qui persistent lorsque l'activité diminue, et évolution de leur poids dans l'entreprise",
      ],
      [
        "Poids des charges variables",
        "dépenses qui accompagnent les ventes ou la production, avec identification des dépenses mixtes lorsque nécessaire",
      ],
      [
        "Coût financier de l'équipe",
        "montants déclarés des salaires, commissions, prestations et rémunérations déjà versées ou prévues ; le dimensionnement des équipes et l'organisation du travail relèvent de RH",
      ],
      [
        "Achats, fournisseurs et sous-traitance",
        "poids des dépenses, évolution des coûts unitaires et suivi économique des prestations achetées",
      ],
      [
        "Utilisation des dépenses récurrentes",
        "usage réel des abonnements, logiciels, locaux et équipements payants, et dépenses redondantes ou inutilisées",
      ],
      [
        "Coûts des erreurs et reprises",
        "gaspillage, produits perdus, prestations à refaire, remboursements commerciaux et autres pertes opérationnelles mesurables",
      ],
    ],
  },
  {
    titre: "Trésorerie et visibilité",
    themes: [
      [
        "Trésorerie propre disponible",
        "argent effectivement mobilisable par l'entreprise ; les fonds détenus pour le compte de clients et les montants bloqués sont distingués des ressources propres disponibles",
      ],
      [
        "Évolution des flux de trésorerie",
        "encaissements et décaissements observés, évolution du solde et distinction des entrées exceptionnelles de financement",
      ],
      [
        "Dépenses et échéances à venir",
        "visibilité sur les engagements et paiements déjà identifiés, avec leurs dates",
      ],
      [
        "Saisonnalité financière",
        "périodes d'activité faible ou de dépenses concentrées, et couverture prévue des creux de trésorerie",
      ],
      [
        "Réserve et marge de sécurité",
        "capacité à absorber un décalage ou une dépense imprévue selon les paiements à venir ; aucun nombre universel de mois de réserve n'est posé à ce stade",
      ],
    ],
  },
  {
    titre: "Encaissements, décaissements et cycle d'exploitation",
    themes: [
      [
        "Délai avant facturation",
        "temps entre l'événement autorisant la facturation dans le métier et l'émission effective de la facture",
      ],
      [
        "Délai d'encaissement des clients",
        "temps entre la facturation et le paiement, lorsque cet indicateur est pertinent pour l'activité",
      ],
      [
        "Retards de paiement et sommes non encaissées",
        "montants, ancienneté et organisation des relances ; les démarches contentieuses restent hors périmètre",
      ],
      [
        "Avances et acomptes adaptés au métier",
        "place des versements déjà pratiqués dans le financement des dépenses avant livraison ou réalisation ; l'agent n'invente pas leur admissibilité juridique",
      ],
      [
        "Calendrier des paiements fournisseurs",
        "échéances convenues, respect des paiements et décalage avec les entrées d'argent ; un retard subi n'est pas présenté comme une amélioration financière",
      ],
      [
        "Argent immobilisé dans l'exploitation",
        "stocks, travaux en cours ou dépenses engagées avant l'encaissement, selon le métier ; le besoin en fonds de roulement décrit les ressources nécessaires au financement de ces décalages",
      ],
    ],
  },
  {
    titre: "Financement et remboursements",
    themes: [
      [
        "Poids des remboursements",
        "calendrier et montants des remboursements déjà engagés, rapprochés des ressources disponibles ; distinguer remboursement du capital et dépenses d'intérêts",
      ],
      [
        "Couverture des besoins identifiés",
        "ressources confirmées, financements encore incertains et besoins qui restent à couvrir",
      ],
      [
        "Dépendance aux ressources de court terme",
        "usage récurrent d'un découvert ou d'un financement temporaire pour faire fonctionner l'activité",
      ],
      [
        "Adéquation entre calendrier du besoin et des ressources",
        "cohérence des dates de financement, de dépense et de remboursement ; la capacité de remboursement est un élément d'analyse financier, l'agent ne garantit jamais l'accord d'un prêteur",
      ],
    ],
  },
  {
    titre: "Investissements et retour économique",
    themes: [
      [
        "Objectif économique de l'investissement",
        "gains attendus et indicateur retenu pour constater le résultat : économie de coût, temps valorisable ou capacité supplémentaire effectivement utilisée",
      ],
      [
        "Coût total du projet",
        "achat, installation, formation, temps de mise en place et coûts récurrents déjà identifiés",
      ],
      [
        "Retour attendu et hypothèses",
        "délai de récupération estimé et sensibilité aux hypothèses de gains ; les calculs sont explicites, les gains futurs ne sont jamais présentés comme garantis",
      ],
      [
        "Résultats après investissement",
        "écart entre les coûts et gains prévus et ceux constatés, avec une période de mesure définie",
      ],
    ],
  },
  {
    titre: "Dépendances et résistance aux imprévus",
    note: "Les scénarios et expositions apportent du contexte. Ils ne deviennent pas automatiquement des indicateurs notés : il faut d'abord établir que l'indicateur dépend principalement de l'entreprise et définir une référence pertinente.",
    themes: [
      [
        "Concentration des sommes à encaisser",
        "exposition financière à un petit nombre de payeurs ; réutiliser les informations commerciales disponibles sans refaire l'audit de la répartition du CA",
      ],
      [
        "Dépendance à des dépenses ou fournisseurs majeurs",
        "part des coûts exposée à une hausse ou à la perte d'un fournisseur clé",
      ],
      [
        "Sensibilité à un scénario défavorable",
        "effet calculé d'une baisse d'activité, d'une hausse de coûts ou d'un paiement décalé, sur des hypothèses explicites et communes",
      ],
      [
        "Besoin financier lié à la croissance",
        "dépenses supplémentaires et ressources à avancer avant de bénéficier des encaissements supplémentaires",
      ],
    ],
  },
  {
    titre: "Pilotage et décisions financières",
    themes: [
      [
        "Disponibilité et précision des données de gestion",
        "origine, période et caractère exact ou estimé des informations utilisées, avec visibilité sur les données manquantes",
      ],
      [
        "Tableau de suivi financier",
        "indicateurs effectivement suivis, rythme de mise à jour et capacité à repérer une dérive",
      ],
      [
        "Budgets, prévisions et écarts",
        "comparaison entre dépenses, marges et flux prévus et constatés ; explication des écarts documentés",
      ],
      [
        "Préparation et suivi des décisions de dépenses",
        "visibilité économique avant une dépense et mesure de son effet ensuite ; l'historique des actions déjà tentées personnalise les recommandations sans entrer dans le score",
      ],
    ],
  },
];

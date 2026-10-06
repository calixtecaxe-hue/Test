import type { Agent } from "./agents";

// Présentation de chaque agent en tête de sa page : quatre points forts et
// trois cas concrets sous forme d'échange. Les exemples sont illustratifs :
// les chiffres sont fictifs et choisis pour montrer le format d'un échange.

export type Scenario = {
  titre: string;
  question: string;
  reponse: string;
};

export type Presentation = {
  atouts: string[];
  scenarios: Scenario[];
};

export const PRESENTATIONS: Record<Agent["code"], Presentation> = {
  ACQUISITION_CA: {
    atouts: [
      "Un questionnaire adapté à votre métier",
      "Un score sur 100 calculé à partir de seuils fixes",
      "Un plan d'action concret",
      "Un suivi à l'échéance de chaque action",
    ],
    scenarios: [
      {
        titre: "Contacts",
        question:
          "Combien de contacts vendeurs ai-je reçus ce mois-ci, et d'où viennent-ils ?",
        reponse:
          "Vous avez déclaré 14 contacts vendeurs : statut orange pour une zone urbaine dense. Plus de la moitié viennent du bouche-à-oreille, ce qui vous rend dépendant d'un seul canal. Objectif proposé : ouvrir un second canal d'ici 3 semaines.",
      },
      {
        titre: "Rendez-vous",
        question: "Mes rendez-vous vendeurs sont-ils bien honorés ?",
        reponse:
          "Vous avez honoré 72 % de vos rendez-vous vendeurs : statut rouge, l'orange commence à 75 %. Action proposée : confirmer chaque rendez-vous la veille par message. Point d'étape dans 2 semaines.",
      },
      {
        titre: "Prix et honoraires",
        question: "Mes honoraires sont-ils bien placés face au marché ?",
        reponse:
          "Votre taux moyen est de 4,2 %, dans la fourchette de votre ville : statut vert. L'écart entre prix affiché et prix final, 9 %, est le point à travailler. Action proposée : revoir l'estimation initiale.",
      },
    ],
  },
  FINANCE_RENTABILITE: {
    atouts: [
      "Des ratios lus à partir de vos réponses",
      "Un score sur 100 calculé à partir de seuils fixes",
      "Un plan d'action concret",
      "Un suivi à l'échéance de chaque action",
    ],
    scenarios: [
      {
        titre: "Marge",
        question: "Où en est ma marge ?",
        reponse:
          "Votre marge déclarée est correcte mais en léger recul : statut orange. Action proposée : suivre chaque mois les cinq plus grosses charges fixes. Point d'étape dans 3 semaines.",
      },
      {
        titre: "Trésorerie",
        question: "Ma trésorerie est-elle suffisante ?",
        reponse:
          "Elle couvre moins de trois mois de charges : statut rouge. Action proposée : relancer les factures dont le délai de paiement est dépassé. Point d'étape dans 2 semaines.",
      },
      {
        titre: "Structure de coûts",
        question: "Quelles charges puis-je alléger ?",
        reponse:
          "Vos charges fixes pèsent plus de la moitié de votre chiffre d'affaires. Je vous propose de les passer en revue poste par poste. Fiscalité et comptabilité restent le métier de votre expert-comptable.",
      },
    ],
  },
  RH_ORGANISATION: {
    atouts: [
      "Des signaux organisationnels lus à partir de vos réponses",
      "Un score sur 100 calculé à partir de seuils fixes",
      "Un plan d'action concret",
      "Un suivi à l'échéance de chaque action",
    ],
    scenarios: [
      {
        titre: "Turnover",
        question: "Mes départs sont-ils préoccupants ?",
        reponse:
          "Le nombre de départs sur douze mois est faible pour une équipe de cette taille : statut vert. C'est un point d'appui pour la suite.",
      },
      {
        titre: "Charge de travail",
        question: "Mon équipe est-elle surchargée ?",
        reponse:
          "La charge pèse davantage sur certains postes : statut orange. Action proposée : passer en revue la charge de chaque poste avec l'équipe. Point d'étape dans 2 semaines.",
      },
      {
        titre: "Clarté des rôles",
        question: "Chacun sait-il ce que l'on attend de lui ?",
        reponse:
          "Les rôles sont compris, mais pas toujours écrits : statut orange. Action proposée : écrire en une page le rôle de chaque poste. Droit du travail et contrats restent hors de mon périmètre.",
      },
    ],
  },
  COMM_CREATION: {
    atouts: [
      "Une analyse de vos publications existantes",
      "Des indicateurs chiffrés de performance",
      "Des propositions de contenu à votre demande",
      "Jamais déclenché automatiquement",
    ],
    scenarios: [
      {
        titre: "Régularité",
        question: "Mes publications sont-elles assez régulières ?",
        reponse:
          "Vous publiez environ une fois par semaine, sur Instagram et LinkedIn. Les deux canaux sont alimentés ; la performance est plus faible sur LinkedIn.",
      },
      {
        titre: "Performance",
        question: "Quel canal fonctionne le mieux ?",
        reponse:
          "Les publications Instagram reçoivent plus de réactions que celles de LinkedIn. Je vous propose de reprendre sur LinkedIn le format qui fonctionne sur Instagram.",
      },
      {
        titre: "Propositions",
        question: "Que publier cette semaine ?",
        reponse:
          "Trois propositions, générées à votre demande : une publication « Vendu en 21 jours », une courte vidéo de visite commentée, un article LinkedIn sur le marché lyonnais.",
      },
    ],
  },
};

// MAQUETTE du compte rendu (étape 4 du parcours). Tout ce qui est écrit ici est un EXEMPLE FICTIF, fait pour
// valider la forme de l'écran avec le propriétaire : aucun chiffre ne sort du moteur, aucun repère de marché n'est
// réel. L'écran n'est ouvert que si RESULTATS_MAQUETTE=1 ; le vrai compte rendu viendra du moteur (constat,
// priorité) et de l'IA (rédaction), une fois les seuils et le prompt de l'agent écrits.

export type CouleurConstat = "rouge" | "orange" | "vert";
export type VerdictRealisme = "realiste" | "conditions" | "pas_en_l_etat";

export type PrioriteExemple = {
  theme: string;
  couleur: CouleurConstat;
  // Ce que le dirigeant a répondu, en une phrase (calculé).
  constat: string;
  // Repère de marché cité avec sa source ; absent quand aucun repère sourcé n'existe.
  repere: string | null;
  // Impact chiffré (sur ses volumes) ou qualifié (règles fixes).
  impact: { genre: "chiffre" | "montant" | "qualifie"; libelle: string; detail: string };
  // Texte rédigé par l'IA à partir du constat.
  lecture: string;
};

export type ActionExemple = {
  action: string;
  pourquoi: string;
  duree: string;
  pointEtape: string;
  // Une action qui libère du temps passe en premier ; les autres peuvent attendre.
  libereDuTemps?: string;
  aLancerApres?: string;
};

export type ResultatExemple = {
  entreprise: string;
  // Objectif : avancement déclaré et lecture de réalisme (absente quand l'objectif n'a pas de chiffre).
  avancement: { pourcent: number; phrase: string };
  realisme: null | { verdict: VerdictRealisme; chiffres: { libelle: string; valeur: string }[]; phrase: string };
  reponseAgent: { verdict: string; phrase: string };
  priorites: PrioriteExemple[];
  tempsDirigeant: string;
  plan: ActionExemple[];
  renvoi: null | { texte: string; bouton: string };
};

export const VERDICTS: Record<VerdictRealisme, string> = {
  realiste: "Réaliste",
  conditions: "Réaliste sous conditions",
  pas_en_l_etat: "Pas réaliste en l'état",
};

const COMMUN_AVANCEMENT = "Rien n'est encore déclaré : l'avancement se calcule sur ce que vous déclarez aux points d'étape, jamais sur une estimation.";

export const EXEMPLES: Record<string, ResultatExemple> = {
  ACQUISITION_CA: {
    entreprise: "Entreprise d'exemple : 80 000 € de chiffre d'affaires par mois, 6 salariés.",
    avancement: { pourcent: 0, phrase: COMMUN_AVANCEMENT },
    realisme: {
      verdict: "conditions",
      chiffres: [
        { libelle: "Objectif", valeur: "+ 8 000 € par mois" },
        { libelle: "Ce que les leviers retenus peuvent apporter", valeur: "4 100 à 6 500 € par mois" },
        { libelle: "Capacité actuelle", valeur: "plafonne à + 3 000 € par mois" },
      ],
      phrase:
        "Les leviers retenus ne suffisent pas, à eux seuls, à atteindre + 8 000 € par mois. La capacité de l'entreprise limite le gain immédiat : une fois la capacité augmentée, le plan peut approcher l'objectif sans l'atteindre. Cette fourchette vient d'un recalcul de toute la chaîne, pas d'une addition des gains.",
    },
    reponseAgent: {
      verdict: "Deux leviers pèsent sur l'écart",
      phrase: "La relance des devis et le délai de réponse expliquent l'essentiel de l'écart à votre objectif. Le reste est secondaire.",
    },
    priorites: [
      {
        theme: "Devis et relances",
        couleur: "rouge",
        constat: "Vous signez 22 % de vos devis et vous les relancez rarement. 18 devis envoyés ces trois derniers mois n'ont jamais reçu de réponse.",
        repere: "Repère de marché : 35 % de devis signés. Source citée ici, avec l'organisme, la page et l'année.",
        impact: { genre: "chiffre", libelle: "Potentiel : + 1 900 à 3 600 € par mois", detail: "Taux d'effet sourcé pour votre métier, appliqué à vos 18 devis sans réponse (43 200 € en jeu)." },
        lecture: "Un devis sans relance est un devis que le client oublie. Relancer ceux qui sont déjà envoyés ne demande aucun nouveau contact.",
      },
      {
        theme: "Délai de réponse aux demandes",
        couleur: "orange",
        constat: "Vous répondez en 2 jours en moyenne à une nouvelle demande.",
        repere: null,
        impact: { genre: "montant", libelle: "Montant en jeu : 12 demandes par mois sans réponse sous 24 h", detail: "Pas de chiffre sourcé pour votre métier : le rapport donne le volume concerné, pas un gain." },
        lecture: "Plus la réponse tarde, plus la demande se dirige vers un concurrent. Le gain ne se chiffre pas encore sur des sources.",
      },
      {
        theme: "Clients qui reviennent",
        couleur: "orange",
        constat: "28 % de votre chiffre d'affaires vient de clients déjà servis.",
        repere: "Repère de marché : 40 %. Source citée ici, avec l'organisme, la page et l'année.",
        impact: { genre: "qualifie", libelle: "Secondaire", detail: "Impact qualifié par règle fixe : ce thème n'est pas sur la chaîne de calcul de l'objectif." },
        lecture: "Cette marge existe mais elle demande plus de temps que les deux leviers précédents. Elle passe après.",
      },
    ],
    tempsDirigeant: "Temps disponible déclaré : 1 h par jour travaillé.",
    plan: [
      { action: "Faire saisir vos devis par une autre personne", pourquoi: "Libère du temps pour les relances. Vos devis occupent aujourd'hui une heure sur deux.", duree: "2 h pour expliquer, puis 30 min par semaine", pointEtape: "Point d'étape dans 2 semaines", libereDuTemps: "6 h libérées par mois" },
      { action: "Relancer les 18 devis restés sans réponse", pourquoi: "Premier levier chiffré de votre plan.", duree: "20 min par jour pendant 2 semaines", pointEtape: "Point d'étape dans 3 semaines" },
      { action: "Répondre à chaque nouvelle demande sous 24 h", pourquoi: "Évite de perdre les demandes les plus récentes.", duree: "15 min par jour", pointEtape: "Point d'étape dans 4 semaines", aLancerApres: "À lancer une fois les 6 h libérées" },
    ],
    renvoi: { texte: "Votre présence en ligne envoie peu de signaux. L'agent Comm & Création de contenu peut proposer des contenus.", bouton: "Voir des propositions de contenu" },
  },

  FINANCE_RENTABILITE: {
    entreprise: "Entreprise d'exemple : 80 000 € de chiffre d'affaires par mois, 6 salariés.",
    avancement: { pourcent: 0, phrase: COMMUN_AVANCEMENT },
    realisme: {
      verdict: "conditions",
      chiffres: [
        { libelle: "Objectif", valeur: "marge de 22 % à 27 %" },
        { libelle: "Marge actuelle déclarée", valeur: "22 %" },
        { libelle: "Ce que les leviers retenus peuvent apporter", valeur: "+ 3 à + 4,5 points" },
      ],
      phrase: "Les leviers retenus permettent d'approcher l'objectif, pas de l'atteindre avec certitude. Le plan l'indique, il ne le promet pas.",
    },
    reponseAgent: {
      verdict: "Rentable, financement à surveiller",
      phrase: "L'objectif reste rentable si vos délais de paiement clients se réduisent. Sans cela, la trésorerie devient le frein.",
    },
    priorites: [
      {
        theme: "Délais de paiement clients",
        couleur: "rouge",
        constat: "Vos clients vous paient en 58 jours en moyenne, vous payez vos fournisseurs en 30 jours.",
        repere: "Repère de marché : 45 jours. Source citée ici, avec l'organisme, la page et l'année.",
        impact: { genre: "qualifie", libelle: "Bloquant", detail: "Un écart de 28 jours entre ce que vous encaissez et ce que vous payez creuse la trésorerie à chaque commande." },
        lecture: "Tant que cet écart dure, plus de commandes veut dire plus de trésorerie à avancer.",
      },
      {
        theme: "Seuil de rentabilité",
        couleur: "orange",
        constat: "Votre seuil de rentabilité est atteint le 21 du mois.",
        repere: null,
        impact: { genre: "qualifie", libelle: "Frein", detail: "Impact qualifié par règle fixe." },
        lecture: "Chaque jour gagné avant le seuil augmente ce qui reste en fin de mois.",
      },
      {
        theme: "Mois de sécurité de trésorerie",
        couleur: "vert",
        constat: "Votre trésorerie couvre 3,2 mois de charges.",
        repere: "Repère de marché : 2 mois. Source citée ici, avec l'organisme, la page et l'année.",
        impact: { genre: "qualifie", libelle: "Secondaire", detail: "Point fort : à conserver." },
        lecture: "Cette réserve vous laisse le temps de corriger les délais de paiement.",
      },
    ],
    tempsDirigeant: "Temps disponible déclaré : 1 h par jour travaillé.",
    plan: [
      { action: "Envoyer vos factures le jour de la livraison", pourquoi: "Chaque jour de retard décale d'autant l'encaissement.", duree: "10 min par facture", pointEtape: "Point d'étape dans 2 semaines", libereDuTemps: "Aucun temps libéré" },
      { action: "Relancer les factures échues depuis plus de 15 jours", pourquoi: "Réduit l'écart entre ce que vous encaissez et ce que vous payez.", duree: "30 min par semaine", pointEtape: "Point d'étape dans 4 semaines" },
      { action: "Revoir les conditions de paiement de vos trois plus gros clients", pourquoi: "Traite les retards à la source.", duree: "3 h au total", pointEtape: "Point d'étape dans 6 semaines" },
    ],
    renvoi: null,
  },

  RH_ORGANISATION: {
    entreprise: "Entreprise d'exemple : 12 salariés, 2 responsables d'équipe.",
    avancement: { pourcent: 0, phrase: "Votre objectif n'a pas de chiffre : l'avancement se mesure à ce que vous déclarez aux points d'étape. Aujourd'hui : aucune déclaration." },
    realisme: null,
    reponseAgent: {
      verdict: "Sous conditions",
      phrase: "Votre organisation peut porter cet objectif si deux postes ont une mission écrite. Sans cela, les équipes continuent de vous solliciter.",
    },
    priorites: [
      {
        theme: "Rôles et responsabilités",
        couleur: "rouge",
        constat: "Sur 9 tâches courantes, 5 n'ont personne de désigné pour les décider.",
        repere: null,
        impact: { genre: "qualifie", libelle: "Bloquant", detail: "Objectif sans chiffre : le moteur classe ce thème par règle fixe, il ne calcule pas de gain." },
        lecture: "Une tâche sans responsable remonte toujours au dirigeant. C'est la cause directe des sollicitations que vous décrivez.",
      },
      {
        theme: "Information des équipes",
        couleur: "orange",
        constat: "Vous faites un point d'équipe tous les mois, sans compte rendu écrit.",
        repere: null,
        impact: { genre: "qualifie", libelle: "Frein", detail: "Impact qualifié par règle fixe." },
        lecture: "Sans trace écrite, les décisions se répètent et se contredisent.",
      },
      {
        theme: "Absence du dirigeant",
        couleur: "orange",
        constat: "En votre absence d'une semaine, 3 décisions courantes restent en attente.",
        repere: null,
        impact: { genre: "qualifie", libelle: "Secondaire", detail: "Impact qualifié par règle fixe." },
        lecture: "Ce point se règle une fois les rôles écrits.",
      },
    ],
    tempsDirigeant: "Temps disponible déclaré : 1 h par jour travaillé.",
    plan: [
      { action: "Lister les 9 tâches courantes et nommer un responsable pour chacune", pourquoi: "Premier pas vers l'objectif : chacun sait ce qu'il doit faire.", duree: "2 h", pointEtape: "Point d'étape dans 1 semaine", libereDuTemps: "Environ 3 h par semaine libérées" },
      { action: "Écrire en une page la mission de vos deux responsables d'équipe", pourquoi: "Fixe ce qu'ils décident sans vous.", duree: "1 h par mission", pointEtape: "Point d'étape dans 3 semaines" },
      { action: "Tenir un compte rendu écrit à chaque point d'équipe", pourquoi: "Garde la trace des décisions.", duree: "15 min par réunion", pointEtape: "Point d'étape dans 6 semaines", aLancerApres: "À lancer une fois les rôles écrits" },
    ],
    renvoi: null,
  },

  COMM_CREATION: {
    entreprise: "Entreprise d'exemple : 80 000 € de chiffre d'affaires par mois, 2 comptes de réseaux sociaux actifs.",
    avancement: { pourcent: 0, phrase: COMMUN_AVANCEMENT },
    realisme: {
      verdict: "conditions",
      chiffres: [
        { libelle: "Objectif", valeur: "taux de conversion + 5 %" },
        { libelle: "Taux de conversion déclaré", valeur: "2,0 %" },
        { libelle: "Ce que les leviers retenus peuvent apporter", valeur: "+ 3 à + 6 %" },
      ],
      phrase: "L'objectif est à votre portée si le parcours de conversion est corrigé en premier. Les contenus seuls ne suffisent pas.",
    },
    reponseAgent: {
      verdict: "Contacts insuffisants",
      phrase: "Votre présence en ligne attire des visites mais ne les transforme pas en demandes. Le problème se trouve après la visite, pas avant.",
    },
    priorites: [
      {
        theme: "Parcours de conversion",
        couleur: "rouge",
        constat: "Aucun bouton d'appel n'est présent sur votre page d'accueil et votre formulaire demande 9 champs.",
        repere: null,
        impact: { genre: "qualifie", libelle: "Bloquant", detail: "Impact qualifié par règle fixe : sans parcours, les autres leviers perdent leur effet." },
        lecture: "Une visite sans chemin clair vers la demande ne devient pas un contact.",
      },
      {
        theme: "Régularité de publication",
        couleur: "orange",
        constat: "Vous publiez 1 fois par mois sur vos deux comptes.",
        repere: "Repère de marché : 1 publication par semaine. Source citée ici, avec l'organisme, la page et l'année.",
        impact: { genre: "qualifie", libelle: "Frein", detail: "Impact qualifié par règle fixe." },
        lecture: "Un rythme trop espacé empêche vos publications d'être reconnues.",
      },
      {
        theme: "Identité visuelle",
        couleur: "vert",
        constat: "Vos deux comptes utilisent le même logo, les mêmes couleurs et le même ton.",
        repere: null,
        impact: { genre: "qualifie", libelle: "Secondaire", detail: "Point fort : à conserver." },
        lecture: "Cette base est saine. Elle servira de point d'appui pour la suite.",
      },
    ],
    tempsDirigeant: "Temps disponible déclaré : 1 h par jour travaillé.",
    plan: [
      { action: "Ajouter un bouton d'appel visible en haut de votre page d'accueil", pourquoi: "Rend le parcours de conversion visible dès la première visite.", duree: "1 h", pointEtape: "Point d'étape dans 1 semaine", libereDuTemps: "Aucun temps libéré" },
      { action: "Réduire le formulaire de contact à 3 champs", pourquoi: "Moins de champs, plus de demandes envoyées.", duree: "1 h", pointEtape: "Point d'étape dans 2 semaines" },
      { action: "Publier une fois par semaine sur un seul compte", pourquoi: "Un rythme tenu vaut mieux que deux comptes irréguliers.", duree: "45 min par semaine", pointEtape: "Point d'étape dans 6 semaines" },
    ],
    renvoi: null,
  },
};

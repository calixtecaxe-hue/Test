// Interprétation de l'objectif libre du dirigeant (CLAUDE.md section 0).
//
// Le dirigeant écrit son objectif comme il le dirait à voix haute : « Je veux
// passer de 10 à 15 nouveaux clients par mois dans 6 mois ». Ce module en
// extrait une donnée structurée : indicateur, valeur de départ, valeur cible,
// variation, unité, échéance, agent. Il ne calcule rien d'autre, ne juge rien
// et ne note rien : c'est de la lecture de texte, pas du scoring (section 2).
//
// L'interprétation est déterministe : le même texte donne le même résultat,
// sans appel réseau. Le lexique ci-dessous est une donnée (indicateurs par
// agent), à enrichir sans toucher à la logique. Si un modèle de langage prend
// plus tard le relais pour les formulations plus libres, il devra rendre la
// même structure `Interpretation`.
//
// Ce fichier n'importe rien : il se teste directement avec Node.

export type CodeAgent =
  | "ACQUISITION_CA"
  | "FINANCE_RENTABILITE"
  | "RH_ORGANISATION"
  | "COMM_CREATION";

export type ObjectifStructure = {
  // Identifiant stable de l'indicateur, ex. « nouveaux_clients_mensuels ».
  metric: string;
  // Libellé lisible, ex. « Nouveaux clients par mois ».
  metric_label: string;
  // Valeur de départ, si le dirigeant la donne (« de 10 à 15 »).
  current_value: number | null;
  // Valeur à atteindre, si elle est donnée (« 100 nouveaux clients »).
  target_value: number | null;
  // Variation relative visée, en pourcentage signé (+50, -25).
  target_change: number | null;
  // Variation absolue visée, dans la même unité (« gagner 5 000 € »).
  target_delta: number | null;
  // Unité de l'indicateur : « clients/mois », « € », « % »…
  unit: string;
  deadline: {
    duree_mois: number;
    // Date d'échéance, au format ISO (AAAA-MM-JJ).
    echeance: string;
  };
  audit_agent: CodeAgent;
};

export type Manque = "resultat" | "delai" | "resultat_et_delai";

export type Interpretation =
  | { statut: "complet"; objectif: ObjectifStructure }
  | { statut: "incomplet"; manque: Manque; question: string }
  | { statut: "hors_perimetre"; agent_suggere: CodeAgent; message: string };

export const QUESTION_DELAI = "Dans quel délai souhaitez-vous atteindre cet objectif ?";
export const QUESTION_RESULTAT =
  "Pouvez-vous préciser le résultat mesurable que vous souhaitez atteindre ?";
export const QUESTION_RESULTAT_ET_DELAI =
  "Pouvez-vous préciser le résultat mesurable que vous souhaitez atteindre ainsi que le délai ?";

// ---------------------------------------------------------------------------
// Lexique : les indicateurs que chaque agent sait traiter.
// ---------------------------------------------------------------------------

type Indicateur = {
  agent: CodeAgent;
  id: string;
  libelle: string;
  unite: string;
  // Unité quand l'indicateur est compté par mois (« … par mois »).
  uniteMensuelle?: string;
  idMensuel?: string;
  libelleMensuel?: string;
  motifs: RegExp[];
  exclut?: RegExp;
  // Sens de « améliorer » pour cet indicateur.
  sens: "hausse" | "baisse";
};

// Les motifs s'appliquent à un texte en minuscules, sans accents.
const INDICATEURS: Indicateur[] = [
  // Acquisition & chiffre d'affaires
  {
    agent: "ACQUISITION_CA",
    id: "cout_acquisition",
    libelle: "Coût d'acquisition",
    unite: "€",
    motifs: [/cout d'acquisition|cout par client|cout par lead|\bcac\b/],
    sens: "baisse",
  },
  {
    agent: "ACQUISITION_CA",
    id: "taux_conversion",
    libelle: "Taux de conversion",
    unite: "%",
    motifs: [/taux de (conversion|transformation)|transformation des (devis|estimations|visites)/],
    sens: "hausse",
  },
  {
    agent: "ACQUISITION_CA",
    id: "nouveaux_clients",
    libelle: "Nouveaux clients",
    unite: "clients",
    uniteMensuelle: "clients/mois",
    idMensuel: "nouveaux_clients_mensuels",
    libelleMensuel: "Nouveaux clients par mois",
    motifs: [/nouveaux? clients?|nouvelles? clientes?|clients? supplementaires?|clients? en plus/],
    sens: "hausse",
  },
  {
    agent: "ACQUISITION_CA",
    id: "mandats",
    libelle: "Mandats signés",
    unite: "mandats",
    uniteMensuelle: "mandats/mois",
    idMensuel: "mandats_mensuels",
    libelleMensuel: "Mandats signés par mois",
    motifs: [/mandats?/],
    sens: "hausse",
  },
  {
    agent: "ACQUISITION_CA",
    id: "contacts",
    libelle: "Contacts entrants",
    unite: "contacts",
    uniteMensuelle: "contacts/mois",
    idMensuel: "contacts_mensuels",
    libelleMensuel: "Contacts entrants par mois",
    motifs: [/contacts?|\bleads?\b|prospects?|demandes? entrantes?/],
    sens: "hausse",
  },
  {
    agent: "ACQUISITION_CA",
    id: "chiffre_affaires",
    libelle: "Chiffre d'affaires",
    unite: "€",
    motifs: [/chiffre d'affaires|\bca\b|\bventes?\b|revenus?|honoraires/],
    sens: "hausse",
  },
  // Finance & rentabilité
  {
    agent: "FINANCE_RENTABILITE",
    id: "marge",
    libelle: "Marge",
    unite: "%",
    motifs: [/\bmarges?\b/],
    sens: "hausse",
  },
  {
    agent: "FINANCE_RENTABILITE",
    id: "tresorerie",
    libelle: "Trésorerie",
    unite: "€",
    motifs: [/tresorerie|encaissements?|cash/],
    sens: "hausse",
  },
  {
    agent: "FINANCE_RENTABILITE",
    id: "charges",
    libelle: "Charges",
    unite: "€",
    motifs: [/charges?|depenses?|\bcouts?\b|frais/],
    exclut: /cout d'acquisition|cout par client|cout par lead/,
    sens: "baisse",
  },
  {
    agent: "FINANCE_RENTABILITE",
    id: "delai_paiement",
    libelle: "Délai de paiement des clients",
    unite: "jours",
    motifs: [/delais? de paiement|impayes?|retards? de paiement/],
    sens: "baisse",
  },
  {
    agent: "FINANCE_RENTABILITE",
    id: "rentabilite",
    libelle: "Rentabilité",
    unite: "%",
    motifs: [/rentabilite|benefices?|resultat net/],
    sens: "hausse",
  },
  // RH & organisation
  {
    agent: "RH_ORGANISATION",
    id: "turnover",
    libelle: "Turnover",
    unite: "%",
    motifs: [/turn-?over|rotation (du personnel|des equipes|des salaries)|departs? (de|des) (salaries|collaborateurs|employes)/],
    sens: "baisse",
  },
  {
    agent: "RH_ORGANISATION",
    id: "absenteisme",
    libelle: "Absentéisme",
    unite: "%",
    motifs: [/absenteisme|absences?/],
    sens: "baisse",
  },
  {
    agent: "RH_ORGANISATION",
    id: "charge_travail",
    libelle: "Charge de travail",
    unite: "heures/semaine",
    motifs: [/charge de travail|surcharge|heures supplementaires/],
    sens: "baisse",
  },
  {
    agent: "RH_ORGANISATION",
    id: "engagement_equipe",
    libelle: "Engagement de l'équipe",
    unite: "%",
    motifs: [/satisfaction (de l'equipe|des salaries|des collaborateurs)|engagement (de l'equipe|des salaries|des collaborateurs)|motivation|climat social/],
    sens: "hausse",
  },
  // Comm & création de contenu
  {
    agent: "COMM_CREATION",
    id: "conversion_publications",
    libelle: "Conversion des publications",
    unite: "%",
    motifs: [/conversion[^.]*(publications?|posts?|instagram|linkedin|tiktok|facebook|reseaux)|(publications?|posts?|instagram|linkedin|tiktok|facebook)[^.]*conversion/],
    sens: "hausse",
  },
  {
    agent: "COMM_CREATION",
    id: "engagement_publications",
    libelle: "Engagement des publications",
    unite: "%",
    motifs: [/engagement|interactions?|\blikes?\b|commentaires?/],
    exclut: /equipe|salaries|collaborateurs/,
    sens: "hausse",
  },
  {
    agent: "COMM_CREATION",
    id: "portee",
    libelle: "Portée des publications",
    unite: "vues",
    motifs: [/portee|impressions?|\bvues\b|visibilite/],
    sens: "hausse",
  },
  {
    agent: "COMM_CREATION",
    id: "abonnes",
    libelle: "Abonnés",
    unite: "abonnés",
    motifs: [/abonnes?|followers?|communaute/],
    sens: "hausse",
  },
  {
    agent: "COMM_CREATION",
    id: "frequence_publication",
    libelle: "Fréquence de publication",
    unite: "publications/semaine",
    motifs: [/frequence de publication|(publications?|posts?) par (semaine|mois)|publier plus/],
    sens: "hausse",
  },
];

const NOMS_AGENTS: Record<CodeAgent, string> = {
  ACQUISITION_CA: "Acquisition & Chiffre d'affaires",
  FINANCE_RENTABILITE: "Finance & Rentabilité",
  RH_ORGANISATION: "RH & Organisation",
  COMM_CREATION: "Comm & Création de contenu",
};

// ---------------------------------------------------------------------------
// Lecture du texte
// ---------------------------------------------------------------------------

const NOMBRES_EN_LETTRES: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7,
  huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, dix_huit: 18,
  vingt: 20, trente: 30,
};

const MOIS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout",
  "septembre", "octobre", "novembre", "decembre",
];

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nombre(brut: string): number | null {
  const mot = NOMBRES_EN_LETTRES[brut.replace(/\s+/g, "_")];
  if (mot !== undefined) return mot;
  const propre = brut.replace(/\s/g, "").replace(",", ".");
  const n = Number(propre);
  return Number.isFinite(n) ? n : null;
}

const NB = String.raw`\d{1,3}(?:\s\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?`;
const NB_LETTRES = "un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente";
const NB_OU_LETTRES = `(?:${NB}|${NB_LETTRES})`;

function ajouterMois(depart: Date, mois: number): Date {
  const d = new Date(Date.UTC(depart.getUTCFullYear(), depart.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() + mois);
  const dernierJour = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(depart.getUTCDate(), dernierJour));
  return d;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function moisEntre(depart: Date, fin: Date): number {
  const jours = (fin.getTime() - depart.getTime()) / 86_400_000;
  return Math.max(1, Math.round(jours / 30.44));
}

type Echeance = { duree_mois: number; echeance: string; texte: string };

// Cherche une échéance dans le texte normalisé : « dans les 12 prochains
// mois », « d'ici 6 mois », « d'ici la fin de l'année », « en 2 ans »…
function lireEcheance(t: string, maintenant: Date): Echeance | null {
  const duree = (n: number, unite: string): number => {
    if (unite.startsWith("an")) return n * 12;
    if (unite.startsWith("trimestre")) return n * 3;
    if (unite.startsWith("semaine")) return Math.max(1, Math.round((n * 7) / 30.44));
    if (unite.startsWith("jour")) return Math.max(1, Math.round(n / 30.44));
    return n;
  };
  const depuis = (n: number, unite: string, texte: string): Echeance => {
    const mois = duree(n, unite);
    let fin: Date;
    if (unite.startsWith("semaine")) fin = new Date(maintenant.getTime() + n * 7 * 86_400_000);
    else if (unite.startsWith("jour")) fin = new Date(maintenant.getTime() + n * 86_400_000);
    else fin = ajouterMois(maintenant, mois);
    return { duree_mois: mois, echeance: iso(fin), texte };
  };

  // « dans les 12 prochains mois », « d'ici 6 mois », « sur 12 mois », « en 1 an »…
  const relatif = new RegExp(
    String.raw`(?:dans|d'ici|sous|en|sur|pendant|avant)\s+(?:les\s+|ces\s+|le\s+|la\s+)?(${NB_OU_LETTRES})\s+(?:prochains?\s+|prochaines?\s+|derniers?\s+)?(mois|ans?|annees?|semaines?|jours?|trimestres?)\b`
  );
  const r = t.match(relatif);
  if (r) {
    const n = nombre(r[1]);
    if (n !== null && n > 0) return depuis(n, r[2].replace(/^annee/, "an"), r[0]);
  }

  // « d'ici un an », « dans un an », « dans six mois » sont couverts ci-dessus
  // (nombres en lettres). « d'ici la fin de l'année », « d'ici fin 2027 ».
  const finAnnee = t.match(/(?:d'ici|avant|pour)\s+(?:la\s+)?fin\s+(?:de\s+)?(?:l'annee|annee)(?:\s+(\d{4}))?/);
  if (finAnnee) {
    const annee = finAnnee[1] ? Number(finAnnee[1]) : maintenant.getUTCFullYear();
    const fin = new Date(Date.UTC(annee, 11, 31));
    if (fin > maintenant) return { duree_mois: moisEntre(maintenant, fin), echeance: iso(fin), texte: finAnnee[0] };
  }
  const finDe = t.match(/(?:d'ici|avant|pour)\s+(?:la\s+)?fin\s+(?:de\s+)?(\d{4})/);
  if (finDe) {
    const fin = new Date(Date.UTC(Number(finDe[1]), 11, 31));
    if (fin > maintenant) return { duree_mois: moisEntre(maintenant, fin), echeance: iso(fin), texte: finDe[0] };
  }

  // « d'ici la fin du trimestre », « d'ici la fin du semestre »
  const finPeriode = t.match(/(?:d'ici|avant|pour)\s+(?:la\s+)?fin\s+(?:du\s+|de\s+ce\s+)(trimestre|semestre)/);
  if (finPeriode) {
    const taille = finPeriode[1] === "trimestre" ? 3 : 6;
    const debutMois = Math.floor(maintenant.getUTCMonth() / taille) * taille;
    const fin = new Date(Date.UTC(maintenant.getUTCFullYear(), debutMois + taille, 0));
    return { duree_mois: moisEntre(maintenant, fin), echeance: iso(fin), texte: finPeriode[0] };
  }

  // « d'ici le 30 juin », « avant le 15 mars 2027 »
  const date = t.match(new RegExp(String.raw`(?:d'ici|avant|pour)\s+(?:le\s+)?(\d{1,2})(?:er)?\s+(${MOIS.join("|")})(?:\s+(\d{4}))?`));
  if (date) {
    const m = MOIS.indexOf(date[2]);
    let annee = date[3] ? Number(date[3]) : maintenant.getUTCFullYear();
    let fin = new Date(Date.UTC(annee, m, Number(date[1])));
    if (!date[3] && fin <= maintenant) {
      annee += 1;
      fin = new Date(Date.UTC(annee, m, Number(date[1])));
    }
    if (fin > maintenant) return { duree_mois: moisEntre(maintenant, fin), echeance: iso(fin), texte: date[0] };
  }

  // « d'ici l'été » et formulations saisonnières : trop floues, on redemande.
  return null;
}

type Valeurs = {
  current: number | null;
  target: number | null;
  change: number | null;
  delta: number | null;
  unite: string | null;
  mensuel: boolean;
  // Seul « améliorer » donne le sens : il dépend de l'indicateur.
  ambigu: boolean;
};

const VERBES_HAUSSE = "augmenter|accroitre|gagner|ameliorer|developper|progresser|croitre|monter|booster|hausse";
const VERBES_BAISSE = "reduire|baisser|diminuer|abaisser|reduction|diminution|baisse|couper|alleger|limiter";
const VERBES_CIBLE =
  "atteindre|arriver a|viser|avoir|realiser|signer|generer|obtenir|decrocher|faire|vendre|recruter|conclure|passer a|objectif de";

// Dernier verbe d'une famille dans `texte` : sa position et le mot trouvé.
function dernierVerbe(texte: string, familles: string): { pos: number; mot: string } {
  let trouve = { pos: -1, mot: "" };
  for (const m of texte.matchAll(new RegExp(`\\b(?:${familles})`, "g"))) {
    trouve = { pos: m.index ?? -1, mot: m[0] };
  }
  return trouve;
}

function lireValeurs(t: string): Valeurs {
  const v: Valeurs = {
    current: null,
    target: null,
    change: null,
    delta: null,
    unite: null,
    mensuel: /par mois|mensuel|chaque mois|\/mois/.test(t),
    ambigu: false,
  };

  // « passer de 10 à 15 », « de 2 % à 4 % », « de 80 000 € à 100 000 € »
  const trajet = t.match(
    new RegExp(String.raw`\bde\s+(${NB})\s*(%|k?€|euros?)?\s*(?:[a-z' ]{0,40}?)\s+(?:a|vers|jusqu'a)\s+(${NB})\s*(%|k?€|euros?)?`)
  );
  if (trajet) {
    const de = nombre(trajet[1]);
    const a = nombre(trajet[3]);
    if (de !== null && a !== null) {
      const facteur = (u: string | undefined) => (u === "k€" ? 1000 : 1);
      v.current = de * facteur(trajet[2]);
      v.target = a * facteur(trajet[4]);
      const marque = (trajet[2] ?? "") + (trajet[4] ?? "");
      v.unite = marque.includes("%") ? "%" : /€|euro/.test(marque) ? "€" : null;
      if (v.current !== 0) v.change = Math.round(((v.target - v.current) / Math.abs(v.current)) * 1000) / 10;
      return v;
    }
  }

  if (/\bdoubler\b/.test(t)) return { ...v, change: 100 };
  if (/\btripler\b/.test(t)) return { ...v, change: 200 };
  if (/diviser par deux|reduire de moitie/.test(t)) return { ...v, change: -50 };

  // Variation relative : « de 20 % », « +15 % », « -25 % », « 20 % de plus ».
  const pourcent = t.match(new RegExp(String.raw`([+-])?\s*(${NB})\s*(?:%|pour ?cent)`));
  if (pourcent) {
    const n = nombre(pourcent[2]);
    if (n !== null) {
      const index = pourcent.index ?? 0;
      const avant = t.slice(0, index);
      const apres = t.slice(index + pourcent[0].length);
      v.unite = "%";
      let signe = pourcent[1] === "+" ? 1 : pourcent[1] === "-" ? -1 : 0;
      if (signe === 0) {
        const h = dernierVerbe(avant, VERBES_HAUSSE);
        const b = dernierVerbe(avant, VERBES_BAISSE);
        if (h.pos >= 0 || b.pos >= 0) {
          signe = b.pos > h.pos ? -1 : 1;
          v.ambigu = signe === 1 && h.mot === "ameliorer";
        } else if (/^\s*(?:de|en) moins/.test(apres)) signe = -1;
        else if (/^\s*(?:de|en) plus/.test(apres)) signe = 1;
      }
      // Sans verbe ni signe, c'est une valeur visée (« atteindre 5 % de marge »).
      if (signe === 0) v.target = n;
      else v.change = signe * n;
      return v;
    }
  }

  // Valeurs absolues : « atteindre 100 nouveaux clients », « gagner 5 000 € ».
  for (const m of t.matchAll(new RegExp(String.raw`(${NB})\s*(k€|€|euros?)?`, "g"))) {
    const n = nombre(m[1]);
    if (n === null) continue;
    const valeur = m[2] === "k€" ? n * 1000 : n;
    if (m[2]) v.unite = "€";
    const fin = t.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0);
    const cible = new RegExp(`(?:${VERBES_CIBLE})\\s+(?:\\w+\\s+){0,2}$`).test(fin);
    const baisse = dernierVerbe(fin, VERBES_BAISSE).pos >= 0;
    const hausse = dernierVerbe(fin, VERBES_HAUSSE).pos >= 0;
    if (!cible && baisse) v.delta = -valeur;
    else if (!cible && hausse) v.delta = valeur;
    else v.target = valeur;
    break;
  }
  return v;
}

function trouverIndicateurs(t: string): Indicateur[] {
  return INDICATEURS.filter((i) => i.motifs.some((m) => m.test(t)) && !(i.exclut && i.exclut.test(t)));
}

function choisirIndicateur(trouves: Indicateur[], agent: CodeAgent): Indicateur | null {
  const chez = trouves.filter((i) => i.agent === agent);
  // Plusieurs indicateurs de l'agent : le plus spécifique d'abord (l'ordre de la
  // liste va du plus précis au plus général).
  return chez[0] ?? null;
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

export function interpreterObjectif(
  texte: string,
  agent: CodeAgent,
  maintenant: Date = new Date()
): Interpretation {
  const t = normaliser(texte);
  if (t.length === 0) {
    return { statut: "incomplet", manque: "resultat_et_delai", question: QUESTION_RESULTAT_ET_DELAI };
  }

  const echeance = lireEcheance(t, maintenant);
  // L'échéance est retirée avant de chercher les valeurs, pour ne pas prendre
  // « 12 » de « 12 mois » pour une valeur cible.
  const sansEcheance = echeance ? t.replace(echeance.texte, " ") : t;

  const indicateurs = trouverIndicateurs(sansEcheance);
  const indicateur = choisirIndicateur(indicateurs, agent);

  if (!indicateur && indicateurs.length > 0) {
    const autre = indicateurs[0].agent;
    return {
      statut: "hors_perimetre",
      agent_suggere: autre,
      message: `Cet objectif relève plutôt de l'agent ${NOMS_AGENTS[autre]}. Vous pouvez le lancer depuis cet agent.`,
    };
  }

  const valeurs = lireValeurs(sansEcheance);
  if (indicateur) {
    // « améliorer » : le sens dépend de l'indicateur (le turnover s'améliore en baissant).
    if (valeurs.ambigu && valeurs.change !== null && indicateur.sens === "baisse") {
      valeurs.change = -Math.abs(valeurs.change);
    }
    // Un pourcentage sur un indicateur qui n'est pas un taux est une variation.
    if (valeurs.unite === "%" && valeurs.change === null && valeurs.target !== null && indicateur.unite !== "%") {
      valeurs.change = valeurs.target;
      valeurs.target = null;
    }
  }
  const mensuel = valeurs.mensuel && !!indicateur?.idMensuel;

  const mesurable =
    valeurs.change !== null || valeurs.target !== null || valeurs.delta !== null || valeurs.current !== null;
  const aResultat = !!indicateur && mesurable;

  if (!aResultat || !echeance) {
    if (!aResultat && !echeance) {
      return { statut: "incomplet", manque: "resultat_et_delai", question: QUESTION_RESULTAT_ET_DELAI };
    }
    if (!echeance) return { statut: "incomplet", manque: "delai", question: QUESTION_DELAI };
    return { statut: "incomplet", manque: "resultat", question: QUESTION_RESULTAT };
  }

  const unite = mensuel ? indicateur.uniteMensuelle ?? indicateur.unite : indicateur.unite;

  return {
    statut: "complet",
    objectif: {
      metric: mensuel ? indicateur.idMensuel ?? indicateur.id : indicateur.id,
      metric_label: mensuel ? indicateur.libelleMensuel ?? indicateur.libelle : indicateur.libelle,
      current_value: valeurs.current,
      target_value: valeurs.target,
      target_change: valeurs.change,
      target_delta: valeurs.delta,
      unit: unite,
      deadline: { duree_mois: echeance.duree_mois, echeance: echeance.echeance },
      audit_agent: agent,
    },
  };
}

function separer(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");
}

function signe(n: number): string {
  return `${n > 0 ? "+" : "−"}${separer(Math.abs(n))}`;
}

// Ce que le dirigeant veut obtenir, en clair. Ex. « de 10 à 15 (+50 %) » ou « +20 % ».
export function decrireVariation(o: ObjectifStructure): string {
  const trajet = o.current_value !== null && o.target_value !== null;
  const morceaux: string[] = [];
  if (trajet) morceaux.push(`de ${separer(o.current_value as number)} à ${separer(o.target_value as number)}`);
  else if (o.target_value !== null) morceaux.push(`${separer(o.target_value)} ${o.unit}`);
  if (o.target_change !== null) morceaux.push(trajet ? `(${signe(o.target_change)} %)` : `${signe(o.target_change)} %`);
  if (o.target_delta !== null) morceaux.push(`${signe(o.target_delta)} ${o.unit}`);
  return morceaux.join(" ");
}

export function decrireDelai(o: ObjectifStructure): string {
  return o.deadline.duree_mois === 1 ? "1 mois" : `${o.deadline.duree_mois} mois`;
}

// Résumé lisible d'un objectif structuré, pour confirmer au dirigeant ce qui
// a été compris. Ex. « Nouveaux clients par mois : de 10 à 15 (+50 %), d'ici 6 mois ».
export function resumerObjectif(o: ObjectifStructure): string {
  return `${o.metric_label} : ${decrireVariation(o)}, d'ici ${decrireDelai(o)}`;
}

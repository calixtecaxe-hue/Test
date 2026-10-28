// Périodes des questions : colonne « Période (selon l'ancienneté) » du classeur. Elle dit, pour une donnée, sur quels mois porte la
// réponse et à partir de quelle ancienneté la question a un sens. Le code la lit pour trois usages :
//   1. masquer une question qui demanderait des mois antérieurs à la création de l'entreprise ;
//   2. écrire sous la question les mois exacts attendus (« Période : juillet à septembre 2025 ») ;
//   3. vérifier qu'une évolution compare deux périodes de même longueur, décalées d'un an (ou de 6 mois).
//
// Les mois comptés sont des mois complets : le mois en cours n'est jamais compris. « Les 3 derniers mois », un 28 octobre, sont
// juillet, août et septembre. Une réponse porte sur les mois qui précèdent le mois où elle a été donnée (son « ancrage »).
//
// Formulations reconnues (fenêtre, puis options entre parenthèses, séparées par « ; ») :
//   « 3 derniers mois », « Mêmes 3 mois, un an plus tôt », « 12 mois précédents », « 3 mois, 6 mois plus tôt », « Il y a 12 mois »,
//   « Aujourd'hui » ; options « depuis la création si plus récente » et « masquée avant N mois d'existence ».
// Les formulations plus anciennes du classeur restent comprises (« Période adaptée : depuis la création si moins de 12 mois »,
// « Si plus de 12 mois d'existence (sinon masquée) »…). Une formulation inconnue est refusée par le contrôle des données.
//
// Ce fichier n'importe rien : il se teste directement avec Node.

export type Fenetre =
  // Plusieurs mois consécutifs : de « mois + decalage » mois avant l'ancrage jusqu'à « 1 + decalage » mois avant.
  | { type: "mois"; mois: number; decalage: number; depuisCreation: boolean }
  // Un instant : aujourd'hui (decalage 0) ou le même mois, « decalage » mois plus tôt.
  | { type: "instant"; decalage: number };

export type ReglePeriode = {
  fenetre: Fenetre | null;
  // Question masquée tant que l'entreprise a moins de mois d'existence.
  minimumMois: number | null;
  // Champs « depuis 3 mois », « depuis 6 mois »… : seules les durées que l'ancienneté permet sont posées.
  dureesBornees: boolean;
  // Précision écrite telle quelle sous la question (compte, fiche ou site plus récents que l'entreprise).
  note: string | null;
  // La question dit elle-même quoi répondre quand l'entreprise ou le compte est plus récent (« sinon, à l'ouverture du compte ») :
  // elle reste posée.
  adaptee: boolean;
  reconnue: boolean;
};

const AUCUNE: ReglePeriode = { fenetre: null, minimumMois: null, dureesBornees: false, note: null, adaptee: false, reconnue: true };

const FENETRES: [RegExp, (m: RegExpExecArray) => Fenetre][] = [
  [/^(\d+) derniers mois$/, (m) => ({ type: "mois", mois: Number(m[1]), decalage: 0, depuisCreation: false })],
  [/^Mêmes (\d+) mois, un an plus tôt$/, (m) => ({ type: "mois", mois: Number(m[1]), decalage: 12, depuisCreation: false })],
  [/^(\d+) mois précédents$/, (m) => ({ type: "mois", mois: Number(m[1]), decalage: Number(m[1]), depuisCreation: false })],
  [/^(\d+) mois, (\d+) mois plus tôt$/, (m) => ({ type: "mois", mois: Number(m[1]), decalage: Number(m[2]), depuisCreation: false })],
  [/^Il y a (\d+) mois$/, (m) => ({ type: "instant", decalage: Number(m[1]) })],
  [/^Aujourd'hui$/, () => ({ type: "instant", decalage: 0 })],
];

// Formulations écrites avant le 28 octobre, gardées telles quelles dans le classeur.
const ANCIENNES: [RegExp, (m: RegExpExecArray) => ReglePeriode][] = [
  [/^Période adaptée : depuis la création si moins de (\d+) mois$/, (m) => ({ ...AUCUNE, fenetre: { type: "mois", mois: Number(m[1]), decalage: 0, depuisCreation: true } })],
  [
    /^Période adaptée : depuis l'ouverture (du compte|de la fiche) si moins de (\d+) mois$/,
    (m) => ({
      ...AUCUNE,
      fenetre: { type: "mois", mois: Number(m[2]), decalage: 0, depuisCreation: true },
      note: `Si ${m[1] === "du compte" ? "votre compte" : "votre fiche"} a moins de ${m[2]} mois : depuis ${m[1] === "du compte" ? "son" : "son"} ouverture.`,
    }),
  ],
  [/^Si plus de (\d+) mois d'existence \(sinon masquée\)$/, (m) => ({ ...AUCUNE, minimumMois: Number(m[1]) })],
  [/^Investissements depuis la création si moins de (\d+) mois$/, (m) => ({ ...AUCUNE, fenetre: { type: "mois", mois: Number(m[1]), decalage: 0, depuisCreation: true } })],
  [/^Seulement les durées plus courtes que l'ancienneté/, () => ({ ...AUCUNE, dureesBornees: true })],
  // Lignes « il y a 6 mois » et « il y a 12 mois » : chaque ligne disparaît tant que son mois précède la création (voir moisDeLigne).
  [/^Colonne 6 mois si plus de 6 mois d'existence ; colonne 12 mois si plus de 12 mois$/, () => ({ ...AUCUNE, minimumMois: 6 })],
  [
    /^Par réseau : seulement si le compte existait il y a 6 mois ; sinon abonnés à l'ouverture du compte$/,
    () => ({ ...AUCUNE, fenetre: { type: "instant", decalage: 6 }, note: "Si le compte a moins de 6 mois : le nombre d'abonnés à son ouverture.", adaptee: true }),
  ],
  // Date de clôture du premier exercice inconnue de CAXE : la question reste posée.
  [/^Si un premier exercice est clos \(sinon masquée\)$/, () => ({ ...AUCUNE, note: "Seulement si une première année comptable est close." })],
];

export function reglePeriode(periode: string | null | undefined): ReglePeriode {
  const p = periode?.trim();
  if (!p || p === "—") return AUCUNE;
  for (const [re, f] of ANCIENNES) {
    const m = re.exec(p);
    if (m) return f(m);
  }
  const ouvre = p.indexOf(" (");
  const tete = ouvre >= 0 ? p.slice(0, ouvre) : p;
  const options = ouvre >= 0 && p.endsWith(")") ? p.slice(ouvre + 2, -1).split(" ; ").map((o) => o.trim()) : [];
  for (const [re, f] of FENETRES) {
    const m = re.exec(tete);
    if (!m) continue;
    const fenetre = f(m);
    let minimumMois: number | null = null;
    let reconnue = ouvre < 0 || p.endsWith(")");
    for (const o of options) {
      const masque = /^masquée avant (\d+) mois d'existence$/.exec(o);
      if (masque) minimumMois = Number(masque[1]);
      else if (o === "depuis la création si plus récente" && fenetre.type === "mois") fenetre.depuisCreation = true;
      else reconnue = false;
    }
    return { fenetre, minimumMois, dureesBornees: false, note: null, adaptee: false, reconnue };
  }
  return { ...AUCUNE, reconnue: false };
}

// --- Mois ----------------------------------------------------------------------------------------------------------------

// Un mois de calendrier, numéroté depuis l'an 0 (année × 12 + mois − 1) : les écarts se calculent par soustraction.
export type Mois = number;

export function moisDe(date: Date): Mois {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

const NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function nomDuMois(m: Mois): string {
  return `${NOMS[((m % 12) + 12) % 12]} ${Math.floor(m / 12)}`;
}

function majuscule(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// « juillet à septembre 2026 », « octobre 2025 à septembre 2026 », « septembre 2026 ».
export function intervalle(debut: Mois, fin: Mois): string {
  if (debut === fin) return nomDuMois(debut);
  const memeAnnee = Math.floor(debut / 12) === Math.floor(fin / 12);
  return `${memeAnnee ? NOMS[debut % 12] : nomDuMois(debut)} à ${nomDuMois(fin)}`;
}

// Mois couverts par une fenêtre, pour une réponse ancrée au mois « ancrage ». Une fenêtre « depuis la création » commence au
// mois de création quand l'entreprise est plus jeune que la fenêtre ; null quand la fenêtre est entièrement antérieure à la création.
export type MoisCouverts = { debut: Mois; fin: Mois; complete: boolean };

export function moisCouverts(f: Extract<Fenetre, { type: "mois" }>, ancrage: Mois, creation: Mois | null): MoisCouverts | null {
  const debut = ancrage - f.mois - f.decalage;
  const fin = ancrage - 1 - f.decalage;
  if (creation === null || creation <= debut) return { debut, fin, complete: true };
  if (creation > fin) return null;
  return f.depuisCreation ? { debut: creation, fin, complete: false } : null;
}

// Ligne d'un tableau mois par mois : « le_mois_dernier » → 1, « il_y_a_5_mois » → 5 ; null pour une autre ligne.
export function moisDeLigne(id: string): number | null {
  if (id === "le_mois_dernier") return 1;
  const m = /^il_y_a_(\d+)_mois$/.exec(id);
  return m ? Number(m[1]) : null;
}

// Le texte affiché sous une question : les mois exacts. null quand la question n'a pas de période à préciser (aujourd'hui).
export function texteDePeriode(regle: ReglePeriode, ancrage: Mois, creation: Mois | null): string | null {
  const f = regle.fenetre;
  if (!f) return null;
  if (f.type === "instant") {
    if (f.decalage === 0 || (creation !== null && ancrage - f.decalage < creation)) return null;
    return `Période : ${nomDuMois(ancrage - f.decalage)}, il y a ${f.decalage} mois.`;
  }
  const c = moisCouverts(f, ancrage, creation);
  if (!c) return null;
  if (!c.complete) {
    const n = c.fin - c.debut + 1;
    return `Période : depuis la création de votre entreprise (${nomDuMois(c.debut)}) jusqu'à ${nomDuMois(c.fin)}, soit ${n} mois.`;
  }
  const quoi = f.decalage === f.mois ? `, les ${f.mois} mois qui précèdent les ${f.mois} derniers` : f.decalage === 12 ? `, les mêmes mois un an plus tôt` : f.decalage > 0 ? `, ${f.decalage} mois plus tôt` : "";
  return `Période : ${intervalle(c.debut, c.fin)}${quoi}.`;
}

// Libellés des lignes d'un tableau mois par mois : le nom du mois, et l'ancien libellé quand les lignes ne se suivent pas
// (« Avril 2026 (il y a 6 mois) »). Les mois antérieurs à la création ne sont pas posés.
export function lignesDuMois(
  items: { id: string; libelle: string }[],
  decalage: number,
  ancrage: Mois,
  creation: Mois | null,
): { libelles: Record<string, string>; masquees: Set<string> } | null {
  const rangs = items.map((i) => moisDeLigne(i.id));
  if (rangs.some((r) => r === null)) return null;
  const suivies = items.length >= 3;
  const libelles: Record<string, string> = {};
  const masquees = new Set<string>();
  items.forEach((it, k) => {
    const m = ancrage - (rangs[k] as number) - decalage;
    if (creation !== null && m < creation) masquees.add(it.id);
    libelles[it.id] = suivies ? majuscule(nomDuMois(m)) : `${majuscule(nomDuMois(m))} (${it.libelle.toLowerCase()})`;
  });
  return { libelles, masquees };
}

// Champs « depuis 3 mois », « depuis 6 mois »… plus longs que l'ancienneté : non posés.
export function champsTropLongs(champs: { id: string }[], ancienneteMois: number): Set<string> {
  const trop = new Set<string>();
  for (const c of champs) {
    const m = /^depuis_(\d+)_mois$/.exec(c.id);
    if (m && Number(m[1]) > ancienneteMois) trop.add(c.id);
  }
  return trop;
}

// Réponse d'un tableau mois par mois donnée un mois antérieur : ses valeurs sont replacées sur les lignes de même mois, pour que
// l'écran montre chaque montant en face de son vrai mois. Les mois sortis du tableau tombent ; les nouveaux restent vides.
export function decalerLignesDuMois(valeurs: Record<string, unknown>, ecart: number, idsValides: ReadonlySet<string>): Record<string, unknown> {
  if (ecart === 0) return valeurs;
  const sortie: Record<string, unknown> = {};
  for (const [cle, v] of Object.entries(valeurs)) {
    const point = cle.indexOf(".");
    const ligne = point >= 0 ? cle.slice(0, point) : cle;
    const rang = moisDeLigne(ligne);
    if (rang === null) {
      sortie[cle] = v;
      continue;
    }
    const nouveau = rang + ecart;
    const id = nouveau === 1 ? "le_mois_dernier" : `il_y_a_${nouveau}_mois`;
    if (idsValides.has(id)) sortie[point >= 0 ? `${id}${cle.slice(point)}` : id] = v;
  }
  return sortie;
}

// Ancienneté minimale qu'une fenêtre exige pour ne demander aucun mois antérieur à la création (contrôle des données).
export function ancienneteExigee(f: Fenetre): number {
  if (f.type === "instant") return f.decalage;
  return f.depuisCreation ? 1 + f.decalage : f.mois + f.decalage;
}

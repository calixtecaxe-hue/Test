// Écran « Résultats » d'un agent (décision du propriétaire du 29 octobre) : les faits disponibles, sans score, sans couleur, sans
// classement et sans conseil. L'interprétation et la stratégie sont dans le rapport ; les actions, dans le plan d'action.
//
// Ce qui est présenté :
//   - l'objectif : sa phrase, son délai, la mesure qui le suit quand elle existe, la situation de départ, la cible et l'écart,
//     seulement quand ils se calculent sans hypothèse ; sinon, pourquoi ils ne se calculent pas ;
//   - les facteurs mesurés : les chiffres du dirigeant liés aux thèmes de son objectif, puis les autres chiffres de l'agent ;
//   - les évolutions sur des périodes comparables (moteur, evolution.ts) ;
//   - la comparaison au marché, seulement avec une référence vérifiée enregistrée pour le même indicateur ;
//   - ce qui manque pour aller plus loin.
// Aucune valeur manquante ne vaut zéro ; une fourchette compte pour son milieu et reste marquée « estimée ».
//
// Ce fichier n'importe que des types et des fonctions pures : il se teste directement avec Node.

import type { CodeAgent, Mesure } from "../donnees/schemas.ts";
import type { MesureCalculee, ResultatEvolution } from "../moteur/evolution.ts";
import type { VueCompteRendu } from "../audit/compte-rendu.ts";
import type { ObjectifTransmis } from "../audit/objectifs-proposes.ts";
import { sensDeLObjectif, type Sens } from "../audit/objectif.ts";

export type UniteMesure = Mesure["unite"];

// Une mesure lue sur le compte : son calcul, si ses questions sont posées au compte, et les questions qu'elle utilise.
export type MesureDuCompte = {
  mesure: Mesure;
  calcul: MesureCalculee;
  // Toutes ses questions sont posées à ce compte (profil, taille, niveau, agents) : sinon elle n'est pas montrée.
  posee: boolean;
  // Textes des questions utilisées, dans les mots du métier.
  questions: string[];
  // Libellés des lignes d'un tableau (lignes renseignées).
  libellesLignes: Record<string, string>;
};

export type FaitMesure = {
  id: string;
  code: string;
  libelle: string;
  explication: string;
  unite: UniteMesure;
  valeur: number;
  estimee: boolean;
  periode: string;
  // Lignes renseignées qui forment une somme (tableau à catégories fixes) ; null sinon.
  lignes: string[] | null;
  questions: string[];
};

export type MesureManquante = { id: string; libelle: string; raison: string; questions: string[] };

export type CibleObjectif = {
  depart: number;
  cible: number;
  // Cible − départ : ce qui reste à gagner (ou à réduire), dans l'unité de la mesure. Aucun point d'étape n'est encore déclaré.
  ecart: number;
  unite: UniteMesure;
  estimee: boolean;
  // Le calcul en mots : « 240 000 € + 10 % ».
  calcul: string;
};

export type ResultatObjectif = {
  id: string;
  phrase: string;
  origine: ObjectifTransmis["origine"];
  echeance: string;
  delaiMois: number;
  moisRestants: number;
  reussite: string | null;
  changement: { valeur: number; unite: "pourcent" | "euros" | "unites"; sens: Sens } | null;
  // Mesure qui suit l'objectif, et comment elle a été trouvée.
  mesure: FaitMesure | null;
  mesureManquante: MesureManquante | null;
  rattachement: "proposition" | "mots" | null;
  cible: CibleObjectif | null;
  // Pourquoi la situation de départ, la cible ou l'écart ne sont pas donnés.
  limites: string[];
  themes: string[];
};

export type ComparaisonMarche = {
  theme: string;
  repere: { libelle: string; organisme: string; annee: string; url: string; confiance: "solide" | "indicatif"; perimee: boolean };
  // Votre valeur pour le même indicateur, quand une mesure le calcule.
  valeur: FaitMesure | null;
};

export type VueResultats = {
  objectifs: ResultatObjectif[];
  facteursObjectif: FaitMesure[];
  autresFacteurs: FaitMesure[];
  manquantes: MesureManquante[];
  evolutions: ResultatEvolution[];
  marche: ComparaisonMarche[];
  // Thèmes auxquels il manque des réponses (moins de la moitié).
  aCompleter: { nom: string; repondues: number; posees: number }[];
  // Thèmes qui ont au moins la moitié de leurs réponses (règle des 50 %) : un fait sur la couverture, sans note.
  analyses: { nom: string; repondues: number; posees: number }[];
};

export type EntreeResultats = {
  agent: CodeAgent;
  // AAAA-MM-JJ.
  aujourdhui: string;
  objectifs: (ObjectifTransmis & { id: string })[];
  mesures: MesureDuCompte[];
  evolutions: ResultatEvolution[];
  compteRendu: Pick<VueCompteRendu, "notes" | "avecRepere" | "aCompleter"> & Partial<Pick<VueCompteRendu, "sansRepere">>;
};

// --- Rattachement d'un objectif à une mesure ------------------------------------------------------------------------------

function mots(texte: string): string[] {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Un mot écrit correspond à un mot de la liste quand ils partagent leurs 6 premières lettres (« demande » et « demandes ») ;
// un mot de 3 lettres ou moins doit être identique (« ca »).
function correspond(ecrit: string, attendu: string): boolean {
  if (attendu.length <= 3 || ecrit.length <= 3) return ecrit === attendu;
  return ecrit.slice(0, 6) === attendu.slice(0, 6);
}

// Objectif proposé : la mesure déclarée pour cette proposition. Objectif écrit librement : la mesure dont un groupe de mots
// figure en entier dans le texte ; le groupe le plus long l'emporte ; à égalité entre deux mesures, aucune n'est retenue.
export function rattacherMesure(o: Pick<ObjectifTransmis, "proposition" | "quoi" | "origine">, mesures: Mesure[]): { mesure: Mesure; par: "proposition" | "mots"; unites: string[] | null; sens: Sens | null } | null {
  if (o.proposition && o.origine === "proposition") {
    for (const m of mesures) {
      const lien = m.objectifs?.find((x) => x.id === o.proposition!.id);
      if (lien) return { mesure: m, par: "proposition", unites: lien.unites, sens: lien.sens };
    }
    return null;
  }
  const ecrits = mots(o.quoi);
  let meilleur: { m: Mesure; n: number } | null = null;
  let egalite = false;
  for (const m of mesures) {
    const n = Math.max(0, ...(m.mots ?? []).filter((g) => g.every((w) => ecrits.some((e) => correspond(e, w)))).map((g) => g.length));
    if (n === 0) continue;
    if (!meilleur || n > meilleur.n) {
      meilleur = { m, n };
      egalite = false;
    } else if (n === meilleur.n && meilleur.m.id !== m.id) egalite = true;
  }
  return meilleur && !egalite ? { mesure: meilleur.m, par: "mots", unites: null, sens: null } : null;
}

// --- Formats -------------------------------------------------------------------------------------------------------------

const NOMBRE = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const ENTIER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function arrondir(n: number, unite: UniteMesure): number {
  return unite === "euros" && Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
}

export function formaterValeur(n: number, unite: UniteMesure): string {
  const v = arrondir(n, unite);
  const t = unite === "euros" && Math.abs(v) >= 100 ? ENTIER.format(v) : NOMBRE.format(v);
  switch (unite) {
    case "euros":
      return `${t} €`;
    case "pourcent":
      return `${t} %`;
    case "heures":
      return `${t} h`;
    case "jours":
      return `${t} jour${Math.abs(v) >= 2 ? "s" : ""}`;
    default:
      return t;
  }
}

function moisEntre(debut: string, fin: string): number {
  const [a, b] = [debut, fin].map((d) => d.split("-").map(Number));
  return Math.max(0, (b[0] - a[0]) * 12 + (b[1] - a[1]) - (b[2] < a[2] ? 1 : 0));
}

function fait(m: MesureDuCompte): FaitMesure | null {
  if (m.calcul.statut !== "mesuree") return null;
  return {
    id: m.mesure.id,
    code: m.mesure.code,
    libelle: m.mesure.libelle,
    explication: m.mesure.explication,
    unite: m.mesure.unite,
    valeur: m.calcul.valeur,
    estimee: m.calcul.estimee,
    periode: m.calcul.periode,
    lignes: m.calcul.lignes ? m.calcul.lignes.map((l) => m.libellesLignes[l] ?? l) : null,
    questions: m.questions,
  };
}

function manquante(m: MesureDuCompte): MesureManquante | null {
  if (m.calcul.statut !== "manquante") return null;
  return { id: m.mesure.id, libelle: m.mesure.libelle, raison: m.calcul.raison, questions: m.questions };
}

// --- Cible et écart ------------------------------------------------------------------------------------------------------

function cibleDe(o: ObjectifTransmis, r: NonNullable<ReturnType<typeof rattacherMesure>>, f: FaitMesure): { cible: CibleObjectif | null; limite: string | null } {
  if (!o.ampleur) return { cible: null, limite: "Votre objectif n'a pas de chiffre : son avancement se mesurera à ce que vous déclarerez aux points d'étape." };
  const u = o.ampleur.unite;
  let relatif: boolean;
  let sens: Sens;
  if (r.par === "proposition") {
    if (!r.unites?.includes(u)) return { cible: null, limite: "Le chiffre de votre objectif ne s'applique pas directement à cette mesure : la cible n'est pas calculée." };
    relatif = u === "pourcent";
    sens = r.sens ?? "inconnu";
  } else {
    if (u !== "pourcent") return { cible: null, limite: "Votre objectif ne précise pas sur quelle période porte ce montant : la cible n'est pas calculée." };
    if (f.unite === "pourcent") return { cible: null, limite: `« ${NOMBRE.format(o.ampleur.valeur)} % » peut se lire comme ${NOMBRE.format(o.ampleur.valeur)} points de plus ou comme une hausse de ${NOMBRE.format(o.ampleur.valeur)} % de ce taux : la cible n'est pas calculée.` };
    relatif = true;
    sens = sensDeLObjectif(o.quoi);
  }
  if (sens === "inconnu") return { cible: null, limite: "Le sens du changement (hausse ou baisse) ne se lit pas dans votre objectif : la cible n'est pas calculée." };
  const signe = sens === "hausse" ? 1 : -1;
  const ecart = relatif ? signe * f.valeur * (o.ampleur.valeur / 100) : signe * o.ampleur.valeur;
  const cible = f.valeur + ecart;
  if (cible < 0) return { cible: null, limite: "La baisse visée dépasse la valeur de départ : la cible n'est pas calculée." };
  const calcul = `${formaterValeur(f.valeur, f.unite)} ${signe > 0 ? "+" : "−"} ${relatif ? `${NOMBRE.format(o.ampleur.valeur)} %` : formaterValeur(o.ampleur.valeur, f.unite)}`;
  return { cible: { depart: f.valeur, cible: arrondir(cible, f.unite), ecart: arrondir(ecart, f.unite), unite: f.unite, estimee: f.estimee, calcul }, limite: null };
}

// --- Composition ---------------------------------------------------------------------------------------------------------

export function composerResultats(e: EntreeResultats): VueResultats {
  const duCompte = e.mesures.filter((m) => m.mesure.agents.includes(e.agent) && m.posee);
  const mesuresAgent = duCompte.map((m) => m.mesure);
  const parId = new Map(duCompte.map((m) => [m.mesure.id, m]));
  const utilisees = new Set<string>();
  const themesObjectifs = new Set<string>();

  const objectifs = e.objectifs.map((o): ResultatObjectif => {
    const r = rattacherMesure(o, mesuresAgent);
    const m = r ? parId.get(r.mesure.id)! : null;
    const f = m ? fait(m) : null;
    const limites: string[] = [];
    let cible: CibleObjectif | null = null;
    if (r && f) {
      const c = cibleDe(o, r, f);
      cible = c.cible;
      if (c.limite) limites.push(c.limite);
      utilisees.add(r.mesure.id);
    } else if (r && m) {
      limites.push(`La situation de départ n'est pas encore connue. ${m.calcul.statut === "manquante" ? m.calcul.raison : ""}`.trim());
      utilisees.add(r.mesure.id);
    } else if (o.ampleur) {
      limites.push("Aucune question de votre questionnaire ne mesure exactement cet objectif : sa situation de départ et sa cible ne se calculent pas. Son avancement se mesurera à ce que vous déclarerez aux points d'étape.");
    } else {
      limites.push("Votre objectif n'a pas de chiffre : son avancement se mesurera à ce que vous déclarerez aux points d'étape.");
    }
    const themes = [...new Set([...o.themes, ...(r?.mesure.themes ?? [])])];
    themes.forEach((t) => themesObjectifs.add(t));
    return {
      id: o.id,
      phrase: o.phrase,
      origine: o.origine,
      echeance: o.echeance,
      delaiMois: o.delaiMois,
      moisRestants: moisEntre(e.aujourdhui, o.echeance),
      reussite: o.reussite,
      changement: o.ampleur ? { valeur: o.ampleur.valeur, unite: o.ampleur.unite, sens: r?.sens ?? sensDeLObjectif(o.quoi) } : null,
      mesure: f,
      mesureManquante: !f && m ? manquante(m) : null,
      rattachement: r?.par ?? null,
      cible,
      limites,
      themes,
    };
  });

  const facteursObjectif: FaitMesure[] = [];
  const autresFacteurs: FaitMesure[] = [];
  const manquantes: MesureManquante[] = [];
  for (const m of duCompte) {
    if (utilisees.has(m.mesure.id)) continue;
    const f = fait(m);
    if (!f) {
      const x = manquante(m);
      if (x) manquantes.push(x);
      continue;
    }
    if (m.mesure.themes.some((t) => themesObjectifs.has(t))) facteursObjectif.push(f);
    else autresFacteurs.push(f);
  }

  // Comparaison au marché : seulement les repères enregistrés (recherche vérifiée par le code), à côté de votre valeur quand une
  // mesure calcule le même indicateur.
  const faits = [...facteursObjectif, ...autresFacteurs, ...objectifs.map((o) => o.mesure).filter((x): x is FaitMesure => x !== null)];
  const marche: ComparaisonMarche[] = [...e.compteRendu.notes, ...e.compteRendu.avecRepere].flatMap((t) =>
    t.reperes.map((rp) => ({
      theme: t.nom,
      repere: { libelle: rp.libelle, organisme: rp.organisme, annee: rp.annee, url: rp.url, confiance: rp.confiance, perimee: rp.perimee },
      valeur: faits.find((f) => f.code === rp.indicateur) ?? null,
    }))
  );

  return {
    objectifs,
    facteursObjectif,
    autresFacteurs,
    manquantes,
    evolutions: e.evolutions,
    marche,
    aCompleter: e.compteRendu.aCompleter.filter((t) => t.couverture).map((t) => ({ nom: t.nom, repondues: t.couverture!.repondues, posees: t.couverture!.posees })),
    analyses: [...e.compteRendu.notes, ...e.compteRendu.avecRepere, ...(e.compteRendu.sansRepere ?? [])]
      .filter((t) => t.couverture)
      .map((t) => ({ nom: t.nom, repondues: t.couverture!.repondues, posees: t.couverture!.posees })),
  };
}

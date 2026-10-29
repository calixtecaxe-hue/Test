// Évolutions : la même mesure du dirigeant sur deux périodes de même longueur, décalées d'un an (ou de 6 mois). Le moteur calcule
// l'écart et l'écart en % (en points pour un taux). Il ne dit jamais si c'est bien ou mal : une hausse des charges peut suivre une
// croissance voulue, une baisse des demandes une saison. Aucun seuil n'est écrit pour en juger ; aucun chiffre n'est inventé.
//
// Une évolution n'est « établie » que si :
//   - chaque chiffre a une réponse chiffrée (exacte ou fourchette, marquée « estimée ») : une question sautée, « je ne sais pas »
//     ou « je ne suis pas cette donnée » ne valent jamais zéro ;
//   - les deux réponses portent sur des mois alignés : données le même mois (une réponse porte sur les mois qui précèdent celui où
//     elle a été donnée) ;
//   - aucun mois demandé ne précède la création de l'entreprise ;
//   - le périmètre de l'activité n'a pas changé entre les deux périodes (sinon « non comparable », les deux chiffres restent affichés).
// Sinon, elle dit précisément ce qui manque.
//
// Ce fichier n'importe que des types et des fonctions pures : il se teste directement avec Node.

import type { CodeAgent, Donnee, Evolution, SourceEvolution } from "../donnees/schemas.ts";
import type { Reponse, Reponses } from "../audit/reponse.ts";
import { intervalle, moisDeLigne, nomDuMois, reglePeriode, type Fenetre, type Mois } from "../audit/periodes.ts";
import type { LecturePartagee } from "../audit/partages.ts";

export type ContexteEvolution = {
  // Réponses actives du compte, tous agents confondus (une réponse devenue inapplicable n'y est plus).
  reponses: Reponses;
  // Mois où chaque réponse a été donnée ou modifiée en dernier.
  ancrages: ReadonlyMap<string, Mois>;
  aujourdhui: Mois;
  creation: Mois | null;
  ancienneteMois: number;
  donnees: ReadonlyMap<string, Donnee>;
  // Réponses partagées entre agents (src/lib/audit/partages.ts) : la réponse d'une donnée peut être enregistrée sous une jumelle,
  // ou composée des parties données à un autre agent ; `liees` donne les questions qui la portent.
  partage: Pick<LecturePartagee, "reponse" | "sources">;
  liees: (code: string) => string[];
  // Données posées à ce compte, par l'un de ses agents, à son niveau.
  posees: ReadonlySet<string>;
  // Lignes actuelles d'un tableau dont les lignes viennent d'une autre réponse (canaux cochés) ; null pour des lignes fixes.
  lignesActuelles: (code: string) => string[] | null;
  // Texte de la question, pour dire ce qui manque.
  nomDe: (code: string) => string;
  // Effectif actuel (dossier d'entreprise), pour la masse salariale.
  effectifActuel: number | null;
};

export type CoteEvolution = { valeur: number; periode: string; estimee: boolean };

export type ResultatEvolution = {
  id: string;
  code: string;
  libelle: string;
  unite: Evolution["unite"];
  mesure: Evolution["mesure"];
  statut: "etablie" | "non_etablie" | "non_comparable";
  // Ce qui ne peut pas être établi, et pourquoi (statut non établie ou non comparable).
  raison: string | null;
  actuel: CoteEvolution | null;
  passe: CoteEvolution | null;
  // Actuel − passé, dans l'unité (en points pour un taux).
  ecart: number | null;
  // Écart en % du passé ; null pour un taux (points) ou quand le passé vaut zéro.
  ecartRelatif: number | null;
  notes: string[];
};

// `lignes` : pour une colonne dont les lignes vides sont ignorées, les lignes renseignées qui forment la somme.
type Lu = { valeur: number; estimee: boolean; ancrages: Mois[]; fenetres: Fenetre[]; lignes?: string[] } | { manque: string };

const PERIMETRE = ["ACQ-23.13", "FIN-14.04"];
const EFFECTIF_PASSE = "FIN-07.17";

export function calculerEvolutions(liste: Evolution[], agent: CodeAgent, ctx: ContexteEvolution): ResultatEvolution[] {
  return liste.filter((e) => e.agents.includes(agent)).map((e) => calculerEvolution(e, ctx));
}

// Réponse d'une donnée (la sienne, celle d'une jumelle, ou celle que composent des parties données ailleurs), avec son mois :
// pour une réponse composée de plusieurs questions, le plus ancien de leurs mois.
function reponseDe(code: string, ctx: ContexteEvolution): { r: Reponse; ancre: Mois; code: string } | null {
  const r = ctx.reponses[code] ?? ctx.partage.reponse(code);
  if (r === undefined) return null;
  const portees = ctx.reponses[code] !== undefined ? [code] : ctx.partage.sources(code);
  const ancre = Math.min(...portees.map((c) => ctx.ancrages.get(c) ?? ctx.aujourdhui));
  return { r, ancre, code: portees[0] ?? code };
}

function posee(code: string, ctx: ContexteEvolution): boolean {
  return ctx.posees.has(code) || ctx.liees(code).some((c) => ctx.posees.has(c));
}

// Pourquoi une question n'est pas posée : l'âge de l'entreprise, ou une autre raison.
function nonPosee(code: string, ctx: ContexteEvolution): string {
  const minimum = reglePeriode(ctx.donnees.get(code)?.periode).minimumMois;
  if (minimum !== null && ctx.ancienneteMois < minimum)
    return `Votre entreprise a ${ctx.ancienneteMois} mois : la question « ${ctx.nomDe(code)} » porte sur des mois antérieurs à sa création. Il faut au moins ${minimum} mois d'existence.`;
  return `La question « ${ctx.nomDe(code)} » ne vous est pas posée : elle dépend de vos autres réponses, de votre niveau de questionnaire ou d'un agent que votre formule ne comprend pas.`;
}

function fenetreDe(code: string, ctx: ContexteEvolution): Fenetre[] {
  const f = reglePeriode(ctx.donnees.get(code)?.periode).fenetre;
  return f ? [f] : [];
}

function nombreDe(r: Reponse, champ?: string): { valeur: number; estimee: boolean } | "inconnu" | "non_suivi" | null {
  if (r.genre === "inconnu" || r.genre === "non_suivi") return r.genre;
  if (!champ) {
    if (r.genre === "exact") return { valeur: r.valeur, estimee: false };
    if (r.genre === "estimation") return { valeur: (r.min + r.max) / 2, estimee: true };
    return null;
  }
  if (r.genre !== "valeurs") return null;
  const v = r.valeurs[champ];
  return typeof v === "number" ? { valeur: v, estimee: false } : null;
}

function lire(s: SourceEvolution, ctx: ContexteEvolution): Lu | null {
  switch (s.type) {
    case "nombre":
    case "colonne": {
      if (!posee(s.donnee, ctx)) return s.facultatif ? null : { manque: nonPosee(s.donnee, ctx) };
      const rep = reponseDe(s.donnee, ctx);
      if (!rep) return { manque: `Il manque votre réponse à « ${ctx.nomDe(s.donnee)} ».` };
      if (s.type === "nombre") {
        const n = nombreDe(rep.r, s.champ);
        if (n === "inconnu") return { manque: `Vous avez répondu « je ne sais pas » à « ${ctx.nomDe(s.donnee)} ».` };
        if (n === "non_suivi") return { manque: `Vous avez répondu « je ne suis pas cette donnée » à « ${ctx.nomDe(s.donnee)} ».` };
        if (!n) return { manque: `Il manque un chiffre dans votre réponse à « ${ctx.nomDe(s.donnee)} ».` };
        return { ...n, ancrages: [rep.ancre], fenetres: fenetreDe(s.donnee, ctx) };
      }
      if (rep.r.genre !== "valeurs") return { manque: `Il manque votre réponse à « ${ctx.nomDe(s.donnee)} ».` };
      const valeurs = rep.r.valeurs;
      if (s.lignesVides === "ignorees") {
        // Tableau à catégories fixes : une ligne vide ne concerne pas le dirigeant. La somme porte sur les lignes renseignées.
        const remplies = [...new Set(Object.keys(valeurs).filter((k) => k.endsWith(`.${s.colonne}`) && typeof valeurs[k] === "number").map((k) => k.slice(0, k.lastIndexOf("."))))];
        if (remplies.length === 0) return { manque: `Il manque un chiffre dans votre réponse à « ${ctx.nomDe(s.donnee)} ».` };
        return { valeur: remplies.reduce((t, l) => t + (valeurs[`${l}.${s.colonne}`] as number), 0), estimee: false, ancrages: [rep.ancre], fenetres: fenetreDe(s.donnee, ctx), lignes: remplies };
      }
      const lignes = ctx.lignesActuelles(rep.code) ?? [...new Set(Object.keys(valeurs).filter((k) => k.endsWith(`.${s.colonne}`)).map((k) => k.slice(0, k.lastIndexOf("."))))];
      const vides = lignes.filter((l) => typeof valeurs[`${l}.${s.colonne}`] !== "number");
      if (lignes.length === 0 || vides.length > 0) return { manque: `Il manque ${vides.length > 1 ? `${vides.length} montants` : "un montant"} dans votre réponse à « ${ctx.nomDe(s.donnee)} » : une case vide ne compte pas pour zéro.` };
      return { valeur: lignes.reduce((t, l) => t + (valeurs[`${l}.${s.colonne}`] as number), 0), estimee: false, ancrages: [rep.ancre], fenetres: fenetreDe(s.donnee, ctx) };
    }
    case "mois": {
      if (!posee(s.donnee, ctx)) return { manque: nonPosee(s.donnee, ctx) };
      const rep = reponseDe(s.donnee, ctx);
      if (!rep || rep.r.genre !== "valeurs") return { manque: `Il manque votre réponse à « ${ctx.nomDe(s.donnee)} ».` };
      const f = reglePeriode(ctx.donnees.get(s.donnee)?.periode).fenetre;
      const decalage = f?.type === "mois" ? f.decalage : 0;
      const moisDe = (rang: number) => rep.ancre - rang - decalage;
      const avantCreation = s.lignes.filter((k) => ctx.creation !== null && moisDe(k) < ctx.creation);
      if (avantCreation.length > 0)
        return { manque: `Votre entreprise a été créée en ${nomDuMois(ctx.creation!)} : ${avantCreation.length > 1 ? `${avantCreation.length} des mois comparés précèdent` : "le mois comparé précède"} sa création.` };
      const valeurs = rep.r.valeurs;
      const id = (k: number) => (k === 1 ? "le_mois_dernier" : `il_y_a_${k}_mois`);
      const manquants = s.lignes.filter((k) => typeof valeurs[`${id(k)}.${s.colonne}`] !== "number");
      if (manquants.length > 0)
        return { manque: `Il manque ${manquants.length > 1 ? `${manquants.length} mois` : "un mois"} dans votre réponse à « ${ctx.nomDe(s.donnee)} » (${manquants.map((k) => nomDuMois(moisDe(k))).join(", ")}) : un mois vide ne compte pas pour zéro.` };
      const debut = Math.max(...s.lignes);
      const fin = Math.min(...s.lignes);
      return {
        valeur: s.lignes.reduce((t, k) => t + (valeurs[`${id(k)}.${s.colonne}`] as number), 0),
        estimee: false,
        ancrages: [rep.ancre],
        fenetres: [{ type: "mois", mois: debut - fin + 1, decalage: fin - 1 + decalage, depuisCreation: false }],
      };
    }
    case "somme": {
      const termes = s.termes.map((t) => lire(t, ctx));
      const manque = termes.find((t): t is { manque: string } => t !== null && "manque" in t);
      if (manque) return manque;
      const lus = termes.filter((t): t is Exclude<Lu, { manque: string }> => t !== null);
      if (lus.length === 0) return { manque: "Aucun des montants de ce total ne vous est demandé." };
      return { valeur: lus.reduce((t, l) => t + l.valeur, 0), estimee: lus.some((l) => l.estimee), ancrages: lus.flatMap((l) => l.ancrages), fenetres: lus.flatMap((l) => l.fenetres) };
    }
    case "rapport":
    case "taux": {
      const a = lire(s.numerateur, ctx);
      const b = lire(s.denominateur, ctx);
      if (!a || "manque" in a) return a;
      if (!b || "manque" in b) return b;
      if (b.valeur === 0)
        return { manque: `Votre réponse à « ${ctx.nomDe(premiereDonnee(s.denominateur))} » vaut zéro sur la période : ${s.type === "rapport" ? "le montant moyen" : "le taux"} ne se calcule pas.` };
      const valeur = s.type === "taux" ? (a.valeur / b.valeur) * 100 : a.valeur / b.valeur;
      return { valeur, estimee: a.estimee || b.estimee, ancrages: [...a.ancrages, ...b.ancrages], fenetres: [...a.fenetres, ...b.fenetres] };
    }
    case "marge": {
      const ca = lire(s.ca, ctx);
      const charges = lire(s.chargesParMois, ctx);
      if (!ca || "manque" in ca) return ca;
      if (!charges || "manque" in charges) return charges;
      if (ca.valeur === 0) return { manque: "Le chiffre d'affaires est nul sur la période : le taux de marge ne se calcule pas." };
      return {
        valeur: ((ca.valeur - charges.valeur * s.mois) / ca.valeur) * 100,
        estimee: ca.estimee || charges.estimee,
        ancrages: [...ca.ancrages, ...charges.ancrages],
        fenetres: [...ca.fenetres, ...charges.fenetres],
      };
    }
  }
}

// Première donnée lue par une source, pour la nommer dans un message.
function premiereDonnee(s: SourceEvolution): string {
  switch (s.type) {
    case "nombre":
    case "colonne":
    case "mois":
      return s.donnee;
    case "somme":
      return premiereDonnee(s.termes[0]);
    case "rapport":
    case "taux":
      return premiereDonnee(s.numerateur);
    case "marge":
      return premiereDonnee(s.ca);
  }
}

// Toutes les données lues par une source (contrôle des données, « données utilisées » à l'écran).
export function donneesDeLaSource(s: SourceEvolution): string[] {
  switch (s.type) {
    case "nombre":
    case "colonne":
    case "mois":
      return [s.donnee];
    case "somme":
      return [...new Set(s.termes.flatMap(donneesDeLaSource))];
    case "rapport":
    case "taux":
      return [...new Set([...donneesDeLaSource(s.numerateur), ...donneesDeLaSource(s.denominateur)])];
    case "marge":
      return [...new Set([...donneesDeLaSource(s.ca), ...donneesDeLaSource(s.chargesParMois)])];
  }
}

// Mois couverts par un côté, pour les écrire : « juillet à septembre 2026 », « octobre 2025 ».
function periodeDuCote(fenetres: Fenetre[], ancre: Mois, forcee: string | undefined): string {
  const f = forcee ? reglePeriode(forcee).fenetre : fenetres[0];
  if (!f) return nomDuMois(ancre);
  if (f.type === "instant") return f.decalage === 0 ? `aujourd'hui (${nomDuMois(ancre)})` : nomDuMois(ancre - f.decalage);
  return intervalle(ancre - f.mois - f.decalage, ancre - 1 - f.decalage);
}

function perimetreChange(debut: Mois, fin: Mois, ctx: ContexteEvolution): { change: string | null; inconnu: boolean } {
  const code = PERIMETRE.find((c) => posee(c, ctx));
  if (!code) return { change: null, inconnu: false };
  const rep = reponseDe(code, ctx);
  if (!rep || rep.r.genre !== "valeurs") return { change: null, inconnu: true };
  const nature = rep.r.valeurs["changement"];
  if (nature === "aucun_changement" || nature === undefined || nature === null) return { change: null, inconnu: nature === undefined || nature === null };
  const mois = rep.r.valeurs["mois_du_changement_le_plus_recent"];
  const m = typeof mois === "string" ? /^(\d{4})-(\d{2})$/.exec(mois) : null;
  if (!m) return { change: "Le périmètre de votre activité a changé et le mois du changement n'est pas indiqué : la comparaison pourrait porter sur deux activités différentes.", inconnu: false };
  const quand = Number(m[1]) * 12 + Number(m[2]) - 1;
  if (quand <= debut || quand > fin) return { change: null, inconnu: false };
  return { change: `Le périmètre de votre activité a changé en ${nomDuMois(quand)} : les deux périodes ne portent pas sur la même activité.`, inconnu: false };
}

// --- Mesure d'un seul côté : la valeur actuelle d'une mesure du dirigeant (écran « Résultats ») --------------------------------

export type MesureCalculee =
  | { statut: "mesuree"; valeur: number; estimee: boolean; periode: string; lignes: string[] | null }
  | { statut: "manquante"; raison: string };

// Même lecture que pour une évolution : aucune case vide ni « je ne sais pas » ne vaut zéro, une fourchette compte pour son
// milieu (« estimée »), et deux réponses données à des mois différents ne se combinent pas (elles ne portent pas sur les mêmes
// mois). `periode` : formulation de periodes.ts qui remplace celle du classeur quand une somme mêle plusieurs périodes.
export function mesurer(s: SourceEvolution, ctx: ContexteEvolution, periode?: string): MesureCalculee {
  const l = lire(s, ctx);
  if (!l) return { statut: "manquante", raison: "Aucun des chiffres de cette mesure ne vous est demandé." };
  if ("manque" in l) return { statut: "manquante", raison: l.manque };
  const ancres = [...new Set(l.ancrages)].sort((a, b) => a - b);
  if (ancres.length > 1)
    return { statut: "manquante", raison: `Les réponses utilisées ont été données à des mois différents (${ancres.map(nomDuMois).join(", ")}) : elles ne portent pas sur les mêmes mois. Mettez à jour la plus ancienne.` };
  return { statut: "mesuree", valeur: l.valeur, estimee: l.estimee, periode: periodeDuCote(l.fenetres, ancres[0] ?? ctx.aujourdhui, periode), lignes: l.lignes ?? null };
}

export function calculerEvolution(e: Evolution, ctx: ContexteEvolution): ResultatEvolution {
  const vide: ResultatEvolution = { id: e.id, code: e.code, libelle: e.libelle, unite: e.unite, mesure: e.mesure, statut: "non_etablie", raison: null, actuel: null, passe: null, ecart: null, ecartRelatif: null, notes: [] };
  const actuel = lire(e.actuel, ctx);
  const passe = lire(e.passe, ctx);
  const manque = [actuel, passe].find((l): l is { manque: string } => l !== null && "manque" in l);
  if (manque) return { ...vide, raison: manque.manque };
  if (!actuel || !passe || "manque" in actuel || "manque" in passe) return { ...vide, raison: "Aucun chiffre ne vous est demandé pour cette comparaison." };

  // Les deux côtés doivent porter sur des mois alignés : réponses données le même mois.
  const ancres = [...new Set([...actuel.ancrages, ...passe.ancrages])].sort((a, b) => a - b);
  if (ancres.length > 1)
    return {
      ...vide,
      raison: `Vos réponses ont été données à des mois différents (${ancres.map(nomDuMois).join(", ")}) : elles ne portent pas sur des mois alignés. Mettez à jour la plus ancienne pour qu'elles couvrent les mêmes mois.`,
    };
  const ancre = ancres[0];
  const cote = (l: Exclude<Lu, { manque: string }>, forcee: string | undefined): CoteEvolution => ({ valeur: l.valeur, estimee: l.estimee, periode: periodeDuCote(l.fenetres, ancre, forcee) });
  const r: ResultatEvolution = { ...vide, actuel: cote(actuel, e.periodes?.actuel), passe: cote(passe, e.periodes?.passe) };

  // Effectif à côté de la masse salariale : une équipe plus grande change le sens d'une hausse.
  if (e.effectif && posee(EFFECTIF_PASSE, ctx)) {
    const rep = reponseDe(EFFECTIF_PASSE, ctx);
    const n = rep ? nombreDe(rep.r) : null;
    if (n && typeof n === "object" && ctx.effectifActuel !== null)
      r.notes.push(`Effectif : ${n.valeur} personne${n.valeur > 1 ? "s" : ""} il y a 12 mois, ${ctx.effectifActuel} aujourd'hui (vous compris).`);
    else r.notes.push("L'effectif d'il y a 12 mois n'est pas renseigné : une masse salariale en hausse peut venir d'une équipe plus grande.");
  }

  if (e.perimetre) {
    const f = passe.fenetres[0];
    const debutPasse = !f ? ancre - e.ecart : f.type === "instant" ? ancre - f.decalage : ancre - f.mois - f.decalage;
    const p = perimetreChange(debutPasse, ancre - 1, ctx);
    if (p.change) return { ...r, statut: "non_comparable", raison: p.change };
    if (p.inconnu) r.notes.push("Le périmètre de votre activité n'est pas précisé : si vous avez ouvert ou fermé un établissement, racheté ou arrêté une activité, la comparaison porte sur deux activités différentes.");
  }

  const ecart = actuel.valeur - passe.valeur;
  r.statut = "etablie";
  r.ecart = Math.round(ecart * 100) / 100;
  if (e.mesure === "relative") {
    if (passe.valeur === 0) r.notes.push("Le pourcentage ne se calcule pas : la valeur de départ est nulle.");
    else r.ecartRelatif = Math.round((ecart / Math.abs(passe.valeur)) * 1000) / 10;
  }
  if (actuel.estimee || passe.estimee) r.notes.push("Calculé sur une estimation (milieu de la fourchette donnée).");
  return r;
}

// --- Contrôle des données : les deux côtés d'une évolution doivent s'aligner -------------------------------------------------

// Mois couverts, relativement au mois de réponse : [début, fin] (décalages, 0 = mois en cours). Un instant couvre un seul mois.
function couverture(f: Fenetre): [number, number] {
  return f.type === "instant" ? [f.decalage, f.decalage] : [f.mois + f.decalage, 1 + f.decalage];
}

// Fenêtres d'une source, lues dans les périodes du classeur ; null quand une donnée n'a pas de période écrite.
export function fenetresDeLaSource(s: SourceEvolution, periodes: (code: string) => string | null): Fenetre[] | null {
  switch (s.type) {
    case "nombre":
    case "colonne": {
      const f = reglePeriode(periodes(s.donnee)).fenetre;
      return f ? [f] : null;
    }
    case "mois": {
      const f = reglePeriode(periodes(s.donnee)).fenetre;
      const decalage = f?.type === "mois" ? f.decalage : 0;
      const debut = Math.max(...s.lignes);
      const fin = Math.min(...s.lignes);
      if (s.lignes.some((k) => moisDeLigne(k === 1 ? "le_mois_dernier" : `il_y_a_${k}_mois`) === null)) return null;
      return [{ type: "mois", mois: debut - fin + 1, decalage: fin - 1 + decalage, depuisCreation: false }];
    }
    case "somme": {
      const parties = s.termes.map((t) => fenetresDeLaSource(t, periodes));
      return parties.some((p) => p === null) ? null : parties.flat() as Fenetre[];
    }
    case "rapport":
    case "taux": {
      const a = fenetresDeLaSource(s.numerateur, periodes);
      const b = fenetresDeLaSource(s.denominateur, periodes);
      return a && b ? [...a, ...b] : null;
    }
    case "marge": {
      const a = fenetresDeLaSource(s.ca, periodes);
      const b = fenetresDeLaSource(s.chargesParMois, periodes);
      return a && b ? [...a, ...b] : null;
    }
  }
}

// Erreurs d'alignement d'une évolution (vide si elle compare deux périodes de même longueur décalées de « ecart » mois).
export function controlerEvolution(e: Evolution, periodes: (code: string) => string | null): string[] {
  const erreurs: string[] = [];
  const cote = (nom: string, s: SourceEvolution, forcee: string | undefined): [number, number] | null => {
    if (forcee) {
      const f = reglePeriode(forcee).fenetre;
      if (!f) erreurs.push(`${e.id} : période ${nom} « ${forcee} » illisible.`);
      return f ? couverture(f) : null;
    }
    const fs = fenetresDeLaSource(s, periodes);
    if (!fs || fs.length === 0) {
      erreurs.push(`${e.id} : une donnée du côté ${nom} n'a pas de période écrite dans le classeur (colonne « Période »).`);
      return null;
    }
    const c = fs.map(couverture);
    if (c.some((x) => x[0] !== c[0][0] || x[1] !== c[0][1])) erreurs.push(`${e.id} : les données du côté ${nom} ne portent pas sur les mêmes mois.`);
    return c[0];
  };
  const a = cote("actuel", e.actuel, e.periodes?.actuel);
  const p = cote("passé", e.passe, e.periodes?.passe);
  if (a && p) {
    if (a[0] - a[1] !== p[0] - p[1]) erreurs.push(`${e.id} : les deux périodes n'ont pas la même longueur (${a[0] - a[1] + 1} et ${p[0] - p[1] + 1} mois).`);
    if (p[1] - a[1] !== e.ecart) erreurs.push(`${e.id} : les deux périodes sont décalées de ${p[1] - a[1]} mois, pas de ${e.ecart}.`);
  }
  return erreurs;
}

// Évaluation des règles d'affichage (data/regles-affichage.json) : une donnée ou un
// thème est affiché, masqué, ou en attente d'une réponse à un déclencheur.
//
// Ce fichier n'importe que des types et reponse.ts : il se teste directement avec Node.

import type { FormeDeclencheur, Regle, RegleSimple, ReglesAffichage } from "../donnees/schemas.ts";
import type { Reponses } from "./reponse.ts";

export const TAILLES_D02 = ["seul", "equipe_2_5", "structure_6_plus"] as const;
export type TailleId = (typeof TAILLES_D02)[number];

// Effectif déclaré à l'inscription (« Combien de personnes travaillent dans votre
// entreprise ? Vous y compris ») → taille du filtre de l'assemblage.
export function tailleDepuisEffectif(personnes: number): TailleId {
  if (personnes <= 1) return "seul";
  if (personnes <= 5) return "equipe_2_5";
  return "structure_6_plus";
}

export type Valeur = string | number | string[];
export type Lecteur = (cle: string) => Valeur | undefined;

// Valeur lue pour une question qui ne s'applique pas à ce compte (masquée, ou elle-même suspendue à une question masquée) :
// une condition qui la lit est fausse, jamais « en attente » (reponses-actives.ts).
export const INAPPLICABLE = "\u0000inapplicable";

// Vrai, faux, ou null quand une réponse manque encore.
export type Tri = boolean | null;

type Simple = RegleSimple;

function evaluerSimple(r: Simple, lire: Lecteur): Tri {
  const v = lire(r.cle);
  if (v === undefined) return r.op === "vide" ? true : null;
  if (v === INAPPLICABLE) return r.op === "vide";
  const taille = Array.isArray(v) ? v.length : v === "" ? 0 : 1;
  switch (r.op) {
    case "plus_de":
      return typeof v === "number" && typeof r.valeur === "number" ? v > r.valeur : false;
    case "egal":
      return v === r.valeur;
    case "different":
      return v !== r.valeur;
    case "contient":
      return Array.isArray(v) ? v.includes(String(r.valeur)) : v === r.valeur;
    case "ne_contient_pas":
      return Array.isArray(v) ? !v.includes(String(r.valeur)) : v !== r.valeur;
    case "non_vide":
      return taille > 0;
    case "vide":
      return taille === 0;
    case "dans":
      return Array.isArray(r.valeur) && !Array.isArray(v) ? r.valeur.includes(String(v)) : false;
    case "moins_de":
      return Array.isArray(v) && typeof r.valeur === "number" ? v.length < r.valeur : false;
  }
}

function combiner(resultats: Tri[], tous: boolean): Tri {
  if (tous) {
    if (resultats.includes(false)) return false;
    return resultats.includes(null) ? null : true;
  }
  if (resultats.includes(true)) return true;
  return resultats.includes(null) ? null : false;
}

// Une règle « à préciser » ne tranche pas : on laisse l'appelant décider (la question
// reste affichée).
export function evaluer(regle: Regle, lire: Lecteur): Tri | "a_preciser" {
  if ("aPreciser" in regle) return "a_preciser";
  if ("toujours" in regle) return true;
  const sous = (liste: Regle[]): Tri[] => liste.map((r) => {
    const t = evaluer(r, lire);
    return t === "a_preciser" ? null : t;
  });
  if ("tous" in regle) return combiner(sous(regle.tous), true);
  if ("un" in regle) return combiner(sous(regle.un), false);
  return evaluerSimple(regle, lire);
}

// Les clés de réponse d'une règle (« D08.achats »), pour savoir quels déclencheurs poser.
export function clesDeLaRegle(regle: Regle): string[] {
  if ("aPreciser" in regle || "toujours" in regle) return [];
  if ("tous" in regle) return regle.tous.flatMap(clesDeLaRegle);
  if ("un" in regle) return regle.un.flatMap(clesDeLaRegle);
  return [regle.cle];
}

// Clé qui désigne la réponse à une donnée : « ACQ-10.06 », « FIN-10.01#champ », « RH-32.01#ligne.colonne ».
const RE_CLE_DONNEE = /^((?:ACQ|FIN|RH|COM)-\d{2}\.\d{2})(?:#(.+))?$/;
export function cleDeDonnee(cle: string): { donnee: string; chemin: string | null } | null {
  const m = RE_CLE_DONNEE.exec(cle);
  return m ? { donnee: m[1], chemin: m[2] ?? null } : null;
}

export function declencheurDeLaCle(cle: string): string {
  const d = cleDeDonnee(cle);
  return d ? d.donnee : cle.split(".")[0];
}

// --- Lecture des réponses du dirigeant ------------------------------------------

function brut(reponses: Reponses, cle: string): Valeur | undefined {
  const r = reponses[cle];
  if (!r || r.genre !== "saisie") return undefined;
  const v = r.valeur;
  if (typeof v === "boolean") return v ? "oui" : "non";
  return v;
}

// Réponse à une donnée, lue comme valeur de déclencheur. Un chiffre exact vaut son nombre, une estimation son
// milieu ; « je ne sais pas » et « je ne suis pas cette donnée » ne répondent à rien (la question suivante attend).
// Une question à plusieurs champs ou un tableau se lit par « #champ » ou « #ligne.colonne ».
function lireDonnee(reponses: Reponses, donnee: string, chemin: string | null): Valeur | undefined {
  const r = reponses[donnee];
  if (!r) return undefined;
  switch (r.genre) {
    case "exact":
      return chemin ? undefined : r.valeur;
    case "estimation":
      return chemin ? undefined : (r.min + r.max) / 2;
    case "saisie":
      if (chemin) return undefined;
      return typeof r.valeur === "boolean" ? (r.valeur ? "oui" : "non") : r.valeur;
    case "valeurs": {
      // Une question à plusieurs champs ou un tableau lue en entier : « répondue » dès qu'une case est remplie.
      if (!chemin) return Object.values(r.valeurs).some((v) => v !== undefined && v !== null && v !== "") ? "reponse" : undefined;
      const v = r.valeurs[chemin];
      if (v === undefined || v === null) return undefined;
      return typeof v === "boolean" ? (v ? "oui" : "non") : v;
    }
    default:
      return undefined;
  }
}

// Lecteur des réponses aux déclencheurs. D02 vient du compte. D30 (« avant la première création de contenu »)
// vaut « non » pendant l'audit : le brief de création se pose plus tard, à la première création. Une sous-question qui
// n'a pas lieu d'être posée (« est-il en service ? » quand il n'y a pas
// d'investissement) vaut « non ».
// `inapplicables` : données qui ne s'appliquent pas à ce compte ; les lire donne INAPPLICABLE.
export function lecteurDeclencheurs(reponses: Reponses, taille: TailleId, regles: ReglesAffichage, inapplicables?: ReadonlySet<string>): Lecteur {
  return (cle) => {
    if (cle === "D02") return taille;
    if (cle === "D30") return "non";
    const donnee = cleDeDonnee(cle);
    const forme0 = regles.declencheurs[cle.split(".")[0]];
    const source = donnee?.donnee ?? (forme0?.type === "reponse_donnee" ? forme0.donnee : null);
    if (source && inapplicables?.has(source)) return INAPPLICABLE;
    if (donnee) return lireDonnee(reponses, donnee.donnee, donnee.chemin);
    if (forme0?.type === "reponse_donnee" && !cle.includes(".")) return lireDonnee(reponses, forme0.donnee, null);
    // Sous-question posée seulement après une réponse donnée à sa question parente (D12 « en service ? » après « oui ») : sans
    // elle, une réponse gardée d'avant ne compte pas ; avec une autre réponse, elle vaut « non ».
    const sousQuestion = sousQuestionOuverte(cle, reponses, regles);
    if (sousQuestion === "fermee") return "non";
    if (sousQuestion === "en_attente") return undefined;
    return brut(reponses, cle);
  };
}

// Une sous-question de cadrage qui dépend de la réponse à sa question parente est-elle posée ? « sans_condition » pour les
// autres clés.
export function sousQuestionOuverte(cle: string, reponses: Reponses, regles: ReglesAffichage): "sans_condition" | "ouverte" | "fermee" | "en_attente" {
  const [code, sous] = cle.split(".");
  const forme = regles.declencheurs[code];
  if (forme?.type !== "oui_non_multiple" || !sous) return "sans_condition";
  const def = forme.sousCles.find((s) => s.cle === sous);
  if (!def?.siCle) return "sans_condition";
  const parent = brut(reponses, def.siCle.cle ? `${code}.${def.siCle.cle}` : code);
  if (parent === undefined) return "en_attente";
  return parent === def.siCle.egal ? "ouverte" : "fermee";
}

// Donnée dont la réponse tient lieu de réponse au déclencheur (D03 → ACQ-03.01), ou null.
export function donneeDuDeclencheur(regles: ReglesAffichage, code: string): string | null {
  const f = regles.declencheurs[code];
  return f?.type === "reponse_donnee" ? f.donnee : null;
}

// Un déclencheur est répondu quand toutes ses sous-questions applicables le sont.
export function declencheurRepondu(code: string, reponses: Reponses, regles: ReglesAffichage): boolean {
  const forme: FormeDeclencheur | undefined = regles.declencheurs[code];
  if (!forme) return code === "D02";
  const lire = lecteurDeclencheurs(reponses, "seul", regles);
  if (forme.type === "oui_non_multiple") {
    return forme.sousCles.every((s) => lire(s.cle ? `${code}.${s.cle}` : code) !== undefined);
  }
  return lire(code) !== undefined;
}

// Ancienneté de l'entreprise en mois entiers révolus (D01 : date de création).
export function ancienneteEnMois(creation: Date, maintenant: Date): number {
  let mois = (maintenant.getUTCFullYear() - creation.getUTCFullYear()) * 12 + (maintenant.getUTCMonth() - creation.getUTCMonth());
  if (maintenant.getUTCDate() < creation.getUTCDate()) mois -= 1;
  return Math.max(0, mois);
}

// Condition de période d'une donnée (colonne « Période » du classeur) que le moteur sait
// lire : « Si plus de N mois d'existence (sinon masquée) ». Les autres formulations
// (« période adaptée », « si un premier exercice est clos »…) ne masquent rien ici.
export function moisMinimumDExistence(periode: string | null): number | null {
  const m = periode ? /^Si plus de (\d+) mois d'existence \(sinon masquée\)$/.exec(periode.trim()) : null;
  return m ? Number(m[1]) : null;
}

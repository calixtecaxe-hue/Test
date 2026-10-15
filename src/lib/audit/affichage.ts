// Évaluation des règles d'affichage (data/regles-affichage.json) : une donnée ou un
// thème est affiché, masqué, ou en attente d'une réponse à un déclencheur.
//
// Ce fichier n'importe que des types et reponse.ts : il se teste directement avec Node.

import type { FormeDeclencheur, Regle, ReglesAffichage } from "../donnees/schemas.ts";
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

export type Valeur = string | string[];
export type Lecteur = (cle: string) => Valeur | undefined;

// Vrai, faux, ou null quand une réponse manque encore.
export type Tri = boolean | null;

type Simple = Extract<Regle, { cle: string }>;

function evaluerSimple(r: Simple, lire: Lecteur): Tri {
  const v = lire(r.cle);
  if (v === undefined) return r.op === "vide" ? true : null;
  const taille = Array.isArray(v) ? v.length : v === "" ? 0 : 1;
  switch (r.op) {
    case "egal":
      return v === r.valeur;
    case "different":
      return v !== r.valeur;
    case "contient":
      return Array.isArray(v) ? v.includes(String(r.valeur)) : v === r.valeur;
    case "non_vide":
      return taille > 0;
    case "vide":
      return taille === 0;
    case "dans":
      return Array.isArray(r.valeur) && !Array.isArray(v) ? r.valeur.includes(v) : false;
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
  if ("tous" in regle) return combiner(regle.tous.map((r) => evaluerSimple(r, lire)), true);
  if ("un" in regle) return combiner(regle.un.map((r) => evaluerSimple(r, lire)), false);
  return evaluerSimple(regle, lire);
}

// Les clés de réponse d'une règle (« D08.achats »), pour savoir quels déclencheurs poser.
export function clesDeLaRegle(regle: Regle): string[] {
  if ("aPreciser" in regle) return [];
  if ("tous" in regle) return regle.tous.map((r) => r.cle);
  if ("un" in regle) return regle.un.map((r) => r.cle);
  return [regle.cle];
}

export function declencheurDeLaCle(cle: string): string {
  return cle.split(".")[0];
}

// --- Lecture des réponses du dirigeant ------------------------------------------

function brut(reponses: Reponses, cle: string): Valeur | undefined {
  const r = reponses[cle];
  if (!r || r.genre !== "saisie") return undefined;
  const v = r.valeur;
  if (typeof v === "boolean") return v ? "oui" : "non";
  return v;
}

// Lecteur des réponses aux déclencheurs. D02 vient du compte. Une sous-question qui
// n'a pas lieu d'être posée (« est-il en service ? » quand il n'y a pas
// d'investissement) vaut « non ».
export function lecteurDeclencheurs(reponses: Reponses, taille: TailleId, regles: ReglesAffichage): Lecteur {
  return (cle) => {
    if (cle === "D02") return taille;
    const direct = brut(reponses, cle);
    if (direct !== undefined) return direct;
    const [code, sous] = cle.split(".");
    const forme = regles.declencheurs[code];
    if (forme?.type === "oui_non_multiple" && sous) {
      const def = forme.sousCles.find((s) => s.cle === sous);
      if (def?.siCle) {
        const parent = brut(reponses, def.siCle.cle ? `${code}.${def.siCle.cle}` : code);
        if (parent !== undefined && parent !== def.siCle.egal) return "non";
      }
    }
    return undefined;
  };
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

// Total proposé d'après le détail déjà donné (data/prereponses.json) : le budget marketing
// et communication de Finance se déduit des lignes que les agents Acquisition et Comm ont
// déjà posées. Le code additionne des chiffres que le dirigeant a lui-même donnés ; il ne
// propose rien tant qu'une donnée exigée n'a pas de chiffre (« je ne sais pas » et « je ne
// suis pas cette donnée » n'en sont pas). Le dirigeant garde le total ou donne un autre chiffre.
//
// Ce fichier n'importe que des types : il se teste directement avec Node.

import type { Prereponses } from "../donnees/schemas.ts";
import type { Reponse, Reponses } from "./reponse.ts";

// Somme des chiffres d'une réponse ; null quand elle n'en contient aucun.
function sommeDeLaReponse(r: Reponse | undefined): number | null {
  if (!r) return null;
  if (r.genre === "exact") return r.valeur;
  if (r.genre === "estimation") return (r.min + r.max) / 2;
  if (r.genre === "valeurs") {
    const nombres = Object.values(r.valeurs).filter((v): v is number => typeof v === "number");
    return nombres.length > 0 ? nombres.reduce((a, b) => a + b, 0) : null;
  }
  return null;
}

export type Prereponse = { total: number; detail: string };

export function prereponseDe(prereponses: Prereponses, donnee: string, reponses: Reponses): Prereponse | null {
  const regle = prereponses.regles.find((r) => r.donnee === donnee);
  if (!regle) return null;
  if (regle.exige.some((code) => sommeDeLaReponse(reponses[code]) === null)) return null;
  const total = regle.somme.reduce((cumul, code) => cumul + (sommeDeLaReponse(reponses[code]) ?? 0), 0);
  return { total: Math.round(total * 100) / 100, detail: regle.detail };
}

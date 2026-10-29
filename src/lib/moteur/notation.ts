// Notation d'un indicateur : vert / orange / rouge (CLAUDE.md section 7, étage 1).
//
// Règles du document :
//   - la moyenne du marché est ORANGE, le vert est au-dessus ;
//   - indicateur à deux sens : fourchette verte, orange à moins d'un point, rouge au-delà ;
//   - une pratique est absente, partielle ou en place ;
//   - sans source, le seuil est « à valider ».
// Les valeurs des seuils (moyenne, borne rouge, fourchette) ne sont jamais écrites dans
// le code : elles viennent de data/seuils.json, qui reste à écrire.
//
// Ce fichier n'importe que des types : il se teste directement avec Node.

import type { z } from "zod";
import type { seuilDonnee } from "../donnees/schemas.ts";

export type Couleur = "vert" | "orange" | "rouge";

// Un seuil et ses types de notation sont définis avec les autres formats de données.
export type Seuil = z.infer<typeof seuilDonnee>;
export type Notation = Seuil["notation"];
// Types de notation :
//   marche_haut : plus haut = mieux. Vert au-dessus de la moyenne, orange de la borne rouge
//                 à la moyenne comprise, rouge en dessous de la borne.
//   marche_bas  : plus bas = mieux. Vert en dessous de la moyenne, orange jusqu'à la borne
//                 comprise, rouge au-delà.
//   fourchette  : deux sens. Vert dans la fourchette, orange jusqu'à la tolérance (un point
//                 par défaut), rouge au-delà.
//   pratique    : absente, partielle ou en place.

export function noterMarcheHaut(valeur: number, moyenne: number, rougeSous: number): Couleur {
  if (valeur > moyenne) return "vert";
  if (valeur >= rougeSous) return "orange";
  return "rouge";
}

export function noterMarcheBas(valeur: number, moyenne: number, rougeAuDela: number): Couleur {
  if (valeur < moyenne) return "vert";
  if (valeur <= rougeAuDela) return "orange";
  return "rouge";
}

export function noterFourchette(valeur: number, min: number, max: number, tolerance = 1): Couleur {
  if (valeur >= min && valeur <= max) return "vert";
  const ecart = valeur < min ? min - valeur : valeur - max;
  return ecart <= tolerance ? "orange" : "rouge";
}

export type NiveauPratique = "en_place" | "partielle" | "absente";
export function noterPratique(niveau: NiveauPratique): Couleur {
  return niveau === "en_place" ? "vert" : niveau === "partielle" ? "orange" : "rouge";
}

// Choisit le seuil d'une donnée pour ce compte : le plus précis (zone et taille) l'emporte.
export function choisirSeuil(seuils: Seuil[], donnee: string, zone: string, taille: string): Seuil | null {
  const candidats = seuils.filter(
    (s) => s.donnee === donnee && (!s.zones || s.zones.includes(zone as never)) && (!s.tailles || s.tailles.includes(taille as never))
  );
  if (candidats.length === 0) return null;
  const precision = (s: Seuil) => (s.zones ? 1 : 0) + (s.tailles ? 1 : 0);
  return candidats.sort((a, b) => precision(b) - precision(a))[0];
}

export function noter(n: Notation, valeur: number | NiveauPratique): Couleur | null {
  switch (n.type) {
    case "marche_haut":
      return typeof valeur === "number" ? noterMarcheHaut(valeur, n.moyenne, n.rougeSous) : null;
    case "marche_bas":
      return typeof valeur === "number" ? noterMarcheBas(valeur, n.moyenne, n.rougeAuDela) : null;
    case "fourchette":
      return typeof valeur === "number" ? noterFourchette(valeur, n.min, n.max, n.tolerance) : null;
    case "pratique":
      return typeof valeur === "string" ? noterPratique(valeur) : null;
  }
}

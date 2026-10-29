// Vocabulaire propre au métier d'un compte (data/vocabulaires-metiers.json) : « immobilier », « negoce », « cabinet »…
// Tant que le fichier n'est pas validé par le propriétaire, aucun vocabulaire n'est appliqué.
//
// Ce fichier n'importe que des types : il se teste directement avec Node.

import type { VocabulairesMetiers } from "./donnees/schemas.ts";

export function vocabulaireDuCompte(v: VocabulairesMetiers, compte: { metierPrecis: string | null; sousVariantes: string[] }): string | null {
  if (!v.valide || compte.metierPrecis === null) return null;
  // Plusieurs activités cochées : un vocabulaire seulement si elles s'accordent toutes ; sinon les mots du profil restent.
  const parActivite = compte.sousVariantes.map((a) => v.activites[`${compte.metierPrecis}/${a}`]?.vocabulaire ?? v.metiers[compte.metierPrecis!]?.vocabulaire ?? null);
  if (parActivite.length === 0) return v.metiers[compte.metierPrecis]?.vocabulaire ?? null;
  const distincts = new Set(parActivite);
  return distincts.size === 1 ? (parActivite[0] ?? null) : null;
}

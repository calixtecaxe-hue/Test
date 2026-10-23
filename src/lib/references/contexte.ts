// Contexte d'un compte pour choisir une référence : métier, activité principale, famille (catégorie
// de routage), zone et taille. Ce fichier n'importe que des types : il se teste avec Node.

import type { Routage } from "../donnees/schemas.ts";
import { METIER_ABSENT, trouverMetier } from "../routage.ts";
import { tailleDepuisEffectif } from "../audit/affichage.ts";
import type { ContexteReference } from "./cascade.ts";
import type { Zone } from "./types.ts";

export type CompteReference = {
  metierPrecis: string;
  sousVariantes: string[];
  // Catégorie enregistrée sur le compte (choisie par le dirigeant si son métier est absent de la liste).
  categorie: string;
  typeZone: Zone;
  effectif: number;
};

// Activité principale d'un compte qui en a plusieurs. RÈGLE PROVISOIRE, à confirmer par le propriétaire :
// l'activité par défaut du métier si elle est cochée (ou si « Autre » est seule), sinon la première
// cochée dans l'ordre du métier. Le rapport doit signaler qu'une seule activité sert de repère.
export function activitePrincipale(routage: Routage, metierId: string, cochees: string[]): string | null {
  const metier = trouverMetier(routage, metierId);
  const variantes = metier?.sousVariantes ?? [];
  if (variantes.length === 0) return null;
  const defaut = variantes.find((v) => v.defaut) ?? variantes[0];
  if (cochees.length === 0 || cochees.includes(defaut.id)) return defaut.id;
  return variantes.find((v) => cochees.includes(v.id))?.id ?? defaut.id;
}

export function contexteReference(routage: Routage, c: CompteReference): ContexteReference | null {
  const taille = tailleDepuisEffectif(c.effectif);
  if (c.metierPrecis === METIER_ABSENT) {
    return { metier: null, sousVariante: null, famille: c.categorie, zone: c.typeZone, taille };
  }
  const metier = trouverMetier(routage, c.metierPrecis);
  if (!metier) {
    // Identifiant de métier ancien : on retombe sur la catégorie enregistrée.
    return { metier: null, sousVariante: null, famille: c.categorie, zone: c.typeZone, taille };
  }
  const idActivite = activitePrincipale(routage, metier.id, c.sousVariantes);
  const activite = idActivite ? metier.sousVariantes?.find((v) => v.id === idActivite) : undefined;
  return { metier: metier.id, sousVariante: idActivite, famille: activite?.categorie ?? metier.categorie, zone: c.typeZone, taille };
}

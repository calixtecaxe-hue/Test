// Références de marché : ce qu'on enregistre pour un indicateur et un profil (cahier « références de
// marché », partie 1). Une ligne = une version d'une référence ; on ne supprime jamais une version.
//
// Ce fichier n'importe que zod : il se teste directement avec Node.

import { z } from "zod";
import { TAILLES } from "../donnees/constantes.ts";
import { SENS_INDICATEUR, UNITES_INDICATEUR } from "../donnees/schemas.ts";

export const ZONES = ["URBAINE_DENSE", "PERIURBAINE", "RURALE"] as const;
export type Zone = (typeof ZONES)[number];
export type Taille = (typeof TAILLES)[number];

export const NIVEAUX_REFERENCE = ["metier", "famille", "national"] as const;
export type NiveauReference = (typeof NIVEAUX_REFERENCE)[number];

// actif : utilisable. valide_fondateur : utilisable, validé à la main (tous les usages).
// a_revoir : en attente de revue, jamais utilisé comme référence solide. rejete : écarté.
// aucune_reference : la recherche n'a rien donné ; sert à ne pas la relancer avant 90 jours.
export const STATUTS_REFERENCE = ["actif", "a_revoir", "valide_fondateur", "rejete", "aucune_reference"] as const;
export type StatutReference = (typeof STATUTS_REFERENCE)[number];

export const source = z.object({
  organisme: z.string().min(1),
  titre: z.string().min(1),
  url: z.url(),
  datePublication: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "Date de publication attendue : AAAA, AAAA-MM ou AAAA-MM-JJ."),
  dateConsultation: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pays: z.string().min(1),
  population: z.string().min(1),
  echantillon: z.number().int().positive().nullable(),
  // Ce que la source mesure exactement, à côté de la définition du catalogue.
  definition: z.string().min(1),
  // Une ou deux phrases contenant le chiffre, relues dans la page par le serveur.
  extrait: z.string().min(1).max(600),
  // 1 : officiel (INSEE, ministères, fédérations…). 2 : étude reconnue avec méthodologie publiée.
  niveau: z.union([z.literal(1), z.literal(2)]),
});
export type Source = z.infer<typeof source>;

export const reference = z
  .object({
    id: z.string().min(1),
    themeId: z.string().min(1),
    indicateurId: z.string().min(1),
    niveau: z.enum(NIVEAUX_REFERENCE),
    // Clé de segmentation : un niveau « famille » ou « national » n'a pas de métier.
    metier: z.string().nullable(),
    famille: z.string().nullable(),
    sousVariante: z.string().nullable(),
    zone: z.enum([...ZONES, "toutes"]),
    trancheTaille: z.enum([...TAILLES, "toutes"]),
    valeurCentrale: z.number().nullable(),
    borneBasse: z.number().nullable(),
    borneHaute: z.number().nullable(),
    statistique: z.string().nullable(),
    unite: z.enum(UNITES_INDICATEUR),
    periode: z.string().min(1),
    sens: z.enum(SENS_INDICATEUR),
    source: source.nullable(),
    secondeSource: source.nullable(),
    confiance: z.enum(["solide", "indicatif"]).nullable(),
    statut: z.enum(STATUTS_REFERENCE),
    // Date à laquelle la référence doit être revérifiée (fréquence réglable, 3 mois par défaut).
    dateExpiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    version: z.number().int().positive(),
    actif: z.boolean(),
    nbUtilisations: z.number().int().nonnegative(),
    motif: z.string().nullable(),
    creeLe: z.string().min(1),
  })
  .superRefine((r, ctx) => {
    const erreur = (message: string) => ctx.addIssue({ code: "custom", message });
    if (r.niveau === "metier" && !r.metier) erreur("Une référence de niveau métier porte un métier.");
    if (r.niveau === "famille" && !r.famille) erreur("Une référence de niveau famille porte une famille.");
    if (r.statut === "aucune_reference") {
      if (r.valeurCentrale !== null) erreur("« aucune_reference » n'a pas de valeur.");
      if (!r.motif) erreur("« aucune_reference » porte le motif de l'absence.");
      return;
    }
    if (r.valeurCentrale === null) erreur("Une référence utilisable a une valeur centrale.");
    if (!r.source) erreur("Aucune valeur de marché sans source citée.");
    if (!r.confiance) erreur("Une référence utilisable porte son niveau de confiance.");
    if (r.borneBasse !== null && r.borneHaute !== null && r.borneBasse > r.borneHaute) erreur("La borne basse dépasse la borne haute.");
  });
export type Reference = z.infer<typeof reference>;

// Une référence peut servir au moteur : active, utilisable, avec une valeur.
export function estUtilisable(r: Reference): boolean {
  return r.actif && (r.statut === "actif" || r.statut === "valide_fondateur") && r.valeurCentrale !== null && r.source !== null;
}

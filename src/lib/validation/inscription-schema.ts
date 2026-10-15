// Validation du dossier d'inscription (CLAUDE.md section 5), côté serveur comme
// côté navigateur. Le routage (catégorie, profils) n'est jamais lu dans la
// requête : il est recalculé depuis le métier et les activités cochées.
//
// Ce fichier n'importe que zod et le routage : il se teste directement avec Node.

import { z } from "zod";
import { router } from "../routage.ts";
import type { Routage } from "../donnees/schemas.ts";

const ANNEE_MINIMALE = 1900;

export function creerSchemaInscription(routage: Routage) {
  return z
    .object({
      email: z.string().trim().toLowerCase().email("Adresse email invalide."),
      motDePasse: z.string().min(10, "Le mot de passe doit contenir au moins 10 caractères."),
      metierPrecis: z.string().min(1, "Indiquez votre métier."),
      sousVariantes: z.array(z.string()).default([]),
      chiffreAffairesMensuel: z.coerce
        .number({ message: "Indiquez un chiffre d'affaires mensuel." })
        .nonnegative("Le chiffre d'affaires ne peut pas être négatif."),
      nombreCollaborateurs: z.coerce
        .number({ message: "Indiquez le nombre de personnes qui travaillent dans l'entreprise." })
        .int("Le nombre de personnes doit être un entier.")
        .min(1, "Indiquez au moins une personne : vous."),
      // Mois de création, au format aaaa-mm-jj (le premier du mois suffit).
      dateCreationEntreprise: z
        .string()
        .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), "Indiquez le mois de création.")
        .refine((v) => Number(v.slice(0, 4)) >= ANNEE_MINIMALE, "Indiquez le mois de création.")
        .refine((v) => Date.parse(v) <= Date.now(), "La date de création ne peut pas être dans le futur."),
      typeZone: z.enum(["URBAINE_DENSE", "PERIURBAINE", "RURALE"], { message: "Indiquez le type de zone." }),
      ville: z.string().trim().min(1, "Indiquez la ville."),
    })
    .superRefine((data, ctx) => {
      const r = router(routage, data.metierPrecis, data.sousVariantes);
      if (!r.ok) ctx.addIssue({ code: "custom", path: [r.erreur.champ], message: r.erreur.message });
    });
}

export type InscriptionInput = z.infer<ReturnType<typeof creerSchemaInscription>>;

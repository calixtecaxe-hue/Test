import { z } from "zod";
import { METIERS } from "@/lib/metiers";

const metierActifIds = METIERS.filter((m) => m.actif).map((m) => m.id);

export const inscriptionSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Adresse email invalide."),
    motDePasse: z
      .string()
      .min(10, "Le mot de passe doit contenir au moins 10 caractères."),
    metierPrecis: z.enum(metierActifIds as [string, ...string[]], {
      message: "Métier non reconnu.",
    }),
    sousVariante: z.string().trim().min(1).optional(),
    chiffreAffairesMensuel: z.coerce
      .number({ message: "Indiquez un chiffre d'affaires mensuel." })
      .nonnegative("Le chiffre d'affaires ne peut pas être négatif."),
    nombreCollaborateurs: z.coerce
      .number({ message: "Indiquez un nombre de collaborateurs." })
      .int("Le nombre de collaborateurs doit être un entier.")
      .nonnegative("Le nombre de collaborateurs ne peut pas être négatif."),
    dateCreationEntreprise: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Date de création invalide."),
    typeZone: z.enum(["URBAINE_DENSE", "PERIURBAINE", "RURALE"], {
      message: "Indiquez le type de zone.",
    }),
    ville: z.string().trim().min(1, "Indiquez la ville."),
  })
  .refine(
    (data) => {
      const metier = METIERS.find((m) => m.id === data.metierPrecis);
      if (!metier?.sousVariantes) return true;
      return metier.sousVariantes.some(
        (v) => v.id === data.sousVariante && v.actif
      );
    },
    { message: "Sous-variante non reconnue pour ce métier.", path: ["sousVariante"] }
  );

export type InscriptionInput = z.infer<typeof inscriptionSchema>;

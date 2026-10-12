import { z } from "zod";

export const CODES_AGENT = [
  "ACQUISITION_CA",
  "FINANCE_RENTABILITE",
  "RH_ORGANISATION",
  "COMM_CREATION",
] as const;

// Corps des requêtes sur l'objectif : l'agent de l'audit et le texte libre du
// dirigeant (précisions éventuelles incluses, bout à bout).
export const objectifRequeteSchema = z.object({
  agent: z.enum(CODES_AGENT, { message: "Agent non reconnu." }),
  texte: z
    .string()
    .trim()
    .min(1, "Écrivez votre objectif.")
    .max(800, "Votre objectif est trop long : résumez-le en une ou deux phrases."),
});

export type ObjectifRequete = z.infer<typeof objectifRequeteSchema>;

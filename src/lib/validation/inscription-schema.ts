// Validation du parcours d'inscription (CLAUDE.md sections 5 et 10), côté serveur comme côté navigateur.
// Trois étapes, trois schémas : les identifiants (création du compte), le métier et ses activités (avant le
// choix de la formule), puis le dossier d'entreprise (après le paiement). Le routage (catégorie, profils)
// n'est jamais lu dans la requête : il est recalculé depuis le métier et les activités cochées.
//
// Ce fichier n'importe que zod et le routage : il se teste directement avec Node.

import { z } from "zod";
import { METIER_ABSENT, router } from "../routage.ts";
import type { Routage } from "../donnees/schemas.ts";

const ANNEE_MINIMALE = 1900;
// Bornes qui évitent un dépassement de la base (Decimal(12,2), Int) et des saisies absurdes.
const CA_MENSUEL_MAX = 1_000_000_000;
const PERSONNES_MAX = 100_000;
// bcrypt ne lit que les 72 premiers octets d'un mot de passe : au-delà, la fin serait ignorée.
const MOT_DE_PASSE_MAX_OCTETS = 72;

function estUneDateReelle(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export const schemaEmail = z.string().trim().toLowerCase().max(254, "Adresse email invalide.").email("Adresse email invalide.");

// Même règle à la création du compte et au choix d'un nouveau mot de passe (« Mot de passe oublié »).
export const schemaMotDePasse = z
  .string()
  .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
  .refine((v) => new TextEncoder().encode(v).length <= MOT_DE_PASSE_MAX_OCTETS, "Le mot de passe est trop long : 72 octets au maximum (environ 60 caractères).");

export const schemaIdentifiants = z.object({
  email: schemaEmail,
  motDePasse: schemaMotDePasse,
});

export function creerSchemaMetier(routage: Routage) {
  return z
    .object({
      metierPrecis: z.string().min(1, "Indiquez votre métier."),
      sousVariantes: z.array(z.string()).default([]),
      // « Autre (précisez) » : cochée avec d'autres cases elle ne change rien ; cochée seule, elle
      // donne le questionnaire de l'activité par défaut. Le texte est toujours enregistré, pour
      // repérer les activités qui manquent à la liste.
      autre: z.boolean().default(false),
      autreTexte: z.string().trim().max(200, "Le texte est trop long.").optional(),
      // « Mon métier n'est pas dans la liste » : ce que fait le client, et ce qui y ressemble le plus.
      metierAbsentTexte: z.string().trim().max(200, "Le texte est trop long.").optional(),
      categorieAbsente: z.string().optional(),
      // Réponse à la question posée aux métiers dont le stock dépend de ce qu'ils vendent.
      vendProduits: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      const r = router(routage, data.metierPrecis, data.sousVariantes, { autre: data.autre, categorieAbsente: data.categorieAbsente });
      if (!r.ok) {
        ctx.addIssue({ code: "custom", path: [r.erreur.champ], message: r.erreur.message });
        return;
      }
      if (data.autre && data.sousVariantes.length === 0 && !data.autreTexte) {
        ctx.addIssue({ code: "custom", path: ["autreTexte"], message: "Précisez ce que vous faites." });
      }
      if (data.metierPrecis === METIER_ABSENT && !data.metierAbsentTexte) {
        ctx.addIssue({ code: "custom", path: ["metierAbsentTexte"], message: "Indiquez votre métier." });
      }
      if (r.routage.stock === "a_demander" && data.vendProduits === undefined) {
        ctx.addIssue({ code: "custom", path: ["vendProduits"], message: "Dites si vous vendez aussi des produits." });
      }
    });
}

export const schemaDossier = z.object({
  chiffreAffairesMensuel: z.coerce
    .number({ message: "Indiquez un chiffre d'affaires mensuel." })
    .nonnegative("Le chiffre d'affaires ne peut pas être négatif : indiquez le montant encaissé sur un mois, sans le signe moins.")
    .max(CA_MENSUEL_MAX, "Ce chiffre d'affaires mensuel est trop élevé : vérifiez le montant."),
  nombreCollaborateurs: z.coerce
    .number({ message: "Indiquez le nombre de personnes qui travaillent dans l'entreprise." })
    .int("Le nombre de personnes doit être un entier.")
    .min(1, "Indiquez au moins une personne : vous.")
    .max(PERSONNES_MAX, "Ce nombre de personnes est trop élevé : vérifiez-le."),
  // Mois de création, au format aaaa-mm-jj (le premier du mois suffit).
  dateCreationEntreprise: z
    .string()
    .refine(estUneDateReelle, "Indiquez le mois de création.")
    .refine((v) => Number(v.slice(0, 4)) >= ANNEE_MINIMALE, "Indiquez le mois de création.")
    .refine((v) => Date.parse(v) <= Date.now(), "La date de création ne peut pas être dans le futur."),
  typeZone: z.enum(["URBAINE_DENSE", "PERIURBAINE", "RURALE"], { message: "Indiquez le type de zone." }),
  ville: z.string().trim().min(1, "Indiquez la ville.").max(120, "Le nom de la ville est trop long."),
});

export type IdentifiantsInput = z.infer<typeof schemaIdentifiants>;
export type MetierInput = z.infer<ReturnType<typeof creerSchemaMetier>>;
export type DossierInput = z.infer<typeof schemaDossier>;

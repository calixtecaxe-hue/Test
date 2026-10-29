// Ce que l'agent de recherche renvoie : un JSON que le code valide avant tout enregistrement. Une
// sortie qui ne respecte pas ce schéma est rejetée (cahier « références de marché », partie 4).
//
// Ce fichier n'importe que zod : il se teste directement avec Node.

import { z } from "zod";
import { TAILLES } from "../donnees/constantes.ts";
import { UNITES_INDICATEUR } from "../donnees/schemas.ts";
import { ZONES } from "./types.ts";

export const CATEGORIES_SOURCE = [
  "officiel", // institution publique
  "federation", // fédération ou syndicat professionnel
  "observatoire", // observatoire de branche
  "etude", // étude d'un organisme identifiable
  "presse", // article de presse : refusé, on remonte à l'étude d'origine
  "blog_editeur", // blog d'éditeur de logiciel, de CRM, vendeur de formation : exclu
  "forum", // exclu
  "genere_par_ia", // contenu manifestement généré : exclu
  "publie_par_caxe", // exclu
  "autre",
] as const;
export type CategorieSource = (typeof CATEGORIES_SOURCE)[number];

export const sourceProposee = z.object({
  organisme: z.string().min(1),
  titre: z.string().min(1),
  url: z.url(),
  datePublication: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "AAAA, AAAA-MM ou AAAA-MM-JJ"),
  pays: z.string().min(1),
  population: z.string().min(1),
  populationTaille: z.enum(["tpe_pme", "toutes", "grandes_entreprises", "inconnue"]),
  echantillon: z.number().int().positive().nullable(),
  definition: z.string().min(1),
  extrait: z.string().min(1).max(600),
  categorie: z.enum(CATEGORIES_SOURCE),
  methodologiePubliee: z.boolean(),
  auteurIdentifie: z.boolean(),
});
export type SourceProposee = z.infer<typeof sourceProposee>;

export const candidate = z.object({
  valeurSource: z.number().finite(),
  uniteSource: z.enum(UNITES_INDICATEUR),
  periodeSource: z.string().min(1),
  // Seule conversion permise : un montant annuel ramené au mois (÷ 12), faite par le code.
  conversion: z.enum(["annuel_vers_mensuel"]).nullable(),
  statistique: z.string().min(1),
  borneBasse: z.number().finite().nullable(),
  borneHaute: z.number().finite().nullable(),
  // Ce que la source mesure exactement, comparé à la définition du catalogue.
  concordanceDefinition: z.enum(["identique", "proche", "differente"]),
  explicationConcordance: z.string().min(1),
  // Segmentation que la source fournit réellement ; jamais inventée.
  zone: z.enum([...ZONES, "toutes"]),
  trancheTaille: z.enum([...TAILLES, "toutes"]),
  sousVariante: z.string().nullable(),
  source: sourceProposee,
});
export type Candidate = z.infer<typeof candidate>;

export const proposition = z.discriminatedUnion("resultat", [
  z.object({
    resultat: z.literal("trouvee"),
    principale: candidate,
    // Seconde source indépendante, qui ne cite pas la première.
    seconde: candidate.extend({ citeLaPremiere: z.boolean() }).nullable(),
    // Toute instruction rencontrée dans une page : signalée, jamais suivie.
    instructionsRencontrees: z.array(z.string()),
  }),
  z.object({
    resultat: z.literal("aucune_reference"),
    motif: z.string().min(1),
    instructionsRencontrees: z.array(z.string()),
  }),
]);
export type Proposition = z.infer<typeof proposition>;

// La réponse de l'agent est un bloc JSON ; on en extrait le premier objet équilibré et on le valide.
export function lireProposition(texte: string): { ok: true; proposition: Proposition } | { ok: false; motif: string } {
  const debut = texte.indexOf("{");
  if (debut === -1) return { ok: false, motif: "La réponse de l'agent ne contient pas de JSON." };
  let profondeur = 0;
  let dansTexte = false;
  let echappe = false;
  for (let i = debut; i < texte.length; i++) {
    const c = texte[i];
    if (dansTexte) {
      if (echappe) echappe = false;
      else if (c === "\\") echappe = true;
      else if (c === '"') dansTexte = false;
      continue;
    }
    if (c === '"') dansTexte = true;
    else if (c === "{") profondeur++;
    else if (c === "}" && --profondeur === 0) {
      let brut: unknown;
      try {
        brut = JSON.parse(texte.slice(debut, i + 1));
      } catch {
        return { ok: false, motif: "Le JSON de l'agent est illisible." };
      }
      const r = proposition.safeParse(brut);
      if (!r.success) return { ok: false, motif: `Sortie de l'agent invalide : ${r.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).slice(0, 3).join(" ; ")}` };
      return { ok: true, proposition: r.data };
    }
  }
  return { ok: false, motif: "Le JSON de l'agent est incomplet." };
}

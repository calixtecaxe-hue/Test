// Objectif d'un agent en trois champs courts (CLAUDE.md section 6) : ce que le
// dirigeant veut changer, de combien, en combien de temps. Exemple affiché :
// « baisser le turnover de 5 % sur les 3 prochains mois ».
//
// Le chiffre et le délai sont utilisés directement, aucune interprétation de texte
// libre. Ce que le dirigeant veut changer est rattaché à un indicateur de l'agent
// quand c'est possible ; sinon l'objectif est gardé tel quel et l'avancement se
// mesure à ce que le dirigeant déclare aux points d'étape.
//
// Ce fichier n'importe que zod et des types : il se teste directement avec Node.

import { z } from "zod";
import type { Theme } from "../donnees/schemas.ts";

export const UNITES_AMPLEUR = ["pourcent", "euros", "unites"] as const;
export type UniteAmpleur = (typeof UNITES_AMPLEUR)[number];

export const DELAI_MAX_MOIS = 60;

export const objectifSaisieSchema = z.object({
  quoi: z
    .string()
    .trim()
    .min(3, "Dites ce que vous voulez changer, par exemple « baisser le turnover ».")
    .max(160, "Résumez en quelques mots ce que vous voulez changer."),
  ampleur: z.object({
    valeur: z
      .number({ message: "Indiquez de combien." })
      .finite("Indiquez de combien.")
      .positive("Indiquez un nombre supérieur à zéro."),
    unite: z.enum(UNITES_AMPLEUR, { message: "Choisissez l'unité." }),
  }),
  delaiMois: z
    .number({ message: "Indiquez en combien de temps." })
    .int("Indiquez un nombre entier de mois.")
    .min(1, "Le délai est d'au moins 1 mois.")
    .max(DELAI_MAX_MOIS, `Le délai ne dépasse pas ${DELAI_MAX_MOIS} mois.`),
});
export type ObjectifSaisie = z.infer<typeof objectifSaisieSchema>;

// Ce qui est enregistré : la saisie, l'indicateur rattaché (ou rien) et l'échéance.
export type ObjectifEnregistre = ObjectifSaisie & {
  indicateur: { code: string; nom: string } | null;
  echeance: string; // AAAA-MM-JJ
};

const LIBELLE_UNITE: Record<UniteAmpleur, string> = { pourcent: "%", euros: "€", unites: "" };

function formaterNombre(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

// « baisser le turnover de 5 % sur les 3 prochains mois ».
export function phraseObjectif(o: ObjectifSaisie): string {
  const unite = LIBELLE_UNITE[o.ampleur.unite];
  const ampleur = `${formaterNombre(o.ampleur.valeur)}${unite ? ` ${unite}` : ""}`;
  const delai = o.delaiMois === 1 ? "le mois prochain" : `les ${o.delaiMois} prochains mois`;
  return `${o.quoi.replace(/[.\s]+$/, "")} de ${ampleur} sur ${delai}`;
}

// Échéance : même jour du mois, `delaiMois` mois plus tard (en UTC). Le 31 janvier + 1 mois
// donne le dernier jour de février.
export function calculerEcheance(depuis: Date, delaiMois: number): string {
  const annee = depuis.getUTCFullYear();
  const mois = depuis.getUTCMonth() + delaiMois;
  const jour = depuis.getUTCDate();
  const dernier = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  const d = new Date(Date.UTC(annee, mois, Math.min(jour, dernier)));
  return d.toISOString().slice(0, 10);
}

// --- Rattachement à un indicateur ---------------------------------------------

const MOTS_VIDES = new Set([
  "le", "la", "les", "l", "un", "une", "des", "de", "du", "d", "mon", "ma", "mes", "au", "aux", "et", "en", "dans", "sur", "par", "pour",
  "notre", "nos", "son", "ses", "plus", "moins", "mieux", "ce", "cette",
]);
// Verbes d'action qui disent le sens du changement, pas l'indicateur visé.
const VERBES = new Set([
  "augmenter", "baisser", "reduire", "diminuer", "ameliorer", "gagner", "passer", "atteindre", "doubler", "developper", "faire", "avoir", "obtenir",
  "limiter", "accelerer", "raccourcir", "stabiliser", "monter", "descendre", "hausse", "baisse", "croissance",
]);

function sansAccents(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Radical court : « conversions » et « conversion » se rejoignent.
function radicaux(texte: string): string[] {
  return sansAccents(texte)
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length > 2 && !MOTS_VIDES.has(m) && !VERBES.has(m))
    .map((m) => m.slice(0, 6));
}

// Un thème est rattaché quand tous les mots significatifs de son nom se retrouvent
// dans ce que le dirigeant a écrit. Plusieurs thèmes possibles : on garde celui dont le
// nom est le plus précis (le plus de mots) ; à égalité, on ne rattache rien plutôt que
// de deviner.
export function rattacherIndicateur(quoi: string, themesDeLAgent: Pick<Theme, "code" | "nom">[]): { code: string; nom: string } | null {
  const mots = new Set(radicaux(quoi));
  if (mots.size === 0) return null;
  const candidats = themesDeLAgent
    .map((t) => ({ t, rad: radicaux(t.nom) }))
    .filter(({ rad }) => rad.length > 0 && rad.every((r) => mots.has(r)));
  if (candidats.length === 0) return null;
  const max = Math.max(...candidats.map((c) => c.rad.length));
  const meilleurs = candidats.filter((c) => c.rad.length === max);
  if (meilleurs.length !== 1) return null;
  return { code: meilleurs[0].t.code, nom: meilleurs[0].t.nom };
}

export function enregistrerObjectif(
  saisie: ObjectifSaisie,
  themesDeLAgent: Pick<Theme, "code" | "nom">[],
  maintenant: Date
): ObjectifEnregistre {
  return {
    ...saisie,
    indicateur: rattacherIndicateur(saisie.quoi, themesDeLAgent),
    echeance: calculerEcheance(maintenant, saisie.delaiMois),
  };
}

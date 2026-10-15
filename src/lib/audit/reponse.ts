// Les quatre réponses possibles pour un chiffre (CLAUDE.md section 6) et les règles
// de robustesse du moteur qui en découlent (section 7).
//
//   exact       : « 32 »
//   estimation  : « entre 30 et 40 » ; le moteur prend le milieu, marqué « estimé »
//   inconnu     : « je ne sais pas » ; retiré du calcul, question de repli, complétable
//   non_suivi   : « je ne suis pas cette donnée » ; retiré du calcul, enregistré comme
//                 absence de suivi
//
// 0, inconnu et non applicable sont trois choses distinctes : un « je ne sais pas »
// n'est jamais transformé en zéro. Aucune question n'est obligatoire : une question
// sautée n'a simplement pas de réponse.
//
// Ce fichier n'importe que zod : il se teste directement avec Node.

import { z } from "zod";

const nombre = z.number().finite("Entrez un nombre.");

export const reponseSchema = z.discriminatedUnion("genre", [
  z.object({ genre: z.literal("exact"), valeur: nombre }),
  z
    .object({ genre: z.literal("estimation"), min: nombre, max: nombre })
    .refine((r) => r.min <= r.max, { message: "Le minimum doit être inférieur ou égal au maximum." }),
  z.object({ genre: z.literal("inconnu") }),
  z.object({ genre: z.literal("non_suivi") }),
  // Réponse qui n'est pas un chiffre (oui / non, choix, texte) : les quatre réponses
  // ne s'y appliquent pas, la valeur est gardée telle quelle.
  z.object({
    genre: z.literal("saisie"),
    valeur: z.union([z.string().max(2000), z.boolean(), z.array(z.string().max(200)).max(50)]),
  }),
  // Plusieurs valeurs (plusieurs champs, ou un tableau : « ligne.colonne » → valeur).
  z.object({
    genre: z.literal("valeurs"),
    valeurs: z
      .record(z.string().max(100), z.union([z.number().finite(), z.string().max(2000), z.boolean(), z.array(z.string().max(200)).max(50), z.null()]))
      .refine((v) => Object.keys(v).length <= 400, { message: "Trop de valeurs." }),
  }),
]);
export type Reponse = z.infer<typeof reponseSchema>;

// Réponses d'un compte : code de donnée (ou clé de déclencheur) → réponse.
export type Reponses = Record<string, Reponse | undefined>;

export type ValeurRetenue = { valeur: number; estimee: boolean };

// Ce que le moteur peut utiliser dans un calcul. Rien pour une question sautée, un
// « je ne sais pas » ou un « je ne suis pas cette donnée » : jamais zéro.
export function valeurRetenue(reponse: Reponse | undefined): ValeurRetenue | null {
  if (!reponse) return null;
  if (reponse.genre === "exact") return { valeur: reponse.valeur, estimee: false };
  if (reponse.genre === "estimation") return { valeur: (reponse.min + reponse.max) / 2, estimee: true };
  return null;
}

// « Je ne sais pas » et « je ne suis pas cette donnée » comptent, avec la question
// sautée, comme des questions sans réponse (règle des 50 % d'un thème).
export function aUneReponse(reponse: Reponse | undefined): boolean {
  if (!reponse) return false;
  if (reponse.genre === "inconnu" || reponse.genre === "non_suivi") return false;
  if (reponse.genre === "valeurs") {
    return Object.values(reponse.valeurs).some((v) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
  }
  if (reponse.genre === "saisie") {
    const v = reponse.valeur;
    return typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : true;
  }
  return true;
}

// Un « je ne sais pas » appelle une question de repli et peut être complété plus tard.
export function appelleUnRepli(reponse: Reponse | undefined): boolean {
  return reponse?.genre === "inconnu";
}

// Formats du classeur pour lesquels les quatre réponses ont un sens : un chiffre, un
// montant, un pourcentage, une durée. Heuristique sur le libellé du format, à
// remplacer par une colonne explicite si le classeur en reçoit une.
const FORMATS_NON_CHIFFRES =
  /^(liste|choix|texte|oui|toujours|régulièrement|cases|grille|case|tranches|sur 10|mois et année|recruté|connecté|poste|date|nombre ou tranche|part estimée)/i;
export function accepteLesQuatreReponses(format: string | null): boolean {
  if (!format) return false;
  return !FORMATS_NON_CHIFFRES.test(format.trim());
}

// Format d'une seule valeur (un montant, un pourcentage, un nombre, une durée) : le
// dirigeant peut donner un chiffre exact ou une fourchette. Les autres formats
// (tableaux, plusieurs valeurs, choix) sont saisis tels quels.
const FORMATS_SCALAIRES = /^(€|%|Nombre|Jours|Heures|Semaines|Mois|Années|km|€ par heure|Points de %)$/;
export function estScalaire(format: string | null): boolean {
  return format !== null && FORMATS_SCALAIRES.test(format.trim());
}

// --- Règle des 50 % -----------------------------------------------------------

export type CouvertureTheme = {
  posees: number;
  repondues: number;
  part: number;
  // Un thème n'est noté que si au moins la moitié de ses questions ont une réponse.
  evaluable: boolean;
};

export function couvertureTheme(codesPoses: string[], reponses: Reponses): CouvertureTheme {
  const posees = codesPoses.length;
  const repondues = codesPoses.filter((c) => aUneReponse(reponses[c])).length;
  const part = posees === 0 ? 0 : repondues / posees;
  return { posees, repondues, part, evaluable: posees > 0 && part >= 0.5 };
}

// --- Règle du quart -----------------------------------------------------------

export type BilanNonSuivi = {
  essentielles: number;
  nonSuivies: number;
  part: number;
  // Au-delà d'un quart des données essentielles marquées « je ne suis pas cette
  // donnée », un conseil général de pilotage est ajouté (sans remplacer les autres).
  conseilPilotage: boolean;
  // Les données à suivre, pour que le conseil les liste.
  aSuivre: string[];
};

export function bilanNonSuivi(codesEssentiels: string[], reponses: Reponses): BilanNonSuivi {
  const aSuivre = codesEssentiels.filter((c) => reponses[c]?.genre === "non_suivi");
  const part = codesEssentiels.length === 0 ? 0 : aSuivre.length / codesEssentiels.length;
  return {
    essentielles: codesEssentiels.length,
    nonSuivies: aSuivre.length,
    part,
    conseilPilotage: part > 0.25,
    aSuivre,
  };
}

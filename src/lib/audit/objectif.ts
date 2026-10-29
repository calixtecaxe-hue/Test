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

export const DELAI_MAX_MOIS = 120;
// Formulation finale d'un objectif composé de plusieurs propositions (demande du 29 octobre).
export const FORMULATION_MAX = 400;

const ampleurSchema = z.object({
  valeur: z
    .number({ message: "Indiquez de combien." })
    .finite("Indiquez de combien.")
    .positive("Indiquez un nombre supérieur à zéro."),
  unite: z.enum(UNITES_AMPLEUR, { message: "Choisissez l'unité." }),
});
export type Ampleur = z.infer<typeof ampleurSchema>;
const reussiteSchema = z.string().trim().min(3, "Décrivez ce que vous voulez constater.").max(200, "Résumez en une phrase.");
const partieSchema = z.string().trim().max(80);
const delaiSchema = z
  .number({ message: "Indiquez en combien de temps." })
  .int("Indiquez un nombre entier de mois.")
  .min(1, "Le délai est d'au moins 1 mois.")
  .max(DELAI_MAX_MOIS, `Le délai ne dépasse pas ${DELAI_MAX_MOIS} mois.`);

export const objectifSaisieSchema = z
  .object({
  quoi: z
    .string()
    .trim()
    .min(3, "Dites ce que vous voulez changer, par exemple « baisser le turnover ».")
    .max(160, "Résumez en quelques mots ce que vous voulez changer."),
  // Facultatif pour les agents dont l'objectif n'a pas forcément de chiffre (RH, Comm) : alors la phrase de réussite le remplace.
  ampleur: ampleurSchema.optional(),
  // Ce que le dirigeant veut constater quand c'est atteint (objectif sans chiffre).
  reussite: reussiteSchema.optional(),
  // Objectif choisi dans la liste proposée pour l'agent (data/objectifs-agents.json) ; absent pour « Autre » ou un objectif libre.
  choix: z.string().regex(/^[a-z0-9-]+$/).max(60).optional(),
  // Partie de la liste où l'objectif a été pris (Comm : « Améliorer ce que j'ai déjà » ou « Mettre en place ma présence en
  // ligne ») ; pour « Autre (précisez) », c'est la seule trace de la partie choisie.
  partie: partieSchema.optional(),
  delaiMois: delaiSchema,
  })
  .refine((o) => o.ampleur !== undefined || o.reussite !== undefined, { message: "Indiquez un chiffre, ou décrivez ce que vous voulez constater.", path: ["reussite"] });
export type ObjectifSaisie = z.infer<typeof objectifSaisieSchema>;

// Objectif composé (RH, Comm ; demande du propriétaire du 29 octobre) : une ou plusieurs propositions de la liste, chacune
// avec son chiffre facultatif, un seul délai, ce que le dirigeant veut constater (demandé quand aucune proposition n'a de
// chiffre) et la formulation finale, proposée par le code et modifiable par le dirigeant. Pas d'objectif principal ni de
// sous-objectifs : les propositions retenues forment un seul objectif.
export const objectifCompositionSchema = z.object({
  mode: z.literal("composition"),
  composition: z
    .array(z.object({ choix: z.string().regex(/^[a-z0-9-]+$/).max(60), ampleur: ampleurSchema.optional() }))
    .min(1, "Retenez au moins une proposition.")
    .max(60),
  formulation: z.string().trim().min(3, "Écrivez la formulation de votre objectif, ou reprenez celle qui vous est proposée.").max(FORMULATION_MAX, `La formulation ne dépasse pas ${FORMULATION_MAX} caractères.`).optional(),
  reussite: reussiteSchema.optional(),
  partie: partieSchema.optional(),
  delaiMois: delaiSchema,
});
export type ObjectifComposition = z.infer<typeof objectifCompositionSchema>;

// D'où vient un objectif : une proposition de la liste de l'agent (RH, Comm), un objectif écrit par le dirigeant
// (« Écrire mon objectif »), ou les trois champs libres (Acquisition, Finance).
export type OrigineObjectif = "proposition" | "personnel" | "libre";
// Comment l'objectif a été défini (RH, Comm, 29 octobre) : écrit par le dirigeant, ou composé à partir des propositions
// (« proposition » est alors son origine). Acquisition et Finance n'ont pas de mode.
export type ModeObjectif = "personnel" | "composition";

// Une proposition retenue dans un objectif composé : son identifiant, son titre au moment du choix, son chiffre facultatif
// et sa partie de la phrase (« obtenir 10 nouveaux avis clients »).
export type ComposanteObjectif = { choix: string; libelle: string; ampleur?: Ampleur; phrase: string };
// Formulation d'un objectif composé : celle que le code propose (les phrases des propositions, rien d'autre), celle qui est
// enregistrée, et si le dirigeant l'a modifiée.
export type FormulationObjectif = { proposee: string; finale: string; modifiee: boolean };

// Ce qui est enregistré : la saisie, son origine, l'indicateur rattaché (ou rien) et l'échéance. Les objectifs enregistrés
// avant le 28 octobre n'ont pas d'origine : elle se déduit de `choix` (origineDe). Ceux d'avant le 29 octobre n'ont ni
// mode ni composition : une proposition seule se lit comme un objectif composé d'une proposition (composantesDe).
export type ObjectifEnregistre = ObjectifSaisie & {
  origine?: OrigineObjectif;
  mode?: ModeObjectif;
  composition?: ComposanteObjectif[];
  formulation?: FormulationObjectif;
  indicateur: { code: string; nom: string } | null;
  echeance: string; // AAAA-MM-JJ
};

export function origineDe(o: Pick<ObjectifEnregistre, "origine" | "choix">, avecListe: boolean): OrigineObjectif {
  return o.origine ?? (o.choix ? "proposition" : avecListe ? "personnel" : "libre");
}

// Phrase écrite à l'avance pour un objectif chiffré : « obtenir {n} nouveaux avis clients », « gagner {n} abonnés {dici} ».
// `{dici}` place « d'ici N mois » ; sans lui, « sur les N prochains mois » est ajouté à la fin.
export type GabaritObjectif = { singulier: string; pluriel: string };

const LIBELLE_UNITE: Record<UniteAmpleur, string> = { pourcent: "%", euros: "€", unites: "" };

export function formaterNombre(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

// « baisser le turnover de 5 % sur les 3 prochains mois » ; avec une phrase écrite à l'avance : « obtenir 10 nouveaux avis
// clients sur les 3 prochains mois », « libérer 5 heures par semaine pour piloter l'entreprise d'ici 3 mois ». Sans chiffre :
// « clarifier qui fait quoi, d'ici 3 mois » (ce que le dirigeant veut constater se garde à part).
export function phraseObjectif(o: ObjectifSaisie, gabarit?: GabaritObjectif): string {
  const dici = `d'ici ${o.delaiMois} mois`;
  if (!o.ampleur) return `${o.quoi.replace(/[.\s]+$/, "")}, ${dici}`;
  const sur = o.delaiMois === 1 ? "sur le mois prochain" : `sur les ${o.delaiMois} prochains mois`;
  if (gabarit) {
    const forme = (o.ampleur.valeur === 1 ? gabarit.singulier : gabarit.pluriel).replace("{n}", formaterNombre(o.ampleur.valeur));
    return forme.includes("{dici}") ? forme.replace("{dici}", dici) : `${forme} ${sur}`;
  }
  const unite = LIBELLE_UNITE[o.ampleur.unite];
  const ampleur = `${formaterNombre(o.ampleur.valeur)}${unite ? ` ${unite}` : ""}`;
  return `${o.quoi.replace(/[.\s]+$/, "")} de ${ampleur} ${sur}`;
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

// `themesChoisis` : les thèmes de l'objectif choisi dans la liste de l'agent ; le premier sert d'indicateur. Un objectif composé
// de plusieurs propositions n'a pas d'indicateur unique (chaque proposition garde ses thèmes) : rien n'est rattaché d'après
// son texte.
export function enregistrerObjectif(
  saisie: ObjectifSaisie,
  themesDeLAgent: Pick<Theme, "code" | "nom">[],
  maintenant: Date,
  themesChoisis: string[] = [],
  origine?: OrigineObjectif,
  complement: { mode?: ModeObjectif; composition?: ComposanteObjectif[]; formulation?: FormulationObjectif } = {}
): ObjectifEnregistre {
  const choisi = themesChoisis.length > 0 ? themesDeLAgent.find((t) => t.code === themesChoisis[0]) : undefined;
  const plusieurs = (complement.composition?.length ?? 0) > 1;
  return {
    ...saisie,
    ...(origine ? { origine } : {}),
    ...(complement.mode ? { mode: complement.mode } : {}),
    ...(complement.composition ? { composition: complement.composition } : {}),
    ...(complement.formulation ? { formulation: complement.formulation } : {}),
    indicateur: choisi ? { code: choisi.code, nom: choisi.nom } : plusieurs ? null : rattacherIndicateur(saisie.quoi, themesDeLAgent),
    echeance: calculerEcheance(maintenant, saisie.delaiMois),
  };
}

// --- Vraisemblance ---------------------------------------------------------------------------
//
// Un objectif en pourcentage dépend de son délai : +300 % en 10 ans est modeste, +300 % en
// 3 mois est impossible. On ramène l'objectif à une année (changement composé) et on le
// compare à la limite de data/objectif-limites.json (facteur annuel maximal). Ce n'est pas
// le jugement du moteur sur le réalisme (il se fera avec les chiffres du dirigeant) : c'est
// seulement ce qui écarte l'impossible. Les objectifs en euros ou en nombre n'ont pas de
// valeur de départ connue ici : ils ne sont pas comparés.

export type Sens = "hausse" | "baisse" | "inconnu";

const VERBES_BAISSE = ["baisser", "reduire", "diminuer", "limiter", "raccourcir", "descendre", "abaisser", "alleger", "contenir", "eviter"];
const VERBES_HAUSSE = ["augmenter", "accroitre", "gagner", "doubler", "tripler", "ameliorer", "developper", "monter", "accelerer", "hausser", "progresser", "gonfler"];

// Sens du changement, lu dans les mots du dirigeant : le premier verbe reconnu l'emporte.
export function sensDeLObjectif(quoi: string): Sens {
  const mots = sansAccents(quoi).split(/[^a-z]+/).filter(Boolean);
  for (const m of mots) {
    if (VERBES_BAISSE.some((v) => m === v || m.startsWith(v.slice(0, Math.max(5, v.length - 2))))) return "baisse";
    if (VERBES_HAUSSE.some((v) => m === v || m.startsWith(v.slice(0, Math.max(5, v.length - 2))))) return "hausse";
  }
  return "inconnu";
}

export type Vraisemblance = { ok: true } | { ok: false; message: string; champ: "ampleur" | "delaiMois" };

function entier(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

export function verifierVraisemblance(o: ObjectifSaisie, facteurAnnuelMax: number): Vraisemblance {
  // Sans chiffre, ou en euros ou en nombre : rien à comparer.
  if (!o.ampleur || o.ampleur.unite !== "pourcent") return { ok: true };
  const p = o.ampleur.valeur / 100;
  const baisse = sensDeLObjectif(o.quoi) === "baisse";
  if (baisse && p >= 1) {
    return { ok: false, champ: "ampleur", message: "Une baisse de 100 % ou plus supprimerait entièrement l'indicateur. Fixez une baisse plus mesurée." };
  }
  const facteur = baisse ? 1 - p : 1 + p;
  const tempoAnnuel = (Math.abs(Math.log(facteur)) * 12) / o.delaiMois;
  const limite = Math.log(facteurAnnuelMax);
  if (tempoAnnuel <= limite + 1e-9) return { ok: true };

  const signe = baisse ? "−" : "+";
  // Ce qui serait accepté : l'ampleur maximale sur ce délai, ou le délai minimal pour cette ampleur.
  const pMax = baisse ? (1 - Math.pow(facteurAnnuelMax, -o.delaiMois / 12)) * 100 : (Math.pow(facteurAnnuelMax, o.delaiMois / 12) - 1) * 100;
  const moisMin = Math.ceil((Math.abs(Math.log(facteur)) * 12) / limite - 1e-9);
  const delai = o.delaiMois === 1 ? "1 mois" : `${o.delaiMois} mois`;
  const maxTexte = pMax >= 1 ? `${signe}${entier(Math.floor(pMax))} %` : `${signe}${(Math.floor(pMax * 10) / 10).toLocaleString("fr-FR")} %`;
  return {
    ok: false,
    champ: "delaiMois",
    message: `${signe}${formaterNombre(o.ampleur.valeur)} % en ${delai} dépasse ce qu'une entreprise peut atteindre. Sur ${delai}, le maximum retenu est ${maxTexte} ; pour ${signe}${formaterNombre(o.ampleur.valeur)} %, prévoyez au moins ${moisMin} mois.`,
  };
}

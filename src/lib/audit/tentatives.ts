// Ce que le dirigeant a déjà essayé pour atteindre l'objectif d'un agent (décisions du 29 octobre ; textes dans
// data/deja-tente.json). Posée juste après l'objectif, dans chaque agent. Les réponses n'entrent jamais dans le calcul : elles
// sont lues par le rapport et le plan d'action, qui ne reproposent pas tel quel ce qui n'a rien donné.
//
// Forme enregistrée (colonne Objectif.tentatives, rattachée à un objectif précis) :
//   { etat: "essaye", texte, resultat, duree, reprisDe? }   ce qui a été essayé, en texte libre, et deux précisions facultatives ;
//   { etat: "rien", texte? }                                  « Je n'ai encore rien essayé » (un texte écrit avant reste gardé, sans compter) ;
//   null                                                      la question n'a pas de réponse : ce n'est jamais « rien essayé ».
// `reprisDe` : l'objectif remplacé dont la réponse a été reprise, avec l'accord du dirigeant.
//
// Ce fichier n'importe que zod et des types : il se teste directement avec Node.

import { z } from "zod";
import type { DejaTente } from "../donnees/schemas.ts";

export type Tentatives =
  | { etat: "essaye"; texte: string; resultat: string | null; duree: string | null; reprisDe?: string }
  | { etat: "rien"; texte?: string; reprisDe?: string };

export function schemaTentatives(def: DejaTente) {
  const resultats = def.precisions.resultat.options.map((o) => o.id) as [string, ...string[]];
  const durees = def.precisions.duree.options.map((o) => o.id) as [string, ...string[]];
  const texte = z.string().max(def.longueurMax, `Écrivez ${def.longueurMax} caractères au plus.`);
  const reprisDe = z.string().regex(/^[a-z0-9]{10,40}$/).optional();
  return z.discriminatedUnion("etat", [
    z.object({ etat: z.literal("essaye"), texte, resultat: z.enum(resultats).nullable(), duree: z.enum(durees).nullable(), reprisDe }),
    z.object({ etat: z.literal("rien"), texte: texte.optional(), reprisDe }),
  ]);
}

export type Verdict = { ok: true; tentatives: Tentatives } | { ok: false; message: string };

const net = (t: string) => t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

// Contrôle d'une réponse reçue (serveur) : la forme, les choix, la longueur ; le texte est nettoyé de ses espaces en trop.
export function validerTentatives(def: DejaTente, brut: unknown): Verdict {
  const r = schemaTentatives(def).safeParse(brut);
  if (!r.success) return { ok: false, message: r.error.issues[0]?.message ?? "Réponse invalide." };
  const t = r.data;
  return { ok: true, tentatives: t.etat === "essaye" ? { ...t, texte: net(t.texte) } : { ...t, ...(t.texte !== undefined ? { texte: net(t.texte) } : {}) } };
}

// Lecture d'une valeur gardée en base : la forme actuelle, ou celle du premier essai du 29 octobre ({ deja, actions }), jamais
// une erreur à l'affichage.
export function lireTentatives(def: DejaTente, valeur: unknown): Tentatives | null {
  if (valeur === null || valeur === undefined) return null;
  const v = valeur as { deja?: unknown; actions?: { quoi?: string; resultat?: string | null; duree?: string | null }[] };
  if (v && typeof v === "object" && "deja" in v) {
    const actions = (v.actions ?? []).filter((a) => typeof a?.quoi === "string" && a.quoi.trim() !== "");
    if (v.deja === "non") return { etat: "rien" };
    if (v.deja === "oui") return lireTentatives(def, { etat: "essaye", texte: actions.map((a) => a.quoi).join("\n"), resultat: actions[0]?.resultat ?? null, duree: actions[0]?.duree ?? null });
    return null;
  }
  const r = validerTentatives(def, valeur);
  return r.ok ? r.tentatives : null;
}

export type TentativesTransmises =
  | { statut: "sans_reponse" }
  | { statut: "rien_essaye" }
  | { statut: "essaye"; texte: string; resultat: string | null; duree: string | null };

// Ce que reçoivent le compte rendu et l'IA, avec les libellés. Une question sans réponse ne dit jamais que rien n'a été essayé.
export function tentativesTransmises(def: DejaTente, t: Tentatives | null): TentativesTransmises {
  if (!t) return { statut: "sans_reponse" };
  if (t.etat === "rien") return { statut: "rien_essaye" };
  if (t.texte.trim() === "") return { statut: "sans_reponse" };
  const libelle = (options: { id: string; libelle: string }[], id: string | null) => (id ? options.find((o) => o.id === id)?.libelle ?? null : null);
  return { statut: "essaye", texte: t.texte, resultat: libelle(def.precisions.resultat.options, t.resultat), duree: libelle(def.precisions.duree.options, t.duree) };
}

// Phrase courte pour l'historique et la proposition de reprise.
export function resumeTentatives(def: DejaTente, t: Tentatives | null): string | null {
  const x = tentativesTransmises(def, t);
  if (x.statut === "sans_reponse") return null;
  if (x.statut === "rien_essaye") return def.rien;
  return [x.texte, x.resultat ? `(${x.resultat.charAt(0).toLowerCase()}${x.resultat.slice(1)})` : null].filter(Boolean).join(" ");
}

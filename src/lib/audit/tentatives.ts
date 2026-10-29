// Ce que le dirigeant a déjà essayé pour atteindre l'objectif d'un agent (décision du 29 octobre ; textes dans
// data/deja-tente.json). Posée au début de chaque agent, une fois l'objectif fixé. Les réponses n'entrent jamais dans le calcul :
// elles sont du contexte pour l'IA du rapport, qui ne propose pas tel quel ce qui n'a pas donné de résultat, et distingue
// « ça n'a pas marché » de « je l'ai arrêté avant de voir le résultat ».
//
// Forme enregistrée (colonne Objectif.tentatives) : { deja: "oui" | "non", actions: [{ quoi, resultat, duree }] }.
// Avec « non », les actions déjà écrites restent gardées mais ne comptent plus (même principe que les réponses actives) :
// elles reviennent si le dirigeant répond de nouveau « oui ».
//
// Ce fichier n'importe que zod et des types : il se teste directement avec Node.

import { z } from "zod";
import type { DejaTente } from "../donnees/schemas.ts";

export type ActionTentee = { quoi: string; resultat: string | null; duree: string | null };
export type Tentatives = { deja: "oui" | "non"; actions: ActionTentee[] };

export function schemaTentatives(def: DejaTente) {
  const resultats = def.resultat.options.map((o) => o.id) as [string, ...string[]];
  const durees = def.duree.options.map((o) => o.id) as [string, ...string[]];
  return z.object({
    deja: z.enum(["oui", "non"]),
    actions: z
      .array(
        z.object({
          quoi: z.string().max(def.action.longueurMax, `Écrivez ${def.action.longueurMax} caractères au plus.`),
          resultat: z.enum(resultats).nullable(),
          duree: z.enum(durees).nullable(),
        })
      )
      .max(def.action.max, `${def.action.max} actions au plus.`),
  });
}

export type Verdict = { ok: true; tentatives: Tentatives } | { ok: false; message: string };

// Contrôle d'une réponse reçue (serveur) : la forme, les choix, la longueur ; le texte est nettoyé de ses espaces en trop.
export function validerTentatives(def: DejaTente, brut: unknown): Verdict {
  const r = schemaTentatives(def).safeParse(brut);
  if (!r.success) return { ok: false, message: r.error.issues[0]?.message ?? "Réponse invalide." };
  return { ok: true, tentatives: { deja: r.data.deja, actions: r.data.actions.map((a) => ({ ...a, quoi: a.quoi.replace(/\s+/g, " ").trim() })) } };
}

// Lecture d'une valeur gardée en base : rien si elle n'a pas la forme attendue (jamais d'erreur à l'affichage).
export function lireTentatives(def: DejaTente, valeur: unknown): Tentatives | null {
  const r = validerTentatives(def, valeur);
  return r.ok ? r.tentatives : null;
}

export type TentativeTransmise = { quoi: string; resultat: string | null; duree: string | null };

// Ce que reçoivent le compte rendu et l'IA : seulement avec « oui », seulement les actions décrites, avec les libellés.
// « non » : rien n'a été essayé. null : la question n'a pas de réponse.
export function tentativesTransmises(def: DejaTente, t: Tentatives | null): { deja: boolean | null; actions: TentativeTransmise[] } {
  if (!t) return { deja: null, actions: [] };
  if (t.deja === "non") return { deja: false, actions: [] };
  const libelle = (options: { id: string; libelle: string }[], id: string | null) => (id ? options.find((o) => o.id === id)?.libelle ?? null : null);
  return {
    deja: true,
    actions: t.actions.filter((a) => a.quoi.trim() !== "").map((a) => ({ quoi: a.quoi, resultat: libelle(def.resultat.options, a.resultat), duree: libelle(def.duree.options, a.duree) })),
  };
}

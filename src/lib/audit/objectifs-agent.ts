// Objectifs d'un agent enregistrés ensemble (décision du propriétaire, 27 octobre) : RH et Comm acceptent plusieurs
// objectifs à la fois, chacun complet (son chiffre ou ce que le dirigeant veut constater, son délai, son avancement) ;
// Acquisition et Finance gardent un seul objectif. Quand la liste de l'agent a des parties (Comm : « Améliorer ce que
// j'ai déjà », « Mettre en place ma présence en ligne »), tous les objectifs viennent de la même partie.
//
// Contrôle commun à la route de l'application et à l'aperçu. Ce fichier n'importe que zod et des types.

import { objectifSaisieSchema, verifierVraisemblance, type ObjectifSaisie } from "./objectif.ts";
import type { ObjectifAgent } from "../donnees/schemas.ts";

// Garde-fou technique : au-delà, le suivi perd son sens. À ajuster par le propriétaire.
export const MAX_OBJECTIFS = 10;

export type ObjectifControle = { saisie: ObjectifSaisie; choisi: ObjectifAgent | undefined };
export type ControleObjectifs = { ok: true; objectifs: ObjectifControle[] } | { ok: false; erreur: string; champ?: string; rang?: number };

const cleTexte = (t: string) => t.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");

// `liste` : objectifs proposés pour l'agent (null : objectif libre en trois champs, un seul).
export function controlerObjectifs(saisies: unknown[], liste: ObjectifAgent[] | null, facteurAnnuelMax: number): ControleObjectifs {
  if (saisies.length === 0) return { ok: false, erreur: "Choisissez au moins un objectif.", champ: "choix" };
  if (!liste && saisies.length > 1) return { ok: false, erreur: "Cet agent suit un seul objectif à la fois.", champ: "choix" };
  if (saisies.length > MAX_OBJECTIFS) return { ok: false, erreur: `${MAX_OBJECTIFS} objectifs au plus.`, champ: "choix" };
  const parties = liste ? [...new Set(liste.map((o) => o.groupe ?? ""))].filter((g) => g !== "") : [];
  const objectifs: ObjectifControle[] = [];
  for (const [rang, brut] of saisies.entries()) {
    const r = objectifSaisieSchema.safeParse(brut);
    if (!r.success) {
      const premier = r.error.issues[0];
      return { ok: false, erreur: premier?.message ?? "Objectif invalide.", champ: String(premier?.path[0] ?? ""), rang };
    }
    const saisie = r.data;
    const choisi = saisie.choix ? liste?.find((o) => o.id === saisie.choix) : undefined;
    if (saisie.choix && !choisi) return { ok: false, erreur: "Cet objectif n'est pas proposé pour cet agent.", champ: "choix", rang };
    if (choisi && saisie.partie !== undefined && saisie.partie !== (choisi.groupe ?? "")) return { ok: false, erreur: "Cet objectif n'appartient pas à cette partie de la liste.", champ: "choix", rang };
    if (!choisi && saisie.partie !== undefined && !parties.includes(saisie.partie)) return { ok: false, erreur: "Cette partie de la liste n'existe pas.", champ: "choix", rang };
    const v = verifierVraisemblance(saisie, facteurAnnuelMax);
    if (!v.ok) return { ok: false, erreur: v.message, champ: v.champ, rang };
    objectifs.push({ saisie: { ...saisie, ...(choisi?.groupe ? { partie: choisi.groupe } : {}) }, choisi });
  }
  // Deux fois le même objectif : refusé.
  const choix = objectifs.map((o) => o.saisie.choix).filter((c): c is string => c !== undefined);
  if (new Set(choix).size !== choix.length) return { ok: false, erreur: "Le même objectif est choisi deux fois.", champ: "choix" };
  const libres = objectifs.filter((o) => !o.choisi).map((o) => cleTexte(o.saisie.quoi));
  if (new Set(libres).size !== libres.length) return { ok: false, erreur: "Le même objectif est écrit deux fois.", champ: "quoi" };
  // Une liste en parties : un seul parcours à la fois.
  if (parties.length > 0) {
    const vues = new Set(objectifs.map((o) => o.saisie.partie).filter((p): p is string => p !== undefined));
    if (vues.size > 1) return { ok: false, erreur: `Choisissez vos objectifs dans une seule partie : « ${[...vues].join(" » ou « ")} ».`, champ: "choix" };
  }
  return { ok: true, objectifs };
}

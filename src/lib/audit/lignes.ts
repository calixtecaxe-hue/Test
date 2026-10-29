// Lignes d'un tableau à l'écran : le dirigeant ajoute ou retire des lignes numérotées (« Offre 1… », jusqu'à 10) ou
// libres ; un tableau qui reprend les lignes d'un autre (« chacune de ces offres ») les suit. Fonctions pures, testées.
//
// Les identifiants ne changent jamais : retirer « offre_2 » laisse « offre_1 » et « offre_3 », affichées « Offre 1 » et
// « Offre 2 » ; les tableaux qui suivent ces lignes gardent ainsi leurs réponses ligne à ligne.

import { groupesNumerotes, idNumerote, MAX_LIGNES_NUMEROTEES, type ReponseSpec } from "../donnees/reponse-spec.ts";

type Tableau = Extract<ReponseSpec, { type: "tableau" }>;

// Un groupe de lignes que le dirigeant règle : « Offre », « Meilleure », ou les lignes libres (sans nom de groupe).
export type GroupeLignes = { base: string; libelle: string; max: number; parDefaut: number };

export function groupesReglables(spec: Tableau): GroupeLignes[] | null {
  if (spec.lignes.source === "libre") return [{ base: "", libelle: "Ligne", max: spec.lignes.max, parDefaut: 1 }];
  if (spec.lignes.source !== "fixe") return null;
  const g = groupesNumerotes(spec.lignes.items);
  return g ? g.map((x) => ({ base: x.base, libelle: x.libelle, max: MAX_LIGNES_NUMEROTEES, parDefaut: x.parDefaut })) : null;
}

export function idDeLigne(g: GroupeLignes, n: number): string {
  return g.base === "" ? String(n) : idNumerote({ base: g.base, libelle: g.libelle, parDefaut: g.parDefaut }, n);
}

function numero(g: GroupeLignes, id: string): number | null {
  const reste = g.base === "" ? id : id.startsWith(`${g.base}_`) ? id.slice(g.base.length + 1) : null;
  if (reste === null || !/^\d+$/.test(reste)) return null;
  const n = Number(reste);
  return n >= 1 && n <= g.max ? n : null;
}

// Lignes qui ont au moins une case remplie (« offre_2.prix » → « offre_2 »).
export function lignesRemplies(valeurs: Record<string, unknown>): Set<string> {
  const remplies = new Set<string>();
  for (const [cle, v] of Object.entries(valeurs)) {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0)) continue;
    if (cle.includes(".")) remplies.add(cle.slice(0, cle.lastIndexOf(".")));
  }
  return remplies;
}

// Lignes affichées : celles qui ont une valeur, dans l'ordre des numéros, au moins une par groupe. Sans aucune valeur,
// les lignes écrites dans la banque (« Offre 1, 2, 3 »).
export function lignesInitiales(groupes: GroupeLignes[], valeurs: Record<string, unknown>): string[][] {
  const remplies = lignesRemplies(valeurs);
  return groupes.map((g) => {
    const ids = [...remplies].filter((id) => numero(g, id) !== null).sort((a, b) => numero(g, a)! - numero(g, b)!);
    if (remplies.size === 0) return Array.from({ length: g.parDefaut }, (_, i) => idDeLigne(g, i + 1));
    return ids.length > 0 ? ids : [idDeLigne(g, 1)];
  });
}

// Ligne ajoutée : le numéro qui suit le plus grand déjà employé (ici ou dans les tableaux qui suivent ces lignes), pour
// qu'une ligne retirée ne revienne pas avec les réponses d'une autre ; au-delà du maximum, le premier numéro libre.
export function ajouterLigne(g: GroupeLignes, ids: string[], employes: Iterable<string> = []): string[] {
  if (ids.length >= g.max) return ids;
  const pris = [...ids, ...employes].map((id) => numero(g, id)).filter((n): n is number => n !== null);
  const suivant = Math.max(0, ...pris) + 1;
  if (suivant <= g.max) return [...ids, idDeLigne(g, suivant)];
  for (let n = 1; n <= g.max; n++) if (!ids.includes(idDeLigne(g, n))) return [...ids, idDeLigne(g, n)];
  return ids;
}

// Les cases d'une ligne retirée.
export function sansLigne<T>(valeurs: Record<string, T>, id: string): Record<string, T> {
  return Object.fromEntries(Object.entries(valeurs).filter(([cle]) => !cle.startsWith(`${id}.`)));
}

// Tableau qui suit les lignes d'un autre : la première question suivie qui a une réponse en tableau.
export function questionMeneuse<R extends { genre: string }>(codes: string[], reponses: Record<string, R | undefined>): string | null {
  return codes.find((c) => reponses[c]?.genre === "valeurs" && lignesRemplies((reponses[c] as unknown as { valeurs: Record<string, unknown> }).valeurs).size > 0) ?? null;
}

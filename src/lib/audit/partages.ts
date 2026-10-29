// Données partagées entre agents (CLAUDE.md section 6 : posées une seule fois, jamais redemandées).
//
// Le classeur lie une donnée « partagée » aux données d'autres agents (colonne « Données utilisées »). Ces liens sont de trois
// sortes, décrites dans data/partages.json :
//   - jumelles : la même question chez deux agents (même texte, même réponse) ; une réponse vaut pour les deux ;
//   - correspondances : une partie d'une question (un champ, une colonne ou une ligne d'un tableau) est la réponse d'une autre.
//     Une question entièrement couverte par des réponses déjà données n'est pas reposée ; couverte en partie, elle s'affiche avec
//     les valeurs connues reprises, que le dirigeant vérifie et complète ;
//   - pas des partages : la donnée sert seulement à calculer l'autre (capacité, heures…) ; les deux questions sont posées.
// Le contrôle des données refuse un lien du classeur qui n'est ni une jumelle exacte ni décrit dans data/partages.json.
//
// Ce fichier n'importe que des fonctions pures : il se teste directement avec Node.

import type { EnsembleDonnees, ProfilId } from "../donnees/schemas.ts";
import type { ReponseSpec } from "../donnees/reponse-spec.ts";
import { formuler } from "../donnees/lexique.ts";
import type { Reponse, Reponses } from "./reponse.ts";

type Base = Pick<EnsembleDonnees, "donnees" | "prereponses" | "partages" | "banque" | "lexique">;

// Mots avec lesquels un compte lit les questions : ses profils et le vocabulaire de son métier.
export type Formulation = { profils: ProfilId[]; vocabulaire: string | null };

// Une partie d'une question : toute la réponse (chemin vide), un champ, une case « ligne.colonne », ou une colonne « *.colonne ».
export type Cote = { code: string; chemin: string };
export type Correspondance = { de: Cote; vers: Cote };

// Valeurs d'une réponse à plat : "" pour un chiffre exact ou un choix, sinon les clés d'un tableau ou d'un groupe de champs.
export type Plat = Record<string, number | string>;

export type Reprise = { valeurs: Plat; sources: string[] };

export type LecturePartagee = {
  // Réponse qui vaut pour cette question : la sienne, celle d'une jumelle, ou celle que composent des correspondances complètes.
  reponse(code: string): Reponse | undefined;
  // D'où vient une réponse qui n'est pas la sienne (vide si elle a sa propre réponse ou aucune).
  sources(code: string): string[];
  // Question couverte en partie par des réponses déjà données : les valeurs connues, à reprendre dans le formulaire.
  reprise(code: string): Reprise | null;
  // Correspondances orientées vers cette question (elle est la partie « vers »).
  parties(code: string): readonly Correspondance[];
};

const cote = (cle: string): Cote => {
  const i = cle.indexOf("#");
  return i < 0 ? { code: cle, chemin: "" } : { code: cle.slice(0, i), chemin: cle.slice(i + 1) };
};

// Paires du classeur entre deux questions posées : une donnée partagée et chacune de ses « Données utilisées ».
export function liensDuClasseur(e: Pick<EnsembleDonnees, "donnees">): [string, string][] {
  const posables = new Set(e.donnees.filter((d) => d.mode === "demandee" || d.mode === "partagee").map((d) => d.code));
  return e.donnees.filter((d) => d.mode === "partagee").flatMap((d) => d.entrees.filter((x) => posables.has(x)).map((x): [string, string] => [d.code, x]));
}

const cle2 = (a: string, b: string) => [a, b].sort().join("~");

// Paires couvertes par une correspondance (elles ne sont pas des jumelles).
function pairesEnCorrespondance(e: Pick<EnsembleDonnees, "partages">): Set<string> {
  return new Set(e.partages.correspondances.map((c) => cle2(cote(c.cle).code, cote(c.egale).code)));
}

// Le compte lit-il ces questions avec les mots de l'un de ces profils ? (les visiteurs du site d'une boutique en ligne)
function luCommePour(e: Pick<EnsembleDonnees, "banque" | "lexique">, codes: string[], profils: ProfilId[], compte: Formulation | null | undefined): boolean {
  if (!compte) return false;
  return profils.some((p) =>
    codes.every((code) => {
      const texte = e.banque.find((q) => q.donnee === code)?.texte;
      if (!texte) return false;
      const ici = formuler(texte, compte.profils, e.lexique, compte.vocabulaire);
      const la = formuler(texte, [p], e.lexique, null);
      return ici.ok && la.ok && ici.texte === la.texte;
    })
  );
}

// Jumelles : une donnée partagée et la même question chez un autre agent. Sans les données toujours posées avec un total
// pré-rempli (data/prereponses.json : le budget marketing de la Finance), ni les liens qui ne sont pas des partages, ni les
// correspondances partie à partie. Un lien « partageSeulementPour » ne vaut que pour un compte qui lit les deux questions avec
// les mots de ces profils ; sans compte, il ne vaut pas.
export function equivalences(e: Base, compte?: Formulation | null): Map<string, Set<string>> {
  const prerepondues = new Set(e.prereponses.regles.map((r) => r.donnee));
  const correspondances = pairesEnCorrespondance(e);
  const pasDesPartages = new Map(e.partages.pasDesPartages.map((p) => [cle2(p.donnee, p.entree), p]));
  const index = new Map<string, Set<string>>();
  const lier = (a: string, b: string) => {
    if (!index.has(a)) index.set(a, new Set());
    if (!index.has(b)) index.set(b, new Set());
    index.get(a)!.add(b);
    index.get(b)!.add(a);
  };
  for (const [a, b] of liensDuClasseur(e)) {
    if (prerepondues.has(a) || prerepondues.has(b) || correspondances.has(cle2(a, b))) continue;
    const pas = pasDesPartages.get(cle2(a, b));
    if (pas && !(pas.partageSeulementPour && luCommePour(e, [a, b], pas.partageSeulementPour, compte))) continue;
    lier(a, b);
  }
  return index;
}

// --- Correspondances partie à partie -------------------------------------------------------------------------------------

type Structure = {
  // Pour chaque question, les correspondances orientées vers elle (« vers » est la partie de cette question).
  versCode: Map<string, Correspondance[]>;
  // Questions dont toutes les parties ont une correspondance : elles peuvent être entièrement composées.
  completes: Set<string>;
  specs: Map<string, ReponseSpec>;
};

const structures = new WeakMap<object, Structure>();

function structure(e: Pick<EnsembleDonnees, "partages" | "banque">): Structure {
  const deja = structures.get(e.partages);
  if (deja) return deja;
  const specs = new Map<string, ReponseSpec>(e.banque.filter((q) => q.reponse).map((q) => [q.donnee, q.reponse as ReponseSpec]));
  const versCode = new Map<string, Correspondance[]>();
  const ajouter = (de: Cote, vers: Cote) => {
    if (!versCode.has(vers.code)) versCode.set(vers.code, []);
    versCode.get(vers.code)!.push({ de, vers });
  };
  for (const c of e.partages.correspondances) {
    const a = cote(c.cle);
    const b = cote(c.egale);
    ajouter(b, a);
    ajouter(a, b);
  }
  const completes = new Set<string>();
  for (const [code, liste] of versCode) if (couvreTout(specs.get(code), liste.map((c) => c.vers.chemin))) completes.add(code);
  const s = { versCode, completes, specs };
  structures.set(e.partages, s);
  return s;
}

// Les parties citées couvrent-elles toute la réponse de la question ?
export function couvreTout(spec: ReponseSpec | undefined, chemins: string[]): boolean {
  if (!spec) return false;
  if (chemins.includes("")) return true;
  if (spec.type === "composite") return spec.champs.every((c) => chemins.includes(c.id));
  if (spec.type === "tableau") {
    return spec.colonnes.every(
      (col) =>
        chemins.includes(`*.${col.id}`) ||
        (spec.lignes.source === "fixe" && spec.lignes.items.every((l) => chemins.includes(`${l.id}.${col.id}`)))
    );
  }
  return false;
}

function aPlat(r: Reponse): Plat | null {
  if (r.genre === "exact") return { "": r.valeur };
  if (r.genre === "saisie" && typeof r.valeur === "string") return { "": r.valeur };
  if (r.genre === "valeurs") {
    const plat: Plat = {};
    for (const [k, v] of Object.entries(r.valeurs)) if (typeof v === "number" || (typeof v === "string" && v !== "")) plat[k] = v;
    return plat;
  }
  return null;
}

// Valeurs d'une partie (`de`), renommées pour l'autre (`vers`).
function transposer(plat: Plat, de: string, vers: string): Plat {
  if (de.startsWith("*.")) {
    if (!vers.startsWith("*.")) return {};
    const colonne = de.slice(2);
    const sortie: Plat = {};
    for (const [k, v] of Object.entries(plat)) {
      const i = k.lastIndexOf(".");
      if (i > 0 && k.slice(i + 1) === colonne) sortie[`${k.slice(0, i)}.${vers.slice(2)}`] = v;
    }
    return sortie;
  }
  return plat[de] === undefined ? {} : { [vers]: plat[de] };
}

// Ce que des correspondances donnent pour une question, d'après `lire` (réponse d'une question et code qui la porte) : une
// réponse entière (chiffre ou choix), ou des valeurs à plat ; les questions d'où elles viennent ; et si chaque partie est connue.
// Fonction pure, utilisée aussi par l'écran (carte « déjà renseigné »).
export function composerParties(parties: readonly Correspondance[], lire: (code: string) => { r: Reponse; code: string } | null): { entiere: Reponse | null; plat: Plat; sources: string[]; toutes: boolean } {
  const plat: Plat = {};
  const sources: string[] = [];
  let entiere: Reponse | null = null;
  let toutes = parties.length > 0;
  for (const c of parties) {
    const src = lire(c.de.code);
    if (!src) {
      toutes = false;
      continue;
    }
    if (c.vers.chemin === "") {
      // Toute la question vient d'une partie de l'autre : un « je ne sais pas » de l'autre vaut pour elle aussi.
      if (src.r.genre === "inconnu" || src.r.genre === "non_suivi") entiere = { genre: src.r.genre };
      else {
        const v = aPlat(src.r)?.[c.de.chemin];
        if (v === undefined) {
          toutes = false;
          continue;
        }
        entiere = typeof v === "number" ? { genre: "exact", valeur: v } : { genre: "saisie", valeur: v };
      }
      if (!sources.includes(src.code)) sources.push(src.code);
      continue;
    }
    // Une estimation, un « je ne sais pas » ou une case vide ne se placent pas dans un champ : la partie reste à donner.
    const utiles = Object.entries(transposer(aPlat(src.r) ?? {}, c.de.chemin, c.vers.chemin));
    if (utiles.length === 0) {
      toutes = false;
      continue;
    }
    for (const [k, v] of utiles) plat[k] = v;
    if (!sources.includes(src.code)) sources.push(src.code);
  }
  return { entiere, plat, sources, toutes };
}

export function lecturePartagee(e: Base, reponses: Reponses, equiv: ReadonlyMap<string, ReadonlySet<string>>): LecturePartagee {
  const s = structure(e);
  // Réponse d'une question par elle-même ou par une jumelle, et la question qui la porte.
  const propre = (code: string): { r: Reponse; code: string } | null => {
    if (reponses[code] !== undefined) return { r: reponses[code]!, code };
    for (const c of equiv.get(code) ?? []) if (reponses[c] !== undefined) return { r: reponses[c]!, code: c };
    return null;
  };
  const composer = (code: string) => {
    const c = composerParties(s.versCode.get(code) ?? [], propre);
    return { ...c, complete: c.toutes && s.completes.has(code) };
  };
  const compose = (code: string): { r: Reponse; sources: string[] } | null => {
    const c = composer(code);
    if (!c.complete) return null;
    if (c.entiere) return { r: c.entiere, sources: c.sources };
    return { r: { genre: "valeurs", valeurs: c.plat }, sources: c.sources };
  };
  return {
    reponse(code) {
      return propre(code)?.r ?? compose(code)?.r;
    },
    sources(code) {
      if (reponses[code] !== undefined) return [];
      const p = propre(code);
      if (p) return [p.code];
      return compose(code)?.sources ?? [];
    },
    parties(code) {
      return s.versCode.get(code) ?? [];
    },
    reprise(code) {
      if (propre(code)) return null;
      const spec = s.specs.get(code);
      if (spec?.type !== "composite" && spec?.type !== "tableau") return null;
      const c = composer(code);
      if (c.complete || Object.keys(c.plat).length === 0) return null;
      return { valeurs: c.plat, sources: c.sources };
    },
  };
}

// Questions liées à une question (jumelles et correspondances) : une réponse partagée se modifie depuis n'importe lequel des
// agents qui la posent, et une question est « posée » au compte si l'une d'elles l'est.
export function questionsLiees(e: Base, equiv: ReadonlyMap<string, ReadonlySet<string>>): (code: string) => string[] {
  const s = structure(e);
  return (code) => [...new Set([...(equiv.get(code) ?? []), ...(s.versCode.get(code) ?? []).map((c) => c.de.code)])];
}

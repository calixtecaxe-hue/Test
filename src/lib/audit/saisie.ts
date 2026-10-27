// Du formulaire à la réponse : ce que le dirigeant a tapé (du texte, des cases, des
// choix) devient une réponse contrôlée selon la spécification de la question. Le même
// contrôle tourne dans le navigateur (pour expliquer tout de suite) et sur le serveur
// (pour ne jamais se fier au navigateur).
//
// Ce fichier n'importe que des fonctions pures : il se teste directement avec Node.

import type { ChampNomme, ChampSimple, ContexteLignes, ReponseAValider, ReponseSpec, ValeursStructurees } from "../donnees/reponse-spec.ts";
import { idsDesLignes, validerSelonSpec } from "../donnees/reponse-spec.ts";
import { lireNombre } from "./nombre.ts";

// Ce qui est tapé, par champ. Les nombres restent du texte jusqu'à l'envoi.
export type Saisie = {
  // Réponse simple
  sous?: "exact" | "estimation";
  exact?: string;
  min?: string;
  max?: string;
  texte?: string;
  choix?: string;
  cases?: string[];
  // Liste libre : un élément par entrée (les entrées vides sont ignorées à l'envoi)
  liste?: string[];
  // Réponse composée ou tableau : « champ » ou « ligne.colonne » → texte tapé
  champs?: Record<string, string>;
  // Réponse composée ou tableau : cases à cocher d'un champ « cases » n'existent pas ; réservé.
};

export type Resultat = { reponse: ReponseAValider | null; erreur: string | null };

const vide = (t: string | undefined) => t === undefined || t.trim() === "";

function valeurDuChamp(spec: ChampSimple, texte: string | undefined): { valeur: number | string | null; illisible: boolean } {
  if (vide(texte)) return { valeur: null, illisible: false };
  if (spec.type === "nombre") {
    const n = lireNombre(texte!);
    return n === null ? { valeur: null, illisible: true } : { valeur: n, illisible: false };
  }
  return { valeur: texte!.trim(), illisible: false };
}

const MESSAGE_ILLISIBLE = "Ce n'est pas un nombre lisible. Écrivez par exemple 1 250 ou 12,5.";

export function construireReponse(spec: ReponseSpec | null, s: Saisie, ctx: ContexteLignes): Resultat {
  if (!spec) {
    return vide(s.texte) ? { reponse: null, erreur: null } : { reponse: { genre: "saisie", valeur: s.texte!.trim() }, erreur: null };
  }
  let reponse: ReponseAValider | null = null;

  switch (spec.type) {
    case "nombre": {
      if (s.sous === "estimation") {
        if (vide(s.min) && vide(s.max)) return { reponse: null, erreur: null };
        const a = lireNombre(s.min ?? "");
        const b = lireNombre(s.max ?? "");
        if ((!vide(s.min) && a === null) || (!vide(s.max) && b === null)) return { reponse: null, erreur: MESSAGE_ILLISIBLE };
        if (a === null || b === null) return { reponse: null, erreur: null }; // l'autre borne n'est pas encore tapée
        if (a > b) return { reponse: null, erreur: "Le minimum doit être inférieur ou égal au maximum." };
        reponse = { genre: "estimation", min: a, max: b };
      } else {
        if (vide(s.exact)) return { reponse: null, erreur: null };
        const n = lireNombre(s.exact!);
        if (n === null) return { reponse: null, erreur: MESSAGE_ILLISIBLE };
        reponse = { genre: "exact", valeur: n };
      }
      break;
    }
    case "oui_non":
    case "choix":
      if (vide(s.choix)) return { reponse: null, erreur: null };
      reponse = { genre: "saisie", valeur: s.choix! };
      break;
    case "date_mois":
      if (vide(s.texte)) return { reponse: null, erreur: null };
      reponse = { genre: "saisie", valeur: s.texte!.trim() };
      break;
    case "texte":
      if (vide(s.texte)) return { reponse: null, erreur: null };
      reponse = { genre: "saisie", valeur: s.texte! };
      break;
    case "liste": {
      const elements = (s.liste ?? []).map((x) => x.trim()).filter((x) => x !== "");
      if (elements.length === 0) return { reponse: null, erreur: null };
      reponse = { genre: "saisie", valeur: elements };
      break;
    }
    case "cases":
      if (!s.cases || s.cases.length === 0) return { reponse: null, erreur: null };
      reponse = { genre: "saisie", valeur: s.cases };
      break;
    case "composite":
    case "tableau": {
      const champs = s.champs ?? {};
      const colonnes: ChampNomme[] = spec.type === "composite" ? spec.champs : spec.colonnes;
      const valeurs: ValeursStructurees = {};
      // Lignes qui existent encore : une case d'un canal décoché ou d'un élément retiré de la liste est ignorée.
      let lignesValides: Set<string> | null = null;
      // Les lignes affichées, quand l'écran les connaît (lignes retirées, lignes qui suivent un autre tableau), l'emportent.
      if (spec.type === "tableau") lignesValides = new Set(ctx.lignesAffichees ?? idsDesLignes(spec, ctx));
      for (const [cle, texte] of Object.entries(champs)) {
        if (lignesValides && !lignesValides.has(cle.slice(0, cle.lastIndexOf(".")))) continue;
        const id = cle.includes(".") ? cle.slice(cle.lastIndexOf(".") + 1) : cle;
        const colonne = colonnes.find((c) => c.id === id);
        if (id === "nom" && spec.type === "tableau") {
          if (!vide(texte)) valeurs[cle] = texte.trim();
          continue;
        }
        if (!colonne) continue;
        const { valeur, illisible } = valeurDuChamp(colonne.spec, texte);
        if (illisible) return { reponse: null, erreur: `${colonne.libelle} : ${MESSAGE_ILLISIBLE.toLowerCase().replace(/^ce/, "ce")}` };
        if (valeur !== null) valeurs[cle] = valeur;
      }
      if (!Object.values(valeurs).some((v) => v !== null)) return { reponse: null, erreur: null };
      // Lignes venues d'une autre réponse (canaux, catégories…) : une case affichée et laissée vide est enregistrée vide, pour
      // distinguer plus tard une ligne vue et laissée vide d'une ligne ajoutée depuis (reponses-actives.ts).
      if (spec.type === "tableau" && lignesValides && (spec.lignes.source === "declencheur" || spec.lignes.source === "donnee")) {
        for (const l of lignesValides) for (const c of spec.colonnes) if (!(`${l}.${c.id}` in valeurs)) valeurs[`${l}.${c.id}`] = null;
      }
      reponse = { genre: "valeurs", valeurs };
      break;
    }
  }

  const verdict = validerSelonSpec(spec, reponse, ctx);
  return verdict.ok ? { reponse, erreur: null } : { reponse: null, erreur: verdict.message };
}

// Ce qui s'affiche dans le formulaire pour une réponse déjà enregistrée.
export function saisieInitiale(spec: ReponseSpec | null, r: ReponseAValider | undefined): Saisie {
  const nombreTexte = (n: number) => String(n).replace(".", ",");
  if (!r || r.genre === "inconnu" || r.genre === "non_suivi") return spec?.type === "nombre" ? { sous: "exact" } : {};
  if (r.genre === "exact") return { sous: "exact", exact: nombreTexte(r.valeur) };
  if (r.genre === "estimation") return { sous: "estimation", min: nombreTexte(r.min), max: nombreTexte(r.max) };
  if (r.genre === "valeurs") {
    return { champs: Object.fromEntries(Object.entries(r.valeurs).filter(([, v]) => v !== null && !Array.isArray(v)).map(([k, v]) => [k, typeof v === "number" ? nombreTexte(v) : String(v)])) };
  }
  const v = r.valeur;
  if (Array.isArray(v)) return spec?.type === "liste" ? { liste: v } : { cases: v };
  if (spec?.type === "oui_non" || spec?.type === "choix") return { choix: typeof v === "boolean" ? (v ? "oui" : "non") : v };
  return { texte: typeof v === "string" ? v : String(v) };
}

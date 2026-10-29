// Réponses de DÉMONSTRATION : pour chaque question que l'assemblage pose (et les questions de cadrage), une réponse valide et
// neutre (un nombre dans les bornes, « oui », la première option, un texte, une ligne par tableau). Ce ne sont pas des
// données de client : elles servent aux contrôles (balayage des secteurs, parcours dans le navigateur) et à l'aperçu.
import { assemblerQuestionnaire, type Assemblage } from "../src/lib/audit/assemblage.ts";
import { idsDeListe, type ReponseSpec } from "../src/lib/donnees/reponse-spec.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";
import type { EnsembleDonnees } from "../src/lib/donnees/schemas.ts";

function reponseDe(spec: ReponseSpec, variante: "oui" | "non"): Record<string, unknown> | null {
  switch (spec.type) {
    case "nombre": {
      const bas = spec.min ?? 0;
      const haut = spec.max ?? 1000;
      return { genre: "exact", valeur: Math.min(Math.max(10, bas), haut) };
    }
    case "oui_non":
      return { genre: "saisie", valeur: variante };
    case "choix":
      return { genre: "saisie", valeur: spec.options[variante === "oui" ? 0 : spec.options.length - 1].id };
    case "cases":
      return { genre: "saisie", valeur: [spec.options[0].id] };
    case "texte":
      return { genre: "saisie", valeur: "Exemple" };
    case "liste":
      return { genre: "saisie", valeur: ["Exemple"] };
    case "date_mois":
      return { genre: "saisie", valeur: "2020-01" };
    case "composite": {
      const valeurs: Record<string, number | string | boolean> = {};
      for (const c of spec.champs) {
        const r = reponseDe(c.spec as ReponseSpec, variante) as { valeur?: number | string | boolean } | null;
        if (r && r.valeur !== undefined) valeurs[c.id] = r.valeur;
      }
      return { genre: "valeurs", valeurs };
    }
    default:
      return null;
  }
}

// Lignes d'un tableau d'après les réponses déjà données (null : les lignes ne sont pas encore connues).
function lignesDuTableau(e: EnsembleDonnees, spec: Extract<ReponseSpec, { type: "tableau" }>, reponses: Reponses): string[] | null {
  const l = spec.lignes;
  const tableauDe = (code: string): string[] | null => {
    const r = reponses[code];
    return r?.genre === "saisie" && Array.isArray(r.valeur) && r.valeur.length > 0 ? r.valeur : null;
  };
  if (l.source === "fixe") return l.items.map((i) => i.id);
  if (l.source === "libre") return ["1"];
  if (l.source === "donnee") {
    const liste = tableauDe(l.code);
    return liste ? idsDeListe(liste) : null;
  }
  const f = e.reglesAffichage.declencheurs[l.cle];
  return tableauDe(f?.type === "reponse_donnee" ? f.donnee : l.cle);
}

function reponseTableau(e: EnsembleDonnees, spec: Extract<ReponseSpec, { type: "tableau" }>, reponses: Reponses, variante: "oui" | "non"): Record<string, unknown> | null {
  const lignes = lignesDuTableau(e, spec, reponses);
  if (!lignes) return null;
  const valeurs: Record<string, number | string | boolean> = {};
  lignes.forEach((l, i) => {
    if (spec.lignes.source === "libre") valeurs[`${l}.nom`] = "Exemple";
    for (const c of spec.colonnes) {
      const r = reponseDe(c.spec as ReponseSpec, variante) as { valeur?: number | string | boolean } | null;
      if (!r || r.valeur === undefined) continue;
      // Total imposé : la première ligne porte tout.
      valeurs[`${l}.${c.id}`] = spec.total?.colonne === c.id ? (i === 0 ? spec.total.valeur : 0) : r.valeur;
    }
  });
  return { genre: "valeurs", valeurs };
}

export function remplir(e: EnsembleDonnees, entree: Parameters<typeof assemblerQuestionnaire>[1], variante: "oui" | "non"): { reponses: Reponses; assemblage: Assemblage } {
  const reponses: Reponses = { ...entree.reponses };
  let a = assemblerQuestionnaire(e, { ...entree, reponses });
  for (let passe = 0; passe < 6; passe++) {
    let change = false;
    // Cadrage.
    for (const d of a.declencheursConcernes) {
      const f = d.forme;
      if (f.type === "oui_non" && reponses[d.code] === undefined) {
        reponses[d.code] = { genre: "saisie", valeur: variante };
        change = true;
      } else if ((f.type === "cases" || f.type === "choix") && reponses[d.code] === undefined && f.options.length > 0) {
        const id = f.options[variante === "oui" ? 0 : f.options.length - 1].id;
        reponses[d.code] = { genre: "saisie", valeur: f.type === "cases" ? [id] : id };
        change = true;
      } else if (f.type === "oui_non_multiple") {
        for (const s of f.sousCles) {
          const cle = s.cle ? `${d.code}.${s.cle}` : d.code;
          if (reponses[cle] === undefined) {
            reponses[cle] = { genre: "saisie", valeur: variante };
            change = true;
          }
        }
      }
    }
    // Questions.
    for (const q of [...a.prealables, ...a.themes.flatMap((t) => t.questions)]) {
      if (q.dejaPosee || reponses[q.code] || !q.spec) continue;
      const r = q.spec.type === "tableau" ? reponseTableau(e, q.spec, reponses, variante) : reponseDe(q.spec, variante);
      if (!r) continue;
      reponses[q.code] = r as never;
      change = true;
    }
    a = assemblerQuestionnaire(e, { ...entree, reponses });
    if (!change) break;
  }
  return { reponses, assemblage: a };
}


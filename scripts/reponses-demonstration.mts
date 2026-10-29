// Réponses de DÉMONSTRATION pour un compte de test (aperçu de l'application) : pour chaque question que
// l'assemblage pose, une réponse valide et neutre (un nombre dans les bornes, « oui », la première option, un
// texte). Ce ne sont pas des données de client : elles servent seulement à montrer un compte rendu rempli.
// Les questions à plusieurs champs ou en tableau ne sont pas remplies.
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { assemblerQuestionnaire } from "../src/lib/audit/assemblage.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";
import type { ReponseSpec } from "../src/lib/donnees/reponse-spec.ts";

const e = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));

function reponseDe(spec: ReponseSpec): Record<string, unknown> | null {
  switch (spec.type) {
    case "nombre": {
      const bas = spec.min ?? 0;
      const haut = spec.max ?? 1000;
      return { genre: "exact", valeur: Math.min(Math.max(10, bas), haut) };
    }
    case "oui_non":
      return { genre: "saisie", valeur: true };
    case "choix":
      return { genre: "saisie", valeur: spec.options[0].id };
    case "cases":
      return { genre: "saisie", valeur: [spec.options[0].id] };
    case "texte":
      return { genre: "saisie", valeur: "Exemple" };
    case "liste":
      return { genre: "saisie", valeur: ["Exemple"] };
    default:
      return null;
  }
}

// Plusieurs passes : une réponse peut ouvrir d'autres questions.
export function reponsesDemonstration(agent: "ACQUISITION_CA" | "FINANCE_RENTABILITE" | "RH_ORGANISATION" | "COMM_CREATION", profils: string[]): Record<string, Record<string, unknown>> {
  const reponses: Reponses = {};
  const donnees: Record<string, Record<string, unknown>> = {};
  for (let passe = 0; passe < 4; passe++) {
    const a = assemblerQuestionnaire(e, { agent, profils: profils as never, taille: "equipe_2_5", niveau: "essentiel", reponses });
    for (const t of a.themes) {
      for (const q of t.questions) {
        if (q.dejaPosee || reponses[q.code] || !q.spec) continue;
        const r = reponseDe(q.spec);
        if (!r) continue;
        reponses[q.code] = r as never;
        donnees[q.code] = r;
      }
    }
  }
  return donnees;
}

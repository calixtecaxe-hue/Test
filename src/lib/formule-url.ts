// Une formule regardée sur la page des offres suit le parcours dans l'adresse : /inscription?agents=3&periode=annuel.
// Ce n'est qu'une préférence : la formule se choisit pour de bon à l'étape « Formule », une fois le métier connu
// (les agents proposés en dépendent), et le serveur la revérifie. L'adresse est modifiable par n'importe qui :
// elle est relue avec prudence, et une valeur incohérente est ignorée.
//
// Ce fichier ne dépend que de `offres.ts` et de types : il se teste directement avec Node.

import { OFFRES } from "./offres.ts";
import type { Periode } from "./abonnement.ts";

export type Preselection = { nombreAgents: number | null; periode: Periode | null };

export function lirePreselection(recherche: string): Preselection {
  const q = new URLSearchParams(recherche);
  const nombre = Number(q.get("agents"));
  const periode = q.get("periode");
  return {
    nombreAgents: OFFRES.some((o) => o.nombreAgents === nombre) ? nombre : null,
    periode: periode === "mensuel" || periode === "annuel" ? periode : null,
  };
}

// Reporte la préférence sur l'adresse de l'étape suivante.
export function adresseAvecPreselection(chemin: string, p: Preselection): string {
  const q = new URLSearchParams();
  if (p.nombreAgents !== null) q.set("agents", String(p.nombreAgents));
  if (p.periode !== null) q.set("periode", p.periode);
  const suite = q.toString();
  return suite ? `${chemin}?${suite}` : chemin;
}

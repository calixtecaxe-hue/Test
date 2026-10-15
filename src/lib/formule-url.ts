// La formule choisie avant l'inscription voyage dans l'adresse jusqu'à la création du compte :
// /inscription?agents=3&periode=annuel&choix=ACQUISITION_CA,FINANCE_RENTABILITE,RH_ORGANISATION.
// Elle est relue ici avec prudence (adresse modifiable par n'importe qui) et revérifiée par le
// serveur à l'inscription.
//
// Ce fichier ne dépend que de `offres.ts` et de types : il se teste directement avec Node.

import { OFFRES } from "./offres.ts";
import { TOUS_LES_AGENTS, type Periode } from "./abonnement.ts";
import type { CodeAgent } from "./donnees/schemas.ts";

export type FormuleChoisie = { nombreAgents: number; periode: Periode; agents: CodeAgent[] };

export function adresseInscription(f: FormuleChoisie): string {
  const q = new URLSearchParams({ agents: String(f.nombreAgents), periode: f.periode, choix: f.agents.join(",") });
  return `/inscription?${q.toString()}`;
}

export function lireFormuleDansAdresse(recherche: string): FormuleChoisie | null {
  const q = new URLSearchParams(recherche);
  const nombre = Number(q.get("agents"));
  const periode = q.get("periode");
  const choix = (q.get("choix") ?? "").split(",").filter(Boolean);
  if (!OFFRES.some((o) => o.nombreAgents === nombre)) return null;
  if (periode !== "mensuel" && periode !== "annuel") return null;
  const agents = [...new Set(choix)].filter((a): a is CodeAgent => (TOUS_LES_AGENTS as string[]).includes(a));
  // Le nombre d'agents doit correspondre au palier : sinon l'adresse est incohérente, on l'ignore.
  if (agents.length !== choix.length || agents.length !== nombre) return null;
  return { nombreAgents: nombre, periode, agents };
}

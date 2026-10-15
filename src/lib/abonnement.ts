// Règles de l'abonnement (CLAUDE.md section 10) : paliers de 2 à 4 agents, aucun
// agent coché d'avance, et pour les professions réglementées pas d'agent Comm donc
// 3 agents au maximum. L'accès aux agents est un droit attaché au compte.
//
// Ce fichier ne dépend que de `offres.ts` et de types : il se teste directement avec Node.

import { OFFRES } from "./offres.ts";
import type { CodeAgent, Routage } from "./donnees/schemas.ts";

export const TOUS_LES_AGENTS: CodeAgent[] = [
  "ACQUISITION_CA",
  "FINANCE_RENTABILITE",
  "RH_ORGANISATION",
  "COMM_CREATION",
];

export type Periode = "mensuel" | "annuel";

export type ContrainteCompte = {
  agentsExclus: CodeAgent[];
  nombreMaxAgents: number | null;
};

// Ce que le compte a le droit de souscrire, d'après la catégorie de son métier.
export function contrainteDuCompte(routage: Routage, categorieId: string): ContrainteCompte {
  const categorie = routage.categories.find((c) => c.id === categorieId);
  if (categorie?.reglementee) {
    return { agentsExclus: routage.reglementees.agentsExclus, nombreMaxAgents: routage.reglementees.nombreMaxAgents };
  }
  return { agentsExclus: [], nombreMaxAgents: null };
}

export function agentsProposables(c: ContrainteCompte): CodeAgent[] {
  return TOUS_LES_AGENTS.filter((a) => !c.agentsExclus.includes(a));
}

export function nombresAgentsProposables(c: ContrainteCompte): number[] {
  const disponibles = agentsProposables(c).length;
  return OFFRES.map((o) => o.nombreAgents).filter(
    (n) => n <= disponibles && (c.nombreMaxAgents === null || n <= c.nombreMaxAgents)
  );
}

export type ChoixAbonnement = { nombreAgents: number; periode: Periode; agents: string[] };
export type ErreurChoix = { champ: "nombreAgents" | "periode" | "agents"; message: string };

// Vérifie un choix de formule : palier existant, autorisé pour ce compte, et
// exactement autant d'agents distincts, tous permis, que le palier le prévoit.
export function validerChoix(
  choix: ChoixAbonnement,
  contrainte: ContrainteCompte
): { ok: true; agents: CodeAgent[] } | { ok: false; erreur: ErreurChoix } {
  if (choix.periode !== "mensuel" && choix.periode !== "annuel") {
    return { ok: false, erreur: { champ: "periode", message: "Période de facturation non reconnue." } };
  }
  if (!OFFRES.some((o) => o.nombreAgents === choix.nombreAgents)) {
    return { ok: false, erreur: { champ: "nombreAgents", message: "Formule non reconnue : l'abonnement commence à 2 agents." } };
  }
  if (!nombresAgentsProposables(contrainte).includes(choix.nombreAgents)) {
    const max = contrainte.nombreMaxAgents ?? agentsProposables(contrainte).length;
    return {
      ok: false,
      erreur: { champ: "nombreAgents", message: `Votre activité permet ${max} agents au maximum.` },
    };
  }
  const agents = [...new Set(choix.agents)];
  const inconnus = agents.filter((a) => !TOUS_LES_AGENTS.includes(a as CodeAgent));
  if (inconnus.length > 0) {
    return { ok: false, erreur: { champ: "agents", message: "Agent non reconnu." } };
  }
  const exclus = agents.filter((a) => contrainte.agentsExclus.includes(a as CodeAgent));
  if (exclus.length > 0) {
    return { ok: false, erreur: { champ: "agents", message: "Cet agent n'est pas proposé pour votre activité." } };
  }
  if (agents.length !== choix.nombreAgents) {
    return {
      ok: false,
      erreur: { champ: "agents", message: `Choisissez exactement ${choix.nombreAgents} agents pour cette formule.` },
    };
  }
  return { ok: true, agents: agents as CodeAgent[] };
}

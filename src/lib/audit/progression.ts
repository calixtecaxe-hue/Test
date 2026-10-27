// Où en est le dirigeant avec chaque agent (tableau de bord, page de l'agent) : objectif défini ?
// niveau choisi ? combien de questions traitées ? Calculé avec le même assemblage que le questionnaire,
// pour que les chiffres du tableau de bord soient ceux de la page de l'agent. Serveur uniquement.

import type { AgentCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PROFILS, type ProfilId } from "@/lib/donnees/schemas";
import { ENSEMBLE } from "./donnees-audit";
import { assemblerQuestionnaire } from "./assemblage";
import { ancienneteEnMois, tailleDepuisEffectif } from "./affichage";
import { reponsesDuCompte } from "./compte";
import { exclusionsAcquisition, metierDuCompte } from "@/lib/routage";
import { vocabulaireDuCompte } from "@/lib/vocabulaire";

// objectif : à définir. niveau : à choisir. questionnaire : en cours. termine : toutes les questions traitées.
// en_preparation : le questionnaire de cette activité reste à créer.
export type EtapeAgent = "objectif" | "niveau" | "questionnaire" | "termine" | "en_preparation";

export type ProgressionAgent = {
  agent: AgentCode;
  etape: EtapeAgent;
  // Objectifs en cours, dans l'ordre choisi (un seul pour l'Acquisition et la Finance ; RH et Comm : un ou plusieurs).
  objectifs: { phrase: string; echeance: Date }[];
  questions: number;
  traitees: number;
};

type Utilisateur = {
  profils: string[];
  categorie: string;
  metierPrecis: string;
  sousVariantes: string[];
  nombreCollaborateurs: number;
  niveauAudit: "ESSENTIEL" | "APPROFONDI" | null;
  dateCreationEntreprise: Date;
};

export async function progressionAgents(userId: string, u: Utilisateur, agents: AgentCode[]): Promise<Record<string, ProgressionAgent>> {
  const [objectifs, reponses] = await Promise.all([
    prisma.objectif.findMany({ where: { userId, statut: "ACTIF", agent: { in: agents } }, orderBy: { id: "asc" }, select: { agent: true, texteBrut: true, echeance: true } }),
    reponsesDuCompte(userId, u),
  ]);
  const profils = u.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p));
  const taille = tailleDepuisEffectif(u.nombreCollaborateurs);
  const exclusions = exclusionsAcquisition(ENSEMBLE.routage, u);
  const resultat: Record<string, ProgressionAgent> = {};

  for (const agent of agents) {
    const siens = objectifs.filter((x) => x.agent === agent);
    const o = siens[0];
    const base = { agent, objectifs: siens.map((x) => ({ phrase: x.texteBrut, echeance: x.echeance })), questions: 0, traitees: 0 };
    if (!o) {
      resultat[agent] = { ...base, etape: "objectif" };
    } else if (!u.niveauAudit) {
      resultat[agent] = { ...base, etape: "niveau" };
    } else if (profils.length === 0 && agent !== "RH_ORGANISATION") {
      resultat[agent] = { ...base, etape: "en_preparation" };
    } else {
      const a = assemblerQuestionnaire(ENSEMBLE, {
        agent,
        profils,
        taille,
        niveau: u.niveauAudit === "APPROFONDI" ? "approfondi" : "essentiel",
        reponses,
        ancienneteMois: ancienneteEnMois(u.dateCreationEntreprise, new Date()),
        exclusions,
        vocabulaire: vocabulaireDuCompte(ENSEMBLE.vocabulairesMetiers, metierDuCompte(ENSEMBLE.routage, u)),
        metier: metierDuCompte(ENSEMBLE.routage, u),
      });
      const toutes = a.themes.flatMap((t) => t.questions);
      // Réponses actives : une répartition à revoir (canal ajouté ou retiré) n'est plus « traitée ».
      const traitees = toutes.filter((q) => a.reponsesActives[q.code] !== undefined || q.dejaPosee).length;
      resultat[agent] = { ...base, etape: toutes.length > 0 && traitees >= toutes.length ? "termine" : "questionnaire", questions: toutes.length, traitees };
    }
  }
  return resultat;
}

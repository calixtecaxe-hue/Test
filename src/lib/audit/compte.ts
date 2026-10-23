import type { AgentCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { abonnementOuvert } from "@/lib/paiement/abonnement-serveur";
import { reponseSchema, type Reponses } from "./reponse";

// Toutes les réponses du compte, tous agents confondus (données partagées).
export async function reponsesDuCompte(userId: string): Promise<Reponses> {
  const lignes = await prisma.reponseAudit.findMany({ where: { userId }, select: { cle: true, reponse: true } });
  const reponses: Reponses = {};
  for (const l of lignes) {
    const analyse = reponseSchema.safeParse(l.reponse);
    if (analyse.success) reponses[l.cle] = analyse.data;
  }
  return reponses;
}

// Agents ouverts : ceux de la formule, tant que l'abonnement est en cours (payé).
export async function agentsActifs(userId: string): Promise<AgentCode[]> {
  if (!(await abonnementOuvert(userId))) return [];
  const acces = await prisma.agentAccess.findMany({ where: { userId, actif: true }, select: { agent: true } });
  return acces.map((a) => a.agent);
}


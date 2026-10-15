import type { AgentCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { accesOuvert } from "@/lib/paiement/etat";

// L'accès aux agents est un droit attaché au compte (CLAUDE.md section 1) : l'agent est inclus
// dans la formule ET l'abonnement est en cours (payé). Chaque entrée d'agent, page comme API,
// passe par ce contrôle.
export async function aAccesAgent(userId: string, agent: AgentCode): Promise<boolean> {
  const [acces, abonnement] = await Promise.all([
    prisma.agentAccess.findUnique({ where: { userId_agent: { userId, agent } }, select: { actif: true } }),
    prisma.abonnement.findUnique({ where: { userId }, select: { statut: true, finPeriodeLe: true } }),
  ]);
  return acces?.actif === true && abonnement !== null && accesOuvert(abonnement, new Date());
}

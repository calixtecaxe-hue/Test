import type { AgentCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// L'accès aux agents est un droit attaché au compte (CLAUDE.md section 1) :
// chaque entrée d'agent, page comme API, passe par ce contrôle.
export async function aAccesAgent(userId: string, agent: AgentCode): Promise<boolean> {
  const acces = await prisma.agentAccess.findUnique({
    where: { userId_agent: { userId, agent } },
    select: { actif: true },
  });
  return acces?.actif === true;
}

import type { AgentCode } from "@prisma/client";
import { ENSEMBLE } from "./donnees-audit";
import { agentsActifs } from "./compte";
import { codesPrealables, equivalences } from "./assemblage";

// Le compte a-t-il le droit d'écrire la réponse à cette donnée ? Une réponse de cadrage sert à tous les agents : il suffit d'en
// avoir un. Une donnée partagée se modifie depuis n'importe lequel des agents qui la posent. Une donnée d'un autre agent qu'un agent
// ouvert pose en préalable (types de clients, canaux) s'enregistre aussi.
export async function peutEcrireDonnee(userId: string, cle: string, agentDeLaDonnee: string | null): Promise<boolean> {
  const actifs = await agentsActifs(userId);
  if (!agentDeLaDonnee) return actifs.length > 0;
  const agents = new Set<string>([agentDeLaDonnee]);
  for (const autre of equivalences(ENSEMBLE.donnees).get(cle) ?? []) {
    const a = ENSEMBLE.themes.find((t) => t.code === autre.slice(0, autre.indexOf(".")))?.agent;
    if (a) agents.add(a);
  }
  return actifs.some((a: AgentCode) => agents.has(a) || codesPrealables(ENSEMBLE, a).has(cle));
}

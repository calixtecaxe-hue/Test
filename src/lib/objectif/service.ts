import { Prisma, type AgentCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { interpreterObjectif, type Interpretation } from "./interpreter";

// Enregistre l'objectif d'un audit. L'interprétation est refaite ici, côté
// serveur : on ne fait jamais confiance à une structure envoyée par le
// navigateur. Un nouvel objectif remplace l'objectif actif du même agent, qui
// reste en historique ; les objectifs des autres agents ne sont pas touchés.
export async function enregistrerObjectif(
  userId: string,
  agent: AgentCode,
  texte: string
): Promise<
  | { ok: true; id: string; interpretation: Extract<Interpretation, { statut: "complet" }> }
  | { ok: false; interpretation: Exclude<Interpretation, { statut: "complet" }> }
> {
  const interpretation = interpreterObjectif(texte, agent);
  if (interpretation.statut !== "complet") return { ok: false, interpretation };

  const { objectif } = interpretation;
  const maintenant = new Date();
  const cree = await prisma.$transaction(async (tx) => {
    await tx.objectif.updateMany({
      where: { userId, agent, statut: "ACTIF" },
      data: { statut: "REMPLACE", clotureLe: maintenant },
    });
    return tx.objectif.create({
      data: {
        userId,
        agent,
        texteBrut: texte,
        structure: objectif as unknown as Prisma.InputJsonValue,
        echeance: new Date(objectif.deadline.echeance),
        creeLe: maintenant,
      },
      select: { id: true },
    });
  });
  return { ok: true, id: cree.id, interpretation };
}

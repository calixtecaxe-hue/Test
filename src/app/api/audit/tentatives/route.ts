import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENSEMBLE } from "@/lib/audit/donnees-audit";
import { agentsActifs } from "@/lib/audit/compte";
import { validerTentatives } from "@/lib/audit/tentatives";
import { codeAgent } from "@/lib/donnees/schemas";

// null : le dirigeant efface sa réponse.
const corps = z.object({ agent: codeAgent, tentatives: z.unknown() });

// Enregistre ce que le dirigeant a déjà essayé pour l'objectif en cours d'un agent (sauvegarde continue). L'accès à l'agent est
// un droit du compte, contrôlé à chaque appel ; la réponse se rattache à l'objectif actif, qu'il faut donc avoir fixé.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const { agent } = parsed.data;
  if (!(await agentsActifs(userId)).includes(agent)) {
    return NextResponse.json({ erreur: "Cet agent n'est pas inclus dans votre formule." }, { status: 403 });
  }

  let valeur: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
  if (parsed.data.tentatives !== null) {
    const verdict = validerTentatives(ENSEMBLE.dejaTente, parsed.data.tentatives);
    if (!verdict.ok) return NextResponse.json({ erreur: verdict.message }, { status: 400 });
    valeur = verdict.tentatives as unknown as Prisma.InputJsonValue;
  }
  const r = await prisma.objectif.updateMany({ where: { userId, agent, statut: "ACTIF" }, data: { tentatives: valeur } });
  if (r.count === 0) return NextResponse.json({ erreur: "Fixez d'abord votre objectif pour cet agent." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

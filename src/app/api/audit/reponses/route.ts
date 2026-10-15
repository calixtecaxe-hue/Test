import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENSEMBLE } from "@/lib/audit/donnees-audit";
import { validerReponse } from "@/lib/audit/validation";
import { agentsActifs, reponsesDuCompte } from "@/lib/audit/compte";
import { exclusionsAcquisition } from "@/lib/routage";
import { equivalences } from "@/lib/audit/assemblage";
import type { AgentCode } from "@prisma/client";

const corps = z.object({
  cle: z.string().min(1).max(40),
  // null : le dirigeant efface sa réponse.
  reponse: z.unknown(),
});

// Enregistre une réponse dès qu'elle est donnée (sauvegarde continue). Le code et la
// forme de la réponse sont revérifiés ici ; l'accès à l'agent de la donnée est un
// droit du compte, contrôlé à chaque appel.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const { cle, reponse } = parsed.data;

  const actifs = await agentsActifs(userId);
  if (reponse === null) {
    await prisma.reponseAudit.deleteMany({ where: { userId, cle } });
    return NextResponse.json({ ok: true });
  }

  const compte = await prisma.user.findUnique({ where: { id: userId }, select: { categorie: true, metierPrecis: true, sousVariantes: true } });
  const verdict = validerReponse(ENSEMBLE, cle, reponse, await reponsesDuCompte(userId), compte ? exclusionsAcquisition(ENSEMBLE.routage, compte) : null);
  if (!verdict.ok) return NextResponse.json({ erreur: verdict.message }, { status: 400 });
  // Une réponse de cadrage sert à tous les agents : il suffit d'en avoir un.
  // Une donnée partagée se modifie depuis n'importe lequel des agents qui la posent : il suffit
  // d'avoir accès à l'un d'eux.
  const agentsDeLaDonnee = new Set<string>(verdict.agent ? [verdict.agent] : []);
  for (const autre of equivalences(ENSEMBLE.donnees).get(cle) ?? []) {
    const a = ENSEMBLE.themes.find((t) => t.code === autre.slice(0, autre.indexOf(".")))?.agent;
    if (a) agentsDeLaDonnee.add(a);
  }
  const autorise = verdict.agent ? actifs.some((a: AgentCode) => agentsDeLaDonnee.has(a)) : actifs.length > 0;
  if (!autorise) return NextResponse.json({ erreur: "Cet agent n'est pas inclus dans votre formule." }, { status: 403 });

  await prisma.reponseAudit.upsert({
    where: { userId_cle: { userId, cle } },
    update: { reponse: verdict.reponse as Prisma.InputJsonValue },
    create: { userId, cle, reponse: verdict.reponse as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true });
}

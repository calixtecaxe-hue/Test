import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENSEMBLE } from "@/lib/audit/donnees-audit";
import { agentsActifs } from "@/lib/audit/compte";
import { validerTentatives } from "@/lib/audit/tentatives";

// null : le dirigeant efface sa réponse (la question redevient sans réponse).
const corps = z.object({ objectifId: z.string().min(1).max(40), tentatives: z.unknown() });

// Enregistre ce que le dirigeant a déjà essayé pour un objectif précis (sauvegarde continue). L'objectif doit être le sien, en
// cours, et son agent ouvert pour le compte. Une réponse reprise d'un objectif remplacé (`reprisDe`) l'est à la demande du
// dirigeant ; l'objectif d'origine doit être le sien, pour le même agent.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const objectif = await prisma.objectif.findFirst({ where: { id: parsed.data.objectifId, userId }, select: { id: true, agent: true, statut: true } });
  if (!objectif) return NextResponse.json({ erreur: "Objectif introuvable." }, { status: 404 });
  if (!(await agentsActifs(userId)).includes(objectif.agent)) {
    return NextResponse.json({ erreur: "Cet agent n'est pas inclus dans votre formule." }, { status: 403 });
  }
  if (objectif.statut !== "ACTIF") return NextResponse.json({ erreur: "Cet objectif a été remplacé : répondez pour votre objectif en cours." }, { status: 409 });

  let valeur: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
  if (parsed.data.tentatives !== null) {
    const verdict = validerTentatives(ENSEMBLE.dejaTente, parsed.data.tentatives);
    if (!verdict.ok) return NextResponse.json({ erreur: verdict.message }, { status: 400 });
    if (verdict.tentatives.reprisDe) {
      const origine = await prisma.objectif.findFirst({ where: { id: verdict.tentatives.reprisDe, userId, agent: objectif.agent }, select: { id: true } });
      if (!origine || origine.id === objectif.id) return NextResponse.json({ erreur: "Objectif d'origine introuvable." }, { status: 400 });
    }
    valeur = verdict.tentatives as unknown as Prisma.InputJsonValue;
  }
  await prisma.objectif.update({ where: { id: objectif.id }, data: { tentatives: valeur } });
  return NextResponse.json({ ok: true });
}

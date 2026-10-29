import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aAccesAgent } from "@/lib/acces-agent";

const corps = z.object({
  rapportId: z.string().min(1).max(40),
  cle: z.string().regex(/^A\d{1,2}$/),
  statut: z.enum(["A_FAIRE", "EN_COURS", "FAITE", "ABANDONNEE"]),
});

// Où en est le dirigeant d'une action de son plan. Distinct de l'avancement de l'objectif, qui se mesure à ce qu'il déclare aux
// points d'étape.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const { rapportId, cle, statut } = parsed.data;
  const r = await prisma.rapport.findFirst({ where: { id: rapportId, userId: session.user.id, statut: "PRET" }, select: { id: true, agent: true } });
  if (!r) return NextResponse.json({ erreur: "Plan d'action introuvable." }, { status: 404 });
  if (!(await aAccesAgent(session.user.id, r.agent))) return NextResponse.json({ erreur: "Cet agent n'est pas ouvert pour votre compte." }, { status: 403 });
  const action = await prisma.actionPlan.findUnique({ where: { rapportId_cle: { rapportId: r.id, cle } } });
  if (!action) return NextResponse.json({ erreur: "Action introuvable." }, { status: 404 });
  await prisma.actionPlan.update({ where: { id: action.id }, data: { statut } });
  return NextResponse.json({ ok: true });
}

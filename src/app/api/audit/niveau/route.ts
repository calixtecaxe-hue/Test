import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const corps = z.object({ niveau: z.enum(["ESSENTIEL", "APPROFONDI"]) });

// Niveau des questionnaires, choisi une fois pour tous les agents du compte.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Choisissez essentiel ou approfondi." }, { status: 400 });
  await prisma.user.update({ where: { id: session.user.id }, data: { niveauAudit: parsed.data.niveau } });
  return NextResponse.json({ ok: true });
}

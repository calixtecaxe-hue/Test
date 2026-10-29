import { NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aAccesAgent } from "@/lib/acces-agent";
import { estComplet } from "@/lib/compte";
import { executerRapport, lancerRapport } from "@/lib/rapport/rapport-compte";

const CODES = ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"] as const;
const corps = z.object({ agent: z.enum(CODES) });

// La rédaction peut durer plusieurs minutes avec l'IA : elle se poursuit après la réponse (after), dans la limite ci-dessous.
export const maxDuration = 600;

// Lance la rédaction du rapport et du plan d'action de l'objectif en cours d'un agent. Répond tout de suite ; l'écran suit
// l'état avec GET. Une rédaction déjà en cours pour cet objectif n'est pas relancée.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const { agent } = parsed.data;
  if (!(await aAccesAgent(session.user.id, agent))) return NextResponse.json({ erreur: "Cet agent n'est pas ouvert pour votre compte." }, { status: 403 });
  const utilisateur = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!utilisateur || !estComplet(utilisateur)) return NextResponse.json({ erreur: "Complétez d'abord le dossier de votre entreprise." }, { status: 409 });

  const l = await lancerRapport(utilisateur, agent);
  if (!l.ok) return NextResponse.json({ erreur: l.erreur }, { status: l.status });
  if (!l.deja) after(() => executerRapport(l.rapportId));
  return NextResponse.json({ rapportId: l.rapportId, statut: "EN_COURS" }, { status: 202 });
}

// État d'un rapport du compte (suivi pendant la rédaction).
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const r = await prisma.rapport.findFirst({ where: { id, userId: session.user.id }, select: { statut: true, erreur: true, agent: true } });
  if (!r) return NextResponse.json({ erreur: "Rapport introuvable." }, { status: 404 });
  if (!(await aAccesAgent(session.user.id, r.agent))) return NextResponse.json({ erreur: "Cet agent n'est pas ouvert pour votre compte." }, { status: 403 });
  return NextResponse.json({ statut: r.statut, erreur: r.erreur });
}

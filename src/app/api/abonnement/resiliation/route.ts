import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { accesOuvert, finPeriodeDemonstration } from "@/lib/paiement/etat";
import { programmerResiliationStripe } from "@/lib/paiement/stripe";

const corps = z.object({ resilier: z.boolean() });

// Arrête l'abonnement (resilier: true) ou le reprend avant sa fin (resilier: false). L'arrêt prend effet à la fin
// de la période déjà payée : les agents restent ouverts jusque-là, sans remboursement du reste de la période.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;
  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

  const abonnement = await prisma.abonnement.findUnique({ where: { userId } });
  if (!abonnement || (abonnement.statut !== "ACTIF" && abonnement.statut !== "IMPAYE") || !accesOuvert(abonnement, new Date())) {
    return NextResponse.json({ erreur: "Aucun abonnement en cours à modifier." }, { status: 409 });
  }
  const { resilier } = parsed.data;
  if (abonnement.resiliationProgrammee === resilier) return NextResponse.json({ ok: true, resiliationProgrammee: resilier, finPeriodeLe: abonnement.finPeriodeLe });

  let finPeriodeLe: Date | null = abonnement.finPeriodeLe;
  if (abonnement.fournisseur === "stripe") {
    if (!abonnement.stripeSubscriptionId) return NextResponse.json({ erreur: "La modification n'est pas possible pour le moment. Réessayez dans un instant." }, { status: 409 });
    try {
      finPeriodeLe = (await programmerResiliationStripe(abonnement.stripeSubscriptionId, resilier)) ?? finPeriodeLe;
    } catch {
      return NextResponse.json({ erreur: "La demande n'a pas pu être transmise au service de paiement. Réessayez dans un instant." }, { status: 502 });
    }
  } else if (resilier && !finPeriodeLe) {
    // Mode démonstration : aucune période réelle, on en fixe une pour que l'arrêt ait une date.
    finPeriodeLe = finPeriodeDemonstration(abonnement.periode === "ANNUEL" ? "annuel" : "mensuel", abonnement.activeLe ?? new Date());
    if (finPeriodeLe.getTime() <= Date.now()) finPeriodeLe = finPeriodeDemonstration(abonnement.periode === "ANNUEL" ? "annuel" : "mensuel", new Date());
  }

  await prisma.abonnement.update({ where: { id: abonnement.id }, data: { resiliationProgrammee: resilier, finPeriodeLe } });
  return NextResponse.json({ ok: true, resiliationProgrammee: resilier, finPeriodeLe });
}

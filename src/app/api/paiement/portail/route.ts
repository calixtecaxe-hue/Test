import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { creerSessionPortail } from "@/lib/paiement/stripe";

// Ouvre l'espace de facturation du fournisseur (moyen de paiement, factures, résiliation).
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const abonnement = await prisma.abonnement.findUnique({ where: { userId: session.user.id } });
  if (!abonnement?.stripeCustomerId) return NextResponse.json({ erreur: "Aucun paiement à gérer pour ce compte." }, { status: 400 });
  try {
    return NextResponse.json({ url: await creerSessionPortail(abonnement.stripeCustomerId) });
  } catch {
    return NextResponse.json({ erreur: "L'espace de facturation n'a pas pu s'ouvrir. Réessayez dans un instant." }, { status: 502 });
  }
}

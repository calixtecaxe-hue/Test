import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { modePaiement } from "@/lib/paiement/etat";

// Active l'abonnement SANS paiement, uniquement en mode démonstration (développement, ou
// PAIEMENT_MODE=demonstration). En production sans ce réglage, cette route refuse : jamais d'accès gratuit par défaut.
export async function POST() {
  if (modePaiement(process.env) !== "demonstration") return NextResponse.json({ erreur: "Le mode démonstration n'est pas actif." }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const abonnement = await prisma.abonnement.findUnique({ where: { userId: session.user.id } });
  if (!abonnement) return NextResponse.json({ erreur: "Choisissez d'abord votre formule." }, { status: 400 });
  await prisma.abonnement.update({ where: { id: abonnement.id }, data: { statut: "ACTIF", fournisseur: "demonstration", activeLe: abonnement.activeLe ?? new Date() } });
  return NextResponse.json({ ok: true });
}

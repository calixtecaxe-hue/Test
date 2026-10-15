import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { modePaiement } from "@/lib/paiement/etat";
import { creerSessionPaiement } from "@/lib/paiement/stripe";

// Démarre le paiement de la formule enregistrée. Le montant n'est jamais lu dans la requête : il
// est recalculé d'après l'abonnement du compte.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });

  const abonnement = await prisma.abonnement.findUnique({ where: { userId: session.user.id } });
  if (!abonnement) return NextResponse.json({ erreur: "Choisissez d'abord votre formule." }, { status: 400 });
  if (abonnement.statut === "ACTIF") return NextResponse.json({ erreur: "Votre abonnement est déjà actif." }, { status: 409 });

  const mode = modePaiement(process.env);
  if (mode === "indisponible") return NextResponse.json({ erreur: "Le paiement n'est pas encore ouvert. Réessayez plus tard." }, { status: 503 });
  if (mode === "demonstration") return NextResponse.json({ mode, url: "/paiement/demonstration" });

  try {
    const url = await creerSessionPaiement({
      userId: session.user.id,
      email: session.user.email,
      nombreAgents: abonnement.nombreAgents,
      periode: abonnement.periode === "ANNUEL" ? "annuel" : "mensuel",
      clientStripe: abonnement.stripeCustomerId,
    });
    return NextResponse.json({ mode, url });
  } catch {
    return NextResponse.json({ erreur: "Le paiement n'a pas pu démarrer. Réessayez dans un instant." }, { status: 502 });
  }
}

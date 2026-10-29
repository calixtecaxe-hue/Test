import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { modePaiement } from "@/lib/paiement/etat";
import { creerSessionPaiement, preparerClient } from "@/lib/paiement/stripe";
import { verifierFacturation } from "@/lib/paiement/tva";

const corps = z.object({ raisonSociale: z.string().max(300).nullish(), numeroTva: z.string().max(60).nullish(), cgv: z.boolean().optional() });

// Démarre le paiement de la formule enregistrée. Le montant n'est jamais lu dans la requête : il
// est recalculé d'après l'abonnement du compte. La facturation professionnelle (nom de l'entreprise,
// numéro de TVA) est facultative : vérifiée ici, enregistrée sur le compte, puis transmise à Stripe.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const abonnement = await prisma.abonnement.findUnique({ where: { userId } });
  if (!abonnement) return NextResponse.json({ erreur: "Choisissez d'abord votre formule." }, { status: 400 });
  if (abonnement.statut === "ACTIF") return NextResponse.json({ erreur: "Votre abonnement est déjà actif." }, { status: 409 });

  const brut = corps.safeParse(await request.json().catch(() => ({})));
  if (!brut.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  // Les conditions générales de vente s'acceptent avant de payer ; le moment est gardé sur le compte.
  if (brut.data.cgv !== true) return NextResponse.json({ erreur: "Acceptez les conditions générales de vente pour continuer.", champ: "cgv" }, { status: 400 });
  const verdict = verifierFacturation(brut.data);
  if (!verdict.ok) return NextResponse.json({ erreur: verdict.message, champ: verdict.champ }, { status: 400 });
  await prisma.user.update({ where: { id: userId }, data: { ...verdict.facturation, cgvAccepteesLe: new Date() } });

  const mode = modePaiement(process.env);
  if (mode === "indisponible") return NextResponse.json({ erreur: "Le paiement n'est pas encore ouvert. Réessayez plus tard." }, { status: 503 });
  if (mode === "demonstration") return NextResponse.json({ mode, url: "/paiement/demonstration" });

  try {
    const clientStripe = await preparerClient({ userId, email: session.user.email, facturation: verdict.facturation, clientStripe: abonnement.stripeCustomerId });
    if (clientStripe !== abonnement.stripeCustomerId) await prisma.abonnement.update({ where: { id: abonnement.id }, data: { stripeCustomerId: clientStripe } });
    const url = await creerSessionPaiement({
      userId,
      nombreAgents: abonnement.nombreAgents,
      periode: abonnement.periode === "ANNUEL" ? "annuel" : "mensuel",
      clientStripe,
    });
    return NextResponse.json({ mode, url });
  } catch {
    return NextResponse.json({ erreur: "Le paiement n'a pas pu démarrer. Vérifiez le numéro de TVA et réessayez dans un instant." }, { status: 502 });
  }
}

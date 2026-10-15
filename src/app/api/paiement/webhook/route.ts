import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { miseAJourDepuisEvenement } from "@/lib/paiement/etat";
import { appliquerMiseAJour } from "@/lib/paiement/abonnement-serveur";
import { stripe } from "@/lib/paiement/stripe";

// Événements envoyés par Stripe. La signature est vérifiée sur le corps brut ; chaque événement
// n'est appliqué qu'une fois (identifiant enregistré).
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ erreur: "Signature manquante." }, { status: 400 });

  const corps = await request.text();
  let evenement;
  try {
    evenement = stripe().webhooks.constructEvent(corps, signature, secret);
  } catch {
    return NextResponse.json({ erreur: "Signature invalide." }, { status: 400 });
  }

  const traduit = miseAJourDepuisEvenement(evenement as unknown as { type: string; data: { object: unknown } });
  if (!traduit) return NextResponse.json({ recu: true, effet: false });

  try {
    await prisma.evenementPaiement.create({ data: { id: evenement.id, type: evenement.type } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ recu: true, doublon: true });
    throw e;
  }
  const applique = await appliquerMiseAJour(traduit.cible, traduit.maj);
  if (!applique) {
    // Abonnement introuvable (événement arrivé avant l'activation, par exemple) : on libère l'identifiant
    // pour que Stripe puisse renvoyer l'événement.
    await prisma.evenementPaiement.delete({ where: { id: evenement.id } });
    return NextResponse.json({ erreur: "Abonnement introuvable." }, { status: 409 });
  }
  return NextResponse.json({ recu: true, effet: true });
}

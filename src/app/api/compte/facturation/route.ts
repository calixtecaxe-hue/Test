import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { modePaiement } from "@/lib/paiement/etat";
import { synchroniserFacturation } from "@/lib/paiement/stripe";
import { verifierFacturation } from "@/lib/paiement/tva";

const corps = z.object({ raisonSociale: z.string().max(300).nullish(), numeroTva: z.string().max(60).nullish() });

// Nom de l'entreprise et numéro de TVA du compte, modifiables à tout moment. Si le compte a déjà un
// client chez Stripe, il est mis à jour : les prochaines factures portent les nouvelles informations.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const brut = corps.safeParse(await request.json().catch(() => null));
  if (!brut.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const verdict = verifierFacturation(brut.data);
  if (!verdict.ok) return NextResponse.json({ erreur: verdict.message, champ: verdict.champ }, { status: 400 });

  await prisma.user.update({ where: { id: session.user.id }, data: verdict.facturation });
  const abonnement = await prisma.abonnement.findUnique({ where: { userId: session.user.id }, select: { stripeCustomerId: true } });
  if (abonnement?.stripeCustomerId && modePaiement(process.env) === "stripe") {
    try {
      await synchroniserFacturation(abonnement.stripeCustomerId, verdict.facturation);
    } catch {
      return NextResponse.json({ ok: true, synchronise: false, message: "Enregistré. La mise à jour chez notre prestataire de paiement n'a pas abouti : vous pouvez aussi la faire depuis « Gérer ma facturation »." });
    }
  }
  return NextResponse.json({ ok: true, synchronise: true });
}

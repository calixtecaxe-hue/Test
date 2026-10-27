import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROUTAGE } from "@/lib/routage-donnees";
import { compteRoutable } from "@/lib/compte";
import { accesOuvert } from "@/lib/paiement/etat";
import { changerFormuleStripe } from "@/lib/paiement/stripe";
import { contrainteDuCompte, TOUS_LES_AGENTS, validerChoix } from "@/lib/abonnement";

const choixSchema = z.object({ nombreAgents: z.coerce.number().int(), periode: z.string(), agents: z.array(z.string()) });

// Change la formule d'un abonnement en cours (nombre d'agents, agents, mensuel ou annuel). Les règles sont
// revérifiées ici comme à la souscription ; le prix est recalculé côté serveur. Avec un paiement réel, Stripe
// facture ou crédite tout de suite le prorata ; si le prélèvement échoue, rien ne change.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const parsed = choixSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

  const [utilisateur, abonnement] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { categorie: true, metierPrecis: true, sousVariantes: true } }),
    prisma.abonnement.findUnique({ where: { userId } }),
  ]);
  if (!utilisateur) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const routable = compteRoutable(utilisateur);
  if (!routable) return NextResponse.json({ erreur: "Indiquez d'abord votre métier." }, { status: 409 });
  if (!abonnement || abonnement.statut !== "ACTIF" || !accesOuvert(abonnement, new Date())) {
    return NextResponse.json({ erreur: "Votre abonnement n'est pas actif : la formule ne peut pas être changée." }, { status: 409 });
  }
  if (abonnement.resiliationProgrammee) {
    return NextResponse.json({ erreur: "Votre abonnement s'arrête à la fin de la période. Reprenez-le d'abord pour changer de formule." }, { status: 409 });
  }

  const verdict = validerChoix(parsed.data as Parameters<typeof validerChoix>[0], contrainteDuCompte(ROUTAGE, routable));
  if (!verdict.ok) return NextResponse.json({ erreur: verdict.erreur.message, champ: verdict.erreur.champ }, { status: 400 });
  const periode = parsed.data.periode === "annuel" ? "annuel" : "mensuel";

  let finPeriodeLe: Date | null = null;
  if (abonnement.fournisseur === "stripe") {
    if (!abonnement.stripeSubscriptionId) return NextResponse.json({ erreur: "Le changement n'est pas possible pour le moment. Réessayez dans un instant." }, { status: 409 });
    try {
      finPeriodeLe = await changerFormuleStripe({ subscriptionId: abonnement.stripeSubscriptionId, nombreAgents: parsed.data.nombreAgents, periode });
    } catch {
      return NextResponse.json({ erreur: "Le changement n'a pas pu être appliqué : le prélèvement a peut-être échoué. Votre formule actuelle est conservée." }, { status: 502 });
    }
  }

  await prisma.$transaction([
    prisma.abonnement.update({
      where: { id: abonnement.id },
      data: { nombreAgents: parsed.data.nombreAgents, periode: periode === "annuel" ? "ANNUEL" : "MENSUEL", ...(finPeriodeLe ? { finPeriodeLe } : {}) },
    }),
    ...TOUS_LES_AGENTS.map((agent) =>
      prisma.agentAccess.upsert({
        where: { userId_agent: { userId, agent } },
        update: { actif: verdict.agents.includes(agent) },
        create: { userId, agent, actif: verdict.agents.includes(agent) },
      }),
    ),
  ]);
  return NextResponse.json({ ok: true, nombreAgents: parsed.data.nombreAgents, periode, agents: verdict.agents });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROUTAGE } from "@/lib/routage-donnees";
import { compteRoutable } from "@/lib/compte";
import { accesOuvert } from "@/lib/paiement/etat";
import { contrainteDuCompte, TOUS_LES_AGENTS, validerChoix } from "@/lib/abonnement";

const choixSchema = z.object({
  nombreAgents: z.coerce.number().int(),
  periode: z.string(),
  agents: z.array(z.string()),
});

// Formule et agents ouverts du compte.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });

  const [abonnement, acces] = await Promise.all([
    prisma.abonnement.findUnique({ where: { userId: session.user.id } }),
    prisma.agentAccess.findMany({ where: { userId: session.user.id, actif: true }, select: { agent: true } }),
  ]);
  return NextResponse.json({ abonnement, agents: acces.map((a) => a.agent) });
}

// Enregistre le choix de formule et d'agents. Les règles (palier, nombre d'agents,
// professions réglementées) sont revérifiées ici, jamais fiées au navigateur. Le
// choix est enregistré ici ; le paiement se fait ensuite sur /paiement.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });

  const parsed = choixSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

  const utilisateur = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { categorie: true, metierPrecis: true, sousVariantes: true },
  });
  if (!utilisateur) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  // Les agents proposés dépendent du métier : il est demandé avant la formule.
  const routable = compteRoutable(utilisateur);
  if (!routable) return NextResponse.json({ erreur: "Indiquez d'abord votre métier.", champ: "metier" }, { status: 409 });

  const verdict = validerChoix(parsed.data as Parameters<typeof validerChoix>[0], contrainteDuCompte(ROUTAGE, routable));
  if (!verdict.ok) {
    return NextResponse.json({ erreur: verdict.erreur.message, champ: verdict.erreur.champ }, { status: 400 });
  }

  const userId = session.user.id;
  // Un abonnement en cours se change depuis « Mon compte » (PUT /api/abonnement/formule) ; ici on ne crée ou ne
  // refait la formule que d'un compte sans accès ouvert (en attente de paiement, ou abonnement terminé).
  const existant = await prisma.abonnement.findUnique({ where: { userId }, select: { statut: true, finPeriodeLe: true, resiliationProgrammee: true } });
  if (existant && accesOuvert(existant, new Date())) {
    return NextResponse.json({ erreur: "Votre abonnement est en cours : changez de formule depuis « Mon compte »." }, { status: 409 });
  }
  const periode = parsed.data.periode === "annuel" ? "ANNUEL" : "MENSUEL";
  await prisma.$transaction([
    prisma.abonnement.upsert({
      where: { userId },
      update: { nombreAgents: parsed.data.nombreAgents, periode },
      create: { userId, nombreAgents: parsed.data.nombreAgents, periode },
    }),
    ...TOUS_LES_AGENTS.map((agent) =>
      prisma.agentAccess.upsert({
        where: { userId_agent: { userId, agent } },
        update: { actif: verdict.agents.includes(agent) },
        create: { userId, agent, actif: verdict.agents.includes(agent) },
      })
    ),
  ]);

  return NextResponse.json({ nombreAgents: parsed.data.nombreAgents, periode: parsed.data.periode, agents: verdict.agents });
}

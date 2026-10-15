import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { GrillePoints } from "@/components/marketing/grille-points";
import { OFFRES, type Offre } from "@/lib/offres";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROUTAGE } from "@/lib/routage-donnees";
import { contrainteDuCompte } from "@/lib/abonnement";
import { ChoixAgents } from "./choix-agents";

export const metadata: Metadata = {
  title: "Choisir vos agents — CAXE",
};

// Moment qui suit le choix de la formule : le paiement n'est pas branché (aucun
// paiement n'est pris), mais, connecté, le dirigeant enregistre ses agents. La
// formule arrive dans l'adresse (?agents=3&periode=annuel). Les professions
// réglementées n'ont pas l'agent Comm et 3 agents au maximum.
export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ agents?: string; periode?: string }>;
}) {
  const { agents, periode } = await searchParams;
  const offre: Offre =
    OFFRES.find((o) => String(o.nombreAgents) === agents) ??
    OFFRES.find((o) => o.nombreAgents === 3)!;

  const session = await auth();
  const utilisateur = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { categorie: true } })
    : null;
  const contrainte = utilisateur ? contrainteDuCompte(ROUTAGE, utilisateur.categorie) : { agentsExclus: [], nombreMaxAgents: null };
  const dejaChoisis = utilisateur
    ? (
        await prisma.agentAccess.findMany({
          where: { userId: session!.user!.id!, actif: true },
          select: { agent: true },
        })
      ).map((a) => a.agent)
    : [];

  return (
    <>
      <SiteHeader />
      <main className="relative flex-1 overflow-hidden px-6 pb-20 pt-12 sm:pt-16 lg:px-10">
        <GrillePoints position="centre" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <ChoixAgents
            offre={offre}
            annuel={periode === "annuel"}
            connecte={utilisateur !== null}
            agentsExclus={contrainte.agentsExclus}
            nombreMax={contrainte.nombreMaxAgents}
            dejaChoisis={dejaChoisis}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EnteteParcours } from "@/components/parcours/entete-parcours";
import { GrillePoints } from "@/components/marketing/grille-points";
import { ROUTAGE } from "@/lib/routage-donnees";
import { contrainteDuCompte } from "@/lib/abonnement";
import { compteRoutable } from "@/lib/compte";
import { accesOuvert } from "@/lib/paiement/etat";
import { lirePreselection } from "@/lib/formule-url";
import { LienRetour } from "@/components/parcours/lien-retour";
import { FormuleChoix } from "./formule-choix";

export const metadata: Metadata = { title: "Choisir votre formule — CAXE" };
export const dynamic = "force-dynamic";

// Troisième étape : les trois formules côte à côte, le choix se fait sur place. Le métier est connu : les agents
// proposés s'adaptent à lui. Une formule regardée avant le compte (?agents=3&periode=annuel) est reprise comme préférence.
export default async function FormulePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?depuis=/formule");
  const userId = session.user.id;
  const [utilisateur, abonnement, acces] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { categorie: true, metierPrecis: true, sousVariantes: true } }),
    prisma.abonnement.findUnique({ where: { userId } }),
    prisma.agentAccess.findMany({ where: { userId, actif: true }, select: { agent: true } }),
  ]);
  if (!utilisateur) redirect("/connexion");
  const routable = compteRoutable(utilisateur);
  if (!routable) redirect("/inscription/metier");
  if (abonnement && accesOuvert(abonnement, new Date())) redirect("/compte");

  const contrainte = contrainteDuCompte(ROUTAGE, routable);
  const preselection = lirePreselection(`?${new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined)).toString()}`);
  const nombre = (abonnement?.nombreAgents ?? preselection.nombreAgents) as 2 | 3 | 4 | null;
  const periode = abonnement ? (abonnement.periode === "ANNUEL" ? "annuel" : "mensuel") : (preselection.periode ?? "mensuel");

  return (
    <>
      <EnteteParcours etape={3} />
      <main className="relative flex-1 overflow-hidden px-6 pb-20 pt-4 lg:px-10">
        <GrillePoints position="centre" />
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <LienRetour href="/inscription/metier" />
          <div className="mx-auto mt-2 max-w-2xl text-center">
            <h1 className="text-3xl sm:text-4xl">Choisissez votre formule</h1>
            <p className="mt-3 text-[var(--text-muted)]">
              Un abonnement par paliers, selon le nombre d&apos;agents. Prix hors taxes. Vous pouvez changer de métier avant de payer.
            </p>
          </div>
          <div className="mt-10">
            <FormuleChoix agentsExclus={contrainte.agentsExclus} nombreMax={contrainte.nombreMaxAgents} initial={{ nombreAgents: nombre, periode, agents: acces.map((a) => a.agent) }} />
          </div>
        </div>
      </main>
    </>
  );
}

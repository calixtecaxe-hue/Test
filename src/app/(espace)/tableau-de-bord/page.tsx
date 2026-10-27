import type { Metadata } from "next";
import Link from "next/link";
import { exigerEspaceAbonne } from "@/lib/paiement/abonnement-serveur";
import { prisma } from "@/lib/prisma";
import { getMetier } from "@/lib/metiers";
import { AGENTS } from "@/lib/agents";
import { progressionAgents } from "@/lib/audit/progression";
import { ROUTAGE } from "@/lib/routage-donnees";
import { contrainteDuCompte } from "@/lib/abonnement";
import { CarteAgent, CarteAgentNonInclus } from "@/components/espace/carte-agent";

export const metadata: Metadata = { title: "Mes agents — CAXE" };

const NOMBRES = ["", "votre agent", "vos deux agents", "vos trois agents", "vos quatre agents"];

// Accueil de l'application : le conseil CAXE du dirigeant, ses agents et l'état de chaque audit. Le dirigeant commence par
// l'agent qu'il veut ; son objectif vient ensuite, sur la page de l'agent.
export default async function TableauDeBord({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const { bienvenue } = await searchParams;
  const { userId, utilisateur } = await exigerEspaceAbonne("/tableau-de-bord");

  const acces = await prisma.agentAccess.findMany({ where: { userId, actif: true }, select: { agent: true } });
  const inclus = AGENTS.filter((a) => acces.some((x) => x.agent === a.code));
  const contrainte = contrainteDuCompte(ROUTAGE, utilisateur);
  const fermes = AGENTS.filter((a) => !inclus.includes(a) && !contrainte.agentsExclus.includes(a.code));
  const progression = await progressionAgents(userId, utilisateur, inclus.map((a) => a.code));

  const metier = getMetier(utilisateur.metierPrecis);
  const libelleMetier = utilisateur.metierPrecis === "absent" ? (utilisateur.metierAbsentTexte ?? "Autre métier") : (metier?.libelle ?? utilisateur.metierPrecis);

  return (
    <main className="fond-espace flex-1">
      <div className="relative z-10 mx-auto flex w-full max-w-[1320px] flex-col gap-12 px-6 pb-24 pt-10 sm:gap-14 sm:pt-14 lg:px-10">
        <header className="audit-entree flex flex-col items-center text-center">
          <span className="badge-dispo" role={bienvenue ? "status" : undefined}>
            {bienvenue ? "Abonnement actif" : "Votre conseil CAXE"}
          </span>
          <h1 className="mt-6 max-w-[34ch] text-balance text-[1.875rem] leading-[1.15] sm:text-[2.6rem]">
            Quel pilier de votre entreprise voulez-vous <span className="accent-degrade accent-calme">améliorer</span> aujourd&apos;hui&nbsp;?
          </h1>
          <p className="mt-5 max-w-[60ch] text-balance text-[var(--text-muted)]">
            Choisissez l&apos;un de {NOMBRES[inclus.length] || "vos agents"} : il analyse un pilier de votre entreprise et identifie vos prochaines priorités, à partir de l&apos;objectif que vous lui fixez.
          </p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
            {libelleMetier} · {utilisateur.ville}
          </p>
        </header>

        {inclus.length === 0 ? (
          <p className="text-center text-[var(--text-muted)]">
            Aucun agent n&apos;est inclus dans votre formule.{" "}
            <Link href="/compte" className="text-[var(--blue-1)] hover:underline">
              Voir mon compte
            </Link>
          </p>
        ) : (
          <ul className="grille-conseil" aria-label="Vos agents">
            {inclus.map((a, i) => (
              <CarteAgent key={a.code} agent={a} progression={progression[a.code]} rang={i} />
            ))}
            {fermes.map((a) => (
              <CarteAgentNonInclus key={a.code} agent={a} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

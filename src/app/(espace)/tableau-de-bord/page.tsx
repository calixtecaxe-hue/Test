import type { Metadata } from "next";
import Link from "next/link";
import { exigerEspaceAbonne } from "@/lib/paiement/abonnement-serveur";
import { prisma } from "@/lib/prisma";
import { getMetier } from "@/lib/metiers";
import { AGENTS, couleurAgent, type Agent } from "@/lib/agents";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { progressionAgents, type EtapeAgent, type ProgressionAgent } from "@/lib/audit/progression";
import { ROUTAGE } from "@/lib/routage-donnees";
import { contrainteDuCompte } from "@/lib/abonnement";

export const metadata: Metadata = { title: "Mes agents — CAXE" };

const ACTION: Record<EtapeAgent, string> = {
  objectif: "Commencer avec cet agent",
  niveau: "Choisir mon niveau",
  questionnaire: "Reprendre mon audit",
  termine: "Revoir mon audit",
  en_preparation: "Voir mon audit",
};

function formaterDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const libelleAction = (p: ProgressionAgent) => (p.etape === "questionnaire" && p.traitees === 0 ? "Commencer mon questionnaire" : ACTION[p.etape]);

// Une carte par agent : son portrait, ce à quoi il répond, et une seule action. Le dirigeant commence par
// l'agent qu'il veut ; son objectif vient ensuite, sur la page de l'agent.
function CarteAgent({ agent, p, rang }: { agent: Agent; p: ProgressionAgent; rang: number }) {
  const couleur = couleurAgent[agent.couleur];
  const ratio = p.questions > 0 ? Math.min(1, p.traitees / p.questions) : 0;
  const enCours = p.etape === "questionnaire" || p.etape === "termine";
  return (
    <li
      data-couleur={agent.couleur}
      style={{ "--d": `${120 + rang * 110}ms` } as React.CSSProperties}
      className="audit-agent audit-entree carte-agent flex flex-col gap-6 border border-[var(--line)] bg-[var(--panel)] p-7"
    >
      <div className="flex items-center gap-5">
        <div className="dash-portrait h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full">
          <AgentAvatar code={agent.code} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl leading-snug">{agent.nom}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{agent.question}</p>
        </div>
      </div>

      {p.objectif ? (
        <div>
          <p className="text-[var(--text)]">{p.objectif.phrase}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Échéance : {formaterDate(p.objectif.echeance)}</p>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-5">
        {enCours ? (
          <div>
            <div className="flex items-baseline justify-between text-xs text-[var(--text-muted)]">
              <span>Questionnaire</span>
              <span>
                {p.traitees} sur {p.questions}
              </span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--ink)/0.1)]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={p.questions}
              aria-valuenow={p.traitees}
              aria-label={`Questionnaire ${agent.nom}`}
            >
              <div className="h-full rounded-full" style={{ width: `${Math.round(ratio * 100)}%`, background: couleur.barre }} />
            </div>
          </div>
        ) : null}
        {p.etape === "en_preparation" ? <p className="text-xs text-[var(--text-muted)]">Le questionnaire de votre activité est en préparation.</p> : null}
        <Link
          href={`/audit/${agent.slug}`}
          className={`${p.etape === "termine" ? "dash-bouton-discret" : "audit-bouton bouton-eclat"} w-fit rounded-[4px] px-5 py-2.5 text-sm font-semibold`}
        >
          {libelleAction(p)}
        </Link>
      </div>
    </li>
  );
}

function CarteAgentFermee({ agent }: { agent: Agent }) {
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-dashed border-[var(--line)] p-7 opacity-80">
      <div className="flex items-center gap-5">
        <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border border-[var(--line)] grayscale">
          <AgentAvatar code={agent.code} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl leading-snug">{agent.nom}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Non inclus dans votre formule</p>
        </div>
      </div>
      <Link href={`/agents/${agent.slug}`} className="w-fit text-sm text-[var(--blue-1)] hover:underline">
        Découvrir cet agent
      </Link>
    </li>
  );
}

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
    <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-12 px-6 py-14">
      <header className="audit-entree flex flex-col items-center text-center">
        {bienvenue ? (
          <span className="badge-dispo sans-point" role="status">
            Abonnement actif
          </span>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {libelleMetier} · {utilisateur.ville}
          </p>
        )}
        <h1 className="mt-5 text-4xl sm:text-5xl">Mes agents</h1>
        <p className="mt-4 max-w-[58ch] text-[var(--text-muted)]">
          Choisissez l&apos;agent par lequel vous voulez commencer. Chaque audit débute par l&apos;objectif que vous souhaitez atteindre : ce que vous voulez changer, de combien, en combien de temps.
        </p>
      </header>

      {inclus.length === 0 ? (
        <p className="text-center text-[var(--text-muted)]">
          Aucun agent n&apos;est inclus dans votre formule. <Link href="/compte" className="text-[var(--blue-1)] hover:underline">Voir mon compte</Link>
        </p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2" aria-label="Vos agents">
          {inclus.map((a, i) => (
            <CarteAgent key={a.code} agent={a} p={progression[a.code]} rang={i} />
          ))}
          {fermes.map((a) => (
            <CarteAgentFermee key={a.code} agent={a} />
          ))}
        </ul>
      )}
    </main>
  );
}

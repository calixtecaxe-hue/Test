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
  objectif: "Définir mon objectif",
  niveau: "Choisir mon niveau",
  questionnaire: "Reprendre mon audit",
  termine: "Revoir mon audit",
  en_preparation: "Voir mon audit",
};

function formaterDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const libelleAction = (p: ProgressionAgent) => (p.etape === "questionnaire" && p.traitees === 0 ? "Commencer mon questionnaire" : ACTION[p.etape]);

function ProchaineEtape({ agent, p }: { agent: Agent; p: ProgressionAgent }) {
  const texte =
    p.etape === "objectif"
      ? `Commencez par votre objectif pour l'agent ${agent.nom}.`
      : p.etape === "niveau"
        ? `Choisissez votre niveau de questionnaire pour l'agent ${agent.nom}.`
        : p.traitees === 0
          ? `Votre objectif est défini. Commencez le questionnaire de l'agent ${agent.nom} : ${p.questions} questions, aucune n'est obligatoire.`
          : `Reprenez votre audit ${agent.nom} : ${p.traitees} question${p.traitees > 1 ? "s" : ""} traitée${p.traitees > 1 ? "s" : ""} sur ${p.questions}.`;
  return (
    <section aria-labelledby="prochaine" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <div className="min-w-0">
        <h2 id="prochaine" className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--blue-1)]">
          Prochaine étape
        </h2>
        <p className="mt-2 max-w-[56ch] text-[var(--text)]">{texte}</p>
      </div>
      <Link href={`/audit/${agent.slug}`} className="bouton-eclat rounded-[4px] bg-[var(--blue-1)] px-5 py-3 text-sm font-semibold text-[var(--bg)]">
        {libelleAction(p)}
      </Link>
    </section>
  );
}

function CarteAgent({ agent, p }: { agent: Agent; p: ProgressionAgent }) {
  const couleur = couleurAgent[agent.couleur];
  const ratio = p.questions > 0 ? Math.min(1, p.traitees / p.questions) : 0;
  return (
    <li className="carte-agent flex flex-col gap-5 border border-[var(--line)] bg-[var(--panel)] p-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[var(--line)]">
          <AgentAvatar code={agent.code} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg leading-snug">{agent.nom}</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{agent.question}</p>
        </div>
      </div>

      {p.objectif ? (
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Votre objectif</p>
          <p className="mt-1 text-[var(--text)]">{p.objectif.phrase}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Échéance : {formaterDate(p.objectif.echeance)}</p>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Chaque audit commence par votre objectif : ce que vous voulez changer, de combien, en combien de temps.</p>
      )}

      <div className="mt-auto flex flex-col gap-4">
        {p.etape === "questionnaire" || p.etape === "termine" ? (
          <div>
            <div className="flex items-baseline justify-between text-xs text-[var(--text-muted)]">
              <span>Questionnaire</span>
              <span>
                {p.traitees} sur {p.questions}
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-[rgb(var(--ink)/0.1)]"
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
          className="w-fit rounded-[4px] border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
        >
          {libelleAction(p)}
        </Link>
      </div>
    </li>
  );
}

function CarteAgentFermee({ agent }: { agent: Agent }) {
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-dashed border-[var(--line)] p-6 opacity-80">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[var(--line)] grayscale">
          <AgentAvatar code={agent.code} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg leading-snug">{agent.nom}</h3>
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

  const aFaire = inclus.find((a) => progression[a.code].etape !== "termine" && progression[a.code].etape !== "en_preparation");
  const metier = getMetier(utilisateur.metierPrecis);
  const libelleMetier = utilisateur.metierPrecis === "absent" ? (utilisateur.metierAbsentTexte ?? "Autre métier") : (metier?.libelle ?? utilisateur.metierPrecis);

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-8 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          {libelleMetier} · {utilisateur.ville}
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Mes agents</h1>
      </header>

      {bienvenue ? (
        <p className="rounded-xl border border-[rgb(var(--green-rgb)/0.45)] px-5 py-4 text-sm" role="status">
          Votre abonnement est actif. Choisissez un agent pour commencer : chaque audit débute par votre objectif.
        </p>
      ) : null}

      {aFaire ? <ProchaineEtape agent={aFaire} p={progression[aFaire.code]} /> : null}

      {inclus.length === 0 ? (
        <p className="text-[var(--text-muted)]">
          Aucun agent n&apos;est inclus dans votre formule. <Link href="/compte" className="text-[var(--blue-1)] hover:underline">Voir mon compte</Link>
        </p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2" aria-label="Vos agents">
          {inclus.map((a) => (
            <CarteAgent key={a.code} agent={a} p={progression[a.code]} />
          ))}
          {fermes.map((a) => (
            <CarteAgentFermee key={a.code} agent={a} />
          ))}
        </ul>
      )}
    </main>
  );
}

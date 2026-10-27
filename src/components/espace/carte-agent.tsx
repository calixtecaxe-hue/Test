import Link from "next/link";
import type { Agent } from "@/lib/agents";
import type { ProgressionAgent } from "@/lib/audit/progression";
import { CONSEILS } from "@/lib/agent-presentation";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { BadgeStatut } from "./badge-statut";
import { IndicateurProgression } from "./indicateur-progression";
import { etatAudit } from "./etat-audit";

function formaterDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// En-tête commun aux cartes : le médaillon de l'agent, son nom, sa promesse, et la pastille d'état.
function TeteCarte({ agent, badge }: { agent: Agent; badge: React.ReactNode }) {
  return (
    <div className="carte-conseil-tete">
      <div className="medaillon-agent" aria-hidden="true">
        <AgentAvatar code={agent.code} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h2 className="carte-conseil-nom">{agent.nom}</h2>
          {badge}
        </div>
        <p className="carte-conseil-promesse">{CONSEILS[agent.code].promesse}</p>
      </div>
    </div>
  );
}

function Domaines({ agent }: { agent: Agent }) {
  return (
    <ul className="carte-conseil-domaines" aria-label="Domaines analysés">
      {CONSEILS[agent.code].domaines.map((d) => (
        <li key={d}>{d}</li>
      ))}
    </ul>
  );
}

// Un agent inclus dans la formule : son état d'audit, l'avancement, l'objectif fixé et une seule action.
export function CarteAgent({ agent, progression, rang }: { agent: Agent; progression: ProgressionAgent; rang: number }) {
  const etat = etatAudit(progression);
  const href = `/audit/${agent.slug}${etat.etapeResultats ? "?etape=4" : ""}`;
  return (
    <li data-couleur={agent.couleur} className="audit-agent carte-conseil audit-entree" style={{ "--d": `${120 + rang * 90}ms` } as React.CSSProperties}>
      <TeteCarte agent={agent} badge={<BadgeStatut statut={etat.statut} libelle={etat.libelle} />} />
      <Domaines agent={agent} />

      <div className="carte-conseil-pied">
        <div className="min-w-0 flex-1 space-y-3">
          {progression.objectif ? (
            <div>
              <p className="carte-conseil-etiquette">Votre objectif</p>
              <p className="mt-1 text-sm leading-snug text-[var(--text)]">{progression.objectif.phrase}</p>
              <p className="mt-0.5 text-xs text-[var(--text-faint)]">Échéance : {formaterDate(progression.objectif.echeance)}</p>
            </div>
          ) : null}
          {etat.pourcent !== null ? (
            <IndicateurProgression pourcent={etat.pourcent} traitees={progression.traitees} questions={progression.questions} libelle={`Questionnaire ${agent.nom}`} />
          ) : etat.statut === "en_cours" ? (
            <p className="text-sm text-[var(--text-muted)]">Objectif fixé. Il reste à choisir le niveau du questionnaire.</p>
          ) : etat.statut === "preparation" ? (
            <p className="text-sm text-[var(--text-muted)]">Le questionnaire de votre activité est en préparation.</p>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">L&apos;audit commence par l&apos;objectif que vous voulez atteindre.</p>
          )}
        </div>
        <Link href={href} className={etat.statut === "preparation" ? "bouton-secondaire carte-conseil-action" : "bouton-eclat carte-conseil-action"}>
          {etat.action}
        </Link>
      </div>
    </li>
  );
}

// Un agent que la formule n'inclut pas : présenté de la même façon, en retrait, avec un lien vers sa présentation.
export function CarteAgentNonInclus({ agent }: { agent: Agent }) {
  return (
    <li data-couleur={agent.couleur} className="audit-agent carte-conseil carte-conseil-retrait">
      <TeteCarte agent={agent} badge={<BadgeStatut statut="non_inclus" libelle="Non inclus" />} />
      <Domaines agent={agent} />
      <div className="carte-conseil-pied">
        <p className="min-w-0 flex-1 text-sm text-[var(--text-muted)]">Vous pouvez l&apos;ajouter depuis votre compte, en changeant de formule.</p>
        <Link href={`/agents/${agent.slug}`} className="bouton-secondaire carte-conseil-action">
          Découvrir cet agent
        </Link>
      </div>
    </li>
  );
}

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
        {badge}
        <h2 className="carte-conseil-nom mt-3">{agent.nom}</h2>
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
        {progression.objectifs.length === 1 ? (
          <div>
            <p className="carte-conseil-etiquette">Votre objectif</p>
            <p className="mt-1 text-sm leading-snug text-[var(--text)]">{progression.objectifs[0].phrase}</p>
            <p className="mt-0.5 text-xs text-[var(--text-faint)]">Échéance : {formaterDate(progression.objectifs[0].echeance)}</p>
          </div>
        ) : progression.objectifs.length > 1 ? (
          <div>
            <p className="carte-conseil-etiquette">Vos {progression.objectifs.length} objectifs</p>
            <ul className="mt-1 flex flex-col gap-1">
              {progression.objectifs.map((o, i) => (
                <li key={i} className="text-sm leading-snug text-[var(--text)]">
                  {o.phrase} <span className="text-xs text-[var(--text-faint)]">· échéance : {formaterDate(o.echeance)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="carte-conseil-ligne">
          <div className="carte-conseil-etat">
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
        <div className="carte-conseil-ligne">
          <p className="carte-conseil-etat text-sm text-[var(--text-muted)]">Vous pouvez l&apos;ajouter depuis votre compte, en changeant de formule.</p>
          <Link href={`/agents/${agent.slug}`} className="bouton-secondaire carte-conseil-action">
            Découvrir cet agent
          </Link>
        </div>
      </div>
    </li>
  );
}

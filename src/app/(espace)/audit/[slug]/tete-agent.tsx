import { AgentAvatar } from "@/components/marketing/agent-avatar";
import type { Agent } from "@/lib/agents";

// 1 : objectif à définir. 2 : niveau et cadrage. 3 : questionnaire. 4 : résultats (pas encore ouverts).
export type EtapeParcours = 1 | 2 | 3;

const ETAPES = [
  { n: 1, libelle: "Objectif" },
  { n: 2, libelle: "Niveau et cadrage" },
  { n: 3, libelle: "Questionnaire" },
] as const;

function Coche() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

// En-tête de la page d'un agent : qui il est, la question à laquelle il répond, et où en est le
// dirigeant dans le parcours. L'objectif vient toujours en premier.
export function TeteAgent({ agent, etape }: { agent: Agent; etape: EtapeParcours }) {
  return (
    <header className="flex flex-col gap-7">
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[var(--line)] sm:h-24 sm:w-24">
          <AgentAvatar code={agent.code} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--blue-1)]">Audit</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">{agent.nom}</h1>
          <p className="mt-2 text-[var(--text-muted)]">{agent.question}</p>
        </div>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Votre parcours avec cet agent">
        {ETAPES.map((e) => {
          const fait = e.n < etape;
          const courant = e.n === etape;
          return (
            <li
              key={e.n}
              aria-current={courant ? "step" : undefined}
              className={`flex items-center gap-3 rounded-[4px] border px-3 py-2.5 text-sm ${courant ? "border-[var(--blue-1)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-muted)]"}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${fait ? "border-[rgb(var(--green-rgb)/0.7)] text-[var(--green-1)]" : courant ? "border-[var(--blue-1)] text-[var(--blue-1)]" : "border-[var(--line)]"}`}
              >
                {fait ? <Coche /> : e.n}
              </span>
              <span>
                {e.libelle}
                {fait ? <span className="sr-only"> (terminé)</span> : null}
              </span>
            </li>
          );
        })}
        <li className="flex items-center gap-3 rounded-[4px] border border-dashed border-[var(--line)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-xs font-semibold">4</span>
          <span>
            Résultats <span className="block text-xs text-[var(--amber-1)]">Bientôt</span>
          </span>
        </li>
      </ol>
    </header>
  );
}

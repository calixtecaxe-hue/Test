import Link from "next/link";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { couleurAgent, type Agent } from "@/lib/agents";

// 1 : objectif à définir. 2 : niveau et cadrage. 3 : questionnaire. 4 : résultats (pas encore ouverts).
export type EtapeParcours = 1 | 2 | 3 | 4;

const ETAPES = [
  { n: 1, libelle: "Objectif" },
  { n: 2, libelle: "Niveau et cadrage" },
  { n: 3, libelle: "Questionnaire" },
  { n: 4, libelle: "Résultats" },
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
// `etape` : l'étape affichée ; `max` : la dernière étape atteinte. Une étape déjà atteinte se rouvre en cliquant dessus.
// `resultats` : l'étape 4 est ouverte (maquette du compte rendu) ; sinon elle reste annoncée « Bientôt ».
export function TeteAgent({ agent, etape, max = etape, resultats = false }: { agent: Agent; etape: EtapeParcours; max?: EtapeParcours; resultats?: boolean }) {
  return (
    <header className="flex flex-col gap-7">
      <div className="audit-entree flex items-center gap-5">
        <div className="audit-portrait h-20 w-20 shrink-0 overflow-hidden rounded-full sm:h-24 sm:w-24">
          <AgentAvatar code={agent.code} />
        </div>
        <div className="min-w-0">
          <p className="audit-kicker text-xs font-semibold uppercase tracking-[0.1em]">Audit</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">{agent.nom}</h1>
          <p className="mt-2 text-[var(--text-muted)]">{agent.question}</p>
        </div>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Votre parcours avec cet agent">
        {ETAPES.filter((e) => e.n < 4 || resultats).map((e, i) => {
          const fait = e.n < max;
          const courant = e.n === etape;
          const atteignable = (e.n <= max || (resultats && e.n === 4)) && !courant;
          const classes = `audit-etape flex items-center gap-3 rounded-[4px] border px-3 py-2.5 text-sm ${courant ? "courante text-[var(--text)]" : "border-[var(--line)] text-[var(--text-muted)]"}${atteignable ? " audit-etape-lien" : ""}`;
          const contenu = (
            <>
              <span
                className={`audit-etape-numero flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${fait ? "border-[rgb(var(--green-rgb)/0.7)] text-[var(--green-1)]" : courant ? "" : "border-[var(--line)]"}`}
              >
                {fait ? <Coche /> : e.n}
              </span>
              <span>
                {e.libelle}
                {fait ? <span className="sr-only"> (terminé)</span> : null}
                {atteignable ? <span className="sr-only"> : {e.n > max ? "ouvrir" : "revenir à"} cette étape</span> : null}
              </span>
            </>
          );
          return (
            <li key={e.n} style={{ "--d": `${120 + i * 90}ms` } as React.CSSProperties} className="audit-entree flex">
              {atteignable ? (
                <Link href={`/audit/${agent.slug}?etape=${e.n}`} className={`${classes} w-full`}>
                  {contenu}
                </Link>
              ) : (
                <div aria-current={courant ? "step" : undefined} className={`${classes} w-full`}>
                  {contenu}
                </div>
              )}
            </li>
          );
        })}
        {resultats ? null : <li style={{ "--d": "390ms" } as React.CSSProperties} className="audit-entree flex items-center gap-3 rounded-[4px] border border-dashed border-[var(--line)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-xs font-semibold">4</span>
          <span>
            Résultats <span className="block text-xs text-[var(--amber-1)]">Bientôt</span>
          </span>
        </li>}
      </ol>
      <div className="audit-progres" role="presentation">
        <div style={{ width: `${(etape / 4) * 100}%`, background: couleurAgent[agent.couleur].barre }} />
      </div>
    </header>
  );
}

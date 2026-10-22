import type { Agent } from "@/lib/agents";
import { EXEMPLES, VERDICTS, type CouleurConstat } from "@/lib/audit/resultats-exemple";

const MOT_COULEUR: Record<CouleurConstat, string> = { rouge: "Rouge", orange: "Orange", vert: "Vert" };

function Origine({ de }: { de: "moteur" | "ia" }) {
  return <span className="res-origine">{de === "moteur" ? "Calculé par le moteur" : "Rédigé par l’IA"}</span>;
}

// MAQUETTE du compte rendu : trois onglets (objectif, priorités, plan d'action), sans JavaScript (boutons radio
// et :checked). Les chiffres sont des exemples fictifs ; voir resultats-exemple.ts.
export function ResultatsMaquette({ agent, objectif, echeance, reussite }: { agent: Agent; objectif: string; echeance: string; reussite: string | null }) {
  const ex = EXEMPLES[agent.code];
  if (!ex) return null;
  return (
    <section aria-labelledby="resultats" className="res audit-entree mt-8" style={{ "--d": "300ms" } as React.CSSProperties}>
      <h2 id="resultats" className="text-2xl">
        Votre compte rendu
      </h2>
      <p className="res-exemple" role="note">
        <strong>Exemple de présentation.</strong> {ex.entreprise} Les chiffres ci-dessous sont fictifs : le compte rendu définitif part de vos réponses.
      </p>

      <input type="radio" name="res-onglet" id="res-o1" className="res-radio" defaultChecked />
      <input type="radio" name="res-onglet" id="res-o2" className="res-radio" />
      <input type="radio" name="res-onglet" id="res-o3" className="res-radio" />

      <div className="res-barre" role="presentation">
        <label htmlFor="res-o1">Objectif</label>
        <label htmlFor="res-o2">Priorités</label>
        <label htmlFor="res-o3">Plan d&apos;action</label>
      </div>

      <div className="res-panneaux">
        <div className="res-panneau res-p1">
          <div className="audit-objectif-actif rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Votre objectif</p>
            <p className="mt-2 text-lg text-[var(--text)]">{objectif}</p>
            {reussite ? <p className="mt-2 text-sm text-[var(--text)]">Réussite : {reussite}</p> : null}
            <p className="mt-2 text-sm text-[var(--text-muted)]">Échéance : {echeance}</p>
            <div className="res-avancement mt-5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-[var(--text)]">Avancement déclaré</span>
                <span className="text-[var(--text)]">{ex.avancement.pourcent} %</span>
              </div>
              <div className="audit-progres mt-2" role="presentation">
                <div style={{ width: `${Math.max(ex.avancement.pourcent, 2)}%`, background: "var(--agent)" }} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{ex.avancement.phrase}</p>
            </div>
          </div>

          <div className="res-bloc">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base">Réalisme de l&apos;objectif</h3>
              <Origine de="moteur" />
            </div>
            {ex.realisme ? (
              <>
                <p className={`res-verdict res-verdict-${ex.realisme.verdict}`}>{VERDICTS[ex.realisme.verdict]}</p>
                <dl className="res-chiffres">
                  {ex.realisme.chiffres.map((c) => (
                    <div key={c.libelle}>
                      <dt>{c.libelle}</dt>
                      <dd>{c.valeur}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-sm text-[var(--text-muted)]">{ex.realisme.phrase}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">Pas de verdict de réalisme : votre objectif n&apos;a pas de chiffre à comparer. Le moteur ne juge pas ce qu&apos;il ne peut pas mesurer.</p>
            )}
          </div>

          <div className="res-bloc">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base">{agent.question}</h3>
              <Origine de="ia" />
            </div>
            <p className="mt-3 text-[var(--text)]">{ex.reponseAgent.verdict}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{ex.reponseAgent.phrase}</p>
          </div>
        </div>

        <div className="res-panneau res-p2">
          <p className="text-sm text-[var(--text-muted)]">Les thèmes qui pèsent le plus sur votre objectif, du plus important au moins important. Un point fort s&apos;affiche aussi, pour le conserver.</p>
          <ol className="res-liste">
            {ex.priorites.map((p, i) => (
              <li key={p.theme} className="res-priorite">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="res-rang" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="text-lg">{p.theme}</h3>
                  <span className={`res-statut res-statut-${p.couleur}`}>
                    <span className="res-point" aria-hidden="true" />
                    {MOT_COULEUR[p.couleur]}
                  </span>
                </div>
                <div className="res-corps">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm text-[var(--text-muted)]">Votre situation</p>
                    <Origine de="moteur" />
                  </div>
                  <p className="mt-1 text-[var(--text)]">{p.constat}</p>
                  {p.repere ? <p className="mt-1 text-sm text-[var(--text-muted)]">{p.repere}</p> : <p className="mt-1 text-sm text-[var(--text-muted)]">Analysé à partir de vos propres chiffres, sans repère de marché.</p>}
                  <p className={`res-impact res-impact-${p.impact.genre}`}>
                    <strong>{p.impact.libelle}</strong>
                    <span>{p.impact.detail}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm text-[var(--text-muted)]">Ce que cela veut dire</p>
                    <Origine de="ia" />
                  </div>
                  <p className="mt-1 text-sm text-[var(--text)]">{p.lecture}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-[var(--text-muted)]">Un potentiel est un potentiel, jamais une promesse. Sans taux sourcé pour votre métier, le rapport donne le montant en jeu et décrit l&apos;effet en mots.</p>
          {ex.renvoi ? (
            <div className="res-renvoi">
              <p className="text-sm text-[var(--text)]">{ex.renvoi.texte}</p>
              <span className="res-renvoi-bouton">{ex.renvoi.bouton}</span>
            </div>
          ) : null}
        </div>

        <div className="res-panneau res-p3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-[var(--text-muted)]">Les actions sont classées selon votre temps réellement disponible : celles qui libèrent du temps passent en premier.</p>
            <Origine de="ia" />
          </div>
          <p className="mt-2 text-sm text-[var(--text)]">{ex.tempsDirigeant}</p>
          <ol className="res-liste">
            {ex.plan.map((a, i) => (
              <li key={a.action} className="res-action">
                <span className="res-rang" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base">{a.action}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{a.pourquoi}</p>
                  <ul className="res-meta">
                    <li>{a.duree}</li>
                    <li>{a.pointEtape}</li>
                    {a.libereDuTemps ? <li className="res-libere">{a.libereDuTemps}</li> : null}
                    {a.aLancerApres ? <li className="res-attente">{a.aLancerApres}</li> : null}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-[var(--text-muted)]">Chaque action a son propre point d&apos;étape : vous déclarez alors ce qui s&apos;est passé, et l&apos;avancement vers l&apos;objectif se met à jour.</p>
        </div>
      </div>
    </section>
  );
}

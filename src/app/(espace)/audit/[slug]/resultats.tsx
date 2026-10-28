import Link from "next/link";
import type { Agent } from "@/lib/agents";
import { phraseEvolution, type LigneTheme, type VueCompteRendu } from "@/lib/audit/compte-rendu";
import type { ResultatEvolution } from "@/lib/moteur/evolution";
import type { ObjectifAffiche } from "./objectif-actif";

const MOT_COULEUR = { rouge: "Rouge", orange: "Orange", vert: "Vert" } as const;

function Origine() {
  return <span className="res-origine">Calculé à partir de vos réponses</span>;
}

function pluriel(n: number, un: string, plusieurs: string): string {
  return `${n} ${n > 1 ? plusieurs : un}`;
}

function Theme({ t }: { t: LigneTheme }) {
  return (
    <li className="res-theme">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-[var(--text)]">{t.nom}</p>
        {t.couleur ? (
          <span className={`res-statut res-statut-${t.couleur}`}>
            <span className="res-point" aria-hidden="true" />
            {MOT_COULEUR[t.couleur]}
            {t.aValider ? <span className="res-aval"> · à valider</span> : null}
            {t.estimee ? <span className="res-aval"> · valeur estimée</span> : null}
          </span>
        ) : t.couverture ? (
          <span className="text-sm text-[var(--text-muted)]">
            {t.couverture.repondues} réponse{t.couverture.repondues > 1 ? "s" : ""} sur {t.couverture.posees}
          </span>
        ) : null}
      </div>
      {t.bloc ? <p className="mt-0.5 text-xs text-[var(--text-faint)]">{t.bloc}</p> : null}
      {t.reperes.length > 0 ? (
        <ul className="mt-2 grid gap-1 text-sm text-[var(--text-muted)]">
          {t.reperes.map((r) => (
            <li key={r.url + r.libelle}>
              Repère de marché : {r.libelle}. Source :{" "}
              <a href={r.url} target="_blank" rel="noreferrer" className="audit-kicker hover:underline">
                {r.organisme}, {r.annee}
              </a>
              {r.confiance === "indicatif" ? " (indicatif)" : ""}
              {r.perimee ? " · à revérifier" : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Groupe({ id, titre, intro, themes }: { id: string; titre: string; intro: string; themes: LigneTheme[] }) {
  if (themes.length === 0) return null;
  return (
    <section aria-labelledby={id} className="res-bloc">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={id} className="text-base">
          {titre} <span className="text-[var(--text-muted)]">({themes.length})</span>
        </h3>
        <Origine />
      </div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{intro}</p>
      <ul className="res-themes">
        {themes.map((t) => (
          <Theme key={t.code} t={t} />
        ))}
      </ul>
    </section>
  );
}

// Compte rendu : ce que le constat du moteur donne aujourd'hui sur les réponses du compte. Sans seuil ni
// repère de marché, aucun thème n'est noté et le dit ; l'ordre de priorité, l'impact et le plan d'action
// (rédigé par l'IA) ne sont pas encore construits et ne sont pas inventés.
// Évolutions : vos chiffres comparés à vos propres chiffres passés, sur les mêmes mois. Ni couleur ni jugement : un écart se lit
// avec votre activité et votre objectif. Ce qui ne peut pas encore être comparé dit précisément ce qui manque.
function Evolutions({ liste }: { liste: ResultatEvolution[] }) {
  if (liste.length === 0) return null;
  const lisibles = liste.filter((r) => r.statut !== "non_etablie");
  const manquantes = liste.filter((r) => r.statut === "non_etablie");
  return (
    <div className="res-bloc !mt-0" data-evolutions>
      <h3 className="text-base">Ce qui a changé, d&apos;après vos chiffres</h3>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Vos chiffres comparés à vos propres chiffres passés, sur des mois de même longueur. Un écart ne dit pas si c&apos;est bien ou mal : cela dépend de votre activité et de votre objectif.
      </p>
      {lisibles.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {lisibles.map((r) => (
            <li key={r.id} data-evolution={r.id} data-statut={r.statut}>
              <p className="text-sm font-medium text-[var(--text)]">{r.libelle}</p>
              <p className="mt-1 text-sm text-[var(--text)]">{phraseEvolution(r)}</p>
              {r.raison ? <p className="mt-1 text-sm text-[var(--text-muted)]">Non comparable : {r.raison}</p> : null}
              {r.notes.map((n) => (
                <p key={n} className="mt-1 text-xs text-[var(--text-muted)]">{n}</p>
              ))}
            </li>
          ))}
        </ul>
      ) : null}
      {manquantes.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-[var(--text-muted)]">
            {manquantes.length} comparaison{manquantes.length > 1 ? "s" : ""} pas encore possible{manquantes.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-2">
            {manquantes.map((r) => (
              <li key={r.id} data-evolution={r.id} data-statut={r.statut} className="text-sm">
                <span className="text-[var(--text)]">{r.libelle} : </span>
                <span className="text-[var(--text-muted)]">{r.raison}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function Resultats({ agent, vue, objectifs, questionnaire }: { agent: Agent; vue: VueCompteRendu; objectifs: ObjectifAffiche[]; questionnaire: string }) {
  const plusieurs = objectifs.length > 1;
  const evalues = vue.notes.length + vue.avecRepere.length + vue.sansRepere.length;
  const total = evalues + vue.aCompleter.length;
  return (
    <section aria-labelledby="resultats" className="res audit-entree mt-8" style={{ "--d": "300ms" } as React.CSSProperties}>
      <h2 id="resultats" className="text-2xl">
        Votre compte rendu
      </h2>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {pluriel(evalues, "thème analysé", "thèmes analysés")} sur {total}, d&apos;après vos réponses. Il se met à jour à chaque réponse que vous complétez.
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
          {/* Chaque objectif a son propre avancement (RH, Comm : plusieurs objectifs possibles). */}
          {objectifs.map((o, i) => (
            <div key={i} className={`audit-objectif-actif rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6${i > 0 ? " mt-4" : ""}`} data-objectif-resultat>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">{plusieurs ? `Objectif ${i + 1}` : "Votre objectif"}</p>
              <p className="mt-2 text-lg text-[var(--text)]" data-objectif-phrase>{o.phrase}</p>
              {o.reussite ? <p className="mt-2 text-sm text-[var(--text)]">Réussite : {o.reussite}</p> : null}
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {o.origine === "personnel" ? <>Objectif personnel · </> : null}Échéance : {o.echeance}
              </p>
              <div className="mt-5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-[var(--text)]">Avancement déclaré</span>
                  <span className="text-[var(--text)]">0 %</span>
                </div>
                <div className="audit-progres mt-2" role="presentation">
                  <div style={{ width: "2%", background: "var(--agent)" }} />
                </div>
                {i === objectifs.length - 1 ? (
                  <p className="mt-2 text-sm text-[var(--text-muted)]">Rien n&apos;est encore déclaré : l&apos;avancement se calcule sur ce que vous déclarez aux points d&apos;étape, jamais sur une estimation.</p>
                ) : null}
              </div>
            </div>
          ))}

          <div className="res-bloc">
            <h3 className="text-base">{plusieurs ? "Réalisme des objectifs" : "Réalisme de l'objectif"}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Pas encore évalué. Il se calcule à partir des repères de votre secteur et de vos volumes ; ils ne sont pas encore disponibles pour votre métier.</p>
          </div>

          <div className="res-bloc">
            <h3 className="text-base">{agent.question}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">La réponse de l&apos;agent est rédigée à partir du constat complet. Elle n&apos;est pas encore disponible.</p>
          </div>
        </div>

        <div className="res-panneau res-p2">
          <Evolutions liste={vue.evolutions} />
          {vue.notes.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Aucun thème n&apos;a encore de note : elle demande un repère de marché pour votre métier. L&apos;ordre de priorité apparaîtra ici une fois les thèmes notés.</p>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Les thèmes notés, du plus faible au plus fort. Le classement par impact sur votre objectif n&apos;est pas encore calculé.</p>
          )}
          <Groupe id="res-notes" titre="Thèmes notés" intro="Rouge : à corriger. Orange : à améliorer. Vert : point fort à conserver." themes={vue.notes} />
          <Groupe id="res-reperes" titre="Avec un repère de marché" intro="Votre situation se compare à un chiffre du marché, cité avec sa source." themes={vue.avecRepere} />
          <Groupe id="res-sans" titre="Analysés avec vos chiffres" intro="Ces thèmes sont analysés à partir de vos propres chiffres, sans repère de marché." themes={vue.sansRepere} />
          <Groupe id="res-completer" titre="À compléter" intro="Il manque des réponses pour évaluer ces thèmes : au moins la moitié des questions doit avoir une réponse." themes={vue.aCompleter} />
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            {vue.masques > 0 ? `${pluriel(vue.masques, "thème ne s'applique", "thèmes ne s'appliquent")} pas à votre entreprise. ` : ""}
            {vue.contexte > 0 ? `${pluriel(vue.contexte, "thème sert", "thèmes servent")} de contexte à l'analyse, sans note.` : ""}
          </p>
        </div>

        <div className="res-panneau res-p3">
          <div className="res-bloc !mt-0">
            <h3 className="text-base">Votre plan d&apos;action n&apos;est pas encore rédigé</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Le plan est rédigé par l&apos;agent à partir du constat de l&apos;onglet Priorités, dans l&apos;ordre de votre temps disponible. Plus vos réponses sont complètes, plus il est précis.
            </p>
            {vue.aCompleter.length > 0 ? (
              <Link href={questionnaire} className="audit-bouton bouton-eclat mt-4 inline-flex rounded-[4px] px-5 py-2.5 font-medium transition">
                Compléter mes réponses
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

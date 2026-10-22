import Link from "next/link";
import type { Agent } from "@/lib/agents";
import type { LigneTheme, VueCompteRendu } from "@/lib/audit/compte-rendu";

const MOT_COULEUR = { rouge: "Rouge", orange: "Orange", vert: "Vert" } as const;

function Origine() {
  return <span className="res-origine">Calculé par le moteur</span>;
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
export function Resultats({ agent, vue, objectif, echeance, reussite, questionnaire }: { agent: Agent; vue: VueCompteRendu; objectif: string; echeance: string; reussite: string | null; questionnaire: string }) {
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
          <div className="audit-objectif-actif rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Votre objectif</p>
            <p className="mt-2 text-lg text-[var(--text)]">{objectif}</p>
            {reussite ? <p className="mt-2 text-sm text-[var(--text)]">Réussite : {reussite}</p> : null}
            <p className="mt-2 text-sm text-[var(--text-muted)]">Échéance : {echeance}</p>
            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-[var(--text)]">Avancement déclaré</span>
                <span className="text-[var(--text)]">0 %</span>
              </div>
              <div className="audit-progres mt-2" role="presentation">
                <div style={{ width: "2%", background: "var(--agent)" }} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Rien n&apos;est encore déclaré : l&apos;avancement se calcule sur ce que vous déclarez aux points d&apos;étape, jamais sur une estimation.</p>
            </div>
          </div>

          <div className="res-bloc">
            <h3 className="text-base">Réalisme de l&apos;objectif</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Pas encore évalué. Il se calcule à partir des repères de votre secteur et de vos volumes ; ils ne sont pas encore disponibles pour votre métier.</p>
          </div>

          <div className="res-bloc">
            <h3 className="text-base">{agent.question}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">La réponse de l&apos;agent est rédigée à partir du constat complet. Elle n&apos;est pas encore disponible.</p>
          </div>
        </div>

        <div className="res-panneau res-p2">
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

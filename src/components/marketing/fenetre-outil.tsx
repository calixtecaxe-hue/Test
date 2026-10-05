"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AgentIcone } from "@/components/marketing/agent-icone";
import { AGENTS, couleurAgent } from "@/lib/agents";
import demo from "@/lib/demo-outil.json";

type Etape = "agent" | "profil" | "questionnaire" | "resultat";

type DemoAgent = {
  questions: { libelle: string; reponse: string; statut: string }[];
  indicateurs?: string[];
  action?: string;
  propositions?: string[];
};

const DEMO_AGENTS = demo.agents as Record<string, DemoAgent>;

const ETAPES: { id: Etape; libelle: string }[] = [
  { id: "agent", libelle: "Agent" },
  { id: "profil", libelle: "Profil" },
  { id: "questionnaire", libelle: "Questionnaire" },
  { id: "resultat", libelle: "Résultat" },
];

// Règle d'agrégation du produit (CLAUDE.md section 7) : vert 100, orange 50,
// rouge 0 ; le score est la moyenne des indicateurs notés, les indicateurs
// informatifs n'y entrent pas.
const NOTE: Record<string, number> = { Vert: 100, Orange: 50, Rouge: 0 };

const COULEUR_STATUT: Record<string, string> = {
  Vert: "#6fcf97",
  Orange: "var(--amber-1)",
  Rouge: "var(--red-1)",
  Informatif: "var(--text-faint)",
};

const REQUETE_MOUVEMENT_REDUIT = "(prefers-reduced-motion: reduce)";

function useMouvementReduit(): boolean {
  return useSyncExternalStore(
    (notifier) => {
      const media = window.matchMedia(REQUETE_MOUVEMENT_REDUIT);
      media.addEventListener("change", notifier);
      return () => media.removeEventListener("change", notifier);
    },
    () => window.matchMedia(REQUETE_MOUVEMENT_REDUIT).matches,
    () => false
  );
}

// Aperçu interactif du parcours : choix d'un agent, profil prérempli,
// questionnaire de cinq questions qui se remplit, résultat. Questions,
// profil et résultats sont des exemples fictifs (légende sous la fenêtre) ;
// les questionnaires réels des agents autres qu'Acquisition n'existent pas
// encore.
export function FenetreOutil() {
  const [etape, setEtape] = useState<Etape>("agent");
  const [indexAgent, setIndexAgent] = useState(0);
  const [questionsAffichees, setQuestionsAffichees] = useState(0);
  const reduit = useMouvementReduit();
  const corpsRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS[indexAgent];
  const couleur = couleurAgent[agent.couleur];
  const donnees = DEMO_AGENTS[agent.code];
  const total = donnees.questions.length;
  const visibles = reduit ? total : questionsAffichees;

  function choisir(index: number) {
    setIndexAgent(index);
    setQuestionsAffichees(0);
    setEtape("profil");
  }

  function versQuestionnaire() {
    setQuestionsAffichees(0);
    setEtape("questionnaire");
  }

  function versResultat() {
    setQuestionsAffichees(total);
    setEtape("resultat");
  }

  useEffect(() => {
    if (reduit) return;
    let minuteur: ReturnType<typeof setTimeout> | undefined;

    if (etape === "profil") {
      minuteur = setTimeout(() => {
        setQuestionsAffichees(0);
        setEtape("questionnaire");
      }, 3200);
    } else if (etape === "questionnaire") {
      minuteur =
        questionsAffichees < total
          ? setTimeout(
              () => setQuestionsAffichees(questionsAffichees + 1),
              questionsAffichees === 0 ? 500 : 1800
            )
          : setTimeout(() => setEtape("resultat"), 1500);
    }
    return () => clearTimeout(minuteur);
  }, [etape, questionsAffichees, reduit, total]);

  useEffect(() => {
    const corps = corpsRef.current;
    if (!corps) return;
    corps.scrollTo({ top: corps.scrollHeight, behavior: reduit ? "auto" : "smooth" });
  }, [etape, visibles, reduit]);

  const notes = donnees.questions.flatMap((q) =>
    q.statut in NOTE ? [NOTE[q.statut]] : []
  );
  const score = notes.length
    ? Math.round(notes.reduce((a, b) => a + b, 0) / notes.length)
    : null;
  const indexEtape = ETAPES.findIndex((e) => e.id === etape);

  return (
    <figure className="m-0">
      <div className="fenetre">
        <div className="fenetre-haut">
          <div className="fenetre-points" aria-hidden="true">
            <span style={{ background: "var(--red-1)" }} />
            <span style={{ background: "var(--white-1)" }} />
            <span style={{ background: "var(--blue-1)" }} />
          </div>
          <ol className="demo-etapes" aria-label="Étapes du parcours">
            {ETAPES.map((e, i) => (
              <li
                key={e.id}
                className={`demo-etape ${i === indexEtape ? "actif" : ""} ${i < indexEtape ? "fait" : ""}`}
                aria-current={i === indexEtape ? "step" : undefined}
              >
                <span className="demo-etape-num">{i < indexEtape ? "✓" : i + 1}</span>
                <span className="demo-etape-texte">{e.libelle}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="demo-corps" ref={corpsRef} aria-live="polite">
          {etape === "agent" ? (
            <div key="agent">
              <h3 className="demo-titre">Choisissez un agent</h3>
              <p className="demo-sous">
                Chaque agent couvre un périmètre précis. Cliquez sur celui que
                vous souhaitez essayer.
              </p>
              <div className="demo-agents">
                {AGENTS.map((a, index) => (
                  <button
                    key={a.code}
                    type="button"
                    className="demo-agent"
                    style={{ animationDelay: `${index * 90}ms` }}
                    onClick={() => choisir(index)}
                  >
                    <span
                      className="fenetre-agent-icone"
                      style={{ background: couleurAgent[a.couleur].barre }}
                      aria-hidden="true"
                    >
                      <AgentIcone code={a.code} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span
                        className="demo-agent-nom block"
                        style={{ color: couleurAgent[a.couleur].texte }}
                      >
                        {a.nom}
                      </span>
                      <span className="demo-agent-nature block">
                        {a.nature === "diagnostic" ? "Diagnostic" : "Génératif"}
                      </span>
                      <span className="demo-agent-couvre block">{a.couvre}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {etape === "profil" ? (
            <div key="profil">
              <h3 className="demo-titre" style={{ color: couleur.texte }}>
                {agent.nom}
              </h3>
              <p className="demo-sous">
                Vos informations, saisies une seule fois à l&apos;inscription,
                sont déjà renseignées.
              </p>
              <div className="demo-profil">
                {demo.profil.map((ligne, i) => (
                  <div
                    key={ligne.libelle}
                    className="demo-ligne"
                    style={{ animationDelay: `${i * 260}ms` }}
                  >
                    <span className="l">{ligne.libelle}</span>
                    <span className="v">{ligne.valeur}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {etape === "questionnaire" ? (
            <div key="questionnaire">
              <h3 className="demo-titre">Questionnaire généré pour votre métier</h3>
              <p className="demo-sous">
                Question {Math.min(Math.max(visibles, 1), total)} sur {total}.
                Aucune n&apos;est obligatoire.
              </p>
              <div className="fenetre-barre">
                <div style={{ width: `${(visibles / total) * 100}%`, transition: "width 0.5s ease" }} />
              </div>
              <div className="mt-2">
                {donnees.questions.slice(0, visibles).map((q, i) => (
                  <div key={q.libelle} className="demo-q">
                    <span className="demo-q-num">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="demo-q-libelle">{q.libelle}</p>
                      <span className="demo-reponse">{q.reponse}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {etape === "resultat" ? (
            <div key="resultat">
              <h3 className="demo-titre" style={{ color: couleur.texte }}>
                {agent.nom}
              </h3>
              {donnees.propositions ? (
                <>
                  <p className="demo-sous">Analyse de vos publications</p>
                  <ul className="fenetre-indicateurs mt-4">
                    {donnees.questions.map((q, i) => (
                      <li key={q.libelle}>
                        <span>{donnees.indicateurs?.[i]}</span>
                        <span className="fenetre-statut">{q.reponse}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="demo-carte">
                    <p className="demo-carte-titre">Propositions de contenu</p>
                    <ul className="demo-propositions">
                      {donnees.propositions.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <p className="demo-note">
                      Générées à votre demande, jamais automatiquement.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="demo-sous">Calculé à partir de seuils fixes</p>
                  <p className="mt-3 flex items-baseline gap-2">
                    <span className="font-[family-name:var(--titre)] text-5xl font-bold">
                      {score}
                    </span>
                    <span className="text-[var(--text-muted)]">/ 100</span>
                  </p>
                  <div className="fenetre-barre">
                    <div style={{ width: `${score}%` }} />
                  </div>
                  <ul className="fenetre-indicateurs mt-4">
                    {donnees.questions.map((q, i) => (
                      <li key={q.libelle}>
                        <span>{donnees.indicateurs?.[i]}</span>
                        <span className="fenetre-statut">
                          <span
                            className="fenetre-point"
                            style={{ background: COULEUR_STATUT[q.statut] }}
                          />
                          {q.statut}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="demo-carte">
                    <p className="demo-carte-titre">Action prioritaire</p>
                    <p className="demo-action">{donnees.action}</p>
                    <p className="demo-note">
                      Les indicateurs informatifs n&apos;entrent pas dans le score.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="demo-pied">
          {etape === "agent" ? (
            <span className="demo-indice">Choisissez l&apos;agent à essayer</span>
          ) : null}
          {etape === "profil" ? (
            <>
              <span className="demo-indice">Informations saisies à l&apos;inscription</span>
              <button type="button" className="fenetre-action principal" onClick={versQuestionnaire}>
                Générer le questionnaire
              </button>
            </>
          ) : null}
          {etape === "questionnaire" ? (
            <>
              <span className="demo-indice">Les réponses se remplissent</span>
              <button type="button" className="fenetre-action principal" onClick={versResultat}>
                Voir le résultat
              </button>
            </>
          ) : null}
          {etape === "resultat" ? (
            <>
              <span className="demo-indice">Exemple terminé</span>
              <div className="fenetre-actions">
                <button type="button" className="fenetre-action" onClick={() => setEtape("agent")}>
                  Changer d&apos;agent
                </button>
                <button type="button" className="fenetre-action" onClick={() => choisir(indexAgent)}>
                  Rejouer
                </button>
                <Link href={`/agents/${agent.slug}`} className="fenetre-action principal">
                  Voir la page de l&apos;agent
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-[var(--text-faint)]">
        Exemple illustratif : profil, questions et résultats sont fictifs.
      </figcaption>
    </figure>
  );
}

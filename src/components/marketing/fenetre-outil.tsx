"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AgentIcone } from "@/components/marketing/agent-icone";
import { AGENTS, couleurAgent } from "@/lib/agents";

type Choix = "reponse" | "passe";
type Cote = "agent" | "moi" | "centre" | "large";

// Valeurs d'exemple. Règle d'agrégation du produit (CLAUDE.md section 7) :
// vert 100, orange 50, rouge 0 ; le score est la moyenne des indicateurs
// notés, une question passée est exclue du calcul et jamais comptée zéro.
const INDICATEURS = [
  { nom: "Contacts vendeurs", statut: "Vert", note: 100, liee: true },
  { nom: "Rendez-vous vendeurs honorés", statut: "Orange", note: 50, liee: false },
  { nom: "Part de mandats par bouche-à-oreille", statut: "Vert", note: 100, liee: false },
];

const COULEUR_STATUT: Record<string, string> = {
  Vert: "#6fcf97",
  Orange: "var(--amber-1)",
  Rouge: "var(--red-1)",
  "Non noté": "var(--text-faint)",
};

function Message({
  cote,
  retard = 0,
  children,
}: {
  cote: Cote;
  retard?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`msg msg-${cote}`}
      style={{ animationDelay: `${retard}ms` }}
    >
      {children}
    </div>
  );
}

function CarteResultat({ choix }: { choix: Choix }) {
  const lignes = INDICATEURS.map((i) =>
    choix === "passe" && i.liee
      ? { ...i, statut: "Non noté", note: null }
      : i
  );
  const notes = lignes.flatMap((l) => (l.note === null ? [] : [l.note]));
  const score = Math.round(notes.reduce((a, b) => a + b, 0) / notes.length);

  return (
    <div className="bulle bulle-agent">
      <p className="m-0 text-xs text-[var(--text-faint)]">
        Calculé à partir de seuils fixes
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-[family-name:var(--titre)] text-3xl font-bold">
          {score}
        </span>
        <span className="text-sm text-[var(--text-muted)]">/ 100</span>
      </p>
      <div className="fenetre-barre">
        <div style={{ width: `${score}%` }} />
      </div>
      <ul className="fenetre-indicateurs">
        {lignes.map((l) => (
          <li key={l.nom}>
            <span>{l.nom}</span>
            <span className="fenetre-statut">
              <span
                className="fenetre-point"
                style={{ background: COULEUR_STATUT[l.statut] }}
              />
              {l.statut}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Aperçu interactif de l'outil. Les valeurs sont illustratives (légende
// sous la fenêtre) ; rien n'est inventé sur le contenu des questionnaires
// des agents autres qu'Acquisition, dont seule la présentation est montrée.
export function FenetreOutil() {
  const [actif, setActif] = useState(0);
  const [etape, setEtape] = useState(0);
  const [choix, setChoix] = useState<Choix | null>(null);
  const filRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS[actif];
  const couleur = couleurAgent[agent.couleur];
  const acquisition = agent.code === "ACQUISITION_CA";

  useEffect(() => {
    const fil = filRef.current;
    if (!fil) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fil.scrollTo({ top: fil.scrollHeight, behavior: reduit ? "auto" : "smooth" });
  }, [actif, etape, choix]);

  function selectionner(index: number) {
    setActif(index);
    setEtape(0);
    setChoix(null);
  }

  function repondre(c: Choix) {
    setChoix(c);
    setEtape(1);
  }

  return (
    <figure className="m-0">
      <div className="fenetre">
        <aside className="fenetre-laterale">
          <div className="fenetre-points" aria-hidden="true">
            <span style={{ background: "var(--red-1)" }} />
            <span style={{ background: "var(--white-1)" }} />
            <span style={{ background: "var(--blue-1)" }} />
          </div>
          <div className="flex flex-col gap-1" role="tablist" aria-label="Agents">
            {AGENTS.map((a, index) => (
              <button
                key={a.code}
                type="button"
                role="tab"
                aria-selected={index === actif}
                className={`fenetre-agent ${index === actif ? "actif" : ""}`}
                onClick={() => selectionner(index)}
              >
                <span
                  className="fenetre-agent-icone"
                  style={{ background: couleurAgent[a.couleur].barre }}
                  aria-hidden="true"
                >
                  <AgentIcone code={a.code} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="fenetre-agent-nom block">{a.nom}</span>
                  <span className="fenetre-agent-etat block">
                    {a.nature === "diagnostic" ? "Diagnostic" : "Génératif"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="fenetre-principal">
          <div className="fenetre-entete">
            <span
              className="fenetre-agent-icone !h-8 !w-8 !rounded-[10px]"
              style={{ background: couleur.barre }}
              aria-hidden="true"
            >
              <AgentIcone code={agent.code} className="h-4 w-4" />
            </span>
            <span className="min-w-0 truncate font-medium">{agent.nom}</span>
            <span className="hidden text-xs uppercase tracking-[0.08em] text-[var(--text-faint)] sm:inline">
              {agent.nature === "diagnostic" ? "Diagnostic" : "Génératif"}
            </span>
          </div>

          <div className="fenetre-onglets-mobile" role="tablist" aria-label="Agents">
            {AGENTS.map((a, index) => (
              <button
                key={a.code}
                type="button"
                role="tab"
                aria-selected={index === actif}
                aria-label={a.nom}
                className={`fenetre-onglet-mobile ${index === actif ? "actif" : ""}`}
                style={{ background: couleurAgent[a.couleur].barre }}
                onClick={() => selectionner(index)}
              >
                <AgentIcone code={a.code} className="h-4 w-4" />
              </button>
            ))}
          </div>

          <div className="fenetre-fil" ref={filRef} role="tabpanel" key={agent.code}>
            {acquisition ? (
              <>
                <Message cote="centre">
                  <p className="fenetre-repere">Partie 2 · Génération de contacts</p>
                </Message>
                <Message cote="agent" retard={120}>
                  <div className="bulle bulle-agent">
                    Combien de nouveaux contacts vendeurs recevez-vous par mois ?
                    <p className="bulle-note">
                      Une estimation suffit. Vous pouvez passer cette question.
                    </p>
                  </div>
                </Message>

                {choix ? (
                  <Message cote="moi">
                    <div className="bulle bulle-moi">
                      {choix === "reponse" ? "Environ 15" : "Passer"}
                    </div>
                  </Message>
                ) : null}
                {choix === "passe" ? (
                  <Message cote="agent" retard={150}>
                    <div className="bulle bulle-agent">
                      Question passée : l&apos;indicateur est exclu du calcul, il
                      n&apos;est jamais compté zéro.
                    </div>
                  </Message>
                ) : null}

                {etape >= 1 && choix ? (
                  <>
                    <Message cote="centre" retard={400}>
                      <p className="fenetre-repere">Questionnaire terminé</p>
                    </Message>
                    <Message cote="large" retard={550}>
                      <CarteResultat choix={choix} />
                    </Message>
                  </>
                ) : null}

                {etape >= 2 ? (
                  <>
                    <Message cote="moi">
                      <div className="bulle bulle-moi">Voir mon plan d&apos;action</div>
                    </Message>
                    <Message cote="agent" retard={200}>
                      <div className="bulle bulle-agent">
                        Action prioritaire : confirmer chaque rendez-vous la veille
                        par message.
                      </div>
                    </Message>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Message cote="agent">
                  <div className="bulle bulle-agent">
                    Ce que je couvre : {agent.couvre}
                  </div>
                </Message>
                <Message cote="agent" retard={150}>
                  <div className="bulle bulle-agent">
                    {agent.neFaitJamais
                      ? `Ce que je ne fais jamais : ${agent.neFaitJamais}`
                      : "Je génère des propositions de contenu quand vous le demandez, jamais automatiquement."}
                  </div>
                </Message>
                {agent.nature === "diagnostic" ? (
                  <Message cote="agent" retard={300}>
                    <div className="bulle bulle-agent">
                      Le questionnaire est pré-écrit et aucune question n&apos;est
                      obligatoire.
                    </div>
                  </Message>
                ) : null}
              </>
            )}
          </div>

          <div className="fenetre-saisie">
            {acquisition ? (
              <>
                <span className="fenetre-champ">
                  {etape === 0 ? "Votre réponse" : etape === 1 ? "Suite" : "Terminé"}
                </span>
                <div className="fenetre-actions">
                  {etape === 0 ? (
                    <>
                      <button
                        type="button"
                        className="fenetre-action"
                        onClick={() => repondre("passe")}
                      >
                        Passer
                      </button>
                      <button
                        type="button"
                        className="fenetre-action principal"
                        onClick={() => repondre("reponse")}
                      >
                        Environ 15
                      </button>
                    </>
                  ) : etape === 1 ? (
                    <button
                      type="button"
                      className="fenetre-action principal"
                      onClick={() => setEtape(2)}
                    >
                      Voir mon plan d&apos;action
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="fenetre-action"
                      onClick={() => selectionner(0)}
                    >
                      Recommencer
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="fenetre-champ">Présentation de l&apos;agent</span>
                <div className="fenetre-actions">
                  <Link
                    href={`/agents/${agent.slug}`}
                    className="fenetre-action principal"
                  >
                    Voir la page de l&apos;agent
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-[var(--text-faint)]">
        Exemple illustratif, les valeurs affichées ne sont pas un résultat réel.
      </figcaption>
    </figure>
  );
}

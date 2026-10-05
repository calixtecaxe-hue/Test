import { AgentIcone } from "@/components/marketing/agent-icone";
import { Reveal } from "@/components/marketing/reveal";
import { AGENTS, couleurAgent } from "@/lib/agents";

const ETAT_LATERAL: Record<string, string> = {
  ACQUISITION_CA: "Résultat calculé, plan d'action prêt",
  FINANCE_RENTABILITE: "Questionnaire à commencer",
  RH_ORGANISATION: "Questionnaire à commencer",
  COMM_CREATION: "Propositions à la demande",
};

const INDICATEURS = [
  { nom: "Contacts vendeurs", statut: "Vert", couleur: "#6fcf97" },
  { nom: "Rendez-vous vendeurs honorés", statut: "Orange", couleur: "var(--amber-1)" },
  { nom: "Mandats issus du bouche-à-oreille", statut: "Rouge", couleur: "var(--red-1)" },
];

// Aperçu illustratif de l'outil : mêmes mécanismes que le produit (question
// pré-écrite, réponse estimée acceptée, score calculé, plan d'action), avec
// des valeurs d'exemple — d'où la légende « Exemple illustratif ».
export function FenetreOutil() {
  const acquisition = AGENTS[0];

  return (
    <figure className="m-0">
      <div className="fenetre">
        <aside className="fenetre-laterale" aria-hidden="true">
          <div className="fenetre-points">
            <span style={{ background: "var(--red-1)" }} />
            <span style={{ background: "var(--white-1)" }} />
            <span style={{ background: "var(--blue-1)" }} />
          </div>
          <div className="fenetre-recherche">Recherche</div>
          <div className="flex flex-col gap-1">
            {AGENTS.map((agent) => (
              <div
                key={agent.code}
                className={`fenetre-agent ${agent.code === acquisition.code ? "actif" : ""}`}
              >
                <span
                  className="fenetre-agent-icone"
                  style={{ background: couleurAgent[agent.couleur].barre }}
                >
                  <AgentIcone code={agent.code} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="fenetre-agent-nom block">{agent.nom}</span>
                  <span className="fenetre-agent-etat block">
                    {ETAT_LATERAL[agent.code]}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </aside>

        <div className="fenetre-principal">
          <div className="fenetre-entete">
            <span
              className="fenetre-agent-icone !h-8 !w-8 !rounded-[10px]"
              style={{ background: couleurAgent[acquisition.couleur].barre }}
              aria-hidden="true"
            >
              <AgentIcone code={acquisition.code} className="h-4 w-4" />
            </span>
            <span className="font-medium">{acquisition.nom}</span>
            <span className="text-xs uppercase tracking-[0.08em] text-[var(--text-faint)]">
              Diagnostic
            </span>
          </div>

          <div className="fenetre-fil">
            <Reveal>
              <p className="fenetre-repere">Partie 2 · Génération de contacts</p>
            </Reveal>

            <Reveal delai={100} className="self-start max-w-[78%]">
              <div className="bulle bulle-agent">
                Combien de nouveaux contacts vendeurs recevez-vous par mois ?
                <p className="bulle-note">
                  Une estimation suffit. Vous pouvez passer cette question.
                </p>
              </div>
            </Reveal>

            <Reveal delai={200} className="self-end max-w-[78%]">
              <div className="bulle bulle-moi">Environ 15</div>
            </Reveal>

            <Reveal delai={300}>
              <p className="fenetre-repere">Questionnaire terminé</p>
            </Reveal>

            <Reveal delai={400} className="self-start w-full max-w-[86%]">
              <div className="bulle bulle-agent !max-w-none">
                <p className="m-0 text-xs text-[var(--text-faint)]">
                  Calculé à partir de seuils fixes
                </p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="font-[family-name:var(--titre)] text-3xl font-bold">
                    72
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">/ 100</span>
                </p>
                <div className="fenetre-barre">
                  <div style={{ width: "72%" }} />
                </div>
                <ul className="fenetre-indicateurs">
                  {INDICATEURS.map((i) => (
                    <li key={i.nom}>
                      <span>{i.nom}</span>
                      <span className="fenetre-statut">
                        <span
                          className="fenetre-point"
                          style={{ background: i.couleur }}
                        />
                        {i.statut}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delai={500} className="self-end max-w-[78%]">
              <div className="bulle bulle-moi">Voir mon plan d&apos;action</div>
            </Reveal>

            <Reveal delai={600} className="self-start max-w-[78%]">
              <div className="bulle bulle-agent">
                Action prioritaire : confirmer chaque rendez-vous la veille par
                message.
              </div>
            </Reveal>
          </div>

          <div className="fenetre-saisie" aria-hidden="true">
            <span className="fenetre-champ">Votre réponse</span>
            <span className="fenetre-passer">Passer</span>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-[var(--text-faint)]">
        Exemple illustratif, les valeurs affichées ne sont pas un résultat réel.
      </figcaption>
    </figure>
  );
}

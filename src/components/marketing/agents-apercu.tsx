import { AGENTS, couleurAgent, type Agent } from "@/lib/agents";

// Scores d'exemple pour illustrer le rendu d'un compte rendu : ce ne sont
// pas des résultats réels. Rien ici n'est utilisé par le moteur de scoring.
const SCORE_EXEMPLE: Record<Agent["code"], number> = {
  ACQUISITION_CA: 72,
  FINANCE_RENTABILITE: 58,
  RH_ORGANISATION: 81,
  COMM_CREATION: 65,
};

export function AgentsApercu() {
  return (
    <div className="carte-apercu">
      <div className="apercu-agents">
        {AGENTS.map((agent) => (
          <div
            key={agent.code}
            className={`apercu-ligne apercu-${agent.couleur}`}
          >
            <div className="apercu-ligne-tete">
              <span style={{ color: couleurAgent[agent.couleur].texte }}>
                {agent.nom}
              </span>
              <span className="apercu-score">{SCORE_EXEMPLE[agent.code]}</span>
            </div>
            <div className="apercu-barre-fond">
              <div
                className="apercu-barre"
                style={{
                  width: `${SCORE_EXEMPLE[agent.code]}%`,
                  background: couleurAgent[agent.couleur].barre,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

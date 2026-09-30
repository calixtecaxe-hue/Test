import { AGENTS, couleurAgent, type Agent } from "@/lib/agents";

// Scores d'exemple pour illustrer le rendu d'un compte rendu : ce ne sont
// pas des résultats réels, la carte est explicitement labellisée comme
// aperçu. Rien ici n'est utilisé par le moteur de scoring.
const SCORE_EXEMPLE: Record<Agent["code"], number> = {
  ACQUISITION_CA: 72,
  FINANCE_RENTABILITE: 58,
  RH_ORGANISATION: 81,
  COMM_CREATION: 65,
};

export function AgentsApercu() {
  return (
    <div className="carte-apercu">
      <div className="apercu-tete">
        <span className="apercu-icone" aria-hidden="true">
          ✨
        </span>
        <div>
          <p className="apercu-titre">Aperçu du compte rendu</p>
          <p className="apercu-label">Exemple illustratif, pas un résultat réel</p>
        </div>
      </div>

      <div className="apercu-agents">
        {AGENTS.map((agent) => (
          <div key={agent.code} className="apercu-ligne">
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
            {!agent.disponible ? (
              <span className="apercu-badge-dispo">Bientôt disponible</span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="apercu-stats">
        <div>
          <strong>4</strong>
          <span>Agents IA</span>
        </div>
        <div>
          <strong>86</strong>
          <span>Questions</span>
        </div>
        <div>
          <strong>0</strong>
          <span>Question obligatoire</span>
        </div>
      </div>
    </div>
  );
}

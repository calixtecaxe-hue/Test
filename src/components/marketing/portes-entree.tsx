import Link from "next/link";
import { AGENTS, couleurAgent, type Agent } from "@/lib/agents";
import { AgentAvatar } from "@/components/marketing/agent-avatar";

// Les quatre situations qui amènent un dirigeant à CAXE, dites avec ses mots, chacune menant à l'agent
// qui y répond. Texte de présentation du site seulement : rien ici ne sert au moteur ni aux agents.
const SITUATIONS: Record<Agent["code"], string> = {
  ACQUISITION_CA: "Trouver où je perds mes clients",
  FINANCE_RENTABILITE: "Voir si ma rentabilité suit mon CA",
  RH_ORGANISATION: "Voir ce qui dépend trop de moi",
  COMM_CREATION: "Savoir ce que ma communication rapporte",
};

export function PortesEntree() {
  return (
    <div className="mt-12 flex flex-col items-center text-center">
      <p className="text-sm text-[var(--text-muted)]">
        Quelle est votre priorité du moment&nbsp;?
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {AGENTS.map((agent) => (
          <Link
            key={agent.code}
            href={`/agents/${agent.slug}`}
            className="puce-agent puce-agent-lien"
            style={{ minHeight: 44 }}
          >
            <span
              className="selecteur-pastille"
              style={{ background: couleurAgent[agent.couleur].texte }}
              aria-hidden="true"
            >
              <AgentAvatar code={agent.code} />
            </span>
            {SITUATIONS[agent.code]}
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AGENTS, couleurAgent } from "@/lib/agents";
import { AgentIcone } from "@/components/marketing/agent-icone";

const DELAI_AUTO = 10000;

export function AgentsSelecteur() {
  const [actif, setActif] = useState(0);

  useEffect(() => {
    const reduitMouvement = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduitMouvement) return;

    const minuteur = setInterval(() => {
      setActif((i) => (i + 1) % AGENTS.length);
    }, DELAI_AUTO);
    return () => clearInterval(minuteur);
  }, [actif]);

  const agent = AGENTS[actif];

  return (
    <div id="agents-selecteur" className="selecteur-agents scroll-mt-24">
      <div className="selecteur-onglets" role="tablist">
        {AGENTS.map((a, index) => (
          <button
            key={a.code}
            type="button"
            role="tab"
            aria-selected={index === actif}
            className={`selecteur-onglet ${index === actif ? "actif" : ""}`}
            onClick={() => setActif(index)}
          >
            <span
              className="selecteur-pastille"
              style={{ background: couleurAgent[a.couleur].texte }}
              aria-hidden="true"
            >
              <AgentIcone code={a.code} className="h-3 w-3" />
            </span>
            {a.nom}
          </button>
        ))}
      </div>

      <div key={agent.code} className="selecteur-panneau" role="tabpanel">
        <div className="selecteur-panneau-tete">
          <div className="selecteur-panneau-titre">
            <span
              className="selecteur-panneau-icone"
              style={{ background: couleurAgent[agent.couleur].barre }}
              aria-hidden="true"
            >
              <AgentIcone code={agent.code} className="h-5 w-5" />
            </span>
            <h2 style={{ color: couleurAgent[agent.couleur].texte }}>
              {agent.nom}
            </h2>
          </div>
          <span className="selecteur-badge">
            {agent.disponible ? "Disponible" : "Bientôt disponible"}
          </span>
        </div>
        <p className="selecteur-nature">
          {agent.nature === "diagnostic" ? "Diagnostic" : "Génératif"}
        </p>

        <div className="selecteur-corps">
          <div>
            <p className="selecteur-label">Ce qu&apos;il couvre</p>
            <p className="selecteur-valeur">{agent.couvre}</p>
          </div>
          {agent.neFaitJamais ? (
            <div>
              <p className="selecteur-label">Ce qu&apos;il ne fait jamais</p>
              <p className="selecteur-valeur">{agent.neFaitJamais}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href={`/agents/${agent.slug}`}
            className="inline-flex w-fit rounded-[4px] border border-[var(--line)] px-6 py-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)] hover:text-[var(--blue-1)]"
          >
            Voir plus de détail
          </Link>
        </div>
      </div>
    </div>
  );
}

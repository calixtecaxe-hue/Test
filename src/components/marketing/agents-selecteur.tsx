"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AGENTS, couleurAgent } from "@/lib/agents";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { PRESENTATIONS } from "@/lib/agent-presentation";

const DELAI_AUTO = 10000;

export function AgentsSelecteur() {
  const [actif, setActif] = useState(0);

  useEffect(() => {
    const reduitMouvement = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
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
              <AgentAvatar code={a.code} />
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
              <AgentAvatar code={agent.code} />
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

        <ul className="agent-atouts selecteur-atouts">
          {PRESENTATIONS[agent.code].atouts.map((atout) => (
            <li key={atout}>
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
                style={{ color: couleurAgent[agent.couleur].texte }}
              >
                <path
                  d="M3 8.5 6.5 12 13 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {atout}
            </li>
          ))}
        </ul>

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

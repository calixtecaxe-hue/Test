"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AGENTS, couleurAgent } from "@/lib/agents";

// « Agents IA » n'est pas un lien : il ouvre la liste des quatre agents, au
// survol (souris), au toucher (mobile) ou au clavier. Seuls les agents de la
// liste mènent à la page Agents.
export function MenuAgents() {
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;

    function fermerSiExterieur(event: PointerEvent) {
      if (!conteneurRef.current?.contains(event.target as Node)) {
        setOuvert(false);
      }
    }
    function fermerSurEchap(event: KeyboardEvent) {
      if (event.key === "Escape") setOuvert(false);
    }

    document.addEventListener("pointerdown", fermerSiExterieur);
    document.addEventListener("keydown", fermerSurEchap);
    return () => {
      document.removeEventListener("pointerdown", fermerSiExterieur);
      document.removeEventListener("keydown", fermerSurEchap);
    };
  }, [ouvert]);

  return (
    <div
      ref={conteneurRef}
      className={`menu-agents-wrap ${ouvert ? "ouvert" : ""}`}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
        className="lien-nav cursor-pointer transition hover:text-[var(--text)]"
      >
        Agents IA
      </button>
      <div className="menu-agents">
        {AGENTS.map((agent) => (
          <Link
            key={agent.code}
            href={`/agents#${agent.code}`}
            className="menu-agents-item"
            onClick={() => setOuvert(false)}
            style={
              {
                "--couleur-agent": couleurAgent[agent.couleur].texte,
              } as React.CSSProperties
            }
          >
            <span>{agent.nom}</span>
            {!agent.disponible ? (
              <span className="menu-agents-badge">Bientôt disponible</span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

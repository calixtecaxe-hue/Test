"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AGENTS, couleurAgent } from "@/lib/agents";

const DELAI_AUTO = 10000;

// Lecture au premier rendu client (ce composant est chargé sans SSR,
// voir agents-selecteur-lazy.tsx) : arrivée depuis /agents#CODE via le
// menu du bandeau, sélectionne directement l'agent visé.
function indexDepuisHash(): number {
  const hash = window.location.hash.replace("#", "");
  const index = AGENTS.findIndex((agent) => agent.code === hash);
  return index === -1 ? 0 : index;
}

export function AgentsSelecteur() {
  const [actif, setActif] = useState(indexDepuisHash);

  useEffect(() => {
    if (window.location.hash) {
      document
        .getElementById("agents-selecteur")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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
              {a.nom.charAt(0)}
            </span>
            {a.nom}
          </button>
        ))}
      </div>

      <div key={agent.code} className="selecteur-panneau" role="tabpanel">
        <div className="selecteur-panneau-tete">
          <h2 style={{ color: couleurAgent[agent.couleur].texte }}>
            {agent.nom}
          </h2>
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

        {agent.disponible ? (
          <Link
            href="/inscription"
            className="bouton-eclat mt-8 inline-flex w-fit rounded-[4px] bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-6 py-3 text-sm font-medium text-[var(--bg)] transition hover:brightness-110"
          >
            Créer un compte
          </Link>
        ) : null}
      </div>
    </div>
  );
}

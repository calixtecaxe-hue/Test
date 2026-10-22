"use client";

import { useState } from "react";
import { ObjectifFormulaire } from "./objectif-formulaire";
import { ObjectifChoix } from "./objectif-choix";
import type { ObjectifAgent } from "@/lib/donnees/schemas";

// Objectif en cours de l'agent, avec la possibilité d'en fixer un nouveau (l'ancien
// reste dans l'historique).
export function ObjectifActif({ agent, facteurAnnuelMax, phrase, echeance, indicateur, reussite, propositions }: { agent: string; facteurAnnuelMax: number; phrase: string; echeance: string; indicateur: string | null; reussite: string | null; propositions: { intro?: string; objectifs: ObjectifAgent[] } | null }) {
  const [edition, setEdition] = useState(false);
  if (edition) {
    return (
      <div className="mt-6">
        <h2 className="text-xl">Changer d&apos;objectif</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">L&apos;objectif actuel restera dans votre historique.</p>
        {propositions ? (
          <ObjectifChoix agent={agent} propositions={propositions} facteurAnnuelMax={facteurAnnuelMax} annulable onAnnuler={() => setEdition(false)} onEnregistre={() => setEdition(false)} />
        ) : (
          <ObjectifFormulaire agent={agent} facteurAnnuelMax={facteurAnnuelMax} annulable onAnnuler={() => setEdition(false)} onEnregistre={() => setEdition(false)} />
        )}
      </div>
    );
  }
  return (
    <section className="audit-entree audit-objectif-actif mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6" style={{ "--d": "480ms" } as React.CSSProperties} aria-labelledby="objectif-actif">
      <p id="objectif-actif" className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
        Votre objectif
      </p>
      <p className="mt-2 text-lg text-[var(--text)]">{phrase}</p>
      {reussite ? <p className="mt-2 text-sm text-[var(--text)]">Réussite : {reussite}</p> : null}
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Échéance : {echeance}
        {indicateur ? <> · Indicateur suivi : {indicateur}</> : null}
      </p>
      <button type="button" onClick={() => setEdition(true)} className="audit-kicker mt-4 text-sm hover:underline">
        Changer d&apos;objectif
      </button>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

// Étape « Objectif » rouverte depuis le parcours : le formulaire s'ouvre directement, et on revient à l'audit en
// l'enregistrant ou en gardant l'objectif actuel.
export function ObjectifEdition({ agent, facteurAnnuelMax, propositions, retour }: { agent: string; facteurAnnuelMax: number; propositions: { intro?: string; objectifs: ObjectifAgent[] } | null; retour: string }) {
  const router = useRouter();
  const revenir = () => router.push(retour);
  return (
    <section className="audit-entree mt-6" style={{ "--d": "480ms" } as React.CSSProperties} aria-labelledby="objectif-edition">
      <h2 id="objectif-edition" className="text-2xl">Changer d&apos;objectif</h2>
      <p className="mt-2 text-[var(--text-muted)]">L&apos;objectif actuel restera dans votre historique.</p>
      {propositions ? (
        <ObjectifChoix agent={agent} propositions={propositions} facteurAnnuelMax={facteurAnnuelMax} annulable onAnnuler={revenir} onEnregistre={revenir} />
      ) : (
        <ObjectifFormulaire agent={agent} facteurAnnuelMax={facteurAnnuelMax} annulable onAnnuler={revenir} onEnregistre={revenir} />
      )}
    </section>
  );
}

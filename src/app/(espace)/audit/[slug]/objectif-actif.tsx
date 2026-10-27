"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ObjectifFormulaire } from "./objectif-formulaire";
import { ObjectifChoix } from "./objectif-choix";
import type { ObjectifAgent } from "@/lib/donnees/schemas";
import type { ObjectifSaisie } from "@/lib/audit/objectif";

// Un objectif en cours, tel qu'il s'affiche.
export type ObjectifAffiche = { phrase: string; echeance: string; indicateur: string | null; reussite: string | null };

// Les objectifs en cours de l'agent (un seul pour l'Acquisition et la Finance, un ou plusieurs pour RH et Comm).
export function ListeObjectifs({ objectifs }: { objectifs: ObjectifAffiche[] }) {
  if (objectifs.length === 1) {
    const o = objectifs[0];
    return (
      <>
        <p className="mt-2 text-lg text-[var(--text)]">{o.phrase}</p>
        {o.reussite ? <p className="mt-2 text-sm text-[var(--text)]">Réussite : {o.reussite}</p> : null}
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Échéance : {o.echeance}
          {o.indicateur ? <> · Indicateur suivi : {o.indicateur}</> : null}
        </p>
      </>
    );
  }
  return (
    <ol className="liste-objectifs mt-3">
      {objectifs.map((o, i) => (
        <li key={i}>
          <p className="text-base text-[var(--text)]">
            <span className="text-[var(--text-muted)]">{i + 1}. </span>
            {o.phrase}
          </p>
          {o.reussite ? <p className="mt-1 text-sm text-[var(--text)]">Réussite : {o.reussite}</p> : null}
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Échéance : {o.echeance}
            {o.indicateur ? <> · Indicateur suivi : {o.indicateur}</> : null}
          </p>
        </li>
      ))}
    </ol>
  );
}

type Props = {
  agent: string;
  facteurAnnuelMax: number;
  objectifs: ObjectifAffiche[];
  // Les objectifs en cours tels qu'ils ont été saisis : repris dans le formulaire pour les modifier (RH, Comm).
  saisies: ObjectifSaisie[];
  propositions: { intro?: string; objectifs: ObjectifAgent[] } | null;
};

// Objectifs en cours de l'agent, avec la possibilité de les changer (les précédents restent dans l'historique).
export function ObjectifActif({ agent, facteurAnnuelMax, objectifs, saisies, propositions }: Props) {
  const [edition, setEdition] = useState(false);
  const plusieurs = objectifs.length > 1;
  if (edition) {
    return (
      <div className="mt-6">
        <h2 className="text-xl">{propositions ? "Changer mes objectifs" : "Changer d'objectif"}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{plusieurs ? "Vos objectifs actuels resteront dans votre historique." : "L'objectif actuel restera dans votre historique."}</p>
        {propositions ? (
          <ObjectifChoix agent={agent} propositions={propositions} facteurAnnuelMax={facteurAnnuelMax} initiaux={saisies} annulable onAnnuler={() => setEdition(false)} onEnregistre={() => setEdition(false)} />
        ) : (
          <ObjectifFormulaire agent={agent} facteurAnnuelMax={facteurAnnuelMax} annulable onAnnuler={() => setEdition(false)} onEnregistre={() => setEdition(false)} />
        )}
      </div>
    );
  }
  return (
    <section className="audit-entree audit-objectif-actif mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6" style={{ "--d": "480ms" } as React.CSSProperties} aria-labelledby="objectif-actif">
      <p id="objectif-actif" className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
        {plusieurs ? "Vos objectifs" : "Votre objectif"}
      </p>
      <ListeObjectifs objectifs={objectifs} />
      <button type="button" onClick={() => setEdition(true)} className="audit-kicker mt-4 text-sm hover:underline">
        {propositions ? (plusieurs ? "Changer mes objectifs" : "Changer ou ajouter un objectif") : "Changer d'objectif"}
      </button>
    </section>
  );
}

// Étape « Objectif » rouverte depuis le parcours : le formulaire s'ouvre directement, et on revient à l'audit en
// l'enregistrant ou en gardant les objectifs actuels.
export function ObjectifEdition({ agent, facteurAnnuelMax, propositions, saisies, retour }: { agent: string; facteurAnnuelMax: number; propositions: { intro?: string; objectifs: ObjectifAgent[] } | null; saisies: ObjectifSaisie[]; retour: string }) {
  const router = useRouter();
  const revenir = () => router.push(retour);
  const plusieurs = saisies.length > 1;
  return (
    <section className="audit-entree mt-6" style={{ "--d": "480ms" } as React.CSSProperties} aria-labelledby="objectif-edition">
      <h2 id="objectif-edition" className="text-2xl">{propositions ? "Changer mes objectifs" : "Changer d'objectif"}</h2>
      <p className="mt-2 text-[var(--text-muted)]">{plusieurs ? "Vos objectifs actuels resteront dans votre historique." : "L'objectif actuel restera dans votre historique."}</p>
      {propositions ? (
        <ObjectifChoix agent={agent} propositions={propositions} facteurAnnuelMax={facteurAnnuelMax} initiaux={saisies} annulable onAnnuler={revenir} onEnregistre={revenir} />
      ) : (
        <ObjectifFormulaire agent={agent} facteurAnnuelMax={facteurAnnuelMax} annulable onAnnuler={revenir} onEnregistre={revenir} />
      )}
    </section>
  );
}

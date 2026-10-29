"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ObjectifFormulaire } from "./objectif-formulaire";
import { ObjectifChoix } from "./objectif-choix";
import type { Propositions } from "./objectif-choix";
import type { OrigineObjectif } from "@/lib/audit/objectif";
import type { ObjectifInitial, SuiviParcours } from "@/lib/audit/objectifs-agent";

// Un objectif en cours, tel qu'il s'affiche. Un objectif écrit par le dirigeant est signalé comme tel ; un objectif composé de
// plusieurs propositions les liste, chacune avec son chiffre ; le thème lié se dit « indicateur suivi » pour un objectif
// chiffré, « thème lié » pour un objectif décrit.
export type ObjectifAffiche = {
  phrase: string;
  echeance: string;
  indicateur: string | null;
  reussite: string | null;
  origine?: OrigineObjectif;
  chiffre?: boolean;
  // Propositions retenues d'un objectif composé de plusieurs propositions, dans leur phrase (« obtenir 10 nouveaux avis clients »).
  propositions?: string[];
  formulationModifiee?: boolean;
};

function Precisions({ o }: { o: ObjectifAffiche }) {
  const plusieurs = (o.propositions?.length ?? 0) > 1;
  return (
    <>
      {plusieurs ? (
        <div className="mt-2">
          <p className="text-sm text-[var(--text-muted)]">Composé de {o.propositions!.length} propositions :</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[var(--text)]" data-propositions-retenues>
            {o.propositions!.map((p) => (
              <li key={p} data-proposition-retenue>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {o.reussite ? <p className="mt-1 text-sm text-[var(--text)]">Réussite : {o.reussite}</p> : null}
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {o.origine === "personnel" ? <>Objectif personnel · </> : null}
        {o.formulationModifiee ? <>Formulation écrite par vous · </> : null}
        Échéance : {o.echeance}
        {o.indicateur ? <> · {o.chiffre === false ? "Thème lié" : "Indicateur suivi"} : {o.indicateur}</> : null}
      </p>
    </>
  );
}

// L'objectif en cours de l'agent (un seul par agent ; un compte enregistré avant le 28 octobre peut en avoir plusieurs en RH
// et en Comm, jusqu'à son prochain changement d'objectif).
export function ListeObjectifs({ objectifs }: { objectifs: ObjectifAffiche[] }) {
  if (objectifs.length === 1) {
    const o = objectifs[0];
    return (
      <>
        <p className="mt-2 text-lg text-[var(--text)]" data-objectif-phrase>{o.phrase}</p>
        <Precisions o={o} />
      </>
    );
  }
  return (
    <ol className="liste-objectifs mt-3">
      {objectifs.map((o, i) => (
        <li key={i}>
          <p className="text-base text-[var(--text)]" data-objectif-phrase>
            <span className="text-[var(--text-muted)]">{i + 1}. </span>
            {o.phrase}
          </p>
          <Precisions o={o} />
        </li>
      ))}
    </ol>
  );
}

type Props = {
  agent: string;
  facteurAnnuelMax: number;
  objectifs: ObjectifAffiche[];
  // L'objectif en cours tel qu'il a été défini : repris dans le formulaire pour le modifier (RH, Comm).
  initial: ObjectifInitial | null;
  propositions: Propositions | null;
  maxComposition: number;
  // Comm (6C) : de quoi comparer la partie de l'objectif au parcours du questionnaire, et l'écart constaté.
  suivi?: SuiviParcours | null;
  publication?: string | null;
  ecart?: string | null;
};

// Objectif en cours de l'agent, avec la possibilité de le changer (les précédents restent dans l'historique).
export function ObjectifActif({ agent, facteurAnnuelMax, objectifs, initial, propositions, maxComposition, suivi, publication, ecart }: Props) {
  const [edition, setEdition] = useState(false);
  const plusieurs = objectifs.length > 1;
  if (edition) {
    return (
      <div className="mt-6">
        <h2 className="text-xl">Changer d&apos;objectif</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{plusieurs ? "Vos objectifs actuels resteront dans votre historique." : "L'objectif actuel restera dans votre historique."}</p>
        {propositions ? (
          <ObjectifChoix agent={agent} propositions={propositions} facteurAnnuelMax={facteurAnnuelMax} maxComposition={maxComposition} initial={initial} annulable onAnnuler={() => setEdition(false)} onEnregistre={() => setEdition(false)} suivi={suivi} publication={publication} />
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
      {ecart ? <p className="note-ecart mt-4" role="note" data-ecart-partie>{ecart}</p> : null}
      <button type="button" onClick={() => setEdition(true)} className="audit-kicker mt-4 text-sm hover:underline">
        Changer d&apos;objectif
      </button>
    </section>
  );
}

// Étape « Objectif » rouverte depuis le parcours : le formulaire s'ouvre directement, et on revient à l'audit en
// l'enregistrant ou en gardant l'objectif actuel.
export function ObjectifEdition({ agent, facteurAnnuelMax, propositions, maxComposition, initial, plusieurs, retour, suivi, publication }: { agent: string; facteurAnnuelMax: number; propositions: Propositions | null; maxComposition: number; initial: ObjectifInitial | null; plusieurs: boolean; retour: string; suivi?: SuiviParcours | null; publication?: string | null }) {
  const router = useRouter();
  const revenir = () => router.push(retour);
  return (
    <section className="audit-entree mt-6" style={{ "--d": "480ms" } as React.CSSProperties} aria-labelledby="objectif-edition">
      <h2 id="objectif-edition" className="text-2xl">Changer d&apos;objectif</h2>
      <p className="mt-2 text-[var(--text-muted)]">{plusieurs ? "Vos objectifs actuels resteront dans votre historique." : "L'objectif actuel restera dans votre historique."}</p>
      {propositions ? (
        <ObjectifChoix agent={agent} propositions={propositions} facteurAnnuelMax={facteurAnnuelMax} maxComposition={maxComposition} initial={initial} annulable onAnnuler={revenir} onEnregistre={revenir} suivi={suivi} publication={publication} />
      ) : (
        <ObjectifFormulaire agent={agent} facteurAnnuelMax={facteurAnnuelMax} annulable onAnnuler={revenir} onEnregistre={revenir} />
      )}
    </section>
  );
}

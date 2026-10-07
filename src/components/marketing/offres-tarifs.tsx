"use client";

import Link from "next/link";
import { useState } from "react";
import {
  OFFRES,
  REMISE_ANNUELLE_POURCENT,
  elementsInclus,
  elementsNonInclus,
  formaterEuros,
  prixAnnuelCentimesHT,
  prixMensuelEquivalentAnnuelCentimesHT,
  type Offre,
} from "@/lib/offres";
import { Reveal } from "@/components/marketing/reveal";

type Periode = "mensuel" | "annuel";

const NOMBRE_EN_LETTRES: Record<Offre["nombreAgents"], string> = {
  2: "Deux",
  3: "Trois",
  4: "Quatre",
};

function Croix() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--text-faint)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

function Coche() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--blue-1)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function OffresTarifs() {
  const [periode, setPeriode] = useState<Periode>("mensuel");
  const annuel = periode === "annuel";

  return (
    <div>
      <div className="flex justify-center">
        <div
          className="bascule-periode"
          role="radiogroup"
          aria-label="Période de facturation"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!annuel}
            className="bascule-option"
            onClick={() => setPeriode("mensuel")}
          >
            Mensuel
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={annuel}
            className="bascule-option"
            onClick={() => setPeriode("annuel")}
          >
            Annuel
            <span className="bascule-remise">
              −{REMISE_ANNUELLE_POURCENT}&nbsp;%
            </span>
          </button>
        </div>
      </div>

      <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
        {OFFRES.map((offre, index) => {
          const vedette = offre.nombreAgents === 3;
          const mensuel = offre.prixMensuelCentimesHT;
          const total = annuel ? prixAnnuelCentimesHT(mensuel) : mensuel;
          const tousLesAgents = offre.nombreAgents === 4;
          const nonInclus = elementsNonInclus(offre);

          return (
            <Reveal
              key={offre.nombreAgents}
              delai={index * 100}
              className="h-full"
            >
              <div
                className={`carte-offre ${vedette ? "carte-offre-vedette" : ""}`}
              >
                <h2 className="text-2xl">{offre.nombreAgents} agents</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {tousLesAgents
                    ? "Les quatre agents."
                    : `${NOMBRE_EN_LETTRES[offre.nombreAgents]} agents de votre choix.`}
                </p>

                <div className="mt-8">
                  <p key={periode} className="prix-ligne">
                    <span className="prix-valeur">{formaterEuros(total)}</span>
                    <span className="prix-unite">
                      HT / {annuel ? "an" : "mois"}
                    </span>
                  </p>
                  <p className="mt-2 min-h-10 text-sm text-[var(--text-faint)]">
                    {annuel ? (
                      <>
                        Soit{" "}
                        {formaterEuros(
                          prixMensuelEquivalentAnnuelCentimesHT(mensuel),
                        )}{" "}
                        HT / mois, au lieu de {formaterEuros(mensuel * 12)} HT
                        en facturation mensuelle.
                      </>
                    ) : (
                      "Facturation mensuelle."
                    )}
                  </p>
                </div>

                <Link
                  href={`/activation?agents=${offre.nombreAgents}&periode=${periode}`}
                  className="bouton-eclat mt-6 inline-flex items-center justify-center rounded-[4px] border border-transparent bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-6 py-3 text-sm font-medium text-[var(--bg)] transition hover:brightness-110"
                >
                  Choisir cette offre
                </Link>

                <div className="mt-8 border-t border-[var(--line)] pt-6">
                  <p className="text-sm text-[var(--text-faint)]">
                    Ce qui est inclus
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
                    {elementsInclus(offre).map((element) => (
                      <li key={element} className="flex gap-3">
                        <Coche />
                        {element}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-8 text-sm text-[var(--text-faint)]">
                    Ce qui n&apos;est pas inclus
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-[var(--text-faint)]">
                    {nonInclus.map((element) => (
                      <li key={element} className="flex gap-3">
                        <Croix />
                        {element}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

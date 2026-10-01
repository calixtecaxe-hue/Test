"use client";

import Link from "next/link";
import { useState } from "react";
import {
  OFFRES,
  REMISE_ANNUELLE_POURCENT,
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

          return (
            <Reveal key={offre.nombreAgents} delai={index * 100} className="h-full">
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
                          prixMensuelEquivalentAnnuelCentimesHT(mensuel)
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
                  href="/inscription"
                  className={`mt-6 inline-flex items-center justify-center rounded-[4px] px-6 py-3 text-sm font-medium transition ${
                    vedette
                      ? "bouton-eclat border border-transparent bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] text-[var(--bg)] hover:brightness-110"
                      : "border border-[var(--line)] text-[var(--text)] hover:border-[var(--blue-1)] hover:text-[var(--blue-1)]"
                  }`}
                >
                  Créer un compte
                </Link>

                <div className="mt-8 border-t border-[var(--line)] pt-6">
                  <p className="text-sm text-[var(--text-faint)]">
                    Ce qui est inclus
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
                    <li className="flex gap-3">
                      <Coche />
                      {tousLesAgents
                        ? "Les quatre agents"
                        : `${offre.nombreAgents} agents de votre choix`}
                    </li>
                    <li className="flex gap-3">
                      <Coche />
                      Questionnaire adapté à votre métier
                    </li>
                    <li className="flex gap-3">
                      <Coche />
                      Score sur 100 et plan d&apos;action
                    </li>
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

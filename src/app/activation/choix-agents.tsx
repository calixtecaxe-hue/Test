"use client";

import Link from "next/link";
import { useState } from "react";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { AGENTS, couleurAgent, type Agent } from "@/lib/agents";
import { formaterEuros, prixAnnuelCentimesHT, type Offre } from "@/lib/offres";

const EN_LETTRES: Record<Offre["nombreAgents"], string> = {
  2: "deux",
  3: "trois",
  4: "quatre",
};

function Coche({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ChoixAgents({
  offre,
  annuel,
}: {
  offre: Offre;
  annuel: boolean;
}) {
  const tous = offre.nombreAgents === AGENTS.length;
  const [choisis, setChoisis] = useState<Agent["code"][]>(
    tous ? AGENTS.map((a) => a.code) : [],
  );
  const [confirme, setConfirme] = useState(false);

  const complet = choisis.length === offre.nombreAgents;
  const prix = annuel
    ? `${formaterEuros(prixAnnuelCentimesHT(offre.prixMensuelCentimesHT))} HT / an`
    : `${formaterEuros(offre.prixMensuelCentimesHT)} HT / mois`;

  function basculer(code: Agent["code"]) {
    if (tous || confirme) return;
    setChoisis((actuels) =>
      actuels.includes(code)
        ? actuels.filter((c) => c !== code)
        : actuels.length < offre.nombreAgents
          ? [...actuels, code]
          : actuels,
    );
  }

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <span className="activation-sceau" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
            <circle
              className="activation-cercle"
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              className="activation-coche"
              d="m20 33 8 8 16-18"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <h1 className="mt-6 text-3xl sm:text-4xl">
          Votre formule est activée.
          <span className="accent-degrade mt-1 block">
            {confirme
              ? "Vos agents sont prêts."
              : "Choisissez maintenant vos agents."}
          </span>
        </h1>

        <p className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-[var(--line)] bg-[var(--panel)] px-5 py-2 text-sm text-[var(--text-muted)]">
          <span className="text-[var(--text)]">
            Formule {offre.nombreAgents} agents
          </span>
          <span aria-hidden="true">·</span>
          <span>{prix}</span>
        </p>

        <p className="mt-5 max-w-xl text-[var(--text-muted)]">
          {confirme
            ? "Vous pouvez maintenant compléter votre profil, puis répondre au questionnaire de chaque agent."
            : tous
              ? "Les quatre agents sont inclus dans votre formule."
              : `Votre formule comprend ${EN_LETTRES[offre.nombreAgents]} agents. Cliquez sur ceux que vous voulez ouvrir.`}
        </p>
      </div>

      <ul className="choix-grille mt-10" aria-label="Agents">
        {AGENTS.map((agent) => {
          const actif = choisis.includes(agent.code);
          const bloque = !actif && complet;
          const couleur = couleurAgent[agent.couleur];
          const selectionnable = !tous && !confirme;
          return (
            <li key={agent.code}>
              <button
                type="button"
                role="checkbox"
                aria-checked={actif}
                aria-disabled={bloque || !selectionnable}
                onClick={() => basculer(agent.code)}
                className={`choix-agent ${actif ? "choisi" : ""} ${bloque ? "grise" : ""} ${selectionnable ? "" : "fixe"}`}
                style={{ ["--couleur-agent" as string]: couleur.texte }}
              >
                <span
                  className="choix-avatar"
                  style={{ background: couleur.barre }}
                >
                  <AgentAvatar code={agent.code} />
                </span>
                <span className="choix-texte">
                  <span className="choix-nom">{agent.nom}</span>
                  <span className="choix-nature">
                    {agent.nature === "diagnostic" ? "Diagnostic" : "Génératif"}
                  </span>
                  <span className="choix-domaine">{agent.couvre}</span>
                </span>
                <span className="choix-case" aria-hidden="true">
                  <Coche className="choix-case-coche" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        {confirme ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/inscription"
                className="bouton-eclat inline-flex items-center justify-center rounded-[4px] border border-transparent bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-6 py-3 text-sm font-medium text-[var(--bg)] transition hover:brightness-110"
              >
                Compléter mon profil
              </Link>
              {tous ? null : (
                <button
                  type="button"
                  onClick={() => setConfirme(false)}
                  className="rounded-[4px] border border-[var(--line)] px-6 py-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
                >
                  Modifier mes agents
                </button>
              )}
            </div>
            {tous ? null : (
              <p className="text-sm text-[var(--text-muted)]">
                Une erreur dans votre choix ? Vous pouvez encore le modifier.
              </p>
            )}
          </>
        ) : (
          <>
            {!tous ? (
              <p
                className="text-sm text-[var(--text-muted)]"
                aria-live="polite"
              >
                {choisis.length} sur {offre.nombreAgents} agents choisis
                {complet ? ". Retirez-en un pour en changer." : "."}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!complet}
              onClick={() => setConfirme(true)}
              className="bouton-eclat inline-flex items-center justify-center rounded-[4px] border border-transparent bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-6 py-3 text-sm font-medium text-[var(--bg)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            >
              {tous ? "Ouvrir mes agents" : "Confirmer mes agents"}
            </button>
          </>
        )}
        <p className="max-w-md text-xs text-[var(--text-faint)]">
          Maquette : aucun paiement n&apos;est pris et aucun choix n&apos;est
          enregistré.
        </p>
      </div>
    </div>
  );
}

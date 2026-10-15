"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
  connecte,
  agentsExclus,
  nombreMax,
  dejaChoisis,
}: {
  offre: Offre;
  annuel: boolean;
  // Compte connecté : le choix est enregistré. Sinon, aperçu sans enregistrement.
  connecte: boolean;
  // Professions réglementées : pas d'agent Comm, 3 agents au maximum.
  agentsExclus: Agent["code"][];
  nombreMax: number | null;
  dejaChoisis: Agent["code"][];
}) {
  const proposes = AGENTS.filter((a) => !agentsExclus.includes(a.code));
  const horsDroit = nombreMax !== null && offre.nombreAgents > nombreMax;
  // Tous les agents proposés sont inclus : il n'y a rien à confirmer.
  const tous = !horsDroit && offre.nombreAgents === proposes.length;
  const initiaux = dejaChoisis.filter((c) => proposes.some((a) => a.code === c));
  const [choisis, setChoisis] = useState<Agent["code"][]>(
    tous ? proposes.map((a) => a.code) : initiaux.length === offre.nombreAgents ? initiaux : [],
  );
  const [confirme, setConfirme] = useState(tous || (initiaux.length === offre.nombreAgents && !horsDroit));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const envoye = useRef(false);

  async function enregistrer(agents: Agent["code"][]): Promise<boolean> {
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/abonnement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreAgents: offre.nombreAgents,
          periode: annuel ? "annuel" : "mensuel",
          agents,
        }),
      });
      if (!reponse.ok) {
        const donnees = await reponse.json().catch(() => null);
        setErreur(donnees?.erreur ?? "Votre choix n'a pas pu être enregistré. Réessayez dans un instant.");
        return false;
      }
      return true;
    } catch {
      setErreur("Le service ne répond pas. Vérifiez votre connexion et réessayez.");
      return false;
    } finally {
      setEnCours(false);
    }
  }

  // Tous les agents proposés sont inclus : le choix s'enregistre à l'arrivée.
  useEffect(() => {
    if (!connecte || !tous || envoye.current) return;
    envoye.current = true;
    void enregistrer(proposes.map((a) => a.code));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois
  }, []);

  async function confirmer() {
    if (connecte && !(await enregistrer(choisis))) return;
    changerEtat(true);
  }

  const complet = choisis.length === offre.nombreAgents;
  const prix = annuel
    ? `${formaterEuros(prixAnnuelCentimesHT(offre.prixMensuelCentimesHT))} HT / an`
    : `${formaterEuros(offre.prixMensuelCentimesHT)} HT / mois`;

  // Le passage à « Vos agents sont prêts » se voit : les agents non choisis
  // s'effacent, ceux qui restent glissent à leur nouvelle place (transition de
  // vue du navigateur, quand il la gère), le sceau se redessine et chaque carte
  // se valide à son tour. Sans mouvement si les animations sont réduites.
  function changerEtat(oui: boolean) {
    const appliquer = () => setConfirme(oui);
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduit && typeof document.startViewTransition === "function") {
      document.startViewTransition(() => flushSync(appliquer));
    } else {
      appliquer();
    }
  }

  const visibles = confirme && !tous ? proposes.filter((a) => choisis.includes(a.code)) : proposes;

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
        <span key={confirme ? "pret" : "choix"} className="activation-sceau" aria-hidden="true">
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
          <span key={confirme ? "pret" : "choix"} className="accent-degrade activation-bascule mt-1 block">
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

        {horsDroit ? (
          <p className="mt-5 max-w-xl text-[var(--text-muted)]" role="alert">
            Votre activité permet {nombreMax} agents au maximum : l&apos;agent Comm
            n&apos;est pas proposé.{" "}
            <Link href="/offres" className="text-[var(--blue-1)] hover:underline">
              Choisir une autre formule
            </Link>
          </p>
        ) : null}

        <p className="mt-5 max-w-xl text-[var(--text-muted)]">
          {confirme
            ? `${tous ? (proposes.length === AGENTS.length ? "Les quatre agents sont inclus dans votre formule. " : "Les agents proposés pour votre activité sont tous inclus dans votre formule. ") : ""}Vous pouvez maintenant compléter votre profil, puis répondre au questionnaire de chaque agent.`
            : `Votre formule comprend ${EN_LETTRES[offre.nombreAgents]} agents. Cliquez sur ceux que vous voulez ouvrir.`}
        </p>
      </div>

      <ul className={`choix-grille mt-10 ${confirme ? "confirmee" : ""}`} aria-label="Agents">
        {visibles.map((agent, rang) => {
          const actif = choisis.includes(agent.code);
          const bloque = !actif && complet;
          const couleur = couleurAgent[agent.couleur];
          const selectionnable = !tous && !confirme;
          return (
            <li
              key={agent.code}
              style={{
                viewTransitionName: `agent-${agent.slug}`,
                ["--rang" as string]: rang,
              }}
            >
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
          <div className="activation-suite flex flex-col items-center gap-4">
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
                  onClick={() => changerEtat(false)}
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
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
              {choisis.length} sur {offre.nombreAgents} agents choisis
              {complet ? ". Retirez-en un pour en changer." : "."}
            </p>
            <button
              type="button"
              disabled={!complet || enCours}
              onClick={confirmer}
              className="bouton-eclat inline-flex items-center justify-center rounded-[4px] border border-transparent bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-6 py-3 text-sm font-medium text-[var(--bg)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            >
              {enCours ? "Enregistrement…" : "Confirmer mes agents"}
            </button>
          </>
        )}
        {erreur ? (
          <p className="max-w-md text-sm text-[var(--red-1)]" role="alert">
            {erreur}
          </p>
        ) : null}
        <p className="max-w-md text-xs text-[var(--text-faint)]">
          {connecte ? (
            "Le paiement n'est pas encore en place : aucun paiement n'est pris, votre choix est enregistré."
          ) : (
            <>
              Aucun paiement n&apos;est pris et votre choix n&apos;est pas
              enregistré.{" "}
              <Link
                href="/connexion?depuis=/activation"
                className="text-[var(--blue-1)] hover:underline"
              >
                Connectez-vous pour l&apos;enregistrer.
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

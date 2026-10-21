"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { AGENTS, couleurAgent, type Agent } from "@/lib/agents";
import { elementsInclus, formaterEuros, OFFRES, prixAnnuelCentimesHT, prixMensuelEquivalentAnnuelCentimesHT, REMISE_ANNUELLE_POURCENT, type Offre } from "@/lib/offres";
import type { Periode } from "@/lib/abonnement";

const EN_LETTRES: Record<Offre["nombreAgents"], string> = { 2: "deux", 3: "trois", 4: "quatre" };

function Coche({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

// Étape « Formule » : les trois formules côte à côte, mensuel ou annuel, et le choix se fait sur place. Aucun agent
// n'est coché d'avance. Les agents proposés dépendent du métier : une profession réglementée n'a pas l'agent Comm,
// donc 3 agents au plus.
export function FormuleChoix({
  agentsExclus,
  nombreMax,
  initial,
}: {
  agentsExclus: Agent["code"][];
  nombreMax: number | null;
  initial: { nombreAgents: Offre["nombreAgents"] | null; periode: Periode; agents: Agent["code"][] };
}) {
  const route = useRouter();
  const proposes = AGENTS.filter((a) => !agentsExclus.includes(a.code));
  const permis = (o: Offre) => o.nombreAgents <= proposes.length && (nombreMax === null || o.nombreAgents <= nombreMax);

  const [periode, setPeriode] = useState<Periode>(initial.periode);
  const [nombre, setNombre] = useState<Offre["nombreAgents"] | null>(initial.nombreAgents && OFFRES.some((o) => o.nombreAgents === initial.nombreAgents && permis(o)) ? initial.nombreAgents : null);
  const [choisis, setChoisis] = useState<Agent["code"][]>(initial.agents.filter((c) => proposes.some((a) => a.code === c)));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const panneau = useRef<HTMLDivElement>(null);

  const annuel = periode === "annuel";
  const tous = nombre !== null && nombre === proposes.length;
  const agentsRetenus = tous ? proposes.map((a) => a.code) : choisis.slice(0, nombre ?? 0);
  const complet = nombre !== null && agentsRetenus.length === nombre;

  function choisirFormule(o: Offre) {
    setNombre(o.nombreAgents);
    setErreur(null);
    // Un agent déjà choisi reste choisi, dans la limite de la nouvelle formule.
    setChoisis((actuels) => actuels.slice(0, o.nombreAgents));
    requestAnimationFrame(() => panneau.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  function basculer(code: Agent["code"]) {
    if (tous || nombre === null) return;
    setChoisis((actuels) => (actuels.includes(code) ? actuels.filter((c) => c !== code) : actuels.length < nombre ? [...actuels, code] : actuels));
  }

  async function continuer() {
    if (nombre === null || !complet) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch("/api/abonnement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreAgents: nombre, periode, agents: agentsRetenus }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setErreur(d?.erreur ?? "Votre choix n'a pas pu être enregistré. Réessayez dans un instant.");
        setEnCours(false);
        return;
      }
      route.push("/paiement");
    } catch {
      setErreur("Le service ne répond pas. Vérifiez votre connexion et réessayez.");
      setEnCours(false);
    }
  }

  return (
    <div>
      <div className="flex justify-center">
        <div className="bascule-periode" role="radiogroup" aria-label="Période de facturation">
          <button type="button" role="radio" aria-checked={!annuel} className="bascule-option" onClick={() => setPeriode("mensuel")}>
            Mensuel
          </button>
          <button type="button" role="radio" aria-checked={annuel} className="bascule-option" onClick={() => setPeriode("annuel")}>
            Annuel
            <span className="bascule-remise">−{REMISE_ANNUELLE_POURCENT}&nbsp;%</span>
          </button>
        </div>
      </div>

      {nombreMax !== null ? (
        <p className="mx-auto mt-6 max-w-xl text-center text-sm text-[var(--text-muted)]" role="note">
          Votre activité permet {nombreMax} agents au maximum : l&apos;agent Comm n&apos;est pas proposé.
        </p>
      ) : null}

      <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-3">
        {OFFRES.map((offre) => {
          const vedette = offre.nombreAgents === 3;
          const mensuel = offre.prixMensuelCentimesHT;
          const total = annuel ? prixAnnuelCentimesHT(mensuel) : mensuel;
          const ouverte = permis(offre);
          const active = nombre === offre.nombreAgents;
          return (
            <div key={offre.nombreAgents} className={`carte-offre ${vedette ? "carte-offre-vedette" : ""} ${active ? "ring-2 ring-[var(--blue-1)]" : ""} ${ouverte ? "" : "opacity-50"}`}>
              {vedette ? <span className="carte-badge">Recommandé</span> : null}
              <h2 className="text-2xl">{offre.nombreAgents} agents</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {offre.nombreAgents === 4 ? "Les quatre agents." : `${EN_LETTRES[offre.nombreAgents][0].toUpperCase()}${EN_LETTRES[offre.nombreAgents].slice(1)} agents de votre choix.`}
              </p>
              <div className="mt-6">
                <p key={periode} className="prix-ligne">
                  <span className="prix-valeur">{formaterEuros(total)}</span>
                  <span className="prix-unite">HT / {annuel ? "an" : "mois"}</span>
                </p>
                <p className="mt-2 min-h-10 text-sm text-[var(--text-faint)]">
                  {annuel ? `Soit ${formaterEuros(prixMensuelEquivalentAnnuelCentimesHT(mensuel))} HT / mois, au lieu de ${formaterEuros(mensuel)} HT / mois en facturation mensuelle.` : "Facturation mensuelle."}
                </p>
              </div>
              <button
                type="button"
                disabled={!ouverte}
                aria-pressed={active}
                onClick={() => choisirFormule(offre)}
                className="bouton-eclat mt-4 inline-flex items-center justify-center rounded-[4px] border border-transparent bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-6 py-3 text-sm font-medium text-[var(--bg)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ouverte ? (active ? "Formule choisie" : "Choisir cette formule") : "Non disponible pour votre activité"}
              </button>
              <ul className="mt-6 space-y-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--text-muted)]">
                {elementsInclus(offre).map((element) => (
                  <li key={element} className="flex gap-3">
                    <Coche className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--blue-1)]" />
                    {element}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div ref={panneau} className="mt-12 scroll-mt-6">
        {nombre === null ? (
          <p className="text-center text-sm text-[var(--text-muted)]">Choisissez une formule : vous désignez ensuite vos agents.</p>
        ) : (
          <section aria-labelledby="agents-titre" className="flex flex-col items-center text-center">
            <h2 id="agents-titre" className="text-2xl">
              {tous ? (proposes.length === AGENTS.length ? "Les quatre agents sont inclus" : "Tous les agents proposés pour votre activité sont inclus") : `Choisissez vos ${EN_LETTRES[nombre]} agents`}
            </h2>
            {tous ? null : <p className="mt-2 text-sm text-[var(--text-muted)]">Cliquez sur ceux que vous voulez ouvrir.</p>}

            <ul className="choix-grille mt-8 w-full text-left" aria-label="Agents">
              {proposes.map((agent, rang) => {
                const actif = agentsRetenus.includes(agent.code);
                const bloque = !actif && complet && !tous;
                const couleur = couleurAgent[agent.couleur];
                return (
                  <li key={agent.code} style={{ ["--rang" as string]: rang }}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={actif}
                      aria-disabled={bloque || tous}
                      onClick={() => basculer(agent.code)}
                      className={`choix-agent ${actif ? "choisi" : ""} ${bloque ? "grise" : ""} ${tous ? "fixe" : ""}`}
                      style={{ ["--couleur-agent" as string]: couleur.texte }}
                    >
                      <span className="choix-avatar" style={{ background: couleur.barre }}>
                        <AgentAvatar code={agent.code} />
                      </span>
                      <span className="choix-texte">
                        <span className="choix-nom">{agent.nom}</span>
                        <span className="choix-nature">{agent.nature === "diagnostic" ? "Diagnostic" : "Génératif"}</span>
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

            <p className="mt-6 text-sm text-[var(--text-muted)]" aria-live="polite">
              {agentsRetenus.length} sur {nombre} agents {tous ? "inclus" : "choisis"}
              {complet && !tous ? ". Retirez-en un pour en changer." : "."}
            </p>
            <button
              type="button"
              disabled={!complet || enCours}
              onClick={continuer}
              className="bouton-eclat mt-4 inline-flex items-center justify-center rounded-[4px] border border-transparent bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-8 py-3 text-sm font-medium text-[var(--bg)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enCours ? "Enregistrement…" : "Continuer vers le paiement"}
            </button>
            {erreur ? (
              <p role="alert" className="mt-3 max-w-md text-sm text-[var(--red-1)]">
                {erreur}
              </p>
            ) : null}
            <p className="mt-3 max-w-md text-xs text-[var(--text-faint)]">Vous vérifiez le récapitulatif avant de payer. Aucun prélèvement avant cette étape.</p>
          </section>
        )}
      </div>
    </div>
  );
}

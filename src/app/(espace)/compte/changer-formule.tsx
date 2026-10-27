"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS, type Agent } from "@/lib/agents";
import { formaterEuros, OFFRES, prixAnnuelCentimesHT, type Offre } from "@/lib/offres";
import type { Periode } from "@/lib/abonnement";

const montant = (nombre: number, periode: Periode) => {
  const o = OFFRES.find((x) => x.nombreAgents === nombre);
  if (!o) return null;
  return periode === "annuel" ? prixAnnuelCentimesHT(o.prixMensuelCentimesHT) : o.prixMensuelCentimesHT;
};

// Changer d'offre en cours d'abonnement : nombre d'agents, agents choisis, mensuel ou annuel. Le changement
// s'applique tout de suite ; avec un paiement réel, le prorata de la période en cours est facturé ou crédité.
export function ChangerFormule({
  agentsExclus,
  nombreMax,
  actuel,
  paiementReel,
}: {
  agentsExclus: Agent["code"][];
  nombreMax: number | null;
  actuel: { nombreAgents: number; periode: Periode; agents: Agent["code"][] };
  paiementReel: boolean;
}) {
  const route = useRouter();
  const proposes = AGENTS.filter((a) => !agentsExclus.includes(a.code));
  const formules = OFFRES.filter((o: Offre) => o.nombreAgents <= proposes.length && (nombreMax === null || o.nombreAgents <= nombreMax));

  const [ouvert, setOuvert] = useState(false);
  const [nombre, setNombre] = useState(actuel.nombreAgents);
  const [periode, setPeriode] = useState<Periode>(actuel.periode);
  const [choisis, setChoisis] = useState<Agent["code"][]>(actuel.agents);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const tous = nombre === proposes.length;
  const retenus = tous ? proposes.map((a) => a.code) : choisis.slice(0, nombre);
  const complet = retenus.length === nombre;
  const inchange = nombre === actuel.nombreAgents && periode === actuel.periode && retenus.length === actuel.agents.length && retenus.every((c) => actuel.agents.includes(c));
  const nouveau = montant(nombre, periode);

  function choisirNombre(n: number) {
    setNombre(n);
    setChoisis((c) => c.slice(0, n));
    setOk(false);
  }
  function basculer(code: Agent["code"]) {
    if (tous) return;
    setOk(false);
    setChoisis((c) => (c.includes(code) ? c.filter((x) => x !== code) : c.length < nombre ? [...c, code] : c));
  }

  async function appliquer() {
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch("/api/abonnement/formule", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombreAgents: nombre, periode, agents: retenus }) });
      const d = (await r.json().catch(() => ({}))) as { erreur?: string };
      if (r.ok) {
        setOk(true);
        setOuvert(false);
        route.refresh();
      } else setErreur(d.erreur ?? "Le changement n'a pas abouti.");
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
    }
    setEnCours(false);
  }

  const bouton = "rounded-[4px] border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)] disabled:opacity-60";
  const option = (actif: boolean) => `rounded-[4px] border px-3 py-2 text-sm transition ${actif ? "border-[var(--blue-1)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--blue-1)]"}`;

  return (
    <div className="flex flex-col items-start gap-3">
      {ok ? (
        <p role="status" className="text-sm text-[var(--green-1)]">
          Votre formule est changée.
        </p>
      ) : null}
      {!ouvert ? (
        <button type="button" onClick={() => { setOuvert(true); setOk(false); }} className={bouton}>
          Changer d&apos;offre
        </button>
      ) : (
        <div className="w-full rounded-xl border border-[var(--line)] p-4">
          <fieldset>
            <legend className="text-sm font-medium">Nombre d&apos;agents</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {formules.map((o) => (
                <button key={o.nombreAgents} type="button" aria-pressed={nombre === o.nombreAgents} onClick={() => choisirNombre(o.nombreAgents)} className={option(nombre === o.nombreAgents)}>
                  {o.nombreAgents} agents
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Facturation</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["mensuel", "annuel"] as const).map((p) => (
                <button key={p} type="button" aria-pressed={periode === p} onClick={() => { setPeriode(p); setOk(false); }} className={option(periode === p)}>
                  {p === "mensuel" ? "Mensuelle" : "Annuelle (−15 %)"}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium">{tous ? "Agents inclus" : `Vos agents (${retenus.length} sur ${nombre})`}</legend>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {proposes.map((a) => {
                const actif = retenus.includes(a.code);
                return (
                  <li key={a.code}>
                    <button type="button" role="checkbox" aria-checked={actif} aria-disabled={tous || (!actif && complet)} onClick={() => basculer(a.code)} className={`${option(actif)} w-full text-left ${!actif && complet && !tous ? "opacity-50" : ""}`}>
                      {a.nom}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <p className="mt-4 text-sm text-[var(--text-muted)]" aria-live="polite">
            {nouveau !== null ? `Nouveau montant : ${formaterEuros(nouveau)} HT ${periode === "annuel" ? "par an" : "par mois"}.` : null}{" "}
            {paiementReel
              ? "Le changement s'applique tout de suite. Le prorata de la période en cours est facturé ou crédité sur votre prochaine facture."
              : "Le changement s'applique tout de suite. Mode démonstration : aucun paiement n'est pris."}{" "}
            Les agents retirés se ferment ; vos réponses sont conservées.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" disabled={!complet || inchange || enCours} onClick={appliquer} className={bouton}>
              {enCours ? "Enregistrement…" : "Valider ce changement"}
            </button>
            <button type="button" disabled={enCours} onClick={() => { setOuvert(false); setErreur(null); setNombre(actuel.nombreAgents); setPeriode(actuel.periode); setChoisis(actuel.agents); }} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
              Annuler
            </button>
          </div>
          {erreur ? (
            <p role="alert" className="mt-3 text-sm text-[var(--red-1)]">
              {erreur}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

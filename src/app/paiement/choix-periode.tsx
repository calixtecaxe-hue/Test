"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REMISE_ANNUELLE_POURCENT } from "@/lib/offres";
import type { Periode } from "@/lib/abonnement";

// Mensuel ou annuel, jusqu'au dernier moment : le choix est réenregistré avec la même formule et les mêmes agents, et le
// total se recalcule côté serveur (le montant ne part jamais du navigateur).
export function ChoixPeriode({ periode, nombreAgents, agents }: { periode: Periode; nombreAgents: number; agents: string[] }) {
  const route = useRouter();
  const [enCours, setEnCours] = useState<Periode | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function choisir(nouvelle: Periode) {
    if (nouvelle === periode || enCours) return;
    setEnCours(nouvelle);
    setErreur(null);
    try {
      const r = await fetch("/api/abonnement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreAgents, periode: nouvelle, agents }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setErreur(d?.erreur ?? "Le changement n'a pas pu être enregistré. Réessayez.");
      } else {
        route.refresh();
      }
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
    }
    setEnCours(null);
  }

  const affiche: Periode = enCours ?? periode;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[var(--text-muted)]" id="periode-libelle">
        Paiement
      </p>
      <div className="bascule-periode w-fit" role="radiogroup" aria-labelledby="periode-libelle">
        <button type="button" role="radio" aria-checked={affiche === "mensuel"} className="bascule-option" onClick={() => choisir("mensuel")}>
          Mensuel
        </button>
        <button type="button" role="radio" aria-checked={affiche === "annuel"} className="bascule-option" onClick={() => choisir("annuel")}>
          Annuel
          <span className="bascule-remise">−{REMISE_ANNUELLE_POURCENT}&nbsp;%</span>
        </button>
      </div>
      {erreur ? (
        <p role="alert" className="text-sm text-[var(--red-1)]">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

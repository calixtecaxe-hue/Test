"use client";

import { useState } from "react";

// Ouvre l'espace de facturation du fournisseur de paiement (moyen de paiement, factures, résiliation).
export function GererFacturation({ libelle = "Gérer ma facturation" }: { libelle?: string }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ouvrir() {
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch("/api/paiement/portail", { method: "POST" });
      const d = (await r.json()) as { url?: string; erreur?: string };
      if (r.ok && d.url) {
        window.location.href = d.url;
        return;
      }
      setErreur(d.erreur ?? "L'espace de facturation n'a pas pu s'ouvrir.");
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
    }
    setEnCours(false);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={ouvrir}
        disabled={enCours}
        className="rounded-[4px] border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)] disabled:opacity-60"
      >
        {enCours ? "Ouverture…" : libelle}
      </button>
      {erreur ? (
        <p role="alert" className="text-sm text-[var(--red-1)]">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";

// Démarre le paiement : le serveur renvoie l'adresse où continuer (page du fournisseur, ou écran de
// démonstration). Aucun montant ne part du navigateur.
export function PaiementBouton({ libelle, desactive }: { libelle: string; desactive: boolean }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function payer() {
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch("/api/paiement/session", { method: "POST" });
      const d = (await r.json()) as { url?: string; erreur?: string };
      if (r.ok && d.url) {
        window.location.href = d.url;
        return;
      }
      setErreur(d.erreur ?? "Le paiement n'a pas pu démarrer.");
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau et réessayez.");
    }
    setEnCours(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={payer}
        disabled={desactive || enCours}
        className="bouton-eclat w-full rounded-[4px] bg-[var(--blue-1)] px-6 py-3.5 text-base font-semibold text-[var(--bg)] disabled:opacity-50"
      >
        {enCours ? "Ouverture du paiement…" : libelle}
      </button>
      {erreur ? (
        <p role="alert" className="text-sm text-[var(--red-1)]">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

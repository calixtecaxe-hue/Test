"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DemonstrationBouton() {
  const routeur = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function activer() {
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch("/api/paiement/demonstration", { method: "POST" });
      if (r.ok) {
        routeur.push("/tableau-de-bord?bienvenue=1");
        return;
      }
      const d = (await r.json()) as { erreur?: string };
      setErreur(d.erreur ?? "L'activation a échoué.");
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
    }
    setEnCours(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={activer} disabled={enCours} className="bouton-eclat w-fit rounded-[4px] bg-[var(--blue-1)] px-6 py-3.5 text-base font-semibold text-[var(--bg)] disabled:opacity-60">
        {enCours ? "Activation…" : "Activer mon abonnement de démonstration"}
      </button>
      {erreur ? (
        <p role="alert" className="text-sm text-[var(--red-1)]">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

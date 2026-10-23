"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Niveau des questionnaires, choisi une fois pour tous les agents du compte.
export function NiveauChoix({ essentielles, approfondies, actuel = null, retour }: { essentielles: number; approfondies: number; actuel?: "ESSENTIEL" | "APPROFONDI" | null; retour?: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function choisir(niveau: "ESSENTIEL" | "APPROFONDI") {
    setEnvoi(niveau);
    setErreur(null);
    const r = await fetch("/api/audit/niveau", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niveau }),
    }).catch(() => null);
    if (r?.ok) {
      // Retour à l'étape quittée : le questionnaire, avec le niveau choisi.
      if (retour) router.push(retour);
      else router.refresh();
      return;
    }
    setErreur("Votre choix n'a pas pu être enregistré. Réessayez.");
    setEnvoi(null);
  }

  const carte = "audit-carte flex flex-col gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-left disabled:opacity-60";
  return (
    <section className="audit-entree mt-10" style={{ "--d": "480ms" } as React.CSSProperties} aria-labelledby="niveau">
      <h2 id="niveau" className="text-xl">
        Jusqu&apos;où voulez-vous aller ?
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Ce choix vaut pour tous vos agents. Vous pourrez le modifier plus tard.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button type="button" className={carte} disabled={envoi !== null} onClick={() => choisir("ESSENTIEL")}>
          <span className="font-semibold text-[var(--text)]">Essentiel{actuel === "ESSENTIEL" ? <span className="ml-2 text-xs font-medium text-[var(--agent)]">Choix actuel</span> : null}</span>
          <span className="text-sm text-[var(--text-muted)]">Les données qui comptent le plus : jusqu&apos;à {essentielles} questions, selon vos réponses.</span>
        </button>
        <button type="button" className={carte} disabled={envoi !== null} onClick={() => choisir("APPROFONDI")}>
          <span className="font-semibold text-[var(--text)]">Approfondi{actuel === "APPROFONDI" ? <span className="ml-2 text-xs font-medium text-[var(--agent)]">Choix actuel</span> : null}</span>
          <span className="text-sm text-[var(--text-muted)]">L&apos;essentiel et le détail : jusqu&apos;à {approfondies} questions, selon vos réponses.</span>
        </button>
      </div>
      {erreur ? <p className="mt-3 text-sm text-[var(--red-1)]">{erreur}</p> : null}
    </section>
  );
}

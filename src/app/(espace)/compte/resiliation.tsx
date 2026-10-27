"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Se désabonner à tout moment : l'arrêt prend effet à la fin de la période déjà payée, les agents restent ouverts
// jusque-là, et l'abonnement peut être repris avant cette date. Deux temps pour éviter un clic par erreur.
export function Resiliation({ programmee, finPeriode }: { programmee: boolean; finPeriode: string | null }) {
  const route = useRouter();
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(resilier: boolean) {
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch("/api/abonnement/resiliation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resilier }) });
      const d = (await r.json().catch(() => ({}))) as { erreur?: string };
      if (r.ok) {
        setConfirmation(false);
        route.refresh();
      } else setErreur(d.erreur ?? "La demande n'a pas abouti.");
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
    }
    setEnCours(false);
  }

  const bouton = "rounded-[4px] border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)] disabled:opacity-60";

  return (
    <div className="flex flex-col items-start gap-3">
      {programmee ? (
        <>
          <p className="max-w-[60ch] text-sm">
            Votre abonnement s&apos;arrête{finPeriode ? ` le ${finPeriode}` : " à la fin de la période payée"}. Vos agents restent ouverts jusque-là, et vous pouvez reprendre votre abonnement avant cette date.
          </p>
          <button type="button" disabled={enCours} onClick={() => envoyer(false)} className={bouton}>
            {enCours ? "Enregistrement…" : "Reprendre mon abonnement"}
          </button>
        </>
      ) : confirmation ? (
        <div role="alertdialog" aria-labelledby="resil-titre" className="max-w-[60ch] rounded-xl border border-[rgb(var(--amber-rgb)/0.5)] p-4">
          <p id="resil-titre" className="text-sm font-medium">
            Arrêter mon abonnement ?
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            L&apos;arrêt prend effet{finPeriode ? ` le ${finPeriode}` : " à la fin de la période déjà payée"}. Vos agents restent ouverts jusque-là, sans nouveau prélèvement. Vos réponses sont conservées. Le reste de la période payée n&apos;est pas remboursé.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={enCours} onClick={() => envoyer(true)} className={bouton}>
              {enCours ? "Enregistrement…" : "Oui, arrêter mon abonnement"}
            </button>
            <button type="button" disabled={enCours} onClick={() => setConfirmation(false)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
              Garder mon abonnement
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmation(true)} className={bouton}>
          Me désabonner
        </button>
      )}
      {erreur ? (
        <p role="alert" className="text-sm text-[var(--red-1)]">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

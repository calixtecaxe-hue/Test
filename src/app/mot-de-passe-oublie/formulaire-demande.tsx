"use client";

import { useState } from "react";
import Link from "next/link";
import { Champ, classeChamp } from "@/components/champ";

// Le message de confirmation est le même qu'un compte existe ou non pour cette adresse.
export function FormulaireDemande() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoyeA, setEnvoyeA] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function surEnvoi(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErreur("Adresse email invalide.");
      return;
    }
    setEnCours(true);
    try {
      const reponse = await fetch("/api/mot-de-passe/demande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!reponse.ok) {
        const resultat = await reponse.json().catch(() => ({}));
        setErreur(resultat.erreur ?? "La demande n'a pas pu être envoyée. Réessayez.");
        return;
      }
      setEnvoyeA(email);
    } catch {
      setErreur("La demande n'a pas pu être envoyée : vérifiez votre connexion, puis réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  if (envoyeA) {
    return (
      <div className="mt-10 flex flex-col gap-4" role="status">
        <p>
          Si un compte existe pour <strong>{envoyeA}</strong>, un email vient de lui être envoyé avec un lien pour choisir un nouveau mot de passe.
        </p>
        <p className="text-sm text-[var(--text-muted)]">Le lien est valable une heure. Si vous ne le voyez pas d&apos;ici quelques minutes, regardez dans vos courriers indésirables.</p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/connexion" className="text-[var(--blue-1)] hover:underline">
            Retour à la connexion
          </Link>
          <button type="button" onClick={() => setEnvoyeA(null)} className="text-[var(--blue-1)] hover:underline">
            Utiliser une autre adresse
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={surEnvoi} noValidate className="mt-10 flex flex-col gap-6">
      <Champ label="Adresse email" htmlFor="email" erreur={erreur ?? undefined}>
        <input id="email" name="email" type="email" required autoComplete="email" autoFocus aria-invalid={erreur ? true : undefined} className={classeChamp} />
      </Champ>
      <button
        type="submit"
        disabled={enCours}
        className="mt-2 rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
      >
        {enCours ? "Envoi…" : "Recevoir le lien"}
      </button>
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/connexion" className="text-[var(--blue-1)] hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}

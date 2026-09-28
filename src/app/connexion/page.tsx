"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Champ, classeChamp } from "@/components/champ";

function FormulaireConnexion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);

    const formData = new FormData(event.currentTarget);

    try {
      const resultat = await signIn("credentials", {
        email: formData.get("email"),
        motDePasse: formData.get("motDePasse"),
        redirect: false,
      });

      if (resultat?.error) {
        setErreur("Adresse email ou mot de passe incorrect.");
        return;
      }

      router.push(searchParams.get("depuis") || "/tableau-de-bord");
      router.refresh();
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-6">
      <Champ label="Adresse email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={classeChamp}
        />
      </Champ>
      <Champ label="Mot de passe" htmlFor="motDePasse">
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          required
          autoComplete="current-password"
          className={classeChamp}
        />
      </Champ>

      {erreur ? <p className="text-sm text-[var(--red-1)]">{erreur}</p> : null}

      <button
        type="submit"
        disabled={enCours}
        className="mt-2 rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
      >
        {enCours ? "Connexion…" : "Se connecter"}
      </button>

      <p className="text-sm text-[var(--text-muted)]">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-[var(--blue-1)] hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

export default function Connexion() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <h1 className="text-2xl">Se connecter</h1>
      <Suspense fallback={null}>
        <FormulaireConnexion />
      </Suspense>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ChampMotDePasse } from "@/components/parcours/champ-mot-de-passe";

// Nouveau mot de passe, puis connexion directe : le dirigeant reprend son parcours là où il en était.
export function FormulaireNouveau({ jeton }: { jeton: string }) {
  const route = useRouter();
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [lienPerime, setLienPerime] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function surEnvoi(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const donnees = new FormData(event.currentTarget);
    const motDePasse = String(donnees.get("motDePasse") ?? "");
    const confirmation = String(donnees.get("confirmation") ?? "");
    const nouvelles: Record<string, string> = {};
    if (motDePasse.length < 10) nouvelles.motDePasse = "Le mot de passe doit contenir au moins 10 caractères.";
    else if (motDePasse !== confirmation) nouvelles.confirmation = "Les deux mots de passe ne correspondent pas.";
    setErreurs(nouvelles);
    if (Object.keys(nouvelles).length > 0) return;

    setEnCours(true);
    try {
      const reponse = await fetch("/api/mot-de-passe/nouveau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jeton, motDePasse }),
      });
      const resultat = await reponse.json().catch(() => ({}));
      if (!reponse.ok) {
        if (resultat.lien) setLienPerime(resultat.erreur ?? "Ce lien n'est plus valable.");
        else setErreurs({ general: resultat.champs?.motDePasse?.[0] ?? resultat.erreur ?? "Le mot de passe n'a pas pu être changé. Réessayez." });
        return;
      }
      const connexion = await signIn("credentials", { email: resultat.email, motDePasse, redirect: false });
      route.push(connexion?.error ? "/connexion?motDePasse=change" : "/tableau-de-bord");
      route.refresh();
    } catch {
      setErreurs({ general: "Le mot de passe n'a pas pu être changé : vérifiez votre connexion, puis réessayez." });
    } finally {
      setEnCours(false);
    }
  }

  if (lienPerime) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <p role="alert">{lienPerime}</p>
        <p className="text-sm">
          <Link href="/mot-de-passe-oublie" className="text-[var(--blue-1)] hover:underline">
            Demander un nouveau lien
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={surEnvoi} noValidate className="mt-8 flex flex-col gap-6">
      <p className="text-[var(--text-muted)]">Choisissez le mot de passe de votre compte. Les sessions ouvertes sur vos autres appareils seront fermées.</p>
      <ChampMotDePasse label="Nouveau mot de passe" id="motDePasse" nom="motDePasse" aide="10 caractères minimum." erreur={erreurs.motDePasse} autoComplete="new-password" />
      <ChampMotDePasse label="Confirmer le mot de passe" id="confirmation" nom="confirmation" erreur={erreurs.confirmation} autoComplete="new-password" placeholder="Retapez votre mot de passe" />
      {erreurs.general ? <p role="alert" className="text-sm text-[var(--red-1)]">{erreurs.general}</p> : null}
      <button
        type="submit"
        disabled={enCours}
        className="mt-2 rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
      >
        {enCours ? "Enregistrement…" : "Enregistrer mon nouveau mot de passe"}
      </button>
    </form>
  );
}

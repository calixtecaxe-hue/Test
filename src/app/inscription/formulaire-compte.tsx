"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Champ, classeChamp } from "@/components/champ";
import { ChampMotDePasse } from "@/components/parcours/champ-mot-de-passe";
import { adresseAvecPreselection, lirePreselection } from "@/lib/formule-url";

// Première étape du parcours : le compte, avec l'adresse e-mail et un mot de passe, rien d'autre. Le métier est
// demandé à l'étape suivante, la formule ensuite, le dossier d'entreprise après le paiement.
// Une formule regardée sur la page des offres (?agents=3&periode=annuel) suit le parcours comme préférence.

export function FormulaireCompte() {
  const route = useRouter();
  const recherche = useSearchParams();
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const preselection = lirePreselection(`?${recherche.toString()}`);

  async function surEnvoi(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreurGenerale(null);
    const donnees = new FormData(event.currentTarget);
    const email = String(donnees.get("email") ?? "").trim();
    const motDePasse = String(donnees.get("motDePasse") ?? "");
    const confirmation = String(donnees.get("confirmation") ?? "");

    const nouvelles: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) nouvelles.email = "Adresse email invalide.";
    if (motDePasse.length < 10) nouvelles.motDePasse = "Le mot de passe doit contenir au moins 10 caractères.";
    else if (motDePasse !== confirmation) nouvelles.confirmation = "Les deux mots de passe ne correspondent pas.";
    setErreurs(nouvelles);
    if (Object.keys(nouvelles).length > 0) return;

    setEnCours(true);
    try {
      const reponse = await fetch("/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, motDePasse }),
      });
      const resultat = await reponse.json();
      if (!reponse.ok) {
        const champs: Record<string, string[]> = resultat.champs ?? {};
        setErreurs(Object.fromEntries(Object.entries(champs).map(([c, m]) => [c, m[0]])));
        setErreurGenerale(Object.keys(champs).length === 0 ? (resultat.erreur ?? "Le compte n'a pas pu être créé.") : null);
        return;
      }
      const connexion = await signIn("credentials", { email, motDePasse, redirect: false });
      if (connexion?.error) {
        route.push("/connexion");
        return;
      }
      route.push(adresseAvecPreselection("/inscription/metier", preselection));
      route.refresh();
    } catch {
      setErreurGenerale("Une erreur est survenue. Réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={surEnvoi} noValidate className="mt-8 flex flex-col gap-6">
      <Champ label="Adresse email" htmlFor="email" erreur={erreurs.email}>
        <input id="email" name="email" type="email" autoComplete="email" autoFocus placeholder="vous@entreprise.fr" aria-invalid={erreurs.email ? true : undefined} className={classeChamp} />
        {erreurs.email?.includes("existe déjà") ? (
          <p className="text-xs text-[var(--text-muted)]">
            <Link href="/connexion" className="text-[var(--blue-1)] hover:underline">Se connecter à ce compte</Link>
          </p>
        ) : null}
      </Champ>
      <ChampMotDePasse label="Mot de passe" id="motDePasse" nom="motDePasse" aide="10 caractères minimum." erreur={erreurs.motDePasse} autoComplete="new-password" />
      <ChampMotDePasse label="Confirmer le mot de passe" id="confirmation" nom="confirmation" erreur={erreurs.confirmation} autoComplete="new-password" placeholder="Retapez votre mot de passe" />

      {erreurGenerale ? <p role="alert" className="text-sm text-[var(--red-1)]">{erreurGenerale}</p> : null}

      <button
        type="submit"
        disabled={enCours}
        className="bouton-eclat w-full rounded-[4px] bg-[var(--blue-1)] px-5 py-3 font-semibold text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
      >
        {enCours ? "Création du compte…" : "Créer mon compte"}
      </button>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Vous avez déjà un compte ?{" "}
        <Link href="/connexion" className="text-[var(--blue-1)] hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}


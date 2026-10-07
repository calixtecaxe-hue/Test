"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { METIERS } from "@/lib/metiers";
import { Champ, classeChamp } from "@/components/champ";
import { ChampNombre } from "@/components/champ-nombre";
import { MenuDeroulant } from "@/components/menu-deroulant";
import logo from "../../../public/logo-caxe.png";

const metiersActifs = METIERS.filter((m) => m.actif);

export default function Inscription() {
  const router = useRouter();
  const [metierPrecis, setMetierPrecis] = useState(metiersActifs[0]?.id ?? "");
  const [erreurs, setErreurs] = useState<Record<string, string[]>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const metier = metiersActifs.find((m) => m.id === metierPrecis);
  const sousVariantesActives =
    metier?.sousVariantes?.filter((v) => v.actif) ?? [];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreurGenerale(null);
    setErreurs({});

    const formData = new FormData(event.currentTarget);
    const motDePasse = formData.get("motDePasse");
    const confirmation = formData.get("confirmation");
    if (motDePasse !== confirmation) {
      setErreurs({
        confirmation: ["Les deux mots de passe ne correspondent pas."],
      });
      return;
    }

    const payload = {
      email: formData.get("email"),
      motDePasse,
      metierPrecis: formData.get("metierPrecis"),
      sousVariante: formData.get("sousVariante") || undefined,
      chiffreAffairesMensuel: formData.get("chiffreAffairesMensuel"),
      nombreCollaborateurs: formData.get("nombreCollaborateurs"),
      dateCreationEntreprise: formData.get("dateCreationEntreprise"),
      typeZone: formData.get("typeZone"),
      ville: formData.get("ville"),
    };

    setEnCours(true);
    try {
      const reponse = await fetch("/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resultat = await reponse.json();

      if (!reponse.ok) {
        setErreurs(resultat.champs ?? {});
        setErreurGenerale(resultat.erreur ?? "Le compte n'a pas pu être créé.");
        return;
      }

      const connexion = await signIn("credentials", {
        email: payload.email,
        motDePasse: payload.motDePasse,
        redirect: false,
      });

      if (connexion?.error) {
        router.push("/connexion");
        return;
      }

      router.push("/tableau-de-bord");
      router.refresh();
    } catch {
      setErreurGenerale("Une erreur est survenue. Réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-16">
      <Link href="/" className="w-fit">
        <Image src={logo} alt="CAXE" className="h-5 w-auto" />
      </Link>
      <h1 className="mt-8 text-2xl">Créer un compte</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        Ces informations servent à choisir le questionnaire et les seuils de
        comparaison adaptés à votre entreprise.
      </p>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-6">
        <Champ
          label="Adresse email"
          htmlFor="email"
          erreur={erreurs.email?.[0]}
        >
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={classeChamp}
          />
        </Champ>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Champ
            label="Mot de passe"
            htmlFor="motDePasse"
            aide="10 caractères minimum."
            erreur={erreurs.motDePasse?.[0]}
          >
            <input
              id="motDePasse"
              name="motDePasse"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className={classeChamp}
            />
          </Champ>
          <Champ
            label="Confirmation"
            htmlFor="confirmation"
            erreur={erreurs.confirmation?.[0]}
          >
            <input
              id="confirmation"
              name="confirmation"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className={classeChamp}
            />
          </Champ>
        </div>

        <hr className="border-[var(--line)]" />

        <Champ
          label="Métier précis"
          htmlFor="metierPrecis"
          erreur={erreurs.metierPrecis?.[0]}
        >
          <MenuDeroulant
            id="metierPrecis"
            name="metierPrecis"
            valeur={metierPrecis}
            onChange={setMetierPrecis}
            options={metiersActifs.map((m) => ({
              valeur: m.id,
              libelle: m.libelle,
            }))}
          />
        </Champ>

        {sousVariantesActives.length > 0 ? (
          <Champ
            label="Activité"
            htmlFor="sousVariante"
            erreur={erreurs.sousVariante?.[0]}
          >
            <MenuDeroulant
              key={metierPrecis}
              id="sousVariante"
              name="sousVariante"
              options={sousVariantesActives.map((v) => ({
                valeur: v.id,
                libelle: v.libelle,
              }))}
            />
          </Champ>
        ) : null}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Champ
            label="Chiffre d'affaires mensuel"
            htmlFor="chiffreAffairesMensuel"
            aide="En euros, estimation acceptée."
            erreur={erreurs.chiffreAffairesMensuel?.[0]}
          >
            <ChampNombre
              id="chiffreAffairesMensuel"
              name="chiffreAffairesMensuel"
              decimales
              required
            />
          </Champ>
          <Champ
            label="Nombre de collaborateurs"
            htmlFor="nombreCollaborateurs"
            aide="Vous y compris."
            erreur={erreurs.nombreCollaborateurs?.[0]}
          >
            <ChampNombre
              id="nombreCollaborateurs"
              name="nombreCollaborateurs"
              required
            />
          </Champ>
        </div>

        <Champ
          label="Date de création de l'entreprise"
          htmlFor="dateCreationEntreprise"
          erreur={erreurs.dateCreationEntreprise?.[0]}
        >
          <input
            id="dateCreationEntreprise"
            name="dateCreationEntreprise"
            type="date"
            required
            className={classeChamp}
          />
        </Champ>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Champ
            label="Type de zone"
            htmlFor="typeZone"
            erreur={erreurs.typeZone?.[0]}
          >
            <MenuDeroulant
              id="typeZone"
              name="typeZone"
              options={[
                { valeur: "URBAINE_DENSE", libelle: "Urbaine dense" },
                { valeur: "PERIURBAINE", libelle: "Périurbaine" },
                { valeur: "RURALE", libelle: "Rurale" },
              ]}
            />
          </Champ>
          <Champ label="Ville" htmlFor="ville" erreur={erreurs.ville?.[0]}>
            <input
              id="ville"
              name="ville"
              type="text"
              required
              className={classeChamp}
            />
          </Champ>
        </div>

        {erreurGenerale ? (
          <p className="text-sm text-[var(--red-1)]">{erreurGenerale}</p>
        ) : null}

        <button
          type="submit"
          disabled={enCours}
          className="mt-2 rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
        >
          {enCours ? "Création du compte…" : "Créer mon compte"}
        </button>

        <p className="text-sm text-[var(--text-muted)]">
          Vous avez déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="text-[var(--blue-1)] hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </form>
    </main>
  );
}

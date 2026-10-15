"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Champ, classeChamp } from "@/components/champ";
import { ChampDate } from "@/components/champ-date";
import { ChampNombre } from "@/components/champ-nombre";
import { ChampRecherche } from "@/components/champ-recherche";
import { ChoixCases } from "@/components/choix-cases";
import { libelleQuestion } from "@/lib/donnees/lexique";
import { METIER_ABSENT, metiersTries, router, trouverMetier } from "@/lib/routage";
import { INSCRIPTION_CLIENT, LEXIQUE_CLIENT, ROUTAGE_CLIENT } from "@/lib/routage-client";
import { AGENTS } from "@/lib/agents";
import { lireFormuleDansAdresse, type FormuleChoisie } from "@/lib/formule-url";
import logo from "../../../public/logo-caxe.png";

// Dossier d'inscription : une question à la fois, le métier en premier. Chaque
// question suivante est formulée avec les mots du métier (lexique) quand le
// document en prévoit. Le routage (catégorie, profils) n'est jamais envoyé : le
// serveur le recalcule (CLAUDE.md section 5).

type IdEtape =
  | "metier"
  | "sousVariantes"
  | "metierAbsent"
  | "stock"
  | "chiffreAffairesMensuel"
  | "nombreCollaborateurs"
  | "anciennete"
  | "typeZone"
  | "ville"
  | "acces";

type Valeurs = {
  metier: string;
  sousVariantes: string[];
  // « Autre (précisez) » cochée, et ce que le client y a écrit.
  autre: boolean;
  autreTexte: string;
  // « Mon métier n'est pas dans la liste » : son métier, et la catégorie qui y ressemble le plus.
  metierAbsentTexte: string;
  categorieAbsente: string;
  vendProduits: "" | "oui" | "non";
  chiffreAffairesMensuel: string;
  nombreCollaborateurs: string;
  anciennete: string;
  typeZone: string;
  ville: string;
  email: string;
};

const VIDE: Valeurs = {
  metier: "",
  sousVariantes: [],
  autre: false,
  autreTexte: "",
  metierAbsentTexte: "",
  categorieAbsente: "",
  vendProduits: "",
  chiffreAffairesMensuel: "",
  nombreCollaborateurs: "",
  anciennete: "",
  typeZone: "",
  ville: "",
  email: "",
};

const ZONES = [
  { valeur: "URBAINE_DENSE", libelle: "Urbaine dense" },
  { valeur: "PERIURBAINE", libelle: "Périurbaine" },
  { valeur: "RURALE", libelle: "Rurale" },
];

// Champ du serveur → étape où le corriger.
const ETAPE_DU_CHAMP: Record<string, IdEtape> = {
  metierPrecis: "metier",
  sousVariantes: "sousVariantes",
  autreTexte: "sousVariantes",
  metierAbsentTexte: "metierAbsent",
  categorieAbsente: "metierAbsent",
  vendProduits: "stock",
  chiffreAffairesMensuel: "chiffreAffairesMensuel",
  nombreCollaborateurs: "nombreCollaborateurs",
  dateCreationEntreprise: "anciennete",
  typeZone: "typeZone",
  ville: "ville",
  email: "acces",
  motDePasse: "acces",
};

const METIERS = metiersTries(ROUTAGE_CLIENT).map((m) => ({ valeur: m.id, libelle: m.libelle, mots: m.synonymes }));
// Valeur de la case « Autre (précisez) » dans la liste des activités.
const CASE_AUTRE = "__autre";
// Catégories proposées à qui ne trouve pas son métier (hors professions réglementées, à choisir dans la liste).
const CATEGORIES_ABSENT = ROUTAGE_CLIENT.categories.filter((c) => !c.reglementee).map((c) => ({ valeur: c.id, libelle: c.libelle }));
const QUESTIONS = Object.fromEntries(INSCRIPTION_CLIENT.questions.map((q) => [q.id, q]));

export default function Inscription() {
  const route = useRouter();
  const [valeurs, setValeurs] = useState<Valeurs>(VIDE);
  const [etape, setEtape] = useState(0);
  // Formule choisie avant l'inscription (dans l'adresse) : gardée jusqu'à la création du compte.
  const recherche = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => "",
  );
  const formuleChoisie: FormuleChoisie | null = useMemo(() => lireFormuleDansAdresse(recherche), [recherche]);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const formulaire = useRef<HTMLFormElement>(null);

  const metier = trouverMetier(ROUTAGE_CLIENT, valeurs.metier);
  const absent = valeurs.metier === METIER_ABSENT;
  const aDesActivites = (metier?.sousVariantes?.length ?? 0) > 0;
  // Le routage se recalcule avec ce que le client a déjà dit ; il sait si une question sur le stock s'impose.
  const routage = valeurs.metier
    ? router(ROUTAGE_CLIENT, valeurs.metier, valeurs.sousVariantes, { autre: valeurs.autre, categorieAbsente: valeurs.categorieAbsente })
    : null;
  const etapes: IdEtape[] = [
    "metier",
    ...(aDesActivites ? (["sousVariantes"] as const) : []),
    ...(absent ? (["metierAbsent"] as const) : []),
    ...(routage?.ok && routage.routage.stock === "a_demander" ? (["stock"] as const) : []),
    "chiffreAffairesMensuel",
    "nombreCollaborateurs",
    "anciennete",
    "typeZone",
    "ville",
    "acces",
  ];
  const courante = etapes[Math.min(etape, etapes.length - 1)];
  const derniere = etape >= etapes.length - 1;

  // Les mots du métier, dès que le métier (et ses activités) sont connus.
  const profils = routage?.ok ? routage.routage.profils : [];
  const question = QUESTIONS[courante];
  const titre = libelleQuestion(question, profils, LEXIQUE_CLIENT);

  // Le focus passe à la première réponse possible quand la question change.
  useEffect(() => {
    formulaire.current
      ?.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([type=checkbox]):not([type=radio]), input[type=checkbox], input[type=radio], button[role=combobox]",
      )
      ?.focus();
  }, [courante]);

  function lire(nom: string): string {
    // Par le nom : le champ caché des nombres et des dates porte le nom, le champ
    // visible porte seulement l'identifiant.
    return formulaire.current?.querySelector<HTMLInputElement>(`input[name="${nom}"]`)?.value ?? "";
  }

  // Vérifie la question en cours ; rend le message d'erreur, ou null.
  function verifier(): { erreur: string | null; suite?: Partial<Valeurs> } {
    switch (courante) {
      case "metier":
        return valeurs.metier ? { erreur: null } : { erreur: "Choisissez votre métier dans la liste." };
      case "sousVariantes": {
        if (valeurs.sousVariantes.length === 0 && !valeurs.autre) return { erreur: "Cochez au moins une activité, ou « Autre »." };
        // « Autre » cochée seule : on veut savoir ce que le client fait.
        if (valeurs.sousVariantes.length === 0 && valeurs.autreTexte.trim() === "") return { erreur: "Précisez ce que vous faites." };
        return { erreur: null };
      }
      case "metierAbsent":
        if (valeurs.metierAbsentTexte.trim() === "") return { erreur: "Écrivez votre métier." };
        if (!valeurs.categorieAbsente) return { erreur: "Choisissez ce qui ressemble le plus à votre activité." };
        return { erreur: null };
      case "stock":
        return valeurs.vendProduits ? { erreur: null } : { erreur: "Répondez par oui ou par non." };
      case "chiffreAffairesMensuel": {
        const v = lire("chiffreAffairesMensuel");
        return v === "" || Number.isNaN(Number(v))
          ? { erreur: "Indiquez un chiffre d'affaires mensuel, même approximatif." }
          : { erreur: null, suite: { chiffreAffairesMensuel: v } };
      }
      case "nombreCollaborateurs": {
        const v = lire("nombreCollaborateurs");
        return v === "" || Number(v) < 1
          ? { erreur: "Indiquez au moins une personne : vous." }
          : { erreur: null, suite: { nombreCollaborateurs: v } };
      }
      case "anciennete": {
        const v = lire("dateCreationEntreprise");
        return v === ""
          ? { erreur: "Indiquez un mois passé, au format mm/aaaa." }
          : { erreur: null, suite: { anciennete: v } };
      }
      case "typeZone":
        return valeurs.typeZone ? { erreur: null } : { erreur: "Choisissez le type de zone." };
      case "ville": {
        const v = lire("ville").trim();
        return v === "" ? { erreur: "Indiquez la ville." } : { erreur: null, suite: { ville: v } };
      }
      case "acces":
        return { erreur: null };
    }
  }

  function precedente() {
    setErreurs({});
    setErreurGenerale(null);
    setEtape((e) => Math.max(e - 1, 0));
  }

  async function surEnvoi(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreurGenerale(null);

    if (courante === "acces") {
      await creer();
      return;
    }

    const { erreur, suite } = verifier();
    if (erreur) {
      setErreurs({ [courante]: erreur });
      return;
    }
    setErreurs({});
    if (suite) setValeurs((v) => ({ ...v, ...suite }));
    setEtape((e) => e + 1);
  }

  async function creer() {
    const email = lire("email").trim();
    const motDePasse = lire("motDePasse");
    const confirmation = lire("confirmation");
    const nouvelles: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) nouvelles.email = "Adresse email invalide.";
    if (motDePasse.length < 10) nouvelles.motDePasse = "Le mot de passe doit contenir au moins 10 caractères.";
    else if (motDePasse !== confirmation) nouvelles.confirmation = "Les deux mots de passe ne correspondent pas.";
    setValeurs((v) => ({ ...v, email }));
    if (Object.keys(nouvelles).length > 0) {
      setErreurs(nouvelles);
      return;
    }
    setErreurs({});

    const payload = {
      formule: formuleChoisie ? { nombreAgents: formuleChoisie.nombreAgents, periode: formuleChoisie.periode, agents: formuleChoisie.agents } : undefined,
      email,
      motDePasse,
      metierPrecis: valeurs.metier,
      sousVariantes: valeurs.sousVariantes,
      autre: valeurs.autre,
      autreTexte: valeurs.autre ? valeurs.autreTexte : undefined,
      metierAbsentTexte: absent ? valeurs.metierAbsentTexte : undefined,
      categorieAbsente: absent ? valeurs.categorieAbsente : undefined,
      vendProduits: valeurs.vendProduits ? valeurs.vendProduits === "oui" : undefined,
      chiffreAffairesMensuel: valeurs.chiffreAffairesMensuel,
      nombreCollaborateurs: valeurs.nombreCollaborateurs,
      dateCreationEntreprise: valeurs.anciennete,
      typeZone: valeurs.typeZone,
      ville: valeurs.ville,
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
        const champs: Record<string, string[]> = resultat.champs ?? {};
        const premier = Object.keys(champs).find((c) => ETAPE_DU_CHAMP[c]);
        if (premier) {
          const cible = ETAPE_DU_CHAMP[premier];
          const index = etapes.indexOf(cible);
          setErreurs(
            Object.fromEntries(
              Object.entries(champs).map(([c, m]) => [ETAPE_DU_CHAMP[c] ?? c, m[0]]),
            ),
          );
          if (index >= 0) setEtape(index);
        }
        setErreurGenerale(resultat.erreur ?? "Le compte n'a pas pu être créé.");
        return;
      }

      const connexion = await signIn("credentials", {
        email: payload.email,
        motDePasse: payload.motDePasse,
        redirect: false,
      });
      if (connexion?.error) {
        route.push("/connexion");
        return;
      }
      // Une formule choisie avant l'inscription est enregistrée avec le compte ; si elle ne convient
      // pas à ce métier (ex. agent Comm pour une profession réglementée), on la refait ensemble.
      if (resultat.formule === "non_appliquee" && formuleChoisie) {
        route.push(`/activation?agents=${formuleChoisie.nombreAgents}&periode=${formuleChoisie.periode}`);
      } else if (resultat.formule === "enregistree") {
        // Formule enregistrée avec le compte : il reste à la régler.
        route.push("/paiement");
      } else {
        route.push("/offres");
      }
      route.refresh();
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
        comparaison adaptés à votre entreprise. Vous ne les donnez qu&apos;une fois.
      </p>

      {formuleChoisie ? (
        <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-sm" data-formule-choisie>
          <p className="text-[var(--text)]">
            Votre formule : {formuleChoisie.nombreAgents} agents, facturation {formuleChoisie.periode === "annuel" ? "annuelle" : "mensuelle"}.
          </p>
          <p className="mt-1 text-[var(--text-muted)]">
            {formuleChoisie.agents.map((c) => AGENTS.find((a) => a.code === c)?.nom).join(" · ")}
          </p>
          <p className="mt-2 text-[var(--text-muted)]">
            Elle sera enregistrée avec votre compte. Vous la réglez à l&apos;étape suivante.{" "}
            <Link href="/offres" className="text-[var(--blue-1)] hover:underline">Changer de formule</Link>
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        <p className="mb-2 text-xs text-[var(--text-faint)]" aria-live="polite">
          Question {etape + 1} sur {etapes.length}
        </p>
        <div
          className="inscription-progres"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={etapes.length}
          aria-valuenow={etape + 1}
          aria-label="Avancement de l'inscription"
        >
          <div style={{ width: `${((etape + 1) / etapes.length) * 100}%` }} />
        </div>
      </div>

      <form
        key={courante}
        ref={formulaire}
        onSubmit={surEnvoi}
        noValidate
        className="inscription-etape mt-8 flex flex-col gap-6"
      >
        <div>
          <h2 className="text-xl">{titre}</h2>
          {question.aide ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{question.aide}</p>
          ) : null}
        </div>

        {courante === "metier" ? (
          <Champ label="Métier" htmlFor="metier" erreur={erreurs.metier}>
            <ChampRecherche
              id="metier"
              name="metier"
              options={METIERS}
              valeur={valeurs.metier}
              onChange={(m) => setValeurs((v) => ({ ...v, metier: m, sousVariantes: [], autre: false, autreTexte: "", categorieAbsente: "", vendProduits: "" }))}
              placeholder="Tapez quelques lettres pour réduire la liste"
            />
            <button
              type="button"
              onClick={() => {
                setValeurs((v) => ({ ...v, metier: METIER_ABSENT, sousVariantes: [], autre: false, autreTexte: "", categorieAbsente: "", vendProduits: "" }));
                setErreurs({});
                setEtape((e) => e + 1);
              }}
              className="mt-3 w-fit text-sm text-[var(--blue-1)] hover:underline"
              data-metier-absent
            >
              Mon métier n&apos;est pas dans la liste
            </button>
          </Champ>
        ) : null}

        {courante === "sousVariantes" && metier ? (
          <div>
            <ChoixCases
              nom="sousVariantes"
              type="checkbox"
              legende={question.libelle}
              options={[...(metier.sousVariantes ?? []).map((v) => ({ valeur: v.id, libelle: v.libelle })), { valeur: CASE_AUTRE, libelle: "Autre (précisez)" }]}
              valeurs={[...valeurs.sousVariantes, ...(valeurs.autre ? [CASE_AUTRE] : [])]}
              onChange={(s) => setValeurs((v) => ({ ...v, sousVariantes: s.filter((x) => x !== CASE_AUTRE), autre: s.includes(CASE_AUTRE), autreTexte: s.includes(CASE_AUTRE) ? v.autreTexte : "" }))}
            />
            {valeurs.autre ? (
              <div className="mt-4">
                <label htmlFor="autreTexte" className="champ-etiquette">Précisez ce que vous faites</label>
                <input
                  id="autreTexte"
                  type="text"
                  maxLength={200}
                  value={valeurs.autreTexte}
                  onChange={(e) => setValeurs((v) => ({ ...v, autreTexte: e.target.value }))}
                  className={`${classeChamp} mt-2`}
                />
              </div>
            ) : null}
            {erreurs.sousVariantes ? (
              <p className="mt-2 text-xs text-[var(--red-1)]">{erreurs.sousVariantes}</p>
            ) : null}
          </div>
        ) : null}

        {courante === "metierAbsent" ? (
          <div className="flex flex-col gap-6">
            <div className="champ-groupe">
              <label htmlFor="metierAbsentTexte" className="champ-etiquette">Votre métier</label>
              <input
                id="metierAbsentTexte"
                type="text"
                maxLength={200}
                value={valeurs.metierAbsentTexte}
                onChange={(e) => setValeurs((v) => ({ ...v, metierAbsentTexte: e.target.value }))}
                className={classeChamp}
              />
            </div>
            <div>
              <ChoixCases
                nom="categorieAbsente"
                type="radio"
                legende="Ce qui ressemble le plus à votre activité"
                options={CATEGORIES_ABSENT}
                valeurs={valeurs.categorieAbsente ? [valeurs.categorieAbsente] : []}
                onChange={(c) => setValeurs((v) => ({ ...v, categorieAbsente: c[0] ?? "", vendProduits: "" }))}
              />
              <p className="mt-3 text-xs text-[var(--text-muted)]">Une profession réglementée (avocat, médecin…) se choisit dans la liste des métiers.</p>
            </div>
            {erreurs.metierAbsent ? <p className="text-xs text-[var(--red-1)]">{erreurs.metierAbsent}</p> : null}
          </div>
        ) : null}

        {courante === "stock" ? (
          <div>
            <ChoixCases
              nom="vendProduits"
              type="radio"
              legende={question.libelle}
              options={[{ valeur: "oui", libelle: "Oui" }, { valeur: "non", libelle: "Non" }]}
              valeurs={valeurs.vendProduits ? [valeurs.vendProduits] : []}
              onChange={(r) => setValeurs((v) => ({ ...v, vendProduits: (r[0] as "oui" | "non") ?? "" }))}
            />
            {erreurs.stock ? <p className="mt-2 text-xs text-[var(--red-1)]">{erreurs.stock}</p> : null}
          </div>
        ) : null}

        {courante === "chiffreAffairesMensuel" ? (
          <Champ
            label={question.unite ?? "Chiffre d'affaires mensuel"}
            htmlFor="chiffreAffairesMensuel"
            erreur={erreurs.chiffreAffairesMensuel}
          >
            <ChampNombre
              id="chiffreAffairesMensuel"
              name="chiffreAffairesMensuel"
              decimales
              valeurInitiale={valeurs.chiffreAffairesMensuel}
            />
          </Champ>
        ) : null}

        {courante === "nombreCollaborateurs" ? (
          <Champ
            label={question.unite ?? "Nombre de personnes"}
            htmlFor="nombreCollaborateurs"
            erreur={erreurs.nombreCollaborateurs}
          >
            <ChampNombre
              id="nombreCollaborateurs"
              name="nombreCollaborateurs"
              valeurInitiale={valeurs.nombreCollaborateurs}
            />
          </Champ>
        ) : null}

        {courante === "anciennete" ? (
          <Champ label="Mois de création" htmlFor="dateCreationEntreprise" erreur={erreurs.anciennete}>
            <ChampDate
              id="dateCreationEntreprise"
              name="dateCreationEntreprise"
              precision="mois"
              valeurInitiale={valeurs.anciennete}
            />
          </Champ>
        ) : null}

        {courante === "typeZone" ? (
          <div>
            <ChoixCases
              nom="typeZone"
              type="radio"
              legende={question.libelle}
              options={ZONES}
              valeurs={valeurs.typeZone ? [valeurs.typeZone] : []}
              onChange={(z) => setValeurs((v) => ({ ...v, typeZone: z[0] ?? "" }))}
            />
            {erreurs.typeZone ? <p className="mt-2 text-xs text-[var(--red-1)]">{erreurs.typeZone}</p> : null}
          </div>
        ) : null}

        {courante === "ville" ? (
          <Champ label="Ville" htmlFor="ville" erreur={erreurs.ville}>
            <input
              id="ville"
              name="ville"
              type="text"
              autoComplete="address-level2"
              defaultValue={valeurs.ville}
              className={classeChamp}
            />
          </Champ>
        ) : null}

        {courante === "acces" ? (
          <>
            <Champ label="Adresse email" htmlFor="email" erreur={erreurs.email}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={valeurs.email}
                className={classeChamp}
              />
            </Champ>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Champ
                label="Mot de passe"
                htmlFor="motDePasse"
                aide="10 caractères minimum."
                erreur={erreurs.motDePasse}
              >
                <input
                  id="motDePasse"
                  name="motDePasse"
                  type="password"
                  autoComplete="new-password"
                  className={classeChamp}
                />
              </Champ>
              <Champ label="Confirmation" htmlFor="confirmation" erreur={erreurs.confirmation}>
                <input
                  id="confirmation"
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  className={classeChamp}
                />
              </Champ>
            </div>
          </>
        ) : null}

        {erreurGenerale ? <p className="text-sm text-[var(--red-1)]">{erreurGenerale}</p> : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={enCours}
            className="rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
          >
            {derniere ? (enCours ? "Création du compte…" : "Créer mon compte") : "Continuer"}
          </button>
          {etape > 0 ? (
            <button
              type="button"
              onClick={precedente}
              className="text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Retour
            </button>
          ) : null}
        </div>

        <p className="text-sm text-[var(--text-muted)]">
          Vous avez déjà un compte ?{" "}
          <Link href="/connexion" className="text-[var(--blue-1)] hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </main>
  );
}

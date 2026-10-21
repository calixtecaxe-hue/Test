"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Champ, classeChamp } from "@/components/champ";
import { ChampDate } from "@/components/champ-date";
import { ChampNombre } from "@/components/champ-nombre";
import { ChampRecherche } from "@/components/champ-recherche";
import { ChoixCases } from "@/components/choix-cases";
import { libelleQuestion } from "@/lib/donnees/lexique";
import type { ProfilId } from "@/lib/donnees/schemas";
import { METIER_ABSENT, metiersTries, router, trouverMetier } from "@/lib/routage";
import { INSCRIPTION_CLIENT, LEXIQUE_CLIENT, ROUTAGE_CLIENT } from "@/lib/routage-client";

// Les questions du dossier de l'entreprise, une à la fois, formulées avec les mots du métier (lexique). Elles se
// posent en deux temps du parcours : « métier » avant le choix de la formule (les agents proposés en dépendent),
// « dossier » dans l'application après le paiement. Le routage (catégorie, profils) n'est jamais envoyé : le
// serveur le recalcule (CLAUDE.md section 5).

type IdEtape = "metier" | "sousVariantes" | "metierAbsent" | "stock" | "chiffreAffairesMensuel" | "nombreCollaborateurs" | "anciennete" | "typeZone" | "ville";

export type ValeursMetier = {
  metier: string;
  sousVariantes: string[];
  // « Autre (précisez) » cochée, et ce que le client y a écrit.
  autre: boolean;
  autreTexte: string;
  // « Mon métier n'est pas dans la liste » : son métier, et la catégorie qui y ressemble le plus.
  metierAbsentTexte: string;
  categorieAbsente: string;
  vendProduits: "" | "oui" | "non";
};

export const METIER_VIDE: ValeursMetier = { metier: "", sousVariantes: [], autre: false, autreTexte: "", metierAbsentTexte: "", categorieAbsente: "", vendProduits: "" };

type ValeursDossier = { chiffreAffairesMensuel: string; nombreCollaborateurs: string; anciennete: string; typeZone: string; ville: string };
const DOSSIER_VIDE: ValeursDossier = { chiffreAffairesMensuel: "", nombreCollaborateurs: "", anciennete: "", typeZone: "", ville: "" };

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
};

const METIERS = metiersTries(ROUTAGE_CLIENT).map((m) => ({ valeur: m.id, libelle: m.libelle, mots: m.synonymes }));
// Valeur de la case « Autre (précisez) » dans la liste des activités.
const CASE_AUTRE = "__autre";
// Catégories proposées à qui ne trouve pas son métier (hors professions réglementées, à choisir dans la liste).
const CATEGORIES_ABSENT = ROUTAGE_CLIENT.categories.filter((c) => !c.reglementee).map((c) => ({ valeur: c.id, libelle: c.libelle }));
const QUESTIONS = Object.fromEntries(INSCRIPTION_CLIENT.questions.map((q) => [q.id, q]));

type Props =
  | { groupe: "metier"; initiales: ValeursMetier; suite: string }
  | { groupe: "dossier"; profils: ProfilId[]; suite: string };

export function QuestionsProfil(props: Props) {
  const route = useRouter();
  const [metierVals, setMetierVals] = useState<ValeursMetier>(props.groupe === "metier" ? props.initiales : METIER_VIDE);
  const [dossierVals, setDossierVals] = useState<ValeursDossier>(DOSSIER_VIDE);
  const [etape, setEtape] = useState(0);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const formulaire = useRef<HTMLFormElement>(null);

  const valeurs = metierVals;
  const metier = trouverMetier(ROUTAGE_CLIENT, valeurs.metier);
  const absent = valeurs.metier === METIER_ABSENT;
  const aDesActivites = (metier?.sousVariantes?.length ?? 0) > 0;
  // Le routage se recalcule avec ce que le client a déjà dit ; il sait si une question sur le stock s'impose.
  const routage = valeurs.metier
    ? router(ROUTAGE_CLIENT, valeurs.metier, valeurs.sousVariantes, { autre: valeurs.autre, categorieAbsente: valeurs.categorieAbsente })
    : null;

  const etapes: IdEtape[] =
    props.groupe === "metier"
      ? ["metier", ...(aDesActivites ? (["sousVariantes"] as const) : []), ...(absent ? (["metierAbsent"] as const) : []), ...(routage?.ok && routage.routage.stock === "a_demander" ? (["stock"] as const) : [])]
      : ["chiffreAffairesMensuel", "nombreCollaborateurs", "anciennete", "typeZone", "ville"];
  const courante = etapes[Math.min(etape, etapes.length - 1)];
  const derniere = etape >= etapes.length - 1;

  // Les mots du métier : ceux que le client vient de choisir, ou ceux de son compte pour le dossier.
  const profils: ProfilId[] = props.groupe === "dossier" ? props.profils : routage?.ok ? routage.routage.profils : [];
  const question = QUESTIONS[courante];
  const titre = libelleQuestion(question, profils, LEXIQUE_CLIENT);

  // Le focus passe à la première réponse possible quand la question change.
  useEffect(() => {
    formulaire.current
      ?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), input[type=checkbox], input[type=radio], button[role=combobox]")
      ?.focus();
  }, [courante]);

  function lire(nom: string): string {
    // Par le nom : le champ caché des nombres et des dates porte le nom, le champ visible porte seulement l'identifiant.
    return formulaire.current?.querySelector<HTMLInputElement>(`input[name="${nom}"]`)?.value ?? "";
  }

  const majMetier = (suite: Partial<ValeursMetier>) => setMetierVals((v) => ({ ...v, ...suite }));

  // Vérifie la question en cours ; rend le message d'erreur, ou null.
  function verifier(): { erreur: string | null; suite?: Partial<ValeursDossier> } {
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
        return v === "" || Number.isNaN(Number(v)) ? { erreur: "Indiquez un chiffre d'affaires mensuel, même approximatif." } : { erreur: null, suite: { chiffreAffairesMensuel: v } };
      }
      case "nombreCollaborateurs": {
        const v = lire("nombreCollaborateurs");
        return v === "" || Number(v) < 1 ? { erreur: "Indiquez au moins une personne : vous." } : { erreur: null, suite: { nombreCollaborateurs: v } };
      }
      case "anciennete": {
        const v = lire("dateCreationEntreprise");
        return v === "" ? { erreur: "Indiquez un mois passé, au format mm/aaaa." } : { erreur: null, suite: { anciennete: v } };
      }
      case "typeZone":
        return dossierVals.typeZone ? { erreur: null } : { erreur: "Choisissez le type de zone." };
      case "ville": {
        const v = lire("ville").trim();
        return v === "" ? { erreur: "Indiquez la ville." } : { erreur: null, suite: { ville: v } };
      }
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
    const { erreur, suite } = verifier();
    if (erreur) {
      setErreurs({ [courante]: erreur });
      return;
    }
    setErreurs({});
    const dossier = suite ? { ...dossierVals, ...suite } : dossierVals;
    if (suite) setDossierVals(dossier);
    if (!derniere) {
      setEtape((e) => e + 1);
      return;
    }
    await enregistrer(dossier);
  }

  async function enregistrer(dossier: ValeursDossier) {
    const payload =
      props.groupe === "metier"
        ? {
            metierPrecis: valeurs.metier,
            sousVariantes: valeurs.sousVariantes,
            autre: valeurs.autre,
            autreTexte: valeurs.autre ? valeurs.autreTexte : undefined,
            metierAbsentTexte: absent ? valeurs.metierAbsentTexte : undefined,
            categorieAbsente: absent ? valeurs.categorieAbsente : undefined,
            vendProduits: valeurs.vendProduits ? valeurs.vendProduits === "oui" : undefined,
          }
        : {
            chiffreAffairesMensuel: dossier.chiffreAffairesMensuel,
            nombreCollaborateurs: dossier.nombreCollaborateurs,
            dateCreationEntreprise: dossier.anciennete,
            typeZone: dossier.typeZone,
            ville: dossier.ville,
          };
    setEnCours(true);
    try {
      const reponse = await fetch(props.groupe === "metier" ? "/api/compte/metier" : "/api/compte/dossier", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resultat = await reponse.json().catch(() => ({}));
      if (!reponse.ok) {
        const champs: Record<string, string[]> = resultat.champs ?? {};
        const premier = Object.keys(champs).find((c) => ETAPE_DU_CHAMP[c]);
        if (premier) {
          const index = etapes.indexOf(ETAPE_DU_CHAMP[premier]);
          setErreurs(Object.fromEntries(Object.entries(champs).map(([c, m]) => [ETAPE_DU_CHAMP[c] ?? c, m[0]])));
          if (index >= 0) setEtape(index);
        }
        setErreurGenerale(resultat.erreur ?? "Vos réponses n'ont pas pu être enregistrées.");
        return;
      }
      route.push(props.suite);
      route.refresh();
    } catch {
      setErreurGenerale("Une erreur est survenue. Réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <div className="mt-8">
        <p className="mb-2 text-xs text-[var(--text-faint)]" aria-live="polite">
          Question {etape + 1} sur {etapes.length}
        </p>
        <div className="inscription-progres" role="progressbar" aria-valuemin={1} aria-valuemax={etapes.length} aria-valuenow={etape + 1} aria-label="Avancement">
          <div style={{ width: `${((etape + 1) / etapes.length) * 100}%` }} />
        </div>
      </div>

      <form key={courante} ref={formulaire} onSubmit={surEnvoi} noValidate className="inscription-etape mt-8 flex flex-col gap-6">
        <div>
          <h2 className="text-xl">{titre}</h2>
          {question.aide ? <p className="mt-1 text-sm text-[var(--text-muted)]">{question.aide}</p> : null}
        </div>

        {courante === "metier" ? (
          <Champ label="Métier" htmlFor="metier" erreur={erreurs.metier}>
            <ChampRecherche
              id="metier"
              name="metier"
              options={METIERS}
              valeur={valeurs.metier}
              onChange={(m) => setMetierVals({ ...METIER_VIDE, metier: m })}
              placeholder="Tapez quelques lettres pour réduire la liste"
            />
            <button
              type="button"
              onClick={() => {
                setMetierVals({ ...METIER_VIDE, metier: METIER_ABSENT });
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
              onChange={(s) => majMetier({ sousVariantes: s.filter((x) => x !== CASE_AUTRE), autre: s.includes(CASE_AUTRE), autreTexte: s.includes(CASE_AUTRE) ? valeurs.autreTexte : "" })}
            />
            {valeurs.autre ? (
              <div className="mt-4">
                <label htmlFor="autreTexte" className="champ-etiquette">
                  Précisez ce que vous faites
                </label>
                <input id="autreTexte" type="text" maxLength={200} value={valeurs.autreTexte} onChange={(e) => majMetier({ autreTexte: e.target.value })} className={`${classeChamp} mt-2`} />
              </div>
            ) : null}
            {erreurs.sousVariantes ? <p className="mt-2 text-xs text-[var(--red-1)]">{erreurs.sousVariantes}</p> : null}
          </div>
        ) : null}

        {courante === "metierAbsent" ? (
          <div className="flex flex-col gap-6">
            <div className="champ-groupe">
              <label htmlFor="metierAbsentTexte" className="champ-etiquette">
                Votre métier
              </label>
              <input id="metierAbsentTexte" type="text" maxLength={200} value={valeurs.metierAbsentTexte} onChange={(e) => majMetier({ metierAbsentTexte: e.target.value })} className={classeChamp} />
            </div>
            <div>
              <ChoixCases
                nom="categorieAbsente"
                type="radio"
                legende="Ce qui ressemble le plus à votre activité"
                options={CATEGORIES_ABSENT}
                valeurs={valeurs.categorieAbsente ? [valeurs.categorieAbsente] : []}
                onChange={(c) => majMetier({ categorieAbsente: c[0] ?? "", vendProduits: "" })}
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
              options={[
                { valeur: "oui", libelle: "Oui" },
                { valeur: "non", libelle: "Non" },
              ]}
              valeurs={valeurs.vendProduits ? [valeurs.vendProduits] : []}
              onChange={(r) => majMetier({ vendProduits: (r[0] as "oui" | "non") ?? "" })}
            />
            {erreurs.stock ? <p className="mt-2 text-xs text-[var(--red-1)]">{erreurs.stock}</p> : null}
          </div>
        ) : null}

        {courante === "chiffreAffairesMensuel" ? (
          <Champ label={question.unite ?? "Chiffre d'affaires mensuel"} htmlFor="chiffreAffairesMensuel" erreur={erreurs.chiffreAffairesMensuel}>
            <ChampNombre id="chiffreAffairesMensuel" name="chiffreAffairesMensuel" decimales valeurInitiale={dossierVals.chiffreAffairesMensuel} />
          </Champ>
        ) : null}

        {courante === "nombreCollaborateurs" ? (
          <Champ label={question.unite ?? "Nombre de personnes"} htmlFor="nombreCollaborateurs" erreur={erreurs.nombreCollaborateurs}>
            <ChampNombre id="nombreCollaborateurs" name="nombreCollaborateurs" valeurInitiale={dossierVals.nombreCollaborateurs} />
          </Champ>
        ) : null}

        {courante === "anciennete" ? (
          <Champ label="Mois de création" htmlFor="dateCreationEntreprise" erreur={erreurs.anciennete}>
            <ChampDate id="dateCreationEntreprise" name="dateCreationEntreprise" precision="mois" valeurInitiale={dossierVals.anciennete} />
          </Champ>
        ) : null}

        {courante === "typeZone" ? (
          <div>
            <ChoixCases
              nom="typeZone"
              type="radio"
              legende={question.libelle}
              options={ZONES}
              valeurs={dossierVals.typeZone ? [dossierVals.typeZone] : []}
              onChange={(z) => setDossierVals((v) => ({ ...v, typeZone: z[0] ?? "" }))}
            />
            {erreurs.typeZone ? <p className="mt-2 text-xs text-[var(--red-1)]">{erreurs.typeZone}</p> : null}
          </div>
        ) : null}

        {courante === "ville" ? (
          <Champ label="Ville" htmlFor="ville" erreur={erreurs.ville}>
            <input id="ville" name="ville" type="text" autoComplete="address-level2" defaultValue={dossierVals.ville} className={classeChamp} />
          </Champ>
        ) : null}

        {erreurGenerale ? (
          <p role="alert" className="text-sm text-[var(--red-1)]">
            {erreurGenerale}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={enCours}
            className="rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
          >
            {derniere ? (enCours ? "Enregistrement…" : props.groupe === "metier" ? "Choisir ma formule" : "Ouvrir mes agents") : "Continuer"}
          </button>
          {etape > 0 ? (
            <button type="button" onClick={precedente} className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Retour
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

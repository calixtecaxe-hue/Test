"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoixCases } from "@/components/choix-cases";
import { DELAI_MAX_MOIS, verifierVraisemblance, type ObjectifSaisie, type UniteAmpleur } from "@/lib/audit/objectif";
import { ecartDeParcours, phraseDe, quoiDeProposition, unitesDe, type SuiviParcours } from "@/lib/audit/objectifs-agent";
import { lireNombre } from "@/lib/audit/nombre";
import type { ObjectifAgent, ObjectifPersonnel } from "@/lib/donnees/schemas";

const LIBELLES_UNITE: Record<UniteAmpleur, string> = { pourcent: "En pourcentage (%)", euros: "En euros (€)", unites: "En nombre" };
const PRECISION_UNITE: Record<UniteAmpleur, string> = { pourcent: "en %", euros: "en euros", unites: "en nombre" };

export type Propositions = { parties?: { nom: string; detail?: string }[]; personnel: ObjectifPersonnel; objectifs: ObjectifAgent[] };

type Mode = "proposition" | "personnel";
// Ce que le dirigeant précise pour son objectif : un chiffre (et son unité), ou ce qu'il veut constater ; et le délai.
type Precision = { combien: string; unite: UniteAmpleur; sansChiffre: boolean; reussite: string; delai: string };

const VIDE: Precision = { combien: "", unite: "pourcent", sansChiffre: true, reussite: "", delai: "" };
const precisionDe = (o: ObjectifAgent): Precision => ({ ...VIDE, unite: unitesDe(o)[0] ?? "pourcent", sansChiffre: o.mesure === "phrase" });
const precisionSaisie = (s: ObjectifSaisie): Precision => ({
  combien: s.ampleur ? String(s.ampleur.valeur).replace(".", ",") : "",
  unite: s.ampleur?.unite ?? "pourcent",
  sansChiffre: !s.ampleur,
  reussite: s.reussite ?? "",
  delai: String(s.delaiMois),
});
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// Les deux façons de définir l'objectif, de même importance (demande du propriétaire du 28 octobre).
const MODES: { mode: Mode; titre: string; aide: string }[] = [
  { mode: "proposition", titre: "Choisir un objectif proposé", aide: "Parcourez les suggestions adaptées à cet agent." },
  { mode: "personnel", titre: "Écrire mon propre objectif", aide: "Décrivez le résultat que vous souhaitez obtenir." },
];

const Coche = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

// Objectif d'un agent dont l'objectif n'a pas forcément de chiffre (RH, Comm). Un objectif par agent (décision du
// 28 octobre, option 1B). Le dirigeant voit d'abord deux choix de même importance, sans présélection : « Choisir un objectif
// proposé » ou « Écrire mon propre objectif ». Le premier ouvre les propositions (en Comm, après « Où en êtes-vous ? ») et
// les champs de celle qu'il choisit ; le second ouvre directement le champ de rédaction. Un seul mode est actif ; le
// brouillon de l'autre reste dans la page et n'est jamais transmis ni remplacé en silence.
export function ObjectifChoix({
  agent,
  propositions,
  facteurAnnuelMax,
  annulable,
  onAnnuler,
  onEnregistre,
  initiaux,
  suivi,
  publication,
}: {
  agent: string;
  propositions: Propositions;
  facteurAnnuelMax: number;
  annulable?: boolean;
  onAnnuler?: () => void;
  onEnregistre?: () => void;
  // Objectif en cours, repris pour être modifié (le premier, s'il en reste plusieurs d'avant le 28 octobre).
  initiaux?: ObjectifSaisie[];
  // Comm : question qui donne le parcours du questionnaire, et la réponse déjà donnée (avertissement 6C).
  suivi?: SuiviParcours | null;
  publication?: string | null;
}) {
  const router = useRouter();
  const id = useId();
  const parties = propositions.parties ?? [];
  const enParties = parties.length > 0;
  const proposition = (choix: string | null | undefined) => (choix ? propositions.objectifs.find((o) => o.id === choix) : undefined);
  const initial = initiaux?.[0];
  const propositionInitiale = proposition(initial?.choix);

  const [mode, setMode] = useState<Mode | null>(initial ? (propositionInitiale ? "proposition" : "personnel") : null);
  const [choix, setChoix] = useState<string | null>(propositionInitiale?.id ?? null);
  // Brouillon de chaque proposition ouverte, et brouillon de l'objectif personnel : gardés quand le dirigeant change d'avis.
  const [brouillons, setBrouillons] = useState<Record<string, Precision>>(() => (propositionInitiale && initial ? { [propositionInitiale.id]: precisionSaisie(initial) } : {}));
  const [personnel, setPersonnel] = useState<Precision & { texte: string }>(() =>
    initial && !propositionInitiale ? { ...precisionSaisie(initial), texte: initial.quoi } : { ...VIDE, texte: "" },
  );
  const [partie, setPartie] = useState<string | null>(() => (enParties ? (propositionInitiale?.groupe ?? (propositionInitiale ? null : initial?.partie) ?? null) : null));
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  // Un choix fait à la souris ouvre son contenu et y place le curseur ; au clavier, les flèches parcourent les choix sans
  // que le curseur saute ailleurs (Tab mène ensuite au contenu ouvert).
  const parPointeur = useRef(false);
  const [focus, setFocus] = useState<{ cible: string; fois: number } | null>(null);
  const viser = (cible: string) => setFocus((f) => ({ cible, fois: (f?.fois ?? 0) + 1 }));
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(focus.cible);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  }, [focus]);

  const effacer = (...cles: string[]) => setErreurs((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !cles.includes(k) && k !== "general")));

  function choisirMode(m: Mode) {
    const souris = parPointeur.current;
    parPointeur.current = false;
    setMode(m);
    effacer("mode", "choix", "texte", "ampleur", "reussite", "delaiMois", "partie");
    if (souris) viser(m === "personnel" ? `${id}-texte` : enParties && !partie ? `${id}-partie-legende` : `${id}-choix-legende`);
  }
  function choisirProposition(o: ObjectifAgent) {
    setChoix(o.id);
    setBrouillons((b) => (b[o.id] ? b : { ...b, [o.id]: precisionDe(o) }));
    effacer("choix", "ampleur", "reussite", "delaiMois");
  }
  function changerPartie(nom: string) {
    if (nom === partie) return;
    setPartie(nom);
    // La proposition d'une autre partie n'est plus choisie ; son brouillon reste gardé.
    if (proposition(choix)?.groupe !== nom) setChoix(null);
    effacer("partie", "choix");
  }
  function majPrecision(champ: Partial<Precision & { texte: string }>, erreur: string) {
    if (mode === "personnel") setPersonnel((p) => ({ ...p, ...champ }));
    else if (mode === "proposition" && choix) setBrouillons((b) => ({ ...b, [choix]: { ...b[choix], ...champ } }));
    effacer(erreur);
  }

  // La précision du mode actif ; null tant que rien n'est choisi.
  const choisie = mode === "proposition" ? proposition(choix) : undefined;
  const active: (Precision & { texte?: string }) | null = mode === "personnel" ? personnel : choisie ? brouillons[choisie.id] ?? null : null;

  // L'objectif tel qu'il part (null si un champ manque). Seul le mode actif est transmis.
  function saisie(): ObjectifSaisie | null {
    const p = active;
    if (!p) return null;
    const quoi = choisie ? quoiDeProposition(choisie) : personnel.texte.trim();
    const valeur = lireNombre(p.combien);
    const mois = lireNombre(p.delai);
    if (quoi.length < 3 || mois === null || !Number.isInteger(mois) || mois < 1 || mois > DELAI_MAX_MOIS) return null;
    if (!p.sansChiffre && (valeur === null || valeur <= 0)) return null;
    if (p.sansChiffre && p.reussite.trim().length < 3) return null;
    const part = choisie?.groupe;
    return {
      quoi,
      ...(!p.sansChiffre && valeur !== null ? { ampleur: { valeur, unite: choisie?.gabarit ? unitesDe(choisie)[0] : p.unite } } : { reussite: p.reussite.trim() }),
      delaiMois: mois,
      ...(choisie ? { choix: choisie.id } : {}),
      ...(part ? { partie: part } : {}),
    };
  }

  function verifier(): Record<string, string> {
    if (!mode) return { mode: "Choisissez un objectif proposé, ou écrivez votre propre objectif." };
    if (mode === "proposition" && enParties && !partie) return { partie: "Choisissez d'abord où vous en êtes : les objectifs proposés s'afficheront ensuite." };
    if (!active) return { choix: "Choisissez un des objectifs proposés, ou écrivez votre propre objectif." };
    const manques: Record<string, string> = {};
    const valeur = lireNombre(active.combien);
    const mois = lireNombre(active.delai);
    if (mode === "personnel" && personnel.texte.trim().length < 3) manques.texte = "Décrivez votre objectif en quelques mots pour continuer.";
    if (!active.sansChiffre && (valeur === null || valeur <= 0)) manques.ampleur = "Indiquez un nombre supérieur à zéro, ou choisissez « Je n'ai pas de chiffre ».";
    if (active.sansChiffre && active.reussite.trim().length < 3) manques.reussite = "Décrivez ce que vous voulez constater quand ce sera atteint.";
    if (mois === null || !Number.isInteger(mois) || mois < 1) manques.delaiMois = "Indiquez en combien de mois, avec un nombre entier.";
    else if (mois > DELAI_MAX_MOIS) manques.delaiMois = `Le délai ne dépasse pas ${DELAI_MAX_MOIS} mois (10 ans).`;
    const s = saisie();
    if (s && !choisie?.gabarit && Object.keys(manques).length === 0) {
      const v = verifierVraisemblance(s, facteurAnnuelMax);
      if (!v.ok) manques[v.champ] = v.message;
    }
    return manques;
  }

  const cibleDe = (champ: string) => (champ === "mode" || champ === "partie" || champ === "choix" ? `${id}-${champ}-legende` : `${id}-${champ}`);

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault();
    const manques = verifier();
    const premier = Object.keys(manques)[0];
    if (premier) {
      setErreurs({ ...manques, general: "Complétez ce qui est signalé pour continuer." });
      viser(cibleDe(premier));
      return;
    }
    setEnvoi(true);
    const r = await fetch("/api/audit/objectif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, objectifs: [saisie()] }),
    }).catch(() => null);
    if (r?.ok) {
      onEnregistre?.();
      router.refresh();
      return;
    }
    const corps = (await r?.json().catch(() => null)) as { erreur?: string; champ?: string } | null;
    const champ = corps?.champ === "quoi" ? "texte" : corps?.champ && ["choix", "ampleur", "reussite", "delaiMois", "texte"].includes(corps.champ) ? corps.champ : null;
    setErreurs({ [champ ?? "general"]: corps?.erreur ?? "Votre objectif n'a pas pu être enregistré. Réessayez.", ...(champ ? { general: "Complétez ce qui est signalé pour continuer." } : {}) });
    if (champ) viser(cibleDe(champ));
    setEnvoi(false);
  }

  const lien = "audit-lien w-fit text-left text-sm text-[var(--agent)] hover:underline";
  const erreur = (cle: string) => (erreurs[cle] ? <p className="text-sm text-[var(--red-1)]" id={`${id}-${cle}-erreur`}>{erreurs[cle]}</p> : null);
  const decrit = (cle: string, aide?: string) => [aide, erreurs[cle] ? `${id}-${cle}-erreur` : undefined].filter(Boolean).join(" ") || undefined;
  const ecart = mode === "proposition" ? ecartDeParcours(suivi ?? null, partie, publication) : null;

  // Les champs de l'objectif choisi : son texte (objectif personnel), le chiffre et son unité ou ce que le dirigeant veut
  // constater, puis le délai ; la phrase qui sera enregistrée s'affiche au fur et à mesure.
  function rendreChamps(o: ObjectifAgent | undefined) {
    const p = active!;
    const s = saisie();
    const unites: UniteAmpleur[] = o ? unitesDe(o) : ["pourcent", "euros", "unites"];
    const peutChiffrer = !o || o.mesure === "chiffre";
    const libelleUnite = (u: UniteAmpleur) => (o?.libellesUnites?.[u] ? majuscule(o.libellesUnites[u]!) : LIBELLES_UNITE[u]);
    return (
      <div className={o ? "objectif-champs" : "objectif-champs objectif-champs-perso"} data-detail data-objectif={o?.id ?? "personnel"}>
        {!o ? (
          <div className="champ-groupe">
            <label htmlFor={`${id}-texte`} className="champ-etiquette">Votre objectif</label>
            <p id={`${id}-texte-aide`} className="text-sm text-[var(--text-muted)]">
              {propositions.personnel.aide} Exemple : {propositions.personnel.exemple}.
            </p>
            <input
              id={`${id}-texte`}
              type="text"
              value={personnel.texte}
              onChange={(x) => majPrecision({ texte: x.target.value }, "texte")}
              maxLength={160}
              className="champ-saisie"
              aria-describedby={decrit("texte", `${id}-texte-aide`)}
              aria-invalid={erreurs.texte ? true : undefined}
            />
            {erreur("texte")}
          </div>
        ) : null}

        {!p.sansChiffre ? (
          <>
            <div className="champ-groupe">
              <label htmlFor={`${id}-ampleur`} className="champ-etiquette">
                {o?.question ?? (unites.length === 1 ? `De combien, ${PRECISION_UNITE[unites[0]]} ?` : "De combien ?")}
              </label>
              <input
                id={`${id}-ampleur`}
                type="text"
                inputMode="decimal"
                value={p.combien}
                onChange={(x) => majPrecision({ combien: x.target.value }, "ampleur")}
                className="champ-saisie sm:max-w-[16rem]"
                aria-invalid={erreurs.ampleur ? true : undefined}
                aria-describedby={decrit("ampleur")}
              />
              {erreur("ampleur")}
            </div>
            {!o?.gabarit && unites.length > 1 ? (
              <div className="champ-groupe">
                <span className="champ-etiquette">Unité du chiffre</span>
                <ChoixCases nom={`${id}-unite`} type="radio" legende="Unité du chiffre" options={unites.map((u) => ({ valeur: u, libelle: libelleUnite(u) }))} valeurs={[p.unite]} onChange={(v) => majPrecision({ unite: v[0] as UniteAmpleur }, "ampleur")} />
              </div>
            ) : null}
            <button type="button" onClick={() => majPrecision({ sansChiffre: true }, "ampleur")} className={lien} data-sans-chiffre>
              Je n&apos;ai pas de chiffre : je décris ce que je veux constater
            </button>
          </>
        ) : (
          <>
            <div className="champ-groupe">
              <label htmlFor={`${id}-reussite`} className="champ-etiquette">Comment saurez-vous que c&apos;est atteint ?</label>
              <input
                id={`${id}-reussite`}
                type="text"
                value={p.reussite}
                onChange={(x) => majPrecision({ reussite: x.target.value }, "reussite")}
                placeholder={`Ex. : ${o?.exemple.reussite ?? propositions.personnel.exempleReussite}`}
                maxLength={200}
                className="champ-saisie"
                aria-invalid={erreurs.reussite ? true : undefined}
                aria-describedby={decrit("reussite")}
              />
              {erreur("reussite")}
            </div>
            {peutChiffrer ? (
              <button type="button" onClick={() => majPrecision({ sansChiffre: false }, "reussite")} className={lien} data-avec-chiffre>
                J&apos;ai un chiffre : je le renseigne
              </button>
            ) : null}
          </>
        )}

        <div className="champ-groupe">
          <label htmlFor={`${id}-delaiMois`} className="champ-etiquette">
            En combien de temps ? <span className="font-normal text-[var(--text-muted)]">(en mois)</span>
          </label>
          <input
            id={`${id}-delaiMois`}
            type="text"
            inputMode="numeric"
            value={p.delai}
            onChange={(x) => majPrecision({ delai: x.target.value }, "delaiMois")}
            placeholder={`Ex. : ${o?.exemple.delaiMois ?? 6}`}
            className="champ-saisie sm:max-w-[16rem]"
            aria-invalid={erreurs.delaiMois ? true : undefined}
            aria-describedby={decrit("delaiMois")}
          />
          {erreur("delaiMois")}
        </div>

        <p className="min-h-[1.5rem] text-sm text-[var(--text-muted)]" aria-live="polite" data-apercu>
          {s ? (
            <>
              Votre objectif : <span className="text-[var(--text)]">{phraseDe(s, o)}</span>
              {s.reussite ? <> · Réussite : <span className="text-[var(--text)]">{s.reussite}</span></> : null}
            </>
          ) : null}
        </p>
      </div>
    );
  }

  // Une carte à un seul choix : titre, précision, et l'état choisi écrit (coche, « Choisi », bordure épaisse).
  function carte({ nom, valeur, titre, detail, choisi, onChoisir, attributs, enfants }: { nom: string; valeur: string; titre: string; detail?: string; choisi: boolean; onChoisir: () => void; attributs?: Record<string, string>; enfants?: React.ReactNode }) {
    return (
      <li key={valeur} className={`objectif-carte${choisi ? " choisie" : ""}`} {...attributs}>
        <label className="objectif-carte-tete">
          <input type="radio" name={nom} value={valeur} checked={choisi} onChange={onChoisir} className="case-entree" />
          <span className="objectif-marque" aria-hidden="true">{choisi ? <Coche /> : null}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="objectif-titre">{titre}</span>
            {detail ? <span className="text-sm text-[var(--text-muted)]">{detail}</span> : null}
          </span>
          {choisi ? <span className="objectif-pastille">Choisi</span> : null}
        </label>
        {enfants}
      </li>
    );
  }

  const visibles = propositions.objectifs.filter((o) => !enParties || (o.groupe ?? "") === partie);

  return (
    <form onSubmit={envoyer} noValidate className="mt-6 flex flex-col gap-6" data-objectif-choix>
      <fieldset className="flex flex-col gap-3" data-modes aria-describedby={erreurs.mode ? `${id}-mode-erreur` : undefined}>
        <legend id={`${id}-mode-legende`} tabIndex={-1} className="sr-only">Comment voulez-vous définir votre objectif ?</legend>
        <ul className="objectif-modes">
          {MODES.map((m) => (
            <li key={m.mode} className={`objectif-mode${mode === m.mode ? " choisi" : ""}`} data-mode={m.mode}>
              <label className="objectif-mode-tete" onPointerDown={() => (parPointeur.current = true)}>
                <input type="radio" name={`${id}-mode`} value={m.mode} checked={mode === m.mode} onChange={() => choisirMode(m.mode)} className="case-entree" />
                <span className="objectif-marque" aria-hidden="true">{mode === m.mode ? <Coche /> : null}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="objectif-mode-titre">{m.titre}</span>
                  <span className="text-sm text-[var(--text-muted)]">{m.aide}</span>
                </span>
                {mode === m.mode ? <span className="objectif-pastille">Choisi</span> : null}
              </label>
            </li>
          ))}
        </ul>
        {erreur("mode")}
      </fieldset>

      {mode === "proposition" ? (
        <div className="flex flex-col gap-6" data-mode-contenu="proposition">
          {enParties ? (
            <fieldset className="flex flex-col gap-3" data-parties aria-describedby={erreurs.partie ? `${id}-partie-erreur` : undefined}>
              <legend id={`${id}-partie-legende`} tabIndex={-1} className="champ-etiquette mb-2">Où en êtes-vous ?</legend>
              <ul className="objectif-cartes objectif-parties">
                {parties.map((pt) =>
                  carte({ nom: `${id}-partie`, valeur: pt.nom, titre: pt.nom, detail: pt.detail, choisi: partie === pt.nom, onChoisir: () => changerPartie(pt.nom), attributs: { "data-partie": pt.nom } }),
                )}
              </ul>
              {erreur("partie")}
              {ecart ? <p className="note-ecart" role="note" data-ecart-partie>{ecart}</p> : null}
            </fieldset>
          ) : null}
          {!enParties || partie ? (
            <fieldset className="flex flex-col gap-3" data-propositions aria-describedby={erreurs.choix ? `${id}-choix-erreur` : undefined}>
              <legend id={`${id}-choix-legende`} tabIndex={-1} className="champ-etiquette mb-2">Les objectifs proposés</legend>
              <ul className="objectif-cartes">
                {visibles.map((o) =>
                  carte({
                    nom: `${id}-choix`,
                    valeur: o.id,
                    titre: o.libelle,
                    detail: o.detail,
                    choisi: choix === o.id,
                    onChoisir: () => choisirProposition(o),
                    attributs: { "data-carte": o.id },
                    enfants: choix === o.id ? rendreChamps(o) : null,
                  }),
                )}
              </ul>
              {erreur("choix")}
            </fieldset>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Choisissez d&apos;abord où vous en êtes : les objectifs proposés s&apos;afficheront ensuite.</p>
          )}
        </div>
      ) : mode === "personnel" ? (
        <div className="objectif-entree" data-mode-contenu="personnel">
          {rendreChamps(undefined)}
        </div>
      ) : null}

      <div className="objectif-actions">
        {erreurs.general ? <p className="w-full text-sm text-[var(--red-1)]" role="alert">{erreurs.general}</p> : null}
        <button type="submit" disabled={envoi} className="audit-bouton bouton-eclat rounded-[4px] px-5 py-2.5 transition disabled:opacity-60">
          {envoi ? "Enregistrement…" : "Enregistrer mon objectif"}
        </button>
        {annulable ? (
          <button type="button" onClick={onAnnuler} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Garder l&apos;objectif actuel
          </button>
        ) : null}
      </div>
    </form>
  );
}

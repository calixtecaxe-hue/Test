"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoixCases } from "@/components/choix-cases";
import { DELAI_MAX_MOIS, verifierVraisemblance, type ObjectifSaisie, type UniteAmpleur } from "@/lib/audit/objectif";
import { MAX_OBJECTIFS, phraseDe, quoiDeProposition, unitesDe } from "@/lib/audit/objectifs-agent";
import { lireNombre } from "@/lib/audit/nombre";
import type { ObjectifAgent, ObjectifPersonnel } from "@/lib/donnees/schemas";

const LIBELLES_UNITE: Record<UniteAmpleur, string> = { pourcent: "En pourcentage (%)", euros: "En euros (€)", unites: "En nombre" };
const PRECISION_UNITE: Record<UniteAmpleur, string> = { pourcent: "en %", euros: "en euros", unites: "en nombre" };

export type Propositions = { parties?: { nom: string; detail?: string }[]; personnel: ObjectifPersonnel; objectifs: ObjectifAgent[] };

// Ce que le dirigeant précise pour un objectif : un chiffre (et son unité), ou ce qu'il veut constater ; et le délai.
type Precision = { combien: string; unite: UniteAmpleur; sansChiffre: boolean; reussite: string; delai: string };
// Un objectif en cours de saisie : une proposition de la liste OU un objectif écrit par le dirigeant, jamais les deux. Le
// brouillon de chaque mode est gardé quand le dirigeant passe de l'un à l'autre : rien n'est effacé ni remplacé en silence.
type Emplacement = {
  cle: string;
  mode: "proposition" | "personnel" | null;
  choix: string | null;
  propositions: Record<string, Precision>;
  personnel: Precision & { texte: string };
};

const VIDE: Precision = { combien: "", unite: "pourcent", sansChiffre: true, reussite: "", delai: "" };
const precisionDe = (o: ObjectifAgent): Precision => ({ ...VIDE, unite: unitesDe(o)[0] ?? "pourcent", sansChiffre: o.mesure === "phrase" });
const precisionSaisie = (s: ObjectifSaisie): Precision => ({
  combien: s.ampleur ? String(s.ampleur.valeur).replace(".", ",") : "",
  unite: s.ampleur?.unite ?? "pourcent",
  sansChiffre: !s.ampleur,
  reussite: s.reussite ?? "",
  delai: String(s.delaiMois),
});

// Objectifs d'un agent dont l'objectif n'a pas forcément de chiffre (RH, Comm) : le dirigeant choisit une proposition ou
// définit son propre objectif (28 octobre), avec un chiffre s'il en a un, ou ce qu'il veut constater, et son délai. Il
// peut ajouter d'autres objectifs (décision du 27 octobre) ; quand la liste a des parties (Comm), ils viennent tous de la
// même partie.
export function ObjectifChoix({
  agent,
  propositions,
  facteurAnnuelMax,
  annulable,
  onAnnuler,
  onEnregistre,
  initiaux,
}: {
  agent: string;
  propositions: Propositions;
  facteurAnnuelMax: number;
  annulable?: boolean;
  onAnnuler?: () => void;
  onEnregistre?: () => void;
  // Objectifs en cours, repris pour être modifiés.
  initiaux?: ObjectifSaisie[];
}) {
  const router = useRouter();
  const id = useId();
  const parties = propositions.parties ?? [];
  const enParties = parties.length > 0;
  const proposition = (choix: string | null) => (choix ? propositions.objectifs.find((o) => o.id === choix) : undefined);
  // Clé d'un emplacement ajouté (appelée seulement depuis un bouton).
  const nouvelleCle = () => `e${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

  const [emplacements, setEmplacements] = useState<Emplacement[]>(() => {
    const repris = (initiaux ?? []).map((s, k): Emplacement => {
      const o = proposition(s.choix ?? null);
      return o
        ? { cle: `i${k}`, mode: "proposition", choix: o.id, propositions: { [o.id]: precisionSaisie(s) }, personnel: { ...VIDE, texte: "" } }
        : { cle: `i${k}`, mode: "personnel", choix: null, propositions: {}, personnel: { ...precisionSaisie(s), texte: s.quoi } };
    });
    return repris.length > 0 ? repris : [{ cle: "e0", mode: null, choix: null, propositions: {}, personnel: { ...VIDE, texte: "" } }];
  });
  const [ouvert, setOuvert] = useState<string | null>(() => ((initiaux ?? []).length > 1 ? null : (initiaux ?? []).length === 1 ? "i0" : "e0"));
  const [partie, setPartie] = useState<string | null>(() => {
    if (!enParties) return null;
    const s = (initiaux ?? []).find((x) => x.partie || proposition(x.choix ?? null)?.groupe);
    return s ? (proposition(s.choix ?? null)?.groupe ?? s.partie ?? null) : null;
  });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  // Le champ qui vient de s'ouvrir (objectif personnel, emplacement ajouté, champ à corriger) reçoit le focus et se montre,
  // une fois l'écran mis à jour.
  const [focus, setFocus] = useState<{ cible: string; fois: number } | null>(null);
  const setAFocaliser = (cible: string) => setFocus((f) => ({ cible, fois: (f?.fois ?? 0) + 1 }));
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(focus.cible);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  }, [focus]);

  const effacerErreurs = (prefixe: string) => setErreurs((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith(prefixe) && k !== "general")));
  const majEmplacement = (cle: string, f: (e: Emplacement) => Emplacement) => setEmplacements((l) => l.map((e) => (e.cle === cle ? f(e) : e)));

  function choisirProposition(cle: string, o: ObjectifAgent) {
    majEmplacement(cle, (e) => ({ ...e, mode: "proposition", choix: o.id, propositions: e.propositions[o.id] ? e.propositions : { ...e.propositions, [o.id]: precisionDe(o) } }));
    effacerErreurs(`${cle}.`);
  }
  function choisirPersonnel(cle: string, focaliser = false) {
    majEmplacement(cle, (e) => ({ ...e, mode: "personnel" }));
    effacerErreurs(`${cle}.`);
    if (focaliser) setAFocaliser(`${id}-${cle}-texte`);
  }
  function majPrecision(cle: string, champ: Partial<Precision & { texte: string }>, erreur: string) {
    majEmplacement(cle, (e) => {
      if (e.mode === "personnel") return { ...e, personnel: { ...e.personnel, ...champ } };
      if (e.mode === "proposition" && e.choix) return { ...e, propositions: { ...e.propositions, [e.choix]: { ...e.propositions[e.choix], ...champ } } };
      return e;
    });
    setErreurs((x) => (`${cle}.${erreur}` in x ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== `${cle}.${erreur}`)) : x));
  }
  function ajouterEmplacement() {
    if (emplacements.length >= MAX_OBJECTIFS) return;
    const cle = nouvelleCle();
    setEmplacements((l) => [...l, { cle, mode: null, choix: null, propositions: {}, personnel: { ...VIDE, texte: "" } }]);
    setOuvert(cle);
    setAFocaliser(`${id}-${cle}-legende`);
  }
  function retirerEmplacement(cle: string) {
    const restants = emplacements.filter((e) => e.cle !== cle);
    if (restants.length === 0) {
      setEmplacements([{ cle: "e0", mode: null, choix: null, propositions: {}, personnel: { ...VIDE, texte: "" } }]);
      setOuvert("e0");
    } else {
      setEmplacements(restants);
      // Un seul objectif restant : il s'ouvre ; sinon l'objectif retiré, s'il était ouvert, laisse les autres repliés.
      if (restants.length === 1) setOuvert(restants[0].cle);
      else if (ouvert === cle) setOuvert(null);
    }
    effacerErreurs(`${cle}.`);
  }
  // Une autre partie de la liste (Comm) : seulement si aucun autre objectif n'est une proposition de la partie actuelle.
  const autresPropositions = (cle: string | null) => emplacements.filter((e) => e.cle !== cle && e.mode === "proposition");
  function changerPartie(nom: string) {
    if (nom === partie) return;
    if (autresPropositions(ouvert).length > 0) {
      setErreurs((x) => ({ ...x, partie: `Vos autres objectifs sont dans « ${partie} ». Retirez-les d'abord pour choisir dans « ${nom} ».` }));
      return;
    }
    setPartie(nom);
    // L'objectif ouvert quitte sa proposition (son brouillon reste gardé) ; un objectif personnel reste tel quel.
    if (ouvert) majEmplacement(ouvert, (e) => (e.mode === "proposition" ? { ...e, mode: null, choix: null } : e));
    setErreurs((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== "partie")));
  }

  // La précision active d'un emplacement (celle du mode choisi).
  const precisionActive = (e: Emplacement): (Precision & { texte?: string }) | null =>
    e.mode === "personnel" ? e.personnel : e.mode === "proposition" && e.choix ? e.propositions[e.choix] ?? null : null;

  // La saisie d'un objectif, telle qu'elle part (ou null si un champ manque). Seul le mode actif est transmis.
  function saisieDe(e: Emplacement): ObjectifSaisie | null {
    const p = precisionActive(e);
    if (!p) return null;
    const o = e.mode === "proposition" ? proposition(e.choix) : undefined;
    const quoi = o ? quoiDeProposition(o) : e.personnel.texte.trim();
    const valeur = lireNombre(p.combien);
    const mois = lireNombre(p.delai);
    if (quoi.length < 3 || mois === null || !Number.isInteger(mois) || mois < 1 || mois > DELAI_MAX_MOIS) return null;
    if (!p.sansChiffre && (valeur === null || valeur <= 0)) return null;
    if (p.sansChiffre && p.reussite.trim().length < 3) return null;
    const part = o?.groupe ?? (enParties ? partie ?? undefined : undefined);
    return {
      quoi,
      ...(!p.sansChiffre && valeur !== null ? { ampleur: { valeur, unite: o?.gabarit ? unitesDe(o)[0] : p.unite } } : { reussite: p.reussite.trim() }),
      delaiMois: mois,
      ...(o ? { choix: o.id } : {}),
      ...(part ? { partie: part } : {}),
    };
  }

  function verifier(): Record<string, string> {
    const manques: Record<string, string> = {};
    // Comm : sans partie choisie, aucune proposition n'est encore affichée ; c'est par là qu'il faut commencer.
    if (enParties && !partie && emplacements.every((e) => e.mode !== "personnel")) {
      manques.partie = "Choisissez d'abord où vous en êtes, puis une proposition ou votre propre objectif.";
      return manques;
    }
    const seul = emplacements.length === 1;
    for (const e of emplacements) {
      const p = precisionActive(e);
      if (!p) {
        manques[`${e.cle}.choix`] = seul ? "Choisissez une proposition ou décrivez votre propre objectif." : "Choisissez un objectif ici, ou retirez cet emplacement.";
        continue;
      }
      const o = e.mode === "proposition" ? proposition(e.choix) : undefined;
      const valeur = lireNombre(p.combien);
      const mois = lireNombre(p.delai);
      if (e.mode === "personnel" && e.personnel.texte.trim().length < 3) manques[`${e.cle}.texte`] = "Décrivez votre objectif en quelques mots pour continuer.";
      if (!p.sansChiffre && (valeur === null || valeur <= 0)) manques[`${e.cle}.ampleur`] = "Indiquez un nombre supérieur à zéro, ou choisissez « Je n'ai pas de chiffre ».";
      if (p.sansChiffre && p.reussite.trim().length < 3) manques[`${e.cle}.reussite`] = "Décrivez ce que vous voulez constater quand ce sera atteint.";
      if (mois === null || !Number.isInteger(mois) || mois < 1) manques[`${e.cle}.delaiMois`] = "Indiquez en combien de mois, avec un nombre entier.";
      else if (mois > DELAI_MAX_MOIS) manques[`${e.cle}.delaiMois`] = `Le délai ne dépasse pas ${DELAI_MAX_MOIS} mois (10 ans).`;
      const s = saisieDe(e);
      if (s && !o?.gabarit && !Object.keys(manques).some((k) => k.startsWith(`${e.cle}.`))) {
        const v = verifierVraisemblance(s, facteurAnnuelMax);
        if (!v.ok) manques[`${e.cle}.${v.champ}`] = v.message;
      }
    }
    return manques;
  }

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault();
    const manques = verifier();
    if (Object.keys(manques).length > 0) {
      setErreurs({ ...manques, general: "Complétez ce qui est signalé pour continuer." });
      const premiere = emplacements.find((e) => Object.keys(manques).some((k) => k.startsWith(`${e.cle}.`)));
      if (manques.partie) setAFocaliser(`${id}-partie-legende`);
      else if (premiere) {
        setOuvert(premiere.cle);
        const champ = Object.keys(manques).find((k) => k.startsWith(`${premiere.cle}.`))!.split(".")[1];
        setAFocaliser(champ === "choix" ? `${id}-${premiere.cle}-legende` : `${id}-${premiere.cle}-${champ}`);
      }
      return;
    }
    setEnvoi(true);
    const objectifs = emplacements.map(saisieDe);
    const r = await fetch("/api/audit/objectif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, objectifs }),
    }).catch(() => null);
    if (r?.ok) {
      onEnregistre?.();
      router.refresh();
      return;
    }
    const corps = (await r?.json().catch(() => null)) as { erreur?: string; champ?: string; rang?: number } | null;
    const visee = corps?.rang !== undefined ? emplacements[corps.rang] : undefined;
    const cle = visee && corps?.champ ? `${visee.cle}.${corps.champ === "quoi" ? "texte" : corps.champ}` : "general";
    if (visee) setOuvert(visee.cle);
    setErreurs({ [cle]: corps?.erreur ?? "Vos objectifs n'ont pas pu être enregistrés. Réessayez.", ...(cle !== "general" ? { general: "Complétez ce qui est signalé pour continuer." } : {}) });
    setEnvoi(false);
  }

  const plusieurs = emplacements.length > 1;
  const visibles = (g: string | null) => propositions.objectifs.filter((o) => !enParties || (o.groupe ?? "") === g);
  const lien = "audit-lien w-fit text-left text-sm text-[var(--agent)] hover:underline";
  const erreur = (cle: string) => (erreurs[cle] ? <p className="text-sm text-[var(--red-1)]" id={`${id}-${cle.replace(".", "-")}-erreur`}>{erreurs[cle]}</p> : null);
  const ouvertEmplacement = emplacements.find((e) => e.cle === ouvert) ?? null;

  // Les champs d'un objectif choisi : le chiffre (et son unité) ou ce que le dirigeant veut constater, puis le délai.
  function rendreChamps(e: Emplacement, o: ObjectifAgent | undefined) {
    const p = precisionActive(e)!;
    const base = `${id}-${e.cle}`;
    const err = (c: string) => erreurs[`${e.cle}.${c}`];
    const s = saisieDe(e);
    const unites: UniteAmpleur[] = o ? unitesDe(o) : ["pourcent", "euros", "unites"];
    const peutChiffrer = !o || o.mesure === "chiffre";
    return (
      <div className="objectif-champs" data-detail data-objectif={o?.id ?? "personnel"}>
        {!o ? (
          <div className="champ-groupe">
            <label htmlFor={`${base}-texte`} className="champ-etiquette">Décrivez votre objectif</label>
            <p id={`${base}-texte-aide`} className="text-sm text-[var(--text-muted)]">
              {propositions.personnel.aide} Exemple : {propositions.personnel.exemple}.
            </p>
            <input
              id={`${base}-texte`}
              type="text"
              value={e.personnel.texte}
              onChange={(x) => majPrecision(e.cle, { texte: x.target.value }, "texte")}
              maxLength={160}
              className="champ-saisie"
              aria-describedby={`${base}-texte-aide${err("texte") ? ` ${id}-${e.cle}-texte-erreur` : ""}`}
              aria-invalid={err("texte") ? true : undefined}
            />
            {erreur(`${e.cle}.texte`)}
          </div>
        ) : null}

        {!p.sansChiffre ? (
          <>
            <div className="champ-groupe">
              <label htmlFor={`${base}-ampleur`} className="champ-etiquette">
                {o?.gabarit ? o.question : unites.length === 1 ? `De combien, ${PRECISION_UNITE[unites[0]]} ?` : "De combien ?"}
              </label>
              <input
                id={`${base}-ampleur`}
                type="text"
                inputMode="decimal"
                value={p.combien}
                onChange={(x) => majPrecision(e.cle, { combien: x.target.value }, "ampleur")}
                className="champ-saisie sm:max-w-[16rem]"
                aria-invalid={err("ampleur") ? true : undefined}
                aria-describedby={err("ampleur") ? `${id}-${e.cle}-ampleur-erreur` : undefined}
              />
              {erreur(`${e.cle}.ampleur`)}
            </div>
            {!o?.gabarit && unites.length > 1 ? (
              <div className="champ-groupe">
                <span className="champ-etiquette">Unité du chiffre</span>
                <ChoixCases nom={`${base}-unite`} type="radio" legende="Unité du chiffre" options={unites.map((u) => ({ valeur: u, libelle: LIBELLES_UNITE[u] }))} valeurs={[p.unite]} onChange={(v) => majPrecision(e.cle, { unite: v[0] as UniteAmpleur }, "ampleur")} />
              </div>
            ) : null}
            <button type="button" onClick={() => majPrecision(e.cle, { sansChiffre: true }, "ampleur")} className={lien} data-sans-chiffre>
              Je n&apos;ai pas de chiffre : je décris ce que je veux constater
            </button>
          </>
        ) : (
          <>
            <div className="champ-groupe">
              <label htmlFor={`${base}-reussite`} className="champ-etiquette">Comment saurez-vous que c&apos;est atteint ?</label>
              <input
                id={`${base}-reussite`}
                type="text"
                value={p.reussite}
                onChange={(x) => majPrecision(e.cle, { reussite: x.target.value }, "reussite")}
                placeholder={`Ex. : ${o?.exemple.reussite ?? propositions.personnel.exempleReussite}`}
                maxLength={200}
                className="champ-saisie"
                aria-invalid={err("reussite") ? true : undefined}
                aria-describedby={err("reussite") ? `${id}-${e.cle}-reussite-erreur` : undefined}
              />
              {erreur(`${e.cle}.reussite`)}
            </div>
            {peutChiffrer ? (
              <button type="button" onClick={() => majPrecision(e.cle, { sansChiffre: false }, "reussite")} className={lien} data-avec-chiffre>
                J&apos;ai un chiffre : je le renseigne
              </button>
            ) : null}
          </>
        )}

        <div className="champ-groupe">
          <label htmlFor={`${base}-delaiMois`} className="champ-etiquette">
            En combien de temps ? <span className="font-normal text-[var(--text-muted)]">(en mois)</span>
          </label>
          <input
            id={`${base}-delaiMois`}
            type="text"
            inputMode="numeric"
            value={p.delai}
            onChange={(x) => majPrecision(e.cle, { delai: x.target.value }, "delaiMois")}
            placeholder={`Ex. : ${o?.exemple.delaiMois ?? 6}`}
            className="champ-saisie sm:max-w-[16rem]"
            aria-invalid={err("delaiMois") ? true : undefined}
            aria-describedby={err("delaiMois") ? `${id}-${e.cle}-delaiMois-erreur` : undefined}
          />
          {erreur(`${e.cle}.delaiMois`)}
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

  // Une carte de la liste : un choix, avec un titre court, une précision quand elle aide, et l'état « Choisi » écrit.
  function rendreCarte({ e, valeur, titre, detail, choisie, desactivee, perso, onChoisir }: { e: Emplacement; valeur: string; titre: string; detail?: string; choisie: boolean; desactivee?: string; perso?: boolean; onChoisir: () => void }) {
    const o = perso ? undefined : proposition(valeur);
    return (
      <li key={valeur} className={`objectif-carte${choisie ? " choisie" : ""}${perso ? " objectif-perso" : ""}${desactivee ? " desactivee" : ""}`} data-carte={valeur}>
        <label className="objectif-carte-tete">
          <input type="radio" name={`${id}-${e.cle}`} value={valeur} checked={choisie} disabled={desactivee !== undefined} onChange={onChoisir} className="case-entree" />
          <span className="objectif-marque" aria-hidden="true">
            {choisie ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            ) : perso ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            ) : null}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="objectif-titre">{titre}</span>
            {detail ? <span className="text-sm text-[var(--text-muted)]">{detail}</span> : null}
            {desactivee ? <span className="text-xs text-[var(--text-muted)]">{desactivee}</span> : null}
          </span>
          {choisie ? <span className="objectif-pastille">Choisi</span> : null}
        </label>
        {choisie ? rendreChamps(e, o) : null}
      </li>
    );
  }

  return (
    <form onSubmit={envoyer} noValidate className="mt-6 flex flex-col gap-6" data-objectif-choix>
      {enParties ? (
        <fieldset className="flex flex-col gap-3" data-parties>
          <legend id={`${id}-partie-legende`} tabIndex={-1} className="champ-etiquette mb-2">Où en êtes-vous ?</legend>
          <ul className="objectif-cartes objectif-parties">
            {parties.map((pt) => (
              <li key={pt.nom} className={`objectif-carte${partie === pt.nom ? " choisie" : ""}`} data-partie={pt.nom}>
                <label className="objectif-carte-tete">
                  <input type="radio" name={`${id}-partie`} value={pt.nom} checked={partie === pt.nom} onChange={() => changerPartie(pt.nom)} className="case-entree" />
                  <span className="objectif-marque" aria-hidden="true">
                    {partie === pt.nom ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="objectif-titre">{pt.nom}</span>
                    {pt.detail ? <span className="text-sm text-[var(--text-muted)]">{pt.detail}</span> : null}
                  </span>
                  {partie === pt.nom ? <span className="objectif-pastille">Choisi</span> : null}
                </label>
              </li>
            ))}
          </ul>
          {erreur("partie")}
        </fieldset>
      ) : null}

      {!enParties || partie ? (
        <div className="flex flex-col gap-4">
          {emplacements.map((e, rang) => {
            const s = saisieDe(e);
            const o = e.mode === "proposition" ? proposition(e.choix) : undefined;
            if (e.cle !== ouvert) {
              // Objectif replié : sa phrase (ou ce qui reste à compléter), « Modifier » et « Retirer ».
              const titre = s ? phraseDe(s, o) : o ? o.libelle : e.mode === "personnel" ? e.personnel.texte.trim() || "Objectif personnel à décrire" : "Objectif à choisir";
              const incomplet = Object.keys(erreurs).some((k) => k.startsWith(`${e.cle}.`)) || !s;
              return (
                <div key={e.cle} className="objectif-resume" data-emplacement={e.cle} data-replie>
                  <p className="min-w-0 flex-1 text-[var(--text)]">
                    <span className="text-[var(--text-muted)]">Objectif {rang + 1}{e.mode === "personnel" ? " · personnel" : ""} : </span>
                    {titre}
                    {incomplet ? <span className="ml-2 text-sm text-[var(--red-1)]">à compléter</span> : null}
                  </p>
                  <div className="flex gap-4">
                    <button type="button" className={lien} onClick={() => setOuvert(e.cle)} aria-label={`Modifier l'objectif ${rang + 1}`}>Modifier</button>
                    <button type="button" className="ligne-retirer" onClick={() => retirerEmplacement(e.cle)} aria-label={`Retirer l'objectif ${rang + 1}`}>Retirer</button>
                  </div>
                </div>
              );
            }
            const autres = new Set(emplacements.filter((x) => x.cle !== e.cle && x.mode === "proposition").map((x) => x.choix));
            return (
              <fieldset key={e.cle} className="flex flex-col gap-3" data-emplacement={e.cle} aria-describedby={erreurs[`${e.cle}.choix`] ? `${id}-${e.cle}-choix-erreur` : undefined}>
                <legend id={`${id}-${e.cle}-legende`} tabIndex={-1} className={plusieurs ? "champ-etiquette mb-2" : "sr-only"}>
                  {plusieurs ? `Objectif ${rang + 1}` : "Votre objectif"}
                </legend>
                {plusieurs ? (
                  <button type="button" className="ligne-retirer w-fit" onClick={() => retirerEmplacement(e.cle)} aria-label={`Retirer l'objectif ${rang + 1}`}>
                    Retirer cet objectif
                  </button>
                ) : null}
                <p className="text-sm text-[var(--text-muted)]">
                  Rien ne correspond ?{" "}
                  <button type="button" className={lien} onClick={() => choisirPersonnel(e.cle, true)}>
                    Définir mon propre objectif
                  </button>
                </p>
                <ul className="objectif-cartes">
                  {visibles(partie).map((x) =>
                    rendreCarte({
                      e,
                      valeur: x.id,
                      titre: x.libelle,
                      detail: x.detail,
                      choisie: e.mode === "proposition" && e.choix === x.id,
                      desactivee: autres.has(x.id) ? "Déjà parmi vos objectifs" : undefined,
                      onChoisir: () => choisirProposition(e.cle, x),
                    }),
                  )}
                  {rendreCarte({ e, valeur: "personnel", titre: "Définir mon propre objectif", detail: "Écrivez-le avec vos mots.", choisie: e.mode === "personnel", perso: true, onChoisir: () => choisirPersonnel(e.cle, true) })}
                </ul>
                {erreur(`${e.cle}.choix`)}
              </fieldset>
            );
          })}

          {ouvertEmplacement?.mode || (!ouvert && emplacements.length < MAX_OBJECTIFS) ? (
            emplacements.length < MAX_OBJECTIFS ? (
              <button type="button" onClick={ajouterEmplacement} className={`${lien} mt-1`} data-ajouter>
                + Ajouter un autre objectif
              </button>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">{MAX_OBJECTIFS} objectifs au plus.</p>
            )
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Choisissez d&apos;abord où vous en êtes : les propositions s&apos;afficheront ensuite.</p>
      )}

      <div className="objectif-actions">
        {erreurs.general ? <p className="w-full text-sm text-[var(--red-1)]" role="alert">{erreurs.general}</p> : null}
        <button type="submit" disabled={envoi} className="audit-bouton bouton-eclat rounded-[4px] px-5 py-2.5 transition disabled:opacity-60">
          {envoi ? "Enregistrement…" : plusieurs ? "Enregistrer mes objectifs" : "Enregistrer mon objectif"}
        </button>
        {annulable ? (
          <button type="button" onClick={onAnnuler} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            {initiaux && initiaux.length > 1 ? "Garder mes objectifs actuels" : "Garder l'objectif actuel"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

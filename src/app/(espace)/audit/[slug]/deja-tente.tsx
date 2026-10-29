"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChoixCases } from "@/components/choix-cases";
import type { DejaTente as Definition } from "@/lib/donnees/schemas";
import type { Tentatives } from "@/lib/audit/tentatives";
import { HORS_LIGNE } from "./enregistrer";

type Etat = "repos" | "enregistrement" | "enregistre" | "attente" | "erreur";

// Réponse d'un objectif remplacé, proposée sous le nouvel objectif : jamais reprise sans l'accord du dirigeant.
export type ReprisePossible = { objectifId: string; phrase: string; resume: string; valeur: Tentatives };

// « Qu'avez-vous déjà essayé pour atteindre cet objectif ? » (décisions du 29 octobre ; textes dans data/deja-tente.json),
// juste sous l'objectif, rattachée à cet objectif précis. Une zone de texte, ou « Je n'ai encore rien essayé » ; deux
// précisions facultatives. Sauvegarde continue : le texte part quand le dirigeant s'arrête d'écrire ou quitte le champ, un choix
// tout de suite ; sans réseau, la réponse attend dans la page et repart seule au retour de la connexion.
export function DejaTente({ objectifId, def, initiales, reprise, pour }: { objectifId: string; def: Definition; initiales: Tentatives | null; reprise: ReprisePossible | null; pour?: string }) {
  const id = useId();
  const [rien, setRien] = useState(initiales?.etat === "rien");
  const [texte, setTexte] = useState(initiales?.texte ?? "");
  const [resultat, setResultat] = useState<string | null>(initiales?.etat === "essaye" ? initiales.resultat : null);
  const [duree, setDuree] = useState<string | null>(initiales?.etat === "essaye" ? initiales.duree : null);
  const [repondu, setRepondu] = useState(initiales !== null);
  const [proposition, setProposition] = useState<ReprisePossible | null>(initiales === null ? reprise : null);
  const [etat, setEtat] = useState<Etat>("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const attente = useRef<{ valeur: Tentatives | null } | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renvoi = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reprisDe = useRef<string | undefined>(initiales?.reprisDe);

  async function envoyer(valeur: Tentatives | null, rapide = false): Promise<void> {
    const moi = { valeur };
    attente.current = moi;
    setEtat("enregistrement");
    setErreur(null);
    try {
      const r = await fetch("/api/audit/tentatives", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectifId, tentatives: valeur }), keepalive: rapide });
      // Une réponse plus récente a pris la place pendant l'envoi : c'est elle qui compte.
      if (attente.current !== moi) return;
      if (r.ok) {
        attente.current = null;
        setEtat("enregistre");
        return;
      }
      if (r.status >= 502 && r.status <= 504) throw new Error("réseau");
      const corps = (await r.json().catch(() => null)) as { erreur?: string } | null;
      attente.current = null;
      setEtat("erreur");
      setErreur(corps?.erreur ?? "Votre réponse n'a pas pu être enregistrée. Réessayez.");
    } catch {
      if (attente.current !== moi) return;
      setEtat("attente");
      if (renvoi.current) clearTimeout(renvoi.current);
      renvoi.current = setTimeout(() => { if (attente.current) void envoyer(attente.current.valeur); }, 5000);
    }
  }

  // Retour de la connexion : la réponse en attente repart ; page cachée : le texte en cours part ; quitter la page avec une
  // réponse en attente est signalé.
  useEffect(() => {
    const enLigne = () => { if (attente.current) void envoyer(attente.current.valeur); };
    const avantDepart = (e: BeforeUnloadEvent) => { if (attente.current) e.preventDefault(); };
    const cache = () => {
      if (document.visibilityState !== "hidden" || !minuteur.current) return;
      clearTimeout(minuteur.current);
      minuteur.current = null;
      if (attente.current) void envoyer(attente.current.valeur, true);
    };
    window.addEventListener("online", enLigne);
    window.addEventListener("beforeunload", avantDepart);
    document.addEventListener("visibilitychange", cache);
    return () => {
      window.removeEventListener("online", enLigne);
      window.removeEventListener("beforeunload", avantDepart);
      document.removeEventListener("visibilitychange", cache);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valeur = (v: { rien: boolean; texte: string; resultat: string | null; duree: string | null }): Tentatives =>
    v.rien
      ? { etat: "rien", ...(v.texte.trim() ? { texte: v.texte } : {}), ...(reprisDe.current ? { reprisDe: reprisDe.current } : {}) }
      : { etat: "essaye", texte: v.texte, resultat: v.resultat, duree: v.duree, ...(reprisDe.current ? { reprisDe: reprisDe.current } : {}) };

  function sauver(v: { rien: boolean; texte: string; resultat: string | null; duree: string | null }, immediat: boolean) {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    // Un texte vide, sans « rien essayé » ni précision : la question redevient sans réponse.
    const vide = !v.rien && v.texte.trim() === "" && v.resultat === null && v.duree === null;
    setRepondu(!vide);
    if (!vide) setProposition(null);
    const x = vide ? null : valeur(v);
    attente.current = { valeur: x };
    if (immediat) void envoyer(x);
    else minuteur.current = setTimeout(() => { minuteur.current = null; void envoyer(x); }, 1200);
  }
  function ecrire(t: string) {
    setTexte(t);
    // Écrire ce qui a été essayé retire « rien essayé ».
    const r = t.trim() !== "" ? false : rien;
    setRien(r);
    sauver({ rien: r, texte: t, resultat, duree }, false);
  }
  function quitterChamp() {
    if (!minuteur.current) return;
    clearTimeout(minuteur.current);
    minuteur.current = null;
    if (attente.current) void envoyer(attente.current.valeur);
  }
  function basculerRien(r: boolean) {
    setRien(r);
    sauver({ rien: r, texte, resultat, duree }, true);
  }
  function preciser(champ: "resultat" | "duree", v: string) {
    if (champ === "resultat") setResultat(v);
    else setDuree(v);
    sauver({ rien, texte, resultat: champ === "resultat" ? v : resultat, duree: champ === "duree" ? v : duree }, true);
  }
  function reprendre(p: ReprisePossible) {
    reprisDe.current = p.objectifId;
    const v = p.valeur;
    setRien(v.etat === "rien");
    setTexte(v.texte ?? "");
    setResultat(v.etat === "essaye" ? v.resultat : null);
    setDuree(v.etat === "essaye" ? v.duree : null);
    setProposition(null);
    setRepondu(true);
    void envoyer({ ...v, reprisDe: p.objectifId });
  }
  function effacer() {
    if (minuteur.current) clearTimeout(minuteur.current);
    reprisDe.current = undefined;
    setRien(false);
    setTexte("");
    setResultat(null);
    setDuree(null);
    setRepondu(false);
    void envoyer(null);
  }

  const options = (liste: { id: string; libelle: string }[]) => liste.map((o) => ({ valeur: o.id, libelle: o.libelle }));
  const precisionsOuvertes = resultat !== null || duree !== null;
  return (
    <section className="audit-entree mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6" style={{ "--d": "520ms" } as React.CSSProperties} aria-labelledby={`${id}-titre`} data-deja-tente data-objectif-id={objectifId}>
      <h2 id={`${id}-titre`} className="text-lg">
        <label htmlFor={`${id}-texte`}>{def.question}</label>
      </h2>
      {pour ? <p className="mt-1 text-sm text-[var(--text)]">Pour l&apos;objectif : {pour}</p> : null}
      <p className="mt-1 text-sm text-[var(--text-muted)]" id={`${id}-aide`}>{def.aide}</p>

      {proposition ? (
        <div className="mt-4 rounded-xl border border-[var(--line)] p-4" data-reprise-proposee>
          <p className="text-sm text-[var(--text-muted)]">{def.reprise.intro}</p>
          <p className="mt-1 text-sm text-[var(--text)]">« {proposition.resume} »</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Objectif précédent : {proposition.phrase}</p>
          <p className="mt-3 text-sm text-[var(--text)]">{def.reprise.question}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" className="bouton-secondaire rounded-[4px] px-4 py-2 text-sm" onClick={() => reprendre(proposition)}>
              {def.reprise.reprendre}
            </button>
            <button type="button" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => setProposition(null)}>
              {def.reprise.ignorer}
            </button>
          </div>
        </div>
      ) : null}

      <textarea
        id={`${id}-texte`}
        aria-describedby={`${id}-aide`}
        value={texte}
        onChange={(e) => ecrire(e.target.value)}
        onBlur={quitterChamp}
        rows={3}
        maxLength={def.longueurMax}
        className="champ-saisie mt-4 w-full"
        data-champ="texte"
      />
      <label className={`case-option mt-3${rien ? " choisie" : ""}`} data-champ="rien">
        <input type="checkbox" checked={rien} onChange={(e) => basculerRien(e.target.checked)} className="case-entree" />
        <span className="case-marque checkbox" aria-hidden="true">
          {rien ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          ) : null}
        </span>
        <span>{def.rien}</span>
      </label>

      {!rien && texte.trim() !== "" ? (
        <details className="mt-4" open={precisionsOuvertes} data-precisions>
          <summary className="cursor-pointer text-sm text-[var(--text)]">{def.precisions.titre}</summary>
          <p className="mt-3 text-sm text-[var(--text)]">{def.precisions.resultat.question}</p>
          <div className="mt-2" data-champ="resultat">
            <ChoixCases nom={`${id}-resultat`} type="radio" options={options(def.precisions.resultat.options)} valeurs={resultat ? [resultat] : []} onChange={(v) => preciser("resultat", v[0])} legende={def.precisions.resultat.question} />
          </div>
          <p className="mt-4 text-sm text-[var(--text)]">{def.precisions.duree.question}</p>
          <div className="mt-2" data-champ="duree">
            <ChoixCases nom={`${id}-duree`} type="radio" options={options(def.precisions.duree.options)} valeurs={duree ? [duree] : []} onChange={(v) => preciser("duree", v[0])} legende={def.precisions.duree.question} />
          </div>
        </details>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs" aria-live="polite">
        {etat === "enregistrement" ? <span className="text-[var(--text-muted)]">Enregistrement…</span> : null}
        {etat === "attente" ? <span className="etat-attente" role="status">{HORS_LIGNE}</span> : null}
        {etat === "enregistre" ? (
          <span className="etat-enregistre" role="status">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            Réponse enregistrée
          </span>
        ) : null}
        {erreur ? <span className="text-[var(--red-1)]">{erreur}</span> : null}
        {repondu ? (
          <button type="button" onClick={effacer} className="text-[var(--text-muted)] hover:text-[var(--text)]">Effacer ma réponse</button>
        ) : null}
      </div>
    </section>
  );
}

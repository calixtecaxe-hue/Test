"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChoixCases } from "@/components/choix-cases";
import type { DejaTente as Definition } from "@/lib/donnees/schemas";
import type { ActionTentee, Tentatives } from "@/lib/audit/tentatives";
import { HORS_LIGNE } from "./enregistrer";

type Etat = "repos" | "enregistrement" | "enregistre" | "attente" | "erreur";
const VIDE: ActionTentee = { quoi: "", resultat: null, duree: null };

// Ce que le dirigeant a déjà essayé pour atteindre l'objectif de cet agent (décision du 29 octobre ; textes dans
// data/deja-tente.json). Posée juste sous l'objectif, au début de l'agent ; facultative, comme toute question.
// Sauvegarde continue : un choix part tout de suite, un texte dès que le dirigeant s'arrête d'écrire ou quitte le champ.
// Sans réseau, la réponse attend dans la page et repart seule au retour de la connexion.
export function DejaTente({ agent, def, initiales }: { agent: string; def: Definition; initiales: Tentatives | null }) {
  const id = useId();
  const [deja, setDeja] = useState<"oui" | "non" | null>(initiales?.deja ?? null);
  const [actions, setActions] = useState<ActionTentee[]>(() => (initiales?.actions.length ? initiales.actions : [VIDE]));
  const [etat, setEtat] = useState<Etat>("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const attente = useRef<{ valeur: Tentatives | null } | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renvoi = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focus = useRef<number | null>(null);
  const champs = useRef<(HTMLTextAreaElement | null)[]>([]);

  async function envoyer(valeur: Tentatives | null, rapide = false): Promise<void> {
    attente.current = { valeur };
    setEtat("enregistrement");
    setErreur(null);
    try {
      const r = await fetch("/api/audit/tentatives", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent, tentatives: valeur }), keepalive: rapide });
      // Une réponse plus récente a pris la place pendant l'envoi : c'est elle qui compte.
      if (attente.current?.valeur !== valeur) return;
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
      if (attente.current?.valeur !== valeur) return;
      setEtat("attente");
      if (renvoi.current) clearTimeout(renvoi.current);
      renvoi.current = setTimeout(() => { if (attente.current) void envoyer(attente.current.valeur); }, 5000);
    }
  }

  // Retour de la connexion : la réponse en attente repart ; quitter la page avec une réponse en attente est signalé.
  useEffect(() => {
    const enLigne = () => { if (attente.current) void envoyer(attente.current.valeur); };
    const avantDepart = (e: BeforeUnloadEvent) => { if (attente.current) e.preventDefault(); };
    const cache = () => {
      if (document.visibilityState === "hidden" && minuteur.current) {
        clearTimeout(minuteur.current);
        minuteur.current = null;
        if (attente.current) void envoyer(attente.current.valeur, true);
      }
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

  // Le curseur va au champ ajouté, ou à celui qui prend la place d'une action retirée.
  useEffect(() => {
    if (focus.current === null) return;
    champs.current[focus.current]?.focus();
    focus.current = null;
  }, [actions.length]);

  const valeur = (d: "oui" | "non", a: ActionTentee[]): Tentatives => ({ deja: d, actions: a.filter((x, i) => i < def.action.max && (x.quoi.trim() !== "" || x.resultat !== null || x.duree !== null)) });

  function choisir(d: "oui" | "non") {
    setDeja(d);
    if (minuteur.current) clearTimeout(minuteur.current);
    void envoyer(valeur(d, actions));
  }
  function changer(i: number, champ: Partial<ActionTentee>, immediat: boolean) {
    const suivantes = actions.map((a, k) => (k === i ? { ...a, ...champ } : a));
    setActions(suivantes);
    if (!deja) return;
    if (minuteur.current) clearTimeout(minuteur.current);
    // Choix : tout de suite. Texte : quand le dirigeant s'arrête d'écrire (la sortie du champ l'envoie aussi).
    attente.current = { valeur: valeur(deja, suivantes) };
    if (immediat) void envoyer(valeur(deja, suivantes));
    else minuteur.current = setTimeout(() => void envoyer(valeur(deja, suivantes)), 1200);
  }
  function quitterChamp() {
    if (!minuteur.current || !deja) return;
    clearTimeout(minuteur.current);
    minuteur.current = null;
    void envoyer(valeur(deja, actions));
  }
  function ajouter() {
    if (actions.length >= def.action.max) return;
    focus.current = actions.length;
    setActions([...actions, VIDE]);
  }
  function retirer(i: number) {
    // La dernière action n'est pas retirée : elle est vidée.
    const suivantes = actions.length > 1 ? actions.filter((_, k) => k !== i) : [VIDE];
    focus.current = Math.min(i, suivantes.length - 1);
    setActions(suivantes);
    if (minuteur.current) clearTimeout(minuteur.current);
    if (deja) void envoyer(valeur(deja, suivantes));
    if (actions.length === 1) setTimeout(() => champs.current[0]?.focus(), 0);
  }
  function effacer() {
    if (minuteur.current) clearTimeout(minuteur.current);
    setDeja(null);
    setActions([VIDE]);
    void envoyer(null);
  }

  const options = (liste: { id: string; libelle: string }[]) => liste.map((o) => ({ valeur: o.id, libelle: o.libelle }));
  return (
    <section className="audit-entree mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6" style={{ "--d": "520ms" } as React.CSSProperties} aria-labelledby={`${id}-titre`} data-deja-tente>
      <h2 id={`${id}-titre`} className="text-lg">{def.question}</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{def.aide}</p>
      <div className="mt-4">
        <ChoixCases nom={`${id}-deja`} type="radio" options={options(def.reponses)} valeurs={deja ? [deja] : []} onChange={(v) => choisir(v[0] as "oui" | "non")} legende={def.question} />
      </div>

      {deja === "oui" ? (
        <ol className="mt-5 flex flex-col gap-5" data-actions>
          {actions.map((a, i) => (
            <li key={i} className="carte-imbriquee rounded-xl border border-[var(--line)] p-4" data-action={i + 1}>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={`${id}-quoi-${i}`} className="text-[var(--text)]">
                  {actions.length > 1 ? `${i + 1}. ` : ""}
                  {def.action.question}
                </label>
                <button type="button" className="ligne-retirer" onClick={() => retirer(i)} aria-label={`${def.action.retirer} l'action ${i + 1}`}>
                  {def.action.retirer}
                </button>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{def.action.aide}</p>
              <textarea
                id={`${id}-quoi-${i}`}
                ref={(el) => { champs.current[i] = el; }}
                value={a.quoi}
                onChange={(e) => changer(i, { quoi: e.target.value }, false)}
                onBlur={quitterChamp}
                rows={2}
                maxLength={def.action.longueurMax}
                className="champ-saisie mt-2 w-full"
                data-champ="quoi"
              />
              <p className="mt-4 text-sm text-[var(--text)]">{def.resultat.question}</p>
              <div className="mt-2" data-champ="resultat">
                <ChoixCases nom={`${id}-resultat-${i}`} type="radio" options={options(def.resultat.options)} valeurs={a.resultat ? [a.resultat] : []} onChange={(v) => changer(i, { resultat: v[0] }, true)} legende={`${def.resultat.question} (action ${i + 1})`} />
              </div>
              <p className="mt-4 text-sm text-[var(--text)]">{def.duree.question}</p>
              <div className="mt-2" data-champ="duree">
                <ChoixCases nom={`${id}-duree-${i}`} type="radio" options={options(def.duree.options)} valeurs={a.duree ? [a.duree] : []} onChange={(v) => changer(i, { duree: v[0] }, true)} legende={`${def.duree.question} (action ${i + 1})`} />
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {deja === "oui" && actions.length < def.action.max ? (
        <button type="button" onClick={ajouter} className="audit-kicker mt-4 text-sm hover:underline" data-ajouter>
          {def.action.ajouter}
        </button>
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
        {deja ? (
          <button type="button" onClick={effacer} className="text-[var(--text-muted)] hover:text-[var(--text)]">Effacer ma réponse</button>
        ) : null}
      </div>
    </section>
  );
}

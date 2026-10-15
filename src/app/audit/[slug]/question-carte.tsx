"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChoixCases } from "@/components/choix-cases";
import { formaterNombre, lireNombre } from "@/lib/audit/nombre";
import type { Reponse, Reponses } from "@/lib/audit/reponse";
import { construireReponse, saisieInitiale, type Saisie } from "@/lib/audit/saisie";
import { LIBELLE_UNITE, idsDeListe, type ChampNomme, type ChampSimple, type ReponseSpec } from "@/lib/donnees/reponse-spec";

export type QuestionClient = {
  code: string;
  libelle: string;
  texte: string | null;
  aide: string | null;
  repli: string | null;
  format: string | null;
  spec: ReponseSpec | null;
  quatreReponses: boolean;
  dejaPosee: boolean;
};

type Etat = "repos" | "enregistrement" | "enregistre" | "erreur";
type Mode = "reponse" | "inconnu" | "non_suivi";

// Libellés des options cochées au cadrage (D03, D22…), pour nommer les lignes d'un tableau.
export type LibellesLignes = Record<string, Record<string, string>>;

function suffixe(spec: ChampSimple): string {
  return spec.type === "nombre" ? LIBELLE_UNITE[spec.unite] : "";
}

// --- Un champ simple (cellule de tableau, champ d'une réponse composée) ----------------

function ChampCellule({ spec, valeur, onChange, onBlur, etiquette, id }: { spec: ChampSimple; valeur: string; onChange: (v: string) => void; onBlur: () => void; etiquette: string; id: string }) {
  if (spec.type === "choix" || spec.type === "oui_non") {
    const options = spec.type === "oui_non" ? [{ id: "oui", libelle: "Oui" }, { id: "non", libelle: "Non" }] : spec.options;
    return (
      <select id={id} aria-label={etiquette} value={valeur} onChange={(e) => { onChange(e.target.value); }} onBlur={onBlur} className="champ-saisie champ-cellule">
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.libelle}</option>
        ))}
      </select>
    );
  }
  if (spec.type === "date_mois") {
    return <input id={id} aria-label={etiquette} type="month" value={valeur} max={new Date().toISOString().slice(0, 7)} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className="champ-saisie champ-cellule" />;
  }
  const u = suffixe(spec);
  return (
    <span className="champ-avec-unite">
      <input
        id={id}
        aria-label={etiquette}
        type="text"
        inputMode={spec.type === "nombre" ? "decimal" : "text"}
        value={valeur}
        maxLength={spec.type === "texte" ? spec.max ?? 2000 : 40}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="champ-saisie champ-cellule"
      />
      {u ? <span className="champ-unite" aria-hidden="true">{u}</span> : null}
    </span>
  );
}

// --- Corps de la réponse selon la spécification ---

type PropsCorps = {
  q: QuestionClient;
  id: string;
  spec: ReponseSpec | null;
  saisie: Saisie;
  surSaisie: (s: Saisie) => void;
  setSaisie: (s: Saisie) => void;
  poser: (cle: string, v: string) => void;
  vider: () => void;
  lignesDeclencheur: (cle: string) => string[];
  elementsDeListe: (code: string) => string[];
  libellesLignes: LibellesLignes;
  lignesLibres: number;
  setLignesLibres: (n: number) => void;
};

function CorpsReponse({ q, id, spec, saisie, surSaisie, setSaisie, poser, vider, lignesDeclencheur, elementsDeListe, libellesLignes, lignesLibres, setLignesLibres }: PropsCorps) {
  const champs = saisie.champs ?? {};

  if (!spec) {
    return (
      <div className="champ-groupe mt-3">
        <label htmlFor={`${id}-texte`} className="champ-etiquette">Votre réponse</label>
        <textarea id={`${id}-texte`} value={saisie.texte ?? ""} onChange={(e) => surSaisie({ ...saisie, texte: e.target.value })} onBlur={vider} rows={2} maxLength={2000} className="champ-saisie" />
      </div>
    );
  }
  switch (spec.type) {
    case "nombre": {
      const u = LIBELLE_UNITE[spec.unite];
      const estimation = saisie.sous === "estimation";
      const retenue = !estimation && saisie.exact ? lireNombre(saisie.exact) : null;
      return (
        <>
          <div role="group" aria-label="Façon de répondre" className="reponse-choix mt-4">
            <button type="button" aria-pressed={!estimation} onClick={() => setSaisie({ ...saisie, sous: "exact" })} className={`reponse-bouton${!estimation ? " actif" : ""}`}>Chiffre exact</button>
            <button type="button" aria-pressed={estimation} onClick={() => setSaisie({ ...saisie, sous: "estimation" })} className={`reponse-bouton${estimation ? " actif" : ""}`}>Estimation</button>
          </div>
          {!estimation ? (
            <div className="champ-groupe mt-3">
              <label htmlFor={`${id}-exact`} className="champ-etiquette">Votre chiffre{u ? ` (${u})` : ""}</label>
              <input id={`${id}-exact`} type="text" inputMode="decimal" value={saisie.exact ?? ""} onChange={(e) => surSaisie({ ...saisie, sous: "exact", exact: e.target.value })} onBlur={vider} className="champ-saisie" />
              {retenue !== null ? <p className="champ-aide">Valeur retenue : {formaterNombre(retenue)}{u ? ` ${u}` : ""}</p> : null}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="champ-groupe">
                <label htmlFor={`${id}-min`} className="champ-etiquette">Entre{u ? ` (${u})` : ""}</label>
                <input id={`${id}-min`} type="text" inputMode="decimal" value={saisie.min ?? ""} onChange={(e) => surSaisie({ ...saisie, sous: "estimation", min: e.target.value })} onBlur={vider} className="champ-saisie" />
              </div>
              <div className="champ-groupe">
                <label htmlFor={`${id}-max`} className="champ-etiquette">Et</label>
                <input id={`${id}-max`} type="text" inputMode="decimal" value={saisie.max ?? ""} onChange={(e) => surSaisie({ ...saisie, sous: "estimation", max: e.target.value })} onBlur={vider} className="champ-saisie" />
              </div>
              <p className="champ-aide sm:col-span-2">Nous retenons le milieu de la fourchette, signalé comme estimé.</p>
            </div>
          )}
        </>
      );
    }
    case "oui_non":
      return (
        <div className="mt-3">
          <ChoixCases nom={`${id}-q`} type="radio" legende={q.texte ?? q.libelle} options={[{ valeur: "oui", libelle: "Oui" }, { valeur: "non", libelle: "Non" }]} valeurs={saisie.choix ? [saisie.choix] : []} onChange={(v) => surSaisie({ ...saisie, choix: v[0] })} />
        </div>
      );
    case "choix":
      return (
        <div className="mt-3">
          <ChoixCases nom={`${id}-q`} type="radio" legende={q.texte ?? q.libelle} options={spec.options.map((o) => ({ valeur: o.id, libelle: o.libelle }))} valeurs={saisie.choix ? [saisie.choix] : []} onChange={(v) => surSaisie({ ...saisie, choix: v[0] })} />
        </div>
      );
    case "cases":
      return (
        <div className="mt-3">
          <ChoixCases nom={`${id}-q`} type="checkbox" legende={q.texte ?? q.libelle} options={spec.options.map((o) => ({ valeur: o.id, libelle: o.libelle }))} valeurs={saisie.cases ?? []} onChange={(v) => surSaisie({ ...saisie, cases: v })} />
          {spec.minChoix || spec.maxChoix ? <p className="champ-aide mt-2">{spec.minChoix ? `Au moins ${spec.minChoix}` : ""}{spec.minChoix && spec.maxChoix ? ", " : ""}{spec.maxChoix ? `${spec.minChoix ? "" : "Jusqu'à "}${spec.maxChoix} au plus` : ""}.</p> : null}
        </div>
      );
    case "date_mois":
      return (
        <div className="champ-groupe mt-3">
          <label htmlFor={`${id}-mois`} className="champ-etiquette">Mois et année</label>
          <input id={`${id}-mois`} type="month" value={saisie.texte ?? ""} max={new Date().toISOString().slice(0, 7)} onChange={(e) => surSaisie({ ...saisie, texte: e.target.value })} onBlur={vider} className="champ-saisie" />
        </div>
      );
    case "texte":
      return (
        <div className="champ-groupe mt-3">
          <label htmlFor={`${id}-texte`} className="champ-etiquette">Votre réponse</label>
          <textarea id={`${id}-texte`} value={saisie.texte ?? ""} onChange={(e) => surSaisie({ ...saisie, texte: e.target.value })} onBlur={vider} rows={2} maxLength={spec.max ?? 2000} className="champ-saisie" />
        </div>
      );
    case "liste": {
      const elements = saisie.liste && saisie.liste.length > 0 ? saisie.liste : [""];
      const maj = (i: number, v: string) => surSaisie({ ...saisie, liste: elements.map((x, k) => (k === i ? v : x)) });
      return (
        <div className="mt-3 flex flex-col gap-2">
          {elements.map((el, i) => (
            <div key={i} className="champ-groupe">
              <label htmlFor={`${id}-el${i}`} className="sr-only">Élément {i + 1}</label>
              <input id={`${id}-el${i}`} type="text" value={el} maxLength={80} placeholder={`Élément ${i + 1}`} onChange={(e) => maj(i, e.target.value)} onBlur={vider} className="champ-saisie" />
            </div>
          ))}
          {elements.length < spec.max ? (
            <button type="button" onClick={() => setSaisie({ ...saisie, liste: [...elements, ""] })} className="audit-lien w-fit text-sm text-[var(--blue-1)] hover:underline">Ajouter un élément</button>
          ) : (
            <p className="champ-aide">{spec.max} éléments au plus.</p>
          )}
        </div>
      );
    }
    case "composite":
      return (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {spec.champs.map((c: ChampNomme) => (
            <div key={c.id} className="champ-groupe">
              <label htmlFor={`${id}-${c.id}`} className="champ-etiquette">{c.libelle}</label>
              <ChampCellule spec={c.spec} valeur={champs[c.id] ?? ""} onChange={(v) => poser(c.id, v)} onBlur={vider} etiquette={c.libelle} id={`${id}-${c.id}`} />
            </div>
          ))}
        </div>
      );
    case "tableau": {
      const libre = spec.lignes.source === "libre";
      let lignes: { id: string; libelle: string }[];
      if (spec.lignes.source === "fixe") lignes = spec.lignes.items;
      else if (spec.lignes.source === "declencheur") {
        const cle = spec.lignes.cle;
        lignes = lignesDeclencheur(cle).map((l) => ({ id: l, libelle: libellesLignes[cle]?.[l] ?? l }));
      } else if (spec.lignes.source === "donnee") {
        const elements = elementsDeListe(spec.lignes.code);
        const ids = idsDeListe(elements);
        lignes = elements.map((el, i) => ({ id: ids[i], libelle: el }));
      } else lignes = Array.from({ length: lignesLibres }, (_, i) => ({ id: String(i + 1), libelle: "" }));
      if (lignes.length === 0) {
        return <p className="mt-3 text-sm text-[var(--text-muted)]">Répondez d&apos;abord à la question dont dépendent les lignes de ce tableau (cadrage ou liste précédente).</p>;
      }
      const total = spec.total;
      const somme = total ? lignes.reduce((s, l) => s + (lireNombre(champs[`${l.id}.${total.colonne}`] ?? "") ?? 0), 0) : 0;
      return (
        <div className="mt-3">
          <div className="tableau-reponse" role="region" aria-label="Tableau de réponses" tabIndex={0}>
            <table style={{ minWidth: `${110 + spec.colonnes.length * 120}px` }}>
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Ligne</span></th>
                  {spec.colonnes.map((c) => (
                    <th key={c.id} scope="col">{c.libelle}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={l.id}>
                    <th scope="row">
                      {libre ? (
                        <input type="text" aria-label={`Nom de la ligne ${i + 1}`} placeholder={`Ligne ${i + 1}`} maxLength={80} value={champs[`${l.id}.nom`] ?? ""} onChange={(e) => poser(`${l.id}.nom`, e.target.value)} onBlur={vider} className="champ-saisie champ-cellule" />
                      ) : (
                        l.libelle
                      )}
                    </th>
                    {spec.colonnes.map((c) => (
                      <td key={c.id}>
                        <ChampCellule spec={c.spec} valeur={champs[`${l.id}.${c.id}`] ?? ""} onChange={(v) => poser(`${l.id}.${c.id}`, v)} onBlur={vider} etiquette={`${c.libelle}, ${libre ? `ligne ${i + 1}` : l.libelle}`} id={`${id}-${l.id}-${c.id}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {libre && spec.lignes.source === "libre" && lignesLibres < spec.lignes.max ? (
            <button type="button" onClick={() => setLignesLibres(lignesLibres + 1)} className="audit-lien mt-3 text-sm text-[var(--blue-1)] hover:underline">Ajouter une ligne</button>
          ) : null}
          {total ? (
            <p className="champ-aide mt-2" aria-live="polite">
              Total : {formaterNombre(somme)} sur {total.valeur}
            </p>
          ) : null}
        </div>
      );
    }
  }
}

// --- La carte d'une question ---------------------------------------------------------------

export function QuestionCarte({
  q,
  reponse,
  cadrage,
  libellesLignes,
  enregistrer,
}: {
  q: QuestionClient;
  reponse: Reponse | undefined;
  cadrage: Reponses;
  libellesLignes: LibellesLignes;
  enregistrer: (cle: string, r: Reponse | null, rapide?: boolean) => Promise<string | null>;
}) {
  const id = useId();
  const spec = q.spec;
  const [mode, setMode] = useState<Mode>(reponse?.genre === "inconnu" ? "inconnu" : reponse?.genre === "non_suivi" ? "non_suivi" : "reponse");
  const [saisie, setSaisie] = useState<Saisie>(() => saisieInitiale(spec, reponse as never));
  const [lignesLibres, setLignesLibres] = useState<number>(() => {
    if (spec?.type !== "tableau" || spec.lignes.source !== "libre" || reponse?.genre !== "valeurs") return 1;
    const n = Object.keys(reponse.valeurs).map((k) => Number(k.split(".")[0])).filter((x) => Number.isInteger(x));
    return Math.max(1, ...n);
  });
  const [etat, setEtat] = useState<Etat>("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Saisie en attente d'envoi (undefined : rien). Elle part dès que le champ perd le focus,
  // que l'onglet se cache ou que la question disparaît : rien n'est perdu en quittant la page.
  const attente = useRef<Reponse | null | undefined>(undefined);
  const enregistrerRef = useRef(enregistrer);
  useEffect(() => { enregistrerRef.current = enregistrer; });

  const lignesDeclencheur = (cle: string): string[] => {
    const r = cadrage[cle];
    return r?.genre === "saisie" && Array.isArray(r.valeur) ? r.valeur : [];
  };
  const elementsDeListe = (code: string): string[] => {
    const r = cadrage[code];
    return r?.genre === "saisie" && Array.isArray(r.valeur) ? r.valeur : [];
  };
  const ctx = { lignesDeclencheur, elementsDeListe };

  function vider() {
    if (attente.current === undefined) return;
    if (minuteur.current) clearTimeout(minuteur.current);
    const r = attente.current;
    attente.current = undefined;
    void enregistrerRef.current(q.code, r, true);
  }
  useEffect(() => {
    const cacher = () => { if (document.visibilityState === "hidden") vider(); };
    window.addEventListener("pagehide", vider);
    document.addEventListener("visibilitychange", cacher);
    return () => {
      window.removeEventListener("pagehide", vider);
      document.removeEventListener("visibilitychange", cacher);
      vider();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function envoyer(r: Reponse | null) {
    attente.current = undefined;
    setEtat("enregistrement");
    setErreur(null);
    const e = await enregistrer(q.code, r);
    if (e) {
      setEtat("erreur");
      setErreur(e);
    } else {
      setEtat("enregistre");
    }
  }

  function programmer(r: Reponse | null) {
    if (minuteur.current) clearTimeout(minuteur.current);
    attente.current = r;
    minuteur.current = setTimeout(() => envoyer(r), 600);
  }

  // Une saisie change : on la contrôle tout de suite ; si elle est valide, elle part après une courte pause.
  function surSaisie(nouvelle: Saisie) {
    setSaisie(nouvelle);
    setMode("reponse");
    const { reponse: r, erreur: e } = construireReponse(spec, nouvelle, ctx);
    if (e) {
      // Illisible ou hors bornes : on n'écrase pas la réponse déjà enregistrée, on l'explique.
      if (minuteur.current) clearTimeout(minuteur.current);
      attente.current = undefined;
      setErreur(e);
      return;
    }
    setErreur(null);
    programmer(r as Reponse | null);
  }

  function choisirMode(m: Mode) {
    if (minuteur.current) clearTimeout(minuteur.current);
    attente.current = undefined;
    if (m === mode) {
      // Un second clic sur le même bouton annule ce choix.
      setMode("reponse");
      void envoyer(null);
      return;
    }
    setMode(m);
    if (m === "inconnu" || m === "non_suivi") {
      setErreur(null);
      void envoyer({ genre: m });
    }
  }

  function effacer() {
    if (minuteur.current) clearTimeout(minuteur.current);
    attente.current = undefined;
    setMode("reponse");
    setSaisie(saisieInitiale(spec, undefined));
    setLignesLibres(1);
    setErreur(null);
    void envoyer(null);
  }

  const traitee = reponse !== undefined;
  const poser = (cle: string, v: string) => surSaisie({ ...saisie, champs: { ...(saisie.champs ?? {}), [cle]: v } });

  const reponseDonnee = mode === "reponse";
  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5" data-question={q.code} data-traitee={traitee ? "oui" : "non"}>
      <p className="text-[var(--text)]">{q.texte ?? q.libelle}</p>
      {q.texte === null ? <p className="mt-1 text-xs text-[var(--text-muted)]">Question à rédiger dans la banque · libellé du classeur · {q.code}</p> : null}
      {q.aide ? <p className="mt-1 text-sm text-[var(--text-muted)]">{q.aide}</p> : null}

      {q.dejaPosee ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Déjà renseigné avec un autre agent : repris ici, vous n&apos;avez pas à le saisir de nouveau.</p>
      ) : (
        <>
          {reponseDonnee ? <CorpsReponse q={q} id={id} spec={spec} saisie={saisie} surSaisie={surSaisie} setSaisie={setSaisie} poser={poser} vider={vider} lignesDeclencheur={lignesDeclencheur} elementsDeListe={elementsDeListe} libellesLignes={libellesLignes} lignesLibres={lignesLibres} setLignesLibres={setLignesLibres} /> : null}
          <div role="group" aria-label="Autres réponses" className="reponse-choix mt-4">
            <button type="button" aria-pressed={mode === "inconnu"} onClick={() => choisirMode("inconnu")} className={`reponse-bouton${mode === "inconnu" ? " actif" : ""}`}>Je ne sais pas</button>
            <button type="button" aria-pressed={mode === "non_suivi"} onClick={() => choisirMode("non_suivi")} className={`reponse-bouton${mode === "non_suivi" ? " actif" : ""}`}>Je ne suis pas cette donnée</button>
          </div>
          {mode === "inconnu" && q.repli ? <p className="mt-3 text-sm text-[var(--text-muted)]">{q.repli}</p> : null}
          {mode === "inconnu" && !q.repli ? <p className="mt-3 text-sm text-[var(--text-muted)]">Pas de souci : vous pourrez compléter cette donnée plus tard, elle n&apos;entre pas dans le calcul pour l&apos;instant.</p> : null}
          {mode === "non_suivi" ? <p className="mt-3 text-sm text-[var(--text-muted)]">Noté : cette donnée n&apos;est pas suivie dans votre entreprise. Le rapport vous dira comment commencer à la suivre.</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" aria-live="polite">
            {etat === "enregistrement" ? <span className="text-[var(--text-muted)]">Enregistrement…</span> : null}
            {etat === "enregistre" && !erreur ? <span className="text-[var(--text-muted)]">Enregistré</span> : null}
            {erreur ? <span className="text-[var(--red-1)]">{erreur}</span> : null}
            {traitee || mode !== "reponse" ? (
              <button type="button" onClick={effacer} className="text-[var(--text-muted)] hover:text-[var(--text)]">Effacer ma réponse</button>
            ) : null}
          </div>
        </>
      )}
    </li>
  );
}

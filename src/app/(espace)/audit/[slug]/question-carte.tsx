"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChoixCases } from "@/components/choix-cases";
import { HORS_LIGNE, enregistrerBrouillon, suivreRenvois } from "./enregistrer";
import { formaterNombre, lireNombre } from "@/lib/audit/nombre";
import type { Reponse, Reponses } from "@/lib/audit/reponse";
import { construireReponse, saisieInitiale, type Saisie } from "@/lib/audit/saisie";
import { ajouterLigne, groupesReglables, lignesInitiales, lignesRemplies, questionMeneuse, sansLigne, type GroupeLignes } from "@/lib/audit/lignes";
import { LIBELLE_UNITE, appliquerExclusives, idsDeListe, type ChampNomme, type ChampSimple, type ReponseSpec } from "@/lib/donnees/reponse-spec";

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
  // Total calculé d'après le détail déjà donné à d'autres agents : la question s'affiche déjà remplie.
  prereponse: { total: number; detail: string } | null;
  // Chiffre déjà enregistré d'après ce détail : il se met à jour si le détail change, tant que le dirigeant ne le corrige pas.
  preremplie?: string | null;
  // Réponse donnée pour un autre agent : où elle est enregistrée, et comment elle se modifie.
  source: ({ code: string; spec: ReponseSpec | null; agent: string } & LignesVenues) | null;
  // Tableau à total imposé : saisie partielle gardée sur le compte, restée sans réponse faute d'un total juste.
  brouillon?: Record<string, string> | null;
} & LignesVenues;

// Question où se règlent les lignes d'un tableau : sur cette page (ancre « #q-CODE ») ou dans l'audit d'un autre agent.
export type RenvoiLignes = { code: string; texte: string; ici: boolean; agent: string; question?: QuestionClient };
export type LignesVenues = {
  // Tableau qui reprend les lignes d'un autre (« chacune de ces offres ») : les questions qu'il suit (la première qui a une
  // réponse mène), et la colonne de celle-ci qui nomme chaque ligne.
  lignesSuivies?: { questions: RenvoiLignes[]; nom: string | null } | null;
  // Tableau dont les lignes viennent d'une autre réponse (canaux cochés, liste écrite) : où les ajouter ou les retirer.
  renvoiLignes?: RenvoiLignes | null;
  // Tableaux qui suivent les lignes de celui-ci : une ligne retirée ici l'est aussi chez eux.
  suiviPar?: { code: string; suit: string[] }[];
};

// attente : coupure du réseau, la réponse est gardée et repartira seule (enregistrer.ts).
type Etat = "repos" | "enregistrement" | "enregistre" | "erreur" | "attente";
type Mode = "reponse" | "inconnu" | "non_suivi";

// Libellés des options cochées au cadrage (D03, D22…), pour nommer les lignes d'un tableau.
export type LibellesLignes = Record<string, Record<string, string>>;

function suffixe(spec: ChampSimple): string {
  return spec.type === "nombre" ? LIBELLE_UNITE[spec.unite] : "";
}

// --- Un champ simple (cellule de tableau, champ d'une réponse composée) ----------------

function ChampCellule({ spec, valeur, onChange, onBlur, etiquette, id }: { spec: ChampSimple; valeur: string; onChange: (v: string) => void; onBlur: () => void; etiquette: string; id: string }) {
  // Oui / non : deux boutons, plus nets qu'un menu déroulant ; un second clic sur le bouton choisi efface la case.
  if (spec.type === "oui_non") {
    return (
      <div id={id} role="group" aria-label={etiquette} className="choix-cellule">
        {[{ id: "oui", libelle: "Oui" }, { id: "non", libelle: "Non" }].map((o) => (
          <button key={o.id} type="button" aria-pressed={valeur === o.id} onClick={() => onChange(valeur === o.id ? "" : o.id)} onBlur={onBlur}>
            {o.libelle}
          </button>
        ))}
      </div>
    );
  }
  if (spec.type === "choix") {
    const options = spec.options;
    return (
      <select id={id} aria-label={etiquette} value={valeur} onChange={(e) => { onChange(e.target.value); }} onBlur={onBlur} className="champ-saisie champ-cellule champ-select">
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
  lignes: LignesAffichees | null;
  ajouter: (groupe: number) => void;
  retirer: (groupe: number, ligne: string) => void;
  // La question d'où viennent les lignes, à répondre sur place tant que le tableau n'a pas de lignes.
  sourceEnLigne: React.ReactNode;
};

// Lignes d'un tableau réglable ou qui suit un autre tableau : groupes, lignes affichées par groupe, noms repris.
type LignesAffichees = { groupes: GroupeLignes[]; ids: string[][]; reglable: boolean; noms: Record<string, string>; meneuse: RenvoiLignes | null };

// Renvoi vers la question où se règlent les lignes.
function VersLaQuestion({ r }: { r: RenvoiLignes }) {
  return r.ici ? (
    <a href={`#q-${r.code}`} className="audit-lien ml-1 text-[var(--blue-1)] hover:underline">Aller à cette question</a>
  ) : null;
}
const citation = (r: RenvoiLignes) => `« ${r.texte} »${r.ici ? "" : `, dans l'audit ${r.agent}`}`;

function CorpsReponse({ q, id, spec, saisie, surSaisie, setSaisie, poser, vider, lignesDeclencheur, elementsDeListe, libellesLignes, lignes: reglage, ajouter, retirer, sourceEnLigne }: PropsCorps) {
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
          <ChoixCases nom={`${id}-q`} type="checkbox" legende={q.texte ?? q.libelle} options={spec.options.map((o) => ({ valeur: o.id, libelle: o.libelle }))} valeurs={saisie.cases ?? []} onChange={(v) => surSaisie({ ...saisie, cases: appliquerExclusives(spec.options, saisie.cases ?? [], v) })} />
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
      // Chaque ligne : son identifiant, son libellé (« Offre 2 »), le nom repris du tableau suivi, et son groupe.
      let lignes: { id: string; libelle: string; nom?: string; groupe?: number; rang?: number }[];
      if (reglage) {
        lignes = reglage.groupes.flatMap((g, gi) =>
          reglage.ids[gi].map((l, k) => ({ id: l, libelle: libre ? `Ligne ${k + 1}` : `${g.libelle} ${k + 1}`, nom: reglage.noms[l], groupe: gi, rang: k })),
        );
      } else if (spec.lignes.source === "fixe") lignes = spec.lignes.items;
      else if (spec.lignes.source === "declencheur") {
        const cle = spec.lignes.cle;
        lignes = lignesDeclencheur(cle).map((l) => ({ id: l, libelle: libellesLignes[cle]?.[l] ?? l }));
      } else if (spec.lignes.source === "donnee") {
        const elements = elementsDeListe(spec.lignes.code);
        const ids = idsDeListe(elements);
        lignes = elements.map((el, i) => ({ id: ids[i], libelle: el }));
      } else lignes = [];
      const renvoi = q.renvoiLignes ?? null;
      if (lignes.length === 0) {
        if (sourceEnLigne) {
          return (
            <div className="mt-3">
              <p className="text-sm text-[var(--text-muted)]">Les lignes de ce tableau viennent de la question ci-dessous. Répondez-y ici : le tableau s&apos;affiche aussitôt.</p>
              {sourceEnLigne}
            </div>
          );
        }
        return (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {renvoi ? <>Répondez d&apos;abord à {citation(renvoi)} : les lignes de ce tableau en viennent.<VersLaQuestion r={renvoi} /></> : <>Répondez d&apos;abord à la question dont dépendent les lignes de ce tableau (cadrage ou liste précédente).</>}
          </p>
        );
      }
      const total = spec.total;
      const somme = total ? lignes.reduce((s, l) => s + (lireNombre(champs[`${l.id}.${total.colonne}`] ?? "") ?? 0), 0) : 0;
      // Tableau qui suit un autre tableau sans réponse encore : il garde ses lignes, et le dit.
      const suivraPlusTard = q.lignesSuivies && !reglage?.meneuse ? q.lignesSuivies.questions.find((r) => r.ici) ?? null : null;
      return (
        <div className="mt-3">
          {sourceEnLigne}
          <div className={`tableau-reponse${sourceEnLigne ? " mt-4" : ""}`} role="region" aria-label="Tableau de réponses" tabIndex={0}>
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
                {lignes.map((l, i) => {
                  const nomLigne = libre ? champs[`${l.id}.nom`]?.trim() || l.libelle : l.libelle;
                  const retirable = reglage?.reglable && l.groupe !== undefined && reglage.ids[l.groupe].length > 1;
                  return (
                    <tr key={l.id} data-ligne={l.id}>
                      <th scope="row">
                        <div className="ligne-entete">
                          {libre ? (
                            <input type="text" aria-label={`Nom de la ligne ${i + 1}`} placeholder={l.libelle} maxLength={80} value={champs[`${l.id}.nom`] ?? ""} onChange={(e) => poser(`${l.id}.nom`, e.target.value)} onBlur={vider} className="champ-saisie champ-cellule" />
                          ) : (
                            <span>
                              {l.libelle}
                              {l.nom ? <span className="ligne-nom">{l.nom}</span> : null}
                            </span>
                          )}
                          {retirable ? (
                            <button type="button" className="ligne-retirer" aria-label={`Retirer la ligne « ${nomLigne} »`} onClick={() => retirer(l.groupe!, l.id)}>
                              Retirer
                            </button>
                          ) : null}
                        </div>
                      </th>
                      {spec.colonnes.map((c) => (
                        <td key={c.id}>
                          <ChampCellule spec={c.spec} valeur={champs[`${l.id}.${c.id}`] ?? ""} onChange={(v) => poser(`${l.id}.${c.id}`, v)} onBlur={vider} etiquette={`${c.libelle}, ${nomLigne}`} id={`${id}-${l.id}-${c.id}`} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {reglage?.reglable ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              {reglage.groupes.map((g, gi) =>
                reglage.ids[gi].length < g.max ? (
                  <button key={g.base || "libre"} type="button" onClick={() => ajouter(gi)} className="audit-lien text-sm text-[var(--blue-1)] hover:underline">
                    {libre ? "Ajouter une ligne" : `Ajouter « ${g.libelle} ${reglage.ids[gi].length + 1} »`}
                  </button>
                ) : (
                  <p key={g.base || "libre"} className="champ-aide">{g.max} lignes au plus{reglage.groupes.length > 1 ? ` pour « ${g.libelle} »` : ""}.</p>
                ),
              )}
            </div>
          ) : null}
          {reglage?.meneuse ? (
            <p className="champ-aide mt-2">Les lignes de ce tableau suivent votre réponse à {citation(reglage.meneuse)}. Pour ajouter ou retirer une ligne, modifiez cette réponse.<VersLaQuestion r={reglage.meneuse} /></p>
          ) : suivraPlusTard ? (
            <p className="champ-aide mt-2">Dès que vous aurez répondu à {citation(suivraPlusTard)}, ce tableau reprendra ses lignes.</p>
          ) : !reglage && renvoi ? (
            <p className="champ-aide mt-2">Les lignes de ce tableau viennent de votre réponse à {citation(renvoi)}. Pour ajouter ou retirer une ligne, modifiez cette réponse.<VersLaQuestion r={renvoi} /></p>
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

// Ce que dit une réponse déjà enregistrée, en une ligne.
export function resumeReponse(r: Reponse | undefined): string {
  if (!r) return "Pas encore de réponse.";
  switch (r.genre) {
    case "exact":
      return formaterNombre(r.valeur);
    case "estimation":
      return `Entre ${formaterNombre(r.min)} et ${formaterNombre(r.max)} (estimation)`;
    case "inconnu":
      return "« Je ne sais pas »";
    case "non_suivi":
      return "« Je ne suis pas cette donnée »";
    case "saisie":
      return Array.isArray(r.valeur) ? r.valeur.join(", ") : typeof r.valeur === "boolean" ? (r.valeur ? "Oui" : "Non") : r.valeur === "oui" ? "Oui" : r.valeur === "non" ? "Non" : r.valeur;
    case "valeurs": {
      const n = Object.values(r.valeurs).filter((v) => v !== null && v !== "").length;
      return `${n} valeur${n > 1 ? "s" : ""} renseignée${n > 1 ? "s" : ""}`;
    }
  }
}

// Donnée déjà posée pour un autre agent : reprise ici, jamais redemandée, mais modifiable.
export function CartePartagee({ q, reponse, onModifier }: { q: QuestionClient; reponse: Reponse | undefined; onModifier: () => void }) {
  return (
    <li id={`q-${q.code}`} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5" data-question={q.code} data-traitee="oui" data-partagee="oui">
      <p className="text-[var(--text)]">{q.texte ?? q.libelle}</p>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        Déjà renseigné pour l&apos;audit {q.source?.agent ?? "d'un autre agent"} : vous n&apos;avez pas à le saisir de nouveau.
      </p>
      <p className="mt-2 text-sm text-[var(--text)]">Votre réponse : {resumeReponse(reponse)}</p>
      <button type="button" onClick={onModifier} className="audit-lien mt-3 text-sm text-[var(--blue-1)] hover:underline">
        Modifier cette réponse
      </button>
    </li>
  );
}

// Un tableau dont le total est imposé (« 100 % ») ne s'enregistre comme réponse que lorsque le total est juste. En attendant, la saisie
// est gardée en brouillon sur le compte : elle suit le dirigeant d'un appareil à l'autre, et le calcul l'ignore.
const NOTE_BROUILLON = " Votre saisie est enregistrée sur votre compte : vous la retrouverez ici, sur cet appareil ou un autre, et elle sera prise en compte dès que le total sera juste.";

function contexteLignes(cadrage: Reponses) {
  const liste = (cle: string): string[] => {
    const r = cadrage[cle];
    return r?.genre === "saisie" && Array.isArray(r.valeur) ? r.valeur : [];
  };
  return { lignesDeclencheur: liste, elementsDeListe: liste };
}

export function QuestionCarte({
  q,
  reponse,
  cadrage,
  libellesLignes,
  enregistrer,
  partageAvec,
  onTerminer,
  ancre,
  imbriquee,
}: {
  // Question répondue dans la carte d'un tableau qui en dépend (sa liste, ses cases) : pas d'ancre ni de repère de page.
  imbriquee?: boolean;
  partageAvec?: string;
  // Code sous lequel la question est affichée (une donnée partagée s'enregistre sous le code de l'autre agent).
  ancre?: string;
  onTerminer?: () => void;
  q: QuestionClient;
  reponse: Reponse | undefined;
  cadrage: Reponses;
  libellesLignes: LibellesLignes;
  enregistrer: (cle: string, r: Reponse | null, rapide?: boolean, preremplie?: boolean) => Promise<string | null>;
}) {
  const id = useId();
  const spec = q.spec;
  const [mode, setMode] = useState<Mode>(reponse?.genre === "inconnu" ? "inconnu" : reponse?.genre === "non_suivi" ? "non_suivi" : "reponse");
  // Question pré-remplie d'après des réponses déjà données : le chiffre est enregistré tel quel
  // à l'affichage, le dirigeant le corrige s'il le souhaite.
  const [prerempli, setPrerempli] = useState<boolean>(() => (q.prereponse !== null && reponse === undefined && spec?.type === "nombre") || (!!q.preremplie && reponse?.genre === "exact"));
  // Phrase qui dit d'où vient le chiffre (détail déjà donné).
  const detailPrerempli = q.prereponse?.detail ?? q.preremplie ?? null;
  // Brouillon repris à l'affichage : seulement tant que le tableau n'a pas de réponse complète.
  const brouillonRepris = reponse === undefined && spec?.type === "tableau" && spec.total !== undefined && q.brouillon ? q.brouillon : null;
  const [saisie, setSaisie] = useState<Saisie>(() =>
    brouillonRepris ? { champs: brouillonRepris } : saisieInitiale(spec, (prerempli && q.prereponse ? { genre: "exact", valeur: q.prereponse.total } : reponse) as never)
  );
  // Lignes d'un tableau réglable (« Offre 1… », lignes libres) : celles qui ont une valeur, ou celles de la banque.
  const groupes = spec?.type === "tableau" ? groupesReglables(spec) : null;
  const [lignesPropres, setLignesPropres] = useState<string[][]>(() => (groupes ? lignesInitiales(groupes, saisie.champs ?? {}) : []));
  const [etat, setEtat] = useState<Etat>("repos");
  const [erreur, setErreur] = useState<string | null>(() => {
    if (!brouillonRepris) return null;
    const { erreur: e } = construireReponse(spec, { champs: brouillonRepris }, contexteLignes(cadrage));
    return e ? e + NOTE_BROUILLON : null;
  });
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Brouillon en attente d'envoi (undefined : rien) et indicateur « un brouillon existe sur le compte ».
  const minuteurBrouillon = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attenteBrouillon = useRef<Record<string, string> | undefined>(undefined);
  const brouillonSurLeCompte = useRef<boolean>(brouillonRepris !== null);
  // Saisie en attente d'envoi (undefined : rien). Elle part dès que le champ perd le focus,
  // que l'onglet se cache ou que la question disparaît : rien n'est perdu en quittant la page.
  const attente = useRef<Reponse | null | undefined>(undefined);
  const enregistrerRef = useRef(enregistrer);
  useEffect(() => { enregistrerRef.current = enregistrer; });
  const carte = useRef<HTMLLIElement>(null);

  // Réponse changée ailleurs sur la page (la même question répondue dans un tableau qui en dépend, une ligne retirée par le
  // tableau suivi) : la saisie la reprend, sauf pendant une saisie en cours dans cette carte. `vue` : dernière réponse connue
  // ici, envoyée par cette carte ou reçue.
  const vue = useRef<string>(JSON.stringify(reponse ?? null));
  useEffect(() => {
    const j = JSON.stringify(reponse ?? null);
    if (j === vue.current) return;
    vue.current = j;
    if (attente.current !== undefined || carte.current?.contains(document.activeElement)) return;
    const s = saisieInitiale(spec, reponse);
    // La réponse vient d'ailleurs : la saisie affichée la suit (une seule fois par changement, rien ne boucle).
    /* eslint-disable react-hooks/set-state-in-effect */
    setSaisie(s);
    setMode(reponse?.genre === "inconnu" ? "inconnu" : reponse?.genre === "non_suivi" ? "non_suivi" : "reponse");
    if (groupes) setLignesPropres(lignesInitiales(groupes, s.champs ?? {}));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [reponse, spec, groupes]);

  useEffect(() => {
    if (prerempli && q.prereponse) void envoyer({ genre: "exact", valeur: q.prereponse.total }, true);
    // Une seule fois, à l'affichage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lignesDeclencheur = (cle: string): string[] => {
    const r = cadrage[cle];
    return r?.genre === "saisie" && Array.isArray(r.valeur) ? r.valeur : [];
  };
  const elementsDeListe = (code: string): string[] => {
    const r = cadrage[code];
    return r?.genre === "saisie" && Array.isArray(r.valeur) ? r.valeur : [];
  };
  // Tableau qui suit les lignes d'un autre (« chacune de ces offres ») : tant que celui-ci a une réponse, ses lignes et leurs noms.
  const meneuse = q.lignesSuivies ? questionMeneuse(q.lignesSuivies.questions.map((r) => r.code), cadrage) : null;
  const valeursMeneuse = meneuse ? (cadrage[meneuse] as Extract<Reponse, { genre: "valeurs" }>).valeurs : null;
  const lignesSuivies = groupes && valeursMeneuse ? lignesInitiales(groupes, valeursMeneuse) : null;
  const idsAffiches = lignesSuivies ?? lignesPropres;
  const noms: Record<string, string> = {};
  if (valeursMeneuse && q.lignesSuivies?.nom) {
    for (const l of idsAffiches.flat()) {
      const n = valeursMeneuse[`${l}.${q.lignesSuivies.nom}`];
      if (typeof n === "string" && n.trim() !== "") noms[l] = n.trim();
    }
  }
  const reglage: LignesAffichees | null = groupes
    ? { groupes, ids: idsAffiches, reglable: lignesSuivies === null, noms, meneuse: q.lignesSuivies?.questions.find((r) => r.code === meneuse) ?? null }
    : null;
  // Tableau dont les lignes viennent d'une liste ou de cases posées sur cette page : tant qu'il n'a pas de lignes, la question se
  // répond ici ; ouverte, elle reste affichée jusqu'à « Terminer » (on peut écrire plusieurs catégories d'affilée).
  const sourceQuestion = q.renvoiLignes?.question ?? null;
  const lignesVides =
    spec?.type === "tableau" && (spec.lignes.source === "donnee" ? elementsDeListe(spec.lignes.code) : spec.lignes.source === "declencheur" ? lignesDeclencheur(spec.lignes.cle) : [""]).length === 0;
  const [sourceOuverte, setSourceOuverte] = useState(lignesVides && sourceQuestion !== null);
  const sourceEnLigne =
    sourceQuestion && (lignesVides || sourceOuverte) ? (
      <ul>
        <QuestionCarte
          q={sourceQuestion}
          reponse={cadrage[sourceQuestion.code]}
          cadrage={cadrage}
          libellesLignes={libellesLignes}
          enregistrer={enregistrer}
          imbriquee
          onTerminer={lignesVides ? undefined : () => setSourceOuverte(false)}
        />
      </ul>
    ) : null;
  const ctxAvec = (affichees: string[][] | null) => ({ lignesDeclencheur, elementsDeListe, ...(affichees ? { lignesAffichees: affichees.flat() } : {}) });
  const ctx = ctxAvec(groupes ? idsAffiches : null);
  const totalImpose = spec?.type === "tableau" && spec.total !== undefined;

  // La saisie en attente part tout de suite. En quittant le champ (`depart` faux), la carte le dit (« Enregistré ») ; en
  // quittant la page ou la question (`depart` vrai), l'envoi survit à la fermeture (keepalive) et rien n'est perdu.
  function vider(depart = false) {
    // Le brouillon part aussi en quittant la page.
    if (attenteBrouillon.current !== undefined) {
      if (minuteurBrouillon.current) clearTimeout(minuteurBrouillon.current);
      const b = attenteBrouillon.current;
      attenteBrouillon.current = undefined;
      void enregistrerBrouillon(q.code, b, true);
    }
    if (attente.current === undefined) return;
    if (minuteur.current) clearTimeout(minuteur.current);
    const r = attente.current;
    attente.current = undefined;
    vue.current = JSON.stringify(r ?? null);
    if (depart) void enregistrerRef.current(q.code, r, true);
    else void envoyer(r);
  }
  const quitter = () => vider(true);
  const quitterCache = () => { if (document.visibilityState === "hidden") vider(true); };
  useEffect(() => {
    window.addEventListener("pagehide", quitter);
    document.addEventListener("visibilitychange", quitterCache);
    return () => {
      window.removeEventListener("pagehide", quitter);
      document.removeEventListener("visibilitychange", quitterCache);
      vider(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function envoyer(r: Reponse | null, preremplie = false) {
    attente.current = undefined;
    vue.current = JSON.stringify(r ?? null);
    setEtat("enregistrement");
    setErreur(null);
    const e = await enregistrer(q.code, r, false, preremplie);
    if (e === HORS_LIGNE) {
      setEtat("attente");
    } else if (e) {
      setEtat("erreur");
      setErreur(e);
    } else {
      setEtat("enregistre");
    }
  }
  // Réponse gardée pendant une coupure, partie (ou refusée) au retour du réseau.
  useEffect(
    () =>
      suivreRenvois((cle, e) => {
        if (cle !== q.code) return;
        setEtat(e ? "erreur" : "enregistre");
        setErreur(e);
      }),
    [q.code],
  );

  function programmerBrouillon(champs: Record<string, string>) {
    if (minuteurBrouillon.current) clearTimeout(minuteurBrouillon.current);
    attenteBrouillon.current = champs;
    brouillonSurLeCompte.current = true;
    minuteurBrouillon.current = setTimeout(() => {
      attenteBrouillon.current = undefined;
      void enregistrerBrouillon(q.code, champs);
    }, 600);
  }

  function programmer(r: Reponse | null) {
    if (minuteur.current) clearTimeout(minuteur.current);
    attente.current = r;
    minuteur.current = setTimeout(() => envoyer(r), 600);
  }

  // Une saisie change : on la contrôle tout de suite ; si elle est valide, elle part après une courte pause.
  // `affichees` : lignes du tableau quand elles viennent de changer (ligne retirée), avant que l'écran ne les montre.
  function surSaisie(nouvelle: Saisie, affichees?: string[][]) {
    setPrerempli(false);
    setSaisie(nouvelle);
    setMode("reponse");
    const { reponse: r, erreur: e } = construireReponse(spec, nouvelle, affichees ? ctxAvec(affichees) : ctx);
    if (e) {
      // Illisible ou hors bornes : on n'écrase pas la réponse déjà enregistrée, on l'explique.
      if (minuteur.current) clearTimeout(minuteur.current);
      attente.current = undefined;
      if (totalImpose) {
        programmerBrouillon(nouvelle.champs ?? {});
        setErreur(e + NOTE_BROUILLON);
      } else setErreur(e);
      return;
    }
    // Saisie valide : la réponse part, et le brouillon devient inutile.
    if (minuteurBrouillon.current) clearTimeout(minuteurBrouillon.current);
    attenteBrouillon.current = undefined;
    if (brouillonSurLeCompte.current) {
      brouillonSurLeCompte.current = false;
      void enregistrerBrouillon(q.code, null);
    }
    setErreur(null);
    programmer(r as Reponse | null);
  }

  function choisirMode(m: Mode) {
    setPrerempli(false);
    if (minuteur.current) clearTimeout(minuteur.current);
    attente.current = undefined;
    if (m === mode) {
      // Un second clic sur le même bouton annule ce choix. Ce qui était saisi réapparaît : s'il est valide, on le garde
      // comme réponse (l'écran et l'enregistrement disent la même chose), sinon la question redevient sans réponse.
      setMode("reponse");
      const { reponse: gardee, erreur: e } = construireReponse(spec, saisie, ctx);
      setErreur(null);
      void envoyer(!e && gardee ? (gardee as Reponse) : null);
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
    if (groupes) setLignesPropres(lignesInitiales(groupes, {}));
    setPrerempli(false);
    setErreur(null);
    void envoyer(null);
  }

  const traitee = reponse !== undefined;
  const poser = (cle: string, v: string) => surSaisie({ ...saisie, champs: { ...(saisie.champs ?? {}), [cle]: v } });

  // Lignes employées par les tableaux qui suivent celui-ci : une ligne ajoutée prend un numéro neuf, jamais celui d'une
  // ligne retirée dont ils gardent encore les réponses.
  const suiveursMenes = (q.suiviPar ?? []).filter((f) => questionMeneuse(f.suit, cadrage) === q.code);
  function ajouter(gi: number) {
    if (!groupes) return;
    const employes = [...lignesRemplies(saisie.champs ?? {}), ...(q.suiviPar ?? []).flatMap((f) => {
      const r = cadrage[f.code];
      return r?.genre === "valeurs" ? [...lignesRemplies(r.valeurs)] : [];
    })];
    setLignesPropres(lignesPropres.map((l, k) => (k === gi ? ajouterLigne(groupes[gi], l, employes) : l)));
  }
  function retirer(gi: number, ligne: string) {
    const nouvelles = lignesPropres.map((l, k) => (k === gi ? l.filter((x) => x !== ligne) : l));
    setLignesPropres(nouvelles);
    const champs = saisie.champs ?? {};
    if (Object.keys(champs).some((c) => c.startsWith(`${ligne}.`))) surSaisie({ ...saisie, champs: sansLigne(champs, ligne) }, nouvelles);
    // La ligne disparaît aussi des tableaux qui la reprennent (« la part de cette offre », « son coût »).
    for (const f of suiveursMenes) {
      const r = cadrage[f.code];
      if (r?.genre !== "valeurs" || !Object.keys(r.valeurs).some((c) => c.startsWith(`${ligne}.`))) continue;
      const reste = sansLigne(r.valeurs, ligne);
      void enregistrer(f.code, lignesRemplies(reste).size > 0 ? { genre: "valeurs", valeurs: reste } : null);
    }
  }

  const reponseDonnee = mode === "reponse";
  return (
    <li
      ref={carte}
      id={imbriquee ? undefined : `q-${ancre ?? q.code}`}
      className={imbriquee ? "carte-imbriquee mt-3 rounded-xl border border-[var(--line)] p-4" : "rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5"}
      data-question={imbriquee ? undefined : q.code}
      data-question-imbriquee={imbriquee ? q.code : undefined}
      data-traitee={traitee ? "oui" : "non"}
    >
      <p className="text-[var(--text)]">{q.texte ?? q.libelle}</p>
      {q.texte === null ? <p className="mt-1 text-xs text-[var(--text-muted)]">Question à rédiger dans la banque · libellé du classeur · {q.code}</p> : null}
      {q.aide ? <p className="mt-1 text-sm text-[var(--text-muted)]">{q.aide}</p> : null}
      {partageAvec ? <p className="mt-2 text-sm text-[var(--text-muted)]">Cette réponse est partagée avec l&apos;audit {partageAvec} : la modifier la change aussi là-bas.</p> : null}

      {q.dejaPosee ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Déjà renseigné avec un autre agent : repris ici, vous n&apos;avez pas à le saisir de nouveau.</p>
      ) : (
        <>
          {prerempli && detailPrerempli && reponseDonnee ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">Rempli d&apos;après vos réponses précédentes ({detailPrerempli}). Il se met à jour si ce détail change ; corrigez le montant pour le garder tel quel.</p>
          ) : null}
          {reponseDonnee ? <CorpsReponse q={q} id={id} spec={spec} saisie={saisie} surSaisie={surSaisie} setSaisie={setSaisie} poser={poser} vider={() => vider(false)} lignesDeclencheur={lignesDeclencheur} elementsDeListe={elementsDeListe} libellesLignes={libellesLignes} lignes={reglage} ajouter={ajouter} retirer={retirer} sourceEnLigne={sourceEnLigne} /> : null}
          <div role="group" aria-label="Autres réponses" className="reponse-choix mt-4">
            <button type="button" aria-pressed={mode === "inconnu"} onClick={() => choisirMode("inconnu")} className={`reponse-bouton${mode === "inconnu" ? " actif" : ""}`}>Je ne sais pas</button>
            <button type="button" aria-pressed={mode === "non_suivi"} onClick={() => choisirMode("non_suivi")} className={`reponse-bouton${mode === "non_suivi" ? " actif" : ""}`}>Je ne suis pas cette donnée</button>
          </div>
          {mode === "inconnu" && q.repli ? <p className="mt-3 text-sm text-[var(--text-muted)]">{q.repli}</p> : null}
          {mode === "inconnu" && !q.repli ? <p className="mt-3 text-sm text-[var(--text-muted)]">Pas de souci : vous pourrez compléter cette donnée plus tard, elle n&apos;entre pas dans le calcul pour l&apos;instant.</p> : null}
          {mode === "non_suivi" ? <p className="mt-3 text-sm text-[var(--text-muted)]">Noté : cette donnée n&apos;est pas suivie dans votre entreprise. Le rapport vous dira comment commencer à la suivre.</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" aria-live="polite">
            {etat === "enregistrement" ? <span className="text-[var(--text-muted)]">Enregistrement…</span> : null}
            {etat === "attente" && !erreur ? <span className="etat-attente" role="status">{HORS_LIGNE}</span> : null}
            {/* Une confirmation, pas un bouton : la coche dit que la réponse est gardée sur le compte. */}
            {etat === "enregistre" && !erreur ? (
              <span className="etat-enregistre" role="status">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                Réponse enregistrée
              </span>
            ) : null}
            {erreur ? <span className="text-[var(--red-1)]">{erreur}</span> : null}
            {traitee || mode !== "reponse" ? (
              <button type="button" onClick={effacer} className="text-[var(--text-muted)] hover:text-[var(--text)]">Effacer ma réponse</button>
            ) : null}
            {onTerminer ? (
              <button type="button" onClick={onTerminer} className="text-[var(--blue-1)] hover:underline">Terminer</button>
            ) : null}
          </div>
        </>
      )}
    </li>
  );
}

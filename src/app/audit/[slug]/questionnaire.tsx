"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoixCases } from "@/components/choix-cases";
import { aUneReponse, type Reponse, type Reponses } from "@/lib/audit/reponse";
import type { FormeDeclencheur } from "@/lib/donnees/schemas";
import { enregistrerReponse } from "./enregistrer";

export type QuestionClient = {
  code: string;
  libelle: string;
  texte: string | null;
  aide: string | null;
  repli: string | null;
  format: string | null;
  scalaire: boolean;
  quatreReponses: boolean;
  dejaPosee: boolean;
};
export type ThemeClient = { code: string; nom: string; bloc: string; questions: QuestionClient[] };
export type DeclencheurClient = { code: string; question: string; forme: FormeDeclencheur };

type Etat = "repos" | "enregistrement" | "enregistre" | "erreur";

function lireNombre(texte: string): number | null {
  const t = texte.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function brut(r: Reponse | undefined): string | string[] | undefined {
  if (!r || r.genre !== "saisie") return undefined;
  return typeof r.valeur === "boolean" ? (r.valeur ? "oui" : "non") : r.valeur;
}

const OUI_NON = [
  { valeur: "oui", libelle: "Oui" },
  { valeur: "non", libelle: "Non" },
];

// --- Questions de cadrage (déclencheurs) ---------------------------------------------

function Cadrage({ declencheurs, reponses, enregistrer }: { declencheurs: DeclencheurClient[]; reponses: Reponses; enregistrer: (cle: string, r: Reponse | null) => Promise<void> }) {
  const lire = (cle: string) => brut(reponses[cle]);
  const saisie = (valeur: string | string[]): Reponse => ({ genre: "saisie", valeur });

  return (
    <div className="flex flex-col gap-8">
      {declencheurs.map((d) => (
        <div key={d.code} className="flex flex-col gap-3">
          <p className="text-[var(--text)]">{d.question}</p>
          {d.forme.type === "oui_non" ? (
            <ChoixCases
              nom={d.code}
              type="radio"
              legende={d.question}
              options={OUI_NON}
              valeurs={[String(lire(d.code) ?? "")]}
              onChange={(v) => enregistrer(d.code, saisie(v[0]))}
            />
          ) : null}
          {d.forme.type === "choix" ? (
            <ChoixCases
              nom={d.code}
              type="radio"
              legende={d.question}
              options={d.forme.options.map((o) => ({ valeur: o.id, libelle: o.libelle }))}
              valeurs={[String(lire(d.code) ?? "")]}
              onChange={(v) => enregistrer(d.code, saisie(v[0]))}
            />
          ) : null}
          {d.forme.type === "cases" ? (
            <ChoixCases
              nom={d.code}
              type="checkbox"
              legende={d.question}
              options={d.forme.options.map((o) => ({ valeur: o.id, libelle: o.libelle }))}
              valeurs={(lire(d.code) as string[] | undefined) ?? []}
              onChange={(v) => enregistrer(d.code, saisie(v))}
            />
          ) : null}
          {d.forme.type === "oui_non_multiple"
            ? d.forme.sousCles.map((s) => {
                const cle = s.cle ? `${d.code}.${s.cle}` : d.code;
                if (s.siCle) {
                  const parent = lire(s.siCle.cle ? `${d.code}.${s.siCle.cle}` : d.code);
                  if (parent !== s.siCle.egal) return null;
                }
                return (
                  <div key={cle} className="flex flex-col gap-2">
                    <p className="text-sm text-[var(--text-muted)]">{s.libelle}</p>
                    <ChoixCases nom={cle} type="radio" legende={s.libelle} options={OUI_NON} valeurs={[String(lire(cle) ?? "")]} onChange={(v) => enregistrer(cle, saisie(v[0]))} />
                  </div>
                );
              })
            : null}
        </div>
      ))}
    </div>
  );
}

// --- Une question du questionnaire --------------------------------------------------

type Mode = "exact" | "estimation" | "inconnu" | "non_suivi" | "saisie";

function Question({ q, reponse, enregistrer }: { q: QuestionClient; reponse: Reponse | undefined; enregistrer: (cle: string, r: Reponse | null) => Promise<string | null> }) {
  const id = useId();
  const initial = reponse?.genre as Mode | undefined;
  const [mode, setMode] = useState<Mode | null>(q.scalaire && initial === "saisie" ? null : initial ?? null);
  const [exact, setExact] = useState(reponse?.genre === "exact" ? String(reponse.valeur).replace(".", ",") : "");
  const [min, setMin] = useState(reponse?.genre === "estimation" ? String(reponse.min).replace(".", ",") : "");
  const [max, setMax] = useState(reponse?.genre === "estimation" ? String(reponse.max).replace(".", ",") : "");
  const [texte, setTexte] = useState(reponse?.genre === "saisie" && typeof reponse.valeur === "string" ? reponse.valeur : "");
  const [etat, setEtat] = useState<Etat>("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);

  async function envoyer(r: Reponse | null) {
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

  // Les saisies partent après une courte pause : on ne perd rien si le dirigeant ferme la page.
  function programmer(r: Reponse | null) {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => envoyer(r), 600);
  }

  function choisir(m: Mode) {
    if (minuteur.current) clearTimeout(minuteur.current);
    setMode(m);
    if (m === "inconnu" || m === "non_suivi") void envoyer({ genre: m });
  }

  function effacer() {
    if (minuteur.current) clearTimeout(minuteur.current);
    setMode(null);
    setExact("");
    setMin("");
    setMax("");
    setTexte("");
    void envoyer(null);
  }

  function surExact(v: string) {
    setExact(v);
    const n = lireNombre(v);
    programmer(n === null ? null : { genre: "exact", valeur: n });
  }
  function surFourchette(nouveauMin: string, nouveauMax: string) {
    setMin(nouveauMin);
    setMax(nouveauMax);
    const a = lireNombre(nouveauMin);
    const b = lireNombre(nouveauMax);
    if (a === null || b === null) return;
    if (a > b) {
      setErreur("Le minimum doit être inférieur ou égal au maximum.");
      return;
    }
    setErreur(null);
    programmer({ genre: "estimation", min: a, max: b });
  }
  function surTexte(v: string) {
    setTexte(v);
    programmer(v.trim() === "" ? null : { genre: "saisie", valeur: v });
  }

  const traitee = reponse !== undefined;
  const choix: { id: Mode; libelle: string }[] = [
    ...(q.scalaire ? ([{ id: "exact", libelle: "Chiffre exact" }, { id: "estimation", libelle: "Estimation" }] as const) : []),
    { id: "inconnu", libelle: "Je ne sais pas" },
    { id: "non_suivi", libelle: "Je ne suis pas cette donnée" },
  ];

  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5" data-question={q.code} data-traitee={traitee ? "oui" : "non"}>
      <p className="text-[var(--text)]">{q.texte ?? q.libelle}</p>
      {q.texte === null ? <p className="mt-1 text-xs text-[var(--text-faint)]">Question à rédiger dans la banque · libellé du classeur · {q.code}</p> : null}
      {q.aide ? <p className="mt-1 text-sm text-[var(--text-muted)]">{q.aide}</p> : null}

      {q.dejaPosee ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Déjà renseigné avec un autre agent : repris ici, vous n&apos;avez pas à le saisir de nouveau.</p>
      ) : (
        <>
          <div role="group" aria-label="Type de réponse" className="reponse-choix mt-4">
            {choix.map((c) => (
              <button key={c.id} type="button" aria-pressed={mode === c.id} onClick={() => choisir(c.id)} className={`reponse-bouton${mode === c.id ? " actif" : ""}`}>
                {c.libelle}
              </button>
            ))}
          </div>

          {q.scalaire && mode === "exact" ? (
            <div className="champ-groupe mt-3">
              <label htmlFor={`${id}-exact`} className="champ-etiquette">Votre chiffre</label>
              <input id={`${id}-exact`} type="text" inputMode="decimal" value={exact} onChange={(e) => surExact(e.target.value)} className="champ-saisie" />
            </div>
          ) : null}
          {q.scalaire && mode === "estimation" ? (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="champ-groupe">
                <label htmlFor={`${id}-min`} className="champ-etiquette">Entre</label>
                <input id={`${id}-min`} type="text" inputMode="decimal" value={min} onChange={(e) => surFourchette(e.target.value, max)} className="champ-saisie" />
              </div>
              <div className="champ-groupe">
                <label htmlFor={`${id}-max`} className="champ-etiquette">Et</label>
                <input id={`${id}-max`} type="text" inputMode="decimal" value={max} onChange={(e) => surFourchette(min, e.target.value)} className="champ-saisie" />
              </div>
              <p className="champ-aide sm:col-span-2">Nous retenons le milieu de la fourchette, signalé comme estimé.</p>
            </div>
          ) : null}
          {!q.scalaire && mode !== "inconnu" && mode !== "non_suivi" ? (
            <div className="champ-groupe mt-3">
              <label htmlFor={`${id}-texte`} className="champ-etiquette">Votre réponse</label>
              <textarea id={`${id}-texte`} value={texte} onChange={(e) => { setMode("saisie"); surTexte(e.target.value); }} rows={2} maxLength={2000} className="champ-saisie" />
            </div>
          ) : null}

          {mode === "inconnu" && q.repli ? <p className="mt-3 text-sm text-[var(--text-muted)]">{q.repli}</p> : null}
          {mode === "inconnu" && !q.repli ? <p className="mt-3 text-sm text-[var(--text-muted)]">Pas de souci : vous pourrez compléter cette donnée plus tard, elle n&apos;entre pas dans le calcul pour l&apos;instant.</p> : null}
          {mode === "non_suivi" ? <p className="mt-3 text-sm text-[var(--text-muted)]">Noté : cette donnée n&apos;est pas suivie dans votre entreprise. Le rapport vous dira comment commencer à la suivre.</p> : null}

          <div className="mt-3 flex items-center gap-4 text-xs" aria-live="polite">
            {etat === "enregistrement" ? <span className="text-[var(--text-faint)]">Enregistrement…</span> : null}
            {etat === "enregistre" ? <span className="text-[var(--text-faint)]">Enregistré</span> : null}
            {erreur ? <span className="text-[var(--red-1)]">{erreur}</span> : null}
            {traitee || mode ? (
              <button type="button" onClick={effacer} className="text-[var(--text-muted)] hover:text-[var(--text)]">Effacer ma réponse</button>
            ) : null}
          </div>
        </>
      )}
    </li>
  );
}

// --- Questionnaire ----------------------------------------------------------------------

export function Questionnaire({
  declencheurs,
  themes,
  reponsesInitiales,
  masques,
  manquantes,
}: {
  declencheurs: DeclencheurClient[];
  themes: ThemeClient[];
  reponsesInitiales: Reponses;
  masques: number;
  manquantes: number;
}) {
  const router = useRouter();
  const [reponses, setReponses] = useState<Reponses>(reponsesInitiales);
  const reprise = useRef(false);

  const toutes = themes.flatMap((t) => t.questions);
  const traitees = toutes.filter((q) => reponses[q.code] !== undefined || q.dejaPosee).length;
  const premiereNonTraitee = toutes.find((q) => reponses[q.code] === undefined && !q.dejaPosee);

  // Reprise : on ramène le dirigeant à la première question sans réponse.
  useEffect(() => {
    if (reprise.current || !premiereNonTraitee || traitees === 0) return;
    reprise.current = true;
    document.querySelector(`[data-question="${premiereNonTraitee.code}"]`)?.scrollIntoView({ block: "center" });
  }, [premiereNonTraitee, traitees]);

  async function enregistrerCadrage(cle: string, r: Reponse | null) {
    setReponses((x) => ({ ...x, [cle]: r ?? undefined }));
    const e = await enregistrerReponse(cle, r);
    if (!e) router.refresh();
  }
  async function enregistrerQuestion(cle: string, r: Reponse | null): Promise<string | null> {
    const e = await enregistrerReponse(cle, r);
    if (!e) setReponses((x) => ({ ...x, [cle]: r ?? undefined }));
    return e;
  }

  const repondues = toutes.filter((q) => aUneReponse(reponses[q.code])).length;
  const a = declencheurs.length > 0;

  return (
    <div className="mt-10 flex flex-col gap-12">
      {a ? (
        <section aria-labelledby="cadrage">
          <h2 id="cadrage" className="text-xl">Quelques questions pour cadrer votre audit</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Elles servent à ne vous poser que les questions qui vous concernent.</p>
          <div className="mt-5">
            <Cadrage declencheurs={declencheurs} reponses={reponses} enregistrer={enregistrerCadrage} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="questions">
        <h2 id="questions" className="text-xl">Votre questionnaire</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]" aria-live="polite">
          {toutes.length === 0
            ? "Répondez aux questions de cadrage ci-dessus : les questions qui vous concernent s'afficheront ici."
            : `${traitees} question${traitees > 1 ? "s" : ""} traitée${traitees > 1 ? "s" : ""} sur ${toutes.length}, dont ${repondues} avec une réponse. Aucune question n'est obligatoire. Vos réponses sont enregistrées au fur et à mesure : vous pouvez quitter cette page et reprendre plus tard.`}
        </p>
        {manquantes > 0 ? (
          <p className="mt-2 text-xs text-[var(--text-faint)]">
            {manquantes} question{manquantes > 1 ? "s" : ""} n&apos;ont pas encore été rédigée{manquantes > 1 ? "s" : ""} dans la banque : le libellé du classeur s&apos;affiche à la place.
          </p>
        ) : null}
        {masques > 0 ? <p className="mt-1 text-xs text-[var(--text-faint)]">{masques} thème{masques > 1 ? "s" : ""} masqué{masques > 1 ? "s" : ""} : ils ne s&apos;appliquent pas à votre entreprise.</p> : null}

        <div className="mt-6 flex flex-col gap-10">
          {themes.map((t) => (
            <div key={t.code}>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">{t.bloc}</p>
              <h3 className="mt-1 text-lg">{t.nom}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {t.questions.map((q) => (
                  <Question key={q.code} q={q} reponse={reponses[q.code]} enregistrer={enregistrerQuestion} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

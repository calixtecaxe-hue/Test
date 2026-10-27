"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoixCases } from "@/components/choix-cases";
import { aUneReponse, type Reponse, type Reponses } from "@/lib/audit/reponse";
import type { FormeDeclencheur } from "@/lib/donnees/schemas";
import { enregistrerReponse } from "./enregistrer";
import { CartePartagee, QuestionCarte, type LibellesLignes, type QuestionClient } from "./question-carte";
export type { QuestionClient };

export type ThemeClient = { code: string; nom: string; bloc: string; intro?: string; questions: QuestionClient[] };
export type DeclencheurClient = { code: string; question: string; forme: FormeDeclencheur };

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

// --- Questionnaire ----------------------------------------------------------------------

export function Questionnaire({
  declencheurs,
  themes,
  reponsesInitiales,
  masques,
  manquantes,
  libellesLignes,
  donneesLues,
}: {
  donneesLues: string[];
  declencheurs: DeclencheurClient[];
  themes: ThemeClient[];
  reponsesInitiales: Reponses;
  masques: number;
  manquantes: number;
  libellesLignes: LibellesLignes;
}) {
  const router = useRouter();
  const [reponses, setReponses] = useState<Reponses>(reponsesInitiales);
  const reprise = useRef(false);
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());

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
  async function enregistrerQuestion(cle: string, r: Reponse | null, rapide = false, preremplie = false): Promise<string | null> {
    const e = await enregistrerReponse(cle, r, rapide, preremplie);
    if (!e) setReponses((x) => ({ ...x, [cle]: r ?? undefined }));
    // Une question dont la réponse ouvre d'autres questions : l'écran recalcule ce qui reste à poser.
    if (!e && donneesLues.includes(cle)) router.refresh();
    return e;
  }

  const repondues = toutes.filter((q) => aUneReponse(reponses[q.code])).length;
  const a = declencheurs.length > 0;

  return (
    <div className="audit-entree mt-10 flex flex-col gap-12" style={{ "--d": "480ms" } as React.CSSProperties}>
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
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {manquantes} question{manquantes > 1 ? "s" : ""} n&apos;ont pas encore été rédigée{manquantes > 1 ? "s" : ""} dans la banque : le libellé du classeur s&apos;affiche à la place.
          </p>
        ) : null}
        {masques > 0 ? <p className="mt-1 text-xs text-[var(--text-muted)]">{masques} thème{masques > 1 ? "s" : ""} masqué{masques > 1 ? "s" : ""} : ils ne s&apos;appliquent pas à votre entreprise.</p> : null}

        <div className="mt-6 flex flex-col gap-10">
          {themes.map((t) => (
            <div key={t.code}>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">{t.bloc}</p>
              <h3 className="mt-1 text-lg">{t.nom}</h3>
              {t.intro ? <p className="mt-1 text-sm text-[var(--text-muted)]">{t.intro}</p> : null}
              <ul className="mt-4 flex flex-col gap-3">
                {t.questions.map((q) => {
                  if (q.dejaPosee && q.source) {
                    const source = q.source;
                    if (!ouvertes.has(q.code)) {
                      return <CartePartagee key={q.code} q={q} reponse={reponses[source.code]} onModifier={() => setOuvertes((o) => new Set(o).add(q.code))} />;
                    }
                    // La réponse est enregistrée dans la donnée d'origine, avec sa propre spécification.
                    return (
                      <QuestionCarte
                        key={q.code}
                        q={{ ...q, code: source.code, spec: source.spec, dejaPosee: false, source: null }}
                        reponse={reponses[source.code]}
                        cadrage={reponses}
                        libellesLignes={libellesLignes}
                        enregistrer={enregistrerQuestion}
                        partageAvec={source.agent}
                        onTerminer={() => setOuvertes((o) => { const n = new Set(o); n.delete(q.code); return n; })}
                      />
                    );
                  }
                  return <QuestionCarte key={q.code} q={q} reponse={reponses[q.code]} cadrage={reponses} libellesLignes={libellesLignes} enregistrer={enregistrerQuestion} />;
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { phraseEvolution } from "@/lib/audit/compte-rendu";
import { formaterValeur, type FaitMesure, type ResultatObjectif, type VueResultats } from "@/lib/resultats/resultats";
import type { ResultatEvolution } from "@/lib/moteur/evolution";

function formaterDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function Questions({ questions }: { questions: string[] }) {
  if (questions.length === 0) return null;
  return (
    <details className="mt-1.5 text-xs text-[var(--text-muted)]" data-questions>
      <summary className="cursor-pointer">Données utilisées</summary>
      <ul className="mt-1.5 list-disc space-y-1 pl-5">
        {questions.map((q) => (
          <li key={q}>« {q} »</li>
        ))}
      </ul>
    </details>
  );
}

function Fait({ f }: { f: FaitMesure }) {
  return (
    <li className="res-fait" data-fait={f.id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[var(--text)]">{f.libelle}</p>
        <p className="res-valeur">{formaterValeur(f.valeur, f.unite)}</p>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {f.periode.charAt(0).toUpperCase() + f.periode.slice(1)}
        {f.estimee ? " · estimé (milieu de votre fourchette)" : ""}
        {" · "}
        {f.explication}
      </p>
      {f.lignes ? <p className="mt-1 text-xs text-[var(--text-muted)]">Lignes renseignées : {f.lignes.join(", ")}.</p> : null}
      <Questions questions={f.questions} />
    </li>
  );
}

const SIGNE = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");

function Objectif({ o, plusieurs, i }: { o: ResultatObjectif; plusieurs: boolean; i: number }) {
  return (
    <article className="res-bloc !mt-0" data-objectif-resultat={o.id}>
      <p className="res-origine">{plusieurs ? `Objectif ${i + 1}` : "Votre objectif"}</p>
      <p className="mt-2 text-lg text-[var(--text)]" data-objectif-phrase>
        {o.phrase}
      </p>
      <dl className="res-chiffres">
        <div>
          <dt>Échéance</dt>
          <dd>
            {formaterDate(o.echeance)}
            {o.moisRestants > 0 ? <span className="font-normal text-[var(--text-muted)]"> · dans {o.moisRestants} mois</span> : null}
          </dd>
        </div>
        <div>
          <dt>Origine</dt>
          <dd className="!font-normal">{o.origine === "proposition" ? "Objectif proposé" : o.origine === "personnel" ? "Objectif personnel" : "Objectif fixé par vous"}</dd>
        </div>
        {o.reussite ? (
          <div>
            <dt>Ce que vous voulez constater</dt>
            <dd className="!font-normal">{o.reussite}</dd>
          </div>
        ) : null}
        {o.mesure ? (
          <>
            <div data-depart>
              <dt>Situation de départ</dt>
              <dd>
                {formaterValeur(o.mesure.valeur, o.mesure.unite)}
                {o.mesure.estimee ? <span className="font-normal text-[var(--text-muted)]"> · estimé</span> : null}
              </dd>
            </div>
            {o.cible ? (
              <>
                <div data-cible>
                  <dt>Cible</dt>
                  <dd>{formaterValeur(o.cible.cible, o.cible.unite)}</dd>
                </div>
                <div data-ecart>
                  <dt>Écart à combler</dt>
                  <dd>
                    {SIGNE(o.cible.ecart)}
                    {formaterValeur(Math.abs(o.cible.ecart), o.cible.unite)}
                  </dd>
                </div>
              </>
            ) : null}
          </>
        ) : null}
        <div>
          <dt>Avancement déclaré</dt>
          <dd className="!font-normal">Aucun point d&apos;étape pour l&apos;instant</dd>
        </div>
      </dl>
      {o.mesure ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Mesure suivie : {o.mesure.libelle.charAt(0).toLowerCase() + o.mesure.libelle.slice(1)}, {o.mesure.periode}. {o.mesure.explication}
          {o.cible ? ` Cible calculée : ${o.cible.calcul}.` : ""}
        </p>
      ) : null}
      {o.mesure ? <Questions questions={o.mesure.questions} /> : null}
      {o.limites.map((l) => (
        <p key={l} className="mt-2 text-sm text-[var(--text-muted)]" data-limite>
          {l}
        </p>
      ))}
      <p className="mt-2 text-xs text-[var(--text-muted)]">L&apos;avancement se calcule uniquement sur ce que vous déclarerez aux points d&apos;étape, jamais sur une estimation.</p>
    </article>
  );
}

function Evolutions({ liste }: { liste: ResultatEvolution[] }) {
  if (liste.length === 0) return null;
  const lisibles = liste.filter((r) => r.statut !== "non_etablie");
  const manquantes = liste.filter((r) => r.statut === "non_etablie");
  return (
    <section className="res-bloc" aria-labelledby="res-evolutions" data-evolutions>
      <h3 id="res-evolutions" className="text-base">
        Ce qui a changé, d&apos;après vos chiffres
      </h3>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Vos chiffres comparés à vos propres chiffres passés, sur des mois de même longueur. Un écart ne dit pas si c&apos;est bien ou mal.</p>
      {lisibles.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {lisibles.map((r) => (
            <li key={r.id} data-evolution={r.id} data-statut={r.statut}>
              <p className="text-sm font-medium text-[var(--text)]">{r.libelle}</p>
              <p className="mt-1 text-sm text-[var(--text)]">{phraseEvolution(r)}</p>
              {r.raison ? <p className="mt-1 text-sm text-[var(--text-muted)]">Non comparable : {r.raison}</p> : null}
              {r.notes.map((n) => (
                <p key={n} className="mt-1 text-xs text-[var(--text-muted)]">
                  {n}
                </p>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Aucune comparaison n&apos;est encore possible.</p>
      )}
      {manquantes.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-[var(--text-muted)]">
            {manquantes.length} comparaison{manquantes.length > 1 ? "s" : ""} pas encore possible{manquantes.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-2">
            {manquantes.map((r) => (
              <li key={r.id} data-evolution={r.id} data-statut={r.statut} className="text-sm">
                <span className="text-[var(--text)]">{r.libelle} : </span>
                <span className="text-[var(--text-muted)]">{r.raison}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

// Onglet « Résultats » : les faits disponibles, sans score, sans couleur, sans classement et sans conseil (décision du
// 29 octobre). Chaque chiffre dit ses mois, son unité, et les questions d'où il vient.
export function ResultatsFactuels({ vue, questionnaire }: { vue: VueResultats; questionnaire: string }) {
  const plusieurs = vue.objectifs.length > 1;
  const aCompleter = vue.manquantes.length > 0 || vue.aCompleter.length > 0;
  return (
    <div data-panneau="resultats">
      <p className="text-sm text-[var(--text-muted)]">
        Les faits tirés de vos réponses, sans jugement. L&apos;interprétation est dans l&apos;onglet Rapport, les actions dans le Plan d&apos;action. Ces résultats se mettent à jour à chaque réponse.
      </p>

      <div className="mt-5 grid gap-4">
        {vue.objectifs.map((o, i) => (
          <Objectif key={o.id} o={o} plusieurs={plusieurs} i={i} />
        ))}
      </div>

      <section className="res-bloc" aria-labelledby="res-facteurs" data-facteurs>
        <h3 id="res-facteurs" className="text-base">
          Les chiffres liés à votre objectif
        </h3>
        {vue.facteursObjectif.length > 0 ? (
          <ul className="res-faits">
            {vue.facteursObjectif.map((f) => (
              <Fait key={f.id} f={f} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Aucun autre chiffre de vos réponses ne se rattache directement aux thèmes de votre objectif.</p>
        )}
      </section>

      {vue.autresFacteurs.length > 0 ? (
        <section className="res-bloc" aria-labelledby="res-autres" data-autres-facteurs>
          <h3 id="res-autres" className="text-base">
            Vos autres chiffres pour cet agent
          </h3>
          <ul className="res-faits">
            {vue.autresFacteurs.map((f) => (
              <Fait key={f.id} f={f} />
            ))}
          </ul>
        </section>
      ) : null}

      <Evolutions liste={vue.evolutions} />

      <section className="res-bloc" aria-labelledby="res-marche" data-marche>
        <h3 id="res-marche" className="text-base">
          Comparaison au marché
        </h3>
        {vue.marche.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {vue.marche.map((m, i) => (
              <li key={i} className="text-sm" data-repere>
                <p className="text-[var(--text)]">{m.theme}</p>
                {m.valeur ? (
                  <p className="mt-1 text-[var(--text)]">
                    Votre valeur : {formaterValeur(m.valeur.valeur, m.valeur.unite)} ({m.valeur.periode}).
                  </p>
                ) : (
                  <p className="mt-1 text-[var(--text-muted)]">Votre valeur pour cet indicateur n&apos;est pas encore calculée.</p>
                )}
                <p className="mt-1 text-[var(--text-muted)]">
                  Repère : {m.repere.libelle}. Source :{" "}
                  <a href={m.repere.url} target="_blank" rel="noreferrer" className="audit-kicker hover:underline">
                    {m.repere.organisme}, {m.repere.annee}
                  </a>
                  {m.repere.confiance === "indicatif" ? " (indicatif)" : " (confirmé)"}
                  {m.repere.perimee ? " · à revérifier" : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-muted)]" data-sans-marche>
            Aucune comparaison au marché n&apos;est disponible pour votre métier : aucun repère vérifié n&apos;est encore enregistré. Vos chiffres sont présentés sans comparaison.
          </p>
        )}
      </section>

      <section className="res-bloc" aria-labelledby="res-manques" data-manques>
        <h3 id="res-manques" className="text-base">
          Ce qui manque pour aller plus loin
        </h3>
        {vue.manquantes.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {vue.manquantes.map((m) => (
              <li key={m.id} data-manquante={m.id}>
                <span className="text-[var(--text)]">{m.libelle} : </span>
                <span className="text-[var(--text-muted)]">{m.raison}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {vue.aCompleter.length + vue.analyses.length > 0 ? (
          <details className="mt-3" data-couverture>
            <summary className="cursor-pointer text-sm text-[var(--text-muted)]">
              Vos réponses par thème : {vue.analyses.length} thème{vue.analyses.length > 1 ? "s" : ""} avec au moins la moitié des réponses, {vue.aCompleter.length} à compléter
            </summary>
            {[
              { titre: "Analysés avec vos chiffres", intro: "Au moins la moitié des questions ont une réponse.", liste: vue.analyses },
              { titre: "À compléter", intro: "Moins de la moitié des questions ont une réponse : le thème n'est pas encore analysé.", liste: vue.aCompleter },
            ].map((g) =>
              g.liste.length > 0 ? (
                <section key={g.titre} className="mt-3">
                  <h4 className="text-sm font-medium text-[var(--text)]">{g.titre}</h4>
                  <p className="text-xs text-[var(--text-muted)]">{g.intro}</p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {g.liste.map((t) => (
                      <li key={t.nom} className="res-theme flex flex-wrap justify-between gap-x-4">
                        <p className="text-[var(--text)]">{t.nom}</p>
                        <span className="text-[var(--text-muted)]">
                          {t.repondues} réponse{t.repondues > 1 ? "s" : ""} sur {t.posees}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null
            )}
          </details>
        ) : null}
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Pas encore calculés pour aucun métier : le réalisme de votre objectif et le classement des leviers par effet sur votre objectif. Ils demandent des repères de marché et des règles qui ne sont pas encore écrits ; ils ne sont pas remplacés par une estimation.
        </p>
        {aCompleter ? (
          <Link href={questionnaire} className="audit-bouton bouton-eclat mt-4 inline-flex rounded-[4px] px-5 py-2.5 font-medium transition">
            Compléter mes réponses
          </Link>
        ) : null}
      </section>
    </div>
  );
}

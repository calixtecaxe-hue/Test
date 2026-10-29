"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { EtatRapport } from "@/lib/rapport/rapport-compte";
import type { ActionRapport, Conclusion, Rapport } from "@/lib/rapport/schema";

type CodeAgent = "ACQUISITION_CA" | "FINANCE_RENTABILITE" | "RH_ORGANISATION" | "COMM_CREATION";
type StatutAction = "A_FAIRE" | "EN_COURS" | "FAITE" | "ABANDONNEE";

const NOMS_AGENTS: Record<CodeAgent, string> = {
  ACQUISITION_CA: "Acquisition & Chiffre d'affaires",
  FINANCE_RENTABILITE: "Finance & Rentabilité",
  RH_ORGANISATION: "RH & Organisation",
  COMM_CREATION: "Comm & Création de contenu",
};
const GROUPES: { type: Conclusion["type"]; titre: string }[] = [
  { type: "priorite", titre: "Ce qui compte le plus pour votre objectif" },
  { type: "freine", titre: "Ce qui freine votre objectif" },
  { type: "fonctionne", titre: "Ce qui fonctionne" },
  { type: "a_verifier", titre: "Pistes à vérifier" },
];
const LIBELLES_STATUT: Record<StatutAction, string> = { A_FAIRE: "À faire", EN_COURS: "En cours", FAITE: "Faite", ABANDONNEE: "Abandonnée" };

function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function semaines(n: number): string {
  return `${n} semaine${n > 1 ? "s" : ""}`;
}

// Suivi d'une rédaction : lance, attend, puis recharge la page quand le rapport est prêt ou a échoué.
function useRedaction(agent: CodeAgent, etat: EtatRapport) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(etat.rapport?.statut === "EN_COURS" ? etat.rapport.id : null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enCours) return;
    let fini = false;
    const suivre = async () => {
      try {
        const r = await fetch(`/api/rapport?id=${encodeURIComponent(enCours)}`, { cache: "no-store" });
        const corps = (await r.json().catch(() => null)) as { statut?: string } | null;
        if (r.ok && corps?.statut && corps.statut !== "EN_COURS") {
          fini = true;
          setEnCours(null);
          router.refresh();
          return;
        }
      } catch {
        // Réseau coupé : on réessaie au prochain tour, la rédaction continue côté serveur.
      }
      if (!fini) minuteur.current = setTimeout(suivre, 2500);
    };
    minuteur.current = setTimeout(suivre, 2000);
    return () => {
      fini = true;
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [enCours, router]);

  async function lancer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await fetch("/api/rapport", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent }) });
      const corps = (await r.json().catch(() => null)) as { rapportId?: string; erreur?: string } | null;
      if (r.ok && corps?.rapportId) setEnCours(corps.rapportId);
      else setErreur(corps?.erreur ?? "La rédaction n'a pas pu être lancée. Réessayez.");
    } catch {
      setErreur("Pas de connexion : la rédaction n'a pas pu être lancée. Réessayez dès que le réseau revient.");
    } finally {
      setEnvoi(false);
    }
  }
  return { enCours, erreur, envoi, lancer };
}

function BoutonRediger({ libelle, envoi, onClick }: { libelle: string; envoi: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={envoi} className="audit-bouton bouton-eclat mt-4 inline-flex rounded-[4px] px-5 py-2.5 font-medium transition disabled:opacity-60" data-rediger>
      {envoi ? "Lancement…" : libelle}
    </button>
  );
}

function EnCours() {
  return (
    <div className="res-bloc !mt-0" role="status" aria-live="polite" data-redaction-en-cours>
      <p className="text-base text-[var(--text)]">Rédaction en cours</p>
      <div className="rap-attente mt-3" aria-hidden="true">
        <span />
      </div>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        Votre rapport est rédigé à partir de vos réponses ; cela peut prendre quelques minutes. Vous pouvez quitter cette page : la rédaction continue et vous la retrouverez ici.
      </p>
    </div>
  );
}

function Preambule({ etat, onglet, redaction }: { etat: EtatRapport; onglet: "rapport" | "plan"; redaction: ReturnType<typeof useRedaction> }) {
  const { erreur, envoi, lancer } = redaction;
  const r = etat.rapport;
  const erreurLancement = erreur ? (
    <p className="mt-3 text-sm text-[var(--red-1)]" role="alert" data-erreur-lancement>
      {erreur}
    </p>
  ) : null;
  if (etat.mode === "indisponible")
    return (
      <div className="res-bloc !mt-0" data-rapport-indisponible>
        <p className="text-sm text-[var(--text-muted)]">La rédaction des rapports n&apos;est pas encore ouverte. Vos résultats restent consultables dans l&apos;onglet Résultats.</p>
      </div>
    );
  if (!r || r.statut === "ECHEC") {
    if (!etat.suffisant)
      return (
        <div className="res-bloc !mt-0" data-rapport-insuffisant>
          <p className="text-sm text-[var(--text-muted)]">Le rapport s&apos;appuie sur vos réponses : répondez d&apos;abord à quelques questions du questionnaire.</p>
        </div>
      );
    return (
      <div className="res-bloc !mt-0" data-rapport-absent={r ? undefined : ""} data-rapport-echec={r ? "" : undefined}>
        {r ? (
          <p className="text-sm text-[var(--red-1)]" role="alert">
            {r.erreur ?? "La rédaction n'a pas abouti."}
          </p>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            {onglet === "plan"
              ? "Votre plan d'action est rédigé avec votre rapport, à partir de vos réponses, de votre objectif et de ce que vous avez déjà essayé."
              : "Votre rapport explique ce que vos chiffres veulent dire pour votre objectif, ce qui fonctionne, ce qui freine et ce qu'il faut faire en premier. Il s'appuie sur vos réponses, votre objectif et ce que vous avez déjà essayé."}
          </p>
        )}
        <BoutonRediger libelle={r ? "Relancer la rédaction" : onglet === "plan" ? "Rédiger mon rapport et mon plan" : "Rédiger mon rapport"} envoi={envoi} onClick={lancer} />
        {erreurLancement}
      </div>
    );
  }
  // Rapport prêt : bandeaux de simulation et de mise à jour.
  return (
    <>
      {r.mode === "simulation" ? (
        <p className="res-exemple !mt-0" data-simulation>
          <strong>Simulation.</strong> Ce texte a été produit sans IA, pour essayer l&apos;écran : il ne contient aucune analyse. Le vrai rapport est rédigé par l&apos;IA une fois la clé d&apos;accès configurée.
        </p>
      ) : null}
      {r.perime ? (
        <div className="rap-perime mt-3" role="status" data-rapport-perime>
          <p className="text-sm text-[var(--text)]">
            Vos réponses, votre objectif ou ce que vous avez déjà essayé ont changé depuis ce rapport, rédigé le {formaterDate(r.termineLe ?? r.creeLe)}. Il n&apos;en tient pas compte.
          </p>
          <BoutonRediger libelle="Mettre à jour le rapport" envoi={envoi} onClick={lancer} />
          {erreurLancement}
        </div>
      ) : null}
    </>
  );
}

function DApres({ refs, references }: { refs: string[]; references: Record<string, string> }) {
  const noms = refs.map((x) => references[x]).filter(Boolean);
  if (noms.length === 0) return null;
  return <p className="mt-1 text-xs text-[var(--text-muted)]">D&apos;après : {noms.join(" ; ")}.</p>;
}

function ContenuRapport({ r, references }: { r: Rapport; references: Record<string, string> }) {
  return (
    <div data-rapport-contenu>
      <section className="res-bloc" aria-labelledby="rap-synthese">
        <h3 id="rap-synthese" className="text-base">
          En bref
        </h3>
        <p className="mt-2 text-[var(--text)]" data-synthese>
          {r.synthese}
        </p>
      </section>

      {GROUPES.map((g) => {
        const liste = r.conclusions.filter((c) => c.type === g.type);
        if (liste.length === 0) return null;
        return (
          <section key={g.type} className="res-bloc" aria-labelledby={`rap-${g.type}`} data-conclusions={g.type}>
            <h3 id={`rap-${g.type}`} className="text-base">
              {g.titre}
            </h3>
            <ul className="mt-3 space-y-5">
              {liste.map((c, i) => (
                <li key={i} className="rap-conclusion">
                  <p className="font-medium text-[var(--text)]">{c.titre}</p>
                  <p className="rap-etiquette">Faits établis</p>
                  <ul className="mt-1 space-y-1">
                    {c.faits.map((f, j) => (
                      <li key={j} className="text-sm text-[var(--text)]">
                        {f.texte}
                        <DApres refs={f.refs} references={references} />
                      </li>
                    ))}
                  </ul>
                  <p className="rap-etiquette">Notre lecture</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{c.interpretation}</p>
                  {c.hypotheses.length > 0 ? (
                    <>
                      <p className="rap-etiquette">À vérifier</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
                        {c.hypotheses.map((h, j) => (
                          <li key={j}>{h}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <p className="rap-etiquette">Ce que nous recommandons</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{c.choix}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{c.justification}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {r.essais ? (
        <section className="res-bloc" aria-labelledby="rap-essais" data-essais>
          <h3 id="rap-essais" className="text-base">
            Ce que vous avez déjà essayé
          </h3>
          <p className="mt-2 text-sm text-[var(--text)]">{r.essais.lecture}</p>
          <p className="mt-2 text-sm text-[var(--text)]">{r.essais.suite}</p>
        </section>
      ) : null}

      {r.contradictions.length > 0 ? (
        <section className="res-bloc" aria-labelledby="rap-contradictions" data-contradictions>
          <h3 id="rap-contradictions" className="text-base">
            Réponses qui ne concordent pas
          </h3>
          <ul className="mt-2 space-y-3 text-sm">
            {r.contradictions.map((c, i) => (
              <li key={i}>
                <p className="text-[var(--text)]">{c.description}</p>
                <p className="mt-1 text-[var(--text-muted)]">{c.retenu}</p>
                <DApres refs={c.refs} references={references} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {r.manques.length > 0 || r.suiviDonnees ? (
        <section className="res-bloc" aria-labelledby="rap-manques" data-rapport-manques>
          <h3 id="rap-manques" className="text-base">
            Ce qui manque pour aller plus loin
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
            {r.manques.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
          {r.suiviDonnees ? <p className="mt-2 text-sm text-[var(--text)]">{r.suiviDonnees}</p> : null}
        </section>
      ) : null}

      {r.renvois.length > 0 ? (
        <section className="res-bloc" aria-labelledby="rap-renvois" data-renvois>
          <h3 id="rap-renvois" className="text-base">
            Pour aller plus loin avec les autres agents
          </h3>
          <ul className="mt-2 space-y-2 text-sm">
            {r.renvois.map((x, i) => (
              <li key={i}>
                <span className="text-[var(--text)]">{NOMS_AGENTS[x.agent]} : </span>
                <span className="text-[var(--text-muted)]">{x.sujet}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Action({ a, rang, rapportId, statut, termineLe, autres }: { a: ActionRapport; rang: number; rapportId: string; statut: StatutAction; termineLe: string | null; autres: Map<string, string> }) {
  const [valeur, setValeur] = useState<StatutAction>(statut);
  const [etat, setEtat] = useState<"repos" | "enregistrement" | "enregistre" | "erreur">("repos");
  async function changer(s: StatutAction) {
    const avant = valeur;
    setValeur(s);
    setEtat("enregistrement");
    try {
      const r = await fetch("/api/rapport/action", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rapportId, cle: a.id, statut: s }) });
      if (!r.ok) throw new Error();
      setEtat("enregistre");
    } catch {
      setValeur(avant);
      setEtat("erreur");
    }
  }
  const echeance =
    a.quand === "maintenant" && termineLe
      ? `le ${new Date(new Date(termineLe).getTime() + a.delaiSemaines * 7 * 86400000).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} (${semaines(a.delaiSemaines)})`
      : `${semaines(a.delaiSemaines)} après son démarrage`;
  return (
    <li className="res-action" data-action={a.id} data-statut-action={valeur}>
      <span className="res-rang" aria-hidden="true">
        {rang}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-[var(--text)]">{a.intitule}</p>
        <p className="mt-1 text-sm text-[var(--text)]">
          <span className="text-[var(--text-muted)]">Résultat recherché : </span>
          {a.resultat}
        </p>
        <p className="mt-2 text-sm text-[var(--text)]">
          <span className="text-[var(--text-muted)]">{a.quand === "maintenant" ? "Pourquoi maintenant : " : "Pourquoi cette action : "}</span>
          {a.pourquoi}
        </p>
        {a.repriseEssai && a.ceQuiChange ? (
          <p className="mt-2 text-sm text-[var(--text)]" data-reprise-essai>
            <span className="text-[var(--text-muted)]">Reprend ce que vous avez déjà essayé. Ce qui change : </span>
            {a.ceQuiChange}
          </p>
        ) : null}
        <p className="rap-etiquette">Étapes</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-[var(--text)]">
          {a.etapes.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
        <dl className="res-chiffres">
          <div>
            <dt>Temps nécessaire</dt>
            <dd className="!font-normal">{a.tempsNecessaire}</dd>
          </div>
          <div>
            <dt>Moyens</dt>
            <dd className="!font-normal">{a.moyens}</dd>
          </div>
          {a.prerequis.length > 0 ? (
            <div>
              <dt>Prérequis</dt>
              <dd className="!font-normal">{a.prerequis.join(" ; ")}</dd>
            </div>
          ) : null}
          {a.apres.length > 0 ? (
            <div>
              <dt>Après</dt>
              <dd className="!font-normal">{a.apres.map((x) => autres.get(x) ?? x).join(" ; ")}</dd>
            </div>
          ) : null}
          <div>
            <dt>Échéance</dt>
            <dd className="!font-normal">{echeance}</dd>
          </div>
          <div>
            <dt>Point d&apos;étape</dt>
            <dd className="!font-normal">{semaines(a.pointEtapeSemaines)} après son démarrage</dd>
          </div>
          <div>
            <dt>Indicateur à suivre</dt>
            <dd className="!font-normal">{a.indicateur}</dd>
          </div>
          <div>
            <dt>Effet attendu</dt>
            <dd className="!font-normal">{a.effetAttendu}</dd>
          </div>
        </dl>
        {a.libereDuTemps ? (
          <ul className="res-meta">
            <li className="res-libere">Libère du temps</li>
          </ul>
        ) : null}
        <fieldset className="mt-4" data-suivi-action>
          <legend className="text-sm text-[var(--text-muted)]">Où en êtes-vous ?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(LIBELLES_STATUT) as StatutAction[]).map((s) => (
              <label key={s} className={`case-option !py-1.5 text-sm${valeur === s ? " choisie" : ""}`}>
                <input type="radio" name={`statut-${a.id}`} value={s} checked={valeur === s} onChange={() => changer(s)} className="case-entree" />
                <span>{LIBELLES_STATUT[s]}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs" aria-live="polite">
            {etat === "enregistre" ? <span className="etat-enregistre">Enregistré</span> : null}
            {etat === "enregistrement" ? <span className="text-[var(--text-muted)]">Enregistrement…</span> : null}
            {etat === "erreur" ? <span className="text-[var(--red-1)]">Le changement n&apos;a pas pu être enregistré. Réessayez.</span> : null}
          </p>
        </fieldset>
      </div>
    </li>
  );
}

function Plan({ r, rapportId, statuts, termineLe }: { r: Rapport; rapportId: string; statuts: Record<string, StatutAction>; termineLe: string | null }) {
  const autres = new Map(r.actions.map((a) => [a.id, a.intitule]));
  const maintenant = r.actions.filter((a) => a.quand === "maintenant");
  const ensuite = r.actions.filter((a) => a.quand === "ensuite");
  const rang = new Map(r.actions.map((a, i) => [a.id, i + 1]));
  return (
    <div data-plan-contenu>
      <p className="mt-4 text-sm text-[var(--text-muted)]">{r.ordre}</p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        L&apos;état de vos actions ne change pas l&apos;avancement de votre objectif : celui-ci se mesure à ce que vous déclarez aux points d&apos;étape.
      </p>
      {[
        { titre: "À lancer maintenant", liste: maintenant, cle: "maintenant" },
        { titre: "Peut attendre", liste: ensuite, cle: "ensuite" },
      ].map((g) =>
        g.liste.length > 0 ? (
          <section key={g.cle} className="mt-6" aria-labelledby={`plan-${g.cle}`} data-plan-groupe={g.cle}>
            <h3 id={`plan-${g.cle}`} className="text-base">
              {g.titre}
            </h3>
            <ul className="res-liste">
              {g.liste.map((a) => (
                <Action key={a.id} a={a} rang={rang.get(a.id)!} rapportId={rapportId} statut={statuts[a.id] ?? "A_FAIRE"} termineLe={termineLe} autres={autres} />
              ))}
            </ul>
          </section>
        ) : null
      )}
    </div>
  );
}

// Onglets « Rapport » et « Plan d'action » : l'interprétation et la stratégie rédigées par l'IA à partir du dossier préparé par
// le code, puis les actions. États : à rédiger, en cours (suivi automatique), échec (relance), prêt, périmé (mise à jour).
export function RapportPlan({ agent, onglet, etat, liens }: { agent: CodeAgent; onglet: "rapport" | "plan"; etat: EtatRapport; liens: { rapport: string; plan: string } }) {
  const redaction = useRedaction(agent, etat);
  const r = etat.rapport;
  // Pendant une rédaction, l'ancien rapport n'est plus montré : il ne tient pas compte de ce qui a changé.
  if (redaction.enCours)
    return (
      <div data-panneau={onglet}>
        <EnCours />
      </div>
    );
  const pret = r?.statut === "PRET" && r.contenu;
  return (
    <div data-panneau={onglet}>
      <Preambule etat={etat} onglet={onglet} redaction={redaction} />
      {pret && onglet === "rapport" ? (
        <>
          <ContenuRapport r={r.contenu!} references={r.references} />
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Rédigé le {formaterDate(r.termineLe ?? r.creeLe)} à partir de vos réponses. Les chiffres viennent du calcul de CAXE ; l&apos;interprétation et les recommandations sont rédigées par l&apos;IA.
          </p>
          <Link href={liens.plan} className="bouton-secondaire mt-4 inline-flex rounded-[4px] px-5 py-2.5 text-sm font-medium" data-voir-plan>
            Voir mon plan d&apos;action
          </Link>
        </>
      ) : null}
      {pret && onglet === "plan" ? <Plan r={r.contenu!} rapportId={r.id} statuts={r.actions} termineLe={r.termineLe} /> : null}
    </div>
  );
}

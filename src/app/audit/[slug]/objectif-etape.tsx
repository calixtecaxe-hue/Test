"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  decrireDelai,
  decrireVariation,
  type CodeAgent,
  type Interpretation,
  type ObjectifStructure,
} from "@/lib/objectif/interpreter";
import { AGENTS } from "@/lib/agents";
import { classeChamp } from "@/components/champ";

type Etat =
  | { etape: "saisie" }
  | { etape: "precision"; question: string }
  | { etape: "hors_perimetre"; message: string; agentSuggere: CodeAgent }
  | { etape: "confirmation"; objectif: ObjectifStructure }
  | { etape: "enregistre"; objectif: ObjectifStructure };

const EXEMPLE = "Ex. : augmenter mon chiffre d'affaires de 15 % dans les 12 prochains mois";

function formaterEcheance(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Un seul champ libre : le dirigeant écrit son objectif comme il le dirait à
// voix haute. CAXE le lit, demande au besoin la seule précision qui manque
// (résultat mesurable, délai), puis le confirme avant de lancer l'audit.
export function ObjectifEtape({
  agent,
  agentSlug,
  objectifActif,
}: {
  agent: CodeAgent;
  agentSlug: string;
  objectifActif: { texte: string; echeance: string; variation: string } | null;
}) {
  const [etat, setEtat] = useState<Etat>({ etape: "saisie" });
  // Le texte d'origine, puis chaque précision, bout à bout.
  const [textes, setTextes] = useState<string[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLTextAreaElement>(null);

  // Les précisions complètent la phrase d'origine : « …de 20 %, dans 12 mois ».
  const texteComplet = (suite: string[]) =>
    suite.reduce((acc, t) => (acc ? `${acc.replace(/[.\s]+$/, "")}, ${t.replace(/^[,\s]+/, "")}` : t), "");

  async function appeler(url: string, texte: string) {
    const reponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, texte }),
    });
    const donnees = await reponse.json().catch(() => null);
    return { reponse, donnees };
  }

  async function continuer(e: React.FormEvent) {
    e.preventDefault();
    const nouveau = saisie.trim();
    if (!nouveau) {
      setErreur("Écrivez votre objectif.");
      return;
    }
    setErreur(null);
    setEnCours(true);
    const suite = [...textes, nouveau];
    try {
      const { reponse, donnees } = await appeler("/api/objectifs/interpreter", texteComplet(suite));
      if (!reponse.ok) {
        setErreur(donnees?.erreur ?? "Votre objectif n'a pas pu être lu. Réessayez dans un instant.");
        return;
      }
      const resultat = donnees as Interpretation;
      setTextes(suite);
      setSaisie("");
      if (resultat.statut === "complet") setEtat({ etape: "confirmation", objectif: resultat.objectif });
      else if (resultat.statut === "incomplet") setEtat({ etape: "precision", question: resultat.question });
      else setEtat({ etape: "hors_perimetre", message: resultat.message, agentSuggere: resultat.agent_suggere });
    } catch {
      setErreur("Le service ne répond pas. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  async function lancer() {
    if (etat.etape !== "confirmation") return;
    setErreur(null);
    setEnCours(true);
    try {
      const { reponse, donnees } = await appeler("/api/objectifs", texteComplet(textes));
      if (!reponse.ok) {
        setErreur(donnees?.erreur ?? "Votre objectif n'a pas pu être enregistré. Réessayez dans un instant.");
        return;
      }
      setEtat({ etape: "enregistre", objectif: etat.objectif });
    } catch {
      setErreur("Le service ne répond pas. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  function modifier() {
    setEtat({ etape: "saisie" });
    setTextes([]);
    setSaisie("");
    setErreur(null);
    requestAnimationFrame(() => champ.current?.focus());
  }

  if (etat.etape === "enregistre") {
    return (
      <section className="mt-4" aria-live="polite">
        <h1 className="text-2xl">Objectif enregistré</h1>
        <Recapitulatif objectif={etat.objectif} />
        <p className="mt-6 text-[var(--text-muted)]">
          Le questionnaire de cet agent sera choisi à partir de cet objectif, parmi les questions rédigées pour votre
          métier. Il n&apos;est pas encore disponible dans cette version.
        </p>
        <Link href="/tableau-de-bord" className="mt-6 w-fit text-[var(--blue-1)] hover:underline">
          Retour à mon compte
        </Link>
      </section>
    );
  }

  const enPrecision = etat.etape === "precision";

  return (
    <section className="mt-4" aria-live="polite">
      <h1 className="text-2xl">Votre objectif</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        Quel résultat concret souhaitez-vous atteindre, et dans quel délai ?
      </p>

      {objectifActif && etat.etape === "saisie" ? (
        <p className="mt-6 rounded-xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--text-muted)]">
          Objectif en cours : {objectifActif.texte} ({objectifActif.variation}, avant le {objectifActif.echeance}).
          Un nouvel objectif le remplace ; l&apos;ancien reste dans votre historique.
        </p>
      ) : null}

      {textes.length > 0 ? (
        <p className="msg-moi ml-auto mt-6 max-w-[88%] rounded-[14px] rounded-tr-[4px] bg-[rgba(91,159,236,0.2)] px-4 py-2.5 text-[0.95rem]">
          {texteComplet(textes)}
        </p>
      ) : null}

      {etat.etape === "hors_perimetre" ? (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[rgba(244,236,216,0.04)] px-4 py-3">
          <p>{etat.message}</p>
          <Link
            href={`/audit/${AGENTS.find((a) => a.code === etat.agentSuggere)?.slug ?? agentSlug}`}
            className="mt-2 inline-block text-[var(--blue-1)] hover:underline"
          >
            Ouvrir cet agent
          </Link>
        </div>
      ) : null}

      {enPrecision ? (
        <p className="mt-4 w-fit max-w-[88%] rounded-[14px] rounded-tl-[4px] bg-[rgba(244,236,216,0.07)] px-4 py-2.5">
          {etat.question}
        </p>
      ) : null}

      {etat.etape === "confirmation" ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-[var(--text)]">Voici ce que nous avons compris</p>
          <Recapitulatif objectif={etat.objectif} />
          {erreur ? <p className="mt-4 text-sm text-[var(--red-1)]">{erreur}</p> : null}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={lancer}
              disabled={enCours}
              className="rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
            >
              {enCours ? "Enregistrement…" : "Lancer l'audit"}
            </button>
            <button type="button" onClick={modifier} className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Modifier mon objectif
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={continuer} className="mt-6 flex flex-col gap-4">
          <label htmlFor="objectif" className="sr-only">
            {enPrecision ? "Votre précision" : "Votre objectif"}
          </label>
          <textarea
            id="objectif"
            ref={champ}
            rows={enPrecision ? 2 : 3}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={enPrecision ? "Votre précision" : EXEMPLE}
            maxLength={800}
            className={`${classeChamp} resize-none`}
          />
          {erreur ? <p className="text-sm text-[var(--red-1)]">{erreur}</p> : null}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={enCours}
              className="rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
            >
              {enCours ? "Lecture de votre objectif…" : "Continuer"}
            </button>
            {textes.length > 0 ? (
              <button type="button" onClick={modifier} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                Recommencer
              </button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}

function Recapitulatif({ objectif }: { objectif: ObjectifStructure }) {
  return (
    <dl className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:grid-cols-3">
      <div>
        <dt className="text-xs text-[var(--text-faint)]">Indicateur</dt>
        <dd className="mt-1">{objectif.metric_label}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--text-faint)]">Évolution visée</dt>
        <dd className="mt-1">{decrireVariation(objectif)}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--text-faint)]">Échéance</dt>
        <dd className="mt-1">
          {formaterEcheance(objectif.deadline.echeance)}
          <span className="text-[var(--text-faint)]"> · {decrireDelai(objectif)}</span>
        </dd>
      </div>
    </dl>
  );
}

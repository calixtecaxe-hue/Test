"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AgentIcone } from "@/components/marketing/agent-icone";
import { AGENTS, couleurAgent } from "@/lib/agents";
import demo from "@/lib/demo-outil.json";

type Etape = "agent" | "profil" | "questionnaire" | "resultat";

type DemoAgent = {
  questions: { libelle: string; reponse: string; statut: string }[];
  indicateurs?: string[];
  action?: string;
  propositions?: string[];
};

type Zoom = { echelle: number; origine: string };
type Curseur = { x: number; y: number; visible: boolean };

const DEMO_AGENTS = demo.agents as Record<string, DemoAgent>;

const ETAPES: { id: Etape; libelle: string }[] = [
  { id: "agent", libelle: "Agent" },
  { id: "profil", libelle: "Profil" },
  { id: "questionnaire", libelle: "Questionnaire" },
  { id: "resultat", libelle: "Résultat" },
];

// Règle d'agrégation du produit (CLAUDE.md section 7) : vert 100, orange 50,
// rouge 0 ; le score est la moyenne des indicateurs notés, les indicateurs
// informatifs n'y entrent pas.
const NOTE: Record<string, number> = { Vert: 100, Orange: 50, Rouge: 0 };

const COULEUR_STATUT: Record<string, string> = {
  Vert: "#6fcf97",
  Orange: "var(--amber-1)",
  Rouge: "var(--red-1)",
  Informatif: "var(--text-faint)",
};

const ZOOM_NEUTRE: Zoom = { echelle: 1, origine: "50% 0%" };
const REQUETE_MOUVEMENT_REDUIT = "(prefers-reduced-motion: reduce)";

function useMouvementReduit(): boolean {
  return useSyncExternalStore(
    (notifier) => {
      const media = window.matchMedia(REQUETE_MOUVEMENT_REDUIT);
      media.addEventListener("change", notifier);
      return () => media.removeEventListener("change", notifier);
    },
    () => window.matchMedia(REQUETE_MOUVEMENT_REDUIT).matches,
    () => false
  );
}

// Le score monte de 0 à sa valeur ; remonté à chaque affichage du résultat
// (clé), il repart donc de zéro sans effet de synchronisation.
function Score({ cible, reduit }: { cible: number; reduit: boolean }) {
  const [valeur, setValeur] = useState(reduit ? cible : 0);

  useEffect(() => {
    if (reduit) return;
    const minuteur = setInterval(() => {
      setValeur((v) => {
        if (v >= cible) {
          clearInterval(minuteur);
          return cible;
        }
        return Math.min(cible, v + Math.max(1, Math.round(cible / 22)));
      });
    }, 45);
    return () => clearInterval(minuteur);
  }, [cible, reduit]);

  return (
    <>
      <p className="mt-3 flex items-baseline gap-2" data-cible="score">
        <span className="font-[family-name:var(--titre)] text-5xl font-bold">
          {valeur}
        </span>
        <span className="text-[var(--text-muted)]">/ 100</span>
      </p>
      <div className="fenetre-barre">
        <div style={{ width: `${valeur}%` }} />
      </div>
    </>
  );
}

// Aperçu du parcours : choix d'un agent, profil prérempli, questionnaire de
// cinq questions, résultat. Une démo automatique le joue seule (curseur,
// zooms, réponses écrites lettre par lettre) et s'arrête dès que la
// personne reprend la main. Questions, profil et résultats sont des
// exemples fictifs (légende sous la fenêtre) ; les questionnaires réels des
// agents autres qu'Acquisition n'existent pas encore.
export function FenetreOutil() {
  const [etape, setEtape] = useState<Etape>("agent");
  const [indexAgent, setIndexAgent] = useState(0);
  const [questionsAffichees, setQuestionsAffichees] = useState(0);
  const [auto, setAuto] = useState(true);
  const [curseur, setCurseur] = useState<Curseur>({ x: 0, y: 0, visible: false });
  const [clics, setClics] = useState(0);
  const [presse, setPresse] = useState(false);
  const [zoom, setZoom] = useState<Zoom>(ZOOM_NEUTRE);
  const [saisie, setSaisie] = useState<{ i: number; texte: string } | null>(null);
  const [valides, setValides] = useState(0);
  const [survol, setSurvol] = useState<string | null>(null);
  const reduit = useMouvementReduit();
  const fenetreRef = useRef<HTMLDivElement>(null);
  const corpsRef = useRef<HTMLDivElement>(null);

  const autoActif = auto && !reduit;
  const agent = AGENTS[indexAgent];
  const couleur = couleurAgent[agent.couleur];
  const donnees = DEMO_AGENTS[agent.code];
  const total = donnees.questions.length;
  const visibles = reduit ? total : questionsAffichees;

  function choisir(index: number) {
    setIndexAgent(index);
    setQuestionsAffichees(0);
    setValides(0);
    setEtape("profil");
  }

  function versQuestionnaire() {
    setQuestionsAffichees(0);
    setValides(0);
    setEtape("questionnaire");
  }

  function versResultat() {
    setQuestionsAffichees(total);
    setEtape("resultat");
  }

  function arreterDemo() {
    setAuto(false);
    setCurseur((c) => ({ ...c, visible: false }));
    setZoom(ZOOM_NEUTRE);
    setSaisie(null);
    setSurvol(null);
  }

  function relancerDemo() {
    setEtape("agent");
    setQuestionsAffichees(0);
    setValides(0);
    setSaisie(null);
    setAuto(true);
  }

  // Déroulé automatique : le curseur va vers l'élément visé, clique, la
  // caméra zoome sur la zone utile, les réponses s'écrivent lettre par
  // lettre. Il passe d'un agent au suivant en boucle.
  useEffect(() => {
    if (!autoActif) return;
    const ctl = { minuteurs: [] as ReturnType<typeof setTimeout>[] };

    const pause = (ms: number) =>
      new Promise<void>((resoudre) => {
        ctl.minuteurs.push(setTimeout(resoudre, ms));
      });

    const cible = (nom: string) =>
      fenetreRef.current?.querySelector<HTMLElement>(`[data-cible="${nom}"]`) ?? null;

    async function deplacer(nom: string, positionX = 0.5) {
      const element = cible(nom);
      const fenetre = fenetreRef.current;
      if (!element || !fenetre) return;
      const f = fenetre.getBoundingClientRect();
      const r = element.getBoundingClientRect();
      setCurseur({
        x: r.left - f.left + r.width * positionX,
        y: r.top - f.top + r.height * 0.55,
        visible: true,
      });
      await pause(600);
    }

    async function cliquer(nom?: string) {
      if (nom) setSurvol(nom);
      await pause(320);
      setClics((c) => c + 1);
      setPresse(true);
      await pause(170);
      setPresse(false);
      setSurvol(null);
    }

    function defilerBas() {
      const corps = corpsRef.current;
      if (corps) corps.scrollTop = corps.scrollHeight;
    }

    async function jouerAgent(i: number) {
      const questions = DEMO_AGENTS[AGENTS[i].code].questions;

      setZoom(ZOOM_NEUTRE);
      setEtape("agent");
      setQuestionsAffichees(0);
      setValides(0);
      setSaisie(null);
      await pause(1300);

      await deplacer(`agent-${i}`, 0.35);
      await cliquer(`agent-${i}`);
      setIndexAgent(i);
      setEtape("profil");
      await pause(250);

      setZoom({ echelle: 1.07, origine: "50% 25%" });
      await pause(900);
      await deplacer("profil-0", 0.8);
      await pause(900);
      await deplacer("profil-4", 0.8);
      await pause(900);

      setZoom(ZOOM_NEUTRE);
      await pause(800);
      await deplacer("questionnaire");
      await cliquer("questionnaire");
      setQuestionsAffichees(0);
      setEtape("questionnaire");
      await pause(500);

      setZoom({ echelle: 1.12, origine: "0% 12%" });
      await pause(800);

      for (let q = 0; q < questions.length; q++) {
        setQuestionsAffichees(q + 1);
        setSaisie({ i: q, texte: "" });
        await pause(160);
        defilerBas();
        await pause(350);

        await deplacer(`champ-${q}`, 0.12);
        await cliquer();
        const reponse = questions[q].reponse;
        for (let k = 1; k <= reponse.length; k++) {
          setSaisie({ i: q, texte: reponse.slice(0, k) });
          await pause(55);
        }
        await pause(350);

        await deplacer(`valider-${q}`);
        await cliquer(`valider-${q}`);
        setValides(q + 1);
        setSaisie(null);
        await pause(450);
      }

      setZoom(ZOOM_NEUTRE);
      setEtape("resultat");
      await pause(900);
      await deplacer("score", 0.2);
      setZoom({ echelle: 1.12, origine: "15% 20%" });
      await pause(2000);
      setZoom(ZOOM_NEUTRE);
      await pause(900);
      await deplacer("carte", 0.4);
      await pause(2200);

      await deplacer("agent");
      await cliquer("agent");
    }

    async function boucle() {
      await pause(0);
      let i = 0;
      for (;;) {
        await jouerAgent(i);
        i = (i + 1) % AGENTS.length;
      }
    }

    void boucle();
    return () => ctl.minuteurs.forEach(clearTimeout);
  }, [autoActif]);

  // Avance automatique du mode manuel (démo arrêtée) : profil puis
  // questions qui se remplissent.
  useEffect(() => {
    if (reduit || autoActif) return;
    let minuteur: ReturnType<typeof setTimeout> | undefined;

    if (etape === "profil") {
      minuteur = setTimeout(() => {
        setQuestionsAffichees(0);
        setEtape("questionnaire");
      }, 3200);
    } else if (etape === "questionnaire") {
      minuteur =
        questionsAffichees < total
          ? setTimeout(
              () => setQuestionsAffichees(questionsAffichees + 1),
              questionsAffichees === 0 ? 500 : 1800
            )
          : setTimeout(() => setEtape("resultat"), 1500);
    }
    return () => clearTimeout(minuteur);
  }, [etape, questionsAffichees, reduit, autoActif, total]);

  useEffect(() => {
    const corps = corpsRef.current;
    if (!corps || autoActif) return;
    corps.scrollTo({ top: corps.scrollHeight, behavior: reduit ? "auto" : "smooth" });
  }, [etape, visibles, reduit, autoActif]);

  const notes = donnees.questions.flatMap((q) =>
    q.statut in NOTE ? [NOTE[q.statut]] : []
  );
  const score = notes.length
    ? Math.round(notes.reduce((a, b) => a + b, 0) / notes.length)
    : 0;
  const indexEtape = ETAPES.findIndex((e) => e.id === etape);
  const classeSurvol = (nom: string) => (survol === nom ? "survol" : "");

  return (
    <figure className="m-0">
      <div
        className="fenetre"
        ref={fenetreRef}
        onPointerDown={() => {
          if (autoActif) arreterDemo();
        }}
      >
        <div className="fenetre-haut">
          <div className="fenetre-points" aria-hidden="true">
            <span style={{ background: "var(--red-1)" }} />
            <span style={{ background: "var(--white-1)" }} />
            <span style={{ background: "var(--blue-1)" }} />
          </div>
          <ol className="demo-etapes" aria-label="Étapes du parcours">
            {ETAPES.map((e, i) => (
              <li
                key={e.id}
                className={`demo-etape ${i === indexEtape ? "actif" : ""} ${i < indexEtape ? "fait" : ""}`}
                aria-current={i === indexEtape ? "step" : undefined}
              >
                <span className="demo-etape-num">{i < indexEtape ? "✓" : i + 1}</span>
                <span className="demo-etape-texte">{e.libelle}</span>
              </li>
            ))}
          </ol>
          {reduit ? null : (
            <button
              type="button"
              className="demo-lecture"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => (autoActif ? arreterDemo() : relancerDemo())}
            >
              {autoActif ? "Arrêter la démo" : "Lancer la démo"}
            </button>
          )}
        </div>

        <div className="demo-corps" ref={corpsRef} aria-live="polite">
          <div
            className="demo-zone"
            style={{
              transform: `scale(${zoom.echelle})`,
              transformOrigin: zoom.origine,
            }}
          >
            {etape === "agent" ? (
              <div key="agent">
                <h3 className="demo-titre">Choisissez un agent</h3>
                <p className="demo-sous">
                  Chaque agent couvre un périmètre précis. Cliquez sur celui que
                  vous souhaitez essayer.
                </p>
                <div className="demo-agents">
                  {AGENTS.map((a, index) => (
                    <button
                      key={a.code}
                      type="button"
                      data-cible={`agent-${index}`}
                      className={`demo-agent ${classeSurvol(`agent-${index}`)}`}
                      style={{ animationDelay: `${index * 90}ms` }}
                      onClick={() => choisir(index)}
                    >
                      <span
                        className="fenetre-agent-icone"
                        style={{ background: couleurAgent[a.couleur].barre }}
                        aria-hidden="true"
                      >
                        <AgentIcone code={a.code} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span
                          className="demo-agent-nom block"
                          style={{ color: couleurAgent[a.couleur].texte }}
                        >
                          {a.nom}
                        </span>
                        <span className="demo-agent-nature block">
                          {a.nature === "diagnostic" ? "Diagnostic" : "Génératif"}
                        </span>
                        <span className="demo-agent-couvre block">{a.couvre}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {etape === "profil" ? (
              <div key="profil">
                <h3 className="demo-titre" style={{ color: couleur.texte }}>
                  {agent.nom}
                </h3>
                <p className="demo-sous">
                  Vos informations, saisies une seule fois à l&apos;inscription,
                  sont déjà renseignées.
                </p>
                <div className="demo-profil">
                  {demo.profil.map((ligne, i) => (
                    <div
                      key={ligne.libelle}
                      className="demo-ligne"
                      data-cible={`profil-${i}`}
                      style={{ animationDelay: `${i * 260}ms` }}
                    >
                      <span className="l">{ligne.libelle}</span>
                      <span className="v">{ligne.valeur}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {etape === "questionnaire" ? (
              <div key="questionnaire">
                <h3 className="demo-titre">Questionnaire généré pour votre métier</h3>
                <p className="demo-sous">
                  Question {Math.min(Math.max(visibles, 1), total)} sur {total}.
                  Aucune n&apos;est obligatoire.
                </p>
                <div className="fenetre-barre">
                  <div
                    style={{
                      width: `${(Math.max(autoActif ? valides : visibles, 0) / total) * 100}%`,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <div className="mt-2">
                  {donnees.questions.slice(0, visibles).map((q, i) => {
                    const enSaisie = autoActif && saisie?.i === i;
                    return (
                      <div key={q.libelle} className="demo-q">
                        <span className="demo-q-num">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="demo-q-libelle">{q.libelle}</p>
                          {enSaisie ? (
                            <div className="demo-saisie">
                              <span className="demo-champ" data-cible={`champ-${i}`}>
                                {saisie.texte === "" ? (
                                  <span className="demo-placeholder">Votre réponse</span>
                                ) : (
                                  saisie.texte
                                )}
                                <span className="demo-caret" />
                              </span>
                              <span
                                className={`demo-valider ${classeSurvol(`valider-${i}`)}`}
                                data-cible={`valider-${i}`}
                                aria-hidden="true"
                              >
                                Valider
                              </span>
                            </div>
                          ) : (
                            <>
                              <span className={`demo-reponse ${i < valides ? "fige" : ""}`}>
                                {q.reponse}
                              </span>
                              <span className="demo-ok" aria-hidden="true">✓</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {etape === "resultat" ? (
              <div key={`resultat-${indexAgent}`}>
                <h3 className="demo-titre" style={{ color: couleur.texte }}>
                  {agent.nom}
                </h3>
                {donnees.propositions ? (
                  <>
                    <p className="demo-sous">Analyse de vos publications</p>
                    <ul className="fenetre-indicateurs">
                      {donnees.questions.map((q, i) => (
                        <li key={q.libelle}>
                          <span>{donnees.indicateurs?.[i]}</span>
                          <span className="fenetre-statut">{q.reponse}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="demo-carte" data-cible="carte">
                      <p className="demo-carte-titre">Propositions de contenu</p>
                      <ul className="demo-propositions">
                        {donnees.propositions.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                      <p className="demo-note">
                        Générées à votre demande, jamais automatiquement.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="demo-sous">Calculé à partir de seuils fixes</p>
                    <Score cible={score} reduit={reduit} />
                    <ul className="fenetre-indicateurs">
                      {donnees.questions.map((q, i) => (
                        <li key={q.libelle}>
                          <span>{donnees.indicateurs?.[i]}</span>
                          <span className="fenetre-statut">
                            <span
                              className="fenetre-point"
                              style={{ background: COULEUR_STATUT[q.statut] }}
                            />
                            {q.statut}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="demo-carte" data-cible="carte">
                      <p className="demo-carte-titre">Action prioritaire</p>
                      <p className="demo-action">{donnees.action}</p>
                      <p className="demo-note">
                        Les indicateurs informatifs n&apos;entrent pas dans le score.
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="demo-pied">
          {etape === "agent" ? (
            <span className="demo-indice">Choisissez l&apos;agent à essayer</span>
          ) : null}
          {etape === "profil" ? (
            <>
              <span className="demo-indice">Informations saisies à l&apos;inscription</span>
              <button
                type="button"
                data-cible="questionnaire"
                className={`fenetre-action principal ${classeSurvol("questionnaire")}`}
                onClick={versQuestionnaire}
              >
                Générer le questionnaire
              </button>
            </>
          ) : null}
          {etape === "questionnaire" ? (
            <>
              <span className="demo-indice">Les réponses se remplissent</span>
              <button type="button" className="fenetre-action principal" onClick={versResultat}>
                Voir le résultat
              </button>
            </>
          ) : null}
          {etape === "resultat" ? (
            <>
              <span className="demo-indice">Exemple terminé</span>
              <div className="fenetre-actions">
                <button
                  type="button"
                  data-cible="agent"
                  className={`fenetre-action ${classeSurvol("agent")}`}
                  onClick={() => setEtape("agent")}
                >
                  Changer d&apos;agent
                </button>
                <button type="button" className="fenetre-action" onClick={() => choisir(indexAgent)}>
                  Rejouer
                </button>
                <Link href={`/agents/${agent.slug}`} className="fenetre-action principal">
                  Voir la page de l&apos;agent
                </Link>
              </div>
            </>
          ) : null}
        </div>

        <div
          className={`demo-curseur ${curseur.visible && autoActif ? "visible" : ""} ${presse ? "presse" : ""}`}
          style={{ transform: `translate(${curseur.x}px, ${curseur.y}px)` }}
          aria-hidden="true"
        >
          {clics > 0 ? <span key={clics} className="demo-onde" /> : null}
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              d="M5 3l14 8-6.2 1.6L9.8 19z"
              fill="#fff"
              stroke="#07111B"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-[var(--text-faint)]">
        Exemple illustratif : profil, questions et résultats sont fictifs.
      </figcaption>
    </figure>
  );
}

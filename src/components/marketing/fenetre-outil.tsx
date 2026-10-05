"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AgentIcone } from "@/components/marketing/agent-icone";
import { AGENTS, couleurAgent } from "@/lib/agents";
import demo from "@/lib/demo-outil.json";

type DemoAgent = {
  accueil: string;
  questions: { libelle: string; reponse: string; statut: string }[];
  parties: { nom: string; nomIndicateur: string; lecture: string; valeur?: string }[];
  synthese: string[];
  propositions?: string[];
  actions: { texte: string; retour: string }[];
  suivi: { etats: string[]; prochain: string };
};

type Bloc =
  | { t: "agent"; texte: string }
  | { t: "moi"; texte: string }
  | { t: "profil" }
  | { t: "redaction" }
  | { t: "synthese" }
  | { t: "parties" }
  | { t: "propositions" }
  | { t: "actions" }
  | { t: "suivi" };

type Phase = "attente" | "questions" | "redaction" | "fini";
type Zoom = { echelle: number; origine: string };
type Curseur = { x: number; y: number; visible: boolean };

const DEMO_AGENTS = demo.agents as Record<string, DemoAgent>;
const NB_QUESTIONS = 3;

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

const ZOOM_NEUTRE: Zoom = { echelle: 1, origine: "50% 75%" };
const ZOOM_SAISIE: Zoom = { echelle: 1.04, origine: "50% 75%" };
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

function notesDe(code: string): number[] {
  return DEMO_AGENTS[code].questions.flatMap((q) =>
    q.statut in NOTE ? [NOTE[q.statut]] : []
  );
}

function moyenne(notes: number[]): number {
  return notes.length ? Math.round(notes.reduce((a, b) => a + b, 0) / notes.length) : 0;
}

// Conversation complète d'un agent : sert de rendu direct quand les
// animations sont réduites.
function filComplet(code: string): Bloc[] {
  const d = DEMO_AGENTS[code];
  const fil: Bloc[] = [
    { t: "agent", texte: d.accueil },
    { t: "profil" },
  ];
  d.questions.forEach((q) => {
    fil.push({ t: "agent", texte: q.libelle }, { t: "moi", texte: q.reponse });
  });
  fil.push({ t: "synthese" }, { t: "parties" });
  if (d.propositions) fil.push({ t: "propositions" });
  fil.push({ t: "actions" }, { t: "suivi" });
  return fil;
}

// Le score monte de 0 à sa valeur ; remonté à chaque affichage (clé), il
// repart de zéro sans effet de synchronisation.
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
      <p className="flex items-baseline gap-2">
        <span className="font-[family-name:var(--titre)] text-5xl font-bold">{valeur}</span>
        <span className="text-[var(--text-muted)]">/ 100</span>
      </p>
      <div className="fenetre-barre">
        <div style={{ width: `${valeur}%` }} />
      </div>
    </>
  );
}

function apercuLateral(phase: Phase, actif: boolean, termine: boolean, questions: number): string {
  if (actif && phase === "fini") return "Compte rendu disponible";
  if (actif && phase === "redaction") return "Rédaction du compte rendu…";
  if (actif && phase === "questions") return `Question ${Math.min(questions, NB_QUESTIONS)} sur ${NB_QUESTIONS}`;
  if (termine) return "Compte rendu disponible";
  return "Prêt à démarrer";
}

// Aperçu du produit sous forme de messagerie : on choisit un agent dans la
// liste, son profil est déjà renseigné, il pose trois questions simples,
// puis rédige un compte rendu complet avec plan d'action et suivi. Une démo
// automatique le joue en boucle (curseur, zooms, réponses écrites lettre par
// lettre) et repart de zéro à chaque affichage de la page ; cliquer sur un
// agent relance la lecture depuis cet agent. Tout le contenu est fictif.
export function FenetreOutil() {
  const [indexAgent, setIndexAgent] = useState(0);
  const [fil, setFil] = useState<Bloc[]>([]);
  const [phase, setPhase] = useState<Phase>("attente");
  const [questions, setQuestions] = useState(0);
  const [termines, setTermines] = useState<number[]>([]);
  const [saisie, setSaisie] = useState("");
  const [lancement, setLancement] = useState({ depart: 0, n: 0 });
  const [curseur, setCurseur] = useState<Curseur>({ x: 0, y: 0, visible: false });
  const [clics, setClics] = useState(0);
  const [presse, setPresse] = useState(false);
  const [zoom, setZoom] = useState<Zoom>(ZOOM_NEUTRE);
  const [survol, setSurvol] = useState<string | null>(null);
  const reduit = useMouvementReduit();
  const fenetreRef = useRef<HTMLDivElement>(null);
  const filRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS[indexAgent];
  const couleur = couleurAgent[agent.couleur];
  const donnees = DEMO_AGENTS[agent.code];
  const affiche: Bloc[] = reduit ? filComplet(agent.code) : fil;
  const notes = notesDe(agent.code);
  const score = moyenne(notes);

  function choisirAgent(index: number) {
    if (reduit) setIndexAgent(index);
    else setLancement((l) => ({ depart: index, n: l.n + 1 }));
  }

  // Déroulé automatique : le curseur choisit l'agent dans la liste, la
  // personne « répond » (texte écrit lettre par lettre dans le champ, puis
  // envoi), le compte rendu arrive bloc par bloc. Il passe d'un agent au
  // suivant en boucle.
  useEffect(() => {
    if (reduit) return;
    const ctl = { minuteurs: [] as ReturnType<typeof setTimeout>[] };

    const pause = (ms: number) =>
      new Promise<void>((resoudre) => {
        ctl.minuteurs.push(setTimeout(resoudre, ms));
      });

    const ajouter = (bloc: Bloc) => setFil((f) => [...f, bloc]);
    const retirerRedaction = () => setFil((f) => f.filter((b) => b.t !== "redaction"));

    async function deplacer(nom: string, positionX = 0.5) {
      const fenetre = fenetreRef.current;
      const element = fenetre?.querySelector<HTMLElement>(`[data-cible="${nom}"]`);
      if (!fenetre || !element) return;
      const r = element.getBoundingClientRect();
      if (r.width === 0) return;
      const f = fenetre.getBoundingClientRect();
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

    async function ecrire(texte: string) {
      await deplacer("champ", 0.2);
      await cliquer();
      for (let k = 1; k <= texte.length; k++) {
        setSaisie(texte.slice(0, k));
        await pause(55);
      }
      await pause(350);
      await deplacer("envoyer");
      await cliquer("envoyer");
      setSaisie("");
      ajouter({ t: "moi", texte });
      await pause(450);
    }

    async function agentRepond(texte: string) {
      ajouter({ t: "redaction" });
      await pause(750);
      retirerRedaction();
      ajouter({ t: "agent", texte });
      await pause(500);
    }

    async function jouerAgent(i: number) {
      const code = AGENTS[i].code;
      const d = DEMO_AGENTS[code];

      setZoom(ZOOM_NEUTRE);
      setFil([]);
      setPhase("attente");
      setQuestions(0);
      setSaisie("");
      setIndexAgent(i);
      await pause(900);

      await deplacer(`agent-${i}`, 0.4);
      await cliquer(`agent-${i}`);
      await agentRepond(d.accueil);
      ajouter({ t: "profil" });
      await pause(1700);
      await agentRepond("Souhaitez-vous commencer ?");

      if (!window.matchMedia("(max-width: 639px)").matches) setZoom(ZOOM_SAISIE);
      await pause(800);
      await ecrire("Oui, commençons");

      setPhase("questions");
      for (let q = 0; q < d.questions.length; q++) {
        setQuestions(q + 1);
        await agentRepond(d.questions[q].libelle);
        await ecrire(d.questions[q].reponse);
      }

      setZoom(ZOOM_NEUTRE);
      setPhase("redaction");
      await agentRepond("Merci. Je rédige votre compte rendu.");
      ajouter({ t: "redaction" });
      await pause(1800);
      retirerRedaction();
      setPhase("fini");

      const blocs: Bloc[] = [{ t: "synthese" }, { t: "parties" }];
      if (d.propositions) blocs.push({ t: "propositions" });
      blocs.push({ t: "actions" }, { t: "suivi" });
      for (const bloc of blocs) {
        ajouter(bloc);
        await pause(bloc.t === "synthese" || bloc.t === "parties" ? 4500 : 3500);
      }

      setTermines((t) => (t.includes(i) ? t : [...t, i]));
      setCurseur((c) => ({ ...c, visible: false }));
      await pause(3000);
    }

    async function boucle() {
      await pause(0);
      let i = lancement.depart;
      for (;;) {
        await jouerAgent(i);
        i = (i + 1) % AGENTS.length;
        if (i === 0) setTermines([]);
      }
    }

    void boucle();
    return () => ctl.minuteurs.forEach(clearTimeout);
  }, [reduit, lancement]);

  // La conversation défile vers le dernier message à chaque ajout.
  useEffect(() => {
    const zone = filRef.current;
    if (!zone) return;
    zone.scrollTo({ top: zone.scrollHeight, behavior: reduit ? "auto" : "smooth" });
  }, [affiche.length, reduit]);

  const classeSurvol = (nom: string) => (survol === nom ? "survol" : "");

  function rendreBloc(bloc: Bloc, i: number) {
    switch (bloc.t) {
      case "agent":
        return (
          <div key={i} className="msg msg-agent">
            {bloc.texte}
          </div>
        );
      case "moi":
        return (
          <div key={i} className="msg msg-moi">
            {bloc.texte}
          </div>
        );
      case "redaction":
        return (
          <div key={i} className="msg msg-agent" aria-label="Rédaction en cours">
            <span className="msg-points">
              <i />
              <i />
              <i />
            </span>
          </div>
        );
      case "profil":
        return (
          <div key={i} className="msg msg-carte">
            <p className="msg-titre">Profil renseigné à l&apos;inscription</p>
            <div className="demo-profil">
              {demo.profil.map((ligne) => (
                <div key={ligne.libelle} className="demo-ligne">
                  <span className="l">{ligne.libelle}</span>
                  <span className="v">{ligne.valeur}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "synthese":
        return (
          <div key={i} className="msg msg-carte">
            <p className="msg-titre">Compte rendu · {agent.nom}</p>
            {donnees.propositions ? null : (
              <div className="demo-score">
                <Score key={`score-${indexAgent}`} cible={score} reduit={reduit} />
                <p className="demo-note">Score calculé à partir de seuils fixes.</p>
              </div>
            )}
            {donnees.synthese.map((p) => (
              <p key={p} className="demo-paragraphe">
                {p}
              </p>
            ))}
          </div>
        );
      case "parties":
        return (
          <div key={i} className="msg msg-carte">
            <p className="msg-titre">
              {donnees.propositions ? "Analyse de vos publications" : "Détail par partie"}
            </p>
            <ul className="demo-parties">
              {donnees.parties.map((p, k) => {
                const statut = donnees.questions[k].statut;
                return (
                  <li key={p.nom}>
                    <div className="demo-partie-tete">
                      <span className="demo-partie-nom">{p.nom}</span>
                      {p.valeur ? (
                        <span className="demo-partie-valeur">{p.valeur}</span>
                      ) : (
                        <span className="fenetre-statut">
                          <span
                            className="fenetre-point"
                            style={{ background: COULEUR_STATUT[statut] }}
                          />
                          {statut} · {NOTE[statut]}
                        </span>
                      )}
                    </div>
                    {p.valeur ? null : (
                      <div className="demo-partie-barre">
                        <div
                          style={{
                            width: `${NOTE[statut]}%`,
                            background: COULEUR_STATUT[statut],
                            animationDelay: `${k * 150}ms`,
                          }}
                        />
                      </div>
                    )}
                    <p className="demo-partie-lecture">
                      <b>{p.nomIndicateur}.</b> {p.lecture}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      case "propositions":
        return (
          <div key={i} className="msg msg-carte">
            <p className="msg-titre">Propositions de contenu</p>
            <ul className="demo-propositions">
              {donnees.propositions?.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="demo-note">Générées à votre demande, jamais automatiquement.</p>
          </div>
        );
      case "actions":
        return (
          <div key={i} className="msg msg-carte">
            <p className="msg-titre">Plan d&apos;action</p>
            <ol className="demo-actions">
              {donnees.actions.map((a) => (
                <li key={a.texte}>
                  <span>{a.texte}</span>
                  <span className="demo-retour">{a.retour}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      case "suivi":
        return (
          <div key={i} className="msg msg-carte">
            <p className="msg-titre">Suivi</p>
            <ul className="demo-suivi">
              {donnees.actions.map((a, k) => {
                const etat = donnees.suivi.etats[k];
                return (
                  <li key={a.texte}>
                    <span>{a.texte}</span>
                    <span
                      className={`demo-etat ${
                        etat === "En cours" ? "en-cours" : etat === "Fait" ? "fait" : ""
                      }`}
                    >
                      {etat}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="demo-prochain">{donnees.suivi.prochain}</p>
            <p className="demo-note">
              Chaque action a son propre délai de retour : le suivi suit votre rythme.
            </p>
          </div>
        );
    }
  }

  return (
    <figure className="m-0">
      <div className="fenetre" ref={fenetreRef}>
        <div className="fenetre-haut">
          <div className="fenetre-points" aria-hidden="true">
            <span style={{ background: "var(--red-1)" }} />
            <span style={{ background: "var(--white-1)" }} />
            <span style={{ background: "var(--blue-1)" }} />
          </div>
          <span className="fenetre-titre">CAXE · Mes agents</span>
        </div>

        <div className="demo-corps">
          <div
            className="demo-zone"
            style={{
              transform: `scale(${zoom.echelle})`,
              transformOrigin: zoom.origine,
            }}
          >
            <aside className="demo-liste" aria-label="Agents">
              {AGENTS.map((a, index) => (
                <button
                  key={a.code}
                  type="button"
                  data-cible={`agent-${index}`}
                  aria-current={index === indexAgent ? "true" : undefined}
                  className={`demo-item ${index === indexAgent ? "actif" : ""} ${classeSurvol(`agent-${index}`)}`}
                  onClick={() => choisirAgent(index)}
                >
                  <span
                    className="fenetre-agent-icone"
                    style={{ background: couleurAgent[a.couleur].barre }}
                    aria-hidden="true"
                  >
                    <AgentIcone code={a.code} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="demo-item-nom">{a.nom}</span>
                    <span className="demo-item-apercu">
                      {reduit
                        ? "Compte rendu disponible"
                        : apercuLateral(
                            phase,
                            index === indexAgent,
                            termines.includes(index),
                            questions
                          )}
                    </span>
                  </span>
                </button>
              ))}
            </aside>

            <section className="demo-chat" aria-label={`Conversation avec ${agent.nom}`}>
              <header className="demo-chat-haut">
                <span className="demo-chat-nom" style={{ color: couleur.texte }}>
                  {agent.nom}
                </span>
                <Link href={`/agents/${agent.slug}`} className="demo-chat-lien">
                  Page de l&apos;agent
                </Link>
              </header>
              <div className="demo-fil" ref={filRef} aria-live="polite">
                {affiche.map(rendreBloc)}
              </div>
              <div className="demo-saisie-barre">
                <span
                  className={`demo-champ ${saisie ? "plein" : ""}`}
                  data-cible="champ"
                >
                  {saisie ? (
                    <>
                      {saisie}
                      <span className="demo-caret" />
                    </>
                  ) : (
                    <span className="demo-placeholder">Message à {agent.nom}</span>
                  )}
                </span>
                <span
                  className={`demo-envoyer ${classeSurvol("envoyer")}`}
                  data-cible="envoyer"
                  aria-hidden="true"
                >
                  Envoyer
                </span>
              </div>
            </section>
          </div>
        </div>

        <div
          className={`demo-curseur ${curseur.visible && !reduit ? "visible" : ""} ${presse ? "presse" : ""}`}
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

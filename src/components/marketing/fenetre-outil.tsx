"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AgentIcone } from "@/components/marketing/agent-icone";
import { AGENTS, couleurAgent } from "@/lib/agents";
import demo from "@/lib/demo-outil.json";

type DemoAgent = {
  accueil: string;
  questions: { libelle: string; reponse: string; statut: string; options: string[] }[];
  libre: { libelle: string; reponse: string };
  parties: { nom: string; nomIndicateur: string; lecture: string; valeur?: string }[];
  synthese: string[];
  propositions?: string[];
  actions: { texte: string; retour: string }[];
  suivi: { etats: string[]; prochain: string };
  point: {
    atteintes: number[];
    nonAtteinte: number;
    raison: string;
    nouvelAxe: { texte: string; retour: string };
  };
};

type Bloc =
  | { t: "agent"; texte: string }
  | { t: "moi"; texte: string }
  | { t: "profil" }
  | { t: "commencer" }
  | { t: "questionnaire" }
  | { t: "redaction" }
  | { t: "synthese" }
  | { t: "parties" }
  | { t: "propositions" }
  | { t: "actions" }
  | { t: "suivi" }
  | { t: "point" }
  | { t: "bilan" };

type Vue = "fil" | "questionnaire";
type Phase = "attente" | "questions" | "redaction" | "fini";
type Zoom = { echelle: number; origine: string };
type Curseur = { x: number; y: number; visible: boolean };

const DEMO_AGENTS = demo.agents as Record<string, DemoAgent>;
const RAISONS = demo.raisons;
const NB_QUESTIONS = 4; // trois questions fermées et une précision facultative

// Les quatre temps du parcours, affichés en haut de la fenêtre : le
// questionnaire n'est que le point de départ du compte rendu et du suivi.
const PARCOURS = ["Inscription", "Questionnaire", "Compte rendu", "Suivi"];

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
  fil.push({ t: "questionnaire" });
  fil.push({ t: "synthese" }, { t: "parties" });
  if (d.propositions) fil.push({ t: "propositions" });
  fil.push({ t: "actions" }, { t: "suivi" }, { t: "point" }, { t: "bilan" });
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
  if (actif && phase === "questions") return `Réponse ${Math.min(Math.max(questions, 1), NB_QUESTIONS)} sur ${NB_QUESTIONS}`;
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
  const [vue, setVue] = useState<Vue>("fil");
  const [choixQ, setChoixQ] = useState<Record<number, number>>({});
  const [libreTexte, setLibreTexte] = useState("");
  const [libreActif, setLibreActif] = useState(false);
  const [lancement, setLancement] = useState({ depart: 0, n: 0 });
  const [curseur, setCurseur] = useState<Curseur>({ x: 0, y: 0, visible: false });
  const [clics, setClics] = useState(0);
  const [presse, setPresse] = useState(false);
  const [zoom, setZoom] = useState<Zoom>(ZOOM_NEUTRE);
  const [survol, setSurvol] = useState<string | null>(null);
  const [parcours, setParcours] = useState(0);
  const [inscription, setInscription] = useState(false);
  const [formulaire, setFormulaire] = useState<{ valeurs: string[]; actif: number }>({
    valeurs: demo.profil.map(() => ""),
    actif: -1,
  });
  const [notif, setNotif] = useState(false);
  const [choix, setChoix] = useState<Record<number, "atteint" | "non">>({});
  const [raison, setRaison] = useState<string | null>(null);
  const [pointValide, setPointValide] = useState(false);
  const reduit = useMouvementReduit();
  const fenetreRef = useRef<HTMLDivElement>(null);
  const filRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS[indexAgent];
  const couleur = couleurAgent[agent.couleur];
  const donnees = DEMO_AGENTS[agent.code];
  const affiche: Bloc[] = reduit ? filComplet(agent.code) : fil;
  const notes = notesDe(agent.code);
  const score = moyenne(notes);
  const pointFinal = reduit
    ? {
        choix: Object.fromEntries([
          ...donnees.point.atteintes.map((k) => [k, "atteint"]),
          [donnees.point.nonAtteinte, "non"],
        ]) as Record<number, "atteint" | "non">,
        raison: donnees.point.raison,
        valide: true,
      }
    : { choix, raison, valide: pointValide };
  const etapeParcours = reduit ? 3 : parcours;

  function choisirAgent(index: number) {
    if (reduit) setIndexAgent(index);
    else setLancement((l) => ({ depart: index, n: l.n + 1 }));
  }

  // Déroulé automatique : le curseur choisit l'agent dans la liste, remplit
  // le questionnaire (clics sur les réponses, précision écrite lettre par
  // lettre), puis le compte rendu et le suivi arrivent bloc par bloc. Il
  // passe d'un agent au suivant en boucle, et s'arrête quand la fenêtre
  // n'est plus visible.
  useEffect(() => {
    if (reduit) return;
    const ctl = { minuteurs: [] as ReturnType<typeof setTimeout>[] };

    // La lecture se met en pause quand la fenêtre n'est plus visible (hors
    // écran ou onglet masqué) et reprend là où elle s'était arrêtée.
    let visible = false;
    let onglet = document.visibilityState === "visible";
    const observateur = new IntersectionObserver(
      ([entree]) => {
        visible = entree.isIntersecting;
      },
      { threshold: 0.2 }
    );
    if (fenetreRef.current) observateur.observe(fenetreRef.current);
    const surOnglet = () => {
      onglet = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", surOnglet);

    const pause = (ms: number) =>
      new Promise<void>((resoudre) => {
        let reste = ms;
        const avancer = () => {
          const pas = visible && onglet ? Math.min(reste, 100) : 100;
          ctl.minuteurs.push(
            setTimeout(() => {
              if (visible && onglet) reste -= pas;
              if (reste <= 0) resoudre();
              else avancer();
            }, pas)
          );
        };
        avancer();
      });

    const ajouter = (bloc: Bloc) => setFil((f) => [...f, bloc]);
    const retirerRedaction = () => setFil((f) => f.filter((b) => b.t !== "redaction"));

    async function deplacer(nom: string, positionX = 0.5) {
      const fenetre = fenetreRef.current;
      const element = fenetre?.querySelector<HTMLElement>(`[data-cible="${nom}"]`);
      if (!fenetre || !element) return;
      const defil = filRef.current;
      if (defil?.contains(element)) {
        const re = element.getBoundingClientRect();
        const rd = defil.getBoundingClientRect();
        if (re.bottom > rd.bottom - 12 || re.top < rd.top + 12) {
          defil.scrollTo({ top: defil.scrollTop + (re.top - rd.top) - rd.height / 3, behavior: "auto" });
          await pause(80);
        }
      }
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

    async function remplirFormulaire() {
      setFormulaire({ valeurs: demo.profil.map(() => ""), actif: -1 });
      setInscription(true);
      setParcours(0);
      await pause(1100);
      for (let k = 0; k < demo.profil.length; k++) {
        await deplacer(`form-${k}`, 0.2);
        await cliquer();
        const texte = demo.profil[k].valeur;
        for (let c = 1; c <= texte.length; c++) {
          setFormulaire((f) => ({
            actif: k,
            valeurs: f.valeurs.map((v, j) => (j === k ? texte.slice(0, c) : v)),
          }));
          await pause(32);
        }
        await pause(220);
      }
      setFormulaire((f) => ({ ...f, actif: -1 }));
      await deplacer("creer");
      await cliquer("creer");
      setInscription(false);
      setParcours(1);
      await pause(900);
    }

    async function pointEtape(d: DemoAgent) {
      const { atteintes, nonAtteinte, raison: motif } = d.point;
      setParcours(3);
      await pause(1400);
      setNotif(true);
      await pause(1800);
      await deplacer("notif", 0.5);
      await cliquer("notif");
      setNotif(false);
      await agentRepond("Point d'étape : indiquez les actions atteintes. Pour les autres, dites-moi pourquoi, afin que je vous propose un autre axe.");
      ajouter({ t: "point" });
      await pause(1000);
      for (const k of atteintes) {
        await deplacer(`atteint-${k}`, 0.5);
        await cliquer(`atteint-${k}`);
        setChoix((c) => ({ ...c, [k]: "atteint" }));
        await pause(350);
      }
      await deplacer(`non-${nonAtteinte}`, 0.5);
      await cliquer(`non-${nonAtteinte}`);
      setChoix((c) => ({ ...c, [nonAtteinte]: "non" }));
      await pause(800);
      await deplacer(`raison-${RAISONS.indexOf(motif)}`, 0.5);
      await cliquer(`raison-${RAISONS.indexOf(motif)}`);
      setRaison(motif);
      await pause(700);
      await deplacer("valider-point", 0.5);
      await cliquer("valider-point");
      setPointValide(true);
      await agentRepond("Merci. Votre réponse est prise en compte : voici l'axe suivant.");
      ajouter({ t: "bilan" });
      await pause(6000);
    }

    async function agentRepond(texte: string) {
      ajouter({ t: "redaction" });
      await pause(750);
      retirerRedaction();
      ajouter({ t: "agent", texte });
      await pause(500);
    }

    async function jouerAgent(i: number, avecInscription: boolean) {
      const code = AGENTS[i].code;
      const d = DEMO_AGENTS[code];

      setZoom(ZOOM_NEUTRE);
      setFil([]);
      setNotif(false);
      setVue("fil");
      setChoixQ({});
      setLibreTexte("");
      setLibreActif(false);
      setChoix({});
      setRaison(null);
      setPointValide(false);
      setParcours(avecInscription ? 0 : 1);
      setPhase("attente");
      setQuestions(0);
      setIndexAgent(i);
      if (avecInscription) await remplirFormulaire();
      setParcours(1);
      await pause(900);

      await deplacer(`agent-${i}`, 0.4);
      await cliquer(`agent-${i}`);
      await agentRepond(d.accueil);
      ajouter({ t: "profil" });
      await pause(1700);
      await agentRepond(
        "Le questionnaire est prêt. Ses questions sont rédigées à l'avance et identiques pour tous les dirigeants de votre métier."
      );
      ajouter({ t: "commencer" });
      await pause(900);
      await deplacer("commencer");
      await cliquer("commencer");
      setVue("questionnaire");
      setPhase("questions");
      if (!window.matchMedia("(max-width: 639px)").matches) setZoom(ZOOM_SAISIE);
      await pause(1000);

      for (let q = 0; q < d.questions.length; q++) {
        const j = d.questions[q].options.indexOf(d.questions[q].reponse);
        await deplacer(`option-${q}-${j}`);
        await cliquer(`option-${q}-${j}`);
        setChoixQ((c) => ({ ...c, [q]: j }));
        setQuestions(q + 1);
        await pause(450);
      }
      await deplacer("libre", 0.15);
      await cliquer();
      setLibreActif(true);
      for (let k = 1; k <= d.libre.reponse.length; k++) {
        setLibreTexte(d.libre.reponse.slice(0, k));
        await pause(45);
      }
      await pause(500);
      setLibreActif(false);
      setQuestions(NB_QUESTIONS);
      await deplacer("terminer");
      await cliquer("terminer");
      setVue("fil");
      ajouter({ t: "moi", texte: "Questionnaire envoyé : 3 réponses et 1 précision." });
      await pause(700);

      setZoom(ZOOM_NEUTRE);
      setParcours(2);
      setPhase("redaction");
      await agentRepond("Le questionnaire n'est que le point de départ. Je rédige votre compte rendu : il sert de base à votre suivi.");
      ajouter({ t: "redaction" });
      await pause(1800);
      retirerRedaction();
      setPhase("fini");

      const blocs: Bloc[] = [{ t: "synthese" }, { t: "parties" }];
      if (d.propositions) blocs.push({ t: "propositions" });
      blocs.push({ t: "actions" }, { t: "suivi" });
      for (const bloc of blocs) {
        ajouter(bloc);
        await pause(bloc.t === "synthese" || bloc.t === "parties" ? 4200 : 3200);
      }

      await pointEtape(d);

      setTermines((t) => (t.includes(i) ? t : [...t, i]));
      setCurseur((c) => ({ ...c, visible: false }));
      await pause(1500);
    }

    async function boucle() {
      await pause(0);
      let i = lancement.depart;
      let avecInscription = lancement.n === 0;
      for (;;) {
        await jouerAgent(i, avecInscription);
        avecInscription = false;
        i = (i + 1) % AGENTS.length;
        if (i === 0) {
          setTermines([]);
          avecInscription = true;
        }
      }
    }

    void boucle();
    return () => {
      ctl.minuteurs.forEach(clearTimeout);
      observateur.disconnect();
      document.removeEventListener("visibilitychange", surOnglet);
    };
  }, [reduit, lancement]);

  // La conversation défile vers le dernier message à chaque ajout.
  useEffect(() => {
    const zone = filRef.current;
    if (!zone) return;
    zone.scrollTo({
      top: vue === "questionnaire" ? 0 : zone.scrollHeight,
      behavior: reduit ? "auto" : "smooth",
    });
  }, [affiche.length, pointFinal.choix, pointFinal.raison, vue, reduit]);

  const classeSurvol = (nom: string) => (survol === nom ? "survol" : "");

  // Questionnaire pré-écrit : mêmes questions pour tous, réponses fermées
  // qui alimentent le score, une précision libre facultative qui sert
  // seulement à rédiger le compte rendu. Chaque question peut être passée.
  function rendreQuestionnaire(
    reponses: Record<number, number>,
    libre: string,
    actif: boolean,
    complet: boolean
  ) {
    const repondues =
      Object.keys(reponses).length + (libre && (complet || !actif) ? 1 : 0);
    return (
      <div className="demo-quest">
        <p className="msg-titre">Questionnaire · {agent.nom}</p>
        <p className="demo-sous-titre">
          Questions rédigées à l&apos;avance, identiques pour tous les dirigeants de votre métier.
          Aucune n&apos;est obligatoire.
        </p>
        <div className="fenetre-barre">
          <div style={{ width: `${(repondues / NB_QUESTIONS) * 100}%` }} />
        </div>
        {donnees.questions.map((q, i) => (
          <div key={q.libelle} className="demo-qf">
            <p className="demo-qf-libelle">
              <span className="demo-q-num">{i + 1}</span>
              {q.libelle}
            </p>
            <div className="demo-options">
              {q.options.map((o, j) => (
                <span
                  key={o}
                  data-cible={`option-${i}-${j}`}
                  className={`demo-option ${reponses[i] === j ? "choisi" : ""} ${classeSurvol(`option-${i}-${j}`)}`}
                >
                  {o}
                </span>
              ))}
              <span className="demo-passer">Passer</span>
            </div>
          </div>
        ))}
        <div className="demo-qf">
          <p className="demo-qf-libelle">
            <span className="demo-q-num">4</span>
            {donnees.libre.libelle}
          </p>
          <p className="demo-note demo-note-libre">
            Facultatif. Cette précision aide à rédiger le compte rendu ; elle n&apos;entre pas dans
            le score.
          </p>
          <span className={`demo-champ demo-libre ${actif ? "plein" : ""}`} data-cible="libre">
            {libre ? (
              <>
                {libre}
                {actif ? <span className="demo-caret" /> : null}
              </>
            ) : (
              <span className="demo-placeholder">Votre réponse</span>
            )}
          </span>
        </div>
        {complet ? null : (
          <span
            data-cible="terminer"
            className={`demo-valider-point primaire ${classeSurvol("terminer")}`}
          >
            Voir mon compte rendu
          </span>
        )}
      </div>
    );
  }

  function rendreBloc(bloc: Bloc, i: number) {
    switch (bloc.t) {
      case "commencer":
        return (
          <div key={i} className="msg msg-agent">
            <span
              data-cible="commencer"
              className={`demo-valider-point primaire ${classeSurvol("commencer")}`}
              style={{ marginTop: 0 }}
            >
              Commencer le questionnaire
            </span>
          </div>
        );
      case "questionnaire":
        return (
          <div key={i} className="msg msg-carte">
            {rendreQuestionnaire(
              Object.fromEntries(
                donnees.questions.map((q, k) => [k, q.options.indexOf(q.reponse)])
              ),
              donnees.libre.reponse,
              false,
              true
            )}
          </div>
        );
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
          <div key={i} className="msg msg-carte msg-cle">
            <p className="msg-titre msg-titre-grand">Votre compte rendu</p>
            <p className="demo-sous-titre">{agent.nom}</p>
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
            <p className="demo-note">
              Rédigé à partir de vos réponses et de votre précision : «&nbsp;{donnees.libre.reponse}&nbsp;».
            </p>
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
      case "point":
        return (
          <div key={i} className="msg msg-carte msg-suivi">
            <p className="msg-titre">Point d&apos;étape</p>
            <ul className="demo-point">
              {donnees.actions.map((a, k) => {
                const c = pointFinal.choix[k];
                return (
                  <li key={a.texte}>
                    <div className="demo-point-ligne">
                      <span>{a.texte}</span>
                      <span className="demo-choix">
                        <span
                          data-cible={`atteint-${k}`}
                          className={`demo-option ${c === "atteint" ? "oui" : ""} ${classeSurvol(`atteint-${k}`)}`}
                        >
                          {c === "atteint" ? "✓ " : ""}Atteint
                        </span>
                        <span
                          data-cible={`non-${k}`}
                          className={`demo-option ${c === "non" ? "non" : ""} ${classeSurvol(`non-${k}`)}`}
                        >
                          Pas atteint
                        </span>
                      </span>
                    </div>
                    {c === "non" ? (
                      <div className="demo-raisons">
                        <span className="demo-raisons-titre">Pourquoi ?</span>
                        {RAISONS.map((r, j) => (
                          <span
                            key={r}
                            data-cible={`raison-${j}`}
                            className={`demo-option ${pointFinal.raison === r ? "non" : ""} ${classeSurvol(`raison-${j}`)}`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <span
              data-cible="valider-point"
              className={`demo-valider-point ${pointFinal.valide ? "fait" : ""} ${classeSurvol("valider-point")}`}
            >
              {pointFinal.valide ? "✓ Point d\u2019étape enregistré" : "Enregistrer mon point d\u2019étape"}
            </span>
          </div>
        );
      case "bilan":
        return (
          <div key={i} className="msg msg-carte msg-suivi">
            <p className="msg-titre">Suivi mis à jour</p>
            <ul className="demo-suivi">
              {donnees.actions.map((a, k) => {
                const etat = donnees.point.atteintes.includes(k)
                  ? "Fait"
                  : k === donnees.point.nonAtteinte
                    ? "Remplacée"
                    : donnees.suivi.etats[k];
                return (
                  <li key={a.texte}>
                    <span>{a.texte}</span>
                    <span
                      className={`demo-etat ${
                        etat === "Fait" ? "fait" : etat === "Remplacée" ? "remplacee" : ""
                      }`}
                    >
                      {etat}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="demo-axe">
              <p className="demo-axe-titre">Nouvel axe à mettre en place</p>
              <p className="demo-axe-texte">{donnees.point.nouvelAxe.texte}</p>
              <p className="demo-note">
                Tient compte de votre réponse : « {donnees.point.raison} ».{" "}
                {donnees.point.nouvelAxe.retour}.
              </p>
            </div>
          </div>
        );
      case "suivi":
        return (
          <div key={i} className="msg msg-carte msg-suivi">
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
          <ol className="demo-etapes" aria-label="Étapes du parcours">
            {PARCOURS.map((e, k) => (
              <li
                key={e}
                className={`demo-etape ${k === etapeParcours ? "actif" : ""} ${k < etapeParcours ? "fait" : ""} ${k >= 2 ? "cle" : ""}`}
                aria-current={k === etapeParcours ? "step" : undefined}
              >
                <span className="demo-etape-num">{k < etapeParcours ? "✓" : k + 1}</span>
                <span className="demo-etape-texte">{e}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="demo-corps">
          {inscription && !reduit ? (
            <div className="demo-inscription">
              <p className="demo-inscription-etape">Inscription</p>
              <h3 className="demo-inscription-titre">Créez votre profil</h3>
              <p className="demo-sous">
                Saisi une seule fois, il personnalise vos questions et les seuils auxquels vos
                résultats sont comparés.
              </p>
              <div className="demo-formulaire">
                {demo.profil.map((ligne, k) => (
                  <div key={ligne.libelle} className="demo-form-ligne">
                    <span className="l">{ligne.libelle}</span>
                    <span
                      className={`demo-champ ${formulaire.actif === k ? "plein" : ""}`}
                      data-cible={`form-${k}`}
                    >
                      {formulaire.valeurs[k]}
                      {formulaire.actif === k ? <span className="demo-caret" /> : null}
                    </span>
                  </div>
                ))}
              </div>
              <span className={`demo-envoyer demo-creer ${classeSurvol("creer")}`} data-cible="creer">
                Créer mon profil
              </span>
            </div>
          ) : null}
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
                {vue === "questionnaire" && !reduit
                  ? rendreQuestionnaire(choixQ, libreTexte, libreActif, false)
                  : affiche.map(rendreBloc)}
              </div>
              {notif ? (
                <div className={`demo-notif ${classeSurvol("notif")}`} data-cible="notif">
                  <span className="demo-notif-pastille" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="demo-notif-titre">Point d&apos;étape · 5 jours plus tard</span>
                    <span className="demo-notif-texte">
                      {donnees.actions[0].texte} Indiquez où vous en êtes.
                    </span>
                  </span>
                </div>
              ) : null}
              {vue === "questionnaire" && !reduit ? null : (
                <div className="demo-saisie-barre">
                  <span className="demo-champ">
                    <span className="demo-placeholder">Message à {agent.nom}</span>
                  </span>
                  <span className="demo-envoyer" aria-hidden="true">
                    Envoyer
                  </span>
                </div>
              )}
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
        Exemple illustratif : profil, questions et résultats sont fictifs. Questionnaire abrégé pour
        l&apos;aperçu.
      </figcaption>
    </figure>
  );
}

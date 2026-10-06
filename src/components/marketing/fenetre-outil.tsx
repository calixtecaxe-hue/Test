"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
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
  point: {
    nonAtteinte: number;
    raison: string;
    precision: string;
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
  | { t: "suivi" };

type Vue = "fil" | "questionnaire" | "suivi";
type SuiviEtat = {
  oui: number[];
  non: number | null;
  raison: string | null;
  precision: string;
  precisionActif: boolean;
  envoye: boolean;
  reflexion: boolean;
  axe: boolean;
  fini: boolean;
};
const SUIVI_VIDE: SuiviEtat = {
  oui: [],
  non: null,
  raison: null,
  precision: "",
  precisionActif: false,
  envoye: false,
  reflexion: false,
  axe: false,
  fini: false,
};
type Phase = "attente" | "questions" | "redaction" | "fini";
type Zoom = { s: number; tx: number; ty: number };
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

const ZOOM_NEUTRE: Zoom = { s: 1, tx: 0, ty: 0 };
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
//
// Sur la page d'un agent, `agentCode` isole sa partie : pas d'inscription ni
// de liste d'agents, seule sa conversation est jouée en boucle.
export function FenetreOutil({ agentCode }: { agentCode?: string }) {
  const indexSolo = agentCode
    ? AGENTS.findIndex((a) => a.code === agentCode)
    : -1;
  const solo = indexSolo >= 0;
  const [indexAgent, setIndexAgent] = useState(solo ? indexSolo : 0);
  const [fil, setFil] = useState<Bloc[]>([]);
  const [phase, setPhase] = useState<Phase>("attente");
  const [questions, setQuestions] = useState(0);
  const [termines, setTermines] = useState<number[]>([]);
  const [vue, setVue] = useState<Vue>("fil");
  const [rapide, setRapide] = useState(false);
  const [choixQ, setChoixQ] = useState<Record<number, number>>({});
  const [libreTexte, setLibreTexte] = useState("");
  const [libreActif, setLibreActif] = useState(false);
  const [lancement, setLancement] = useState({ depart: solo ? indexSolo : 0, n: 0 });
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
  const [horloge, setHorloge] = useState<number | null>(null);
  const [legende, setLegende] = useState("");
  const [suivi, setSuivi] = useState<SuiviEtat>(SUIVI_VIDE);
  const reduit = useMouvementReduit();
  const fenetreRef = useRef<HTMLDivElement>(null);
  const filRef = useRef<HTMLDivElement>(null);
  const corpsRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<Zoom>(ZOOM_NEUTRE);

  const agent = AGENTS[indexAgent];
  const couleur = couleurAgent[agent.couleur];
  const donnees = DEMO_AGENTS[agent.code];
  const affiche: Bloc[] = reduit ? filComplet(agent.code) : fil;
  const notes = notesDe(agent.code);
  const score = moyenne(notes);
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

    // Rythme du montage : toutes les attentes sont multipliées par `facteur`
    // (plus petit = plus rapide). Les attentes liées à une transition CSS
    // (zoom, défilement, déplacement du curseur) restent à durée fixe.
    let facteur = 0.6;
    let base = 0.6;
    const rythme = (f: number, badge = false) => {
      facteur = f;
      setRapide(badge);
    };
    const pause = (ms: number, fixe = false) =>
      new Promise<void>((resoudre) => {
        let reste = fixe ? ms : ms * facteur;
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

    // Fait défiler la conversation pour amener un élément sous l'en-tête du
    // suivi (ou au tiers haut), d'un seul mouvement, avant que le curseur ne
    // bouge ; sans cela le contenu glissait sous le curseur.
    async function amener(element: HTMLElement, forcer = false) {
      const defil = filRef.current;
      if (!defil?.contains(element)) return;
      const re = element.getBoundingClientRect();
      const rd = defil.getBoundingClientRect();
      const tete = defil.querySelector(".demo-suivi-tete")?.getBoundingClientRect().height ?? 0;
      if (forcer || re.bottom > rd.bottom - 12 || re.top < rd.top + tete + 12) {
        const marge = tete ? tete + 16 : rd.height / 3;
        // Les rectangles sont mesurés à l'écran, donc agrandis par le zoom.
        const delta = (re.top - rd.top - marge) / zoomRef.current.s;
        defil.scrollTo({ top: defil.scrollTop + delta, behavior: "smooth" });
        await pause(420, true);
      }
    }

    async function amenerCible(nom: string, forcer = false) {
      const element = fenetreRef.current?.querySelector<HTMLElement>(`[data-cible="${nom}"]`);
      if (element) await amener(element, forcer);
    }

    // Le curseur vit dans la scène : ses coordonnées sont celles de la scène
    // non zoomée, il suit donc le zoom sans décalage.
    async function deplacer(nom: string, positionX = 0.5) {
      const corps = corpsRef.current;
      const element = fenetreRef.current?.querySelector<HTMLElement>(`[data-cible="${nom}"]`);
      if (!corps || !element) return;
      await amener(element);
      const r = element.getBoundingClientRect();
      if (r.width === 0) return;
      const c = corps.getBoundingClientRect();
      const z = zoomRef.current;
      setCurseur({
        x: (r.left + r.width * positionX - c.left - z.tx) / z.s,
        y: (r.top + r.height * 0.55 - c.top - z.ty) / z.s,
        visible: true,
      });
      await pause(340, true);
    }

    // Zoom de caméra : agrandit la scène en centrant l'élément visé (ou
    // revient à la vue d'ensemble si nom est nul), puis attend la fin du
    // mouvement avant que quoi que ce soit ne soit mesuré.
    async function zoomSur(nom: string | null, echelle = 1.25) {
      const corps = corpsRef.current;
      if (!corps) return;
      const petit = window.matchMedia("(max-width: 639px)").matches;
      const s = nom ? 1 + (echelle - 1) * (petit ? 0.6 : 1) : 1;
      let suivant = ZOOM_NEUTRE;
      if (nom) {
        const element = fenetreRef.current?.querySelector<HTMLElement>(`[data-cible="${nom}"]`);
        if (!element) return;
        await amener(element);
        const r = element.getBoundingClientRect();
        const c = corps.getBoundingClientRect();
        const z = zoomRef.current;
        const lx = (r.left + r.width / 2 - c.left - z.tx) / z.s;
        const ly = (r.top + r.height / 2 - c.top - z.ty) / z.s;
        const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
        suivant = {
          s,
          tx: borne(c.width / 2 - s * lx, c.width - s * c.width, 0),
          ty: borne(c.height / 2 - s * ly, c.height - s * c.height, 0),
        };
      }
      zoomRef.current = suivant;
      setZoom(suivant);
      await pause(480, true);
    }

    const dire = (texte: string) => setLegende(texte);

    async function cliquer(nom?: string) {
      if (nom) setSurvol(nom);
      await pause(260);
      setClics((c) => c + 1);
      setPresse(true);
      await pause(140);
      setPresse(false);
      setSurvol(null);
    }

    async function remplirFormulaire() {
      setFormulaire({ valeurs: demo.profil.map(() => ""), actif: -1 });
      setInscription(true);
      setParcours(0);
      dire("1 · Vous créez votre profil, une seule fois.");
      await pause(1100);
      await zoomSur("formulaire", 1.2);
      for (let k = 0; k < demo.profil.length; k++) {
        if (k < 2) {
          await deplacer(`form-${k}`, 0.2);
          await cliquer();
        } else if (k === 2) {
          // Les champs suivants se remplissent en accéléré.
          rythme(0.25, true);
          setCurseur((c) => ({ ...c, visible: false }));
        }
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
      rythme(base);
      await deplacer("creer");
      await cliquer("creer");
      setInscription(false);
      setParcours(1);
      await zoomSur(null);
    }

    // Rappel puis suivi : cinq jours plus tard, une notification arrive ; pour
    // chaque objectif, atteint ou non ; si non, la personne choisit pourquoi
    // et précise ; l'agent en tient compte et propose un nouvel axe.
    async function pointEtape(d: DemoAgent) {
      const { nonAtteinte, raison: motif, precision } = d.point;
      const maj = (partiel: Partial<SuiviEtat>) => setSuivi((e) => ({ ...e, ...partiel }));
      setParcours(3);
      dire("5 jours plus tard…");
      await zoomSur(null);
      setHorloge(0);
      for (let j = 1; j <= 5; j++) {
        await pause(380);
        setHorloge(j);
      }
      await pause(800);
      setHorloge(null);
      await pause(300);

      dire("5 · À l'échéance, un rappel arrive : où en êtes-vous ?");
      setNotif(true);
      await pause(900);
      await zoomSur("notif", 1.45);
      await pause(1100);
      await deplacer("notif", 0.5);
      await cliquer("notif");
      setNotif(false);
      setSuivi(SUIVI_VIDE);
      setVue("suivi");
      await zoomSur(null);
      dire("Pour chaque objectif : atteint, oui ou non ?");
      await pause(900);

      for (let k = 0; k < d.actions.length; k++) {
        await zoomSur(`obj-${k}`, 1.25);
        if (k !== nonAtteinte) {
          if (k > nonAtteinte) rythme(0.35, true);
          await deplacer(`oui-${k}`);
          await cliquer(`oui-${k}`);
          setSuivi((e) => ({ ...e, oui: [...e.oui, k] }));
          await pause(1100);
          continue;
        }
        dire("Non : vous indiquez pourquoi.");
        await deplacer(`non-${k}`);
        await cliquer(`non-${k}`);
        maj({ non: k });
        await pause(500);
        await amenerCible(`obj-${k}`, true);
        await zoomSur("pourquoi", 1.2);
        const j = RAISONS.indexOf(motif);
        await deplacer(`raison-${j}`);
        await cliquer(`raison-${j}`);
        maj({ raison: motif });
        await pause(500);
        dire("Puis vous précisez, en quelques mots.");
        await zoomSur("precision", 1.35);
        await deplacer("precision", 0.2);
        await cliquer();
        maj({ precisionActif: true });
        for (let c = 1; c <= precision.length; c++) {
          maj({ precision: precision.slice(0, c) });
          await pause(30);
        }
        await pause(500);
        maj({ precisionActif: false });
        await deplacer("envoyer-pourquoi");
        await cliquer("envoyer-pourquoi");
        dire("L'agent tient compte de votre réponse…");
        maj({ envoye: true, reflexion: true });
        await pause(2000);
        dire("Il réajuste : un nouvel axe à mettre en place.");
        maj({ reflexion: false, axe: true });
        await pause(400);
        await amenerCible("axe", true);
        await zoomSur("axe", 1.3);
        await pause(2400);
      }
      rythme(base);
      dire("Et on continue : un nouveau point d'étape à la prochaine échéance.");
      maj({ fini: true });
      await pause(400);
      await amenerCible("fin", true);
      await zoomSur("fin", 1.25);
      await pause(2200);
      await zoomSur(null);
    }

    async function agentRepond(texte: string) {
      ajouter({ t: "redaction" });
      await pause(650);
      retirerRedaction();
      ajouter({ t: "agent", texte });
      await pause(700);
    }

    async function jouerAgent(i: number, avecInscription: boolean) {
      const code = AGENTS[i].code;
      const d = DEMO_AGENTS[code];

      // Le premier agent est joué à bon rythme, les suivants plus vite.
      base = avecInscription ? 0.6 : solo ? 0.55 : 0.45;
      rythme(base);
      zoomRef.current = ZOOM_NEUTRE;
      setZoom(ZOOM_NEUTRE);
      setFil([]);
      setNotif(false);
      setHorloge(null);
      setVue("fil");
      setChoixQ({});
      setLibreTexte("");
      setLibreActif(false);
      setSuivi(SUIVI_VIDE);
      setParcours(avecInscription ? 0 : 1);
      setPhase("attente");
      setQuestions(0);
      setIndexAgent(i);
      if (avecInscription) await remplirFormulaire();
      setParcours(1);
      if (solo) {
        dire("2 · Vous ouvrez la conversation avec l'agent.");
        await pause(700);
      } else {
        dire("2 · Vous choisissez un agent.");
        await pause(700);

        await zoomSur(`agent-${i}`, 1.35);
        await deplacer(`agent-${i}`, 0.4);
        await cliquer(`agent-${i}`);
        await zoomSur(null);
      }
      await agentRepond(d.accueil);
      dire("Votre profil est déjà renseigné : il règle vos questions et vos seuils.");
      ajouter({ t: "profil" });
      await pause(500);
      await zoomSur("profil-carte", 1.2);
      await pause(1300);
      await zoomSur(null);
      await agentRepond(
        "Le questionnaire est prêt. Ses questions sont rédigées à l'avance et identiques pour tous les dirigeants de votre métier."
      );
      ajouter({ t: "commencer" });
      await pause(700);
      await deplacer("commencer");
      await cliquer("commencer");
      setVue("questionnaire");
      setPhase("questions");
      dire("3 · Vous répondez au questionnaire.");
      await pause(900);

      // Montage accéléré : le vrai questionnaire compte plus de 80 questions,
      // la troisième défile donc plus vite, sans le curseur.
      for (let q = 0; q < d.questions.length; q++) {
        const j = d.questions[q].options.indexOf(d.questions[q].reponse);
        if (q < 2) {
          await zoomSur(`question-${q}`, 1.3);
          await deplacer(`option-${q}-${j}`);
          await cliquer(`option-${q}-${j}`);
        } else {
          dire("Le questionnaire complet compte plus de 80 questions : ici, en accéléré.");
          await zoomSur(null);
          rythme(0.25, true);
          setCurseur((c) => ({ ...c, visible: false }));
          await pause(300);
        }
        setChoixQ((c) => ({ ...c, [q]: j }));
        setQuestions(q + 1);
        await pause(q < 2 ? 450 : 700);
      }
      rythme(base);
      dire("Une précision libre, facultative : elle n'entre pas dans le score.");
      await zoomSur("question-3", 1.3);
      await deplacer("libre", 0.15);
      await cliquer();
      setLibreActif(true);
      for (let k = 1; k <= d.libre.reponse.length; k++) {
        setLibreTexte(d.libre.reponse.slice(0, k));
        await pause(32);
      }
      await pause(500);
      setLibreActif(false);
      setQuestions(NB_QUESTIONS);
      await zoomSur(null);
      await deplacer("terminer");
      await cliquer("terminer");
      setVue("fil");
      ajouter({ t: "moi", texte: "Questionnaire envoyé : 3 réponses et 1 précision." });
      await pause(700);

      setParcours(2);
      setPhase("redaction");
      dire("4 · L'agent rédige votre compte rendu.");
      await agentRepond("Le questionnaire n'est que le point de départ. Je rédige votre compte rendu : il sert de base à votre suivi.");
      ajouter({ t: "redaction" });
      await pause(1800);
      retirerRedaction();
      setPhase("fini");

      ajouter({ t: "synthese" });
      dire("Votre score sur 100, calculé à partir de seuils fixes, et sa lecture.");
      await pause(700);
      await zoomSur("score", 1.35);
      await pause(2800);
      await zoomSur(null);
      ajouter({ t: "parties" });
      dire("Le détail par partie : un statut et une note pour chaque indicateur.");
      rythme(0.35, true);
      await pause(4000);
      if (d.propositions) {
        ajouter({ t: "propositions" });
        dire("Des propositions de contenu, générées à votre demande.");
        await pause(3200);
      }
      rythme(base);
      ajouter({ t: "actions" });
      dire("Votre plan d'action : des objectifs, chacun avec son échéance de retour.");
      await pause(600);
      await zoomSur("actions-carte", 1.2);
      await pause(2600);
      await zoomSur(null);

      await pointEtape(d);

      setTermines((t) => (t.includes(i) ? t : [...t, i]));
      setCurseur((c) => ({ ...c, visible: false }));
      await pause(1500);
    }

    async function boucle() {
      await pause(0);
      let i = lancement.depart;
      let avecInscription = !solo && lancement.n === 0;
      for (;;) {
        await jouerAgent(i, avecInscription);
        avecInscription = false;
        if (solo) {
          setTermines([]);
          continue;
        }
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
  }, [reduit, lancement, solo]);

  // La conversation défile vers le dernier message à chaque ajout.
  useEffect(() => {
    const zone = filRef.current;
    if (!zone) return;
    // Pendant le suivi, c'est le curseur qui fait défiler vers sa cible, une
    // seule fois et avant de bouger ; un défilement automatique en plus
    // coupait l'en-tête et décalait le contenu.
    if (vue === "suivi" && !reduit) return;
    zone.scrollTo({
      top: vue === "questionnaire" ? 0 : zone.scrollHeight,
      behavior: reduit ? "auto" : "smooth",
    });
  }, [affiche.length, suivi.axe, suivi.non, vue, reduit]);

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
        <p className="demo-apercu">
          Aperçu : 4 questions affichées. Le questionnaire complet en compte plus de 80.
        </p>
        <div className="fenetre-barre">
          <div style={{ width: `${(repondues / NB_QUESTIONS) * 100}%` }} />
        </div>
        {donnees.questions.map((q, i) => (
          <div key={q.libelle} data-cible={`question-${i}`} className="demo-qf">
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
        <div className="demo-qf" data-cible="question-3">
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

  function rendreSuivi(e: SuiviEtat) {
    const p = donnees.point;
    const etape = e.axe ? 3 : e.non !== null ? 2 : 1;
    const total = donnees.actions.length;
    return (
      <div className="demo-suivi-vue">
        <div className="demo-suivi-tete">
        <p className="msg-titre">Suivi · {agent.nom}</p>
        <ol className="demo-mini-etapes">
          {["Objectif atteint ?", "Pourquoi", "Nouvel axe"].map((l, k) => (
            <li key={l} className={`${k + 1 === etape ? "actif" : ""} ${k + 1 < etape ? "fait" : ""}`}>
              <span>{k + 1 < etape ? "✓" : k + 1}</span>
              {l}
            </li>
          ))}
        </ol>
        <p className="demo-compteur">
          Objectifs atteints : {e.oui.length} sur {total}
          {e.axe ? " · 1 réajusté" : ""}
        </p>
        </div>
        <p className="demo-sous-titre demo-suivi-consigne">
          Point d&apos;étape, 5 jours plus tard. Pour chaque objectif, indiquez s&apos;il est atteint.
        </p>
        <ul className="demo-objectifs">
          {donnees.actions.map((a, k) => {
            const oui = e.oui.includes(k);
            const non = e.non === k;
            return (
              <li key={a.texte} data-cible={`obj-${k}`} className={`demo-obj ${oui ? "ok" : ""} ${non ? "ko" : ""}`}>
                <div className="demo-obj-ligne">
                  <span className="demo-q-num">{k + 1}</span>
                  <span className="demo-obj-texte">
                    <b>Objectif {k + 1}.</b> {a.texte}
                  </span>
                  <span className="demo-choix">
                    <span
                      data-cible={`oui-${k}`}
                      className={`demo-option ${oui ? "oui" : ""} ${classeSurvol(`oui-${k}`)}`}
                    >
                      {oui ? "✓ " : ""}Oui
                    </span>
                    <span
                      data-cible={`non-${k}`}
                      className={`demo-option ${non ? "non" : ""} ${classeSurvol(`non-${k}`)}`}
                    >
                      Non
                    </span>
                  </span>
                </div>
                {oui ? <p className="demo-parfait">Parfait.</p> : null}
                {non ? (
                  <div className="demo-pourquoi" data-cible="pourquoi">
                    <p className="demo-pourquoi-titre">Pourquoi cet objectif n&apos;est-il pas atteint ?</p>
                    <div className="demo-options demo-options-plein">
                      {RAISONS.map((r, j) => (
                        <span
                          key={r}
                          data-cible={`raison-${j}`}
                          className={`demo-option ${e.raison === r ? "choisi" : ""} ${classeSurvol(`raison-${j}`)}`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                    <span
                      className={`demo-champ demo-libre demo-libre-plein ${e.precisionActif ? "plein" : ""}`}
                      data-cible="precision"
                    >
                      {e.precision ? (
                        <>
                          {e.precision}
                          {e.precisionActif ? <span className="demo-caret" /> : null}
                        </>
                      ) : (
                        <span className="demo-placeholder">Précisez, si vous le souhaitez</span>
                      )}
                    </span>
                    {e.envoye ? (
                      <p className="demo-envoye">✓ Réponse envoyée à l&apos;agent</p>
                    ) : (
                      <span
                        data-cible="envoyer-pourquoi"
                        className={`demo-valider-point primaire ${classeSurvol("envoyer-pourquoi")}`}
                      >
                        Envoyer ma réponse
                      </span>
                    )}
                    {e.reflexion ? (
                      <div className="demo-reflexion">
                        <span className="msg-points">
                          <i />
                          <i />
                          <i />
                        </span>
                        L&apos;agent tient compte de votre réponse et réajuste votre stratégie…
                      </div>
                    ) : null}
                    {e.axe ? (
                      <div className="demo-axe demo-axe-nouveau" data-cible="axe">
                        <p className="demo-axe-titre">Nouvel axe à mettre en place</p>
                        <p className="demo-axe-texte">{p.nouvelAxe.texte}</p>
                        <p className="demo-note">
                          Tient compte de votre réponse : «&nbsp;{p.raison}&nbsp;». {p.nouvelAxe.retour}.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {e.fini ? (
          <p className="demo-fin" data-cible="fin">
            Parfait. Je vous recontacte au prochain point d&apos;étape.
          </p>
        ) : null}
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
          <div key={i} className="msg msg-carte" data-cible="profil-carte">
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
              <div className="demo-score" data-cible="score">
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
          <div key={i} className="msg msg-carte" data-cible="actions-carte">
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
          <div key={i} className="msg msg-carte msg-suivi">
            {rendreSuivi(
              {
                oui: donnees.actions.map((_, k) => k).filter((k) => k !== donnees.point.nonAtteinte),
                non: donnees.point.nonAtteinte,
                raison: donnees.point.raison,
                precision: donnees.point.precision,
                precisionActif: false,
                envoye: true,
                reflexion: false,
                axe: true,
                fini: true,
              }
            )}
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

        <div className="demo-legende" aria-live="polite">
          <span key={reduit ? "statique" : legende}>
            {reduit ? "Aperçu du parcours : profil, questionnaire, compte rendu, suivi." : legende}
          </span>
          {rapide && !reduit ? <span className="demo-rapide">▸▸ Accéléré</span> : null}
        </div>

        <div className="demo-corps" ref={corpsRef}>
          <div
            className="demo-scene"
            style={{ transform: `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.s})` }}
          >
          {inscription && !reduit ? (
            <div className="demo-inscription">
              <p className="demo-inscription-etape">Inscription</p>
              <h3 className="demo-inscription-titre">Créez votre profil</h3>
              <p className="demo-sous">
                Saisi une seule fois, il personnalise vos questions et les seuils auxquels vos
                résultats sont comparés.
              </p>
              <div className="demo-formulaire" data-cible="formulaire">
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
          {horloge !== null && !reduit ? (
            <div className="demo-horloge">
              <svg viewBox="0 0 100 100" className="demo-horloge-svg" aria-hidden="true">
                <circle cx="50" cy="50" r="44" className="demo-horloge-cadran" />
                {Array.from({ length: 12 }, (_, k) => (
                  <line
                    key={k}
                    x1="50"
                    y1="9"
                    x2="50"
                    y2={k % 3 === 0 ? 15 : 12}
                    transform={`rotate(${k * 30} 50 50)`}
                    className="demo-horloge-graduation"
                  />
                ))}
                <g className="demo-aiguille-h">
                  <line x1="50" y1="50" x2="50" y2="28" />
                </g>
                <g className="demo-aiguille-m">
                  <line x1="50" y1="50" x2="50" y2="16" />
                </g>
                <circle cx="50" cy="50" r="3" className="demo-horloge-centre" />
              </svg>
              <p className="demo-horloge-titre">5 jours plus tard</p>
              <p className="demo-horloge-compteur">Jour {horloge}</p>
            </div>
          ) : null}
          <div className="demo-zone">
            <aside className="demo-liste" aria-label="Agents" hidden={solo}>
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
                    <AgentAvatar code={a.code} />
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
                {solo ? null : (
                  <Link href={`/agents/${agent.slug}`} className="demo-chat-lien">
                    Page de l&apos;agent
                  </Link>
                )}
              </header>
              <div className="demo-fil" ref={filRef} aria-live="polite">
                {vue === "questionnaire" && !reduit
                  ? rendreQuestionnaire(choixQ, libreTexte, libreActif, false)
                  : vue === "suivi" && !reduit
                    ? rendreSuivi(suivi)
                    : affiche.map(rendreBloc)}
              </div>
              {(vue === "questionnaire" || vue === "suivi") && !reduit ? null : (
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
          {notif && !reduit ? (
            <div className={`demo-notif ${classeSurvol("notif")}`} data-cible="notif">
              <span className="demo-notif-icone" aria-hidden="true">
                C
              </span>
              <span className="min-w-0">
                <span className="demo-notif-haut">
                  <b>CAXE</b>
                  <i>maintenant</i>
                </span>
                <span className="demo-notif-titre">Rappel · Où en êtes-vous de vos objectifs ?</span>
                <span className="demo-notif-texte">{donnees.actions[0].texte}</span>
              </span>
            </div>
          ) : null}
          <div
          className={`demo-curseur ${curseur.visible && !reduit ? "visible" : ""} ${presse ? "presse" : ""}`}
          style={{ transform: `translate(${curseur.x}px, ${curseur.y}px) scale(${1 / zoom.s})` }}
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
        </div>

      </div>
      <figcaption className="mt-4 text-center text-xs text-[var(--text-faint)]">
        Exemple illustratif : profil, questions et résultats sont fictifs. Questionnaire abrégé pour
        l&apos;aperçu.
      </figcaption>
    </figure>
  );
}

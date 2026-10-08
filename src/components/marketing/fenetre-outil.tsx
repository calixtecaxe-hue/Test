"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { AGENTS, couleurAgent } from "@/lib/agents";
import demo from "@/lib/demo-outil.json";

type DemoAgent = {
  accueil: string;
  objectif: {
    titre: string;
    signe: string;
    atteint: number;
    cible: number;
    leviers: { nom: string; statut: string; potentiel: string }[];
  };
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
type Curseur = { x: number; y: number; visible: boolean; d: number };

const DEMO_AGENTS = demo.agents as Record<string, DemoAgent>;
const RAISONS = demo.raisons;
const NB_QUESTIONS = 4; // trois questions fermées et une précision facultative

// Les quatre temps du parcours, affichés en haut de la fenêtre : le
// questionnaire n'est que le point de départ du compte rendu et du suivi.
const PARCOURS = ["Objectif", "Questionnaire", "Diagnostic et plan", "Suivi"];

// Champs du formulaire d'inscription joué dans la démonstration : le profil,
// puis l'objectif chiffré, fixé en même temps (celui du premier agent).
const CHAMPS_FORMULAIRE = [
  ...demo.profil,
  { libelle: "Objectif chiffré", valeur: DEMO_AGENTS.ACQUISITION_CA.objectif.titre },
];

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

// L'avancement vers l'objectif monte de 0 à sa valeur ; remonté à chaque
// affichage (clé), il repart de zéro sans effet de synchronisation.
function Avancement({
  objectif,
  reduit,
}: {
  objectif: DemoAgent["objectif"];
  reduit: boolean;
}) {
  const [valeur, setValeur] = useState(reduit ? objectif.atteint : 0);

  useEffect(() => {
    if (reduit) return;
    const minuteur = setInterval(() => {
      setValeur((v) => {
        if (v >= objectif.atteint) {
          clearInterval(minuteur);
          return objectif.atteint;
        }
        return v + 1;
      });
    }, 110);
    return () => clearInterval(minuteur);
  }, [objectif.atteint, reduit]);

  return (
    <>
      <p className="demo-avancement">
        <span className="demo-avancement-valeur">
          {objectif.signe}
          {valeur}&nbsp;%
        </span>
        <span className="demo-avancement-texte">
          atteints sur {objectif.signe}
          {objectif.cible}&nbsp;%
        </span>
      </p>
      <div
        className="fenetre-barre"
        role="img"
        aria-label={`${objectif.signe}${objectif.atteint} % atteints sur ${objectif.signe}${objectif.cible} %`}
      >
        <div style={{ width: `${(valeur / objectif.cible) * 100}%` }} />
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
  const [curseur, setCurseur] = useState<Curseur>({ x: 0, y: 0, visible: false, d: 0 });
  const [clics, setClics] = useState(0);
  const [presse, setPresse] = useState(false);
  const [zoom, setZoom] = useState<Zoom>(ZOOM_NEUTRE);
  const [survol, setSurvol] = useState<string | null>(null);
  const [parcours, setParcours] = useState(0);
  const [inscription, setInscription] = useState(false);
  const [formulaire, setFormulaire] = useState<{ valeurs: string[]; actif: number }>({
    valeurs: CHAMPS_FORMULAIRE.map(() => ""),
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
    let facteur = 0.7;
    let base = 0.7;
    // Dernière position du curseur dans la scène : sa vitesse dépend de la
    // distance parcourue, pour que le mouvement reste lisible de près comme de loin.
    const dernier = { x: 0, y: 0, visible: false };
    const cacher = () => {
      dernier.visible = false;
      setCurseur((c) => ({ ...c, visible: false }));
    };
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
        await pause(480, true);
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
      const lx = (r.left + r.width * positionX - c.left - z.tx) / z.s;
      const ly = (r.top + r.height * 0.55 - c.top - z.ty) / z.s;

      // La caméra suit le curseur : s'il sort de la zone centrale de l'image,
      // elle glisse juste ce qu'il faut pour le ramener dedans, sans perdre le
      // contexte autour (le reste de la phrase, la question).
      let camera: Zoom | null = null;
      if (z.s > 1) {
        const sx = lx * z.s + z.tx;
        const sy = ly * z.s + z.ty;
        const [mx, my] = [c.width * 0.28, c.height * 0.28];
        const dedans = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
        const cx = dedans(sx, mx, c.width - mx);
        const cy = dedans(sy, my, c.height - my);
        if (cx !== sx || cy !== sy) {
          camera = {
            s: z.s,
            tx: dedans(z.tx + cx - sx, c.width - z.s * c.width, 0),
            ty: dedans(z.ty + cy - sy, c.height - z.s * c.height, 0),
          };
        }
      }

      // Plus la distance est grande, plus le trajet dure ; quand la caméra
      // glisse en même temps, le curseur prend le même temps qu'elle.
      const distance = dernier.visible ? Math.hypot(lx - dernier.x, ly - dernier.y) : 0;
      let duree = dernier.visible ? Math.min(750, Math.max(380, 300 + distance * 0.9)) : 0;
      if (camera) duree = Math.max(duree, 520);
      dernier.x = lx;
      dernier.y = ly;
      dernier.visible = true;
      if (camera) {
        zoomRef.current = camera;
        setZoom(camera);
      }
      setCurseur({ x: lx, y: ly, visible: true, d: duree });
      await pause(duree + 100, true);
    }

    // Zoom de caméra : agrandit la scène en centrant l'élément visé (ou
    // revient à la vue d'ensemble si nom est nul), puis attend la fin du
    // mouvement avant que quoi que ce soit ne soit mesuré.
    async function zoomSur(nom: string | null, echelle = 1.25, ax = 0.5) {
      const corps = corpsRef.current;
      if (!corps) return;
      const petit = window.matchMedia("(max-width: 639px)").matches;
      const s = nom ? 1 + (echelle - 1) * (petit ? 0.6 : 1) : 1;
      let suivant = ZOOM_NEUTRE;
      if (nom) {
        const element = fenetreRef.current?.querySelector<HTMLElement>(`[data-cible="${nom}"]`);
        if (!element) return;
        await amener(element);
        // Le défilement vers un bloc qui vient d'arriver peut durer : on
        // mesure une fois la conversation immobile, sinon on cadre le vide.
        const defil = filRef.current;
        for (let essai = 0; defil && essai < 12; essai++) {
          const avant = defil.scrollTop;
          await pause(60, true);
          if (Math.abs(defil.scrollTop - avant) < 1) break;
        }
        const r = element.getBoundingClientRect();
        const c = corps.getBoundingClientRect();
        const z = zoomRef.current;
        // `ax` place le centre du cadre sur une fraction de la largeur du
        // bloc (0 = bord gauche) : utile quand le contenu utile est d'un côté.
        const lx = (r.left + r.width * ax - c.left - z.tx) / z.s;
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
      setCurseur((c) => ({ ...c, d: 500 }));
      await pause(500, true);
    }

    // Échelle de zoom la plus grande qui laisse un bloc entier dans le cadre :
    // dans l'aperçu de l'accueil, plus étroit, un zoom fixe en rogne le côté.
    function echelleQuiTient(nom: string, max: number) {
      const corps = corpsRef.current;
      const element = fenetreRef.current?.querySelector<HTMLElement>(`[data-cible="${nom}"]`);
      if (!corps || !element) return max;
      const largeur = element.getBoundingClientRect().width / zoomRef.current.s;
      const place = (corps.getBoundingClientRect().width * 0.94) / largeur;
      return Math.min(max, place);
    }

    const dire = (texte: string) => setLegende(texte);

    async function cliquer(nom?: string) {
      if (nom) setSurvol(nom);
      await pause(160, true);
      setClics((c) => c + 1);
      setPresse(true);
      await pause(110, true);
      setPresse(false);
      setSurvol(null);
    }

    async function remplirFormulaire() {
      setFormulaire({ valeurs: CHAMPS_FORMULAIRE.map(() => ""), actif: -1 });
      setInscription(true);
      setParcours(0);
      dire("1 · Vous fixez votre objectif chiffré et créez votre profil, une seule fois.");
      await pause(1100);
      // Sur petit écran, le formulaire remplit déjà tout le cadre : pas de zoom.
      if (!window.matchMedia("(max-width: 639px)").matches) await zoomSur("formulaire", 1.2);
      const dernierChamp = CHAMPS_FORMULAIRE.length - 1;
      for (let k = 0; k < CHAMPS_FORMULAIRE.length; k++) {
        if (k < 2) {
          await deplacer(`form-${k}`, 0.2);
          await cliquer();
        } else if (k === 2) {
          // Les champs de profil suivants se remplissent plus vite, sans curseur.
          rythme(0.5, true);
          cacher();
        } else if (k === dernierChamp) {
          // L'objectif est joué à part, au rythme normal : c'est le point de départ.
          rythme(base);
          dire("Vous fixez votre objectif chiffré : tout le diagnostic part de là.");
          await pause(700);
          await deplacer(`form-${k}`, 0.2);
          await cliquer();
        }
        const texte = CHAMPS_FORMULAIRE[k].valeur;
        for (let c = 1; c <= texte.length; c++) {
          setFormulaire((f) => ({
            actif: k,
            valeurs: f.valeurs.map((v, j) => (j === k ? texte.slice(0, c) : v)),
          }));
          await pause(k === dernierChamp ? 55 : 38, k === dernierChamp);
        }
        await pause(k === dernierChamp ? 900 : 420, true);
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
    // chaque action, réalisée ou non ; si non, la personne choisit pourquoi
    // et précise ; l'agent en tient compte et propose un nouvel axe.
    async function pointEtape(d: DemoAgent) {
      const { nonAtteinte, raison: motif, precision } = d.point;
      const maj = (partiel: Partial<SuiviEtat>) => setSuivi((e) => ({ ...e, ...partiel }));
      setParcours(3);
      dire("6 · Nous suivons votre progression. 5 jours plus tard…");
      await zoomSur(null);
      setHorloge(0);
      for (let j = 1; j <= 5; j++) {
        await pause(170);
        setHorloge(j);
      }
      await pause(450);
      setHorloge(null);
      await pause(150);

      dire("À l'échéance, nous revenons vers vous : où en êtes-vous ?");
      setNotif(true);
      await pause(500);
      await zoomSur("notif", 1.45);
      await pause(450);
      await deplacer("notif", 0.5);
      await cliquer("notif");
      setNotif(false);
      setSuivi(SUIVI_VIDE);
      setVue("suivi");
      await zoomSur(null);
      dire("Pour chaque action : réalisée, oui ou non ?");
      await pause(400);

      for (let k = 0; k < d.actions.length; k++) {
        if (k !== nonAtteinte) {
          await deplacer(`oui-${k}`);
          await cliquer(`oui-${k}`);
          setSuivi((e) => ({ ...e, oui: [...e.oui, k] }));
          await pause(450);
          continue;
        }
        dire("Un blocage : vous nous le partagez, et nous vous aidons à trouver une solution.");
        await deplacer(`non-${k}`);
        await cliquer(`non-${k}`);
        maj({ non: k });
        await pause(250);
        await amenerCible(`obj-${k}`, true);
        await zoomSur("pourquoi", 1.2, 0.3);
        const j = RAISONS.indexOf(motif);
        await deplacer(`raison-${j}`);
        await cliquer(`raison-${j}`);
        maj({ raison: motif });
        await pause(250);
        dire("Vous précisez, en quelques mots.");
        await deplacer("precision", 0.2);
        await cliquer();
        maj({ precisionActif: true });
        for (let c = 1; c <= precision.length; c++) {
          maj({ precision: precision.slice(0, c) });
          await pause(14);
        }
        await pause(250);
        maj({ precisionActif: false });
        await deplacer("envoyer-pourquoi");
        await cliquer("envoyer-pourquoi");
        dire("Nous tenons compte de votre réponse…");
        maj({ envoye: true, reflexion: true });
        await pause(1000);
        dire("Nous réajustons : un nouvel axe à mettre en place.");
        maj({ reflexion: false, axe: true });
        await pause(200);
        await amenerCible("axe", true);
        await zoomSur("axe", 1.3, 0.3);
        await pause(1400);
      }
      rythme(base);
      maj({ fini: true });
      await pause(300);
      dire(`Vos actions font avancer votre objectif : ${d.objectif.signe}${d.objectif.atteint} % atteints sur ${d.objectif.signe}${d.objectif.cible} %.`);
      await amenerCible("avancement", true);
      {
        const e = echelleQuiTient("avancement", 1.3);
        if (e > 1.08) await zoomSur("avancement", e, 0.5);
      }
      await pause(3600);
      dire("Si tout se passe bien, on continue : un nouveau point à la prochaine échéance.");
      await amenerCible("fin", true);
      await pause(1400);
      await zoomSur(null);
    }

    async function agentRepond(texte: string) {
      ajouter({ t: "redaction" });
      await pause(380);
      retirerRedaction();
      ajouter({ t: "agent", texte });
      await pause(380);
    }

    async function jouerAgent(i: number, avecInscription: boolean) {
      const code = AGENTS[i].code;
      const d = DEMO_AGENTS[code];

      // Le premier agent est joué à bon rythme, les suivants plus vite.
      base = avecInscription ? 0.7 : solo ? 0.66 : 0.6;
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
      // Après l'inscription, le montage se resserre : coupes courtes, on garde l'attention.
      base = avecInscription ? 0.38 : solo ? 0.35 : 0.33;
      rythme(base);
      setParcours(1);
      // Sans liste visible (page agent, petit écran), il n'y a rien à cliquer.
      const liste = fenetreRef.current?.querySelector(".demo-liste");
      if (solo || !liste || liste.getBoundingClientRect().width === 0) {
        dire("2 · Vous ouvrez la conversation avec l'agent.");
        await pause(400);
      } else {
        dire("2 · Vous choisissez un agent.");
        await pause(400);

        await zoomSur(`agent-${i}`, 1.35);
        await deplacer(`agent-${i}`, 0.4);
        await cliquer(`agent-${i}`);
        await zoomSur(null);
      }
      await agentRepond(d.accueil);
      dire("Votre profil et votre objectif sont déjà enregistrés.");
      ajouter({ t: "profil" });
      await pause(1800);
      await agentRepond(
        `Votre objectif : ${d.objectif.titre}. Le questionnaire va situer votre point de départ. Ses questions sont rédigées à l'avance et identiques pour tous les dirigeants de votre métier.`
      );
      ajouter({ t: "commencer" });
      await pause(500);
      await deplacer("commencer");
      await cliquer("commencer");
      setVue("questionnaire");
      setPhase("questions");

      // Le vrai questionnaire compte plus de 80 questions : l'aperçu en joue
      // trois, au même rythme, curseur visible.
      const consignes = [
        "3 · Vous répondez au questionnaire : chaque réponse situe votre point de départ.",
        "Question 2 sur 3 : une estimation suffit, aucune question n'est obligatoire.",
        "Question 3 sur 3. Le questionnaire complet en compte plus de 80 : l'aperçu en montre trois.",
      ];
      for (let q = 0; q < d.questions.length; q++) {
        const j = d.questions[q].options.indexOf(d.questions[q].reponse);
        dire(consignes[q] ?? consignes[consignes.length - 1]);
        if (q === 0) await zoomSur("question-0", 1.15, 0.3);
        await pause(q === 0 ? 500 : 150);
        await deplacer(`option-${q}-${j}`);
        await cliquer(`option-${q}-${j}`);
        setChoixQ((c) => ({ ...c, [q]: j }));
        setQuestions(q + 1);
        await pause(600);
      }
      dire("Une précision libre, facultative : elle aide à rédiger le compte rendu, elle n'entre pas dans le calcul.");
      await pause(200);
      await deplacer("libre", 0.15);
      await cliquer();
      setLibreActif(true);
      for (let k = 1; k <= d.libre.reponse.length; k++) {
        setLibreTexte(d.libre.reponse.slice(0, k));
        await pause(16);
      }
      await pause(500);
      setLibreActif(false);
      setQuestions(NB_QUESTIONS);
      await zoomSur(null);
      dire("Vous envoyez vos réponses.");
      await deplacer("terminer");
      await cliquer("terminer");
      setVue("fil");
      ajouter({ t: "moi", texte: "Questionnaire envoyé : 3 réponses et 1 précision." });
      await pause(600);

      setParcours(2);
      setPhase("redaction");
      dire("4 · Vos réponses sont comparées à votre objectif.");
      await agentRepond("Merci. Je compare vos réponses à votre objectif et j'identifie ce qui vous en sépare.");
      ajouter({ t: "redaction" });
      await pause(3800);
      retirerRedaction();
      setPhase("fini");

      // Le compte rendu se traverse d'un trait : l'objectif et ses leviers,
      // le détail par thème, les propositions. Pas d'avancement ici : rien
      // n'est encore mis en place, il apparaît au suivi.
      rythme(0.33, true);
      ajouter({ t: "synthese" });
      dire("Votre compte rendu : votre objectif, et ce qui vous en sépare, levier par levier.");
      await pause(800);
      // Sur petit écran le bloc tient déjà dans le cadre : pas de zoom.
      if (!window.matchMedia("(max-width: 639px)").matches) {
        const e = echelleQuiTient("objectif", 1.3);
        if (e > 1.08) await zoomSur("objectif", e, 0.5);
      }
      await pause(2600);
      await zoomSur(null);
      ajouter({ t: "parties" });
      dire("Le détail par thème : un statut vert, orange ou rouge pour chacun.");
      await pause(3200);
      if (d.propositions) {
        ajouter({ t: "propositions" });
        dire("Des propositions de contenu, générées à votre demande.");
        await pause(2200);
      }
      rythme(base);
      ajouter({ t: "actions" });
      dire("5 · Un plan d'action vous permet d'améliorer vos points faibles : chaque action vise un levier.");
      await pause(600);
      // Le plan : d'abord les actions (à gauche), puis, d'un glissé de caméra,
      // l'échéance de retour de chacune (à droite).
      // Sur petit écran la carte tient déjà dans le cadre : pas de zoom.
      const petit = window.matchMedia("(max-width: 639px)").matches;
      if (!petit) await zoomSur("actions-carte", 1.3, 0.22);
      await pause(2400);
      dire("Chacune a sa propre échéance de retour : nous revenons vers vous à cette date.");
      if (!petit) await zoomSur("actions-carte", 1.3, 0.85);
      await pause(2000);
      await zoomSur(null);

      await pointEtape(d);

      setTermines((t) => (t.includes(i) ? t : [...t, i]));
      cacher();
      await pause(800);
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
  // qui alimentent le calcul, une précision libre facultative qui sert
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
            le calcul.
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
          {["Action réalisée ?", "Pourquoi", "Nouvel axe"].map((l, k) => (
            <li key={l} className={`${k + 1 === etape ? "actif" : ""} ${k + 1 < etape ? "fait" : ""}`}>
              <span>{k + 1 < etape ? "✓" : k + 1}</span>
              {l}
            </li>
          ))}
        </ol>
        <p className="demo-compteur">
          Actions réalisées : {e.oui.length} sur {total}
          {e.axe ? " · 1 réajusté" : ""}
        </p>
        </div>
        <p className="demo-sous-titre demo-suivi-consigne">
          Point d&apos;étape, 5 jours plus tard. Pour chaque action, indiquez si elle est réalisée.
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
                    <b>Action {k + 1}.</b> {a.texte}
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
                    <p className="demo-pourquoi-titre">Pourquoi cette action n&apos;est-elle pas réalisée ?</p>
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
          <>
            <div className="demo-objectif demo-objectif-suivi" data-cible="avancement">
              <p className="demo-objectif-etiquette">Votre avancement vers l&apos;objectif</p>
              <p className="demo-objectif-titre">{donnees.objectif.titre}</p>
              <Avancement
                key={`avancement-${indexAgent}`}
                objectif={donnees.objectif}
                reduit={reduit}
              />
            </div>
            <p className="demo-fin" data-cible="fin">
              Parfait. Je vous recontacte au prochain point d&apos;étape.
            </p>
          </>
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
              <div className="demo-ligne">
                <span className="l">Objectif</span>
                <span className="v">{donnees.objectif.titre}</span>
              </div>
            </div>
          </div>
        );
      case "synthese":
        return (
          <div key={i} className="msg msg-carte msg-cle">
            <p className="msg-titre msg-titre-grand">Votre compte rendu</p>
            <p className="demo-sous-titre">{agent.nom}</p>
            <div className="demo-objectif" data-cible="objectif">
              <p className="demo-objectif-etiquette">Votre objectif</p>
              <p className="demo-objectif-titre">{donnees.objectif.titre}</p>
              <p className="demo-objectif-etiquette demo-leviers-titre">
                Ce qui vous en sépare, classé par impact
              </p>
              <ol className="demo-leviers">
                {donnees.objectif.leviers.map((l, k) => (
                  <li key={l.nom}>
                    <span className="demo-levier-rang">{k + 1}</span>
                    <span className="demo-levier-nom">{l.nom}</span>
                    <span className="fenetre-statut">
                      <span
                        className="fenetre-point"
                        style={{ background: COULEUR_STATUT[l.statut] }}
                      />
                      {l.statut}
                    </span>
                    <span className="demo-levier-potentiel">
                      Potentiel : {l.potentiel}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="demo-note">
                Ensemble, ces leviers couvrent l&apos;objectif de {donnees.objectif.signe}
                {donnees.objectif.cible}&nbsp;%.
              </p>
            </div>
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
                          {statut}
                        </span>
                      )}
                    </div>
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
            <p className="demo-note demo-note-plan">
              Chaque action vise un levier ou un point faible du diagnostic.
            </p>
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
            {reduit ? "Aperçu du parcours : objectif, questionnaire, diagnostic et plan d'action, suivi." : legende}
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
                Saisi une seule fois : votre profil personnalise vos questions et les seuils de
                comparaison, votre objectif chiffré fixe le cap.
              </p>
              <div className="demo-formulaire" data-cible="formulaire">
                {CHAMPS_FORMULAIRE.map((ligne, k) => (
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
                <span className="demo-notif-titre">Rappel · Où en êtes-vous de vos actions ?</span>
                <span className="demo-notif-texte">{donnees.actions[0].texte}</span>
              </span>
            </div>
          ) : null}
          <div
          className={`demo-curseur ${curseur.visible && !reduit ? "visible" : ""} ${presse ? "presse" : ""}`}
          style={
            {
              transform: `translate(${curseur.x}px, ${curseur.y}px) scale(${1 / zoom.s})`,
              "--dur": `${curseur.d}ms`,
            } as React.CSSProperties
          }
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

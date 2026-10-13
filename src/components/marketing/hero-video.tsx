"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const VIDEO = "/videos/caxe-hero.mp4";
const AFFICHE = "/videos/caxe-hero.webp";
const REDUIT = "(prefers-reduced-motion: reduce)";

function useMouvementReduit(): boolean {
  return useSyncExternalStore(
    (notifier) => {
      const media = window.matchMedia(REDUIT);
      media.addEventListener("change", notifier);
      return () => media.removeEventListener("change", notifier);
    },
    () => window.matchMedia(REDUIT).matches,
    () => false
  );
}

function formaterTemps(secondes: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(secondes) ? secondes : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type VideoIos = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

// Vidéo du hero de l'accueil. Lecture automatique sans son (les navigateurs
// n'autorisent pas autrement), en boucle, en pause hors de l'écran. Barre de
// commandes sous l'image, pour ne pas couvrir les sous-titres de la vidéo :
// lecture, curseur de position, son, plein écran. Sans lecture automatique
// quand les animations sont réduites.
export function HeroVideo() {
  const reduit = useMouvementReduit();
  const figure = useRef<HTMLElement>(null);
  const lecteur = useRef<HTMLVideoElement>(null);
  const curseur = useRef<HTMLInputElement>(null);
  const horloge = useRef<HTMLSpanElement>(null);
  // Vrai quand le visiteur a mis la lecture en pause lui-même : la vidéo ne
  // repart alors pas toute seule en revenant à l'écran.
  const pauseVolontaire = useRef(false);
  const [lecture, setLecture] = useState(false);
  const [muet, setMuet] = useState(true);
  const [pleinEcran, setPleinEcran] = useState(false);

  // Position : le curseur et l'horloge suivent la vidéo image par image, sans
  // repasser par React.
  useEffect(() => {
    const video = lecteur.current;
    if (!video) return;
    let image = 0;
    let derniere = -1;
    const suivre = () => {
      const c = curseur.current;
      if (c && document.activeElement !== c) {
        const duree = video.duration || 0;
        c.max = String(duree);
        c.value = String(video.currentTime);
        c.style.setProperty("--p", duree ? `${(video.currentTime / duree) * 100}%` : "0%");
        c.setAttribute(
          "aria-valuetext",
          `${formaterTemps(video.currentTime)} sur ${formaterTemps(duree)}`
        );
      }
      const seconde = Math.floor(video.currentTime);
      if (horloge.current && seconde !== derniere) {
        derniere = seconde;
        horloge.current.textContent = `${formaterTemps(video.currentTime)} / ${formaterTemps(video.duration)}`;
      }
      image = requestAnimationFrame(suivre);
    };
    image = requestAnimationFrame(suivre);
    return () => cancelAnimationFrame(image);
  }, []);

  // Pause hors de l'écran, reprise au retour (sauf pause du visiteur).
  useEffect(() => {
    const video = lecteur.current;
    if (!video || reduit) return;
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          if (!pauseVolontaire.current) void video.play().catch(() => {});
        } else video.pause();
      },
      { threshold: 0.25 }
    );
    observateur.observe(video);
    return () => observateur.disconnect();
  }, [reduit]);

  useEffect(() => {
    const surChangement = () => setPleinEcran(document.fullscreenElement === figure.current);
    document.addEventListener("fullscreenchange", surChangement);
    return () => document.removeEventListener("fullscreenchange", surChangement);
  }, []);

  function basculerLecture() {
    const video = lecteur.current;
    if (!video) return;
    if (video.paused) {
      pauseVolontaire.current = false;
      void video.play().catch(() => {});
    } else {
      pauseVolontaire.current = true;
      video.pause();
    }
  }

  function basculerSon() {
    const video = lecteur.current;
    if (!video) return;
    video.muted = !video.muted;
  }

  function aller(valeur: string) {
    const video = lecteur.current;
    if (video) video.currentTime = Number(valeur);
  }

  function basculerPleinEcran() {
    const cadre = figure.current;
    const video = lecteur.current as VideoIos | null;
    if (!cadre || !video) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (cadre.requestFullscreen) {
      void cadre.requestFullscreen().catch(() => {});
    } else if (video.webkitEnterFullscreen) {
      // iPhone : seul le lecteur natif passe en plein écran.
      video.webkitEnterFullscreen();
    }
  }

  return (
    <figure ref={figure} className={`hero-video m-0 ${pleinEcran ? "hero-video-plein" : ""}`}>
      <video
        ref={lecteur}
        className="hero-video-lecteur"
        src={VIDEO}
        poster={AFFICHE}
        autoPlay={!reduit}
        muted
        loop
        playsInline
        preload="auto"
        onClick={basculerLecture}
        onPlay={() => setLecture(true)}
        onPause={() => setLecture(false)}
        onVolumeChange={(e) => setMuet(e.currentTarget.muted)}
        aria-label="Présentation de CAXE : des agents IA qui auditent votre entreprise et construisent votre stratégie"
      />
      <div className="hero-video-barre">
        <button
          type="button"
          onClick={basculerLecture}
          className="hero-video-bouton"
          aria-label={lecture ? "Mettre la vidéo en pause" : "Lancer la vidéo"}
        >
          {lecture ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>

        <span ref={horloge} className="hero-video-temps" aria-hidden="true">
          0:00 / 0:00
        </span>

        <input
          ref={curseur}
          type="range"
          className="hero-video-position"
          min={0}
          max={100}
          step="any"
          defaultValue={0}
          onInput={(e) => aller(e.currentTarget.value)}
          aria-label="Position dans la vidéo"
        />

        <button
          type="button"
          onClick={basculerSon}
          className="hero-video-bouton"
          aria-pressed={!muet}
          aria-label={muet ? "Activer le son" : "Couper le son"}
        >
          {muet ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
              <path d="m16 9 5 6M21 9l-5 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={basculerPleinEcran}
          className="hero-video-bouton"
          aria-label={pleinEcran ? "Quitter le plein écran" : "Passer en plein écran"}
        >
          {pleinEcran ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          )}
        </button>
      </div>
    </figure>
  );
}

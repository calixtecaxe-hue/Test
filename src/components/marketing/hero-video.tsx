"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const MOBILE = "(max-width: 767px)";
const REDUIT = "(prefers-reduced-motion: reduce)";

// Source choisie côté navigateur : le fichier téléphone sur petit écran, le
// fichier ordinateur sinon. Côté serveur, aucune source n'est rendue (seule
// l'affiche apparaît) pour ne jamais charger la mauvaise vidéo.
function useFormat(): "aucun" | "mobile" | "pc" {
  return useSyncExternalStore(
    (notifier) => {
      const media = window.matchMedia(MOBILE);
      media.addEventListener("change", notifier);
      return () => media.removeEventListener("change", notifier);
    },
    () => (window.matchMedia(MOBILE).matches ? "mobile" : "pc"),
    () => "aucun"
  );
}

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

const SOURCES = {
  pc: { video: "/videos/caxe-hero-pc.mp4", affiche: "/videos/caxe-hero-pc.webp" },
  mobile: { video: "/videos/caxe-hero-mobile.mp4", affiche: "/videos/caxe-hero-mobile.webp" },
} as const;

// Vidéo du hero de l'accueil : lecture automatique, en boucle, sans son
// (le navigateur n'autorise pas autrement). Le son se rétablit d'un clic.
// Elle se met en pause hors de l'écran, et ne démarre pas seule quand les
// animations sont réduites.
export function HeroVideo() {
  const format = useFormat();
  const reduit = useMouvementReduit();
  const [son, setSon] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || reduit) return;
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 }
    );
    observateur.observe(video);
    return () => observateur.disconnect();
  }, [format, reduit]);

  const source = format === "aucun" ? null : SOURCES[format];

  function basculerSon() {
    const video = ref.current;
    if (!video) return;
    video.muted = son;
    setSon(!son);
  }

  return (
    <figure className="hero-video m-0">
      <video
        key={format}
        ref={ref}
        className="hero-video-lecteur"
        src={source?.video}
        poster={(source ?? SOURCES.pc).affiche}
        autoPlay={!reduit}
        controls={reduit}
        muted
        loop
        playsInline
        preload="auto"
        aria-label="Présentation de CAXE : des agents IA qui auditent votre entreprise et construisent votre stratégie"
      />
      {reduit ? null : (
        <button
          type="button"
          onClick={basculerSon}
          aria-pressed={son}
          className="hero-video-son"
        >
          {son ? "Couper le son" : "Activer le son"}
        </button>
      )}
    </figure>
  );
}

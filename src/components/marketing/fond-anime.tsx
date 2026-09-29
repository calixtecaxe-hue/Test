"use client";

import { useEffect, useRef } from "react";

// Bornes en pourcentage du conteneur, pour que la lumière reste toujours
// bien visible (elle ne va pas se cacher dans les angles).
const BORNE_X: [number, number] = [15, 85];
const BORNE_Y: [number, number] = [18, 78];

function hasard(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function FondAnime() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduitMouvement = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Parallaxe douce au défilement.
    let frame = 0;
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const decalage = window.scrollY * 0.08;
        element?.style.setProperty("--parallax", decalage.toFixed(1));
      });
    }
    if (!reduitMouvement) {
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    // Lumière baladeuse : une nouvelle destination de temps en temps,
    // la transition CSS (7s) fait le déplacement lui-même.
    let delai: ReturnType<typeof setTimeout> | undefined;
    function deplacerLumiere() {
      element?.style.setProperty("--lum-x", hasard(...BORNE_X).toFixed(1));
      element?.style.setProperty("--lum-y", hasard(...BORNE_Y).toFixed(1));
      delai = setTimeout(deplacerLumiere, hasard(6500, 9000));
    }

    if (reduitMouvement) {
      element.style.setProperty("--lum-x", "50");
      element.style.setProperty("--lum-y", "45");
    } else {
      deplacerLumiere();
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      if (delai) clearTimeout(delai);
    };
  }, []);

  return (
    <div className="fond-anime" ref={ref} aria-hidden="true">
      <div className="halo halo-bleu" />
      <div className="halo halo-rouge" />
      <div className="halo halo-ambre" />
      <div className="lumiere" />
    </div>
  );
}

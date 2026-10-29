"use client";

import { useEffect, useRef, useState } from "react";

const COULEURS = ["bleu", "blanc", "rouge"] as const;
type Couleur = (typeof COULEURS)[number];

type Point = { x: number; y: number; couleur: Couleur };

const NB_POINTS = 18;
const RAYON_INFLUENCE = 26; // en % de la diagonale du conteneur

function hasard(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function genererPoints(): Point[] {
  return Array.from({ length: NB_POINTS }, () => ({
    x: hasard(6, 94),
    y: hasard(6, 94),
    couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
  }));
}

// Composant chargé uniquement côté client (voir son utilisation via
// next/dynamic avec ssr: false) : les positions sont aléatoires, les
// générer côté serveur créerait un écart d'hydratation avec le client.
export function EtoilesLogo() {
  const [points] = useState<Point[]>(genererPoints);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const conteneur = conteneurRef.current;
    if (!conteneur) return;

    const elementsPoints = Array.from(
      conteneur.querySelectorAll<HTMLSpanElement>(".point")
    );

    const reduitMouvement = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduitMouvement) {
      elementsPoints.forEach((p) => {
        p.style.opacity = "0.16";
      });
      return;
    }

    let delai: ReturnType<typeof setTimeout>;
    function balayer() {
      const lx = hasard(10, 90);
      const ly = hasard(10, 90);
      elementsPoints.forEach((p) => {
        const px = parseFloat(p.dataset.x ?? "50");
        const py = parseFloat(p.dataset.y ?? "50");
        const distance = Math.hypot(px - lx, py - ly);
        const intensite = Math.max(0, 1 - distance / RAYON_INFLUENCE);
        p.style.opacity = (intensite * 0.8).toFixed(2);
      });
      delai = setTimeout(balayer, hasard(2600, 4200));
    }
    balayer();

    return () => clearTimeout(delai);
  }, []);

  return (
    <div className="constellation-logo" ref={conteneurRef} aria-hidden="true">
      {points.map((pt, i) => (
        <span
          key={i}
          className={`point point-${pt.couleur}`}
          data-x={pt.x}
          data-y={pt.y}
          style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
        />
      ))}
    </div>
  );
}

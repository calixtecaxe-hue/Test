"use client";

import { useEffect, useRef } from "react";

type Position = "gauche" | "centre";

const PAS = 22;
const TAU = Math.PI * 2;

const REGLAGES: Record<
  Position,
  { cx: number; cy: number; rx: number; ry: number; plein: number; fin: number }
> = {
  // Dense vers le texte du hero à deux colonnes de l'accueil.
  gauche: { cx: 0.2, cy: 0.38, rx: 0.65, ry: 0.85, plein: 0.25, fin: 0.72 },
  // Dense sous un titre centré, pour les autres heros du site.
  centre: { cx: 0.5, cy: 0.28, rx: 0.55, ry: 1.0, plein: 0.2, fin: 0.72 },
};

function lisse(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Pseudo-aléatoire déterministe : une phase stable par point, sans
// Math.random (qui ferait scintiller différemment à chaque rendu).
function hasard(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Fond en grille de points animé : une onde diagonale et un scintillement
// propre à chaque point les font grossir, s'éclairer puis disparaître.
// Sous prefers-reduced-motion, une seule image fixe est dessinée.
export function GrillePoints({ position }: { position: Position }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reglage = REGLAGES[position];
    const couleur =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--blue-1")
        .trim() || "#5B9FEC";
    const reduitMouvement = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let largeur = 0;
    let hauteur = 0;
    let enVue = true;
    let frame = 0;
    let dernier = 0;

    function dessiner(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, largeur, hauteur);
      ctx.fillStyle = couleur;
      const colonnes = Math.ceil(largeur / PAS) + 1;
      const lignes = Math.ceil(hauteur / PAS) + 1;

      for (let j = 0; j < lignes; j++) {
        for (let i = 0; i < colonnes; i++) {
          const x = i * PAS + PAS / 2;
          const y = j * PAS + PAS / 2;

          const dx = (x - reglage.cx * largeur) / (reglage.rx * largeur);
          const dy = (y - reglage.cy * hauteur) / (reglage.ry * hauteur);
          const masque = 1 - lisse(reglage.plein, reglage.fin, Math.hypot(dx, dy));
          if (masque <= 0.01) continue;

          const onde = 0.5 + 0.5 * Math.sin(x * 0.007 + y * 0.005 - t * 0.9);
          const scintillement =
            0.5 + 0.5 * Math.sin(t * 0.8 + hasard(j * colonnes + i) * TAU);
          const intensite =
            masque * lisse(0.3, 0.9, 0.6 * onde + 0.4 * scintillement);
          if (intensite < 0.04) continue;

          ctx.globalAlpha = 0.2 + 0.8 * intensite;
          ctx.beginPath();
          ctx.arc(x, y, 0.7 + 2.1 * intensite, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function dimensionner() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      largeur = rect.width;
      hauteur = rect.height;
      canvas.width = Math.round(largeur * dpr);
      canvas.height = Math.round(hauteur * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dessiner(reduitMouvement ? 3 : performance.now() / 1000);
    }

    function boucle(ms: number) {
      frame = requestAnimationFrame(boucle);
      if (!enVue || ms - dernier < 33) return;
      dernier = ms;
      dessiner(ms / 1000);
    }

    const observeTaille = new ResizeObserver(dimensionner);
    observeTaille.observe(canvas);
    dimensionner();

    let observeVue: IntersectionObserver | undefined;
    if (!reduitMouvement) {
      observeVue = new IntersectionObserver(([entree]) => {
        enVue = entree.isIntersecting;
      });
      observeVue.observe(canvas);
      frame = requestAnimationFrame(boucle);
    }

    return () => {
      cancelAnimationFrame(frame);
      observeTaille.disconnect();
      observeVue?.disconnect();
    };
  }, [position]);

  return <canvas ref={canvasRef} className="grille-points" aria-hidden="true" />;
}

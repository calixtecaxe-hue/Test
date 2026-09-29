"use client";

import { useEffect, useRef } from "react";

export function FondAnime() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduitMouvement = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduitMouvement) return;

    let frame = 0;
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const decalage = window.scrollY * 0.08;
        element?.style.setProperty("--parallax", decalage.toFixed(1));
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="fond-anime" ref={ref} aria-hidden="true">
      <div className="halo halo-bleu" />
      <div className="halo halo-rouge" />
      <div className="halo halo-ambre" />
    </div>
  );
}

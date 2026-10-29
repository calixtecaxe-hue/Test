"use client";

import { useSyncExternalStore } from "react";
import { CLE_THEME } from "@/lib/theme";

// Mode nuit (par défaut, la direction artistique de CAXE) ou mode jour. Le choix est gardé dans le navigateur ; le script de
// la page (layout.tsx) le rétablit avant l'affichage, sans éclair de l'autre thème.

type Theme = "sombre" | "clair";
const EVENEMENT = "caxe-theme";

function lire(): Theme {
  return document.documentElement.dataset.theme === "clair" ? "clair" : "sombre";
}

function abonner(notifier: () => void) {
  window.addEventListener(EVENEMENT, notifier);
  window.addEventListener("storage", notifier);
  return () => {
    window.removeEventListener(EVENEMENT, notifier);
    window.removeEventListener("storage", notifier);
  };
}

function choisir(theme: Theme) {
  if (theme === "clair") document.documentElement.dataset.theme = "clair";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(CLE_THEME, theme);
  } catch {
    // Stockage refusé (navigation privée…) : le choix tient jusqu'au rechargement de la page.
  }
  window.dispatchEvent(new Event(EVENEMENT));
}

function Soleil() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function Lune() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
    </svg>
  );
}

export function BasculeTheme() {
  const theme = useSyncExternalStore(abonner, lire, () => "sombre" as Theme);
  return (
    <div className="bascule-theme" role="group" aria-label="Thème d'affichage">
      <button type="button" aria-pressed={theme === "clair"} aria-label="Mode jour" title="Mode jour" onClick={() => choisir("clair")}>
        <Soleil />
      </button>
      <button type="button" aria-pressed={theme === "sombre"} aria-label="Mode nuit" title="Mode nuit" onClick={() => choisir("sombre")}>
        <Lune />
      </button>
    </div>
  );
}

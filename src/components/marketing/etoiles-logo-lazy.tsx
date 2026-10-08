"use client";

import dynamic from "next/dynamic";

// `ssr: false` n'est autorisé que depuis un composant client : ce fichier
// sert uniquement de pont pour que page.tsx (composant serveur) puisse
// rendre EtoilesLogo sans le générer côté serveur (positions aléatoires).
export const EtoilesLogo = dynamic(
  () => import("./etoiles-logo").then((mod) => mod.EtoilesLogo),
  { ssr: false }
);

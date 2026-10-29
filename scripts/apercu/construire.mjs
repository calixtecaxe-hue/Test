// Construit le paquet de l'aperçu du questionnaire (React + vrai code de l'application + données) en un seul fichier.
//   node scripts/apercu/construire.mjs <fichier de sortie>
import { build } from "esbuild";
import { resolve } from "node:path";

const sortie = process.argv[2] ?? "questionnaire-apercu.js";
await build({
  entryPoints: [resolve("scripts/apercu/entree.tsx")],
  outfile: sortie,
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  tsconfig: resolve("tsconfig.json"),
  alias: { "next/navigation": resolve("scripts/apercu/shim-navigation.ts") },
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".json": "json" },
  logLevel: "warning",
});
console.log("construit :", sortie);

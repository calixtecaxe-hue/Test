// Outils communs aux documents PDF sur les objectifs RH et Comm (pdf-decisions-objectifs.mjs, pdf-objectifs-proposes.mjs) :
// lecture de data/objectifs-agents.json, texte de la mesure d'un objectif, filtre selon la taille calculé par le code de
// l'application, impression d'une page HTML en PDF.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { objectifsPourLaTaille } from "../src/lib/audit/objectifs-proposes.ts";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const lire = (f) => JSON.parse(readFileSync(f, "utf8"));

export const OBJECTIFS = lire("data/objectifs-agents.json");
export const THEMES = lire("data/themes.json");
const REGLES = lire("data/regles-affichage.json");
export const RH = OBJECTIFS.agents.RH_ORGANISATION;
export const COM = OBJECTIFS.agents.COMM_CREATION;
export const PARTIES = COM.parties.map((p) => p.nom);
export const COM_PAR_PARTIE = PARTIES.map((p) => COM.objectifs.filter((o) => o.groupe === p));
export const TOTAL = RH.objectifs.length + COM.objectifs.length;
export const NOM_THEME = new Map(THEMES.map((t) => [t.code, t.nom]));

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Ce que le dirigeant donne pour mesurer l'objectif : la question posée et la phrase enregistrée (N : son chiffre, X : son
// délai en mois), ou, sans chiffre, ce qu'il veut constater.
const UNITE = { pourcent: "en %", unites: "en nombre", euros: "en €" };
const modele = (t) => (t.includes("{dici}") ? t.replace("{n}", "N").replace("{dici}", "d'ici X mois") : `${t.replace("{n}", "N")} sur les X prochains mois`);
export const mesure = (o) => {
  if (o.mesure === "phrase") return "Sans chiffre : « Comment saurez-vous que c'est atteint ? »";
  const unites = o.unites ?? [o.unite];
  const phrases = o.gabarit ? [o.gabarit.pluriel] : unites.map((u) => o.phrases?.[u]?.pluriel).filter(Boolean);
  const choix = o.gabarit || unites.length === 1 ? "" : ` (${unites.map((u) => o.libellesUnites?.[u] ?? UNITE[u]).join(" ou ")})`;
  return `« ${o.question} »${choix} → ${phrases.map((p) => `« ${modele(p)} »`).join(" ou ")}`;
};

// Objectifs qu'un dirigeant seul ne voit pas : tous leurs thèmes lui sont masqués (règle de l'application).
const cachesPour = (def, taille) => {
  const gardes = new Set(objectifsPourLaTaille(def, THEMES, REGLES, taille, []).objectifs.map((o) => o.id));
  return def.objectifs.filter((o) => !gardes.has(o.id));
};
export const CACHES_SEUL = new Set([...cachesPour(RH, "seul"), ...cachesPour(COM, "seul")].map((o) => o.id));
// Objectifs qu'une équipe ne voit pas (« Me faire aider dans mon travail » : ses thèmes ne sont posés qu'au dirigeant seul).
export const CACHES_EQUIPE = new Set([...cachesPour(RH, "equipe_2_5"), ...cachesPour(COM, "equipe_2_5")].map((o) => o.id));
export const proposeA = (id) => (CACHES_SEUL.has(id) ? "Pas au dirigeant seul" : CACHES_EQUIPE.has(id) ? "Dirigeant seul seulement" : "Tous");

// Imprime une page HTML en PDF A4, avec un pied de page numéroté.
export async function imprimer(html, sortie, { titre, paysage = false }) {
  const nav = await chromium.launch({ args: ["--proxy-bypass-list=*"], executablePath: "/opt/pw-browsers/chromium" });
  const page = await nav.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: sortie,
    format: "A4",
    landscape: paysage,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font:7.5pt Inter,Arial,sans-serif;color:#5b6672;text-align:center">${esc(titre)} · page <span class="pageNumber"></span> sur <span class="totalPages"></span></div>`,
    margin: { top: "14mm", bottom: "16mm", left: "14mm", right: "14mm" },
  });
  await nav.close();
}

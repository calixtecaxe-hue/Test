// Document simple (PDF) : quel vocabulaire par métier, validé par le propriétaire le 27 octobre. Lit data/vocabulaires-metiers.json,
// data/lexique.json et data/routage.json ; écrit docs/CAXE-vocabulaires-par-metier.pdf.
//   node scripts/pdf-vocabulaires.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const lire = (f) => JSON.parse(readFileSync(f, "utf8"));
const v = lire("data/vocabulaires-metiers.json"), lexique = lire("data/lexique.json"), routage = lire("data/routage.json");
const libelleMetier = Object.fromEntries(routage.metiers.map((m) => [m.id, m.libelle]));
const libelleActivite = Object.fromEntries(routage.metiers.flatMap((m) => (m.sousVariantes ?? []).map((a) => [`${m.id}/${a.id}`, `${m.libelle}, ${a.libelle}`])));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const mot = (nom) => lexique.find((m) => m.mot === nom);
const EXEMPLES = ["Demande", "Nouveau client", "Montant du premier achat", "Devis", "Vente réalisée", "Capacité"];

const parVocab = {};
for (const [id, a] of Object.entries(v.metiers)) (parVocab[a.vocabulaire] ??= []).push({ nom: libelleMetier[id], confirmer: a.aConfirmer });
for (const [id, a] of Object.entries(v.activites)) (parVocab[a.vocabulaire] ??= []).push({ nom: libelleActivite[id], confirmer: a.aConfirmer });

const sections = Object.entries(v.vocabulaires).map(([cle, titre]) => {
  const lignes = EXEMPLES.map((nom) => `<tr><td>${esc(nom)}</td><td>${esc(mot(nom)?.metiers?.[cle] ?? "—")}</td></tr>`).join("");
  const liste = (parVocab[cle] ?? []).map((m) => `<li>${esc(m.nom)}${m.confirmer ? ' <span class="c">à confirmer</span>' : ""}</li>`).join("");
  return `<section><h3>${esc(titre)}</h3><div class="deux"><div><p class="s">Métiers et activités concernés</p><ul>${liste}</ul></div><div><p class="s">Exemples de mots</p><table><tr><th>Mot courant</th><th>Mot utilisé</th></tr>${lignes}</table></div></div></section>`;
}).join("");

const ligne = ([id, raison]) => `<tr><td>${esc(libelleActivite[id] ?? libelleMetier[id] ?? id)}</td><td>${esc(raison)}</td></tr>`;
const conserve = Object.entries(v.profilConserve ?? {}).map(ligne).join("");
const sante = Object.keys(v.aTrancher).map((id) => esc(libelleActivite[id] ?? libelleMetier[id] ?? id)).join(", ");

const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><style>
@page { size: A4; margin: 18mm 16mm; }
body { font: 11pt/1.45 "Inter", "Helvetica Neue", Arial, sans-serif; color: #111; }
h1 { font-size: 21pt; margin: 0 0 4pt; } h2 { font-size: 14pt; margin: 22pt 0 6pt; border-bottom: 1px solid #999; padding-bottom: 3pt; } h3 { font-size: 12pt; margin: 0 0 6pt; }
p { margin: 5pt 0; } ul { margin: 3pt 0; padding-left: 16pt; } li { margin: 1pt 0; } .s { font-weight: 600; font-size: 9.5pt; text-transform: uppercase; letter-spacing: .04em; color: #555; margin-bottom: 2pt; }
table { border-collapse: collapse; width: 100%; font-size: 10pt; } th, td { border: 1px solid #bbb; padding: 3pt 6pt; text-align: left; vertical-align: top; } th { background: #eee; }
section { break-inside: avoid; margin: 0 0 14pt; } .deux { display: grid; grid-template-columns: 1fr 1.15fr; gap: 14pt; } .c { font-size: 8.5pt; background: #fff3c4; padding: 0 4pt; border-radius: 3pt; }
.note { background: #f3f3f3; padding: 8pt 10pt; border-radius: 4pt; }
</style><body>
<h1>Vocabulaires par métier</h1>
<p>Validé le 27 octobre : les vocabulaires ci-dessous s'appliquent dans l'application.</p>
<h2>De quoi s'agit-il ?</h2>
<p>Chaque question est écrite une seule fois, avec des mots à remplacer (« demande », « nouveau client », « vente réalisée »…). Aujourd'hui ces mots dépendent du <b>profil</b> de l'entreprise (rendez-vous, commerce, artisan…). Le classeur contient en plus dix <b>vocabulaires par métier</b> plus précis : un agent immobilier parle de « mandat signé », un grossiste de « commande livrée », un hôtel de « nuitée vendue ».</p>
<p class="note">Exemple. Question : « Combien de {demande} recevez-vous par mois ? »<br>Profil artisan : « demandes de devis ». Vocabulaire immobilier : « contacts propriétaires ». Vocabulaire négoce : « demandes de prix ».</p>
<p>Ce document dit quel métier utiliserait quel vocabulaire. La question et sa notation ne changent jamais : seul le mot affiché change.</p>
<h2>Règles</h2>
<ul>
<li>Un métier sans vocabulaire propre garde les mots de son profil, comme aujourd'hui (c'est le cas de la plupart des métiers).</li>
<li>Pour un métier à plusieurs activités cochées, le vocabulaire s'applique seulement si toutes les activités cochées utilisent le même ; sinon les mots du profil restent (pas de mélange).</li>
<li>Si un vocabulaire n'a pas de mot pour une notion (« — » dans le classeur), le mot du profil est conservé.</li>
</ul>
<h2>Les dix vocabulaires et leurs métiers</h2>
${sections}
<h2>Métiers qui gardent les mots de leur profil (décision du 27 octobre)</h2>
<table><tr><th style="width:30%">Métier ou activité</th><th>Pourquoi</th></tr>${conserve}</table>
<h2>Vocabulaire « consultation » à écrire</h2>
<p>Professions de santé : ${sante}. Un vocabulaire « consultation » est à créer ; ses mots sont à écrire par vous dans le classeur (onglet Lexique). En attendant, ces métiers gardent les mots de leur profil.</p>
</body></html>`;

if (process.env.HTML_SORTIE) (await import("node:fs")).writeFileSync(process.env.HTML_SORTIE, html);
const nav = await chromium.launch({ args: ["--proxy-bypass-list=*"], executablePath: "/opt/pw-browsers/chromium" });
const page = await nav.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({ path: "docs/CAXE-vocabulaires-par-metier.pdf", format: "A4", printBackground: true });
await nav.close();
console.log("docs/CAXE-vocabulaires-par-metier.pdf écrit");

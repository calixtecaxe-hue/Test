// Liste des objectifs proposés aux agents RH et Comm (PDF), tirée de data/objectifs-agents.json : titre, précision, mesure,
// exemple de réussite, délai donné en exemple, thèmes rattachés et à qui l'objectif est proposé. Écrit
// docs/objectifs/CAXE-objectifs-proposes.pdf. À relancer après toute modification de la liste.
//   node scripts/pdf-objectifs-proposes.mjs           (HTML_SORTIE=fichier.html pour garder aussi la page)
import { writeFileSync } from "node:fs";
import { OBJECTIFS, RH, COM, PARTIES, COM_PAR_PARTIE, TOTAL, NOM_THEME, esc, mesure, proposeA, imprimer } from "./objectifs-pdf-commun.mjs";

const SORTIE = "docs/objectifs/CAXE-objectifs-proposes.pdf";
const TITRE = `Les ${TOTAL} objectifs proposés`;

let numero = 0;
const ligne = (o) => {
  numero += 1;
  const themes = o.themes.map((c) => `<span class="theme"><b>${esc(c)}</b> ${esc(NOM_THEME.get(c) ?? "")}</span>`).join("");
  const pourQui = proposeA(o.id);
  return `<tr><td class="n">${numero}</td><td><b>${esc(o.libelle)}</b>${o.detail ? `<br><span class="p">${esc(o.detail)}</span>` : ""}</td><td>${esc(mesure(o))}</td><td>${esc(o.exemple?.reussite ?? "")}</td><td class="d">${o.exemple?.delaiMois ? `${o.exemple.delaiMois} mois` : ""}</td><td>${themes}</td><td>${pourQui}</td></tr>`;
};
const tableau = (objectifs) =>
  `<table><thead><tr><th class="n">N°</th><th>Objectif</th><th>Mesure</th><th>Exemple de réussite</th><th class="d">Délai (ex.)</th><th>Thèmes rattachés</th><th>Proposé à</th></tr></thead><tbody>${objectifs.map(ligne).join("")}</tbody></table>`;
const personnel = (def) =>
  `<p class="perso"><b>« Écrire mon propre objectif »</b>, à côté de « Choisir un objectif proposé » : « ${esc(def.personnel.aide)} » Exemple affiché : « ${esc(def.personnel.exemple)} » ; réussite : « ${esc(def.personnel.exempleReussite)} ».</p>`;

const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>${esc(TITRE)}</title><style>
@page { size: A4 landscape; }
:root { --encre: #07111B; --bleu: #1E4E96; --rouge: #B71C2B; --gris: #5b6672; --ligne: #c9ced4; --fond: #F7F2E6; }
body { font: 9.5pt/1.4 "Inter", "Helvetica Neue", Arial, sans-serif; color: var(--encre); margin: 0; }
h1 { font-size: 20pt; font-weight: 800; margin: 0 0 2pt; }
.sous-titre { color: var(--gris); margin: 0 0 8pt; }
.bandeau { border-top: 3pt solid var(--bleu); margin: 0 0 10pt; position: relative; }
.bandeau::after { content: ""; position: absolute; right: 0; top: -3pt; width: 18%; border-top: 3pt solid var(--rouge); }
.intro { background: var(--fond); border-radius: 4pt; padding: 7pt 10pt; margin-bottom: 8pt; }
.intro p { margin: 2pt 0; }
h2 { font-size: 13pt; font-weight: 800; margin: 14pt 0 3pt; color: var(--bleu); break-after: avoid; }
h2.premier { margin-top: 4pt; }
h2:not(.premier) { break-before: page; margin-top: 0; }
.partie { margin: 0 0 4pt; color: var(--gris); break-after: avoid; }
.perso { margin: 0 0 5pt; font-size: 8.8pt; break-after: avoid; }
table { border-collapse: collapse; width: 100%; font-size: 8.6pt; line-height: 1.35; }
th, td { border: 1px solid var(--ligne); padding: 3pt 5pt; text-align: left; vertical-align: top; }
thead th { background: var(--fond); font-size: 7.6pt; text-transform: uppercase; letter-spacing: .04em; }
tr { break-inside: avoid; }
th:nth-child(2) { width: 22%; } th:nth-child(3) { width: 20%; } th:nth-child(4) { width: 20%; } th:nth-child(6) { width: 20%; } th:nth-child(7) { width: 8%; }
.n { width: 3%; text-align: center; color: var(--gris); } .d { width: 6%; white-space: nowrap; }
.p { color: var(--gris); }
.theme { display: block; } .theme b { color: var(--bleu); font-weight: 600; }
.pied { margin-top: 10pt; font-size: 8pt; color: var(--gris); }
</style><body>
<h1>${esc(TITRE)}</h1>
<p class="sous-titre">CAXE · agents RH &amp; Organisation et Comm &amp; Création de contenu · liste au 28 octobre 2026, après vos choix · textes à relire</p>
<div class="bandeau"></div>
<div class="intro">
<p>Au début de l'agent RH ou Comm, le dirigeant voit deux choix de même importance : « Choisir un objectif proposé » ou « Écrire mon propre objectif ». Un seul objectif par agent. En Comm, pour un objectif proposé, il dit d'abord où il en est : « ${esc(PARTIES[0])} » ou « ${esc(PARTIES[1])} » ; seules les propositions de cette partie s'affichent.</p>
<p><b>Mesure</b> : ce que le dirigeant donne après avoir choisi. Pour un objectif chiffré, la question posée, l'unité au choix entre parenthèses, puis la phrase enregistrée (N : son chiffre, X : son délai en mois) ; sans chiffre, ce qu'il veut constater. Aucun chiffre ne lui est suggéré. <b>Délai (ex.)</b> : l'exemple affiché dans le champ du délai. <b>Thèmes rattachés</b> : les thèmes de l'agent auxquels l'objectif est relié ; le premier sert d'indicateur suivi. <b>Proposé à</b> : un objectif dont tous les thèmes sont masqués pour la taille de l'entreprise n'est pas proposé (trois objectifs d'équipe ne sont pas proposés au dirigeant seul ; « Me faire aider dans mon travail » ne l'est qu'à lui).</p>
</div>
<h2 class="premier">RH &amp; Organisation (${RH.objectifs.length})</h2>
${personnel(RH)}
${tableau(RH.objectifs)}
${COM_PAR_PARTIE.map(
  (liste, i) =>
    `<h2>Comm &amp; Création de contenu · ${esc(PARTIES[i])} (${liste.length})</h2><p class="partie">${esc(COM.parties[i].detail)}</p>${i === 0 ? personnel(COM) : ""}${tableau(liste)}`,
).join("")}
<p class="pied">Liste tirée de data/objectifs-agents.json (${OBJECTIFS.aValider ? "textes à relire" : "validée"}). Avant / après et raisons des changements du 28 octobre : docs/objectifs/objectifs-rh-comm.md. Vos choix : docs/objectifs/CAXE-decisions-objectifs.pdf.</p>
</body></html>`;

if (process.env.HTML_SORTIE) writeFileSync(process.env.HTML_SORTIE, html);
await imprimer(html, SORTIE, { titre: TITRE, paysage: true });
console.log(`Écrit : ${SORTIE} (${TOTAL} objectifs)`);

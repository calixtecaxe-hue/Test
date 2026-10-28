// Document de décision (PDF) : les choix qui restent au propriétaire sur les objectifs RH et Comm (28 octobre). Les décisions sont
// écrites ci-dessous ; l'annexe est tirée de data/objectifs-agents.json, avec le filtre selon la taille calculé par le code de
// l'application. Écrit docs/objectifs/CAXE-decisions-objectifs.pdf.
//   node scripts/pdf-decisions-objectifs.mjs           (HTML_SORTIE=fichier.html pour garder aussi la page)
// Quand un choix est fait, mettre à jour la décision concernée (champ « decide ») et relancer : le document dit alors ce qui est
// décidé au lieu de proposer les options.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { objectifsPourLaTaille } from "../src/lib/audit/objectifs-proposes.ts";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const lire = (f) => JSON.parse(readFileSync(f, "utf8"));
const OBJECTIFS = lire("data/objectifs-agents.json");
const THEMES = lire("data/themes.json");
const REGLES = lire("data/regles-affichage.json");
const SORTIE = "docs/objectifs/CAXE-decisions-objectifs.pdf";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Les décisions. « decide » : null tant que le propriétaire n'a pas choisi ; sinon le code de l'option retenue et sa date.
const DECISIONS = [
  {
    num: "1",
    titre: "Un objectif par agent, ou plusieurs",
    aujourdhui: [
      "En RH et en Comm, le dirigeant peut ajouter jusqu'à 10 objectifs avec « Ajouter un autre objectif » (décision du 27 octobre).",
      "Chaque objectif est soit une proposition de la liste, soit un objectif personnel, jamais les deux.",
      "Acquisition et Finance gardent un seul objectif : ce choix ne les concerne pas.",
    ],
    options: [
      ["1A", "Garder plusieurs objectifs (situation actuelle). Le compte rendu et le plan les reprennent tous."],
      ["1B", "Un seul objectif par agent, comme en Acquisition et en Finance. Le bouton « Ajouter un autre objectif » est retiré."],
    ],
    recommandation: "1A, avec au point 5 un plafond qui garde le plan lisible. Aucun compte réel n'est concerné aujourd'hui : seuls des comptes de test ont plusieurs objectifs.",
    decide: null,
  },
  {
    num: "2",
    titre: "Trois changements de sens",
    sous: [
      {
        num: "2a",
        titre: "« Relancer les personnes intéressées » (Comm, Améliorer ce que j'ai déjà)",
        avantApres: [
          "Avant : « Transformer plus de personnes intéressées en clients en les relançant », avec un chiffre en % (« de 10 % », sans dire de quoi).",
          "Après : « Relancer les personnes intéressées », précisé par « Celles qui réagissent ou vous écrivent sans devenir clientes. » Le chiffre devient un nombre de clients en plus : « obtenir 3 clients de plus en relançant les personnes intéressées ».",
        ],
        options: [
          ["2a-1", "Valider : un nombre de clients en plus."],
          ["2a-2", "Revenir à un pourcentage (préciser : pourcentage de quoi)."],
          ["2a-3", "Autre formulation (à écrire)."],
        ],
        recommandation: "2a-1 : un nombre de clients en plus se déclare tel quel au point d'étape, et l'avancement se mesure à ce que le dirigeant déclare.",
      },
      {
        num: "2b",
        titre: "« Guider les visiteurs jusqu'à me contacter » (Comm, Mettre en place ma présence en ligne)",
        avantApres: [
          "Avant : « Construire un parcours qui transforme les visiteurs en clients ».",
          "Après : « Guider les visiteurs jusqu'à me contacter », précisé par « De la publication au message, à l'appel ou au rendez-vous. » L'agent Comm s'arrête au contact ; faire d'un contact un client relève de l'agent Acquisition.",
        ],
        options: [
          ["2b-1", "Valider : l'objectif s'arrête au contact."],
          ["2b-2", "Garder l'ancien sens (l'objectif dépasse alors le périmètre de l'agent Comm)."],
          ["2b-3", "Autre formulation (à écrire)."],
        ],
        recommandation: "2b-1 : chaque agent garde son périmètre, et l'Acquisition mesure déjà la transformation des demandes en clients.",
      },
      {
        num: "2c",
        titre: "Taux de conversion visé (Comm, Améliorer ce que j'ai déjà)",
        avantApres: [
          "Avant : « Augmenter mon taux de conversion », avec un chiffre « de 5 % » qui ne disait pas s'il s'agit de 5 points ou de 5 % du taux actuel.",
          "Après : « Améliorer mon taux de conversion », précisé par « La part des visites de vos profils ou de votre site qui deviennent des demandes. » Le chiffre est le taux visé : « porter mon taux de conversion à 4 % ».",
        ],
        options: [
          ["2c-1", "Valider : le dirigeant donne le taux qu'il vise."],
          ["2c-2", "Une hausse en points (« de 2 points »)."],
          ["2c-3", "Une hausse en pourcentage du taux actuel (« de 20 % »)."],
        ],
        recommandation: "2c-1 : le dirigeant n'a aucun calcul à faire, et l'écart avec le taux mesuré se lit directement.",
      },
    ],
    decide: null,
  },
  {
    num: "3",
    titre: "Le filtre des propositions selon la taille de l'entreprise",
    aujourdhui: [
      "Une proposition dont tous les thèmes sont masqués pour la taille de l'entreprise n'est pas proposée. C'est la règle de masquage des thèmes, appliquée telle quelle.",
      "Effet réel, calculé par le code de l'application : seuls trois objectifs RH sont retirés, et seulement pour un dirigeant seul — {CACHES_SEUL}. Aucun objectif Comm n'est retiré. Dès deux personnes, tout est proposé.",
      "Un objectif déjà choisi reste toujours proposé.",
    ],
    options: [
      ["3A", "Garder le filtre (situation actuelle)."],
      ["3B", "Montrer toutes les propositions à tous."],
    ],
    recommandation: "3A : un dirigeant seul n'a pas d'équipe, et ces trois objectifs n'auraient aucune question pour les mesurer (leurs thèmes ne lui sont pas posés).",
    decide: null,
  },
  {
    num: "4",
    titre: "Deux objectifs RH à ajouter ou non",
    sous: [
      {
        num: "4a",
        titre: "« Libérer du temps pour piloter l'entreprise »",
        avantApres: [
          "Pourquoi : le temps du dirigeant est déjà mesuré (RH-05 : heures travaillées, heures sur des tâches qu'un autre pourrait faire, temps consacré au développement ; croisements XR04 et XR05). Le plan d'action suit le temps réellement disponible. Aucun objectif ne vise ce résultat aujourd'hui.",
          "Proposition (à valider) : précision « Des heures rendues au développement, aux clients ou à l'équipe. » ; chiffre = nombre visé, « libérer 5 heures par semaine pour piloter l'entreprise » (question « Combien d'heures par semaine ? ») ; thèmes RH-05 et RH-17 ; proposé à tous.",
        ],
        options: [
          ["4a-1", "Ajouter, avec cette proposition."],
          ["4a-2", "Ajouter, avec d'autres mots (à écrire)."],
          ["4a-3", "Ne pas ajouter."],
        ],
        recommandation: "4a-1 : c'est un besoin direct du dirigeant visé (il sent que ça bloque sans savoir où agir), et les questions pour le mesurer existent.",
      },
      {
        num: "4b",
        titre: "« Me faire aider » (dirigeant seul)",
        avantApres: [
          "Pourquoi : le questionnaire RH d'un dirigeant seul contient un bloc entier « S'entourer » (RH-41 à RH-45 : forme d'aide, tâches à confier, budget, freins, relais). Aucun objectif ne s'y rattache.",
          "Proposition (à valider) : précision « Par un salarié, un apprenti, un freelance ou un associé. » ; sans chiffre, avec l'exemple de réussite « une personne prend en charge une partie de mon travail chaque semaine » ; thèmes RH-41 à RH-45 ; proposé seulement au dirigeant seul (le filtre du point 3 le fait de lui-même : ces thèmes ne sont posés qu'à lui). Aucun conseil sur le contrat ni sur le droit du travail.",
        ],
        options: [
          ["4b-1", "Ajouter, avec cette proposition."],
          ["4b-2", "Ajouter, avec d'autres mots (à écrire)."],
          ["4b-3", "Ne pas ajouter."],
        ],
        recommandation: "4b-1 : le bloc « S'entourer » existe déjà et n'est relié à aucun objectif.",
      },
    ],
    decide: null,
  },
  {
    num: "5",
    titre: "La liste entière et le plafond d'objectifs",
    aujourdhui: [
      "La liste compte {TOTAL} objectifs : {DETAIL}. Elle est en annexe, avec pour chacun son titre, sa précision, sa mesure et son exemple de réussite. Cochez « OK » ou « À changer » et écrivez la correction.",
      "Le plafond est de 10 objectifs par agent. C'est une valeur technique qu'aucune règle ne fixe.",
    ],
    options: [
      ["5A", "Garder 10 objectifs au plus."],
      ["5B", "Un autre plafond : ______ objectifs."],
      ["5C", "Un seul (si vous choisissez 1B)."],
    ],
    recommandation: "Pas de nombre recommandé : aucune source ne le fixe. Un plafond bas garde le plan court.",
    decide: null,
  },
  {
    num: "6",
    titre: "Comm : la partie choisie décide-t-elle du parcours du questionnaire ?",
    aujourdhui: [
      "Pour ses objectifs, le dirigeant choisit d'abord « Améliorer ce que j'ai déjà » ou « Mettre en place ma présence en ligne ».",
      "Le questionnaire, lui, suit la réponse à « Publiez-vous pour votre entreprise sur les réseaux sociaux ? » (COM-10.07). Les deux peuvent se contredire : un dirigeant qui publie déjà peut choisir « Mettre en place… ».",
    ],
    options: [
      ["6A", "Garder les deux séparés (situation actuelle)."],
      ["6B", "La partie choisie décide du parcours : COM-10.07 est pré-remplie d'après elle, et reste modifiable."],
      ["6C", "Garder les deux séparés, et signaler l'écart au dirigeant quand ils se contredisent."],
    ],
    recommandation: "6C : le questionnaire reste fondé sur un fait (publier ou non), et le dirigeant voit l'écart avec son objectif.",
    decide: null,
  },
];

// Annexe : chaque objectif, sa mesure, et pour qui il est proposé (filtre selon la taille, calculé par le code de l'application).
const UNITE = { pourcent: "en %", unites: "en nombre", euros: "en €" };
const mesure = (o) => {
  if (o.mesure === "phrase") return "Sans chiffre : « Comment saurez-vous que c'est atteint ? »";
  if (o.gabarit) return `Nombre visé : « ${o.gabarit.pluriel.replace("{n}", "N")} »`;
  return `Chiffre ${(o.unites ?? [o.unite]).map((u) => UNITE[u] ?? u).join(" ou ")}`;
};
const cachesPour = (def, taille) => {
  const gardes = new Set(objectifsPourLaTaille(def, THEMES, REGLES, taille, []).objectifs.map((o) => o.id));
  return def.objectifs.filter((o) => !gardes.has(o.id));
};
const RH = OBJECTIFS.agents.RH_ORGANISATION;
const COM = OBJECTIFS.agents.COMM_CREATION;
const cachesSeul = new Set([...cachesPour(RH, "seul"), ...cachesPour(COM, "seul")].map((o) => o.id));
const caseVide = '<span class="case"></span>';
const tableau = (objectifs) =>
  `<table class="annexe"><thead><tr><th>Objectif</th><th>Mesure</th><th>Exemple de réussite</th><th class="c">OK</th><th class="c">À changer</th></tr></thead><tbody>${objectifs
    .map(
      (o) =>
        `<tr><td><b>${esc(o.libelle)}</b>${o.detail ? `<br><span class="p">${esc(o.detail)}</span>` : ""}${cachesSeul.has(o.id) ? '<br><span class="pastille">pas proposé au dirigeant seul</span>' : ""}</td><td>${esc(mesure(o))}</td><td>${esc(o.exemple?.reussite ?? "")}</td><td class="c">${caseVide}</td><td class="c">${caseVide}</td></tr>`,
    )
    .join("")}</tbody></table>`;
const parties = COM.parties.map((p) => p.nom);
const comParPartie = parties.map((p) => COM.objectifs.filter((o) => o.groupe === p));
const total = RH.objectifs.length + COM.objectifs.length;
const remplacer = (t) =>
  t
    .replace("{CACHES_SEUL}", [...cachesSeul].map((id) => `« ${RH.objectifs.find((o) => o.id === id)?.libelle} »`).join(", "))
    .replace("{TOTAL}", String(total))
    .replace("{DETAIL}", `${RH.objectifs.length} en RH, ${COM.objectifs.length} en Comm (${comParPartie.map((l, i) => `${l.length} dans « ${parties[i]} »`).join(", ")})`);

const option = ([code, texte]) => `<li><span class="case"></span><span class="code">${code}</span> ${esc(texte)}</li>`;
const zoneChoix = '<div class="choix"><span>Votre choix et vos remarques :</span><div class="ligne"></div><div class="ligne"></div></div>';
const bloc = (d) => {
  const corps = d.sous
    ? d.sous
        .map(
          (s) =>
            `<div class="sous"><h3>${s.num}. ${esc(s.titre)}</h3>${s.avantApres.map((t) => `<p>${esc(remplacer(t))}</p>`).join("")}<ul class="options">${s.options.map(option).join("")}</ul><p class="reco"><b>Ma recommandation :</b> ${esc(s.recommandation)}</p>${zoneChoix}</div>`,
        )
        .join("")
    : `<p class="s">Aujourd'hui</p><ul>${d.aujourdhui.map((t) => `<li>${esc(remplacer(t))}</li>`).join("")}</ul><p class="s">Les choix</p><ul class="options">${d.options.map(option).join("")}</ul><p class="reco"><b>Ma recommandation :</b> ${esc(d.recommandation)}</p>${zoneChoix}`;
  const etat = d.decide ? `<p class="decide">Décidé le ${esc(d.decide.date)} : ${esc(d.decide.code)}. ${esc(d.decide.note ?? "")}</p>` : "";
  return `<section class="decision"><h2><span class="num">${d.num}</span>${esc(d.titre)}</h2>${etat}${corps}</section>`;
};

const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Objectifs RH et Comm : vos choix</title><style>
@page { size: A4; margin: 16mm 15mm 16mm; }
:root { --encre: #07111B; --bleu: #1E4E96; --rouge: #B71C2B; --gris: #5b6672; --ligne: #c9ced4; --fond: #F7F2E6; }
body { font: 10.5pt/1.45 "Inter", "Helvetica Neue", Arial, sans-serif; color: var(--encre); margin: 0; }
h1 { font-size: 22pt; font-weight: 800; letter-spacing: .01em; margin: 0 0 2pt; }
.sous-titre { color: var(--gris); margin: 0 0 10pt; }
.bandeau { border-top: 3pt solid var(--bleu); margin: 0 0 12pt; position: relative; }
.bandeau::after { content: ""; position: absolute; right: 0; top: -3pt; width: 18%; border-top: 3pt solid var(--rouge); }
.intro { background: var(--fond); border-radius: 4pt; padding: 8pt 11pt; margin-bottom: 12pt; }
.intro p { margin: 3pt 0; }
h2 { font-size: 13.5pt; font-weight: 800; margin: 0 0 6pt; display: flex; align-items: baseline; gap: 7pt; }
h2 .num { display: inline-block; min-width: 17pt; text-align: center; color: #fff; background: var(--bleu); border-radius: 3pt; font-size: 11pt; padding: 1pt 4pt; }
h3 { font-size: 11pt; font-weight: 700; margin: 8pt 0 3pt; }
section.decision { border: 1px solid var(--ligne); border-radius: 6pt; padding: 10pt 12pt; margin: 0 0 10pt; }
h2, h3, .s { break-after: avoid; }
ul.options, .reco, .choix { break-inside: avoid; }
.sous { break-inside: avoid; border-top: 1px dashed var(--ligne); padding-top: 4pt; margin-top: 6pt; }
.sous:first-of-type { border-top: 0; margin-top: 0; padding-top: 0; }
p { margin: 3pt 0; } ul { margin: 2pt 0 4pt; padding-left: 15pt; } li { margin: 1.5pt 0; }
.s { font-weight: 700; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; color: var(--gris); margin: 6pt 0 1pt; }
ul.options { list-style: none; padding-left: 0; margin: 4pt 0; }
ul.options li { display: flex; gap: 6pt; align-items: baseline; margin: 3pt 0; }
.case { display: inline-block; flex: none; width: 9pt; height: 9pt; border: 1.2pt solid var(--encre); border-radius: 1.5pt; position: relative; top: 1pt; }
.code { flex: none; font-weight: 700; color: var(--bleu); min-width: 26pt; }
.reco { border-left: 3pt solid var(--bleu); padding: 2pt 0 2pt 7pt; margin: 6pt 0; }
.choix { margin-top: 6pt; font-size: 9pt; color: var(--gris); }
.choix .ligne { border-bottom: 1px solid var(--ligne); height: 14pt; }
.decide { background: #e7f3ea; border-radius: 3pt; padding: 4pt 7pt; font-weight: 600; }
h2.annexe-titre { margin-top: 0; break-before: page; }
h3.partie { font-size: 11.5pt; margin: 10pt 0 4pt; color: var(--bleu); }
table.annexe { border-collapse: collapse; width: 100%; font-size: 8.8pt; line-height: 1.35; }
table.annexe th, table.annexe td { border: 1px solid var(--ligne); padding: 3pt 5pt; text-align: left; vertical-align: top; }
table.annexe thead th { background: var(--fond); font-size: 8pt; text-transform: uppercase; letter-spacing: .04em; }
table.annexe tr { break-inside: avoid; }
table.annexe th:nth-child(1) { width: 34%; } table.annexe th:nth-child(2) { width: 27%; } table.annexe th:nth-child(3) { width: 27%; }
.c { text-align: center !important; width: 6%; }
.p { color: var(--gris); }
.pastille { display: inline-block; margin-top: 2pt; font-size: 7.5pt; border: 1px solid var(--rouge); color: var(--rouge); border-radius: 3pt; padding: 0 4pt; }
.pied { margin-top: 12pt; font-size: 8.5pt; color: var(--gris); }
</style><body>
<h1>Objectifs RH et Comm : vos choix</h1>
<p class="sous-titre">CAXE · document de décision · 28 octobre 2026</p>
<div class="bandeau"></div>
<div class="intro">
<p>Ce document rassemble les choix qui vous restent sur les objectifs des agents RH et Comm. Rien de ce qui est proposé ici n'est appliqué tant que vous n'avez pas choisi.</p>
<p>Pour chaque point : ce qui existe aujourd'hui dans l'application, les choix possibles avec leur code, et ma recommandation. Vous pouvez cocher les cases et écrire sur le document, ou simplement me répondre avec les codes (par exemple « 1A, 2a-1, 2b-1, 2c-1, 3A, 4a-3, 4b-1, 5B : 3, 6C »). Je reporte vos choix dans l'application et je mets ce document à jour.</p>
</div>
${DECISIONS.map(bloc).join("")}
<h2 class="annexe-titre"><span class="num">A</span>Annexe : les ${total} objectifs proposés</h2>
<p>Liste en cours dans l'application (brouillon à valider). « Nombre visé » : la phrase enregistrée, où N est le nombre donné par le dirigeant. Aucun chiffre n'est suggéré au dirigeant. Le détail des changements du 28 octobre (avant et après, et pourquoi) est dans <i>docs/objectifs/objectifs-rh-comm.md</i>.</p>
<h3 class="partie">RH &amp; Organisation (${RH.objectifs.length})</h3>
${tableau(RH.objectifs)}
${comParPartie.map((l, i) => `<h3 class="partie">Comm &amp; Création de contenu · ${esc(parties[i])} (${l.length})</h3>${tableau(l)}`).join("")}
<p class="pied">Document tiré du dépôt : les décisions sont écrites dans scripts/pdf-decisions-objectifs.mjs, la liste vient de data/objectifs-agents.json. Il est régénéré à chaque changement.</p>
</body></html>`;

if (process.env.HTML_SORTIE) writeFileSync(process.env.HTML_SORTIE, html);
const nav = await chromium.launch({ args: ["--proxy-bypass-list=*"], executablePath: "/opt/pw-browsers/chromium" });
const page = await nav.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: SORTIE,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: '<div style="width:100%;font:7.5pt Inter,Arial,sans-serif;color:#5b6672;text-align:center">Objectifs RH et Comm : vos choix · page <span class="pageNumber"></span> sur <span class="totalPages"></span></div>',
  margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
});
await nav.close();
console.log(`Écrit : ${SORTIE} (${total} objectifs en annexe, ${DECISIONS.length} décisions)`);

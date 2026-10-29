// Document de décision (PDF) : les choix qui restent au propriétaire sur les objectifs RH et Comm (28 octobre). Les décisions sont
// écrites ci-dessous ; l'annexe est tirée de data/objectifs-agents.json, avec le filtre selon la taille calculé par le code de
// l'application. Écrit docs/objectifs/CAXE-decisions-objectifs.pdf.
//   node scripts/pdf-decisions-objectifs.mjs           (HTML_SORTIE=fichier.html pour garder aussi la page)
// Quand un choix est fait, mettre à jour la décision concernée (champ « decide » : codes retenus, date, note) et relancer : le
// document dit alors ce qui est décidé et coche l'option retenue. « attente » : point sur lequel le propriétaire a demandé
// une explication avant de choisir.
import { writeFileSync } from "node:fs";
import { RH, COM, PARTIES as parties, COM_PAR_PARTIE as comParPartie, TOTAL as total, CACHES_SEUL as cachesSeul, proposeA, esc, mesure, imprimer } from "./objectifs-pdf-commun.mjs";

const SORTIE = "docs/objectifs/CAXE-decisions-objectifs.pdf";

// Les décisions. « decide » : null tant que le propriétaire n'a pas choisi ; sinon les codes retenus, la date et une note.
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
    decide: { codes: ["1B"], date: "28 octobre 2026", note: "Un objectif par agent en RH et en Comm, comme en Acquisition et en Finance. « Ajouter un autre objectif » est retiré ; le serveur refuse un deuxième objectif." },
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
          "Retenu après votre clarification du périmètre : « Construire un parcours qui transforme mes visiteurs en clients », précisé par « Le chemin prévu de vos publications et de votre site jusqu'à l'achat : message, appel, rendez-vous ou commande, puis relance. »",
        ],
        options: [
          ["2b-1", "Valider : l'objectif s'arrête au contact."],
          ["2b-2", "Garder l'ancien sens (l'objectif dépasse alors le périmètre de l'agent Comm)."],
          ["2b-3", "Autre formulation (à écrire)."],
        ],
        recommandation: "2b-1 : chaque agent garde son périmètre, et l'Acquisition mesure déjà la transformation des demandes en clients.",
        // Le propriétaire n'a choisi aucune des trois options : il a clarifié le périmètre de l'agent Comm (voir la note de la décision 2).
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
    decide: {
      codes: ["2a-1", "2c-1"],
      date: "28 octobre 2026",
      note: "2a-1 et 2c-1 validés. 2b : aucune des trois options ; le périmètre de l'agent Comm est clarifié : il conseille sur l'acquisition de clients obtenue grâce à la communication (canaux et contenus, parcours de conversion lié à la communication, dispositifs à mettre en place, amélioration de l'existant) ; l'Acquisition garde les processus internes. L'objectif redevient « Construire un parcours qui transforme mes visiteurs en clients ».",
    },
  },
  {
    num: "3",
    titre: "Le filtre des propositions selon la taille de l'entreprise",
    aujourdhui: [
      "Une proposition dont tous les thèmes sont masqués pour la taille de l'entreprise n'est pas proposée. C'est la règle de masquage des thèmes, appliquée telle quelle.",
      "Effet réel, calculé par le code de l'application : seuls trois objectifs RH sont retirés, et seulement pour un dirigeant seul — {CACHES_SEUL}. Aucun objectif Comm n'est retiré. Dès deux personnes, tout est proposé, sauf « Me faire aider dans mon travail » (ajouté au point 4) : ce même filtre le réserve au dirigeant seul.",
      "Un objectif déjà choisi reste toujours proposé.",
    ],
    options: [
      ["3A", "Garder le filtre (situation actuelle)."],
      ["3B", "Montrer toutes les propositions à tous."],
    ],
    recommandation: "3A : un dirigeant seul n'a pas d'équipe, et ces trois objectifs n'auraient aucune question pour les mesurer (leurs thèmes ne lui sont pas posés).",
    decide: null,
    attente: "Vous avez demandé ce que 3A implique avant de choisir. En bref : avec 3A, un dirigeant seul ne voit pas les trois objectifs d'équipe, et seul lui voit « Me faire aider dans mon travail » ; avec 3B, tout le monde voit tout, y compris des objectifs qu'aucune question ne permet de suivre. Le filtre reste en place en attendant votre choix.",
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
          "Retenu (formulation concrète demandée) : « Libérer du temps pour piloter l'entreprise », précisé par « Des heures que vous ne passez plus sur des tâches qu'une autre personne ou un outil pourrait faire. » Question : « Combien d'heures par semaine voulez-vous libérer ? ». Pour 5 heures sur 3 mois, la phrase enregistrée est « libérer 5 heures par semaine pour piloter l'entreprise d'ici 3 mois ». Le chiffre est celui du dirigeant : aucun n'est suggéré. Thèmes RH-05 et RH-17 ; proposé à tous.",
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
          "Retenu : « Me faire aider dans mon travail », précisé par « Par un salarié, un apprenti, un freelance ou un associé. » Sans chiffre : « Comment saurez-vous que c'est atteint ? », avec l'exemple « une personne prend en charge chaque semaine des tâches que je faisais seul ». Phrase enregistrée : « me faire aider dans mon travail, d'ici 6 mois ». Thèmes RH-41 à RH-45 ; proposé seulement au dirigeant seul (le filtre du point 3 le fait de lui-même : ces thèmes ne sont posés qu'à lui). Aucun conseil sur le contrat ni sur le droit du travail.",
        ],
        options: [
          ["4b-1", "Ajouter, avec cette proposition."],
          ["4b-2", "Ajouter, avec d'autres mots (à écrire)."],
          ["4b-3", "Ne pas ajouter."],
        ],
        recommandation: "4b-1 : le bloc « S'entourer » existe déjà et n'est relié à aucun objectif.",
      },
    ],
    decide: { codes: ["4a-1", "4b-1"], date: "28 octobre 2026", note: "Les deux objectifs sont ajoutés, avec les formulations concrètes ci-dessous." },
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
    decide: {
      codes: ["5C"],
      date: "28 octobre 2026",
      note: "Vous avez demandé d'appliquer ma recommandation ; elle ne fixait pas de nombre. Avec 1B, le plafond est d'un objectif (5C) : c'est la conséquence de votre choix au point 1, pas une recommandation de ma part. La liste entière est gardée (52 objectifs, plus les deux du point 4), avec des textes clarifiés ; elle reste à relire (colonnes de l'annexe).",
    },
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
    decide: { codes: ["6C"], date: "28 octobre 2026", note: "Quand la partie de l'objectif ne correspond pas à la réponse sur la publication, un message l'explique sous l'objectif et sous la question ; rien n'est bloqué ni changé." },
  },
];

// Annexe : chaque objectif, sa mesure, et pour qui il est proposé (filtre selon la taille, calculé par le code de l'application).
const caseVide = '<span class="case"></span>';
const tableau = (objectifs) =>
  `<table class="annexe"><thead><tr><th>Objectif</th><th>Mesure</th><th>Exemple de réussite</th><th class="c">OK</th><th class="c">À changer</th></tr></thead><tbody>${objectifs
    .map(
      (o) =>
        `<tr><td><b>${esc(o.libelle)}</b>${o.detail ? `<br><span class="p">${esc(o.detail)}</span>` : ""}${proposeA(o.id) !== "Tous" ? `<br><span class="pastille">${proposeA(o.id).toLowerCase()}</span>` : ""}</td><td>${esc(mesure(o))}</td><td>${esc(o.exemple?.reussite ?? "")}</td><td class="c">${caseVide}</td><td class="c">${caseVide}</td></tr>`,
    )
    .join("")}</tbody></table>`;
const remplacer = (t) =>
  t
    .replace("{CACHES_SEUL}", [...cachesSeul].map((id) => `« ${RH.objectifs.find((o) => o.id === id)?.libelle} »`).join(", "))
    .replace("{TOTAL}", String(total))
    .replace("{DETAIL}", `${RH.objectifs.length} en RH, ${COM.objectifs.length} en Comm (${comParPartie.map((l, i) => `${l.length} dans « ${parties[i]} »`).join(", ")})`);

const option = (retenus) => ([code, texte]) => `<li><span class="case${retenus.includes(code) ? " coche" : ""}"></span><span class="code">${code}</span> ${esc(texte)}</li>`;
const zoneChoix = '<div class="choix"><span>Votre choix et vos remarques :</span><div class="ligne"></div><div class="ligne"></div></div>';
const bloc = (d) => {
  const retenus = d.decide?.codes ?? [];
  const corps = d.sous
    ? d.sous
        .map(
          (s) =>
            `<div class="sous"><h3>${s.num}. ${esc(s.titre)}</h3>${s.avantApres.map((t) => `<p>${esc(remplacer(t))}</p>`).join("")}<ul class="options">${s.options.map(option(retenus)).join("")}</ul><p class="reco"><b>Ma recommandation :</b> ${esc(s.recommandation)}</p>${d.decide ? "" : zoneChoix}</div>`,
        )
        .join("")
    : `<p class="s">${d.decide ? "Avant votre choix" : "Aujourd'hui"}</p><ul>${d.aujourdhui.map((t) => `<li>${esc(remplacer(t))}</li>`).join("")}</ul><p class="s">Les choix</p><ul class="options">${d.options.map(option(retenus)).join("")}</ul><p class="reco"><b>Ma recommandation :</b> ${esc(d.recommandation)}</p>${d.decide ? "" : zoneChoix}`;
  const etat = d.decide
    ? `<p class="decide">Décidé le ${esc(d.decide.date)} : ${esc(d.decide.codes.join(", "))}. ${esc(d.decide.note ?? "")}</p>`
    : d.attente
      ? `<p class="attente">À clarifier : ${esc(d.attente)}</p>`
      : "";
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
.attente { background: #fbf1d9; border-radius: 3pt; padding: 4pt 7pt; font-weight: 600; }
.case.coche { background: var(--encre); box-shadow: inset 0 0 0 1.5pt #fff; }
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
<p>Ce document rassemble les choix sur les objectifs des agents RH et Comm. Vos réponses du 28 octobre sont reportées en vert sous chaque point, l'option retenue est cochée, et elles sont appliquées dans l'application.</p>
<p>Le point 3 reste à clarifier (encadré jaune) : le filtre selon la taille reste en place en attendant votre choix. La liste des objectifs, en annexe, reste à relire texte par texte.</p>
</div>
${DECISIONS.map(bloc).join("")}
<h2 class="annexe-titre"><span class="num">A</span>Annexe : les ${total} objectifs proposés</h2>
<p>Liste en cours dans l'application (textes à relire). Pour un objectif chiffré : la question posée, puis la phrase enregistrée, où N est le chiffre donné par le dirigeant et X son délai en mois. Aucun chiffre n'est suggéré au dirigeant. Le détail des changements du 28 octobre (avant et après, et pourquoi) est dans <i>docs/objectifs/objectifs-rh-comm.md</i>.</p>
<h3 class="partie">RH &amp; Organisation (${RH.objectifs.length})</h3>
${tableau(RH.objectifs)}
${comParPartie.map((l, i) => `<h3 class="partie">Comm &amp; Création de contenu · ${esc(parties[i])} (${l.length})</h3>${tableau(l)}`).join("")}
<p class="pied">Document tiré du dépôt : les décisions sont écrites dans scripts/pdf-decisions-objectifs.mjs, la liste vient de data/objectifs-agents.json. Il est régénéré à chaque changement.</p>
</body></html>`;

if (process.env.HTML_SORTIE) writeFileSync(process.env.HTML_SORTIE, html);
await imprimer(html, SORTIE, { titre: "Objectifs RH et Comm : vos choix" });
console.log(`Écrit : ${SORTIE} (${total} objectifs en annexe, ${DECISIONS.length} décisions)`);

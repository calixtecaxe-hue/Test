// Audit de l'utilité des questions (28 octobre) : assemble les évaluations écrites à la main (docs/audit-utilite/evaluations/)
// et les utilisations extraites (docs/audit-utilite/usages.json) en un tableau complet et en listes du rapport.
// Lecture seule pour data/ : la banque n'est pas modifiée.
//
//   node scripts/verification/utilite-extraire.mjs   (d'abord, si les données ont changé)
//   node scripts/verification/utilite-rapport.mjs
//
// Sorties :
//   - docs/audit-utilite/questions.csv : une ligne par question (banque, en attente, cadrage) ;
//   - docs/audit-utilite/evaluations.json : la même chose en JSON ;
//   - docs/audit-utilite/rapport.md : les blocs entre les marqueurs « debut:… » et « fin:… » sont réécrits, le reste du rapport
//     (écrit à la main) est gardé.
// Code de sortie 1 si une question de la banque n'a pas d'évaluation, ou si une évaluation est mal formée.
import fs from "node:fs";

const lire = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const DOSSIER = "docs/audit-utilite";
const USAGES = lire(`${DOSSIER}/usages.json`);
const DONNEES = new Map(fs.readdirSync("data").filter((f) => f.startsWith("donnees-")).flatMap((f) => lire(`data/${f}`)).map((d) => [d.code, d]));
const CROISEMENTS = new Map(lire("data/croisements.json").map((x) => [x.code, x.nom]));
const SCENARIOS = new Map(lire("data/scenarios.json").map((x) => [x.code, x.nom]));
const DIAG = new Map(lire("data/diagnostic-comm.json").problemes.map((x) => [x.code, x.probleme]));

const RECOMMANDATIONS = {
  conserver: "Conserver",
  preciser: "Préciser",
  conditionnelle: "Rendre conditionnelle",
  fusionner: "Fusionner",
  retirer: "Retirer",
  remplacer: "Remplacer",
  en_attente: "En attente",
};
const CATEGORIES = {
  justifiee: "Justifiée",
  exploitation: "Utile, exploitation à développer",
  conditions: "Utile sous conditions",
  formulation: "Mal formulée",
  a_justifier: "Utilité à justifier",
  peu_utile: "Peu utile",
};
const CHAMPS = {
  j: "justification",
  p: "probleme",
  g: "conseilGenerique",
  prof: "profilsPertinents",
  t: "textePropose",
  r: "reponsesProposees",
  c: "conditionProposee",
  f: "doublon",
  m: "manque",
  d: "arbitrage",
};

// Lecture des évaluations : « CODE | recommandation | catégorie[+catégorie] », puis des champs indentés « clé: valeur ».
const erreurs = [];
const evaluations = new Map();
for (const fichier of fs.readdirSync(`${DOSSIER}/evaluations`).filter((f) => f.endsWith(".txt")).sort()) {
  let courante = null;
  for (const [i, ligne] of fs.readFileSync(`${DOSSIER}/evaluations/${fichier}`, "utf8").split("\n").entries()) {
    const ou = `${fichier}:${i + 1}`;
    if (!ligne.trim() || ligne.startsWith("#")) continue;
    const entete = ligne.match(/^([A-Z]{2,3}-\d{2}\.\d{2}|D\d{2}) \| (\S+) \| (\S+)$/);
    if (entete) {
      const [, code, recommandation, cats] = entete;
      const categories = cats.split("+");
      if (!RECOMMANDATIONS[recommandation]) erreurs.push(`${ou} : recommandation inconnue « ${recommandation} »`);
      for (const c of categories) if (!CATEGORIES[c]) erreurs.push(`${ou} : catégorie inconnue « ${c} »`);
      if (evaluations.has(code)) erreurs.push(`${ou} : ${code} évaluée deux fois`);
      courante = { code, fichier, recommandation, categories };
      evaluations.set(code, courante);
      continue;
    }
    const champ = ligne.match(/^ {2}(\w+): (.+)$/);
    if (champ && courante && CHAMPS[champ[1]]) {
      const cle = CHAMPS[champ[1]];
      courante[cle] = courante[cle] ? `${courante[cle]} ${champ[2]}` : champ[2];
      continue;
    }
    erreurs.push(`${ou} : ligne illisible « ${ligne.slice(0, 60)} »`);
  }
}
for (const e of evaluations.values()) {
  if (!e.justification) erreurs.push(`${e.code} : justification manquante`);
  if (e.recommandation !== "conserver" && e.recommandation !== "en_attente" && !e.probleme) erreurs.push(`${e.code} : problème manquant`);
  if (e.recommandation === "conserver" && e.categories.some((c) => c === "peu_utile")) erreurs.push(`${e.code} : « peu utile » mais conservée`);
}

// Couverture : chaque question de la banque et chaque déclencheur de cadrage posé à part a son évaluation. Les déclencheurs qui
// lisent une question de la banque sont évalués avec elle.
const DERIVES = new Set(Object.entries(lire("data/regles-affichage.json").declencheurs).filter(([, v]) => v.type === "reponse_donnee").map(([k]) => k));
const attendues = [...USAGES.questions.map((q) => q.code), ...USAGES.cadrage.map((c) => c.code).filter((c) => !DERIVES.has(c))];
for (const code of attendues) if (!evaluations.has(code)) erreurs.push(`${code} : aucune évaluation`);
for (const code of evaluations.keys()) if (!attendues.includes(code)) erreurs.push(`${code} : évaluée mais absente de la banque et du cadrage`);

// Ce qui lit chaque question, en deux parts : prévu par le classeur (calculs, croisements, notation, lecture par l'IA) et exécuté
// aujourd'hui par le code (règles d'affichage, lignes de tableaux, réponses déduites ou pré-remplies, évolutions).
function usages(q) {
  const d = DONNEES.get(q.code);
  const prevu = [];
  if (q.calculees.length) prevu.push(`calculs ${q.calculees.join(", ")}`);
  if (q.croisements.length) prevu.push(`croisements ${q.croisements.map((c) => `${c} (${CROISEMENTS.get(c)})`).join(", ")}`);
  if (q.scenarios.length) prevu.push(`scénarios ${q.scenarios.map((c) => `${c} (${SCENARIOS.get(c)})`).join(", ")}`);
  if (q.diagnosticComm.length) prevu.push(`diagnostic Comm ${q.diagnosticComm.map((c) => `${c} (${DIAG.get(c)})`).join(", ")}`);
  if (q.indicateursMarche.length) prevu.push(`indicateurs comparables au marché ${[...new Set(q.indicateursMarche)].join(", ")}`);
  const texte = (d?.utiliseeDansTexte ?? "").trim();
  if (/Notée directement/.test(texte)) prevu.push("notée directement (règle Pratique non écrite)");
  if (/Lue par l.IA/.test(texte)) prevu.push("lue par l'IA (IA non branchée)");
  if (/Affichée dans le rapport/.test(texte)) prevu.push("affichée dans le rapport");
  const execute = [];
  if (q.ouvre.length) execute.push(`ouvre ou ferme ${q.ouvre.length} question${q.ouvre.length > 1 ? "s" : ""}`);
  if (q.masqueThemes.length) execute.push(`masque ${q.masqueThemes.length} thème${q.masqueThemes.length > 1 ? "s" : ""}`);
  if (q.tableauxLies.length) execute.push("lignes de tableaux liés");
  const lignesDe = USAGES.questions.filter((x) => x.lignes?.some((l) => l.includes(`donnee ${q.code}`) || (q.declencheur && l.includes(`declencheur ${q.declencheur}`)))).map((x) => x.code);
  if (lignesDe.length) execute.push(`lignes de ${lignesDe.length} tableau${lignesDe.length > 1 ? "x" : ""}`);
  if (q.deduite.length) execute.push(`réponse déduite (${q.deduite.join(", ")})`);
  if (q.preReponse.length) execute.push(`total pré-rempli de ${q.preReponse.join(", ")}`);
  if (q.evolutions.length) execute.push(`évolutions ${q.evolutions.join(", ")}`);
  if (q.mode === "partagee") execute.push("partagée entre agents (posée une fois)");
  return { prevu: prevu.join(" ; "), execute: execute.join(" ; ") };
}

const NIVEAUX = { essentiel: "essentiel", approfondi: "approfondi" };
const lignes = [];
for (const q of USAGES.questions) {
  const e = evaluations.get(q.code) ?? {};
  const u = usages(q);
  lignes.push({
    code: q.code,
    statut: q.statut === "en_attente" ? "en attente" : "banque",
    agent: q.agent,
    theme: q.theme ? `${q.theme.code} ${q.theme.nom}` : "",
    nature: q.theme?.nature ?? "",
    niveau: NIVEAUX[q.niveau] ?? "",
    profils: q.profils.length === 8 ? "tous" : q.profils.join(", "),
    metiers: q.metiers ? q.metiers.length + " métiers ou activités" : "",
    condition: q.condition ?? "",
    texte: q.texte,
    reponses: [q.type, q.choix.filter(Boolean).join(" / "), q.lignes ? `lignes : ${q.lignes.join(" / ")}` : ""].filter(Boolean).join(" · "),
    effort: q.effort,
    usagePrevu: u.prevu,
    usageExecute: u.execute,
    recommandation: RECOMMANDATIONS[e.recommandation] ?? "",
    categories: (e.categories ?? []).map((c) => CATEGORIES[c]).join(" + "),
    ...Object.fromEntries(Object.values(CHAMPS).map((k) => [k, e[k] ?? ""])),
    _e: e,
    _q: q,
  });
}
for (const c of USAGES.cadrage.filter((x) => !DERIVES.has(x.code))) {
  const e = evaluations.get(c.code) ?? {};
  lignes.push({
    code: c.code,
    statut: "cadrage",
    agent: "Cadrage",
    theme: "",
    nature: "",
    niveau: "",
    profils: "tous",
    metiers: "",
    condition: `posée : ${c.posee}`,
    texte: c.question,
    reponses: String(c.reponses ?? ""),
    effort: 1,
    usagePrevu: c.effet ?? "",
    usageExecute: [c.ouvre.length ? `ouvre ou ferme ${c.ouvre.length} questions` : "", c.masqueThemes.length ? `masque ${c.masqueThemes.length} thèmes` : ""].filter(Boolean).join(" ; "),
    recommandation: RECOMMANDATIONS[e.recommandation] ?? "",
    categories: (e.categories ?? []).map((x) => CATEGORIES[x]).join(" + "),
    ...Object.fromEntries(Object.values(CHAMPS).map((k) => [k, e[k] ?? ""])),
    _e: e,
    _q: null,
  });
}

// Une question conservée dont le classeur n'écrit aucun usage : l'usage justifié ici reste à écrire dans le classeur.
const sansUsageEcrit = (l) => l.statut !== "cadrage" && l._e.recommandation === "conserver" && !l.usagePrevu && !l.usageExecute;
for (const l of lignes.filter(sansUsageEcrit)) {
  const note = "Usage à écrire dans le classeur (colonne « Utilisée dans » vide).";
  if (!/classeur/.test(l.manque)) l.manque = l.manque ? `${l.manque} ${note}` : note;
}

// Tableau complet.
const COLONNES = [
  ["code", "Code"], ["statut", "Statut"], ["agent", "Agent"], ["theme", "Thème"], ["nature", "Nature du thème"], ["niveau", "Niveau"],
  ["profils", "Profils"], ["metiers", "Métiers"], ["condition", "Condition actuelle"], ["texte", "Texte exact"], ["reponses", "Réponses"],
  ["effort", "Cases à remplir"], ["usagePrevu", "Usage prévu (classeur)"], ["usageExecute", "Usage exécuté (code)"],
  ["recommandation", "Recommandation"], ["categories", "Catégorie"], ["justification", "Justification"], ["probleme", "Problème"],
  ["conseilGenerique", "Conseil générique à risque"], ["profilsPertinents", "Profils pertinents"], ["textePropose", "Texte proposé (proposition)"],
  ["reponsesProposees", "Réponses proposées (proposition)"], ["conditionProposee", "Condition proposée"], ["doublon", "Doublon ou fusion"],
  ["manque", "Donnée ou règle manquante"], ["arbitrage", "Arbitrage"],
];
const cellule = (v) => {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
fs.writeFileSync(`${DOSSIER}/questions.csv`, "﻿" + [COLONNES.map(([, t]) => t).join(";"), ...lignes.map((l) => COLONNES.map(([k]) => cellule(l[k])).join(";"))].join("\n") + "\n");
fs.writeFileSync(`${DOSSIER}/evaluations.json`, JSON.stringify(lignes.map((l) => Object.fromEntries(Object.entries(l).filter(([k]) => !k.startsWith("_")))), null, 1) + "\n");

// Chiffres.
const banque = lignes.filter((l) => l.statut !== "cadrage");
const aRevoir = (l) => l._e.recommandation && l._e.recommandation !== "conserver" && l._e.recommandation !== "en_attente";
const aDevelopper = (l) => l._e.recommandation === "conserver" && ((l._e.categories ?? []).some((c) => c !== "justifiee") || sansUsageEcrit(l));
const parCategorie = (ens, c) => ens.filter((l) => (l._e.categories ?? []).includes(c)).length;
const parReco = (ens, r) => ens.filter((l) => l._e.recommandation === r).length;
const AGENTS = ["Acquisition", "Finance", "RH", "Comm"];

const md = [];
md.push("| | Acquisition | Finance | RH | Comm | Total |", "|---|---:|---:|---:|---:|---:|");
const ligneChiffre = (titre, f) => md.push(`| ${titre} | ${AGENTS.map((a) => f(banque.filter((l) => l.agent === a))).join(" | ")} | ${f(banque)} |`);
ligneChiffre("Questions examinées (banque et en attente)", (e) => e.length);
ligneChiffre("dont en attente (ACQ-26, Fabrication)", (e) => e.filter((l) => l.statut === "en attente").length);
ligneChiffre("**Justifiées telles quelles**", (e) => e.filter((l) => l._e.recommandation === "conserver" && l._e.categories.every((c) => c === "justifiee")).length);
ligneChiffre("Conservées, exploitation à développer", (e) => e.filter((l) => l._e.recommandation === "conserver" && l._e.categories.includes("exploitation")).length);
ligneChiffre("Utilité à justifier (conservées ou non)", (e) => parCategorie(e, "a_justifier"));
ligneChiffre("Utiles sous conditions", (e) => parCategorie(e, "conditions"));
ligneChiffre("Mal formulées", (e) => parCategorie(e, "formulation"));
ligneChiffre("Peu utiles", (e) => parCategorie(e, "peu_utile"));
ligneChiffre("Conservées sans aucun usage écrit dans le classeur", (e) => e.filter(sansUsageEcrit).length);
md.push("", "| Recommandation | Acquisition | Finance | RH | Comm | Total |", "|---|---:|---:|---:|---:|---:|");
for (const [r, t] of Object.entries(RECOMMANDATIONS)) ligneChiffre(t, (e) => parReco(e, r));
const cadrage = lignes.filter((l) => l.statut === "cadrage");
md.push("", `Questions de cadrage examinées à part : ${cadrage.length} (${Object.entries(RECOMMANDATIONS).map(([r, t]) => [t, parReco(cadrage, r)]).filter(([, n]) => n).map(([t, n]) => `${t.toLowerCase()} ${n}`).join(", ")}).`);
const chiffres = md.join("\n");

// Liste détaillée des questions à revoir : toute recommandation autre que « conserver », puis les questions conservées dont
// l'exploitation est à développer ou l'utilité à justifier.
const fiche = (l) => {
  const out = [`#### ${l.code} · ${l.agent}${l.theme ? ` · ${l.theme}` : ""}`, ""];
  out.push(`- **Texte** : « ${l.texte} »`);
  if (l.reponses) out.push(`- **Réponses** : ${l.reponses}`);
  out.push(`- **Posée** : ${[l.niveau, l.profils === "tous" ? "tous les profils" : `profils ${l.profils}`, l.metiers, l.condition ? `si ${l.condition}` : ""].filter(Boolean).join(" ; ")}`);
  out.push(`- **Usage** : prévu ${l.usagePrevu || "aucun"} ; exécuté ${l.usageExecute || "aucun"}.`);
  out.push(`- **Recommandation** : ${l.recommandation} (${l.categories})`);
  for (const [cle, titre] of [["probleme", "Problème"], ["justification", "Justification"], ["conseilGenerique", "Conseil générique à risque"], ["profilsPertinents", "Profils pertinents"], ["textePropose", "Texte proposé (proposition, à valider)"], ["reponsesProposees", "Réponses proposées (proposition, à valider)"], ["conditionProposee", "Condition proposée"], ["doublon", "Doublon ou fusion"], ["manque", "Donnée ou règle manquante"], ["arbitrage", "Arbitrage"]]) {
    if (l[cle]) out.push(`- **${titre}** : ${l[cle]}`);
  }
  out.push("");
  return out.join("\n");
};
const ordreReco = Object.keys(RECOMMANDATIONS);
const liste = [];
for (const [titre, filtre] of [
  ["Questions à modifier (recommandation autre que « conserver »)", aRevoir],
  ["Questions conservées dont l'exploitation est à développer, l'utilité à justifier ou l'usage à écrire", aDevelopper],
]) {
  const ens = lignes.filter(filtre);
  liste.push(`### ${titre} (${ens.length})`, "");
  for (const a of [...AGENTS, "Cadrage"]) {
    const parAgent = ens.filter((l) => l.agent === a).sort((x, y) => ordreReco.indexOf(x._e.recommandation) - ordreReco.indexOf(y._e.recommandation) || x.code.localeCompare(y.code));
    if (!parAgent.length) continue;
    liste.push(`<details><summary><strong>${a}</strong> : ${parAgent.length} question${parAgent.length > 1 ? "s" : ""}</summary>`, "");
    for (const l of parAgent) liste.push(fiche(l));
    liste.push("</details>", "");
  }
}

// Classement par bénéfice pour le client : compréhension (texte à préciser), pertinence (question sans objet pour une partie des
// dirigeants, ou qui ne change rien), réduction de l'effort (cases épargnées, pondérées par le niveau et la part des profils).
const poids = (l) => (l._q ? l._q.effort * (l._q.niveau === "essentiel" ? 2 : 1) * Math.max(l._q.profils.length, 1) / 8 : 1);
const classement = [];
// Raison courte : les premières phrases du problème, jusqu'à environ 120 caractères.
const raison = (texte) => {
  let r = "";
  for (const phrase of texte.split(/(?<=\.) /)) {
    r = r ? `${r} ${phrase}` : phrase;
    if (r.length >= 120) break;
  }
  return r.replace(/\|/g, "/");
};
const resume = (l) => `| ${l.code} | ${l.recommandation} | ${raison(l.probleme || l.justification)} |`;
const tableau = (titre, ens) => {
  classement.push(`**${titre}** (${ens.length})`, "", "| Code | Recommandation | Raison |", "|---|---|---|", ...ens.map(resume), "");
};
tableau("Compréhension : textes à préciser", lignes.filter((l) => l._e.categories?.includes("formulation")).sort((a, b) => poids(b) - poids(a)));
tableau("Pertinence : questions posées sans objet à une partie des dirigeants", lignes.filter((l) => l._e.recommandation === "conditionnelle").sort((a, b) => poids(b) - poids(a)));
tableau("Réduction de l'effort : questions à retirer ou à fusionner, de la plus coûteuse à la moins coûteuse", lignes.filter((l) => ["retirer", "fusionner"].includes(l._e.recommandation)).sort((a, b) => poids(b) - poids(a)));

// Arbitrages question par question.
const arbitrages = lignes.filter((l) => l.arbitrage).map((l) => `- **${l.code}** : ${l.arbitrage}`);

// Réécriture des blocs marqués du rapport.
const RAPPORT = `${DOSSIER}/rapport.md`;
let rapport = fs.existsSync(RAPPORT) ? fs.readFileSync(RAPPORT, "utf8") : "";
const remplacer = (nom, contenu) => {
  const re = new RegExp(`(<!-- debut:${nom} -->)[\\s\\S]*?(<!-- fin:${nom} -->)`);
  if (!re.test(rapport)) {
    erreurs.push(`rapport.md : marqueurs « ${nom} » absents`);
    return;
  }
  rapport = rapport.replace(re, () => `<!-- debut:${nom} -->\n${contenu}\n<!-- fin:${nom} -->`);
};
remplacer("chiffres", chiffres);
remplacer("classement", classement.join("\n").trimEnd());
remplacer("arbitrages", arbitrages.join("\n"));
remplacer("liste", liste.join("\n").trimEnd());
fs.writeFileSync(RAPPORT, rapport);

console.log(chiffres);
console.log(`\nÀ modifier : ${lignes.filter(aRevoir).length} ; conservées à développer ou à justifier : ${lignes.filter(aDevelopper).length} ; arbitrages question par question : ${arbitrages.length}.`);
if (erreurs.length) {
  console.error(`\n${erreurs.length} erreur(s) :\n${erreurs.join("\n")}`);
  process.exit(1);
}

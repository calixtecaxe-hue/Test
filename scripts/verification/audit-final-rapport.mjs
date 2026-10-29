// Audit final des questions (29 octobre 2026) : inventaire d'une ligne par question, statut, vérifications et anomalies, et
// chiffres de la synthèse. Assemble ce qui est produit ailleurs, sans rien recopier à la main :
//   - évaluations du 28 octobre (docs/audit-utilite/evaluations.json, écrites à la main, une par question) ;
//   - révisions du 29 octobre (docs/audit-final/revisions.txt) et anomalies (docs/audit-final/anomalies.json), écrites à la main ;
//   - inventaire de la vérification (docs/verification/inventaire-questions.json : texte, réponse, période, conditions, relecture) ;
//   - contrôles automatiques de clarté (docs/audit-final/controles-auto.json) et leur revue (VERDICTS, ci-dessous) ;
//   - résultats des contrôles navigateur (docs/verification/resultats/*.json et journaux).
// Lecture seule pour data/.
//
//   node scripts/verification/audit-final-controles.mts   (d'abord, si la banque a changé)
//   node scripts/verification/audit-final-rapport.mjs
//
// Sorties : docs/audit-final/inventaire.csv et inventaire.json, chiffres.json, et les blocs « debut:… / fin:… » de rapport.md.
// Code de sortie 1 si une question n'a pas d'évaluation ou si une anomalie cite une question inconnue.
import fs from "node:fs";

const lire = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
const D = "docs/audit-final";
const V = "docs/verification";
const R = `${V}/resultats`;
const erreurs = [];

const evaluations = lire("docs/audit-utilite/evaluations.json");
const inventaire = new Map((lire(`${V}/inventaire-questions.json`)?.questions ?? []).map((l) => [l.code, l]));
const banque = new Map(lire("data/banque/questions.json").map((q) => [q.donnee, q]));
const anomalies = lire(`${D}/anomalies.json`).anomalies;
const auto = lire(`${D}/controles-auto.json`);
const partages = lire("data/partages.json");
const evolutions = JSON.stringify(lire("data/evolutions.json"));
const donnees = new Map(fs.readdirSync("data").filter((f) => f.startsWith("donnees-")).flatMap((f) => lire(`data/${f}`)).map((d) => [d.code, d]));
// Pourquoi une question de la banque n'a pas été manipulée dans le navigateur : le contrôle des boutons passe chaque question d'un
// électricien (profil chantier), 4 personnes, niveau approfondi ; les autres contrôles ciblent des règles.
function raisonNonManipulee(code) {
  const d = donnees.get(code);
  if (!d) return "donnée introuvable";
  if (d.metiers) return "module métier (comptes de test : électricien)";
  if ("tailles" in d) return d.tailles.equipe_2_5 ? "condition non remplie par les réponses des contrôles" : "taille absente des comptes de test (2 à 5 personnes)";
  if (!d.profils.chantier) return "profil absent des comptes de test (électricien, profil chantier)";
  return "condition non remplie par les réponses des contrôles";
}

// --- Révisions du 29 octobre -------------------------------------------------------------------------------------------
const RECO = { conserver: "Conserver", preciser: "Préciser", conditionnelle: "Rendre conditionnelle", fusionner: "Fusionner", retirer: "Retirer", remplacer: "Remplacer" };
const CATS = { justifiee: "Justifiée", exploitation: "Utile, exploitation à développer", conditions: "Utile sous conditions", formulation: "Mal formulée", a_justifier: "Utilité à justifier", peu_utile: "Peu utile" };
const CHAMPS = { p: "probleme", g: "conseilGenerique", t: "textePropose", r: "reponsesProposees", c: "conditionProposee", f: "doublon", m: "manque", d: "arbitrage", a: "anomalies" };
const revisions = new Map();
{
  let cour = null;
  for (const [i, ligne] of fs.readFileSync(`${D}/revisions.txt`, "utf8").split("\n").entries()) {
    const tete = ligne.match(/^([A-Z]{2,3}-\d{2}\.\d{2}|D\d{2}) \| (\w+) \| ([\w+]+)$/);
    if (tete) {
      if (!RECO[tete[2]]) erreurs.push(`revisions.txt:${i + 1} : recommandation inconnue ${tete[2]}`);
      cour = { code: tete[1], recommandation: RECO[tete[2]], categories: tete[3].split("+").map((c) => CATS[c] ?? c).join(" + ") };
      revisions.set(cour.code, cour);
      continue;
    }
    const champ = ligne.match(/^ {2}(\w+): (.+)$/);
    if (champ && cour && CHAMPS[champ[1]]) cour[CHAMPS[champ[1]]] = champ[2];
  }
}

// --- Revue des contrôles automatiques (relue à la main le 29 octobre) ---------------------------------------------------
// Pour chaque contrôle : le verdict par défaut, puis les questions qui en sortent (anomalie, ou autre conclusion).
const VERDICTS = {
  "montant sans HT ni TTC": { defaut: "anomalie A-05" },
  "canal ou outil : condition à vérifier": { defaut: "conforme : condition sur le canal ou l'outil présente", codes: { "COM-44.01": "anomalie A-09", "ACQ-07.04": "conforme : un coût nul est une réponse", "ACQ-11.16": "conforme : profil e-commerce ; pratique à relier aux paniers abandonnés (A-17)", "ACQ-17.05": "conforme : pratique à relier aux anciens clients perdus (A-17)", "COM-63.01": "question qui ouvre le bloc ; se déduit de D04 = non (A-20)", "COM-13.10": "conforme : posée seulement si « Site internet » n'est pas coché" } },
  "comparaison avec le passé : évolution à vérifier": { defaut: "conforme : comparée dans data/evolutions.json", sansEvolution: "conforme : fait daté ou tendance déclarée, pas une évolution calculée", codes: { "COM-37.01": "évolution par réseau non calculée, décision en attente (A-15)", "FIN-07.17": "conforme : note d'effectif de l'évolution de la masse salariale" } },
  "texte très proche d'une autre question": { defaut: "conforme : questions différentes", codes: {} },
  "unité différente du texte": { defaut: "faux positif : une part du chiffre d'affaires se répond en %" },
  "stock : condition à vérifier": { defaut: "conforme : posée si stock (D07) ou module métier du stock de biens" },
  "équipe : posée au dirigeant seul": { defaut: "conforme : se répond en estimation, ou écrite pour le dirigeant seul", codes: { "ACQ-04.01": "anomalie A-10", "ACQ-21.04": "anomalie A-10", "FIN-02.01": "anomalie A-10", "RH-07.01": "anomalie A-10", "COM-31.01": "anomalie A-10", "COM-31.02": "anomalie A-10", "RH-28.10": "anomalie A-07", "RH-28.03": "conforme : se répond en estimation (tranches : A-11)" } },
  "financement : condition à vérifier": { defaut: "conforme : posée si crédit (D10) ou découvert (D11)", codes: { "FIN-48.01": "anomalie A-12", "FIN-11.03": "conforme : marge sous le découvert autorisé, utile à tous (résilience)", "ACQ-07.04": "faux positif", "RH-29.01": "faux positif (« prêt » au sens de préparé)", "COM-57.05": "faux positif (« prêt » au sens de disposé)", "ACQ-28.03": "conforme : module métier validé (véhicules)" } },
  "relance : condition à vérifier": { defaut: "conforme : posée si le problème existe (appels manqués, devis, relances)", codes: { "ACQ-09.06": "pratique sans problème constaté (A-17)", "ACQ-11.16": "pratique sans problème constaté (A-17)", "FIN-18.04": "pratique sans problème constaté (A-17)" } },
  "recrutement : condition à vérifier": { defaut: "conforme : posée si recrutement fait ou prévu (D13)" },
  "terme technique sans aide": { defaut: "conforme : vocabulaire courant du dirigeant, défini dans la question" },
  "tranches qui se chevauchent": { defaut: "faux positif : unités différentes (jours, semaines)", codes: {} },
  "zéro impossible à saisir": { defaut: "faux positif : position dans Google et effectif « vous compris » valent au moins 1" },
  "zéro impossible à choisir": { defaut: "faux positif : la première tranche est « Moins d'1 … »", codes: { "RH-28.03": "faux positif (tranches non contiguës : A-11)" } },
  "question double pour un seul champ": { defaut: "conforme : texte libre lu par l'IA" },
  // Croisements (pas des questions) : verdicts repris dans le rapport.
  "croisement d'évolution sans donnée passée parmi ses entrées": { defaut: "faux positif : lit des évolutions calculées à partir des données passées", codes: { XF33: "faux positif : pas une évolution", XC07: "dépend de COM-37.02, non calculée (A-15)", XC18: "dépend de COM-37.02, non calculée (A-15)" } },
};
const jumelles = new Set();
for (const x of auto.candidats.filter((c) => c.controle === "texte très proche d'une autre question")) {
  const autre = x.detail.match(/^([A-Z]{2,3}-\d{2}\.\d{2})/)?.[1];
  if (/100 %/.test(x.detail)) jumelles.add(x.code);
  if (autre && partages.correspondances.some((c) => [c.cle, c.egale].some((k) => k.startsWith(x.code)) && [c.cle, c.egale].some((k) => k.startsWith(autre)))) jumelles.add(x.code);
}
const verdictsParCode = new Map();
for (const x of auto.candidats) {
  const v = VERDICTS[x.controle];
  if (!v) { erreurs.push(`contrôle automatique sans verdict : ${x.controle}`); continue; }
  let texte = v.codes?.[x.code] ?? v.defaut;
  if (x.controle === "comparaison avec le passé : évolution à vérifier" && !v.codes?.[x.code] && !evolutions.includes(x.code)) texte = v.sansEvolution;
  if (x.controle === "texte très proche d'une autre question" && jumelles.has(x.code)) texte = "conforme : même donnée, posée une seule fois (jumelle ou correspondance, data/partages.json)";
  if (!/^X[AFCR]\d\d$/.test(x.code)) verdictsParCode.set(x.code, [...(verdictsParCode.get(x.code) ?? []), `${x.controle} → ${texte}`]);
}

// --- Couverture navigateur (même calcul que scripts/verification/chiffres.mjs) -----------------------------------------
const vues = new Map();
const voir = (code, par) => vues.set(code, new Set([...(vues.get(code) ?? []), par]));
const plan = lire(`${V}/plan-dependances.json`);
const dep = lire(`${R}/dependances.json`);
const cadrageJoue = new Set();
if (dep && plan) {
  const ok = new Set(dep.resultats.filter((r) => /-a$/.test(r.id) && r.statut === "conforme").map((r) => r.item));
  const okB = new Set(dep.resultats.filter((r) => /-b$/.test(r.id) && r.statut === "conforme").map((r) => r.item));
  for (const it of [...plan.items, ...(plan.tailles ?? [])]) {
    if (ok.has(it.id)) for (const c of it.attenduVrai) voir(c, "règles d'affichage");
    if (okB.has(it.id)) for (const k of it.cles ?? []) { if (/^D\d/.test(k)) cadrageJoue.add(k.split(".")[0]); else voir(k, "règles d'affichage (réponse changée à l'écran)"); }
  }
}
const SCENARIOS = { canaux: ["ACQ-03.01", "ACQ-03.02", "ACQ-03.05"], resultats: ["ACQ-02.01", "ACQ-02.02", "ACQ-02.03", "ACQ-02.04", "ACQ-02.05", "ACQ-08.02", "ACQ-08.03", "FIN-05.02", "ACQ-03.01"], separation: ["ACQ-02.01", "ACQ-02.02"], retours: ["ACQ-02.01", "ACQ-02.02", "ACQ-02.03", "ACQ-02.04"], rapides: ["ACQ-03.01", "ACQ-03.02", "ACQ-08.02", "ACQ-08.03", "ACQ-03.05"], historique: ["ACQ-02.01", "ACQ-02.03", "ACQ-23.01", "ACQ-23.03", "ACQ-01.03", "FIN-14.03"], partages: ["RH-07.01", "RH-06.02", "RH-05.01", "FIN-07.03", "FIN-07.01", "COM-13.01", "COM-12.01", "ACQ-02.01", "ACQ-06.07", "FIN-06.02", "ACQ-06.08", "ACQ-06.01", "COM-32.01", "ACQ-07.03", "ACQ-07.01", "ACQ-07.04", "ACQ-20.02", "FIN-34.02", "RH-16.01", "RH-11.01"] };
const scenarios = {};
for (const [f, codes] of Object.entries(SCENARIOS)) {
  const r = lire(`${R}/${f}.json`);
  if (!r) continue;
  scenarios[f] = { controles: r.resultats.length, ecarts: r.resultats.filter((x) => !x.conforme).length };
  if (r.resultats.every((x) => x.conforme)) for (const c of codes) voir(c, f);
}
const planBranches = lire(`${V}/plan-branches.json`);
const branches = lire(`${R}/branches.json`);
if (planBranches && branches) {
  const ok = new Set(branches.resultats.filter((r) => r.statut === "conforme").map((r) => r.id));
  for (const it of planBranches.items) for (const c of it.cas) if (ok.has(c.id)) for (const q of c.attendu) voir(q, "branches des règles");
  scenarios.branches = { controles: branches.resultats.length, ecarts: branches.resultats.filter((x) => x.statut !== "conforme").length };
}
if (dep) scenarios.dependances = { controles: dep.resultats.length, ecarts: dep.resultats.filter((x) => x.statut !== "conforme").length };
const boutons = { questions: new Set(), journaux: 0 };
if (fs.existsSync(`${R}/journaux`)) {
  for (const f of fs.readdirSync(`${R}/journaux`).filter((x) => x.startsWith("boutons-") && x !== "boutons-pages.log")) {
    boutons.journaux++;
    for (const ligne of fs.readFileSync(`${R}/journaux/${f}`, "utf8").split("\n")) {
      const m = ligne.match(/^\s+([A-Z]{2,3}-\d{2}\.\d{2}) /);
      if (m) { voir(m[1], "boutons de réponse"); boutons.questions.add(m[1]); }
    }
  }
}
const synthese = fs.existsSync(`${R}/synthese.txt`) ? fs.readFileSync(`${R}/synthese.txt`, "utf8") : "";

// --- Inventaire ---------------------------------------------------------------------------------------------------------
const anomaliesParCode = new Map();
for (const a of anomalies) for (const c of a.codes) {
  if (!evaluations.some((e) => e.code === c)) erreurs.push(`${a.id} cite une question inconnue : ${c}`);
  anomaliesParCode.set(c, [...(anomaliesParCode.get(c) ?? []), a]);
}
const parId = new Map(anomalies.map((a) => [a.id, a]));
const nettoyer = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const lignes = [];
for (const e of evaluations) {
  const rev = revisions.get(e.code);
  const inv = inventaire.get(e.code);
  const q = banque.get(e.code);
  const recommandation = rev?.recommandation ?? e.recommandation;
  const categories = rev?.categories ?? e.categories;
  const liees = [...new Set([...(anomaliesParCode.get(e.code) ?? []).map((a) => a.id), ...String(rev?.anomalies ?? "").split(/,\s*/).filter(Boolean)])].sort();
  const ouvertes = liees.map((id) => parId.get(id)).filter((a) => a && a.correction.etat !== "faite");
  const corrigees = liees.map((id) => parId.get(id)).filter((a) => a && a.correction.etat === "faite");
  let statut;
  if (e.statut === "en attente") statut = "En attente (catégorie Fabrication)";
  else if (["Retirer", "Fusionner", "Remplacer"].includes(recommandation)) statut = "Faible utilité : retrait, fusion ou remplacement proposé";
  else if (["Préciser", "Rendre conditionnelle"].includes(recommandation) || ouvertes.some((a) => ["condition", "formulation", "doublon", "périmètre"].includes(a.type))) statut = "À clarifier ou à rendre conditionnelle";
  else if (/exploitation/.test(categories)) statut = "Utile, exploitation à développer";
  else statut = "Utile et bien définie";
  // Implémentation, classée à part de l'utilité : ce que le code fait aujourd'hui de la réponse.
  // Une lecture par l'IA décrite seulement dans l'évaluation (thème Contexte, texte libre) est à écrire dans le classeur.
  const implementation = e.statut === "en attente" ? "en attente" : e.usageExecute ? "exécuté par le code" : /lue par l'IA/.test(e.usagePrevu) ? "lu par l'IA du rapport (pas encore branchée)" : e.usagePrevu ? "prévu par le classeur, pas encore exécuté" : /lue par l'IA|thème Contexte|contexte pour l'IA/.test(e.justification) ? "lu par l'IA du rapport, usage à écrire dans le classeur" : "aucun usage écrit";
  const aDevelopper = /exploitation/.test(categories) || ouvertes.some((a) => ["exploitation", "donnée", "règle"].includes(a.type)) || Boolean(e.manque);

  // Vérification : ce qui a réellement été fait sur cette question.
  const verif = [];
  if (inv) verif.push(inv.relecture.replace(/^relue \(texte, aide, choix, unité, période\) : sans correction$/, "relue (texte, aide, choix, unité, période)"));
  else if (e.statut === "cadrage") verif.push("relue (question de cadrage)");
  if (inv?.atteignable === "oui (assemblage)") verif.push("assemblée par le vrai code et contrôlée dans les 7 704 questionnaires du balayage");
  else if (inv?.atteignable === "NON") verif.push(`non posée pendant l'audit : ${inv.raison_non_atteinte}`);
  const navigateur = vues.get(e.code) ?? (e.statut === "cadrage" && cadrageJoue.has(e.code) ? new Set(["règles d'affichage (réponse changée à l'écran)"]) : null);
  if (navigateur) verif.push(`affichée et manipulée dans l'application (${[...navigateur].join(", ")})`);
  else if (e.statut === "banque" && inv?.atteignable === "oui (assemblage)") verif.push(`non manipulée dans le navigateur : ${raisonNonManipulee(e.code)}`);
  for (const v of verdictsParCode.get(e.code) ?? []) verif.push(`contrôle automatique : ${v}`);
  for (const a of corrigees) verif.push(`${a.id} corrigée le 29 octobre (${a.controle.split(".")[0]})`);

  const propositions = [rev?.probleme && `29 oct. : ${rev.probleme}`, e.probleme, rev?.conditionProposee && `Condition proposée : ${rev.conditionProposee}`, e.conditionProposee && `Condition proposée : ${e.conditionProposee}`, rev?.textePropose && `Texte proposé : ${rev.textePropose}`, e.textePropose && `Texte proposé : ${e.textePropose}`, rev?.reponsesProposees && `Réponses proposées : ${rev.reponsesProposees}`, e.reponsesProposees && `Réponses proposées : ${e.reponsesProposees}`, e.doublon && `Doublon ou fusion : ${e.doublon}`, e.manque && `Manque : ${e.manque}`, rev?.arbitrage, e.arbitrage].filter(Boolean);
  const reponse = inv ? [inv.format, inv.choix_ou_colonnes, inv.details_format, inv.unite && `unité : ${inv.unite}`].filter(Boolean).join(" · ") : e.reponses;
  const periode = inv?.periode_dans_le_texte || inv?.periode_classeur || "";
  lignes.push({
    identifiant: e.code,
    agent: e.agent,
    theme: e.theme,
    niveau: e.niveau,
    question: nettoyer(q?.texte ?? e.texte),
    information: nettoyer([reponse, periode && `période : ${periode}`].filter(Boolean).join(" · ")),
    profils: nettoyer([e.profils, e.metiers && `métiers : ${e.metiers}`, inv?.profils_sans_texte && `sans texte pour : ${inv.profils_sans_texte}`].filter(Boolean).join(" · ")),
    conditions: nettoyer([inv?.condition || e.condition, inv?.masquage_du_theme && `thème masqué si ${inv.masquage_du_theme}`].filter(Boolean).join(" · ")) || "toujours posée à ces profils",
    usage: nettoyer(e.justification),
    usagePrevu: nettoyer(e.usagePrevu),
    usageExecute: nettoyer(e.usageExecute),
    implementation,
    effort: e.effort,
    verification: verif.join(" | "),
    statut,
    recommandation,
    categories,
    aDevelopper,
    anomalies: liees.join(", "),
    propositions: nettoyer(propositions.join(" | ")),
    conseilGenerique: nettoyer(e.conseilGenerique),
    navigateur: Boolean(navigateur),
    statutBanque: e.statut,
  });
}
if (lignes.length !== evaluations.length) erreurs.push("inventaire incomplet");

// --- Chiffres -------------------------------------------------------------------------------------------------------------
const compte = (f) => lignes.filter(f).length;
const STATUTS = ["Utile et bien définie", "Utile, exploitation à développer", "À clarifier ou à rendre conditionnelle", "Faible utilité : retrait, fusion ou remplacement proposé", "En attente (catégorie Fabrication)"];
const chiffres = {
  genereLe: new Date().toISOString(),
  recensees: { total: lignes.length, banque: compte((l) => l.statutBanque === "banque"), cadrage: compte((l) => l.statutBanque === "cadrage"), enAttente: compte((l) => l.statutBanque === "en attente") },
  verifiees: {
    evaluees: lignes.length,
    relues: compte((l) => /^(relue|reformulée|corrigée|conforme|à arbitrer)/.test(l.verification)),
    reluesAArbitrer: compte((l) => /^à arbitrer/.test(l.verification)),
    assemblees: compte((l) => /assemblée par le vrai code/.test(l.verification)),
    nonPoseesPendantLAudit: compte((l) => /non posée pendant l'audit/.test(l.verification)),
    manipuleesNavigateur: compte((l) => l.navigateur || (l.statutBanque === "cadrage" && cadrageJoue.has(l.identifiant))),
    banqueManipuleesNavigateur: compte((l) => l.statutBanque === "banque" && l.navigateur),
    banqueNonManipulees: lignes.filter((l) => l.statutBanque === "banque" && !l.navigateur).map((l) => l.identifiant),
    nonManipuleesParRaison: lignes.filter((l) => /non manipulée dans le navigateur : /.test(l.verification)).reduce((acc, l) => { const r = l.verification.match(/non manipulée dans le navigateur : ([^|]+)/)[1].trim(); acc[r] = (acc[r] ?? 0) + 1; return acc; }, {}),
    cadrageManipulees: compte((l) => l.statutBanque === "cadrage" && cadrageJoue.has(l.identifiant)),
  },
  statuts: Object.fromEntries(STATUTS.map((s) => [s, compte((l) => l.statut === s)])),
  aDevelopper: { total: compte((l) => l.aDevelopper), parStatut: Object.fromEntries(STATUTS.map((s) => [s, compte((l) => l.aDevelopper && l.statut === s)])) },
  recommandations: Object.fromEntries([...new Set(lignes.map((l) => l.recommandation))].map((r) => [r, compte((l) => l.recommandation === r)])),
  anomalies: {
    total: anomalies.length,
    parEtat: Object.fromEntries([...new Set(anomalies.map((a) => a.correction.etat))].map((x) => [x, anomalies.filter((a) => a.correction.etat === x).map((a) => a.id)])),
    parType: Object.fromEntries([...new Set(anomalies.map((a) => a.type))].map((x) => [x, anomalies.filter((a) => a.type === x).map((a) => a.id)])),
    questionsConcernees: new Set(anomalies.flatMap((a) => a.codes)).size,
  },
  manques: compte((l) => /Manque :/.test(l.propositions)),
  implementation: Object.fromEntries([...new Set(lignes.map((l) => l.implementation))].map((i) => [i, Object.fromEntries(STATUTS.map((s) => [s, compte((l) => l.implementation === i && l.statut === s)]))])),
  controlesAuto: { candidats: auto.candidats.length, parControle: auto.parControle },
  scenarios,
  boutons: { journaux: boutons.journaux, questions: boutons.questions.size },
  synthese: synthese.trim().split("\n"),
};
chiffres.statutsSomme = Object.values(chiffres.statuts).reduce((s, n) => s + n, 0);
if (chiffres.statutsSomme !== chiffres.recensees.total) erreurs.push("les statuts ne couvrent pas toutes les questions");

// --- Écriture -------------------------------------------------------------------------------------------------------------
const COLONNES = [
  ["identifiant", "Identifiant"], ["agent", "Agent"], ["theme", "Thème"], ["niveau", "Niveau"], ["question", "Question (texte exact)"],
  ["information", "Information recueillie (réponse, unité, période)"], ["profils", "Profils concernés"], ["conditions", "Conditions"],
  ["usage", "Usage attendu"], ["usagePrevu", "Usage prévu par le classeur"], ["usageExecute", "Usage exécuté par le code"], ["implementation", "Implémentation"], ["effort", "Effort (1 à 3)"],
  ["verification", "Vérification"], ["statut", "Statut"], ["recommandation", "Recommandation"], ["categories", "Catégories"],
  ["anomalies", "Anomalies"], ["propositions", "Problème, proposition, manque"], ["conseilGenerique", "Conseil générique à éviter"],
];
const cellule = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
fs.writeFileSync(`${D}/inventaire.csv`, "﻿" + [COLONNES.map(([, t]) => cellule(t)).join(";"), ...lignes.map((l) => COLONNES.map(([k]) => cellule(typeof l[k] === "boolean" ? (l[k] ? "oui" : "non") : l[k])).join(";"))].join("\n") + "\n");
fs.writeFileSync(`${D}/inventaire.json`, JSON.stringify({ genereLe: chiffres.genereLe, colonnes: COLONNES, lignes }, null, 1));
fs.writeFileSync(`${D}/chiffres.json`, JSON.stringify(chiffres, null, 1));

// Blocs générés du rapport.
const blocs = {
  chiffres: [
    `| | Nombre |`,
    `|---|---|`,
    `| Questions recensées | ${chiffres.recensees.total} (${chiffres.recensees.banque} de la banque, ${chiffres.recensees.cadrage} de cadrage, ${chiffres.recensees.enAttente} en attente) |`,
    `| Évaluées une à une (utilité, profils, conditions, usage) | ${chiffres.verifiees.evaluees} |`,
    `| Relues (texte, aide, choix, unité, période) | ${chiffres.verifiees.relues} (dont ${chiffres.verifiees.reluesAArbitrer} à arbitrer) |`,
    `| Assemblées par le vrai code et contrôlées par le balayage | ${chiffres.verifiees.assemblees} |`,
    `| Affichées et manipulées dans l'application | ${chiffres.verifiees.manipuleesNavigateur} (${chiffres.verifiees.banqueManipuleesNavigateur} de la banque, ${chiffres.verifiees.cadrageManipulees} de cadrage) |`,
    `| Jamais posées pendant l'audit (brief de création de contenu) | ${chiffres.verifiees.nonPoseesPendantLAudit} |`,
    ...Object.entries(chiffres.verifiees.nonManipuleesParRaison).map(([r, n]) => `| Assemblées mais non manipulées dans le navigateur : ${r} | ${n} |`),
    "",
    `| Statut (un seul par question) | Nombre | dont exploitation à développer |`,
    `|---|---|---|`,
    ...STATUTS.map((s) => `| ${s} | ${chiffres.statuts[s]} | ${chiffres.aDevelopper.parStatut[s]} |`),
    `| **Total** | **${chiffres.statutsSomme}** | **${chiffres.aDevelopper.total}** |`,
  ].join("\n"),
  anomalies: anomalies.map((a) => `| ${a.id} | ${a.titre} | ${a.type} | ${a.correction.etat} | ${a.codes.length ? a.codes.length : "toutes"} |`).join("\n"),
  scenarios: Object.entries(scenarios).map(([k, v]) => `| ${k} | ${v.controles} | ${v.ecarts} |`).join("\n"),
  implementation: [
    `| Implémentation \\ utilité | ${STATUTS.map((s) => s.split(" :")[0].replace(" (catégorie Fabrication)", "")).join(" | ")} | Total |`,
    `|---|${STATUTS.map(() => "---").join("|")}|---|`,
    ...Object.entries(chiffres.implementation).map(([i, parS]) => `| ${i} | ${STATUTS.map((s) => parS[s]).join(" | ")} | ${Object.values(parS).reduce((a, b) => a + b, 0)} |`),
  ].join("\n"),
  detail: anomalies.map((a) => {
    const textes = a.codes.slice(0, 20).map((c) => `  - ${c} : « ${nettoyer(banque.get(c)?.texte ?? evaluations.find((e) => e.code === c)?.texte ?? "")} »`);
    return [
      `### ${a.id} · ${a.titre}`,
      "",
      `- **Questions** : ${a.codes.length ? "" : "toutes celles décrites ci-dessous."}`,
      ...textes,
      `- **Problème** : ${a.probleme}`,
      `- **Conséquence** : ${a.consequence}`,
      `- **Correction (${a.correction.etat})** : ${a.correction.texte}`,
      `- **Contrôle** : ${a.controle}`,
      "",
    ].join("\n");
  }).join("\n"),
};
let rapport = fs.existsSync(`${D}/rapport.md`) ? fs.readFileSync(`${D}/rapport.md`, "utf8") : "";
for (const [nom, contenu] of Object.entries(blocs)) {
  const re = new RegExp(`(<!-- debut:${nom} -->)[\\s\\S]*?(<!-- fin:${nom} -->)`);
  if (re.test(rapport)) rapport = rapport.replace(re, () => `<!-- debut:${nom} -->\n${contenu}\n<!-- fin:${nom} -->`);
}
if (rapport) fs.writeFileSync(`${D}/rapport.md`, rapport);

console.log(JSON.stringify({ recensees: chiffres.recensees, verifiees: { ...chiffres.verifiees, banqueNonManipulees: chiffres.verifiees.banqueNonManipulees.length }, statuts: chiffres.statuts, aDevelopper: chiffres.aDevelopper.total, anomalies: chiffres.anomalies.parEtat }, null, 1));
for (const e of erreurs) console.error(`ERREUR : ${e}`);
process.exit(erreurs.length ? 1 : 0);

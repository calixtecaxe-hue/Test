// Chiffres de la vérification, calculés à partir des fichiers produits (inventaire, plan, résultats, journaux) : rien n'est
// recopié à la main. Écrit docs/verification/chiffres.json et la section « Chiffres » de rapport.md.
//
//   node scripts/verification/chiffres.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const V = "docs/verification";
const R = `${V}/resultats`;
const lire = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
const inventaire = lire(`${V}/inventaire-questions.json`);
const lignes = Array.isArray(inventaire) ? inventaire : inventaire?.questions ?? inventaire?.lignes ?? [];
const plan = lire(`${V}/plan-dependances.json`);
const compter = (f) => lignes.filter(f).length;

// --- Questions -------------------------------------------------------------------------------------------------------
const posables = lignes.filter((l) => l.statut === "posable");
const questions = {
  recensees: lignes.length,
  posables: posables.length,
  en_attente: compter((l) => String(l.statut).startsWith("en attente")),
  relues: compter((l) => !String(l.relecture).startsWith("non relue")),
  relues_corrigees: compter((l) => /^(reformulée|corrigée)/.test(l.relecture)),
  relues_a_arbitrer: compter((l) => /^à arbitrer/.test(l.relecture)),
  controle_automatique_sans_constat: compter((l) => l.statut === "posable" && l.controles_automatiques === "aucun constat"),
  controle_automatique_verifie_a_la_main: compter((l) => l.statut === "posable" && /vérifié :/.test(l.controles_automatiques)),
  controle_automatique_constat_ouvert: compter((l) => l.statut === "posable" && !/^(aucun constat|.*vérifié :)/.test(l.controles_automatiques)),
  atteignables_par_assemblage: compter((l) => l.atteignable === "oui (assemblage)"),
  non_atteignables: posables.filter((l) => l.atteignable === "NON").map((l) => `${l.code} : ${l.raison_non_atteinte}`),
};

// Questions affichées à l'écran et manipulées par un contrôle navigateur réussi.
const vues = new Set();
const dep = lire(`${R}/dependances.json`);
if (dep && plan) {
  const ok = new Set(dep.resultats.filter((r) => /-a$/.test(r.id) && r.statut === "conforme").map((r) => r.item));
  for (const it of [...plan.items, ...(plan.tailles ?? [])]) if (ok.has(it.id)) for (const c of it.attenduVrai) vues.add(c);
}
for (const [f, codes] of [["canaux", ["ACQ-03.01", "ACQ-03.02", "ACQ-03.05"]], ["resultats", ["ACQ-02.01", "ACQ-02.02", "ACQ-02.03", "ACQ-02.04", "ACQ-02.05", "ACQ-08.02", "ACQ-08.03", "FIN-05.02", "ACQ-03.01"]], ["separation", ["ACQ-02.01", "ACQ-02.02"]], ["retours", ["ACQ-02.01", "ACQ-02.02", "ACQ-02.03", "ACQ-02.04"]], ["rapides", ["ACQ-03.01", "ACQ-03.02", "ACQ-08.02", "ACQ-08.03", "ACQ-03.05"]], ["historique", ["ACQ-02.01", "ACQ-02.03", "ACQ-23.01", "ACQ-23.03", "ACQ-01.03", "FIN-14.03"]], ["partages", ["RH-07.01", "RH-06.02", "RH-05.01", "FIN-07.03", "FIN-07.01", "COM-13.01", "COM-12.01", "ACQ-02.01", "ACQ-06.07", "FIN-06.02", "ACQ-06.08", "ACQ-06.01", "COM-32.01", "ACQ-07.03", "ACQ-07.01", "ACQ-07.04", "ACQ-20.02", "FIN-34.02", "RH-16.01", "RH-11.01"]]]) {
  const r = lire(`${R}/${f}.json`);
  if (r && r.resultats.every((x) => x.conforme)) for (const c of codes) vues.add(c);
}
// Branches des règles à plusieurs branches : les questions affichées par chaque cas conforme.
const planBranches = lire(`${V}/plan-branches.json`);
const branches = lire(`${R}/branches.json`);
if (planBranches && branches) {
  const ok = new Set(branches.resultats.filter((r) => r.statut === "conforme").map((r) => r.id));
  for (const it of planBranches.items) for (const c of it.cas) if (ok.has(c.id)) for (const q of c.attendu) vues.add(q);
}
const exercees = new Set();
if (existsSync(`${R}/journaux`)) {
  for (const f of readdirSync(`${R}/journaux`).filter((x) => x.startsWith("boutons-") && x !== "boutons-pages.log")) {
    for (const ligne of readFileSync(`${R}/journaux/${f}`, "utf8").split("\n")) {
      const m = ligne.match(/^\s+([A-Z]{2,3}-\d{2}\.\d{2}) /);
      if (m) exercees.add(m[1]);
    }
  }
}
for (const c of exercees) vues.add(c);
questions.affichees_et_testees_navigateur = vues.size;
questions.dont_exercees_par_controle_boutons = exercees.size;

// --- Dépendances --------------------------------------------------------------------------------------------------------
const matrice = existsSync(`${V}/matrice-dependances.csv`) ? readFileSync(`${V}/matrice-dependances.csv`, "utf8").trim().split("\n").slice(1) : [];
const parType = {};
for (const l of matrice) {
  const type = l.split(";")[1]?.replace(/"/g, "");
  parType[type] = (parType[type] ?? 0) + 1;
}
const dependances = {
  liens_recenses: matrice.length,
  liens_par_type: parType,
  regles_affichage_au_plan: (plan?.items.length ?? 0) + (plan?.tailles?.length ?? 0),
  regles_sans_plan: plan?.sansPlan ?? [],
};
if (dep) {
  const parRegle = new Map();
  for (const r of dep.resultats) parRegle.set(r.item, [...(parRegle.get(r.item) ?? []), r.statut]);
  dependances.regles_jouees_navigateur = parRegle.size;
  dependances.regles_entierement_conformes = [...parRegle.values()].filter((s) => s.every((x) => x === "conforme")).length;
  dependances.regles_avec_ecart = [...parRegle.entries()].filter(([, s]) => s.includes("ecart")).map(([k]) => k);
  dependances.regles_bloquees = [...parRegle.entries()].filter(([, s]) => s.includes("bloque")).map(([k]) => k);
  dependances.questions_cibles_des_regles_jouees = new Set([...plan.items, ...(plan.tailles ?? [])].filter((i) => parRegle.has(i.id)).flatMap((i) => i.cibles)).size;
}

// --- Scénarios (contrôles navigateur et scripts) -----------------------------------------------------------------------
const scenarios = {};
for (const f of ["canaux", "resultats", "separation", "retours", "rapides", "historique", "partages"]) {
  const r = lire(`${R}/${f}.json`);
  if (r) scenarios[f] = { controles: r.resultats.length, conformes: r.resultats.filter((x) => x.conforme).length, ecarts: r.resultats.filter((x) => !x.conforme).map((x) => x.id) };
}
if (branches) scenarios.branches = { controles: branches.resultats.length, conformes: branches.resultats.filter((x) => x.statut === "conforme").length, ecarts: branches.resultats.filter((x) => x.statut === "ecart").map((x) => x.id), bloques: branches.resultats.filter((x) => x.statut === "bloque").map((x) => x.id) };
if (dep) scenarios.dependances = { controles: dep.resultats.length, conformes: dep.resultats.filter((x) => x.statut === "conforme").length, ecarts: dep.resultats.filter((x) => x.statut === "ecart").map((x) => x.id), bloques: dep.resultats.filter((x) => x.statut === "bloque").map((x) => x.id) };
const synthese = existsSync(`${R}/synthese.txt`) ? readFileSync(`${R}/synthese.txt`, "utf8") : "";
scenarios.synthese_des_contrôles = synthese.split("\n").filter((l) => / code \d+/.test(l));

const regles = lire("data/regles-affichage.json");
dependances.regles_affichage = { conditions: Object.keys(regles.conditions).length, masquages: Object.keys(regles.masquages).length };
const chiffres = { calculeLe: new Date().toISOString(), questions, dependances, scenarios };
writeFileSync(`${V}/chiffres.json`, JSON.stringify(chiffres, null, 1));
console.log(JSON.stringify(chiffres, null, 1));

// Section « Chiffres » du rapport, entre ses deux marques.
const n = (x) => x.toLocaleString("fr-FR");
const calcul = (parType["croisement (calcul)"] ?? 0) + (parType["scénario (calcul)"] ?? 0);
const totalRegles = dependances.regles_affichage.conditions + dependances.regles_affichage.masquages;
// Règles sans plan, avec leur raison lue dans le fichier des règles.
const auPlan = new Set([...(plan?.items ?? []), ...(plan?.tailles ?? [])].map((i) => i.regle));
const horsPlan = [...Object.entries(regles.conditions), ...Object.entries(regles.masquages)]
  .filter(([nom]) => !auPlan.has(nom))
  .map(([nom, r]) => `« ${nom} » (${"aPreciser" in r ? "à préciser : aucune réponse ne la déclenche" : "toujours" in r ? "toujours posée, pas une dépendance" : JSON.stringify(r).includes("D30") ? "jamais pendant l'audit" : "sans plan"})`);
const lignesNav = Object.entries(scenarios).filter(([k]) => k !== "synthese_des_contrôles");
const totNav = lignesNav.reduce((a, [, v]) => ({ c: a.c + v.controles, ok: a.ok + v.conformes, e: a.e + v.ecarts.length, b: a.b + (v.bloques?.length ?? 0) }), { c: 0, ok: 0, e: 0, b: 0 });
const t = [
  "| Mesure | Nombre | Écart expliqué |",
  "|---|---|---|",
  `| Questions recensées | ${n(questions.recensees)} | ${n(questions.posables)} dans la banque, ${n(questions.en_attente)} en attente (ACQ-26, catégorie Fabrication). |`,
  `| Questions relues | ${n(questions.relues)} | Toutes. ${n(questions.relues_corrigees)} corrigées (texte, aide, choix ou règle), ${n(questions.relues_a_arbitrer)} à arbitrer (section 5). |`,
  `| Contrôle automatique du texte (période, bornes, ton, choix) | ${n(questions.controle_automatique_sans_constat)} sans constat | ${n(questions.controle_automatique_verifie_a_la_main)} montants sans période écrite, vérifiés un par un (la base est dans la question). ${n(questions.controle_automatique_constat_ouvert)} constat ouvert. |`,
  `| Questions atteignables par le vrai moteur d'assemblage | ${n(questions.atteignables_par_assemblage)} sur ${n(questions.posables)} | ${n(questions.non_atteignables.length)} questions COM-57 : posées à la première création de contenu, jamais pendant l'audit, par conception. |`,
  `| Questions affichées et manipulées dans le navigateur | ${n(questions.affichees_et_testees_navigateur)} | Les autres questions atteignables sont vérifiées par le moteur d'assemblage sur des réponses simulées, pas à l'écran. Les contrôles navigateur utilisent un compte par règle ou par agent (électricien pour les boutons). |`,
  `| Liens de dépendance recensés | ${n(dependances.liens_recenses)} | Dont ${n(calcul)} liens de calcul (croisements, scénarios), non exécutables tant que leurs formules sont en texte libre. Les autres liens portent sur l'affichage, les lignes, les données partagées et les pré-réponses. |`,
  `| Règles d'affichage | ${n(totalRegles)} | ${dependances.regles_affichage.conditions} conditions et ${dependances.regles_affichage.masquages} masquages. Elles portent les ${n(parType["condition d'affichage"] ?? 0)} liens « condition » et les ${n(parType["masquage du thème"] ?? 0)} liens « masquage ». |`,
  `| Règles jouées dans le navigateur, dans les deux sens | ${n(dependances.regles_jouees_navigateur ?? 0)} | ${horsPlan.length} hors plan : ${horsPlan.join(" ; ")}.${(dependances.regles_jouees_navigateur ?? 0) + horsPlan.length < totalRegles ? ` ${totalRegles - horsPlan.length - (dependances.regles_jouees_navigateur ?? 0)} règle(s) du plan non encore jouée(s).` : ""} |`,
  `| Règles entièrement conformes | ${n(dependances.regles_entierement_conformes ?? 0)} | ${dependances.regles_avec_ecart?.length ? `Écarts : ${dependances.regles_avec_ecart.join(", ")}.` : "Aucun écart."} ${dependances.regles_bloquees?.length ? `Bloquées : ${dependances.regles_bloquees.join(", ")}.` : "Aucune règle bloquée."} |`,
  `| Contrôles navigateur de la vérification (canaux, règles, résultats, séparation, départs de page, changements rapides, historique) | ${n(totNav.c)} | ${n(totNav.ok)} conformes, ${n(totNav.e)} écart(s), ${n(totNav.b)} bloqué(s). |`,
];
const parScript = lignesNav.map(([k, v]) => `| \`${k}\` | ${v.controles} | ${v.conformes} | ${v.ecarts.length ? v.ecarts.join(", ") : "aucun"} | ${v.bloques?.length ? v.bloques.join(", ") : "aucun"} |`);
const autres = scenarios.synthese_des_contrôles.map((l) => {
  const m = l.match(/^(\S+)\s+code (\d+)\s*(.*)$/);
  return m ? `| \`${m[1]}\` | ${m[2] === "0" ? "réussi" : `**code ${m[2]}**`} | ${m[3].replace(/\|/g, "/")} |` : null;
}).filter(Boolean);
const section = [
  `Calculés le ${chiffres.calculeLe.slice(0, 16).replace("T", " à ")} UTC.`,
  "",
  ...t,
  "",
  "Contrôles navigateur de la vérification, par script :",
  "",
  "| Script | Contrôles | Conformes | Écarts | Bloqués |",
  "|---|---|---|---|---|",
  ...parScript,
  "",
  "Dernière exécution complète (`resultats/synthese.txt`), un contrôle par ligne :",
  "",
  "| Contrôle | Résultat | Dernière ligne du journal |",
  "|---|---|---|",
  ...autres,
].join("\n");
const rapport = `${V}/rapport.md`;
if (existsSync(rapport)) {
  const texte = readFileSync(rapport, "utf8");
  const debut = texte.indexOf("<!-- CHIFFRES");
  const fin = texte.indexOf("<!-- /CHIFFRES -->");
  if (debut >= 0 && fin > debut) {
    const entete = texte.slice(debut, texte.indexOf("-->", debut) + 3);
    writeFileSync(rapport, `${texte.slice(0, debut)}${entete}\n${section}\n${texte.slice(fin)}`);
  }
}

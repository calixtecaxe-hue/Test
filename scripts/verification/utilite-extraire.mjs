// Audit de l'utilité des questions (28 octobre) : pour chaque question de la banque, ce qu'elle demande et tout ce qui la lit.
// Lecture seule : rien n'est modifié dans data/. Sortie : docs/audit-utilite/usages.json, que lisent l'évaluation et le rapport.
//
//   node scripts/verification/utilite-extraire.mjs
//
// Sources lues :
//   - classeur importé (data/donnees-*.json) : « Sert à », « Utilisée dans », entrées des données calculées ;
//   - croisements, scénarios, diagnostic Comm (phrases de rapport, signaux) ;
//   - règles d'affichage et déclencheurs (questions ouvertes ou fermées par la réponse) ;
//   - évolutions, pré-réponses, réponses déduites, tableaux liés, indicateurs comparables au marché, effets d'actions ;
//   - inventaire de la vérification (atteignabilité, relecture).
import fs from "node:fs";

const lire = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const DONNEES = fs.readdirSync("data").filter((f) => f.startsWith("donnees-")).flatMap((f) => lire(`data/${f}`));
const parCode = new Map(DONNEES.map((d) => [d.code, d]));
const THEMES = new Map(lire("data/themes.json").map((t) => [t.code, t]));
const BANQUE = lire("data/banque/questions.json");
const ATTENTE = lire("data/banque/en-attente.json");
const CROISEMENTS = lire("data/croisements.json");
const SCENARIOS = lire("data/scenarios.json");
const DIAG = lire("data/diagnostic-comm.json").problemes;
const REGLES = lire("data/regles-affichage.json");
const DECL = lire("data/declencheurs.json");
const EVOL = lire("data/evolutions.json");
const PRE = lire("data/prereponses.json").regles;
const IMPL = lire("data/implications.json").implications;
const LIES = lire("data/tableaux-lies.json").liens;
const CATALOGUE = lire("data/catalogue-themes.json");
const EFFETS = lire("data/catalogue-effets.json");
const INVENTAIRE = new Map(lire("docs/verification/inventaire-questions.json").questions.map((q) => [q.code, q]));

const AGENTS = { ACQ: "Acquisition", FIN: "Finance", RH: "RH", COM: "Comm" };
const agentDe = (code) => AGENTS[code.split("-")[0]];

// Ce qui lit une donnée : données calculées (dans les deux sens du classeur, « Utilisée dans » et « Entrées »), croisements,
// scénarios et problèmes du diagnostic Comm.
const lecteurs = new Map();
const ajouter = (de, vers) => {
  if (!lecteurs.has(de)) lecteurs.set(de, new Set());
  lecteurs.get(de).add(vers);
};
for (const d of DONNEES) {
  for (const u of d.utiliseeDans ?? []) ajouter(d.code, u);
  for (const e of d.entrees ?? []) ajouter(e, d.code);
}
for (const x of CROISEMENTS) for (const e of x.entrees ?? []) ajouter(e, x.code);
for (const s of SCENARIOS) for (const e of s.entrees ?? []) ajouter(e, s.code);
for (const p of DIAG) for (const e of p.entrees ?? []) ajouter(e, p.code);

// Ce qui est atteint depuis une donnée, de proche en proche, sur `profondeur` niveaux : 2 = ce qui la lit directement, et ce
// qui lit les données calculées à partir d'elle. Au-delà, les chaînes de calcul relient presque tout à tout (le CA, la marge…) et
// ne disent plus ce que la question apporte en propre.
function atteints(code, profondeur = Infinity) {
  const vus = new Set();
  let niveau = [...(lecteurs.get(code) ?? [])];
  for (let n = 1; niveau.length && n <= profondeur; n++) {
    const suivant = [];
    for (const c of niveau) {
      if (vus.has(c)) continue;
      vus.add(c);
      for (const x of lecteurs.get(c) ?? []) suivant.push(x);
    }
    niveau = suivant;
  }
  return vus;
}

// Clés lues par une règle d'affichage (déclencheur, donnée ou donnée#champ), dans les blocs « tous » / « un ».
function clesDe(regle) {
  if (!regle || typeof regle !== "object") return [];
  if (regle.tous) return regle.tous.flatMap(clesDe);
  if (regle.un) return regle.un.flatMap(clesDe);
  return regle.cle ? [regle.cle] : [];
}
const declencheurDe = new Map(Object.entries(REGLES.declencheurs).filter(([, v]) => v.type === "reponse_donnee").map(([k, v]) => [v.donnee, k]));
const sourcesDeCondition = (nom) => clesDe(REGLES.conditions[nom] ?? REGLES.masquages[nom]).map((c) => c.split("#")[0].split(".")[0].replace(/^(D\d{2})$/, "$1"));
const sourcesCompletes = (nom) => clesDe(REGLES.conditions[nom] ?? REGLES.masquages[nom]).map((c) => (/^[A-Z]{2,3}-\d{2}\.\d{2}/.test(c) ? c.split("#")[0] : c.split(".")[0]));

// Questions ouvertes ou fermées par la réponse à une donnée (directement, ou par le déclencheur qu'elle porte).
const ouvre = new Map();
for (const d of DONNEES) {
  const regles = [d.condition, ...(d.declencheurs ?? [])].filter(Boolean);
  for (const r of regles) for (const s of sourcesCompletes(r)) {
    if (!ouvre.has(s)) ouvre.set(s, new Set());
    ouvre.get(s).add(d.code);
  }
}
const masque = new Map();
for (const t of THEMES.values()) {
  if (!t.masquePour) continue;
  for (const s of sourcesCompletes(t.masquePour)) {
    if (!masque.has(s)) masque.set(s, new Set());
    masque.get(s).add(t.code);
  }
}
void sourcesDeCondition;

const indicateurs = new Map(CATALOGUE.flatMap((f) => (f.indicateurs ?? []).map((i) => [i.id, f.theme])));
const evolutionsDe = (code) => EVOL.evolutions.filter((e) => JSON.stringify([e.actuel, e.passe]).includes(`"${code}"`)).map((e) => e.id);

function resumeSpec(r) {
  if (!r) return { type: "?", choix: [], effort: 1 };
  switch (r.type) {
    case "choix":
    case "cases":
      return { type: r.type, choix: r.options.map((o) => o.libelle), effort: 1 };
    case "tableau": {
      const n = r.lignes.source === "fixe" ? r.lignes.items.length : r.lignes.source === "libre" ? r.lignes.max ?? 5 : 4;
      const lignes = r.lignes.source === "fixe" ? r.lignes.items.map((i) => i.libelle) : [`(${r.lignes.source}${r.lignes.cle ? " " + r.lignes.cle : ""}${r.lignes.code ? " " + r.lignes.code : ""})`];
      return { type: "tableau", choix: r.colonnes.map((c) => c.libelle + (c.spec?.type === "choix" ? ` [${c.spec.options.map((o) => o.libelle).join(" / ")}]` : "")), lignes, effort: n * r.colonnes.length };
    }
    case "composite":
      return { type: "composite", choix: r.champs.map((c) => c.libelle + (c.spec?.type === "choix" || c.spec?.type === "cases" ? ` [${c.spec.options.map((o) => o.libelle).join(" / ")}]` : "")), effort: r.champs.length };
    case "nombre":
      return { type: "nombre", choix: [r.unite ?? ""], effort: 1 };
    default:
      return { type: r.type, choix: [], effort: r.type === "texte" ? 3 : 1 };
  }
}

const sortie = [];
for (const q of [...BANQUE.map((b) => ({ ...b, statut: "banque" })), ...ATTENTE.map((b) => ({ ...b, statut: "en_attente" }))]) {
  const code = q.donnee;
  const d = parCode.get(code);
  const theme = THEMES.get(code.slice(0, code.indexOf(".")));
  const tout = atteints(code);
  const proche = atteints(code, 2);
  const croisements = [...proche].filter((c) => /^X[ACFR]\d+$/.test(c));
  const scenarios = [...proche].filter((c) => /^S\d+$/.test(c));
  const diag = [...proche].filter((c) => /^DC\d+$/.test(c));
  const calculees = [...proche].filter((c) => parCode.get(c)?.mode === "calculee");
  const lointains = [...tout].filter((c) => !proche.has(c) && /^(X[ACFR]\d+|S\d+|DC\d+)$/.test(c));
  const decl = declencheurDe.get(code);
  const opens = new Set([...(ouvre.get(code) ?? []), ...(decl ? ouvre.get(decl) ?? [] : [])]);
  const masks = new Set([...(masque.get(code) ?? []), ...(decl ? masque.get(decl) ?? [] : [])]);
  const inv = INVENTAIRE.get(code);
  const spec = resumeSpec(q.reponse);
  sortie.push({
    code,
    statut: q.statut,
    agent: agentDe(code),
    theme: theme ? { code: theme.code, nom: theme.nom, bloc: theme.bloc, nature: theme.nature, impact: theme.impact?.type, masquePour: theme.masquePour } : null,
    libelle: d?.libelle ?? null,
    texte: q.texte,
    aide: q.aide,
    type: spec.type,
    choix: spec.choix,
    lignes: spec.lignes ?? null,
    effort: spec.effort,
    niveau: d?.niveau ?? null,
    mode: d?.mode ?? null,
    profils: d?.profils ? Object.entries(d.profils).filter(([, v]) => v).map(([k]) => k) : [],
    metiers: d?.metiers ?? null,
    condition: d?.condition ?? null,
    declencheurs: d?.declencheurs ?? [],
    periode: d?.periode ?? null,
    sertA: d?.sertA ?? [],
    utiliseeDans: d?.utiliseeDans ?? [],
    calculees,
    croisements,
    scenarios,
    diagnosticComm: diag,
    // Croisements, scénarios et problèmes atteints seulement par des chaînes plus longues (lecture indirecte).
    lointains,
    indicateursMarche: [...tout, code].filter((c) => indicateurs.has(c)),
    evolutions: evolutionsDe(code),
    preReponse: PRE.filter((p) => JSON.stringify(p).includes(`"${code}"`)).map((p) => p.donnee),
    deduite: IMPL.filter((i) => i.donnee === code || i.siCoche?.donnee === code).map((i) => `${i.donnee} ← ${i.siCoche.donnee}`),
    tableauxLies: LIES.filter((l) => l.tableau === code || l.suit.includes(code)).map((l) => `${l.tableau} suit ${l.suit.join(", ")}`),
    effets: EFFETS.filter((e) => (e.croisements ?? []).some((x) => croisements.includes(x))).map((e) => e.id),
    declencheur: decl ?? DECL.find((x) => x.question.startsWith(code + " "))?.code ?? null,
    ouvre: [...opens].sort(),
    masqueThemes: [...masks].sort(),
    atteignable: inv?.atteignable ?? null,
    influence: inv?.influence ?? null,
  });
}

// Questions de cadrage (déclencheurs posés en « Pour commencer » ou à l'inscription), auditées à part.
const cadrage = DECL.filter((x) => !/^[A-Z]{2,3}-\d/.test(x.question)).map((x) => ({
  code: x.code,
  question: x.question,
  posee: x.posee,
  reponses: x.reponses,
  effet: x.effet,
  ouvre: [...(ouvre.get(x.code) ?? [])].sort(),
  masqueThemes: [...(masque.get(x.code) ?? [])].sort(),
}));

fs.mkdirSync("docs/audit-utilite", { recursive: true });
fs.writeFileSync("docs/audit-utilite/usages.json", JSON.stringify({ genereLe: new Date().toISOString(), questions: sortie, cadrage }, null, 1) + "\n");
const n = (f) => sortie.filter(f).length;
console.log(`${sortie.length} questions (${n((q) => q.statut === "banque")} dans la banque, ${n((q) => q.statut === "en_attente")} en attente), ${cadrage.length} questions de cadrage.`);
console.log(`Sans aucune utilisation documentée (ni « Sert à », ni calcul, ni règle) : ${n((q) => !q.sertA.length && !q.calculees.length && !q.croisements.length && !q.scenarios.length && !q.diagnosticComm.length && !q.ouvre.length && !q.masqueThemes.length && !q.evolutions.length && !q.preReponse.length && !q.tableauxLies.length)}`);

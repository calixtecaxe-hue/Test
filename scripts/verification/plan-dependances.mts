// Plan du contrôle navigateur des dépendances (vérification du 28 octobre) : pour chaque règle d'affichage utilisée (condition
// d'une question, masquage d'un thème), un compte témoin, les réponses qui rendent la règle vraie puis fausse, et ce que le vrai
// code d'assemblage affiche dans chaque cas. scripts/verification/dependances.mjs joue ce plan dans le navigateur.
//
//   node scripts/verification/plan-dependances.mts      → docs/verification/plan-dependances.json
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { assemblerQuestionnaire } from "../../src/lib/audit/assemblage.ts";
import { clesDeLaRegle, cleDeDonnee, donneeDuDeclencheur, type TailleId } from "../../src/lib/audit/affichage.ts";
import { router } from "../../src/lib/routage.ts";
import { type ProfilId, type Regle, type CodeAgent } from "../../src/lib/donnees/schemas.ts";
import type { Reponses } from "../../src/lib/audit/reponse.ts";
import { chercherTemoin, donneeDe, e, lireRegle, racine, regles, resoudre, themeDe, type Ctx } from "./resolution.mts";

// Un métier par profil, pour créer le compte témoin (pas de profession réglementée, agent Comm ouvert).
const metierDuProfil = new Map<ProfilId, { metier: string; sousVariantes: string[] }>();
for (const m of e.routage.metiers) {
  const variantes = (m.sousVariantes ?? []).length ? [[(m.sousVariantes ?? []).find((v) => v.defaut)?.id ?? m.sousVariantes![0].id]] : [[]];
  for (const sv of variantes) {
    const r = router(e.routage, m.id, sv);
    if (!r.ok || r.routage.profils.length !== 1 || m.agentComm !== "oui") continue;
    const p = r.routage.profils[0];
    if (!metierDuProfil.has(p)) metierDuProfil.set(p, { metier: m.id, sousVariantes: sv });
  }
}
const EFFECTIF: Record<TailleId, number> = { seul: 1, equipe_2_5: 4, structure_6_plus: 8 };
const agentDe = (code: string): CodeAgent => themeDe.get(code.slice(0, code.indexOf(".")))!.agent;

type Item = {
  id: string;
  type: "condition" | "masquage";
  regle: string;
  lisible: string;
  agent: CodeAgent;
  compte: { profil: ProfilId; metier: string; sousVariantes: string[]; effectif: number };
  base: Reponses;
  vrai: Record<string, unknown>;
  faux: Record<string, unknown>;
  cles: string[];
  cibles: string[];
  attenduVrai: string[];
  attenduFaux: string[];
  remarque?: string;
};

const items: Item[] = [];
const affichees = (agent: CodeAgent, profil: ProfilId, taille: TailleId, metier: { metier: string; sousVariantes: string[] }, reponses: Reponses) => {
  const a = assemblerQuestionnaire(e, { agent, profils: [profil], taille, niveau: "approfondi", ancienneteMois: 240, exclusions: null, vocabulaire: null, metier: { metierPrecis: metier.metier, sousVariantes: metier.sousVariantes }, reponses });
  return new Set([...a.prealables, ...a.themes.flatMap((t) => t.questions)].map((q) => q.code));
};

function construire(id: string, type: Item["type"], nom: string, regle: Regle, cibles: string[]) {
  for (const cible of cibles) {
    const d = donneeDe.get(cible)!;
    const { temoin } = chercherTemoin(d);
    if (!temoin) continue;
    const metier = temoin.metier ? { metier: temoin.metier.split("/")[0], sousVariantes: temoin.metier.includes("/") ? [temoin.metier.split("/")[1]] : [] } : metierDuProfil.get(temoin.profil);
    if (!metier) continue;
    const agent = agentDe(cible);
    const vrai: Ctx = { reponses: { ...temoin.reponses }, taille: temoin.taille };
    const faux: Ctx = { reponses: { ...temoin.reponses }, taille: temoin.taille };
    // Condition : la rendre fausse. Masquage : rendre le thème masqué (règle vraie).
    if (!resoudre(regle, faux, type === "masquage")) continue;
    if (faux.taille !== vrai.taille) continue; // la taille vient du compte : contrôlée à part (page Mon compte)
    const cles = [...new Set([...Object.keys(vrai.reponses), ...Object.keys(faux.reponses)])].filter((k) => JSON.stringify(vrai.reponses[k]) !== JSON.stringify(faux.reponses[k]));
    if (cles.length === 0) continue;
    const base = Object.fromEntries(Object.entries(vrai.reponses).filter(([k]) => !cles.includes(k)));
    const avecVrai = affichees(agent, temoin.profil, vrai.taille, metier, vrai.reponses);
    const avecFaux = affichees(agent, temoin.profil, faux.taille, metier, faux.reponses);
    items.push({
      id,
      type,
      regle: nom,
      lisible: lireRegle(regle),
      agent,
      compte: { profil: temoin.profil, metier: metier.metier, sousVariantes: metier.sousVariantes, effectif: EFFECTIF[vrai.taille] },
      base,
      vrai: Object.fromEntries(cles.map((k) => [k, vrai.reponses[k] ?? null])),
      faux: Object.fromEntries(cles.map((k) => [k, faux.reponses[k] ?? null])),
      cles,
      cibles,
      attenduVrai: cibles.filter((c) => avecVrai.has(c)),
      attenduFaux: cibles.filter((c) => avecFaux.has(c)),
      ...(cibles.filter((c) => avecFaux.has(c)).length ? { remarque: "des cibles restent affichées quand la règle est fausse (condition propre vraie, ou question qui décide du masquage)" } : {}),
    });
    return;
  }
}

const parCondition = new Map<string, string[]>();
for (const d of e.donnees) {
  if ((d.mode !== "demandee" && d.mode !== "partagee") || !d.condition) continue;
  parCondition.set(d.condition, [...(parCondition.get(d.condition) ?? []), d.code]);
}
let n = 0;
for (const [nom, cibles] of parCondition) {
  const r = regles.conditions[nom];
  if (!r || "aPreciser" in r || "toujours" in r || clesDeLaRegle(r).includes("D30")) continue;
  construire(`D-${String(++n).padStart(3, "0")}`, "condition", nom, r, cibles);
}
for (const [nom, r] of Object.entries(regles.masquages)) {
  const themes = e.themes.filter((t) => t.masquePour === nom).map((t) => t.code);
  const decideurs = new Set(clesDeLaRegle(r).map((c) => cleDeDonnee(c)?.donnee ?? donneeDuDeclencheur(regles, c.split(".")[0])).filter(Boolean));
  const cibles = e.donnees.filter((d) => themes.includes(d.theme) && (d.mode === "demandee" || d.mode === "partagee") && !decideurs.has(d.code)).map((d) => d.code);
  if (cibles.length) construire(`M-${String(++n).padStart(3, "0")}`, "masquage", nom, r, cibles);
}

// La taille vient du compte (effectif déclaré) : elle se change dans « Mon compte ». Une règle sur D02 est jouée en changeant
// l'effectif dans la page, puis en relisant le questionnaire de l'agent.
const surTaille = [
  ...[...parCondition.entries()].filter(([nom]) => { const r = regles.conditions[nom]; return r && !("aPreciser" in r) && !("toujours" in r) && clesDeLaRegle(r).every((c) => c === "D02"); }).map(([nom, cibles]) => ({ nom, regle: regles.conditions[nom], cibles, type: "condition" as const })),
  ...Object.entries(regles.masquages).filter(([, r]) => clesDeLaRegle(r).length > 0 && clesDeLaRegle(r).every((c) => c === "D02")).map(([nom, r]) => ({ nom, regle: r, cibles: e.donnees.filter((d) => e.themes.some((t) => t.masquePour === nom && t.code === d.theme) && (d.mode === "demandee" || d.mode === "partagee") && !d.condition).map((d) => d.code), type: "masquage" as const })),
];
const tailles: { id: string; type: string; regle: string; lisible: string; agent: CodeAgent; profil: ProfilId; metier: string; effectifVrai: number; effectifFaux: number; cibles: string[]; attenduVrai: string[]; attenduFaux: string[] }[] = [];
for (const t of surTaille) {
  const cible = t.cibles.find((c) => chercherTemoin(donneeDe.get(c)!).temoin);
  if (!cible) continue;
  const tem = chercherTemoin(donneeDe.get(cible)!).temoin!;
  const metier = metierDuProfil.get(tem.profil) ?? metierDuProfil.get("chantier")!;
  const agent = agentDe(cible);
  const montre = (taille: TailleId) => affichees(agent, tem.profil, taille, metier, tem.reponses);
  const tailleVrai = tem.taille;
  const ctxFaux: Ctx = { reponses: { ...tem.reponses }, taille: tailleVrai };
  resoudre(t.regle, ctxFaux, t.type === "masquage");
  if (ctxFaux.taille === tailleVrai) continue;
  tailles.push({ id: `T-${String(tailles.length + 1).padStart(2, "0")}`, type: t.type, regle: t.nom, lisible: lireRegle(t.regle), agent, profil: tem.profil, metier: metier.metier, effectifVrai: EFFECTIF[tailleVrai], effectifFaux: EFFECTIF[ctxFaux.taille], cibles: t.cibles, attenduVrai: t.cibles.filter((c) => montre(tailleVrai).has(c)), attenduFaux: t.cibles.filter((c) => montre(ctxFaux.taille).has(c)) });
}

const sansPlan = [...parCondition.keys()].filter((k) => !items.some((i) => i.regle === k));
writeFileSync(join(racine, "docs", "verification", "plan-dependances.json"), JSON.stringify({ genereLe: new Date().toISOString(), items, tailles, sansPlan: sansPlan.filter((k) => !tailles.some((t) => t.regle === k)) }, null, 1));
console.log(`${tailles.length} règles sur la taille (changement d'effectif dans Mon compte).`);
console.log(`${items.length} règles à jouer (${items.filter((i) => i.type === "condition").length} conditions, ${items.filter((i) => i.type === "masquage").length} masquages) ; ${items.reduce((s, i) => s + i.cibles.length, 0)} questions concernées.`);
console.log(`Conditions sans plan (${sansPlan.length}) : ${sansPlan.join(" | ")}`);
for (const i of items.filter((x) => x.remarque)) console.log(`  ${i.id} ${i.regle} : ${i.remarque} → ${i.attenduFaux.join(", ")}`);
for (const i of items.filter((x) => x.attenduVrai.length === 0)) console.log(`  ${i.id} ${i.regle} : aucune cible affichée même quand la règle est vraie`);

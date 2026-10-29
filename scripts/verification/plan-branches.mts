// Plan du contrôle des règles à plusieurs branches (audit final du 29 octobre) : pour chaque règle d'affichage jouée par
// plan-dependances.mts qui a plusieurs branches (« un » : l'une ou l'autre ; « tous » : l'une et l'autre ; « parmi » : une valeur
// d'une liste), un cas par branche, avec les questions que le vrai code d'assemblage affiche :
//   - « un » : chaque branche vraie seule ouvre les questions ; toutes fausses, elles sont fermées ;
//   - « tous » : chaque condition fausse seule ferme les questions ;
//   - « parmi » : chaque valeur de la liste ouvre les questions, une valeur hors liste les ferme.
// scripts/verification/branches.mjs joue ce plan dans le navigateur.
//
//   node scripts/verification/plan-branches.mts      → docs/verification/plan-branches.json
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assemblerQuestionnaire } from "../../src/lib/audit/assemblage.ts";
import { evaluer, type TailleId } from "../../src/lib/audit/affichage.ts";
import type { CodeAgent, ProfilId, Regle } from "../../src/lib/donnees/schemas.ts";
import type { Reponses } from "../../src/lib/audit/reponse.ts";
import { e, estMultiple, lireRegle, lu, poser, racine, regles, resoudre, type Ctx } from "./resolution.mts";

type ItemDependance = {
  id: string;
  type: "condition" | "masquage";
  regle: string;
  agent: CodeAgent;
  compte: { profil: ProfilId; metier: string; sousVariantes: string[]; effectif: number };
  base: Reponses;
  vrai: Reponses;
  faux: Reponses;
  cibles: string[];
};
const plan = JSON.parse(readFileSync(join(racine, "docs", "verification", "plan-dependances.json"), "utf8")) as { items: ItemDependance[] };
const TAILLE: Record<number, TailleId> = { 1: "seul", 4: "equipe_2_5", 8: "structure_6_plus" };

const affichees = (it: ItemDependance, ctx: Ctx) => {
  const a = assemblerQuestionnaire(e, {
    agent: it.agent,
    profils: [it.compte.profil],
    taille: ctx.taille,
    niveau: "approfondi",
    ancienneteMois: 240,
    exclusions: null,
    vocabulaire: null,
    metier: { metierPrecis: it.compte.metier, sousVariantes: it.compte.sousVariantes },
    reponses: ctx.reponses,
  });
  return new Set([...a.prealables, ...a.themes.flatMap((t) => t.questions)].map((q) => q.code));
};
const copie = (c: Ctx): Ctx => ({ reponses: JSON.parse(JSON.stringify(c.reponses)), taille: c.taille });
const vraie = (r: Regle, c: Ctx) => evaluer(r, (k) => lu(c, k));

type Cas = { id: string; branche: string; regleVraie: ReturnType<typeof evaluer>; reponses: Reponses; attendu: string[] };
type ItemBranches = { id: string; type: ItemDependance["type"]; regle: string; lisible: string; forme: "un" | "tous" | "parmi"; agent: CodeAgent; compte: ItemDependance["compte"]; cibles: string[]; cas: Cas[]; nonJouables: string[] };

const items: ItemBranches[] = [];
for (const it of plan.items) {
  const r = it.type === "condition" ? regles.conditions[it.regle] : regles.masquages[it.regle];
  if (!r || "aPreciser" in r || "toujours" in r) continue;
  const forme = "un" in r && r.un.length > 1 ? "un" : "tous" in r && r.tous.length > 1 ? "tous" : !("un" in r) && !("tous" in r) && r.op === "dans" && Array.isArray(r.valeur) && r.valeur.length > 1 ? "parmi" : null;
  if (!forme) continue;
  const taille = TAILLE[it.compte.effectif] ?? "equipe_2_5";
  // Plan des dépendances : « vrai » affiche les questions. Pour une condition, c'est la règle vraie ; pour un masquage, la règle
  // fausse (le thème n'est pas masqué).
  const ouvre: Reponses = { ...it.base, ...it.vrai };
  const fermeLes: Reponses = { ...it.base, ...it.faux };
  const depart: Ctx = { reponses: it.type === "condition" ? ouvre : fermeLes, taille };
  const ferme: Ctx = { reponses: it.type === "condition" ? fermeLes : ouvre, taille };
  const cas: Cas[] = [];
  const nonJouables: string[] = [];
  const ajouter = (branche: string, c: Ctx) => {
    const montre = affichees(it, c);
    cas.push({ id: `${it.id}-${String(cas.length + 1).padStart(2, "0")}`, branche, regleVraie: vraie(r, c), reponses: c.reponses, attendu: it.cibles.filter((x) => montre.has(x)) });
  };
  if (forme === "un" && "un" in r) {
    r.un.forEach((s, i) => {
      // Les autres branches fausses, celle-ci vraie.
      const c = copie(ferme);
      for (const [j, autre] of r.un.entries()) if (j !== i) resoudre(autre, c, false);
      // Une branche peut se déduire d'une autre : « déjà en service ? » (D12.en_service) vaut « non » quand il n'y a pas
      // d'investissement (D12 = non), voir sousQuestionOuverte.
      if (!resoudre(s, c, true) || r.un.some((autre, j) => j !== i && vraie(autre, c) === true)) nonJouables.push(`branche ${i + 1} seule (${lireRegle(s)}) : elle rend aussi vraie une autre branche`);
      else ajouter(`branche ${i + 1} seule vraie : ${lireRegle(s)}`, c);
    });
    ajouter("toutes les branches fausses", copie(ferme));
  }
  if (forme === "tous" && "tous" in r) {
    ajouter("toutes les conditions vraies", copie(depart));
    r.tous.forEach((s, i) => {
      const c = copie(depart);
      if (!resoudre(s, c, false) || r.tous.some((autre, j) => j !== i && vraie(autre, c) !== true)) nonJouables.push(`condition ${i + 1} seule fausse (${lireRegle(s)})`);
      else ajouter(`condition ${i + 1} seule fausse : ${lireRegle(s)}`, c);
    });
  }
  if (forme === "parmi" && !("un" in r) && !("tous" in r)) {
    for (const v of r.valeur as string[]) {
      const c = copie(depart);
      poser(c, r.cle, estMultiple(r.cle) ? [String(v)] : String(v));
      ajouter(`valeur « ${v} »`, c);
    }
    const c = copie(depart);
    resoudre(r, c, false);
    ajouter("valeur hors de la liste", c);
  }
  items.push({ id: it.id, type: it.type, regle: it.regle, lisible: lireRegle(r), forme, agent: it.agent, compte: it.compte, cibles: it.cibles, cas, nonJouables });
}

writeFileSync(join(racine, "docs", "verification", "plan-branches.json"), JSON.stringify({ genereLe: new Date().toISOString(), items }, null, 1));
const n = items.reduce((s, i) => s + i.cas.length, 0);
console.log(`${items.length} règles à plusieurs branches (${["un", "tous", "parmi"].map((f) => `${items.filter((i) => i.forme === f).length} « ${f} »`).join(", ")}) ; ${n} cas.`);
for (const i of items) {
  console.log(`  ${i.id} ${i.regle} [${i.lisible}] : ${i.cas.map((c) => `${c.regleVraie ? "V" : "F"}${c.attendu.length}`).join(" ")}`);
  for (const x of i.nonJouables) console.log(`     non jouable : ${x}`);
}

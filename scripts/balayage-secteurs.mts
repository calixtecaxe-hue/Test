// Balayage de tous les secteurs d'activité : pour chaque métier (et chaque activité qu'il propose), chaque agent
// ouvert, chaque taille et chaque niveau, assemble le questionnaire, le remplit avec des réponses de démonstration
// et vérifie que tout tient : textes complets, mots du lexique résolus, tableaux alimentés, questions jamais en
// attente, exclusions des professions réglementées, constat sans erreur.
//
//   node scripts/balayage-secteurs.mts [--tout] [--json chemin]
//
// À relancer après toute correction de la banque, du classeur ou des règles : il montre ce que la modification casse.
// Lecture seule : rien n'est écrit dans les données.

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { TAILLES } from "../src/lib/donnees/constantes.ts";
import { router, METIER_ABSENT } from "../src/lib/routage.ts";
import { equivalences, type Niveau } from "../src/lib/audit/assemblage.ts";
import { formuler } from "../src/lib/donnees/lexique.ts";
import { constaterAgent } from "../src/lib/moteur/constat.ts";
import { couvertureTheme, type Reponses } from "../src/lib/audit/reponse.ts";
import { clesDeLaRegle, evaluer, lecteurDeclencheurs } from "../src/lib/audit/affichage.ts";
import { remplir } from "./demonstration.mts";
import type { ProfilId } from "../src/lib/donnees/schemas.ts";

const e = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const argv = process.argv.slice(2);
const tout = argv.includes("--tout");
const jsonSortie = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : null;

const AGENTS = ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"] as const;
const NIVEAUX: Niveau[] = ["essentiel", "approfondi"];

// --- Constats relevés ---------------------------------------------------------------------

type Constat = { gravite: "erreur" | "attention"; type: string; detail: string; scenario: string };
const constats: Constat[] = [];
const vus = new Set<string>();
function signaler(gravite: Constat["gravite"], type: string, detail: string, scenario: string) {
  const cle = `${type}|${detail}`;
  if (vus.has(cle)) return;
  vus.add(cle);
  constats.push({ gravite, type, detail, scenario });
}

// --- Scénarios : chaque métier, chaque activité ------------------------------------------------

type Scenario = { libelle: string; metier: string; sousVariantes: string[]; autre: boolean; categorieAbsente?: string };
const scenarios: Scenario[] = [];
for (const m of e.routage.metiers) {
  const v = m.sousVariantes ?? [];
  if (v.length === 0) {
    scenarios.push({ libelle: m.libelle, metier: m.id, sousVariantes: [], autre: false });
    continue;
  }
  for (const a of v) scenarios.push({ libelle: `${m.libelle} · ${a.libelle}`, metier: m.id, sousVariantes: [a.id], autre: false });
  if (v.length > 1) scenarios.push({ libelle: `${m.libelle} · toutes les activités`, metier: m.id, sousVariantes: v.map((x) => x.id), autre: false });
  scenarios.push({ libelle: `${m.libelle} · « Autre » seul`, metier: m.id, sousVariantes: [], autre: true });
}
for (const c of e.routage.categories.filter((x) => !x.reglementee)) {
  scenarios.push({ libelle: `Métier absent de la liste · ${c.libelle}`, metier: METIER_ABSENT, sousVariantes: [], autre: false, categorieAbsente: c.id });
}

// --- Contrôles --------------------------------------------------------------------------------

const banque = new Map(e.banque.map((q) => [q.donnee, q]));
const resume = { scenarios: 0, assemblages: 0, questionsMin: new Map<string, [number, number]>(), reglementes: 0, enPreparation: 0, sansAgent: 0 };
const lexiqueAbsent = new Map<string, Set<string>>();
const durees: Record<string, number[]> = {};

const filtre = process.env.SCENARIO;
for (const s of scenarios) {
  if (filtre && !s.libelle.includes(filtre)) continue;
  const r = router(e.routage, s.metier, s.sousVariantes, { autre: s.autre, categorieAbsente: s.categorieAbsente });
  if (!r.ok) {
    signaler("erreur", "routage refusé", `${s.libelle} : ${r.erreur.message}`, s.libelle);
    continue;
  }
  const ro = r.routage;
  resume.scenarios++;
  if (ro.reglementee) resume.reglementes++;
  if (ro.questionnaireACreer) {
    resume.enPreparation++;
    continue;
  }
  if (ro.profils.length === 0) {
    signaler("erreur", "aucun profil", `${s.libelle} : aucun profil ne se rattache (catégorie ${ro.categorie.libelle})`, s.libelle);
    continue;
  }
  const ex = ro.reglementee ? e.routage.reglementees.acquisitionExclut ?? null : null;
  const agents = AGENTS.filter((a) => !ro.agentsExclus.includes(a));
  if (agents.length === 0) resume.sansAgent++;

  for (const agent of agents) {
    for (const taille of TAILLES) {
      for (const niveau of NIVEAUX) {
        for (const variante of ["oui", "non"] as const) {
          // On ne fait les deux variantes que pour le niveau approfondi (le plus complet) : le reste est un sous-ensemble.
          if (variante === "non" && niveau === "essentiel") continue;
          const nom = `${s.libelle} · ${agent} · ${taille} · ${niveau} · ${variante}`;
          const entree = { agent, profils: ro.profils as ProfilId[], taille, niveau, ancienneteMois: 60, exclusions: ex, reponses: {} as Reponses };
          let rempli: ReturnType<typeof remplir>;
          try {
            rempli = remplir(e, entree, variante);
          } catch (err) {
            signaler("erreur", "assemblage en échec", `${nom} : ${(err as Error).message}`, nom);
            continue;
          }
          resume.assemblages++;
          const { reponses, assemblage: a } = rempli;
          const codes = new Set<string>();
          const posees = [...a.prealables, ...a.themes.flatMap((t) => t.questions)];
          const aPoser = posees.filter((q) => !q.dejaPosee);

          if (variante === "oui") {
            const cleDuree = `${agent}|${niveau}|${taille}`;
            (durees[cleDuree] ||= []).push(aPoser.length);
          }

          // 1. Textes et réponses.
          for (const q of posees) {
            if (codes.has(q.code)) signaler("erreur", "question en double", `${q.code} posée deux fois (${nom})`, nom);
            codes.add(q.code);
            if (q.texte === null) signaler("attention", "question à rédiger", `${q.code} (${q.libelle})`, nom);
            else {
              if (/[{}]/.test(q.texte)) signaler("erreur", "mot du lexique non remplacé", `${q.code} : ${q.texte}`, nom);
              if (/\s{2,}|\s[,.;]|undefined|null/.test(q.texte)) signaler("attention", "texte mal formé", `${q.code} : « ${q.texte} »`, nom);
              if (q.texte.trim().length < 8) signaler("erreur", "texte trop court", `${q.code} : « ${q.texte} »`, nom);
              if (!/[?.:)]$/.test(q.texte.trim())) signaler("attention", "texte sans ponctuation finale", `${q.code} : « ${q.texte.slice(-40)} »`, nom);
            }
            for (const [champ, v] of [["aide", q.aide], ["repli", q.repli]] as const) {
              if (v && /[{}]/.test(v)) signaler("erreur", "mot du lexique non remplacé", `${q.code} (${champ}) : ${v}`, nom);
            }
            if (!q.spec) signaler("attention", "saisie libre faute de type de réponse", `${q.code} (${q.libelle}, format « ${q.format} »)`, nom);
            if (q.spec?.type === "choix" || q.spec?.type === "cases") {
              const ids = q.spec.options.map((o) => o.id);
              if (new Set(ids).size !== ids.length) signaler("erreur", "options en double", q.code, nom);
              if (q.spec.options.length === 0) signaler("erreur", "question à choix sans option", `${q.code} (${nom})`, nom);
            }
            if (q.spec?.type === "nombre" && q.spec.min !== undefined && q.spec.max !== undefined && q.spec.min > q.spec.max) signaler("erreur", "bornes inversées", q.code, nom);
          }

          // 2. Tableaux : leurs lignes doivent exister (sinon « Répondez d'abord… » sans issue).
          const posables = new Set(posees.map((q) => q.code));
          const declencheursCodes = new Set(a.declencheursConcernes.map((d) => d.code));
          const eq = equivalences(e.donnees);
          const dispo = (code: string) => posables.has(code) || reponses[code] !== undefined || [...(eq.get(code) ?? [])].some((c) => reponses[c] !== undefined);
          for (const q of posees) {
            if (q.spec?.type !== "tableau") continue;
            const l = q.spec.lignes;
            if (l.source === "donnee" && !dispo(l.code)) signaler("erreur", "tableau sans lignes (donnée source jamais posée)", `${q.code} attend ${l.code} (${nom})`, nom);
            if (l.source === "declencheur") {
              const f = e.reglesAffichage.declencheurs[l.cle];
              const ok = declencheursCodes.has(l.cle) || (f?.type === "reponse_donnee" && dispo(f.donnee)) || reponses[l.cle] !== undefined;
              if (!ok) signaler("erreur", "tableau sans lignes (cadrage jamais posé)", `${q.code} attend ${l.cle} (${nom})`, nom);
            }
            if (q.spec.colonnes.length === 0) signaler("erreur", "tableau sans colonne", q.code, nom);
          }

          // 3. Questions qui n'arrivent jamais : encore en attente après toutes les réponses.
          if (variante === "oui" && a.enAttente > 0) {
            const lire = lecteurDeclencheurs(reponses, taille, e.reglesAffichage);
            const manquantes = new Set<string>();
            const regles = e.reglesAffichage;
            const duAgent = e.themes.filter((t) => t.agent === agent);
            const regleCle = (nomRegle: string | null | undefined, table: Record<string, never>) => (nomRegle ? (table as Record<string, never>)[nomRegle] : undefined);
            for (const t of duAgent) {
              const m = regleCle(t.masquePour, regles.masquages as never);
              if (m && evaluer(m, lire) === null) for (const k of clesDeLaRegle(m)) if (lire(k) === undefined) manquantes.add(k);
            }
            const donneesEnAttente: string[] = [];
            for (const d of e.donnees.filter((x) => duAgent.some((t) => t.code === x.theme))) {
              const c = regleCle(d.condition, regles.conditions as never);
              if (c && evaluer(c, lire) === null) {
                donneesEnAttente.push(`${d.code}(${d.condition})`);
                for (const k of clesDeLaRegle(c)) if (lire(k) === undefined) manquantes.add(k);
              }
            }
            if (process.env.DETAIL_ATTENTE) console.error(nom, "\n  données en attente :", donneesEnAttente.join(" "), "\n  clés :", [...manquantes].join(" "));
            signaler("attention", "questions jamais posées (règle en attente de réponse)", `${agent} : réponse jamais renseignée à ${[...manquantes].sort().join(", ") || "?"}`, nom);
          }

          // 4. Professions réglementées : rien de ce qui est exclu.
          if (ex && agent === "ACQUISITION_CA") {
            for (const t of a.themes) if (ex.themes.includes(t.theme.code)) signaler("erreur", "thème exclu posé à une profession réglementée", `${t.theme.code} (${nom})`, nom);
            for (const [cle, ids] of Object.entries(ex.optionsCadrage)) {
              const dn = e.reglesAffichage.declencheurs[cle];
              const code = dn?.type === "reponse_donnee" ? dn.donnee : cle;
              const q = posees.find((x) => x.code === code);
              if (q?.spec?.type === "cases" && q.spec.options.some((o) => ids.includes(o.id))) signaler("erreur", "canal exclu proposé à une profession réglementée", `${code} (${nom})`, nom);
            }
            for (const d of ex.declencheurs) if (a.declencheursConcernes.some((x) => x.code === d)) signaler("erreur", "cadrage exclu posé à une profession réglementée", `${d} (${nom})`, nom);
          }

          // 5. Thèmes sans assez de questions pour être notés.
          for (const t of a.themes) {
            if (t.theme.nature === "contexte") continue;
            const couv = couvertureTheme(t.questions.map((q) => q.code), reponses);
            if (variante === "oui" && !couv.evaluable) signaler("attention", "thème non évaluable même rempli", `${t.theme.code} ${t.theme.nom} (${couv.repondues} réponse(s) sur ${couv.posees}) ; non remplies : ${t.questions.filter((q) => !reponses[q.code]).map((q) => `${q.code}[${q.spec?.type ?? "libre"}]`).join(" ")}`, nom);
          }

          // 6. Constat sur ces réponses.
          if (variante === "oui") {
            try {
              const cs = constaterAgent(e, e.seuils, a, reponses, { zone: "PERIURBAINE", taille });
              const themesVus = new Set([...a.themes.map((t) => t.theme.code), ...a.themesMasques.map((t) => t.code)]);
              for (const c of cs) if (!themesVus.has(c.theme)) signaler("erreur", "constat sur un thème inconnu", c.theme, nom);
            } catch (err) {
              signaler("erreur", "constat en échec", `${nom} : ${(err as Error).message}`, nom);
            }
          }
        }
      }
    }
  }

  // 7. Questions qui disparaissent en silence : mot du lexique absent pour le profil.
  for (const d of e.donnees) {
    if (d.mode !== "demandee" && d.mode !== "partagee") continue;
    const q = banque.get(d.code);
    if (!q) continue;
    const concerne = "tailles" in d ? true : ro.profils.some((p) => d.profils[p]);
    if (!concerne) continue;
    const f = formuler(q.texte, ro.profils as ProfilId[], e.lexique);
    if (!f.ok) {
      const cle = `${d.code}|${ro.profils.join("+")}`;
      if (!lexiqueAbsent.has(cle)) lexiqueAbsent.set(cle, new Set());
      lexiqueAbsent.get(cle)!.add(f.motsAbsents.join(", "));
    }
  }
}

for (const [cle, mots] of lexiqueAbsent) {
  const [code, profils] = cle.split("|");
  signaler("attention", "question retirée en silence (mot du lexique absent pour ce profil)", `${code} pour ${profils} : ${[...mots].join(" ; ")}`, profils);
}

// --- Rapport ------------------------------------------------------------------------------

const erreurs = constats.filter((c) => c.gravite === "erreur");
const attentions = constats.filter((c) => c.gravite === "attention");
console.log(`Scénarios : ${resume.scenarios} (dont ${resume.reglementes} de professions réglementées, ${resume.enPreparation} en préparation)`);
console.log(`Questionnaires assemblés et remplis : ${resume.assemblages}`);
console.log("Questions à poser (nombre de questions par agent, niveau et taille, du minimum au maximum) :");
for (const [cle, valeurs] of Object.entries(durees).sort()) console.log(`  ${cle} : ${Math.min(...valeurs)} à ${Math.max(...valeurs)}`);

function groupes(liste: Constat[]) {
  const par = new Map<string, Constat[]>();
  for (const c of liste) {
    if (!par.has(c.type)) par.set(c.type, []);
    par.get(c.type)!.push(c);
  }
  return par;
}
const limite = tout ? Infinity : 6;
for (const [titre, liste] of [["ERREURS", erreurs], ["POINTS D'ATTENTION", attentions]] as const) {
  console.log(`\n${titre} : ${liste.length}`);
  for (const [type, items] of groupes(liste)) {
    console.log(`\n  ${type} (${items.length})`);
    for (const c of items.slice(0, limite)) console.log(`    - ${c.detail}`);
    if (items.length > limite) console.log(`    … ${items.length - limite} autre(s) (--tout pour la liste complète)`);
  }
}
if (jsonSortie) writeFileSync(jsonSortie, JSON.stringify({ resume: { scenarios: resume.scenarios, assemblages: resume.assemblages }, durees, constats }, null, 2));
process.exitCode = erreurs.length > 0 ? 1 : 0;

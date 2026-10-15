// Balayage exhaustif : tous les métiers × tous leurs choix de sous-variantes × 4 agents ×
// 3 tailles × 2 niveaux × 4 jeux de réponses aux déclencheurs × 3 anciennetés. Il vérifie
// des invariants qui doivent tenir quel que soit le compte. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { router } from "../src/lib/routage.ts";
import { assemblerQuestionnaire, equivalences, type Assemblage } from "../src/lib/audit/assemblage.ts";
import { constaterAgent } from "../src/lib/moteur/constat.ts";
import { moisMinimumDExistence } from "../src/lib/audit/affichage.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";
import type { CodeAgent, ProfilId } from "../src/lib/donnees/schemas.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const AGENTS: CodeAgent[] = ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"];
const TAILLES = ["seul", "equipe_2_5", "structure_6_plus"] as const;
const saisie = (valeur: string | string[]) => ({ genre: "saisie" as const, valeur });

// Une réponse valide pour chaque déclencheur, selon son format : « tout oui », « tout non ».
function reponsesDeclencheurs(mode: "oui" | "non" | "vide"): Reponses {
  if (mode === "vide") return {};
  const r: Reponses = {};
  for (const [code, f] of Object.entries(reel.reglesAffichage.declencheurs)) {
    if (f.type === "oui_non") r[code] = saisie(mode);
    else if (f.type === "cases") r[code] = saisie(mode === "oui" ? f.options.map((o) => o.id) : []);
    else if (f.type === "choix") r[code] = saisie(mode === "oui" ? f.options[0].id : f.options[f.options.length - 1].id);
    else for (const s of f.sousCles) r[s.cle ? `${code}.${s.cle}` : code] = saisie(mode);
  }
  return r;
}
const JEUX: [string, Reponses][] = [["vide", reponsesDeclencheurs("vide")], ["oui", reponsesDeclencheurs("oui")], ["non", reponsesDeclencheurs("non")]];

// Tous les profils possibles : un par métier et par combinaison de sous-variantes.
const profilsPossibles = new Map<string, ProfilId[]>();
for (const m of reel.routage.metiers) {
  const variantes = (m.sousVariantes ?? []).map((v) => v.id);
  const combis: string[][] = variantes.length === 0 ? [[]] : [];
  for (let masque = 1; masque < 1 << variantes.length; masque++) combis.push(variantes.filter((_, i) => masque & (1 << i)));
  for (const c of combis) {
    const r = router(reel.routage, m.id, c);
    assert.ok(r.ok, `${m.id} ${c.join("+")} : ${!r.ok && r.erreur.message}`);
    if (r.ok) profilsPossibles.set(r.routage.profils.join(","), r.routage.profils);
  }
}

function verifier(a: Assemblage, agent: CodeAgent, profils: ProfilId[], taille: string, niveau: string, jeu: string, anc: number | undefined) {
  const nom = `${agent} ${profils.join("+")} ${taille} ${niveau} ${jeu} anc=${anc}`;
  const themesAgent = new Set(reel.themes.filter((t) => t.agent === agent).map((t) => t.code));
  const codes: string[] = [];
  for (const t of a.themes) {
    assert.ok(themesAgent.has(t.theme.code), `${nom} : thème d'un autre agent ${t.theme.code}`);
    assert.ok(t.questions.length > 0, `${nom} : thème vide ${t.theme.code}`);
    for (const q of t.questions) {
      codes.push(q.code);
      const d = reel.donnees.find((x) => x.code === q.code)!;
      assert.ok(d.mode === "demandee" || d.mode === "partagee", `${nom} : ${q.code} est ${d.mode}`);
      assert.equal(d.theme, t.theme.code, `${nom} : ${q.code} dans le mauvais thème`);
      if (niveau === "essentiel") assert.equal(q.niveau, "essentiel", `${nom} : ${q.code} approfondi en niveau essentiel`);
      const marque = "tailles" in d ? d.tailles[taille as (typeof TAILLES)[number]] : profils.some((p) => (d as { profils: Record<string, boolean> }).profils[p]);
      assert.ok(marque, `${nom} : ${q.code} ne concerne pas ce profil ou cette taille`);
      if (anc !== undefined) {
        const min = moisMinimumDExistence(d.periode);
        assert.ok(min === null || anc >= min, `${nom} : ${q.code} exige ${min} mois d'existence`);
      }
    }
  }
  assert.equal(new Set(codes).size, codes.length, `${nom} : question en double`);
  const masques = new Set(a.themesMasques.map((t) => t.code));
  for (const t of a.themes) assert.ok(!masques.has(t.theme.code), `${nom} : ${t.theme.code} à la fois posé et masqué`);
  for (const d of a.declencheursAPoser) assert.ok(d.question && d.forme, `${nom} : déclencheur ${d.code} sans libellé ni forme`);
  // Une fois tous les déclencheurs répondus, plus rien ne doit attendre.
  if (jeu !== "vide") {
    assert.equal(a.enAttente, 0, `${nom} : ${a.enAttente} donnée(s) attendent encore un déclencheur`);
    assert.deepEqual(a.declencheursAPoser.map((d) => d.code), [], `${nom} : déclencheurs sans réponse possible`);
  }
}

test("balayage : tous les comptes possibles respectent les invariants de l'assemblage", () => {
  let n = 0;
  const vues = new Set<string>();
  for (const agent of AGENTS) {
    for (const profils of profilsPossibles.values()) {
      for (const taille of TAILLES) {
        for (const niveau of ["essentiel", "approfondi"] as const) {
          for (const [jeu, reponses] of JEUX) {
            for (const anc of [undefined, 2, 120]) {
              const a = assemblerQuestionnaire(reel, { agent, profils, taille, niveau, reponses, ancienneteMois: anc });
              verifier(a, agent, profils, taille, niveau, jeu, anc);
              if (jeu === "oui" && niveau === "approfondi" && anc === 120) a.themes.forEach((t) => t.questions.forEach((q) => vues.add(q.code)));
              n++;
            }
          }
        }
      }
    }
  }
  assert.ok(n > 1000, `${n} combinaisons`);
});

test("balayage : le constat ne plante jamais et ne note jamais un thème masqué ou de contexte", () => {
  const rep = reponsesDeclencheurs("oui");
  for (const agent of AGENTS) {
    for (const profils of profilsPossibles.values()) {
      for (const taille of TAILLES) {
        const a = assemblerQuestionnaire(reel, { agent, profils, taille, niveau: "approfondi", reponses: rep });
        const toutes: Reponses = { ...rep, ...Object.fromEntries(a.themes.flatMap((t) => t.questions.map((q) => [q.code, { genre: "exact" as const, valeur: 7 }]))) };
        const constats = constaterAgent(reel, [], a, toutes, { zone: "URBAINE_DENSE", taille });
        for (const c of constats) {
          if (c.statut === "masque" || c.statut === "contexte") assert.equal(c.couleur, null);
          assert.ok(c.couleur === null || c.statut === "note");
        }
        const ids = constats.map((c) => c.theme);
        assert.equal(new Set(ids).size, ids.length, "un thème apparaît deux fois dans le constat");
      }
    }
  }
});

test("balayage : chaque donnée demandée est posable pour au moins un profil, une taille et un jeu de réponses", () => {
  const atteintes = new Set<string>();
  for (const agent of AGENTS) {
    for (const profils of profilsPossibles.values()) {
      for (const taille of TAILLES) {
        for (const jeu of ["oui", "non"] as const) {
          const a = assemblerQuestionnaire(reel, { agent, profils, taille, niveau: "approfondi", reponses: reponsesDeclencheurs(jeu) });
          a.themes.forEach((t) => t.questions.forEach((q) => atteintes.add(q.code)));
        }
      }
    }
  }
  const inatteignables = reel.donnees
    .filter((d) => (d.mode === "demandee" || d.mode === "partagee") && !atteintes.has(d.code))
    .map((d) => d.code);
  // Les données sans niveau, ou masquées par une règle « à préciser », sont listées par la campagne ; ici on exige zéro.
  assert.deepEqual(inatteignables, [], `Données jamais posables : ${inatteignables.join(", ")}`);
});

test("balayage : les équivalences entre données partagées sont symétriques et ne sortent pas de la liste des données posables", () => {
  const eq = equivalences(reel.donnees);
  const posables = new Set(reel.donnees.filter((d) => d.mode === "demandee" || d.mode === "partagee").map((d) => d.code));
  for (const [a, autres] of eq) {
    assert.ok(posables.has(a), a);
    for (const b of autres) {
      assert.ok(posables.has(b), b);
      assert.ok(eq.get(b)?.has(a), `${a} ↔ ${b} non symétrique`);
    }
  }
});

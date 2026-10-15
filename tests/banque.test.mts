// Tests du gabarit de la banque de questions : export Excel, import, contrôle.
// Nécessite python3 et openpyxl (les mêmes que pour l'import du classeur). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { proposerSpec, reponseSpec } from "../src/lib/donnees/reponse-spec.ts";
import { schemaFichiers } from "../src/lib/donnees/schemas.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";

const racine = fileURLToPath(new URL("..", import.meta.url));
const reel = chargerDepuisDisque(join(racine, "data"));
const dir = mkdtempSync(join(tmpdir(), "banque-"));
const xlsx = join(dir, "modele.xlsx");

const py = (args: string[], entree?: string) => spawnSync("python3", args, { cwd: racine, encoding: "utf8", input: entree });

const exporte = py(["scripts/exporter-modele-banque.py", "--sortie", xlsx]);

test("le gabarit est généré avec une ligne par donnée posée, dont celles à réponse déjà déduite", () => {
  assert.equal(exporte.status, 0, exporte.stderr);
  assert.ok(existsSync(xlsx));
  const posees = reel.donnees.filter((d) => d.mode === "demandee" || d.mode === "partagee").length;
  assert.match(exporte.stdout, new RegExp(`${posees} questions à écrire`));
});

// Remplit la colonne QUESTION (et éventuellement d'autres) de lignes données, via openpyxl.
const REMPLIR = `
import sys, json, openpyxl
sys.path.insert(0, "scripts")
from banque_commun import COLONNES
src, dst, plan = sys.argv[1], sys.argv[2], json.loads(sys.stdin.read())
wb = openpyxl.load_workbook(src)
ws = wb["Questions"]
col = {k: j for j, (k, *_r) in enumerate(COLONNES, 1)}
for row in range(2, ws.max_row + 1):
    code = ws.cell(row, col["code"]).value
    if code in plan.get("toutes_les_lignes_pretes", []) or (plan.get("tout_pret") and ws.cell(row, col["type"]).value):
        ws.cell(row, col["question"]).value = "Question de test"
    for k, v in plan.get("cellules", {}).get(code, {}).items():
        ws.cell(row, col[k]).value = v
wb.save(dst)
`;
function remplir(plan: object, sortie: string) {
  const r = py(["-c", REMPLIR, xlsx, sortie, "x"].slice(0, 5), JSON.stringify(plan));
  assert.equal(r.status, 0, r.stderr);
}
const importer = (classeur: string, json: string) => py(["scripts/importer-banque.py", classeur, "--sortie", json, "--sans-controle"]);

test("aller-retour : ce que l'import produit pour les réponses préremplies est exactement ce que le code déduit du format", () => {
  const rempli = join(dir, "rempli.xlsx");
  remplir({ tout_pret: true }, rempli);
  const sortie = join(dir, "q.json");
  const r = importer(rempli, sortie);
  assert.equal(r.status, 0, r.stderr);
  const banque = JSON.parse(readFileSync(sortie, "utf8"));
  assert.ok(banque.length > 150);
  for (const q of banque) {
    const d = reel.donnees.find((x) => x.code === q.donnee)!;
    const attendu = proposerSpec(d.format).spec;
    assert.deepEqual(q.reponse, attendu, `${q.donnee} (${d.format})`);
  }
  assert.doesNotThrow(() => schemaFichiers.banque.parse(banque));
});

test("toutes les grammaires de réponse s'importent en spécifications valides", () => {
  const code = (f: string) => reel.donnees.find((d) => (d.mode === "demandee" || d.mode === "partagee") && d.format === f)!.code;
  const choix = code("Choix"), nombres2 = code("Nombre (2 colonnes)"), tab = code("% par ligne"), liste = code("Liste"), canal = code("Nombre par ligne");
  const cases = reel.donnees.find((d) => (d.mode === "demandee" || d.mode === "partagee") && d.format === "Cases à cocher")!.code;
  const plan = {
    cellules: {
      [choix]: { question: "Q choix", type: "Choix unique", options: "Hors zone · Budget trop faible · Hors offre" },
      [cases]: { question: "Q cases", type: "Cases à cocher", options: "Un · Deux · Trois", min: 1, max: 2 },
      [liste]: { question: "Q liste", type: "Liste libre", max: 4, min: 1 },
      [nombres2]: { question: "Q composite", type: "Plusieurs champs", champs: "Midi [nombre 0-] · Soir [nombre 0-] · Moyen de paiement [choix: Carte / Espèces] · Terrasse [oui / non]" },
      [tab]: { question: "Q tableau liste", type: "Tableau", champs: "Part du CA [% 0-100]", lignes: "liste: " + liste, total: "Part du CA = 100" },
      [canal]: { question: "Q tableau cadrage", type: "Tableau", champs: "Demandes [nombre 0-] · Dépense [€ 0-] · Depuis [mois et année]", lignes: "cadrage: D03" },
    },
  };
  const rempli = join(dir, "grammaires.xlsx");
  remplir(plan, rempli);
  const sortie = join(dir, "g.json");
  const r = importer(rempli, sortie);
  assert.equal(r.status, 0, r.stderr);
  const banque = JSON.parse(readFileSync(sortie, "utf8"));
  const par = (c: string) => banque.find((q: { donnee: string }) => q.donnee === c).reponse;
  for (const q of banque) assert.ok(reponseSpec.safeParse(q.reponse).success, q.donnee);
  assert.deepEqual(par(choix).options.map((o: { id: string }) => o.id), ["hors_zone", "budget_trop_faible", "hors_offre"]);
  assert.deepEqual([par(cases).minChoix, par(cases).maxChoix], [1, 2]);
  assert.deepEqual(par(liste), { type: "liste", max: 4, min: 1 });
  const comp = par(nombres2);
  assert.deepEqual(comp.champs.map((c: { id: string }) => c.id), ["midi", "soir", "moyen_de_paiement", "terrasse"]);
  assert.deepEqual(comp.champs[0].spec, { type: "nombre", unite: "nombre", min: 0 });
  assert.equal(comp.champs[2].spec.type, "choix");
  assert.deepEqual(comp.champs[3].spec, { type: "oui_non" });
  assert.deepEqual(par(tab).lignes, { source: "donnee", code: liste });
  assert.deepEqual(par(tab).total, { colonne: "part_du_ca", valeur: 100 });
  assert.deepEqual(par(tab).colonnes[0].spec, { type: "nombre", unite: "pourcent", min: 0, max: 100 });
  assert.deepEqual(par(canal).lignes, { source: "declencheur", cle: "D03" });
  assert.deepEqual(par(canal).colonnes[2].spec, { type: "date_mois" });

  // Et le contrôle complet des données accepte cette banque (liste source, cadrage existant).
  const e = structuredClone(reel);
  e.banque = schemaFichiers.banque.parse(banque);
  assert.deepEqual(controlerDonnees(e).erreurs, []);
});

test("l'import signale chaque erreur avec son numéro de ligne et n'écrit rien", () => {
  const choix = reel.donnees.find((d) => (d.mode === "demandee" || d.mode === "partagee") && d.format === "Choix")!.code;
  const tab = reel.donnees.find((d) => (d.mode === "demandee" || d.mode === "partagee") && d.format === "% par ligne")!.code;
  const plan = {
    cellules: {
      [choix]: { question: "Q", type: "Choix unique", options: "Une seule option" },
      [tab]: { question: "Q2", type: "Tableau", champs: "Part [kilos]", lignes: "n'importe quoi" },
    },
  };
  const rempli = join(dir, "erreurs.xlsx");
  remplir(plan, rempli);
  const sortie = join(dir, "e.json");
  const r = importer(rempli, sortie);
  assert.equal(r.status, 1);
  assert.match(r.stderr, new RegExp(`\\(${choix}\\) : au moins deux options`));
  assert.match(r.stderr, new RegExp(`\\(${tab}\\) : type de champ inconnu « kilos »`));
  assert.match(r.stderr, /ligne \d+/);
  assert.equal(existsSync(sortie), false, "aucun fichier écrit tant qu'il reste une erreur");
});

test("une ligne sans question est ignorée, une question sans type de réponse reste en saisie libre", () => {
  const choix = reel.donnees.find((d) => (d.mode === "demandee" || d.mode === "partagee") && d.format === "Choix")!.code;
  const rempli = join(dir, "partiel.xlsx");
  remplir({ cellules: { [choix]: { question: "Seulement le texte" } } }, rempli);
  const sortie = join(dir, "p.json");
  const r = importer(rempli, sortie);
  assert.equal(r.status, 0, r.stderr);
  const banque = JSON.parse(readFileSync(sortie, "utf8"));
  assert.equal(banque.length, 1);
  assert.equal(banque[0].reponse, undefined);
  assert.match(r.stdout, /ligne\(s\) sans question ignorée/);
});

test("un classeur dont les colonnes ont été déplacées est refusé", () => {
  const casse = join(dir, "casse.xlsx");
  const r1 = py(["-c", `import openpyxl,sys\nwb=openpyxl.load_workbook(sys.argv[1]);ws=wb['Questions'];ws['I1']='autre';wb.save(sys.argv[2])`, xlsx, casse]);
  assert.equal(r1.status, 0, r1.stderr);
  const r = importer(casse, join(dir, "c.json"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /colonnes/);
});

test("nettoyage", () => {
  rmSync(dir, { recursive: true, force: true });
});

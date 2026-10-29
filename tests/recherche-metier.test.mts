import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { racine, rechercherMetiers } from "../src/lib/recherche-metier.ts";

const routage = JSON.parse(readFileSync(new URL("../data/routage.json", import.meta.url), "utf8"));
const options = routage.metiers.map((m: { id: string; libelle: string; synonymes?: string[]; motsRecherche?: string[]; sousVariantes?: { libelle: string }[] }) => ({
  valeur: m.id,
  libelle: m.libelle,
  mots: [...(m.synonymes ?? []), ...(m.motsRecherche ?? []), ...(m.sousVariantes ?? []).map((v) => v.libelle)],
}));
const premier = (texte: string) => rechercherMetiers(options, texte)[0]?.option.libelle;

test("les mots du dirigeant trouvent son métier (audit client M-01)", () => {
  assert.equal(premier("coiffeuse"), "Coiffeur");
  assert.equal(premier("garagiste"), "Garage et mécanicien");
  assert.equal(premier("boulangerie"), "Boulanger-pâtissier");
  assert.equal(premier("plombier chauffagiste"), "Plombier-chauffagiste");
  assert.equal(premier("Plombier-Chauffagiste"), "Plombier-chauffagiste");
});

test("formes féminines, noms de commerce, accents et frappe en cours", () => {
  const attendus: [string, string][] = [
    ["infirmière", "Infirmier libéral"],
    ["électricienne", "Électricien"],
    ["pâtisserie", "Boulanger-pâtissier"],
    ["boucherie", "Boucher-charcutier"],
    ["chocolaterie", "Chocolatier"],
    ["maçonnerie", "Maçon"],
    ["carrelage", "Carreleur"],
    ["déménageur", "Déménagement"],
    ["epicerie", "Épicerie"],
    ["coif", "Coiffeur"],
    ["boulang", "Boulanger-pâtissier"],
  ];
  for (const [texte, metier] of attendus) assert.equal(premier(texte), metier, texte);
});

test("activités et mots de recherche comptent, avec l'indice affiché", () => {
  const syndic = rechercherMetiers(options, "syndic")[0];
  assert.equal(syndic.option.libelle, "Agence immobilière");
  assert.equal(syndic.indice, "Syndic");
  assert.equal(premier("auto-école"), "Enseignement et formation");
  assert.equal(premier("véto"), "Vétérinaire");
  assert.equal(premier("huissier"), "Commissaire de justice");
  assert.equal(premier("resto"), "Restaurant");
  assert.equal(premier("e-commerce"), "E-commerçant");
});

test("un mot inconnu n'empêche pas de trouver les autres ; le métier qui reconnaît le plus de mots passe devant", () => {
  const r = rechercherMetiers(options, "coiffeuse à domicile").map((t) => t.option.libelle);
  assert.ok(r.includes("Coiffeur"));
  assert.equal(premier("garage auto"), "Garage et mécanicien");
  assert.equal(premier("plombier"), "Plombier-chauffagiste");
});

test("rien ne correspond : liste vide ; champ vide : toute la liste", () => {
  assert.deepEqual(rechercherMetiers(options, "xyzt"), []);
  assert.equal(rechercherMetiers(options, "").length, options.length);
  assert.equal(rechercherMetiers(options, "  ").length, options.length);
});

test("racine : une seule terminaison retirée, quatre lettres au moins restent", () => {
  assert.equal(racine("coiffeuse"), "coiff");
  assert.equal(racine("coiffeur"), "coiff");
  assert.equal(racine("garagiste"), "garag");
  assert.equal(racine("garage"), "garag");
  assert.equal(racine("vetements"), "vetement");
  assert.equal(racine("bar"), "bar");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { SEPARATEUR as S, erreurChiffreAffaires, finaliserSaisie, formaterSaisie } from "../src/lib/saisie-nombre.ts";

const f = (t: string, decimales = true) => formaterSaisie(t, decimales);

test("« 60k » vaut 60 000 (audit client D-01)", () => {
  assert.deepEqual(f("60k"), { affichage: `60${S}000`, brut: "60000", multiplie: true });
  assert.equal(f("60 k€").brut, "60000");
  assert.equal(f("60K").brut, "60000");
  assert.equal(f("1,5k").brut, "1500");
  assert.equal(f("1.5k").brut, "1500");
  assert.equal(f("2,345k").brut, "2345");
  assert.equal(f("k").brut, "");
});

test("« 1.250,75 » vaut 1 250,75 : le point sépare les milliers quand une virgule suit", () => {
  assert.deepEqual(f("1.250,75"), { affichage: `1${S}250,75`, brut: "1250.75", multiplie: false });
  assert.equal(f("1 250,75").brut, "1250.75");
  assert.equal(f("12.345.678,9").brut, "12345678.9");
  assert.equal(f("1,250.75").brut, "1250.75");
});

test("frappe d'un point : provisoire jusqu'à trois chiffres, puis séparateur de milliers", () => {
  assert.equal(f("1.").affichage, "1.");
  assert.equal(f("1.2").affichage, "1.2");
  assert.equal(f("1.25").affichage, "1.25");
  assert.equal(f("1.25").brut, "1.25");
  assert.equal(f("1.250").affichage, `1${S}250`);
  assert.equal(f("1.250").brut, "1250");
  assert.equal(f(`1${S}250,`).affichage, `1${S}250,`);
  assert.equal(f(`1${S}250,7`).brut, "1250.7");
  assert.equal(f("1.250.000").brut, "1250000");
});

test("fin de saisie : le point provisoire devient la virgule", () => {
  assert.equal(finaliserSaisie(f("12.5")).affichage, "12,5");
  assert.equal(finaliserSaisie(f("12.")).affichage, "12");
  assert.equal(finaliserSaisie(f("1 250,5")).affichage, `1${S}250,5`);
});

test("le signe moins est gardé et le chiffre d'affaires négatif est refusé avec un message", () => {
  assert.deepEqual(f("-5000"), { affichage: `-5${S}000`, brut: "-5000", multiplie: false });
  assert.equal(f("-").affichage, "-");
  assert.equal(f("-").brut, "");
  assert.match(erreurChiffreAffaires("-5000") ?? "", /négatif/);
  assert.match(erreurChiffreAffaires("") ?? "", /Indiquez/);
  assert.equal(erreurChiffreAffaires("0"), null);
  assert.equal(erreurChiffreAffaires("60000"), null);
});

test("nombre entier (personnes) : chiffres seulement, signe gardé", () => {
  assert.equal(f("12", false).brut, "12");
  assert.equal(f("1 200", false).affichage, `1${S}200`);
  assert.equal(f("-3", false).brut, "-3");
  assert.equal(f("007", false).brut, "7");
});

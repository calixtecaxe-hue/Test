// Où en est un compte dans le parcours : identifiants seuls, métier, dossier d'entreprise (src/lib/compte.ts). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import type { User } from "@prisma/client";
import { aSonDossier, aSonMetier, compteRoutable, estComplet, etapeManquante } from "../src/lib/compte.ts";

const nu = { id: "u1", email: "a@b.fr", passwordHash: "x", metierPrecis: null, categorie: null, sousVariantes: [], profils: [], chiffreAffairesMensuel: null, nombreCollaborateurs: null, dateCreationEntreprise: null, typeZone: null, ville: null } as unknown as User;
const avecMetier = { ...nu, metierPrecis: "electricien", categorie: "prestation-chantier", profils: ["chantier"] } as unknown as User;
const complet = { ...avecMetier, chiffreAffairesMensuel: 12000, nombreCollaborateurs: 3, dateCreationEntreprise: new Date("2020-01-01"), typeZone: "URBAINE_DENSE", ville: "Lyon" } as unknown as User;

test("un compte qui vient d'être créé n'a ni métier ni dossier : on le ramène à l'étape métier", () => {
  assert.equal(aSonMetier(nu), false);
  assert.equal(etapeManquante(nu), "metier");
});

test("avec son métier, il lui manque le dossier d'entreprise, demandé après le paiement", () => {
  assert.equal(aSonMetier(avecMetier), true);
  assert.equal(aSonDossier(avecMetier), false);
  assert.equal(etapeManquante(avecMetier), "dossier");
  assert.equal(estComplet(avecMetier), false);
});

test("un compte complet n'a plus d'étape à faire ; une ville vide compte comme manquante", () => {
  assert.equal(etapeManquante(complet), null);
  assert.equal(estComplet(complet), true);
  assert.equal(aSonDossier({ ...complet, ville: "" } as unknown as User), false);
  // Zéro est une réponse : un chiffre d'affaires à 0 n'est pas « manquant ».
  assert.equal(aSonDossier({ ...complet, chiffreAffairesMensuel: 0 } as unknown as User), true);
});

test("le routage du compte n'existe qu'une fois le métier connu", () => {
  assert.equal(compteRoutable(nu), null);
  assert.deepEqual(compteRoutable(avecMetier), { metierPrecis: "electricien", categorie: "prestation-chantier", sousVariantes: [] });
});

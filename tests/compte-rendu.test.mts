// Compte rendu (étape 4) : le classement des constats du moteur pour l'écran. Rien n'est calculé ici.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { composerCompteRendu } from "../src/lib/audit/compte-rendu.ts";
import type { Constat } from "../src/lib/moteur/constat.ts";

const base: Omit<Constat, "theme" | "nom" | "statut"> = { nature: "pratique", couleur: null, aValider: false, estimee: false, couverture: null, raison: null, reperes: [], indicateursSansReference: [] };
const c = (theme: string, statut: Constat["statut"], extra: Partial<Constat> = {}): Constat => ({ ...base, theme, nom: `Thème ${theme}`, statut, ...extra });
const blocs = new Map([["T1", "Attirer"]]);

test("chaque constat va dans son groupe, sans rien inventer", () => {
  const vue = composerCompteRendu(
    [
      c("T1", "note", { couleur: "vert" }),
      c("T2", "note", { couleur: "rouge", aValider: true }),
      c("T3", "note", { couleur: "orange" }),
      c("T4", "reference_disponible", { reperes: [{ indicateur: "I", libelle: "Taux", niveau: "metier", organisme: "Org", annee: "2025", url: "https://exemple.fr", confiance: "solide", perimee: false, referenceId: "r", version: 1 }] }),
      c("T5", "regle_manquante", { couverture: { posees: 4, repondues: 3, part: 0.75, evaluable: true } }),
      c("T6", "aucune_reference"),
      c("T7", "sans_comparaison"),
      c("T8", "non_evalue", { couverture: { posees: 5, repondues: 1, part: 0.2, evaluable: false } }),
      c("T9", "masque"),
      c("T10", "contexte"),
    ],
    blocs
  );
  // Les notes vont du rouge au vert ; la couleur calculée et sa mention « à valider » sont reprises telles quelles.
  assert.deepEqual(vue.notes.map((t) => t.couleur), ["rouge", "orange", "vert"]);
  assert.equal(vue.notes[0].aValider, true);
  assert.equal(vue.notes[2].bloc, "Attirer");
  assert.equal(vue.avecRepere.length, 1);
  assert.equal(vue.avecRepere[0].reperes[0].organisme, "Org");
  assert.deepEqual(vue.sansRepere.map((t) => t.nom), ["Thème T5", "Thème T6", "Thème T7"]);
  assert.deepEqual(vue.aCompleter.map((t) => t.couverture), [{ repondues: 1, posees: 5 }]);
  assert.equal(vue.masques, 1);
  assert.equal(vue.contexte, 1);
});

test("sans seuil ni référence, aucune couleur n'apparaît et les mots techniques restent cachés", () => {
  const vue = composerCompteRendu([c("T5", "regle_manquante", { raison: "La règle de notation de ce thème n'est pas écrite." }), c("T6", "aucune_reference")], blocs);
  assert.equal(vue.notes.length, 0);
  for (const t of vue.sansRepere) {
    assert.equal(t.couleur, null);
    assert.match(t.message ?? "", /sans repère de marché/);
    assert.doesNotMatch(t.message ?? "", /règle|seuil|référence absente/i);
  }
});

// Lignes des tableaux (décision du propriétaire, 27 octobre) : lignes numérotées ajoutables jusqu'à 10 et retirables
// jusqu'à une, lignes libres, tableaux qui suivent les lignes d'un autre. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { groupesNumerotes, validerSelonSpec, type ReponseSpec } from "../src/lib/donnees/reponse-spec.ts";
import { ajouterLigne, groupesReglables, lignesInitiales, questionMeneuse, sansLigne } from "../src/lib/audit/lignes.ts";
import { construireReponse } from "../src/lib/audit/saisie.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const specDe = (code: string) => reel.banque.find((q) => q.donnee === code)!.reponse as Extract<ReponseSpec, { type: "tableau" }>;
const ctx = { lignesDeclencheur: () => [], elementsDeListe: () => [] };

test("lignes numérotées : « Offre 1, 2, 3 » et « Meilleure 1… Moins bonne 3 » sont reconnues, pas « Moins de 5 km »", () => {
  assert.deepEqual(groupesNumerotes(specDe("ACQ-13.01").lignes.source === "fixe" ? (specDe("ACQ-13.01").lignes as { items: { id: string; libelle: string }[] }).items : []), [{ base: "offre", libelle: "Offre", parDefaut: 3 }]);
  assert.deepEqual(groupesReglables(specDe("COM-39.01"))!.map((g) => [g.base, g.parDefaut, g.max]), [["meilleure", 3, 10], ["moins_bonne", 3, 10]]);
  assert.equal(groupesReglables(specDe("ACQ-01.06")), null);
  assert.equal(groupesReglables(specDe("FIN-14.01")), null);
  assert.deepEqual(groupesReglables(specDe("FIN-09.01"))!.map((g) => [g.base, g.max]), [["", 10]]);
  // Une numérotation qui saute ou qui ne commence pas à 1 n'est pas une liste numérotée.
  assert.equal(groupesNumerotes([{ id: "offre_1", libelle: "Offre 1" }, { id: "offre_3", libelle: "Offre 3" }]), null);
  assert.equal(groupesNumerotes([{ id: "offre_2", libelle: "Offre 2" }]), null);
});

test("tous les tableaux à lignes numérotées de la banque sont réglables, et chaque lien porte sur l'un d'eux", () => {
  const numerotes = reel.banque.filter((q) => q.reponse?.type === "tableau" && groupesReglables(q.reponse) !== null && q.reponse.lignes.source === "fixe").map((q) => q.donnee);
  assert.ok(numerotes.length >= 25, `${numerotes.length} tableaux numérotés`);
  for (const l of reel.tableauxLies.liens) assert.ok(numerotes.includes(l.tableau) && l.suit.every((c) => numerotes.includes(c)), l.tableau);
});

test("le serveur accepte une 10e offre, refuse une 11e, et accepte une offre retirée", () => {
  const spec = specDe("ACQ-13.01");
  assert.equal(validerSelonSpec(spec, { genre: "valeurs", valeurs: { "offre_10.prix": 50 } }, ctx).ok, true);
  assert.equal(validerSelonSpec(spec, { genre: "valeurs", valeurs: { "offre_11.prix": 50 } }, ctx).ok, false);
  assert.equal(validerSelonSpec(spec, { genre: "valeurs", valeurs: { "offre_1.prix": 50, "offre_3.prix": 80 } }, ctx).ok, true);
  // Une ligne qui n'est pas numérotée reste fermée.
  assert.equal(validerSelonSpec(specDe("ACQ-01.06"), { genre: "valeurs", valeurs: { "autre.part": 5 } }, ctx).ok, false);
});

test("lignes affichées : celles de la banque sans réponse, celles qui ont une valeur sinon, au moins une par groupe", () => {
  const g = groupesReglables(specDe("COM-39.01"))!;
  assert.deepEqual(lignesInitiales(g, {}), [["meilleure_1", "meilleure_2", "meilleure_3"], ["moins_bonne_1", "moins_bonne_2", "moins_bonne_3"]]);
  assert.deepEqual(lignesInitiales(g, { "meilleure_5.clics": 3, "meilleure_2.clics": 1, "meilleure_4.reseau": " " }), [["meilleure_2", "meilleure_5"], ["moins_bonne_1"]]);
  const libre = groupesReglables(specDe("FIN-09.01"))!;
  assert.deepEqual(lignesInitiales(libre, { "2.nom": "Loyer", "10.nom": "Banque" }), [["2", "10"]]);
});

test("ajouter une ligne : un numéro neuf, jamais celui d'une ligne retirée encore employée ailleurs ; 10 au plus", () => {
  const [g] = groupesReglables(specDe("ACQ-13.01"))!;
  assert.deepEqual(ajouterLigne(g, ["offre_1", "offre_2"]), ["offre_1", "offre_2", "offre_3"]);
  // Offre 3 retirée, mais un tableau qui suit les offres garde encore sa réponse : la nouvelle ligne est offre_4.
  assert.deepEqual(ajouterLigne(g, ["offre_1", "offre_2"], ["offre_3"]), ["offre_1", "offre_2", "offre_4"]);
  const dix = Array.from({ length: 10 }, (_, i) => `offre_${i + 1}`);
  assert.deepEqual(ajouterLigne(g, dix), dix);
  // Au-delà du 10e numéro, le premier numéro libre.
  assert.deepEqual(ajouterLigne(g, ["offre_1", "offre_10"]), ["offre_1", "offre_10", "offre_2"]);
});

test("retirer une ligne : ses cases partent, les autres gardent leur identifiant", () => {
  assert.deepEqual(sansLigne({ "offre_1.prix": 10, "offre_2.prix": 20, "offre_2.nom_de_l_offre": "B", "offre_3.prix": 30 }, "offre_2"), { "offre_1.prix": 10, "offre_3.prix": 30 });
  assert.deepEqual(sansLigne({ "1.nom": "a", "10.nom": "b" }, "1"), { "10.nom": "b" });
});

test("une case d'une ligne qui n'est plus affichée n'est pas envoyée", () => {
  const spec = specDe("ACQ-13.02");
  const r = construireReponse(spec, { champs: { "offre_1.part_du_chiffre_d_affaires": "60", "offre_3.part_du_chiffre_d_affaires": "40" } }, { ...ctx, lignesAffichees: ["offre_1", "offre_2"] });
  assert.equal(r.erreur, null);
  assert.deepEqual(r.reponse, { genre: "valeurs", valeurs: { "offre_1.part_du_chiffre_d_affaires": 60 } });
});

test("un tableau qui suit un autre prend la première question suivie qui a une réponse", () => {
  const reponses = { "FIN-01.01": { genre: "inconnu" }, "ACQ-13.01": { genre: "valeurs", valeurs: { "offre_1.prix": 10 } } } as const;
  assert.equal(questionMeneuse(["FIN-01.01", "ACQ-13.01"], reponses), "ACQ-13.01");
  assert.equal(questionMeneuse(["FIN-01.01"], reponses), null);
});

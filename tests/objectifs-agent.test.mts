// Plusieurs objectifs pour RH et Comm (décision du propriétaire, 27 octobre) : chacun complet, un seul pour l'Acquisition
// et la Finance, et pour la Comm tous dans la même partie de la liste. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerObjectifs, MAX_OBJECTIFS } from "../src/lib/audit/objectifs-agent.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const facteur = reel.limitesObjectif.facteurAnnuelMax;
const RH = reel.objectifsAgents.agents.RH_ORGANISATION.objectifs;
const COM = reel.objectifsAgents.agents.COMM_CREATION.objectifs;
const [AMELIORER, METTRE_EN_PLACE] = [...new Set(COM.map((o) => o.groupe))] as string[];
const de = (o: (typeof COM)[number]) => ({
  quoi: o.libelle.toLowerCase(),
  ...(o.mesure === "chiffre" ? { ampleur: { valeur: 5, unite: o.unite ?? "pourcent" } } : { reussite: "je le constate" }),
  delaiMois: 6,
  choix: o.id,
});

test("RH : plusieurs objectifs de la liste, et un « Autre », sont acceptés ensemble", () => {
  const r = controlerObjectifs([de(RH[0]), de(RH[1]), { quoi: "mieux répartir les congés", reussite: "plus de conflit de dates", delaiMois: 4 }], RH, facteur);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.objectifs.map((o) => o.choisi?.id ?? "autre"), [RH[0].id, RH[1].id, "autre"]);
});

test("Acquisition et Finance (sans liste) : un seul objectif", () => {
  const un = { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 6 };
  assert.equal(controlerObjectifs([un], null, facteur).ok, true);
  const deux = controlerObjectifs([un, { ...un, quoi: "augmenter mes ventes" }], null, facteur);
  assert.equal(deux.ok, false);
});

test("Comm : tous les objectifs dans la même partie ; un « Autre » porte sa partie", () => {
  const a = COM.filter((o) => o.groupe === AMELIORER);
  const m = COM.filter((o) => o.groupe === METTRE_EN_PLACE);
  assert.equal(controlerObjectifs([de(a[0]), de(a[1]), { quoi: "mieux répondre aux avis", reussite: "je réponds à chaque avis", delaiMois: 3, partie: AMELIORER }], COM, facteur).ok, true);
  const melange = controlerObjectifs([de(a[0]), de(m[0])], COM, facteur);
  assert.equal(melange.ok, false);
  if (!melange.ok) assert.match(melange.erreur, /une seule partie/);
  assert.equal(controlerObjectifs([de(m[0]), { quoi: "créer ma vitrine", reussite: "elle est en ligne", delaiMois: 3, partie: AMELIORER }], COM, facteur).ok, false);
  // Un objectif de la liste annoncé dans la mauvaise partie, ou une partie inconnue : refusé.
  assert.equal(controlerObjectifs([{ ...de(a[0]), partie: METTRE_EN_PLACE }], COM, facteur).ok, false);
  assert.equal(controlerObjectifs([{ quoi: "autre chose", reussite: "je le vois", delaiMois: 3, partie: "Inconnue" }], COM, facteur).ok, false);
});

test("deux fois le même objectif, aucun objectif, ou trop d'objectifs : refusé, avec le rang du fautif quand il y en a un", () => {
  assert.equal(controlerObjectifs([de(RH[0]), de(RH[0])], RH, facteur).ok, false);
  assert.equal(controlerObjectifs([{ quoi: "Mieux former", reussite: "x y z", delaiMois: 3 }, { quoi: "mieux  former", reussite: "a b c", delaiMois: 3 }], RH, facteur).ok, false);
  assert.equal(controlerObjectifs([], RH, facteur).ok, false);
  const trop = Array.from({ length: MAX_OBJECTIFS + 1 }, (_, i) => ({ quoi: `objectif numéro ${i}`, reussite: "je le constate", delaiMois: 3 }));
  assert.equal(controlerObjectifs(trop, RH, facteur).ok, false);
  const fautif = controlerObjectifs([de(RH[0]), { quoi: "ok", delaiMois: 3 }], RH, facteur);
  assert.equal(fautif.ok, false);
  if (!fautif.ok) assert.equal(fautif.rang, 1);
});

test("un objectif en pourcentage impossible reste refusé, au bon rang", () => {
  const r = controlerObjectifs([de(RH[0]), { quoi: "augmenter mes recrutements", ampleur: { valeur: 900, unite: "pourcent" }, delaiMois: 1 }], RH, facteur);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual([r.rang, r.champ], [1, "delaiMois"]);
});

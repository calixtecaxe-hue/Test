// Plusieurs objectifs pour RH et Comm (décision du propriétaire, 27 octobre) : chacun complet, un seul pour l'Acquisition
// et la Finance, et pour la Comm tous dans la même partie de la liste. Chaque objectif est une proposition de la liste ou un
// objectif écrit par le dirigeant (« Définir mon propre objectif », 28 octobre). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerObjectifs, MAX_OBJECTIFS } from "../src/lib/audit/objectifs-agent.ts";
import { objectifTransmis, objectifsPourLaTaille } from "../src/lib/audit/objectifs-proposes.ts";
import { enregistrerObjectif } from "../src/lib/audit/objectif.ts";

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

// --- Objectif proposé ou objectif personnel (28 octobre) ------------------------------------------------------------------

const parId = (liste: typeof RH, id: string) => liste.find((o) => o.id === id)!;

test("une proposition prend toujours le texte de la liste ; un objectif personnel garde le texte du dirigeant", () => {
  const roles = parId(RH, "rh-roles");
  const r = controlerObjectifs([{ quoi: "autre chose envoyé par erreur", reussite: "chacun sait quoi faire", delaiMois: 3, choix: roles.id }], RH, facteur);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.objectifs[0].saisie.quoi, "clarifier qui fait quoi");
    assert.equal(r.objectifs[0].origine, "proposition");
  }
  // Le texte du dirigeant n'est jamais remplacé par une proposition, même s'il lui ressemble mot pour mot.
  const p = controlerObjectifs([{ quoi: "  Clarifier qui fait quoi  ", reussite: "plus de questions", delaiMois: 2 }], RH, facteur);
  assert.equal(p.ok, true);
  if (p.ok) {
    assert.equal(p.objectifs[0].saisie.quoi, "Clarifier qui fait quoi");
    assert.equal(p.objectifs[0].origine, "personnel");
    assert.equal(p.objectifs[0].saisie.choix, undefined);
    assert.equal(p.objectifs[0].phrase, "Clarifier qui fait quoi en 2 mois");
  }
});

test("objectif personnel vide ou fait d'espaces : refusé avec un message qui dit quoi faire", () => {
  for (const quoi of ["", "   ", " a "]) {
    const r = controlerObjectifs([{ quoi, reussite: "je le constate", delaiMois: 3 }], RH, facteur);
    assert.equal(r.ok, false, JSON.stringify(quoi));
    if (!r.ok) assert.equal(r.champ, "quoi");
  }
});

test("un objectif personnel identique à une proposition déjà choisie : refusé (deux objectifs qui disent la même chose)", () => {
  const roles = parId(RH, "rh-roles");
  const r = controlerObjectifs([{ quoi: "x", reussite: "chacun sait", delaiMois: 3, choix: roles.id }, { quoi: "Clarifier qui fait quoi.", reussite: "autre", delaiMois: 3 }], RH, facteur);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual([r.champ, r.rang], ["quoi", 1]);
});

test("un nombre ou un taux visé suit le gabarit de la proposition, au singulier comme au pluriel, sans test de vraisemblance", () => {
  const avis = parId(COM, "com-avis");
  const un = (valeur: number, delaiMois = 3) => ({ quoi: "x", ampleur: { valeur, unite: "unites" }, delaiMois, choix: avis.id });
  const r = controlerObjectifs([un(10)], COM, facteur);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.objectifs[0].phrase, "obtenir 10 nouveaux avis clients sur les 3 prochains mois");
  const s = controlerObjectifs([un(1, 1)], COM, facteur);
  if (s.ok) assert.equal(s.objectifs[0].phrase, "obtenir 1 nouvel avis client sur le mois prochain");
  else assert.fail(s.erreur);
  // Un taux visé (40 % en 1 mois) n'est pas une hausse de 40 % : aucune limite de vraisemblance ne s'applique.
  const conv = parId(COM, "com-conversion");
  const t = controlerObjectifs([{ quoi: "x", ampleur: { valeur: 40, unite: "pourcent" }, delaiMois: 1, choix: conv.id }], COM, facteur);
  assert.equal(t.ok, true);
  if (t.ok) assert.equal(t.objectifs[0].phrase, "porter mon taux de conversion à 40\u00a0% sur le mois prochain");
  const rec = parId(RH, "rh-recruter");
  const g = controlerObjectifs([{ quoi: "x", ampleur: { valeur: 2, unite: "unites" }, delaiMois: 6, choix: rec.id }], RH, facteur);
  if (g.ok) assert.equal(g.objectifs[0].phrase, "recruter et intégrer 2 nouvelles personnes sur les 6 prochains mois");
  else assert.fail(g.erreur);
});

test("une proposition n'accepte que ses unités ; un objectif personnel accepte les trois", () => {
  const abs = parId(RH, "rh-absences");
  assert.equal(controlerObjectifs([{ quoi: "x", ampleur: { valeur: 10, unite: "euros" }, delaiMois: 6, choix: abs.id }], RH, facteur).ok, false);
  assert.equal(controlerObjectifs([{ quoi: "x", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 6, choix: abs.id }], RH, facteur).ok, true);
  for (const unite of ["pourcent", "euros", "unites"]) {
    assert.equal(controlerObjectifs([{ quoi: "réduire mes frais de recrutement", ampleur: { valeur: 10, unite }, delaiMois: 12 }], RH, facteur).ok, true, unite);
  }
});

test("un dirigeant seul ne se voit pas proposer d'objectifs dont tous les thèmes sont masqués pour sa taille ; un objectif déjà choisi reste", () => {
  const def = reel.objectifsAgents.agents.RH_ORGANISATION;
  const ids = (taille: "seul" | "equipe_2_5" | "structure_6_plus", deja: string[] = []) => objectifsPourLaTaille(def, reel.themes, reel.reglesAffichage, taille, deja).objectifs.map((o) => o.id);
  const seul = ids("seul");
  for (const id of ["rh-turnover", "rh-absences", "rh-charge"]) assert.equal(seul.includes(id), false, id);
  for (const id of ["rh-recruter", "rh-absence-dirigeant", "rh-roles"]) assert.equal(seul.includes(id), true, id);
  assert.equal(ids("structure_6_plus").length, def.objectifs.length);
  assert.equal(ids("seul", ["rh-absences"]).includes("rh-absences"), true);
  // La Comm ne dépend pas de la taille : toutes ses propositions restent.
  const com = reel.objectifsAgents.agents.COMM_CREATION;
  assert.equal(objectifsPourLaTaille(com, reel.themes, reel.reglesAffichage, "seul").objectifs.length, com.objectifs.length);
});

test("transmission : un objectif personnel part avec son texte et son origine, comme une proposition", () => {
  const themes = reel.themes.filter((t) => t.agent === "RH_ORGANISATION");
  const maintenant = new Date("2026-10-28T08:00:00Z");
  const perso = enregistrerObjectif({ quoi: "Que l'équipe ouvre seule le samedi", reussite: "je ne suis plus appelé", delaiMois: 4 }, themes, maintenant, [], "personnel");
  const t = objectifTransmis("Que l'équipe ouvre seule le samedi en 4 mois", perso, RH);
  assert.deepEqual([t.origine, t.quoi, t.proposition, t.mesure, t.reussite, t.echeance], ["personnel", "Que l'équipe ouvre seule le samedi", null, "reussite", "je ne suis plus appelé", "2027-02-28"]);
  const roles = parId(RH, "rh-roles");
  const prop = enregistrerObjectif({ quoi: "clarifier qui fait quoi", reussite: "chacun sait", delaiMois: 3, choix: roles.id }, themes, maintenant, roles.themes, "proposition");
  const u = objectifTransmis("clarifier qui fait quoi en 3 mois", prop, RH);
  assert.deepEqual([u.origine, u.proposition?.id, u.indicateur?.code, u.themes], ["proposition", "rh-roles", "RH-01", roles.themes]);
  // Un objectif enregistré avant le 28 octobre n'a pas d'origine écrite : elle se déduit de son choix.
  const ancien = { ...prop, origine: undefined };
  assert.equal(objectifTransmis("x", ancien, RH).origine, "proposition");
  assert.equal(objectifTransmis("x", { ...perso, origine: undefined }, RH).origine, "personnel");
  assert.equal(objectifTransmis("x", { ...perso, origine: undefined }, null).origine, "libre");
});

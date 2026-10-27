// Vocabulaires par métier (data/vocabulaires-metiers.json) : un vocabulaire passe avant les mots du profil, seulement s'il est
// validé, et ne fait disparaître ni apparaître aucune question. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import type { VocabulairesMetiers } from "../src/lib/donnees/schemas.ts";
import { formuler } from "../src/lib/donnees/lexique.ts";
import { vocabulaireDuCompte } from "../src/lib/vocabulaire.ts";
import { assemblerQuestionnaire } from "../src/lib/audit/assemblage.ts";
import { router } from "../src/lib/routage.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const valide = (v: VocabulairesMetiers): VocabulairesMetiers => ({ ...v, valide: true });

test("un mot du vocabulaire du métier passe avant celui du profil, et un mot sans forme garde celle du profil", () => {
  const lexique = [
    { mot: "Demande", formes: { rdv: "Demande de rendez-vous", commerce: null, ecommerce: null, restaurant: null, chantier: "Demande de devis", b2b: null, abonnement: null, location: null }, metiers: { immobilier: "Contact propriétaire" } },
    { mot: "Devis", formes: { rdv: "Devis", commerce: null, ecommerce: null, restaurant: null, chantier: "Devis", b2b: null, abonnement: null, location: null }, metiers: { immobilier: null } },
  ];
  assert.deepEqual(formuler("Vos {demande}", ["chantier"], lexique), { ok: true, texte: "Vos demande de devis" });
  assert.deepEqual(formuler("Vos {demande}", ["chantier"], lexique, "immobilier"), { ok: true, texte: "Vos contact propriétaire" });
  assert.deepEqual(formuler("Vos {devis}", ["chantier"], lexique, "immobilier"), { ok: true, texte: "Vos devis" }, "forme absente du vocabulaire : le profil reste");
  assert.deepEqual(formuler("Vos {demande}", ["chantier"], lexique, "vocabulaire-inconnu"), { ok: true, texte: "Vos demande de devis" });
});

test("le vocabulaire d'un compte : aucun tant que le fichier n'est pas validé, puis par métier ou par activité", () => {
  // Validé par le propriétaire le 27 octobre.
  assert.equal(reel.vocabulairesMetiers.valide, true);
  const v = { ...reel.vocabulairesMetiers, valide: false };
  assert.equal(vocabulaireDuCompte(v, { metierPrecis: "grossiste-alimentaire", sousVariantes: [] }), null, "non validé : aucun vocabulaire appliqué");
  const ok = valide(v);
  assert.equal(vocabulaireDuCompte(ok, { metierPrecis: "grossiste-alimentaire", sousVariantes: [] }), "negoce");
  assert.equal(vocabulaireDuCompte(ok, { metierPrecis: "electricien", sousVariantes: [] }), null, "métier sans vocabulaire propre : profil");
  assert.equal(vocabulaireDuCompte(ok, { metierPrecis: null, sousVariantes: [] }), null);
  // Métier à activités : l'activité cochée décide.
  assert.equal(vocabulaireDuCompte(ok, { metierPrecis: "agence-immobiliere", sousVariantes: ["transaction"] }), "immobilier");
  assert.equal(vocabulaireDuCompte(ok, { metierPrecis: "agence-immobiliere", sousVariantes: ["transaction", "gestion-locative"] }), "immobilier", "activités qui s'accordent");
  assert.equal(vocabulaireDuCompte(ok, { metierPrecis: "agence-immobiliere", sousVariantes: ["transaction", "syndic"] }), null, "activités qui ne s'accordent pas : profil");
  assert.equal(vocabulaireDuCompte(ok, { metierPrecis: "hotel", sousVariantes: ["hebergement-chambres"] }), "hebergement");
  assert.equal(vocabulaireDuCompte(ok, { metierPrecis: "hotel", sousVariantes: ["hebergement-chambres", "restaurant-de-l-hotel"] }), null);
});

test("le fichier de vocabulaires est cohérent avec le routage et le lexique", () => {
  const v = reel.vocabulairesMetiers;
  const cles = new Set(reel.lexique.flatMap((m) => Object.keys(m.metiers ?? {})));
  const metiers = new Set(reel.routage.metiers.map((m) => m.id));
  for (const [id, a] of Object.entries(v.metiers)) { assert.ok(metiers.has(id), id); assert.ok(cles.has(a.vocabulaire), a.vocabulaire); }
  for (const [id, a] of Object.entries(v.activites)) { assert.ok(metiers.has(id.split("/")[0]), id); assert.ok(cles.has(a.vocabulaire), a.vocabulaire); }
  for (const id of Object.keys(v.aTrancher)) assert.ok(metiers.has(id.split("/")[0]), id);
  for (const id of Object.keys(v.aTrancher)) assert.equal(id in v.metiers, false, `${id} est à la fois attribué et à trancher`);
  // Décisions du 27 octobre : 11 métiers ou activités gardent les mots de leur profil, 11 professions de santé attendent le vocabulaire « consultation ».
  for (const id of Object.keys(v.profilConserve)) { assert.ok(metiers.has(id.split("/")[0]), id); assert.equal(id in v.metiers || id in v.activites, false, id); }
  assert.equal(Object.keys(v.profilConserve).length, 11);
  assert.equal(Object.keys(v.aTrancher).length, 11);
  assert.equal(vocabulaireDuCompte(v, { metierPrecis: "medecin", sousVariantes: [] }), null, "santé : les mots du profil en attendant");
  assert.equal(vocabulaireDuCompte(v, { metierPrecis: "cuisiniste", sousVariantes: [] }), "projet_particuliers", "attribution confirmée");
});

test("avec un vocabulaire, aucune question n'apparaît ni ne disparaît, aucun mot n'est laissé entre accolades", () => {
  const v = valide(reel.vocabulairesMetiers);
  let compares = 0, textesChanges = 0;
  for (const [id, a] of Object.entries(v.metiers)) {
    const r = router(reel.routage, id, [], {});
    if (!r.ok) continue;
    const profils = r.routage.profils;
    for (const agent of ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"] as const) {
      if (r.routage.agentsExclus.includes(agent)) continue;
      const entree = { agent, profils, taille: "equipe_2_5" as const, niveau: "approfondi" as const, reponses: {} };
      const sans = assemblerQuestionnaire(reel, entree);
      const avec = assemblerQuestionnaire(reel, { ...entree, vocabulaire: a.vocabulaire });
      const codesSans = sans.themes.flatMap((t) => t.questions).map((q) => q.code);
      const codesAvec = avec.themes.flatMap((t) => t.questions).map((q) => q.code);
      assert.deepEqual(codesAvec, codesSans, `${id} · ${agent} : mêmes questions`);
      const texteSans = new Map(sans.themes.flatMap((t) => t.questions).map((q) => [q.code, q.texte]));
      for (const q of avec.themes.flatMap((t) => t.questions)) {
        assert.ok(!(q.texte ?? "").includes("{"), `${id} · ${q.code} : accolade restante`);
        if (q.texte !== texteSans.get(q.code)) textesChanges++;
        compares++;
      }
    }
  }
  assert.ok(compares > 1000, `${compares} questions comparées`);
  assert.ok(textesChanges > 0, "le vocabulaire change bien des formulations");
});

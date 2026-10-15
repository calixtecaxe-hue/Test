// Tests du routage métier → catégorie → profil, du lexique et de la validation
// de l'inscription. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import { cleLexique, formuler, libelleQuestion } from "../src/lib/donnees/lexique.ts";
import { metiersTries, router } from "../src/lib/routage.ts";
import { creerSchemaInscription } from "../src/lib/validation/inscription-schema.ts";

const dossier = join(fileURLToPath(new URL("..", import.meta.url)), "data");
const donnees = chargerDepuisDisque(dossier);
const { routage, lexique } = donnees;

function profils(metier: string, variantes: string[] = []) {
  const r = router(routage, metier, variantes);
  assert.ok(r.ok, `${metier} ${variantes} : ${JSON.stringify(!r.ok && r.erreur)}`);
  return r.ok ? r.routage : (undefined as never);
}

test("agence immobilière : transaction → B2B / cycle long, catégorie 4", () => {
  const r = profils("agence-immobiliere", ["transaction"]);
  assert.deepEqual(r.profils, ["b2b"]);
  assert.equal(r.categorie.numero, 4);
  assert.equal(r.reglementee, false);
});

test("agence immobilière : gestion locative → Abonnement ; les deux cochées → les deux profils", () => {
  assert.deepEqual(profils("agence-immobiliere", ["gestion-locative"]).profils, ["abonnement"]);
  assert.deepEqual(profils("agence-immobiliere", ["transaction", "gestion-locative"]).profils, ["b2b", "abonnement"]);
});

test("une activité cochée deux fois ne compte qu'une fois", () => {
  const r = profils("agence-immobiliere", ["transaction", "transaction"]);
  assert.deepEqual(r.sousVariantes, ["transaction"]);
});

test("paysagiste : création → chantier, entretien → abonnement", () => {
  assert.deepEqual(profils("paysagiste", ["creation"]).profils, ["chantier"]);
  assert.deepEqual(profils("paysagiste", ["entretien"]).profils, ["abonnement"]);
});

test("agence web : contrats mensuels → B2B et Abonnement", () => {
  assert.deepEqual(profils("agence-web-com-marketing", ["contrats-mensuels"]).profils, ["b2b", "abonnement"]);
  assert.deepEqual(profils("agence-web-com-marketing", ["projets-ponctuels"]).profils, ["b2b"]);
});

test("agence de voyage : le document ne précise pas de profil par activité, celui de la catégorie s'applique", () => {
  assert.deepEqual(profils("agence-voyage", ["particuliers"]).profils, ["b2b"]);
});

test("un boulanger n'a pas de sous-variante : commerce, bloc Stock, e-commerce conditionnel", () => {
  const r = profils("boulanger");
  assert.deepEqual(r.profils, ["commerce"]);
  assert.equal(r.blocStock, true);
  assert.deepEqual(r.profilsConditionnels, [{ profil: "ecommerce", condition: "vend en ligne" }]);
});

test("professions réglementées : profil du métier, pas d'agent Comm, 3 agents au maximum", () => {
  const avocat = profils("avocat");
  assert.deepEqual(avocat.profils, ["b2b"]);
  assert.equal(avocat.reglementee, true);
  assert.deepEqual(avocat.agentsExclus, ["COMM_CREATION"]);
  assert.equal(avocat.nombreMaxAgents, 3);
  assert.deepEqual(profils("medecin").profils, ["rdv"]);
  assert.deepEqual(profils("expert-comptable").profils, ["abonnement"]);
  assert.equal(profils("coiffeur").reglementee, false);
  assert.equal(profils("coiffeur").nombreMaxAgents, null);
});

test("refuse un métier inconnu, une activité manquante, inconnue ou superflue", () => {
  const inconnu = router(routage, "astronaute", []);
  assert.ok(!inconnu.ok && inconnu.erreur.champ === "metierPrecis");
  const manquante = router(routage, "agence-immobiliere", []);
  assert.ok(!manquante.ok && manquante.erreur.champ === "sousVariantes");
  const fausse = router(routage, "agence-immobiliere", ["syndicat"]);
  assert.ok(!fausse.ok && fausse.erreur.champ === "sousVariantes");
  const superflue = router(routage, "boulanger", ["transaction"]);
  assert.ok(!superflue.ok && superflue.erreur.champ === "sousVariantes");
});

test("la liste des métiers est triée en français", () => {
  const libelles = metiersTries(routage).map((m) => m.libelle);
  assert.deepEqual(libelles, [...libelles].sort((a, b) => a.localeCompare(b, "fr")));
});

// Lexique

test("une clé de lexique est en minuscules, sans accent", () => {
  assert.equal(cleLexique("Montant du premier achat"), "montant_du_premier_achat");
  assert.equal(cleLexique("Coût direct d'une vente"), "cout_direct_d_une_vente");
  assert.equal(cleLexique("Carnet de commandes"), "carnet_de_commandes");
});

test("la même question prend les mots du métier", () => {
  const gabarit = "Combien de {demande} recevez-vous par mois ?";
  const texte = (p: Parameters<typeof formuler>[1]) => {
    const f = formuler(gabarit, p, lexique);
    return f.ok ? f.texte : null;
  };
  assert.equal(texte(["chantier"]), "Combien de demande de devis recevez-vous par mois ?");
  assert.equal(texte(["rdv"]), "Combien de demande de rendez-vous recevez-vous par mois ?");
  assert.equal(texte(["b2b"]), "Combien de contact entrant (lead) recevez-vous par mois ?");
});

test("un mot absent pour le profil (« — ») rend la question sans objet", () => {
  const f = formuler("Combien de {devis} avez-vous envoyés ?", ["commerce"], lexique);
  assert.deepEqual(f, { ok: false, motsAbsents: ["devis"] });
});

test("avec plusieurs profils, le premier qui a le mot l'emporte", () => {
  const f = formuler("Quel est votre {rendez_vous} ?", ["commerce", "b2b"], lexique);
  assert.deepEqual(f, { ok: true, texte: "Quel est votre rendez-vous de découverte ?" });
});

test("libellé d'inscription : formulation propre au profil, sinon gabarit commun", () => {
  const q = { libelle: "Quel est votre métier ?", parProfil: { chantier: "Quel chantier faites-vous ?" } };
  assert.equal(libelleQuestion(q, ["chantier"], lexique), "Quel chantier faites-vous ?");
  assert.equal(libelleQuestion(q, ["rdv"], lexique), "Quel est votre métier ?");
  assert.equal(libelleQuestion(q, [], lexique), "Quel est votre métier ?");
});

test("le contrôle refuse un mot de lexique inconnu dans une question d'inscription", () => {
  const e = structuredClone(donnees);
  e.inscription.questions[0].libelle = "Quel {mot_inconnu} ?";
  assert.match(controlerDonnees(e).erreurs.join("\n"), /mot inconnu du lexique : \{mot_inconnu\}/);
});

// Validation de l'inscription

const schema = creerSchemaInscription(routage);
const valide = {
  email: "Dirigeant@Exemple.fr",
  motDePasse: "motdepasse-long",
  metierPrecis: "agence-immobiliere",
  sousVariantes: ["transaction"],
  chiffreAffairesMensuel: "38000",
  nombreCollaborateurs: "6",
  dateCreationEntreprise: "2019-03-01",
  typeZone: "URBAINE_DENSE",
  ville: "Lyon",
};
const erreurs = (corps: unknown) => {
  const r = schema.safeParse(corps);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

test("une inscription complète est acceptée et normalisée", () => {
  const r = schema.safeParse(valide);
  assert.ok(r.success);
  if (r.success) {
    assert.equal(r.data.email, "dirigeant@exemple.fr");
    assert.equal(r.data.chiffreAffairesMensuel, 38000);
    assert.equal(r.data.nombreCollaborateurs, 6);
  }
});

test("un métier sans activité n'a pas besoin de sous-variante", () => {
  assert.deepEqual(erreurs({ ...valide, metierPrecis: "boulanger", sousVariantes: [] }), []);
  assert.deepEqual(erreurs({ ...valide, metierPrecis: "boulanger", sousVariantes: undefined }), []);
});

test("refuse une inscription incohérente", () => {
  assert.match(erreurs({ ...valide, sousVariantes: [] }).join("\n"), /sousVariantes: Cochez au moins une activité/);
  assert.match(erreurs({ ...valide, metierPrecis: "astronaute" }).join("\n"), /metierPrecis: Métier non reconnu/);
  assert.match(erreurs({ ...valide, metierPrecis: "boulanger" }).join("\n"), /sousVariantes: Ce métier n'a pas d'activités/);
  assert.match(erreurs({ ...valide, nombreCollaborateurs: "0" }).join("\n"), /nombreCollaborateurs: Indiquez au moins une personne/);
  assert.match(erreurs({ ...valide, chiffreAffairesMensuel: "-5" }).join("\n"), /chiffreAffairesMensuel/);
  assert.match(erreurs({ ...valide, dateCreationEntreprise: "2999-01-01" }).join("\n"), /dateCreationEntreprise: La date de création ne peut pas être dans le futur/);
  assert.match(erreurs({ ...valide, dateCreationEntreprise: "03/2019" }).join("\n"), /dateCreationEntreprise/);
  assert.match(erreurs({ ...valide, motDePasse: "court" }).join("\n"), /motDePasse/);
  assert.match(erreurs({ ...valide, typeZone: "LUNE" }).join("\n"), /typeZone/);
  assert.match(erreurs({ ...valide, ville: "  " }).join("\n"), /ville/);
});

test("le routage envoyé par le navigateur est ignoré", () => {
  const r = schema.safeParse({ ...valide, categorie: "restauration", profils: ["restaurant"] });
  assert.ok(r.success);
  if (r.success) assert.ok(!("categorie" in r.data) && !("profils" in r.data));
});

test("l'inscription refuse les valeurs qui feraient échouer la base ou tronquer le mot de passe", () => {
  assert.match(erreurs({ ...valide, chiffreAffairesMensuel: "1000000000000" }).join("\n"), /chiffreAffairesMensuel: .*trop élevé/);
  assert.match(erreurs({ ...valide, chiffreAffairesMensuel: "99999999999" }).join("\n"), /chiffreAffairesMensuel/);
  assert.deepEqual(erreurs({ ...valide, chiffreAffairesMensuel: "1000000000" }), []);
  assert.match(erreurs({ ...valide, nombreCollaborateurs: "1000000000000" }).join("\n"), /nombreCollaborateurs: .*trop élevé/);
  assert.match(erreurs({ ...valide, motDePasse: "a".repeat(73) }).join("\n"), /motDePasse: .*72 octets/);
  assert.deepEqual(erreurs({ ...valide, motDePasse: "a".repeat(72) }), []);
  // 40 caractères accentués = 80 octets : trop long pour bcrypt.
  assert.match(erreurs({ ...valide, motDePasse: "é".repeat(40) }).join("\n"), /motDePasse/);
  assert.match(erreurs({ ...valide, ville: "v".repeat(121) }).join("\n"), /ville: .*trop long/);
  assert.match(erreurs({ ...valide, email: `${"a".repeat(250)}@x.fr` }).join("\n"), /email/);
  assert.match(erreurs({ ...valide, dateCreationEntreprise: "2021-02-30" }).join("\n"), /dateCreationEntreprise/);
  assert.match(erreurs({ ...valide, dateCreationEntreprise: "2021-13-01" }).join("\n"), /dateCreationEntreprise/);
  assert.deepEqual(erreurs({ ...valide, dateCreationEntreprise: "2020-02-29" }), []);
});

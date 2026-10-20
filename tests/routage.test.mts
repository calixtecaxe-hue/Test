// Tests du routage métier → catégorie → profil, du lexique et de la validation
// de l'inscription. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import { cleLexique, formuler, libelleQuestion } from "../src/lib/donnees/lexique.ts";
import { contrainteDepuisCompte, exclusionsAcquisition, metiersTries, routageDuCompte, router } from "../src/lib/routage.ts";
import { creerSchemaInscription } from "../src/lib/validation/inscription-schema.ts";

const dossier = join(fileURLToPath(new URL("..", import.meta.url)), "data");
const donnees = chargerDepuisDisque(dossier);
const { routage, lexique } = donnees;

function profils(metier: string, variantes: string[] = [], options: { autre?: boolean; categorieAbsente?: string } = {}) {
  const r = router(routage, metier, variantes, options);
  assert.ok(r.ok, `${metier} ${variantes} : ${JSON.stringify(!r.ok && r.erreur)}`);
  return r.ok ? r.routage : (undefined as never);
}

test("la liste du document : 149 métiers dont 15 à sous-parties (52 sous-parties), 11 catégories", () => {
  assert.equal(routage.metiers.length, 149);
  const avecParts = routage.metiers.filter((m) => m.sousVariantes);
  assert.equal(avecParts.length, 15);
  assert.equal(avecParts.reduce((n, m) => n + (m.sousVariantes?.length ?? 0), 0), 52);
  assert.equal(routage.categories.length, 11);
  assert.equal(new Set(routage.metiers.map((m) => m.id)).size, 149, "identifiants uniques");
});

test("agence immobilière : transaction → B2B / cycle long, catégorie 4", () => {
  const r = profils("agence-immobiliere", ["transaction"]);
  assert.deepEqual(r.profils, ["b2b"]);
  assert.equal(r.categorie.numero, 4);
  assert.equal(r.reglementee, false);
  assert.equal(r.stock, "non");
  assert.equal(r.agentComm, "oui");
});

test("agence immobilière : gestion locative → Abonnement ; les deux cochées → les deux profils, sans doublon", () => {
  assert.deepEqual(profils("agence-immobiliere", ["gestion-locative"]).profils, ["abonnement"]);
  const deux = profils("agence-immobiliere", ["transaction", "gestion-locative"]);
  assert.deepEqual(deux.profils, ["b2b", "abonnement"]);
  assert.deepEqual(deux.categories, ["transaction-cycle-long", "prestation-recurrente"]);
  assert.deepEqual(profils("agence-immobiliere", ["transaction", "location-recherche-de-locataires"]).profils, ["b2b"], "deux activités de cycle long : un seul profil");
});

test("une activité cochée deux fois ne compte qu'une fois", () => {
  const r = profils("agence-immobiliere", ["transaction", "transaction"]);
  assert.deepEqual(r.sousVariantes, ["transaction"]);
});

test("« Autre » seule donne le questionnaire de l'activité par défaut ; avec d'autres cases elle ne change rien", () => {
  const seule = profils("paysagiste", [], { autre: true });
  assert.equal(seule.autre, true);
  assert.deepEqual(seule.profils, ["chantier"], "Création est l'activité par défaut");
  const avec = profils("paysagiste", ["entretien-regulier"], { autre: true });
  assert.equal(avec.autre, false);
  assert.deepEqual(avec.profils, ["abonnement"]);
  const immo = profils("agence-immobiliere", [], { autre: true });
  assert.deepEqual(immo.profils, ["b2b"], "Transaction par défaut");
  const r = router(routage, "paysagiste", []);
  assert.ok(!r.ok && /Autre/.test(r.erreur.message), "ni activité ni « Autre » : refusé");
});

test("chaque métier à activités a exactement une activité par défaut", () => {
  for (const m of routage.metiers.filter((x) => x.sousVariantes)) {
    assert.equal(m.sousVariantes!.filter((v) => v.defaut).length, 1, m.id);
    const seule = profils(m.id, [], { autre: true });
    assert.ok(seule.profils.length > 0 || seule.questionnaireACreer, m.id);
  }
});

test("paysagiste : création → chantier, entretien → abonnement", () => {
  assert.deepEqual(profils("paysagiste", ["creation"]).profils, ["chantier"]);
  assert.deepEqual(profils("paysagiste", ["entretien-regulier"]).profils, ["abonnement"]);
});

test("communication et marketing : contrats mensuels → Abonnement ; pas d'agent Comm pour les métiers de la communication", () => {
  const r = profils("communication-et-marketing", ["projets-ponctuels", "contrats-mensuels"]);
  assert.deepEqual(r.profils, ["b2b", "abonnement"]);
  assert.equal(r.agentComm, "non");
  assert.deepEqual(r.agentsExclus, ["COMM_CREATION"]);
  assert.equal(r.reglementee, false, "ce n'est pas une profession réglementée");
  assert.equal(r.nombreMaxAgents, null);
});

test("un boulanger n'a pas d'activité : commerce, stock, e-commerce conditionnel", () => {
  const r = profils("boulanger-patissier");
  assert.deepEqual(r.profils, ["commerce"]);
  assert.equal(r.stock, "oui");
  assert.deepEqual(r.profilsConditionnels, [{ profil: "ecommerce", condition: "vend en ligne" }]);
});

test("le stock : oui, non, ou une question à l'inscription ; plusieurs activités → le plus présent l'emporte", () => {
  assert.equal(profils("electricien").stock, "non");
  assert.equal(profils("cuisiniste").stock, "oui");
  assert.equal(profils("garage-et-mecanicien").stock, "a_demander");
  assert.equal(profils("coiffeur").stock, "a_demander");
  assert.equal(profils("hotel").stock, "a_demander");
  assert.equal(profils("fleuriste", ["boutique"]).stock, "oui");
  assert.equal(profils("traiteur", ["mariages-et-evenements"]).stock, "oui");
  assert.equal(profils("evenementiel", ["dj-et-animation", "lieu-de-reception-et-location-de-salles"]).stock, "non");
});

test("agent Comm : la règle la plus prudente l'emporte quand plusieurs activités sont cochées", () => {
  const consultant = profils("consultant", ["strategie-management-et-organisation"]);
  assert.equal(consultant.agentComm, "oui");
  const mixte = profils("consultant", ["strategie-management-et-organisation", "conseil-juridique"]);
  assert.equal(mixte.agentComm, "non");
  assert.equal(mixte.reglementee, true, "le conseil juridique est réglementé : toutes les règles réglementées s'appliquent");
  assert.deepEqual(mixte.agentsExclus, ["COMM_CREATION"]);
  assert.equal(mixte.nombreMaxAgents, 3);
  assert.deepEqual(mixte.profils, ["b2b"]);
  // « À trancher » : l'agent reste proposé tant que la décision est ouverte.
  const pharmacie = profils("pharmacie");
  assert.equal(pharmacie.agentComm, "a_trancher");
  assert.deepEqual(pharmacie.agentsExclus, []);
  const patrimoine = profils("finance-et-assurance", ["conseiller-en-gestion-de-patrimoine", "courtier-en-credit"]);
  assert.equal(patrimoine.agentComm, "a_trancher");
  const mixteTrancher = profils("photographe", ["particuliers-mariages-et-portraits"]);
  assert.equal(mixteTrancher.agentComm, "a_trancher");
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
  // Les 18 métiers réglementés du document, dont les bien-être « par prudence ».
  const reglementes = routage.metiers.filter((m) => routage.categories.find((c) => c.id === m.categorie)?.reglementee);
  assert.equal(reglementes.length, 18);
  for (const id of ["osteopathe", "naturopathe", "sophrologue", "psychologue", "veterinaire"]) assert.equal(profils(id).reglementee, true, id);
});

test("fabrication : catégorie nouvelle, questionnaire à créer, aucun profil rattaché", () => {
  const r = profils("imprimerie");
  assert.equal(r.categorie.id, "fabrication");
  assert.deepEqual(r.profils, []);
  assert.equal(r.questionnaireACreer, true);
  assert.equal(profils("brasserie-artisanale-fabrication-de-biere").agentComm, "a_trancher");
});

test("« Mon métier n'est pas dans la liste » : la catégorie vient du client, le stock est demandé, une profession réglementée est refusée", () => {
  const r = profils("absent", [], { categorieAbsente: "rendez-vous-non-reglemente" });
  assert.deepEqual(r.profils, ["rdv"]);
  assert.equal(r.stock, "a_demander");
  assert.equal(r.agentComm, "oui");
  const sans = router(routage, "absent", []);
  assert.ok(!sans.ok && sans.erreur.champ === "categorieAbsente");
  const regl = router(routage, "absent", [], { categorieAbsente: "professions-reglementees" });
  assert.ok(!regl.ok && /liste/.test(regl.erreur.message));
  const inconnue = router(routage, "absent", [], { categorieAbsente: "n-importe-quoi" });
  assert.ok(!inconnue.ok);
});

test("le routage d'un compte se recalcule d'après les données ; un identifiant ancien retombe sur la catégorie", () => {
  const compte = { metierPrecis: "avocat", sousVariantes: [], categorie: "professions-reglementees" };
  assert.equal(routageDuCompte(routage, compte)?.reglementee, true);
  assert.equal(exclusionsAcquisition(routage, compte) !== null, true);
  const ancien = { metierPrecis: "ancien-metier-disparu", sousVariantes: [], categorie: "professions-reglementees" };
  assert.equal(routageDuCompte(routage, ancien), null);
  assert.deepEqual(contrainteDepuisCompte(routage, ancien).agentsExclus, ["COMM_CREATION"]);
  assert.equal(contrainteDepuisCompte(routage, { ...ancien, categorie: "commerce-stock" }).agentsExclus.length, 0);
  // « Autre » seule, mémorisée par l'absence de cases cochées.
  assert.deepEqual(routageDuCompte(routage, { metierPrecis: "paysagiste", sousVariantes: [], categorie: "prestation-chantier" })?.profils, ["chantier"]);
  // Un compte qui a coché « Conseil juridique » garde les règles réglementées.
  assert.equal(routageDuCompte(routage, { metierPrecis: "consultant", sousVariantes: ["conseil-juridique"], categorie: "professions-reglementees" })?.reglementee, true);
});

test("les synonymes du document mènent au bon métier", () => {
  const cherche = (t: string) => routage.metiers.filter((m) => (m.synonymes ?? []).some((s) => s.toLowerCase() === t.toLowerCase())).map((m) => m.id);
  assert.deepEqual(cherche("Consultant RH"), ["recrutement-et-rh"]);
  assert.deepEqual(cherche("Consultant IT"), ["numerique-et-tech"]);
  assert.deepEqual(cherche("Consultant marketing"), ["communication-et-marketing"]);
  assert.deepEqual(cherche("Conseiller en patrimoine"), ["finance-et-assurance"]);
  assert.deepEqual(cherche("Community manager"), ["communication-et-marketing"]);
});

test("refuse un métier inconnu, une activité manquante, inconnue ou superflue", () => {
  const inconnu = router(routage, "astronaute", []);
  assert.ok(!inconnu.ok && inconnu.erreur.champ === "metierPrecis");
  const manquante = router(routage, "agence-immobiliere", []);
  assert.ok(!manquante.ok && manquante.erreur.champ === "sousVariantes");
  const fausse = router(routage, "agence-immobiliere", ["syndicat"]);
  assert.ok(!fausse.ok && fausse.erreur.champ === "sousVariantes");
  const superflue = router(routage, "boulanger-patissier", ["transaction"]);
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
  const f = formuler("Combien de {unites_vendues} avez-vous vendues ?", ["commerce"], lexique);
  assert.deepEqual(f, { ok: false, motsAbsents: ["unites_vendues"] });
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

test("le contrôle refuse un mot de lexique inconnu dans une question de la banque", () => {
  const e = structuredClone(donnees);
  const q = e.banque[0];
  q.texte = "Combien de {mot_inconnu} avez-vous ?";
  assert.match(controlerDonnees(e).erreurs.join("\n"), new RegExp(`${q.donnee} emploie le mot \\{mot_inconnu\\}`));
});

test("un mot du lexique peut porter une clé explicite, qui l'emporte sur celle du libellé", () => {
  const lex = [{ mot: "Nuits ou jours", cle: "jours_ouverture", formes: { rdv: null, commerce: null, ecommerce: null, restaurant: null, chantier: null, b2b: "jours", abonnement: null, location: null } }];
  assert.deepEqual(formuler("Ouvert {jours_ouverture} ?", ["b2b"], lex), { ok: true, texte: "Ouvert jours ?" });
  assert.deepEqual(formuler("Ouvert {nuits_ou_jours} ?", ["b2b"], lex), { ok: false, motsAbsents: ["nuits_ou_jours"] });
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
  assert.deepEqual(erreurs({ ...valide, metierPrecis: "boulanger-patissier", sousVariantes: [] }), []);
  assert.deepEqual(erreurs({ ...valide, metierPrecis: "boulanger-patissier", sousVariantes: undefined }), []);
});

test("refuse une inscription incohérente", () => {
  assert.match(erreurs({ ...valide, sousVariantes: [] }).join("\n"), /sousVariantes: Cochez au moins une activité/);
  assert.match(erreurs({ ...valide, metierPrecis: "astronaute" }).join("\n"), /metierPrecis: Métier non reconnu/);
  assert.match(erreurs({ ...valide, metierPrecis: "boulanger-patissier" }).join("\n"), /sousVariantes: Ce métier n'a pas d'activités/);
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

// --- Inscription : « Autre », métier absent, stock à demander ----------------------------------------------

test("« Autre » cochée seule exige un texte ; le texte est gardé", () => {
  const base = { ...valide, metierPrecis: "paysagiste", sousVariantes: [], autre: true };
  assert.match(erreurs(base).join("\n"), /autreTexte: Précisez ce que vous faites/);
  const ok = schema.safeParse({ ...base, autreTexte: "  Élagage et abattage " });
  assert.ok(ok.success);
  if (ok.success) assert.equal(ok.data.autreTexte, "Élagage et abattage");
  // Cochée avec une activité : le texte est facultatif.
  assert.deepEqual(erreurs({ ...valide, metierPrecis: "paysagiste", sousVariantes: ["creation"], autre: true }), []);
  // Sans activité ni « Autre » : refusé.
  assert.match(erreurs({ ...valide, metierPrecis: "paysagiste", sousVariantes: [] }).join("\n"), /sousVariantes/);
});

test("métier absent de la liste : le client écrit son métier et choisit la catégorie la plus proche", () => {
  const base = { ...valide, metierPrecis: "absent", sousVariantes: [] };
  assert.match(erreurs(base).join("\n"), /categorieAbsente/);
  assert.match(erreurs({ ...base, categorieAbsente: "commerce-en-ligne" }).join("\n"), /metierAbsentTexte: Indiquez votre métier/);
  assert.match(erreurs({ ...base, categorieAbsente: "commerce-en-ligne", metierAbsentTexte: "Vente de miel" }).join("\n"), /vendProduits/, "le stock est demandé");
  assert.deepEqual(erreurs({ ...base, categorieAbsente: "commerce-en-ligne", metierAbsentTexte: "Vente de miel", vendProduits: true }), []);
  assert.match(erreurs({ ...base, categorieAbsente: "professions-reglementees", metierAbsentTexte: "x", vendProduits: false }).join("\n"), /categorieAbsente/);
});

test("le stock « à demander » impose une réponse ; un métier au stock connu n'en pose pas", () => {
  const garage = { ...valide, metierPrecis: "garage-et-mecanicien", sousVariantes: [] };
  assert.match(erreurs(garage).join("\n"), /vendProduits: Dites si vous vendez aussi des produits/);
  assert.deepEqual(erreurs({ ...garage, vendProduits: false }), []);
  assert.deepEqual(erreurs({ ...valide, metierPrecis: "electricien", sousVariantes: [] }), []);
});

test("les métiers d'hébergement et la location de véhicules ont le profil location, et eux seuls", () => {
  for (const id of ["hotel", "camping", "gite", "chambre-d-hotes", "location-de-vehicules"]) {
    const r = router(routage, id, []);
    assert.ok(r.ok, id);
    if (r.ok) assert.deepEqual(r.routage.profils, ["location"], id);
  }
  const restaurant = router(routage, "restaurant", []);
  assert.ok(restaurant.ok && restaurant.routage.profils.includes("restaurant") && !restaurant.routage.profils.includes("location"));
  assert.deepEqual(routage.metiers.filter((m) => m.profilsImposes?.includes("location")).map((m) => m.id).sort(), ["camping", "chambre-d-hotes", "gite", "hotel", "location-de-vehicules"]);
});

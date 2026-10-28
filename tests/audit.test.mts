// Tests de l'audit d'un agent (src/lib/audit/) : les quatre réponses, les règles de
// robustesse, l'objectif en trois champs, l'affichage conditionnel et l'assemblage.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import type { EnsembleDonnees, Question } from "../src/lib/donnees/schemas.ts";
import {
  accepteLesQuatreReponses,
  aUneReponse,
  appelleUnRepli,
  bilanNonSuivi,
  couvertureTheme,
  reponseSchema,
  valeurRetenue,
  type Reponses,
} from "../src/lib/audit/reponse.ts";
import {
  sensDeLObjectif,
  verifierVraisemblance,
  calculerEcheance,
  objectifSaisieSchema,
  phraseObjectif,
  rattacherIndicateur,
  enregistrerObjectif,
} from "../src/lib/audit/objectif.ts";
import { evaluer, tailleDepuisEffectif, lecteurDeclencheurs } from "../src/lib/audit/affichage.ts";
import { assemblerQuestionnaire, compterQuestions, donneesPrerepondues, equivalences } from "../src/lib/audit/assemblage.ts";

const dossier = join(fileURLToPath(new URL("..", import.meta.url)), "data");
const reel = chargerDepuisDisque(dossier);
const saisie = (valeur: string | boolean | string[]) => ({ genre: "saisie" as const, valeur });

// --- Les quatre réponses -------------------------------------------------------

test("un chiffre exact est utilisé tel quel, zéro compris", () => {
  assert.deepEqual(valeurRetenue({ genre: "exact", valeur: 32 }), { valeur: 32, estimee: false });
  assert.deepEqual(valeurRetenue({ genre: "exact", valeur: 0 }), { valeur: 0, estimee: false });
});

test("une estimation prend le milieu de la fourchette, marqué « estimé »", () => {
  assert.deepEqual(valeurRetenue({ genre: "estimation", min: 30, max: 40 }), { valeur: 35, estimee: true });
});

test("« je ne sais pas », « je ne suis pas cette donnée » et une question sautée sont retirés du calcul, jamais zéro", () => {
  assert.equal(valeurRetenue({ genre: "inconnu" }), null);
  assert.equal(valeurRetenue({ genre: "non_suivi" }), null);
  assert.equal(valeurRetenue(undefined), null);
});

test("0, inconnu et non suivi sont trois réponses distinctes", () => {
  assert.equal(aUneReponse({ genre: "exact", valeur: 0 }), true);
  assert.equal(aUneReponse({ genre: "inconnu" }), false);
  assert.equal(aUneReponse({ genre: "non_suivi" }), false);
  assert.equal(aUneReponse(undefined), false);
});

test("seul « je ne sais pas » appelle une question de repli", () => {
  assert.equal(appelleUnRepli({ genre: "inconnu" }), true);
  assert.equal(appelleUnRepli({ genre: "non_suivi" }), false);
  assert.equal(appelleUnRepli({ genre: "exact", valeur: 3 }), false);
});

test("une saisie vide ne compte pas comme une réponse", () => {
  assert.equal(aUneReponse(saisie("  ")), false);
  assert.equal(aUneReponse(saisie([])), false);
  assert.equal(aUneReponse(saisie("oui")), true);
  assert.equal(aUneReponse(saisie(false)), true);
});

test("le schéma refuse une fourchette inversée et un nombre invalide", () => {
  assert.equal(reponseSchema.safeParse({ genre: "estimation", min: 40, max: 30 }).success, false);
  assert.equal(reponseSchema.safeParse({ genre: "exact", valeur: Number.NaN }).success, false);
  assert.equal(reponseSchema.safeParse({ genre: "exact", valeur: "32" }).success, false);
  assert.equal(reponseSchema.safeParse({ genre: "inconnu" }).success, true);
  assert.equal(reponseSchema.safeParse({ genre: "estimation", min: 30, max: 30 }).success, true);
});

test("les quatre réponses ne valent que pour un chiffre", () => {
  for (const f of ["€", "%", "Nombre", "Jours", "Heures", "Semaines", "€ et %", "Nombre par ligne"]) {
    assert.equal(accepteLesQuatreReponses(f), true, f);
  }
  for (const f of ["Oui / non", "Choix", "Texte court", "Liste", "Mois et année", "Tranches : 0 · 1-3 h · je ne sais pas", null]) {
    assert.equal(accepteLesQuatreReponses(f), false, String(f));
  }
});

// --- Règle des 50 % et règle du quart -------------------------------------------

test("un thème n'est noté qu'avec au moins 50 % de réponses ; inconnu et non suivi comptent pour rien", () => {
  const r: Reponses = {
    a: { genre: "exact", valeur: 1 },
    b: { genre: "inconnu" },
    c: { genre: "non_suivi" },
    d: { genre: "estimation", min: 1, max: 2 },
  };
  const c = couvertureTheme(["a", "b", "c", "d"], r);
  assert.equal(c.repondues, 2);
  assert.equal(c.part, 0.5);
  assert.equal(c.evaluable, true);
  assert.equal(couvertureTheme(["a", "b", "c", "e"], r).evaluable, false);
  assert.equal(couvertureTheme([], r).evaluable, false);
});

test("au-delà d'un quart de données essentielles non suivies, un conseil de pilotage s'ajoute", () => {
  const codes = ["a", "b", "c", "d"];
  const un: Reponses = { a: { genre: "non_suivi" } };
  const deux: Reponses = { a: { genre: "non_suivi" }, b: { genre: "non_suivi" } };
  assert.equal(bilanNonSuivi(codes, un).conseilPilotage, false); // exactement un quart
  const b = bilanNonSuivi(codes, deux);
  assert.equal(b.conseilPilotage, true);
  assert.deepEqual(b.aSuivre, ["a", "b"]);
  assert.equal(bilanNonSuivi([], deux).conseilPilotage, false);
});

// --- Objectif en trois champs ---------------------------------------------------

test("l'exemple du document : « baisser le turnover de 5 % sur les 3 prochains mois »", () => {
  const o = objectifSaisieSchema.parse({ quoi: "baisser le turnover", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 3 });
  assert.equal(phraseObjectif(o), "baisser le turnover de 5 % sur les 3 prochains mois");
});

test("l'objectif refuse un champ vide, un chiffre nul et un délai hors limites", () => {
  const base = { quoi: "augmenter mes ventes", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 6 };
  assert.equal(objectifSaisieSchema.safeParse(base).success, true);
  assert.equal(objectifSaisieSchema.safeParse({ ...base, quoi: " " }).success, false);
  assert.equal(objectifSaisieSchema.safeParse({ ...base, ampleur: { valeur: 0, unite: "pourcent" } }).success, false);
  assert.equal(objectifSaisieSchema.safeParse({ ...base, ampleur: { valeur: 10, unite: "kg" } }).success, false);
  assert.equal(objectifSaisieSchema.safeParse({ ...base, delaiMois: 0 }).success, false);
  assert.equal(objectifSaisieSchema.safeParse({ ...base, delaiMois: 2.5 }).success, false);
  assert.equal(objectifSaisieSchema.safeParse({ ...base, delaiMois: 121 }).success, false);
  assert.equal(objectifSaisieSchema.safeParse({ ...base, delaiMois: 120 }).success, true, "10 ans");
});

test("l'échéance tombe le même jour, ou le dernier jour du mois s'il n'existe pas", () => {
  assert.equal(calculerEcheance(new Date("2026-10-15T10:00:00Z"), 3), "2027-01-15");
  assert.equal(calculerEcheance(new Date("2026-01-31T10:00:00Z"), 1), "2026-02-28");
  assert.equal(calculerEcheance(new Date("2027-12-31T10:00:00Z"), 12), "2028-12-31");
  assert.equal(calculerEcheance(new Date("2027-11-30T10:00:00Z"), 3), "2028-02-29");
});

test("ce que le dirigeant veut changer se rattache à un indicateur de l'agent, sinon rien", () => {
  const rh = reel.themes.filter((t) => t.agent === "RH_ORGANISATION");
  const acq = reel.themes.filter((t) => t.agent === "ACQUISITION_CA");
  assert.equal(rattacherIndicateur("réduire les absences", rh)?.code, "RH-34");
  assert.equal(rattacherIndicateur("améliorer la transformation", acq)?.code, "ACQ-11");
  // Pas d'indicateur « turnover » dans l'agent RH : l'objectif est gardé tel quel.
  assert.equal(rattacherIndicateur("baisser le turnover", rh), null);
  assert.equal(rattacherIndicateur("", rh), null);
  assert.equal(rattacherIndicateur("faire mieux", rh), null);
});

test("un objectif enregistré garde la saisie, l'indicateur rattaché et l'échéance", () => {
  const saisieObj = objectifSaisieSchema.parse({ quoi: "réduire les absences", ampleur: { valeur: 20, unite: "pourcent" }, delaiMois: 6 });
  const e = enregistrerObjectif(saisieObj, reel.themes.filter((t) => t.agent === "RH_ORGANISATION"), new Date("2026-10-15T08:00:00Z"));
  assert.equal(e.indicateur?.code, "RH-34");
  assert.equal(e.echeance, "2027-04-15");
  assert.equal(e.delaiMois, 6);
});

// --- Règles d'affichage ---------------------------------------------------------

test("l'effectif déclaré donne la taille du filtre", () => {
  assert.equal(tailleDepuisEffectif(1), "seul");
  assert.equal(tailleDepuisEffectif(2), "equipe_2_5");
  assert.equal(tailleDepuisEffectif(5), "equipe_2_5");
  assert.equal(tailleDepuisEffectif(6), "structure_6_plus");
});

test("une règle sans réponse au déclencheur reste en attente", () => {
  const r = reel.reglesAffichage;
  const lire = lecteurDeclencheurs({}, "equipe_2_5", r);
  assert.equal(evaluer(r.conditions["D06 · si devis ou propositions"], lire), null);
  const oui = lecteurDeclencheurs({ D06: saisie("oui") }, "equipe_2_5", r);
  assert.equal(evaluer(r.conditions["D06 · si devis ou propositions"], oui), true);
  assert.equal(evaluer(r.masquages["Métiers sans devis"], oui), false);
});

test("l'investissement qui n'existe pas rend la question « en service » sans objet", () => {
  const r = reel.reglesAffichage;
  const lire = lecteurDeclencheurs({ D12: saisie("non") }, "seul", r);
  assert.equal(evaluer(r.conditions["D12 · si investissement déjà en service"], lire), false);
  assert.equal(evaluer(r.masquages["Sans investissement récent"], lire), true);
  const enService = lecteurDeclencheurs({ D12: saisie("oui"), "D12.en_service": saisie("oui") }, "seul", r);
  assert.equal(evaluer(r.masquages["Sans investissement récent"], enService), false);
});

test("une règle à préciser ne tranche pas", () => {
  const r = reel.reglesAffichage;
  assert.equal(evaluer(r.masquages["Vente immédiate (commerce)"], () => undefined), "a_preciser");
});

// --- Assemblage -----------------------------------------------------------------

const ctx = (agent: "ACQUISITION_CA" | "FINANCE_RENTABILITE" | "RH_ORGANISATION" | "COMM_CREATION", extra: Partial<Parameters<typeof assemblerQuestionnaire>[1]> = {}) => ({
  agent,
  profils: ["rdv" as const],
  taille: "equipe_2_5" as const,
  niveau: "essentiel" as const,
  reponses: {} as Reponses,
  ...extra,
});

test("sans réponse aux déclencheurs, l'assemblage demande d'abord ceux dont dépend le questionnaire", () => {
  const a = assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { profils: ["chantier"] }));
  const codes = a.declencheursAPoser.map((d) => d.code);
  assert.ok(codes.includes("D05"), "rendez-vous");
  assert.ok(codes.includes("D06"), "devis");
  // D03 (canaux) est la question ACQ-03.01 elle-même : elle se pose dans le questionnaire, pas au cadrage.
  assert.ok(!codes.includes("D03"), "les canaux sont une question de la banque");
  assert.ok(a.themes.some((t) => t.questions.some((q) => q.code === "ACQ-03.01")), "ACQ-03.01 est posée");
  assert.ok(!codes.includes("D02"), "l'effectif vient du compte");
  assert.ok(a.enAttente > 0);
  for (const d of a.declencheursAPoser) assert.ok(d.question.length > 0);
});

test("répondre « non » à un déclencheur masque le thème, « oui » ouvre le bloc", () => {
  const sansRdv = assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { profils: ["chantier"], reponses: { D05: saisie("non"), D06: saisie("non") } }));
  assert.ok(sansRdv.themesMasques.some((t) => t.code === "ACQ-09"));
  assert.ok(sansRdv.themesMasques.some((t) => t.code === "ACQ-10"));
  assert.ok(!sansRdv.themes.some((t) => t.theme.code === "ACQ-09"));
  const avec = assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { profils: ["chantier"], reponses: { D05: saisie("oui"), D06: saisie("oui") } }));
  assert.ok(avec.themes.some((t) => t.theme.code === "ACQ-09"));
  assert.ok(avec.themes.some((t) => t.theme.code === "ACQ-10"));
  assert.ok(!avec.declencheursAPoser.some((d) => d.code === "D05"));
});

test("seul, l'agent RH masque les thèmes d'équipe et ne pose aucune question salariés", () => {
  const seul = assemblerQuestionnaire(reel, ctx("RH_ORGANISATION", { taille: "seul" }));
  assert.ok(seul.themesMasques.some((t) => t.code === "RH-34"), "absences");
  assert.ok(!seul.themes.some((t) => t.theme.code === "RH-34"));
  const equipe = assemblerQuestionnaire(reel, ctx("RH_ORGANISATION", { taille: "structure_6_plus" }));
  assert.ok(equipe.themesMasques.length < seul.themesMasques.length);
  assert.ok(equipe.themes.length > seul.themes.length);
});

test("« ne publie pas » masque les thèmes de performance Comm (ex. réseaux actifs)", () => {
  const a = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: { "COM-10.07": saisie("non_jamais") } }));
  assert.ok(a.themesMasques.some((t) => t.code === "COM-23"));
  // COM-10 est masqué pour qui ne publie pas, mais ses questions « si vous ne publiez pas encore » restent posées.
  const com10 = a.themes.find((t) => t.theme.code === "COM-10");
  // La question qui décide du masquage (COM-10.07) reste posée : sans elle, la réponse ne peut plus être corrigée.
  assert.deepEqual(com10?.questions.map((q) => q.code), ["COM-10.03", "COM-10.04", "COM-10.05", "COM-10.07"]);
});

test("COM-10.07 décide du masquage de son propre thème : sans réponse, elle est posée et le reste attend (pas d'impasse)", () => {
  const a = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: {} }));
  const com10 = a.themes.find((t) => t.theme.code === "COM-10");
  assert.deepEqual(com10?.questions.map((q) => q.code), ["COM-10.07"]);
  assert.ok(a.enAttente > 0);
  assert.equal(a.themesMasques.length, 0);
});

test("une question d'un autre agent dont dépend le questionnaire est posée en préalable, une seule fois", () => {
  const comm = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: {} }));
  const codes = comm.prealables.map((q) => q.code);
  // Types de clients (ACQ-01.01) alimente les tableaux COM-02.01 et COM-09.03 ; les canaux (ACQ-03.01) ouvrent des questions Comm.
  assert.ok(codes.includes("ACQ-01.01"));
  assert.ok(codes.includes("ACQ-03.01"));
  assert.ok(comm.prealables.every((q) => q.texte !== null && q.spec !== null));
  // Une fois répondues, elles restent listées (corrigibles par qui n'a pas l'agent Acquisition) et les questions en attente s'ouvrent.
  const repondu = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: { "ACQ-01.01": saisie(["Particuliers"]), "ACQ-03.01": saisie(["site_internet"]) } }));
  assert.ok(repondu.prealables.map((q) => q.code).includes("ACQ-01.01"));
  assert.ok(repondu.enAttente < comm.enAttente);
  // L'agent propriétaire de ces données les pose lui-même, sans préalable.
  const acq = assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { reponses: {} }));
  assert.ok(!acq.prealables.some((q) => q.code === "ACQ-01.01"));
});

test("un tableau dont les lignes viennent des jours d'ouverture fait poser la question des jours (D20 = ACQ-22.01), jamais un cadrage en double", () => {
  const a = assemblerQuestionnaire(reel, { ...ctx("ACQUISITION_CA", { reponses: {} }), profils: ["ecommerce"] });
  const codes = new Set([...a.prealables, ...a.themes.flatMap((t) => t.questions)].map((q) => q.code));
  assert.ok(codes.has("ACQ-22.01"), "la question des jours est posée");
  assert.ok(!a.declencheursConcernes.some((d) => d.code === "D20"), "pas de question de cadrage « Jours d'ouverture » en plus");
  // Les jours cochés donnent les lignes du tableau des horaires.
  const b = assemblerQuestionnaire(reel, { ...ctx("ACQUISITION_CA", { reponses: { "ACQ-22.01": saisie(["lundi", "mardi"]) } }), profils: ["ecommerce"] });
  assert.ok(b.themes.flatMap((t) => t.questions).some((q) => q.code === "ACQ-22.02"));
});

test("l'offre d'appel se demande une seule fois (D25 = COM-21.01) : « Non, rien » masque la suite", () => {
  const sans = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: {} }));
  assert.ok(!sans.declencheursConcernes.some((d) => d.code === "D25"));
  const codes = (x: ReturnType<typeof assemblerQuestionnaire>) => new Set(x.themes.flatMap((t) => t.questions).map((q) => q.code));
  const non = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: { "COM-21.01": saisie("non_rien") } }));
  const guide = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: { "COM-21.01": saisie("guide_ou_liste_de_conseils") } }));
  assert.ok(!codes(non).has("COM-21.02"));
  assert.ok(codes(guide).has("COM-21.02"));
});

test("le niveau approfondi pose plus de questions que le niveau essentiel", () => {
  const rep: Reponses = Object.fromEntries(
    reel.declencheurs.map((d) => [d.code, saisie("oui")])
  );
  const ess = assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { reponses: rep, niveau: "essentiel" }));
  const app = assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { reponses: rep, niveau: "approfondi" }));
  const n = (x: typeof ess) => x.themes.reduce((s, t) => s + t.questions.length, 0);
  assert.ok(n(app) > n(ess));
  assert.ok(ess.themes.every((t) => t.questions.every((q) => q.niveau === "essentiel")));
});

test("aucune question n'est inventée : sans banque, les questions sont signalées manquantes", () => {
  const sansBanque: EnsembleDonnees = { ...reel, banque: [] };
  const a = assemblerQuestionnaire(sansBanque, ctx("ACQUISITION_CA", { reponses: { D05: saisie("oui"), D06: saisie("oui") } }));
  assert.ok(a.statistiques.aPoser > 0);
  assert.equal(a.statistiques.ecrites, 0);
  assert.equal(a.statistiques.manquantes, a.statistiques.aPoser);
  for (const t of a.themes) for (const q of t.questions) assert.equal(q.texte, null);
});

test("la banque réelle : une question écrite n'est comptée écrite que si sa donnée est posée, les autres restent manquantes", () => {
  const a = assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { reponses: { D05: saisie("oui"), D06: saisie("oui") } }));
  assert.equal(a.statistiques.ecrites + a.statistiques.manquantes, a.statistiques.aPoser);
  const ecrites = new Set(reel.banque.map((q) => q.donnee));
  for (const t of a.themes) for (const q of t.questions) assert.equal(q.texte !== null, ecrites.has(q.code), q.code);
});

test("une question écrite dans la banque prend les mots du métier", () => {
  const e: EnsembleDonnees = structuredClone(reel);
  const premiere = e.donnees.find((d) => d.mode === "demandee" && d.niveau === "essentiel" && d.theme === "ACQ-02" && "profils" in d && d.profils.rdv && d.profils.chantier)!;
  const q: Question = { donnee: premiere.code, texte: "Combien de {demande} recevez-vous par mois ?", aide: null, repli: "Comptez-les pendant 4 semaines." };
  e.banque = [q];
  const rdv = assemblerQuestionnaire(e, ctx("ACQUISITION_CA", { profils: ["rdv"] }));
  const trouvee = rdv.themes.flatMap((t) => t.questions).find((x) => x.code === premiere.code);
  assert.ok(trouvee?.texte && !trouvee.texte.includes("{"), trouvee?.texte ?? "absente");
  const chantier = assemblerQuestionnaire(e, ctx("ACQUISITION_CA", { profils: ["chantier"] }));
  const autre = chantier.themes.flatMap((t) => t.questions).find((x) => x.code === premiere.code);
  assert.ok(autre?.texte && autre.texte !== trouvee.texte, "la formulation change avec le profil");
  assert.equal(trouvee.repli, "Comptez-les pendant 4 semaines.");
  assert.equal(rdv.statistiques.ecrites, 1);
});

test("une donnée partagée déjà posée par un autre agent n'est jamais redemandée", () => {
  const eq = equivalences(reel.donnees);
  assert.ok(eq.get("FIN-14.01")?.has("ACQ-23.01") || reel.donnees.find((d) => d.code === "ACQ-23.01")?.mode !== "demandee");
  // FIN-01.01 (prix des 3 offres) remplace ACQ-13.01 : répondre ici dispense de répondre là.
  assert.ok(eq.get("FIN-01.01")?.has("ACQ-13.01"));
  assert.ok(eq.get("ACQ-13.01")?.has("FIN-01.01"));
  const rep: Reponses = { "FIN-01.01": { genre: "exact", valeur: 1 }, D07: saisie("non") };
  const a = assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { reponses: rep, niveau: "approfondi" }));
  const q = a.themes.flatMap((t) => t.questions).find((x) => x.code === "ACQ-13.01");
  assert.ok(q, "la donnée est reprise");
  assert.equal(q.dejaPosee, true);
  assert.ok(a.dejaPosees >= 1);
  // Elle n'est pas comptée parmi les questions à poser.
  assert.equal(a.statistiques.aPoser, a.themes.flatMap((t) => t.questions).filter((x) => !x.dejaPosee).length);
});

test("un thème sans donnée pour ce profil n'apparaît pas", () => {
  const a = assemblerQuestionnaire(reel, ctx("FINANCE_RENTABILITE", { profils: ["rdv"], reponses: {} }));
  const concernees = new Set(a.themes.map((t) => t.theme.code).concat(a.themesMasques.map((t) => t.code)));
  assert.ok(concernees.size <= reel.themes.filter((t) => t.agent === "FINANCE_RENTABILITE").length);
});

test("le budget marketing et communication (FIN-05.02) est toujours posé, déjà rempli avec le total du détail donné aux autres agents", () => {
  const question = (reponses: Reponses) =>
    assemblerQuestionnaire(reel, ctx("FINANCE_RENTABILITE", { profils: ["rdv"], taille: "equipe_2_5", niveau: "approfondi", reponses }))
      .themes.flatMap((t) => t.questions)
      .find((q) => q.code === "FIN-05.02");
  // Le détail d'un compte réel : le coût par canal (ACQ-03.05) n'existe que pour les canaux cochés, publicité payante déclarée (D04).
  const detail: Reponses = {
    D04: saisie("oui"),
    "ACQ-03.01": saisie(["site_internet"]),
    "ACQ-03.05": { genre: "valeurs", valeurs: { "site_internet.depense_par_mois": 50 } },
    "ACQ-07.01": { genre: "exact", valeur: 100 },
    "ACQ-07.03": { genre: "exact", valeur: 200 },
    "ACQ-07.04": { genre: "exact", valeur: 80 },
    "COM-32.02": { genre: "valeurs", valeurs: { "community_manager.par_mois": 300 } },
  };
  assert.ok(question({}), "sans détail, la question est posée");
  assert.equal(question({})?.prereponse, null, "sans détail, rien n'est pré-rempli");
  assert.equal(question(detail)?.prereponse?.total, 730, "le détail complet donne le total, publicité et agence comprises");
  assert.equal(question({ ...detail, "ACQ-07.04": { genre: "inconnu" } })?.prereponse, null, "« je ne sais pas » : pas de total");
  const { "COM-32.02": _sansComm, ...sansComm } = detail;
  void _sansComm;
  assert.equal(question(sansComm)?.prereponse, null, "agent Comm pas fait : pas de total");
  assert.equal(question({ ...detail, "FIN-05.02": { genre: "exact", valeur: 900 } })?.prereponse, null, "déjà répondue : la réponse du dirigeant l'emporte");
  // Le détail donné à la Comm ne dispense pas de la question : elle reste posée, déjà remplie, jamais « déjà renseignée ».
  assert.equal(question(detail)?.dejaPosee, false, "le détail de la Comm ne rend pas le budget marketing « déjà renseigné »");
  assert.equal(question(detail)?.dejaPoseeDans, null);
});

test("le budget marketing n'est lié à aucun autre : le détail Comm reste demandé même si le total est connu", () => {
  const eq = equivalences(reel.donnees, donneesPrerepondues(reel.prereponses));
  assert.equal(eq.get("FIN-05.02")?.size ?? 0, 0);
  assert.equal([...(eq.get("COM-32.02") ?? [])].includes("FIN-05.02"), false);
});

// --- Validation des réponses reçues ------------------------------------------------

import { validerReponse } from "../src/lib/audit/validation.ts";

test("une réponse de déclencheur doit correspondre à ce qui est posé", () => {
  assert.equal(validerReponse(reel, "D07", saisie("oui")).ok, true);
  assert.equal(validerReponse(reel, "D07", saisie("peut-être")).ok, false);
  assert.equal(validerReponse(reel, "D07", { genre: "exact", valeur: 1 }).ok, false);
  // D03 est la question ACQ-03.01 : on y répond là, pas comme à un déclencheur du cadrage.
  assert.equal(validerReponse(reel, "D03", saisie(["site_internet"])).ok, false);
  assert.equal(validerReponse(reel, "ACQ-03.01", saisie(["site_internet", "salons_et_evenements"])).ok, true);
  assert.equal(validerReponse(reel, "ACQ-03.01", saisie(["telepathie"])).ok, false);
  // D13 est la question RH-28.01 (vérification du 28 octobre : le cadrage la posait une seconde fois).
  assert.equal(validerReponse(reel, "D13", saisie("prevu")).ok, false);
  assert.equal(validerReponse(reel, "RH-28.01", saisie("je_prevois_de_recruter")).ok, true);
  assert.equal(validerReponse(reel, "RH-28.01", saisie("oui")).ok, false);
  assert.equal(validerReponse(reel, "D08.achats", saisie("non")).ok, true);
  assert.equal(validerReponse(reel, "D08.inconnu", saisie("non")).ok, false);
  assert.equal(validerReponse(reel, "D12.en_service", saisie("oui")).ok, true);
  assert.equal(validerReponse(reel, "D07.achats", saisie("oui")).ok, false);
  assert.equal(validerReponse(reel, "D99", saisie("oui")).ok, false);
  // L'effectif vient du compte, il ne se répond pas ici.
  assert.equal(validerReponse(reel, "D02", saisie("seul")).ok, false);
});

test("une réponse de donnée : seul un chiffre admet exact et estimation, tout admet « je ne sais pas »", () => {
  // Sans banque : le format du classeur décide (la banque réelle peut définir une autre réponse).
  const sansBanque: EnsembleDonnees = { ...reel, banque: [] };
  const scalaire = sansBanque.donnees.find((d) => d.mode === "demandee" && d.format === "€")!;
  const tableau = sansBanque.donnees.find((d) => d.mode === "demandee" && d.format?.startsWith("Tableau"))!;
  const v = validerReponse(sansBanque, scalaire.code, { genre: "estimation", min: 10, max: 20 });
  assert.equal(v.ok, true);
  assert.equal(v.ok && v.agent, reel.themes.find((t) => t.code === scalaire.theme)!.agent);
  assert.equal(validerReponse(sansBanque, tableau.code, { genre: "exact", valeur: 3 }).ok, false);
  assert.equal(validerReponse(sansBanque, tableau.code, { genre: "inconnu" }).ok, true);
  assert.equal(validerReponse(sansBanque, tableau.code, { genre: "non_suivi" }).ok, true);
  assert.equal(validerReponse(sansBanque, tableau.code, saisie("texte libre")).ok, true);
});

test("on ne répond pas à une donnée calculée ni à une donnée qui n'existe pas", () => {
  const calculee = reel.donnees.find((d) => d.mode === "calculee")!;
  assert.equal(validerReponse(reel, calculee.code, saisie("1")).ok, false);
  assert.equal(validerReponse(reel, "ACQ-99.99", saisie("1")).ok, false);
});

// --- Lecture des nombres tapés -----------------------------------------------------------

import { lireNombre } from "../src/lib/audit/nombre.ts";

test("un nombre tapé à la française est lu comme le dirigeant l'entend", () => {
  const cas: [string, number | null][] = [
    ["32", 32], ["0", 0], ["12,5", 12.5], ["12.5", 12.5], ["0,5", 0.5], [",5", 0.5],
    ["1 250", 1250], ["1 250", 1250], ["1 250,75", 1250.75],
    ["1.000", 1000], ["12.345.678", 12345678], ["1.234,56", 1234.56], ["1,234.56", 1234.56],
    ["-50", -50], ["+7", 7], ["  42  ", 42],
    ["", null], ["abc", null], ["1e999", null], ["1e3", null], ["1,2,3", null], ["1.2.3", null], ["12,", null], [".", null], ["-", null], ["1 2a", null], ["Infinity", null], ["NaN", null],
  ];
  for (const [entree, attendu] of cas) assert.equal(lireNombre(entree), attendu, `« ${entree} »`);
});

// --- Professions réglementées : l'audit Acquisition ne pose pas ce qu'il n'a pas le droit de recommander -------

import { exclusionsAcquisition, metierDuCompte } from "../src/lib/routage.ts";

const AVOCAT = { metierPrecis: "avocat", sousVariantes: [], categorie: "professions-reglementees" };
const ELECTRICIEN = { metierPrecis: "electricien", sousVariantes: [], categorie: "prestation-chantier" };

test("pour une profession réglementée, ni publicité payante, ni prospection, ni partenaires ne sont demandés", () => {
  const ex = exclusionsAcquisition(reel.routage, AVOCAT);
  assert.ok(ex);
  assert.equal(exclusionsAcquisition(reel.routage, ELECTRICIEN), null);
  const tous: Reponses = Object.fromEntries(reel.declencheurs.map((d) => [d.code, saisie("oui")]));
  tous["ACQ-03.01"] = saisie(["bouche_a_oreille", "publicite_en_ligne", "publicite_locale", "prospection", "partenaires", "site_internet"]);
  const base = { agent: "ACQUISITION_CA" as const, profils: ["b2b" as const], taille: "equipe_2_5" as const, niveau: "approfondi" as const, reponses: tous };
  const libre = assemblerQuestionnaire(reel, base);
  const regl = assemblerQuestionnaire(reel, { ...base, exclusions: ex });

  const codesCadrage = regl.declencheursConcernes.map((d) => d.code);
  assert.ok(!codesCadrage.includes("D04"), "pas de question sur la publicité payante");
  assert.ok(libre.declencheursConcernes.some((d) => d.code === "D04"));
  // Les canaux sont la question ACQ-03.01 : les options écartées n'y figurent pas.
  const canaux = regl.themes.flatMap((t) => t.questions).find((q) => q.code === "ACQ-03.01")!;
  assert.ok(canaux.spec?.type === "cases");
  const ids = canaux.spec?.type === "cases" ? canaux.spec.options.map((o) => o.id) : [];
  for (const interdit of ["reseaux_sociaux", "publicite_en_ligne", "publicite_locale", "plateformes", "annuaires", "partenaires", "prospection", "emailing_et_sms", "salons_et_evenements", "reseaux_d_affaires"]) assert.ok(!ids.includes(interdit), interdit);
  assert.deepEqual(ids.filter((id) => id !== "autre").sort(), ["appels_d_offres", "bouche_a_oreille", "fiche_google", "passage", "reseau_ou_enseigne", "site_internet"], "seuls restent les canaux sans risque");
  const libreCanaux = libre.themes.flatMap((t) => t.questions).find((q) => q.code === "ACQ-03.01")!;
  assert.ok(libreCanaux.spec?.type === "cases" && libreCanaux.spec.options.some((o) => o.id === "prospection"));

  const themes = regl.themes.map((t) => t.theme.code);
  assert.ok(!themes.includes("ACQ-04") && !themes.includes("ACQ-05"));
  assert.ok(libre.themes.some((t) => t.theme.code === "ACQ-04") && libre.themes.some((t) => t.theme.code === "ACQ-05"));
  assert.ok(!regl.themesMasques.some((t) => t.code === "ACQ-04"), "un thème écarté n'est ni posé, ni « masqué »");

  // Aucune donnée qui dépend de la publicité payante ou des canaux écartés.
  const posees = new Set(regl.themes.flatMap((t) => t.questions.map((q) => q.code)));
  for (const d of reel.donnees) {
    if (d.condition && /D04|« prospection »|« partenaires »/.test(d.condition)) assert.ok(!posees.has(d.code), `${d.code} (${d.condition})`);
  }
  assert.ok(regl.statistiques.aPoser < libre.statistiques.aPoser);
});

test("les exclusions ne touchent que l'agent Acquisition", () => {
  const ex = exclusionsAcquisition(reel.routage, AVOCAT);
  const tous: Reponses = Object.fromEntries(reel.declencheurs.map((d) => [d.code, saisie("oui")]));
  const a = assemblerQuestionnaire(reel, { agent: "FINANCE_RENTABILITE", profils: ["b2b"], taille: "equipe_2_5", niveau: "approfondi", reponses: tous, exclusions: ex });
  const b = assemblerQuestionnaire(reel, { agent: "FINANCE_RENTABILITE", profils: ["b2b"], taille: "equipe_2_5", niveau: "approfondi", reponses: tous });
  assert.equal(a.statistiques.aPoser, b.statistiques.aPoser);
});

test("le serveur refuse à une profession réglementée les réponses qu'on ne lui pose pas", () => {
  const ex = exclusionsAcquisition(reel.routage, AVOCAT);
  assert.ok(!validerReponse(reel, "D04", saisie("oui"), {}, ex).ok);
  assert.ok(validerReponse(reel, "D04", saisie("oui"), {}, null).ok);
  assert.ok(!validerReponse(reel, "ACQ-03.01", saisie(["site_internet", "publicite_en_ligne"]), {}, ex).ok);
  assert.ok(validerReponse(reel, "ACQ-03.01", saisie(["site_internet", "bouche_a_oreille"]), {}, ex).ok);
  assert.ok(validerReponse(reel, "ACQ-03.01", saisie(["site_internet", "publicite_en_ligne"]), {}, null).ok);
});

test("une réponse donnée avant l'exclusion (canal « publicité » coché) est ignorée à l'assemblage", () => {
  const ex = exclusionsAcquisition(reel.routage, AVOCAT);
  const rep: Reponses = { ...Object.fromEntries(reel.declencheurs.map((d) => [d.code, saisie("oui")])), "ACQ-03.01": saisie(["publicite_en_ligne", "site_internet"]) };
  const a = assemblerQuestionnaire(reel, { agent: "ACQUISITION_CA", profils: ["b2b"], taille: "equipe_2_5", niveau: "approfondi", reponses: rep, exclusions: ex });
  const posees = a.themes.flatMap((t) => t.questions.map((q) => q.code));
  const dependantPub = reel.donnees.filter((d) => d.condition?.includes("D04")).map((d) => d.code);
  for (const c of dependantPub) assert.ok(!posees.includes(c), c);
});

// --- Vraisemblance d'un objectif selon son délai ---------------------------------------------------

const F = reel.limitesObjectif.facteurAnnuelMax;
const obj = (quoi: string, valeur: number, delaiMois: number, unite: "pourcent" | "euros" | "unites" = "pourcent") => ({ quoi, ampleur: { valeur, unite }, delaiMois });

test("le sens d'un objectif se lit dans le verbe", () => {
  assert.equal(sensDeLObjectif("baisser le turnover"), "baisse");
  assert.equal(sensDeLObjectif("réduire les impayés"), "baisse");
  assert.equal(sensDeLObjectif("diminuer mon délai de réponse"), "baisse");
  assert.equal(sensDeLObjectif("augmenter mon chiffre d'affaires"), "hausse");
  assert.equal(sensDeLObjectif("Gagner des clients"), "hausse");
  assert.equal(sensDeLObjectif("améliorer la transformation"), "hausse");
  assert.equal(sensDeLObjectif("le turnover"), "inconnu");
  assert.equal(sensDeLObjectif("réduire le montant des impayés"), "baisse", "« montant » n'est pas un verbe de hausse");
});

test("+300 % est impossible sur peu de temps et acceptable sur 10 ans", () => {
  assert.equal(F, 4);
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 300, 120), F).ok, true, "300 % sur 10 ans");
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 300, 24), F).ok, true, "300 % sur 2 ans");
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 300, 12), F).ok, true, "300 % sur 1 an : la limite");
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 300, 11), F).ok, false);
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 300, 3), F).ok, false);
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 5, 3), F).ok, true, "5 % en 3 mois");
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 15, 12), F).ok, true);
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 50, 1), F).ok, false, "50 % en 1 mois");
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 40, 6), F).ok, true, "40 % en 6 mois : 1,4^2 = 1,96 par an");
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 100, 3), F).ok, false, "doubler en 3 mois");
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 100, 6), F).ok, true, "doubler en 6 mois : ×4 par an");
});

test("le message dit ce qui serait accepté : l'ampleur maximale et le délai minimal", () => {
  const v = verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 300, 3), F);
  assert.ok(!v.ok);
  assert.match(v.message, /\+300 % en 3 mois dépasse/);
  assert.match(v.message, /maximum retenu est \+41 %/, v.message);
  assert.match(v.message, /au moins 12 mois/);
  const long = verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 2000, 24), F);
  assert.ok(!long.ok && /au moins/.test(long.message));
});

test("une baisse se juge dans son sens ; 100 % de baisse supprime l'indicateur", () => {
  assert.equal(verifierVraisemblance(obj("baisser le turnover", 5, 3), F).ok, true, "l'exemple du document");
  assert.equal(verifierVraisemblance(obj("baisser le turnover", 20, 3), F).ok, true);
  assert.equal(verifierVraisemblance(obj("baisser le turnover", 50, 3), F).ok, false);
  assert.equal(verifierVraisemblance(obj("baisser le turnover", 50, 6), F).ok, true, "÷4 par an");
  const cent = verifierVraisemblance(obj("baisser le turnover", 100, 60), F);
  assert.ok(!cent.ok && /supprimerait entièrement/.test(cent.message));
  const baisse = verifierVraisemblance(obj("baisser le turnover", 60, 3), F);
  assert.ok(!baisse.ok && /−60 %/.test(baisse.message));
});

test("sans sens reconnu, on retient la lecture la plus indulgente (hausse)", () => {
  assert.equal(verifierVraisemblance(obj("le turnover", 40, 6), F).ok, true);
  assert.equal(verifierVraisemblance(obj("le turnover", 300, 3), F).ok, false);
});

test("un objectif en euros ou en nombre n'est pas comparé : aucune valeur de départ", () => {
  assert.equal(verifierVraisemblance(obj("augmenter mon chiffre d'affaires", 5000000, 1, "euros"), F).ok, true);
  assert.equal(verifierVraisemblance(obj("gagner des clients", 500, 1, "unites"), F).ok, true);
});

// --- Pré-réponses ------------------------------------------------------------------

import { prereponseDe } from "../src/lib/audit/prereponse.ts";

test("le total proposé additionne les chiffres donnés, estimation au milieu, et se tait s'il manque un chiffre exigé", () => {
  const regles = { source: "test", regles: [{ donnee: "FIN-05.02", somme: ["ACQ-07.01", "ACQ-07.03"], exige: ["ACQ-07.03"], detail: "d" }] };
  assert.equal(prereponseDe(regles, "FIN-05.02", { "ACQ-07.03": { genre: "exact", valeur: 10 } })?.total, 10, "une ligne facultative absente compte pour rien");
  assert.equal(prereponseDe(regles, "FIN-05.02", { "ACQ-07.01": { genre: "estimation", min: 10, max: 30 }, "ACQ-07.03": { genre: "exact", valeur: 5 } })?.total, 25);
  assert.equal(prereponseDe(regles, "FIN-05.02", { "ACQ-07.03": { genre: "non_suivi" } }), null);
  assert.equal(prereponseDe(regles, "FIN-05.02", { "ACQ-07.01": { genre: "exact", valeur: 10 } }), null);
  assert.equal(prereponseDe(regles, "AUTRE", {}), null);
  assert.equal(prereponseDe(regles, "FIN-05.02", { "ACQ-07.03": { genre: "exact", valeur: 0 } })?.total, 0, "0 est un chiffre, pas une absence");
});

// --- Objectif sans chiffre (RH, Comm) -----------------------------------------------

test("un objectif sans chiffre se décrit par une phrase de réussite, et un des deux est obligatoire", () => {
  const sansChiffre = { quoi: "clarifier les rôles et les responsabilités", reussite: "chacun sait ce qu'il doit faire sans me solliciter", delaiMois: 3 };
  const o = objectifSaisieSchema.parse(sansChiffre);
  assert.equal(phraseObjectif(o), "clarifier les rôles et les responsabilités en 3 mois");
  assert.equal(o.ampleur, undefined);
  // Ni chiffre ni phrase de réussite : refusé, avec le message sur la phrase.
  const vide = objectifSaisieSchema.safeParse({ quoi: "clarifier les rôles", delaiMois: 3 });
  assert.equal(vide.success, false);
  assert.deepEqual(vide.success ? [] : vide.error.issues[0].path, ["reussite"]);
  assert.equal(objectifSaisieSchema.safeParse({ ...sansChiffre, reussite: "ok" }).success, false, "une réussite trop courte n'est pas une description");
  // Le chiffre seul reste valable, comme avant.
  assert.equal(objectifSaisieSchema.safeParse({ quoi: "baisser le turnover", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 3 }).success, true);
});

test("un objectif sans chiffre n'est pas comparé aux limites de vraisemblance", () => {
  const o = objectifSaisieSchema.parse({ quoi: "recruter", reussite: "une personne formée et autonome", delaiMois: 1 });
  assert.equal(verifierVraisemblance(o, F).ok, true);
});

test("un objectif choisi dans la liste de l'agent prend le premier thème de l'objectif pour indicateur", () => {
  const liste = reel.objectifsAgents.agents["RH_ORGANISATION"].objectifs;
  const roles = liste.find((x) => x.id === "rh-roles")!;
  const o = objectifSaisieSchema.parse({ quoi: "clarifier les rôles et les responsabilités", reussite: "chacun sait ce qu'il doit faire", delaiMois: 3, choix: roles.id });
  const e = enregistrerObjectif(o, reel.themes.filter((t) => t.agent === "RH_ORGANISATION"), new Date("2026-10-15T08:00:00Z"), roles.themes);
  assert.equal(e.indicateur?.code, "RH-01");
  assert.equal(e.choix, "rh-roles");
});

test("les objectifs proposés par agent existent pour la RH et la Comm, avec un exemple et des thèmes de l'agent", () => {
  for (const agent of ["RH_ORGANISATION", "COMM_CREATION"]) {
    const def = reel.objectifsAgents.agents[agent];
    assert.ok(def && def.objectifs.length >= 5, agent);
    // « Définir mon propre objectif » : une aide et des exemples propres à l'agent.
    assert.ok(def.personnel.aide && def.personnel.exemple && def.personnel.exempleReussite, `${agent} : objectif personnel`);
    for (const o of def.objectifs) {
      assert.ok(o.themes.every((c) => reel.themes.find((t) => t.code === c)?.agent === agent), `${o.id} : thèmes de l'agent`);
      // Une unité pour un objectif chiffré, une phrase de réussite en exemple pour tous ; jamais un chiffre à viser suggéré.
      assert.ok((o.mesure === "chiffre" ? !!o.unite : true) && !!o.exemple.reussite, `${o.id} : exemple`);
      assert.equal("valeur" in o.exemple, false, `${o.id} : aucun chiffre suggéré`);
    }
  }
  // Les deux parcours de la Comm (CLAUDE.md section 9) : améliorer l'existant, mettre en place.
  const groupes = new Set(reel.objectifsAgents.agents["COMM_CREATION"].objectifs.map((o) => o.groupe));
  assert.equal(groupes.size, 2);
});

// --- Doublons retirés et réponses déduites (décisions du propriétaire, 27 octobre) -----------------------

test("les doublons retirés n'existent plus au classeur, et les données conservées sont posées ; le mécanisme de retrait reste disponible", () => {
  const codes = (a: ReturnType<typeof assemblerQuestionnaire>) => new Set([...a.prealables, ...a.themes.flatMap((t) => t.questions)].map((q) => q.code));
  // Retirés du classeur le 27 octobre (décision du propriétaire), puis supprimés.
  for (const code of ["RH-41.04", "RH-41.05", "ACQ-09.04", "ACQ-22.08"]) assert.ok(!reel.donnees.some((d) => d.code === code), `${code} ne doit plus exister`);
  assert.deepEqual(reel.retraits.retraits, []);
  // RH-42.01 couvre RH-41.04 et RH-41.05 pour le dirigeant seul qui veut être aidé.
  const rh = assemblerQuestionnaire(reel, ctx("RH_ORGANISATION", { taille: "seul", reponses: { "RH-41.01": saisie("oui_dans_les_6_prochains_mois") } }));
  assert.ok(codes(rh).has("RH-42.01"));
  // ACQ-12.01 couvre ACQ-09.04 pour les profils rendez-vous avec devis.
  const acq = assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { profils: ["b2b"], reponses: { D05: saisie("oui"), D06: saisie("oui") } }));
  assert.ok(codes(acq).has("ACQ-12.01"));
  // Le mécanisme de retrait (data/retraits.json) retire une donnée du questionnaire et du compte des questions.
  const retire: EnsembleDonnees = { ...reel, retraits: { ...reel.retraits, retraits: [{ donnee: "ACQ-12.01", raison: "essai", conservee: "ACQ-12.02", decideLe: "2026-10-27" }] } };
  const avec = compterQuestions(reel, "ACQUISITION_CA", ["b2b"], "equipe_2_5");
  const sans = compterQuestions(retire, "ACQUISITION_CA", ["b2b"], "equipe_2_5");
  assert.equal(avec.total - sans.total, 1);
});

test("« Avez-vous un site internet ? » n'est posée que si « site internet » n'est pas coché dans les canaux", () => {
  const codes = (a: ReturnType<typeof assemblerQuestionnaire>) => new Set([...a.prealables, ...a.themes.flatMap((t) => t.questions)].map((q) => q.code));
  const sansCoche = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: { "ACQ-03.01": saisie(["bouche_a_oreille"]) } }));
  assert.ok(codes(sansCoche).has("COM-13.10"));
  assert.ok(!codes(sansCoche).has("COM-13.01"), "sans site, ses questions n'ont pas lieu d'être");
  const coche = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: { "ACQ-03.01": saisie(["bouche_a_oreille", "site_internet"]) } }));
  assert.ok(!codes(coche).has("COM-13.10"));
  // La réponse déduite ouvre les questions qui dépendent du site (D23 = oui).
  assert.ok(codes(coche).has("COM-13.01"));
  // Une réponse déjà donnée l'emporte tant que la question est posée (« site internet » non coché) : « non » reste « non ».
  const dejaNon = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: { "ACQ-03.01": saisie(["bouche_a_oreille"]), "COM-13.10": saisie("non") } }));
  assert.ok(codes(dejaNon).has("COM-13.10") && !codes(dejaNon).has("COM-13.01"));
  // « Site internet » coché ensuite : la question n'est plus posée, son ancien « non » ne compte plus (on ne peut ni le voir ni le
  // corriger) ; la réponse déduite « oui » ouvre les questions sur le site (vérification du 28 octobre, décision à confirmer).
  const nonPuisCoche = assemblerQuestionnaire(reel, ctx("COMM_CREATION", { reponses: { "ACQ-03.01": saisie(["site_internet"]), "COM-13.10": saisie("non") } }));
  assert.ok(!codes(nonPuisCoche).has("COM-13.10") && codes(nonPuisCoche).has("COM-13.01"));
});

// --- Modules métier (décision du propriétaire, 27 octobre) ------------------------------------------------------------------

test("une question de module métier n'est posée qu'aux métiers ou activités listés (« Autre » seul = activité par défaut)", () => {
  const codes = (a: ReturnType<typeof assemblerQuestionnaire>) => new Set([...a.prealables, ...a.themes.flatMap((t) => t.questions)].map((q) => q.code));
  const pour = (metierPrecis: string | null, sousVariantes: string[] = []) =>
    codes(assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { profils: ["b2b"], niveau: "approfondi", metier: { metierPrecis, sousVariantes } })));
  // Transport de personnes et coursiers.
  assert.ok(pour("vtc-et-taxi").has("ACQ-25.01"));
  assert.ok(!pour("transport-de-marchandises").has("ACQ-25.01"), "métier non listé");
  assert.ok(!codes(assemblerQuestionnaire(reel, ctx("ACQUISITION_CA", { profils: ["b2b"], niveau: "approfondi" }))).has("ACQ-25.01"), "sans métier connu : rien");
  // Vente de véhicules et de logements : la reprise et le financement (ACQ-28.03) ne concernent que les véhicules.
  assert.ok(pour("marchand-de-biens").has("ACQ-28.01"));
  assert.ok(!pour("marchand-de-biens").has("ACQ-28.03"));
  assert.ok(pour("vente-de-vehicules", ["premium"]).has("ACQ-28.03"));
  // Immobilier : par activité.
  assert.ok(pour("agence-immobiliere", ["transaction"]).has("ACQ-29.01"));
  assert.ok(!pour("agence-immobiliere", ["syndic"]).has("ACQ-29.01"));
  assert.ok(!pour("agence-immobiliere", ["gestion-locative"]).has("ACQ-29.01"));
  assert.ok(pour("agence-immobiliere", ["syndic", "transaction"]).has("ACQ-29.01"), "une activité listée parmi les cochées suffit");
  const autreSeul = metierDuCompte(reel.routage, { metierPrecis: "agence-immobiliere", sousVariantes: [] });
  assert.deepEqual(autreSeul.sousVariantes, ["transaction"]);
  assert.ok(pour(autreSeul.metierPrecis, autreSeul.sousVariantes).has("ACQ-29.01"));
  // Négoce : les 17 métiers de gros et de distribution.
  assert.ok(pour("grossiste-alimentaire").has("ACQ-27.02"));
  assert.ok(!pour("electricien").has("ACQ-27.02"));
  // Le module compte au choix du niveau seulement pour les métiers concernés.
  const avec = compterQuestions(reel, "ACQUISITION_CA", ["b2b"], "equipe_2_5", null, { metierPrecis: "vtc-et-taxi", sousVariantes: [] });
  const sans = compterQuestions(reel, "ACQUISITION_CA", ["b2b"], "equipe_2_5", null, { metierPrecis: "consultant", sousVariantes: [] });
  assert.equal(avec.total - sans.total, 4);
});

import { controlerDonnees } from "../src/lib/donnees/controle.ts";

test("une profession réglementée n'a aucun module métier : le contrôle refuse de lui réserver une donnée", () => {
  const e: EnsembleDonnees = { ...reel, donnees: reel.donnees.map((d) => (d.code === "ACQ-25.01" ? { ...d, metiers: ["avocat"] } : d)) };
  assert.ok(controlerDonnees(e).erreurs.some((m) => m.includes("ACQ-25.01") && m.includes("réglementée")));
});

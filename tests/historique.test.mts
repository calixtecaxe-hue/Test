// Historique et évolutions (vérification du 28 octobre). Les valeurs attendues sont posées à la main : mois écrits en clair,
// écarts calculés de tête (32 contre 40 : −8, soit −20 %), sans reprendre le code testé.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { assemblerQuestionnaire, donneesPrerepondues, equivalences } from "../src/lib/audit/assemblage.ts";
import { reponsesActives } from "../src/lib/audit/reponses-actives.ts";
import { decalerLignesDuMois, lignesDuMois, reglePeriode, texteDePeriode, champsTropLongs, type Mois } from "../src/lib/audit/periodes.ts";
import { calculerEvolution, controlerEvolution, type ContexteEvolution } from "../src/lib/moteur/evolution.ts";
import { phraseEvolution } from "../src/lib/audit/compte-rendu.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const mois = (annee: number, m: number): Mois => annee * 12 + m - 1;
const OCT_2026 = mois(2026, 10);
const exact = (valeur: number) => ({ genre: "exact" as const, valeur });
const valeurs = (v: Record<string, number | string | null>) => ({ genre: "valeurs" as const, valeurs: v });
const evolution = (id: string) => reel.evolutions.evolutions.find((e) => e.id === id)!;
const DOUZE = ["le_mois_dernier", ...Array.from({ length: 11 }, (_, k) => `il_y_a_${k + 2}_mois`)];

// Contexte d'un compte fictif : toutes les questions citées sont posées, réponses données en octobre 2026, entreprise de 10 ans.
function contexte(reponses: Reponses, o: Partial<ContexteEvolution> = {}): ContexteEvolution {
  return {
    reponses,
    ancrages: new Map(Object.keys(reponses).map((c) => [c, OCT_2026])),
    aujourdhui: OCT_2026,
    creation: mois(2016, 3),
    ancienneteMois: 127,
    donnees: new Map(reel.donnees.map((d) => [d.code, d])),
    equivalences: equivalences(reel.donnees, donneesPrerepondues(reel.prereponses)),
    posees: new Set(reel.donnees.map((d) => d.code)),
    lignesActuelles: () => null,
    nomDe: (c) => c,
    effectifActuel: 6,
    ...o,
  };
}

test("périodes : les formulations du classeur se lisent, les mois exacts s'écrivent", () => {
  assert.equal(texteDePeriode(reglePeriode("Période adaptée : depuis la création si moins de 3 mois"), OCT_2026, mois(2016, 3)), "Période : juillet à septembre 2026.");
  assert.equal(
    texteDePeriode(reglePeriode("Mêmes 3 mois, un an plus tôt (masquée avant 15 mois d'existence)"), OCT_2026, mois(2016, 3)),
    "Période : juillet à septembre 2025, les mêmes mois un an plus tôt.",
  );
  assert.equal(
    texteDePeriode(reglePeriode("12 mois précédents (masquée avant 24 mois d'existence)"), OCT_2026, mois(2016, 3)),
    "Période : octobre 2024 à septembre 2025, les 12 mois qui précèdent les 12 derniers.",
  );
  assert.equal(texteDePeriode(reglePeriode("3 mois, 6 mois plus tôt (masquée avant 9 mois d'existence)"), OCT_2026, null), "Période : janvier à mars 2026, 6 mois plus tôt.");
  assert.equal(texteDePeriode(reglePeriode("Il y a 12 mois (masquée avant 12 mois d'existence)"), OCT_2026, null), "Période : octobre 2025, il y a 12 mois.");
  assert.equal(texteDePeriode(reglePeriode("Aujourd'hui"), OCT_2026, null), null);
  // Entreprise créée en mai 2026 : « les 12 derniers mois » deviennent « depuis la création », jamais avant.
  assert.equal(
    texteDePeriode(reglePeriode("Période adaptée : depuis la création si moins de 12 mois"), OCT_2026, mois(2026, 5)),
    "Période : depuis la création de votre entreprise (mai 2026) jusqu'à septembre 2026, soit 5 mois.",
  );
  assert.equal(reglePeriode("Mêmes 3 mois, un an plus tôt (masquée avant 15 mois d'existence)").minimumMois, 15);
  assert.equal(reglePeriode("Formulation inventée").reconnue, false);
  for (const d of reel.donnees) assert.ok(reglePeriode(d.periode).reconnue, `${d.code} : ${d.periode}`);
});

test("tableau mois par mois : chaque ligne porte son mois, ceux d'avant la création ne sont pas posés", () => {
  const items = DOUZE.map((id, k) => ({ id, libelle: k === 0 ? "Le mois dernier" : `Il y a ${k + 1} mois` }));
  const m = lignesDuMois(items, 0, OCT_2026, mois(2026, 5))!;
  assert.equal(m.libelles.le_mois_dernier, "Septembre 2026");
  assert.equal(m.libelles.il_y_a_12_mois, "Octobre 2025");
  assert.deepEqual([...m.masquees].sort(), ["il_y_a_10_mois", "il_y_a_11_mois", "il_y_a_12_mois", "il_y_a_6_mois", "il_y_a_7_mois", "il_y_a_8_mois", "il_y_a_9_mois"].sort());
  // Mêmes mois un an plus tôt (ACQ-23.03) : « le mois dernier » est septembre 2025.
  assert.equal(lignesDuMois(items, 12, OCT_2026, null)!.libelles.le_mois_dernier, "Septembre 2025");
  // Deux lignes qui ne se suivent pas (ACQ-17.12) : le mois et l'ancien libellé.
  assert.equal(lignesDuMois([{ id: "il_y_a_6_mois", libelle: "Il y a 6 mois" }, { id: "il_y_a_12_mois", libelle: "Il y a 12 mois" }], 0, OCT_2026, null)!.libelles.il_y_a_6_mois, "Avril 2026 (il y a 6 mois)");
  // Réponse donnée en septembre, relue en octobre : chaque montant reste en face de son mois.
  const decale = decalerLignesDuMois({ "le_mois_dernier.ca": 10, "il_y_a_12_mois.ca": 99 }, 1, new Set(DOUZE));
  assert.deepEqual(decale, { "il_y_a_2_mois.ca": 10 });
  // Stock « sans vente depuis 3, 6, 12 mois » : une entreprise de 8 mois ne voit pas « depuis 12 mois ».
  assert.deepEqual([...champsTropLongs([{ id: "depuis_3_mois" }, { id: "depuis_6_mois" }, { id: "depuis_12_mois" }], 8)], ["depuis_12_mois"]);
});

test("ancienneté : une question sur le passé n'est posée qu'à une entreprise qui existait alors", () => {
  const poses = (agent: "ACQUISITION_CA" | "FINANCE_RENTABILITE", anciennete: number) => {
    const a = assemblerQuestionnaire(reel, { agent, profils: ["b2b"], taille: "equipe_2_5", niveau: "approfondi", reponses: { D02: { genre: "saisie", valeur: "oui" } }, ancienneteMois: anciennete });
    return new Set([...a.prealables, ...a.themes.flatMap((t) => t.questions)].map((q) => q.code));
  };
  // 8 / 9 mois : « 3 mois, six mois plus tôt » (ACQ-02.02).
  assert.ok(!poses("ACQUISITION_CA", 8).has("ACQ-02.02"));
  assert.ok(poses("ACQUISITION_CA", 9).has("ACQ-02.02"));
  // 14 / 15 mois : « les mêmes 3 mois, un an plus tôt » (ACQ-02.03, ACQ-11.02).
  assert.ok(!poses("ACQUISITION_CA", 14).has("ACQ-02.03") && !poses("ACQUISITION_CA", 14).has("ACQ-11.02"));
  assert.ok(poses("ACQUISITION_CA", 15).has("ACQ-02.03") && poses("ACQUISITION_CA", 15).has("ACQ-11.02"));
  // 12 / 13 mois : chiffre d'affaires des mêmes mois un an plus tôt (ses mois antérieurs à la création ne sont pas posés).
  assert.ok(!poses("ACQUISITION_CA", 12).has("ACQ-23.03"));
  assert.ok(poses("ACQUISITION_CA", 13).has("ACQ-23.03"));
  // 23 / 24 mois : les 12 mois précédents (ACQ-16.03, ACQ-23.12, FIN-18.06).
  assert.ok(!poses("ACQUISITION_CA", 23).has("ACQ-23.12"));
  assert.ok(poses("ACQUISITION_CA", 24).has("ACQ-23.12"));
  // 35, 36, 37 mois : aucune règle ne change à trois ans ; tout l'historique sur un an est posé dès 24 mois.
  const [a35, a36, a37] = [35, 36, 37].map((n) => poses("ACQUISITION_CA", n));
  assert.deepEqual([...a35].sort(), [...a36].sort());
  assert.deepEqual([...a36].sort(), [...a37].sort());
  // Le chiffre d'affaires de l'année précédente est demandé dès le niveau essentiel, et à la Finance (FIN-14.03).
  const fin = assemblerQuestionnaire(reel, { agent: "FINANCE_RENTABILITE", profils: ["b2b"], taille: "equipe_2_5", niveau: "essentiel", reponses: { D02: { genre: "saisie", valeur: "oui" } }, ancienneteMois: 36 });
  const codesFin = new Set(fin.themes.flatMap((t) => t.questions.map((q) => q.code)));
  assert.ok(codesFin.has("FIN-14.03") && codesFin.has("FIN-14.01") && codesFin.has("FIN-14.04") && codesFin.has("FIN-07.17"));
});

test("évolution établie : deux chiffres, leurs mois, l'écart et l'écart en %, sans jugement", () => {
  const r = calculerEvolution(evolution("demandes-12-mois"), contexte({ "ACQ-02.01": exact(32), "ACQ-02.03": exact(40), "ACQ-23.13": valeurs({ changement: "aucun_changement" }) }));
  assert.equal(r.statut, "etablie");
  assert.equal(r.ecart, -8);
  assert.equal(r.ecartRelatif, -20);
  assert.equal(r.actuel?.periode, "juillet à septembre 2026");
  assert.equal(r.passe?.periode, "juillet à septembre 2025");
  assert.equal(phraseEvolution(r), "32 (juillet à septembre 2026), contre 40 (juillet à septembre 2025). Écart : −8, soit −20 %.");
  // Progression, absence de variation.
  const hausse = calculerEvolution(evolution("demandes-12-mois"), contexte({ "ACQ-02.01": exact(50), "ACQ-02.03": exact(40), "ACQ-23.13": valeurs({ changement: "aucun_changement" }) }));
  assert.equal(hausse.ecartRelatif, 25);
  const egal = calculerEvolution(evolution("demandes-12-mois"), contexte({ "ACQ-02.01": exact(40), "ACQ-02.03": exact(40), "ACQ-23.13": valeurs({ changement: "aucun_changement" }) }));
  assert.equal(egal.ecart, 0);
  assert.match(phraseEvolution(egal)!, /Écart : aucun\.$/);
});

test("valeur de départ nulle, estimation, réponses manquantes : jamais de zéro inventé", () => {
  const zero = calculerEvolution(evolution("pertes-impayes-12-mois"), contexte({ "FIN-18.05": valeurs({ nombre_de_factures: 2, montant: 1200 }), "FIN-18.06": exact(0), "FIN-14.04": valeurs({ changement: "aucun_changement" }) }));
  assert.equal(zero.statut, "etablie");
  assert.equal(zero.ecart, 1200);
  assert.equal(zero.ecartRelatif, null);
  assert.ok(zero.notes.some((n) => /valeur de départ est nulle/.test(n)));
  // Fourchette : le milieu, marqué estimé.
  const estimee = calculerEvolution(evolution("nouveaux-clients-12-mois"), contexte({ "ACQ-11.01": exact(12), "ACQ-11.02": { genre: "estimation", min: 8, max: 12 }, "ACQ-23.13": valeurs({ changement: "aucun_changement" }) }));
  assert.equal(estimee.ecart, 2);
  assert.equal(estimee.ecartRelatif, 20);
  assert.equal(estimee.passe?.estimee, true);
  assert.ok(estimee.notes.some((n) => /estimation/.test(n)));
  // « Je ne sais pas », « je ne suis pas cette donnée », question sautée.
  assert.match(calculerEvolution(evolution("nouveaux-clients-12-mois"), contexte({ "ACQ-11.01": exact(12), "ACQ-11.02": { genre: "inconnu" } })).raison!, /je ne sais pas/);
  assert.match(calculerEvolution(evolution("nouveaux-clients-12-mois"), contexte({ "ACQ-11.01": exact(12), "ACQ-11.02": { genre: "non_suivi" } })).raison!, /je ne suis pas cette donnée/);
  assert.match(calculerEvolution(evolution("nouveaux-clients-12-mois"), contexte({ "ACQ-11.01": exact(12) })).raison!, /Il manque votre réponse/);
  // Chiffre d'affaires sur 12 mois : un mois vide n'est pas un zéro.
  const ca = Object.fromEntries(DOUZE.map((id) => [`${id}.chiffre_d_affaires`, 10000]));
  const avant = Object.fromEntries(DOUZE.map((id) => [`${id}.chiffre_d_affaires_un_an_plus_tot`, 8000]));
  const incomplet = calculerEvolution(evolution("chiffre-affaires-12-mois"), contexte({ "ACQ-23.01": valeurs({ ...ca, "il_y_a_3_mois.chiffre_d_affaires": null }), "ACQ-23.03": valeurs(avant) }));
  assert.equal(incomplet.statut, "non_etablie");
  assert.match(incomplet.raison!, /un mois .*juillet 2026/);
  const complet = calculerEvolution(evolution("chiffre-affaires-12-mois"), contexte({ "ACQ-23.01": valeurs(ca), "ACQ-23.03": valeurs(avant), "ACQ-23.13": valeurs({ changement: "aucun_changement" }) }));
  assert.equal(complet.ecart, 24000);
  assert.equal(complet.ecartRelatif, 25);
  assert.equal(complet.actuel?.periode, "octobre 2025 à septembre 2026");
  assert.equal(complet.passe?.periode, "octobre 2024 à septembre 2025");
  // Même mois, un an plus tôt.
  const dernier = calculerEvolution(evolution("chiffre-affaires-dernier-mois"), contexte({ "ACQ-23.01": valeurs(ca), "ACQ-23.03": valeurs(avant), "ACQ-23.13": valeurs({ changement: "aucun_changement" }) }));
  assert.equal(dernier.actuel?.periode, "septembre 2026");
  assert.equal(dernier.passe?.periode, "septembre 2025");
});

test("périodes non alignées, entreprise trop jeune, périmètre changé : la comparaison n'est pas faite", () => {
  const ev = evolution("demandes-12-mois");
  const decalees = calculerEvolution(ev, contexte({ "ACQ-02.01": exact(32), "ACQ-02.03": exact(40) }, { ancrages: new Map([["ACQ-02.01", OCT_2026], ["ACQ-02.03", mois(2026, 9)]]) }));
  assert.equal(decalees.statut, "non_etablie");
  assert.match(decalees.raison!, /mois différents \(septembre 2026, octobre 2026\)/);
  // Entreprise de 14 mois : ACQ-02.03 n'est pas posée, et l'écran dit pourquoi.
  const jeune = calculerEvolution(ev, contexte({ "ACQ-02.01": exact(32) }, { ancienneteMois: 14, creation: mois(2025, 8), posees: new Set(reel.donnees.map((d) => d.code).filter((c) => c !== "ACQ-02.03")) }));
  assert.match(jeune.raison!, /Votre entreprise a 14 mois .* au moins 15 mois/);
  // Mois du chiffre d'affaires antérieurs à la création.
  const ca = Object.fromEntries(DOUZE.map((id) => [`${id}.chiffre_d_affaires`, 10000]));
  const avant = Object.fromEntries(DOUZE.map((id) => [`${id}.chiffre_d_affaires_un_an_plus_tot`, 8000]));
  const creeeRecemment = calculerEvolution(evolution("chiffre-affaires-12-mois"), contexte({ "ACQ-23.01": valeurs(ca), "ACQ-23.03": valeurs(avant) }, { creation: mois(2025, 2), ancienneteMois: 20 }));
  assert.match(creeeRecemment.raison!, /créée en février 2025 : 4 des mois comparés précèdent sa création/);
  // Périmètre changé en mars 2026, entre les deux périodes : non comparable, les deux chiffres restent affichés.
  const change = calculerEvolution(ev, contexte({ "ACQ-02.01": exact(32), "ACQ-02.03": exact(40), "ACQ-23.13": valeurs({ changement: "ouverture_ou_fermeture_d_un_etablissemen", mois_du_changement_le_plus_recent: "2026-03" }) }));
  assert.equal(change.statut, "non_comparable");
  assert.equal(change.ecartRelatif, null);
  assert.match(change.raison!, /changé en mars 2026/);
  assert.ok(phraseEvolution(change)!.startsWith("32 (juillet à septembre 2026), contre 40"));
  // Changement avant les deux périodes : comparable.
  assert.equal(calculerEvolution(ev, contexte({ "ACQ-02.01": exact(32), "ACQ-02.03": exact(40), "ACQ-23.13": valeurs({ changement: "rachat_ou_vente_d_une_activite", mois_du_changement_le_plus_recent: "2024-01" }) })).statut, "etablie");
  // Périmètre non précisé : comparée, avec une précision.
  assert.ok(calculerEvolution(ev, contexte({ "ACQ-02.01": exact(32), "ACQ-02.03": exact(40) })).notes.some((n) => /périmètre de votre activité n'est pas précisé/.test(n)));
});

test("taux de marge : écart en points, pas en %", () => {
  const ca = (col: string, v: number) => Object.fromEntries(["le_mois_dernier", "il_y_a_2_mois", "il_y_a_3_mois"].map((id) => [`${id}.${col}`, v]));
  const postes = { "commissions_plateformes_apporteurs_d_aff.par_mois": 1000, "livraison_et_transport.par_mois": 1000, "frais_de_paiement_carte_plateformes.par_mois": 500, "consommables.par_mois": 500, "interim_extras_et_freelances.par_mois": 0, "autres.par_mois": 0 };
  const r = calculerEvolution(evolution("taux-de-marge-12-mois"), contexte({
    "FIN-14.01": valeurs(ca("chiffre_d_affaires", 10000)), // 30 000 € sur 3 mois
    "FIN-06.01": valeurs(postes), // 3 000 € par mois
    "FIN-08.01": exact(3000), // + 3 000 € d'achats : 6 000 € par mois, 18 000 € sur 3 mois → marge 40 %
    "FIN-14.03": valeurs(ca("chiffre_d_affaires_un_an_plus_tot", 9000)), // 27 000 €
    "FIN-06.03": exact(4500), // 13 500 € → marge 50 %
    "FIN-14.04": valeurs({ changement: "aucun_changement" }),
  }, { posees: new Set(reel.donnees.map((d) => d.code).filter((c) => c !== "FIN-08.02")) }));
  assert.equal(r.statut, "etablie");
  assert.equal(Math.round(r.actuel!.valeur * 10) / 10, 40);
  assert.equal(Math.round(r.passe!.valeur * 10) / 10, 50);
  assert.equal(r.ecart, -10);
  assert.equal(r.ecartRelatif, null);
  assert.match(phraseEvolution(r)!, /Écart : −10 points\.$/);
});

test("masse salariale : l'effectif d'il y a un an est affiché à côté", () => {
  const r = calculerEvolution(evolution("masse-salariale-12-mois"), contexte({ "FIN-07.01": exact(12000), "FIN-07.02": exact(9000), "FIN-07.17": exact(4), "FIN-14.04": valeurs({ changement: "aucun_changement" }) }));
  assert.equal(r.ecart, 3000);
  assert.ok(r.notes.includes("Effectif : 4 personnes il y a 12 mois, 6 aujourd'hui (vous compris)."));
  const sans = calculerEvolution(evolution("masse-salariale-12-mois"), contexte({ "FIN-07.01": exact(12000), "FIN-07.02": exact(9000), "FIN-14.04": valeurs({ changement: "aucun_changement" }) }));
  assert.ok(sans.notes.some((n) => /effectif d'il y a 12 mois n'est pas renseigné/.test(n)));
});

test("une réponse devenue inapplicable ne compte plus dans une évolution", () => {
  // Réponse donnée quand l'entreprise était déclarée ancienne, puis date de création corrigée : 14 mois.
  const reponses: Reponses = { "ACQ-02.01": exact(32), "ACQ-02.03": exact(40) };
  const actives = reponsesActives(reel, reponses, { profils: ["b2b"], taille: "equipe_2_5", ancienneteMois: 14 });
  assert.equal(actives["ACQ-02.03"], undefined);
  const r = calculerEvolution(evolution("demandes-12-mois"), contexte(actives, { ancienneteMois: 14, posees: new Set(reel.donnees.map((d) => d.code).filter((c) => c !== "ACQ-02.03")) }));
  assert.equal(r.statut, "non_etablie");
});

test("contrôle des données : une période mal décalée ou un masquage trop court est refusé", () => {
  assert.deepEqual(controlerDonnees(reel).erreurs, []);
  const periodes = (code: string) => reel.donnees.find((d) => d.code === code)?.periode ?? null;
  assert.deepEqual(controlerEvolution({ ...evolution("demandes-12-mois"), ecart: 6 }, periodes), ["demandes-12-mois : les deux périodes sont décalées de 12 mois, pas de 6."]);
  const fausse = { ...reel, donnees: reel.donnees.map((d) => (d.code === "ACQ-02.03" ? { ...d, periode: "Mêmes 3 mois, un an plus tôt (masquée avant 12 mois d'existence)" } : d)) };
  assert.ok(controlerDonnees(fausse).erreurs.some((e) => /ACQ-02.03 demande des mois passés .* avant 15 mois/.test(e)));
  const sansPeriode = { ...reel, donnees: reel.donnees.map((d) => (d.code === "FIN-37.01" ? { ...d, periode: null } : d)) };
  assert.ok(controlerDonnees(sansPeriode).erreurs.some((e) => /valeur-du-stock-12-mois : une donnée du côté actuel n'a pas de période/.test(e)));
});

// Corrections de la relecture du 28 octobre : doublons du cadrage (D13, D27), total sur plusieurs colonnes, bornes des nombres.
// Valeurs attendues posées à la main d'après le texte des questions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { assemblerQuestionnaire } from "../src/lib/audit/assemblage.ts";
import { validerReponse } from "../src/lib/audit/validation.ts";
import type { Reponses } from "../src/lib/audit/reponse.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const saisie = (valeur: string | string[]) => ({ genre: "saisie" as const, valeur });
const rh = (reponses: Reponses) => {
  const a = assemblerQuestionnaire(reel, { agent: "RH_ORGANISATION", profils: ["chantier"], taille: "structure_6_plus", niveau: "approfondi", ancienneteMois: 120, reponses });
  return { codes: new Set(a.themes.flatMap((t) => t.questions.map((q) => q.code))), cadrage: a.declencheursConcernes.map((d) => d.code), masques: a.themesMasques.map((t) => t.code) };
};

test("D27 : « la personne la plus chargée, est-ce vous ? » n'est plus posée deux fois ; RH-08.01 décide", () => {
  assert.ok(!rh({}).cadrage.includes("D27"), "plus de question de cadrage D27");
  assert.ok(!rh({ "RH-08.01": saisie("vous") }).codes.has("RH-08.02"), "la plus chargée, c'est vous : ses heures sont déjà demandées (RH-05)");
  const autre = rh({ "RH-08.01": saisie("une_personne_a_l_administratif") });
  assert.ok(autre.codes.has("RH-08.02") && autre.codes.has("RH-08.04"), "une autre personne : ses heures et ce qu'on pourrait lui retirer sont demandés");
});

test("D13 : le recrutement n'est plus demandé deux fois ; RH-28.01 ouvre ou ferme la partie recrutement", () => {
  assert.ok(!rh({}).cadrage.includes("D13"));
  const rien = rh({ "RH-28.01": saisie("ni_l_un_ni_l_autre") });
  assert.ok(rien.codes.has("RH-28.01"), "la question qui décide reste posée, même quand la partie est masquée");
  assert.ok(!rien.codes.has("RH-28.02") && rien.masques.includes("RH-29"), "ni l'un ni l'autre : la partie recrutement est masquée");
  const prevu = rh({ "RH-28.01": saisie("je_prevois_de_recruter") });
  assert.ok(prevu.codes.has("RH-28.03") && !prevu.codes.has("RH-28.04"), "recrutement prévu : délai demandé, pas les candidatures passées");
  const lesDeux = rh({ "RH-28.01": saisie("les_deux") });
  assert.ok(lesDeux.codes.has("RH-28.03") && lesDeux.codes.has("RH-28.04") && lesDeux.codes.has("RH-33.01"), "les deux : passé et futur sont demandés");
});

test("COM-12.01 : chaque colonne de répartition doit faire 100 %", () => {
  const deja = { "ACQ-03.01": saisie(["bouche_a_oreille", "site_internet"]) };
  const juste = { genre: "valeurs" as const, valeurs: { "bouche_a_oreille.part_des_demandes": 70, "site_internet.part_des_demandes": 30, "bouche_a_oreille.part_des_nouveaux_clients": 50, "site_internet.part_des_nouveaux_clients": 50 } };
  assert.equal(validerReponse(reel, "COM-12.01", juste, deja).ok, true);
  const faux = { genre: "valeurs" as const, valeurs: { ...juste.valeurs, "site_internet.part_des_nouveaux_clients": 30 } };
  const v = validerReponse(reel, "COM-12.01", faux, deja);
  assert.equal(v.ok, false);
  assert.match(!v.ok ? v.message : "", /Part des nouveaux clients : le total doit faire 100 \(il fait 80\)/);
});

test("bornes : un nombre de clients, d'heures ou de jours négatif est refusé ; le résultat de l'année peut être une perte", () => {
  assert.equal(validerReponse(reel, "ACQ-25.03", { genre: "exact", valeur: -2 }).ok, false, "courses échouées");
  assert.equal(validerReponse(reel, "ACQ-27.01", { genre: "exact", valeur: 120 }).ok, false, "part des commandes livrées à 120 %");
  assert.equal(validerReponse(reel, "ACQ-06.01", { genre: "valeurs", valeurs: { avis_au_total: -5 } }).ok, false, "nombre d'avis négatif");
  assert.equal(validerReponse(reel, "FIN-05.04", { genre: "exact", valeur: -12000 }).ok, true, "une perte s'écrit avec un signe moins");
  assert.equal(validerReponse(reel, "FIN-11.01", { genre: "exact", valeur: -800 }).ok, true, "un compte à découvert compte en négatif");
});

test("choix complétés : on peut répondre « Les deux » ou « Aucun changement récent »", () => {
  assert.equal(validerReponse(reel, "RH-11.02", saisie("les_deux")).ok, true);
  assert.equal(validerReponse(reel, "RH-39.01", saisie("aucun_changement_recent")).ok, true);
  assert.equal(validerReponse(reel, "ACQ-08.04", saisie("aucun_je_reponds_aussi_vite_partout")).ok, true);
});

// Tests des règles de paiement (src/lib/paiement/etat.ts) : montants, mode de paiement, accès selon
// l'état de l'abonnement et traduction des événements du fournisseur. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { accesOuvert, intervalleFacturation, miseAJourDepuisEvenement, modePaiement, montantCentimesHT } from "../src/lib/paiement/etat.ts";

const MAINTENANT = new Date("2026-10-15T10:00:00Z");

test("le montant facturé est le prix du palier, avec la remise de 15 % à l'année", () => {
  assert.equal(montantCentimesHT(2, "mensuel"), 5999);
  assert.equal(montantCentimesHT(3, "mensuel"), 7999);
  assert.equal(montantCentimesHT(4, "mensuel"), 9999);
  assert.equal(montantCentimesHT(3, "annuel"), Math.round((7999 * 12 * 85) / 100));
  assert.ok((montantCentimesHT(4, "annuel") as number) < 9999 * 12);
  // Pas d'offre à 1 agent, ni de palier inconnu.
  assert.equal(montantCentimesHT(1, "mensuel"), null);
  assert.equal(montantCentimesHT(5, "annuel"), null);
  assert.equal(intervalleFacturation("mensuel"), "month");
  assert.equal(intervalleFacturation("annuel"), "year");
});

test("le mode de paiement : réel avec une clé, démonstration en développement, jamais gratuit par défaut en production", () => {
  assert.equal(modePaiement({ STRIPE_SECRET_KEY: "sk_test_x", NODE_ENV: "production" }), "stripe");
  assert.equal(modePaiement({ NODE_ENV: "development" }), "demonstration");
  assert.equal(modePaiement({ NODE_ENV: "production" }), "indisponible");
  assert.equal(modePaiement({ NODE_ENV: "production", PAIEMENT_MODE: "demonstration" }), "demonstration");
  // La démonstration demandée explicitement l'emporte sur une clé (essais sans toucher au réel).
  assert.equal(modePaiement({ STRIPE_SECRET_KEY: "sk_test_x", PAIEMENT_MODE: "demonstration" }), "demonstration");
  assert.equal(modePaiement({ STRIPE_SECRET_KEY: "", NODE_ENV: "production" }), "indisponible");
});

test("l'accès aux agents suit l'abonnement : ouvert tant qu'il est actif, puis jusqu'à la fin de la période payée", () => {
  const futur = new Date("2026-11-01T00:00:00Z");
  const passe = new Date("2026-10-01T00:00:00Z");
  assert.equal(accesOuvert({ statut: "ACTIF", finPeriodeLe: null }, MAINTENANT), true);
  assert.equal(accesOuvert({ statut: "EN_ATTENTE_PAIEMENT", finPeriodeLe: futur }, MAINTENANT), false);
  assert.equal(accesOuvert({ statut: "IMPAYE", finPeriodeLe: futur }, MAINTENANT), true);
  assert.equal(accesOuvert({ statut: "IMPAYE", finPeriodeLe: passe }, MAINTENANT), false);
  assert.equal(accesOuvert({ statut: "IMPAYE", finPeriodeLe: null }, MAINTENANT), false);
  assert.equal(accesOuvert({ statut: "RESILIE", finPeriodeLe: futur }, MAINTENANT), true);
  assert.equal(accesOuvert({ statut: "RESILIE", finPeriodeLe: passe }, MAINTENANT), false);
});

const evt = (type: string, objet: unknown) => ({ type, data: { object: objet } });

test("un paiement terminé active l'abonnement du compte désigné par nous, jamais un autre", () => {
  const r = miseAJourDepuisEvenement(
    evt("checkout.session.completed", { mode: "subscription", payment_status: "paid", client_reference_id: "user-1", customer: "cus_1", subscription: "sub_1" })
  );
  assert.deepEqual(r, { cible: { userId: "user-1" }, maj: { statut: "ACTIF", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" } });
  // Identifiant du compte posé dans les métadonnées.
  assert.equal(miseAJourDepuisEvenement(evt("checkout.session.completed", { mode: "subscription", payment_status: "paid", metadata: { userId: "user-2" }, customer: { id: "cus_2" }, subscription: { id: "sub_2" } }))?.cible.userId, "user-2");
});

test("une session non payée, hors abonnement ou sans compte n'active rien", () => {
  assert.equal(miseAJourDepuisEvenement(evt("checkout.session.completed", { mode: "subscription", payment_status: "unpaid", client_reference_id: "u" })), null);
  assert.equal(miseAJourDepuisEvenement(evt("checkout.session.completed", { mode: "payment", payment_status: "paid", client_reference_id: "u" })), null);
  assert.equal(miseAJourDepuisEvenement(evt("checkout.session.completed", { mode: "subscription", payment_status: "paid" })), null);
});

test("une facture payée prolonge la période, une facture échouée passe l'abonnement en impayé", () => {
  const fin = 1_800_000_000;
  const ancienne = miseAJourDepuisEvenement(evt("invoice.paid", { subscription: "sub_1", lines: { data: [{ period: { end: fin } }] } }));
  assert.deepEqual(ancienne, { cible: { stripeSubscriptionId: "sub_1" }, maj: { statut: "ACTIF", finPeriodeLe: new Date(fin * 1000) } });
  // Version récente de l'API : l'abonnement est dans parent.subscription_details.
  const recente = miseAJourDepuisEvenement(evt("invoice.paid", { parent: { subscription_details: { subscription: "sub_9" } }, lines: { data: [{ period: { end: fin } }] } }));
  assert.equal(recente?.cible.stripeSubscriptionId, "sub_9");
  assert.deepEqual(miseAJourDepuisEvenement(evt("invoice.payment_failed", { subscription: "sub_1" })), { cible: { stripeSubscriptionId: "sub_1" }, maj: { statut: "IMPAYE" } });
  assert.equal(miseAJourDepuisEvenement(evt("invoice.paid", { lines: { data: [] } })), null);
});

test("les changements d'abonnement chez le fournisseur sont traduits dans nos statuts", () => {
  const fin = 1_800_000_000;
  const maj = (status: string) => miseAJourDepuisEvenement(evt("customer.subscription.updated", { id: "sub_1", status, items: { data: [{ current_period_end: fin }] } }));
  assert.equal(maj("active")?.maj.statut, "ACTIF");
  assert.equal(maj("trialing")?.maj.statut, "ACTIF");
  assert.equal(maj("past_due")?.maj.statut, "IMPAYE");
  assert.equal(maj("unpaid")?.maj.statut, "IMPAYE");
  assert.equal(maj("canceled")?.maj.statut, "RESILIE");
  assert.equal(maj("incomplete")?.maj.statut, "EN_ATTENTE_PAIEMENT");
  assert.equal(maj("active")?.maj.finPeriodeLe?.getTime(), fin * 1000);
  assert.equal(maj("statut-inconnu"), null);
  assert.equal(miseAJourDepuisEvenement(evt("customer.subscription.deleted", { id: "sub_1", status: "canceled" }))?.maj.statut, "RESILIE");
});

test("un événement sans effet sur l'abonnement est ignoré", () => {
  assert.equal(miseAJourDepuisEvenement(evt("charge.succeeded", { id: "ch_1" })), null);
  assert.equal(miseAJourDepuisEvenement(evt("customer.created", {})), null);
  assert.equal(miseAJourDepuisEvenement(evt("customer.subscription.updated", {})), null);
});

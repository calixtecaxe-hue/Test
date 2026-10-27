import { test } from "node:test";
import assert from "node:assert/strict";
import { DUREE_VALIDITE_MS, MESSAGE_LIEN, courrielReinitialisation, empreinteDe, etatDemande, jetonBienForme, nouveauJeton } from "../src/lib/mot-de-passe/reinitialisation.ts";
import { modeEmail } from "../src/lib/email/mode.ts";
import { schemaMotDePasse } from "../src/lib/validation/inscription-schema.ts";

test("un jeton neuf est bien formé et la base n'en garde que l'empreinte", () => {
  const a = nouveauJeton();
  const b = nouveauJeton();
  assert.ok(jetonBienForme(a.jeton));
  assert.notEqual(a.jeton, b.jeton);
  assert.equal(a.empreinte, empreinteDe(a.jeton));
  assert.match(a.empreinte, /^[0-9a-f]{64}$/);
  assert.ok(!a.empreinte.includes(a.jeton));
});

test("une chaîne qui ne peut pas être un jeton est refusée sans lecture en base", () => {
  for (const x of [undefined, null, 42, "", "abc", "a".repeat(44), `${"a".repeat(42)}!`, ["x"]]) assert.equal(jetonBienForme(x), false);
});

test("état d'une demande : valide une heure, une seule fois", () => {
  const t0 = new Date("2026-10-27T10:00:00Z");
  const expireLe = new Date(t0.getTime() + DUREE_VALIDITE_MS);
  assert.equal(etatDemande(null, t0), "inconnue");
  assert.equal(etatDemande({ expireLe, utiliseeLe: null }, t0), "valide");
  assert.equal(etatDemande({ expireLe, utiliseeLe: null }, new Date(expireLe.getTime() - 1)), "valide");
  assert.equal(etatDemande({ expireLe, utiliseeLe: null }, expireLe), "expiree");
  assert.equal(etatDemande({ expireLe, utiliseeLe: t0 }, t0), "utilisee");
  for (const m of Object.values(MESSAGE_LIEN)) assert.doesNotMatch(m, /!/);
});

test("le message contient le lien, en texte et en HTML échappé", () => {
  const lien = "https://caxe.example/nouveau-mot-de-passe?jeton=abc&x=<y>";
  const c = courrielReinitialisation(lien);
  assert.ok(c.texte.includes(lien));
  assert.ok(c.html.includes("jeton=abc&amp;x=&lt;y&gt;"));
  assert.ok(!c.html.includes("<y>"));
  assert.match(c.texte, /une heure/);
  assert.doesNotMatch(c.texte + c.sujet, /!/);
});

test("mode d'envoi : SMTP s'il est configuré, démonstration hors production, rien en production sans SMTP", () => {
  assert.equal(modeEmail({ SMTP_HOST: "smtp.exemple.fr", NODE_ENV: "production" }), "smtp");
  assert.equal(modeEmail({ NODE_ENV: "development" }), "demonstration");
  assert.equal(modeEmail({ NODE_ENV: "production" }), "indisponible");
  assert.equal(modeEmail({ NODE_ENV: "production", EMAIL_MODE: "demonstration" }), "demonstration");
});

test("le nouveau mot de passe suit la règle de l'inscription", () => {
  assert.equal(schemaMotDePasse.safeParse("court").success, false);
  assert.equal(schemaMotDePasse.safeParse("assez-long-1").success, true);
  assert.equal(schemaMotDePasse.safeParse("é".repeat(40)).success, false);
});

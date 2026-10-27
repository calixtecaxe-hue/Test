// Paiement réel avec Stripe (serveur uniquement : la clé reste dans l'environnement). Le prix est
// toujours recalculé ici d'après l'abonnement enregistré, jamais lu dans la requête du navigateur.

import Stripe from "stripe";
import { intervalleFacturation, montantCentimesHT, nomProduit, type Periode } from "./etat.ts";
import type { Facturation } from "./tva.ts";
import { adresseSite } from "../adresse-site.ts";

let client: Stripe | null = null;
export function stripe(): Stripe {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error("STRIPE_SECRET_KEY n'est pas définie.");
  // Client HTTP « fetch » : il passe par un éventuel relais réseau (NODE_USE_ENV_PROXY) et marche partout.
  client ??= new Stripe(cle, { httpClient: Stripe.createFetchHttpClient() });
  return client;
}

export { adresseSite };

// Client Stripe du compte, créé au premier paiement avec le nom de l'entreprise et son numéro de TVA,
// puis tenu à jour : ce sont eux que Stripe reprend sur la facture.
export async function preparerClient(o: { userId: string; email: string; facturation: Facturation; clientStripe: string | null }): Promise<string> {
  const { raisonSociale, numeroTva } = o.facturation;
  if (!o.clientStripe) {
    const c = await stripe().customers.create({
      email: o.email,
      ...(raisonSociale ? { name: raisonSociale } : {}),
      metadata: { userId: o.userId },
      ...(numeroTva ? { tax_id_data: [{ type: "eu_vat" as const, value: numeroTva }] } : {}),
    });
    return c.id;
  }
  await synchroniserFacturation(o.clientStripe, o.facturation);
  return o.clientStripe;
}

// Met à jour le nom et le numéro de TVA d'un client existant : l'ancien numéro est remplacé.
export async function synchroniserFacturation(clientStripe: string, f: Facturation): Promise<void> {
  await stripe().customers.update(clientStripe, { name: f.raisonSociale ?? "" });
  const anciens = await stripe().customers.listTaxIds(clientStripe, { limit: 20 });
  for (const t of anciens.data) {
    if (t.type === "eu_vat" && t.value !== f.numeroTva) await stripe().customers.deleteTaxId(clientStripe, t.id);
  }
  if (f.numeroTva && !anciens.data.some((t) => t.type === "eu_vat" && t.value === f.numeroTva)) {
    await stripe().customers.createTaxId(clientStripe, { type: "eu_vat", value: f.numeroTva });
  }
}

export async function creerSessionPaiement(o: { userId: string; nombreAgents: number; periode: Periode; clientStripe: string }): Promise<string> {
  const montant = montantCentimesHT(o.nombreAgents, o.periode);
  if (montant === null) throw new Error("Formule inconnue.");
  const site = adresseSite();
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    locale: "fr",
    client_reference_id: o.userId,
    metadata: { userId: o.userId },
    customer: o.clientStripe,
    // Facturation professionnelle : adresse de facturation, et possibilité d'ajouter ou de corriger le
    // nom de l'entreprise et le numéro de TVA sur la page de paiement elle-même.
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: montant,
          // Prix hors taxes : la TVA s'ajoute si le calcul automatique de Stripe est activé.
          tax_behavior: "exclusive",
          recurring: { interval: intervalleFacturation(o.periode) },
          product_data: { name: nomProduit(o.nombreAgents, o.periode) },
        },
      },
    ],
    automatic_tax: { enabled: process.env.STRIPE_TAX_AUTOMATIQUE === "1" },
    // « Managed Payments » (Stripe vendeur officiel, TVA gérée par Stripe) est actif par défaut sur le compte :
    // décision du propriétaire en attente. D'ici là, CAXE facture elle-même, comme le reste du parcours le suppose.
    managed_payments: { enabled: false },
    subscription_data: { metadata: { userId: o.userId } },
    success_url: `${site}/paiement/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/paiement?annule=1`,
  });
  if (!session.url) throw new Error("Stripe n'a pas renvoyé d'adresse de paiement.");
  return session.url;
}

// Relit la session côté Stripe : on n'active jamais un abonnement sur la seule foi de l'adresse de retour.
export async function lireSession(sessionId: string) {
  const s = await stripe().checkout.sessions.retrieve(sessionId);
  return {
    userId: s.client_reference_id,
    paye: s.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required"),
    customer: typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
    subscription: typeof s.subscription === "string" ? s.subscription : (s.subscription?.id ?? null),
  };
}

export async function creerSessionPortail(clientStripe: string): Promise<string> {
  const s = await stripe().billingPortal.sessions.create({ customer: clientStripe, return_url: `${adresseSite()}/compte` });
  return s.url;
}

// Change la formule d'un abonnement en cours : le nouveau prix remplace l'ancien, le prorata est facturé ou crédité
// tout de suite. Renvoie la fin de la période payée selon Stripe. Le montant est recalculé ici, jamais lu dans la requête.
export async function changerFormuleStripe(o: { subscriptionId: string; nombreAgents: number; periode: Periode }): Promise<Date | null> {
  const montant = montantCentimesHT(o.nombreAgents, o.periode);
  if (montant === null) throw new Error("Formule inconnue.");
  const abonnement = await stripe().subscriptions.retrieve(o.subscriptionId);
  const ligne = abonnement.items.data[0];
  if (!ligne) throw new Error("Abonnement sans ligne de facturation.");
  const produit = typeof ligne.price.product === "string" ? ligne.price.product : ligne.price.product.id;
  await stripe().products.update(produit, { name: nomProduit(o.nombreAgents, o.periode) });
  const maj = await stripe().subscriptions.update(o.subscriptionId, {
    items: [{ id: ligne.id, price_data: { currency: "eur", product: produit, unit_amount: montant, tax_behavior: "exclusive", recurring: { interval: intervalleFacturation(o.periode) } } }],
    proration_behavior: "create_prorations",
    // Si le prélèvement échoue, rien ne change : on ne laisse pas une formule à moitié appliquée.
    payment_behavior: "error_if_incomplete",
  });
  const fin = maj.items.data[0]?.current_period_end;
  return typeof fin === "number" ? new Date(fin * 1000) : null;
}

// Programme ou annule l'arrêt de l'abonnement à la fin de la période payée.
export async function programmerResiliationStripe(subscriptionId: string, resilier: boolean): Promise<Date | null> {
  const maj = await stripe().subscriptions.update(subscriptionId, { cancel_at_period_end: resilier });
  const fin = maj.items.data[0]?.current_period_end;
  return typeof fin === "number" ? new Date(fin * 1000) : null;
}

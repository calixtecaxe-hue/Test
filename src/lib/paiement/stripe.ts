// Paiement réel avec Stripe (serveur uniquement : la clé reste dans l'environnement). Le prix est
// toujours recalculé ici d'après l'abonnement enregistré, jamais lu dans la requête du navigateur.

import Stripe from "stripe";
import { intervalleFacturation, montantCentimesHT, type Periode } from "./etat.ts";

let client: Stripe | null = null;
export function stripe(): Stripe {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error("STRIPE_SECRET_KEY n'est pas définie.");
  client ??= new Stripe(cle);
  return client;
}

export function adresseSite(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function creerSessionPaiement(o: { userId: string; email: string; nombreAgents: number; periode: Periode; clientStripe?: string | null }): Promise<string> {
  const montant = montantCentimesHT(o.nombreAgents, o.periode);
  if (montant === null) throw new Error("Formule inconnue.");
  const site = adresseSite();
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    locale: "fr",
    client_reference_id: o.userId,
    metadata: { userId: o.userId },
    ...(o.clientStripe ? { customer: o.clientStripe } : { customer_email: o.email }),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: montant,
          // Prix hors taxes : la TVA s'ajoute si le calcul automatique de Stripe est activé.
          tax_behavior: "exclusive",
          recurring: { interval: intervalleFacturation(o.periode) },
          product_data: { name: `CAXE, ${o.nombreAgents} agents, facturation ${o.periode === "annuel" ? "annuelle" : "mensuelle"}` },
        },
      },
    ],
    automatic_tax: { enabled: process.env.STRIPE_TAX_AUTOMATIQUE === "1" },
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

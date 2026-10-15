// États d'un abonnement et règles de paiement (CLAUDE.md section 10). Fonctions pures : les prix
// viennent de offres.ts, rien n'est inventé ici. Se teste directement avec Node.

import { OFFRES, prixAnnuelCentimesHT } from "../offres.ts";

export type Periode = "mensuel" | "annuel";
export type StatutAbonnement = "EN_ATTENTE_PAIEMENT" | "ACTIF" | "IMPAYE" | "RESILIE";

// Montant facturé à chaque échéance, en centimes hors taxes : le mensuel ou l'annuel avec sa remise.
export function montantCentimesHT(nombreAgents: number, periode: Periode): number | null {
  const offre = OFFRES.find((o) => o.nombreAgents === nombreAgents);
  if (!offre) return null;
  return periode === "annuel" ? prixAnnuelCentimesHT(offre.prixMensuelCentimesHT) : offre.prixMensuelCentimesHT;
}

export function intervalleFacturation(periode: Periode): "month" | "year" {
  return periode === "annuel" ? "year" : "month";
}

// --- Mode de paiement ---------------------------------------------------------------------

// stripe : paiement réel. demonstration : aucun paiement n'est pris, l'abonnement s'active à la
// main depuis un écran qui le dit. indisponible : ni clé ni démonstration autorisée, jamais d'accès
// gratuit par défaut en production.
export type ModePaiement = "stripe" | "demonstration" | "indisponible";

export function modePaiement(env: { STRIPE_SECRET_KEY?: string; PAIEMENT_MODE?: string; NODE_ENV?: string }): ModePaiement {
  if (env.PAIEMENT_MODE === "demonstration") return "demonstration";
  if (env.STRIPE_SECRET_KEY) return "stripe";
  return env.NODE_ENV !== "production" ? "demonstration" : "indisponible";
}

// --- Accès --------------------------------------------------------------------------------

// L'accès aux agents suit l'abonnement : ouvert tant qu'il est actif, et, après un impayé ou une
// résiliation, jusqu'à la fin de la période déjà payée.
export function accesOuvert(a: { statut: StatutAbonnement; finPeriodeLe: Date | null }, maintenant: Date): boolean {
  if (a.statut === "ACTIF") return true;
  if (a.statut === "EN_ATTENTE_PAIEMENT") return false;
  return a.finPeriodeLe !== null && a.finPeriodeLe.getTime() > maintenant.getTime();
}

// --- Événements du fournisseur de paiement -------------------------------------------------

export type MiseAJourAbonnement = {
  statut?: StatutAbonnement;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  finPeriodeLe?: Date;
  activeLe?: Date;
};

// Comment retrouver l'abonnement concerné : par son identifiant chez le fournisseur, ou, au premier
// paiement, par le compte (identifiant posé par nous à la création de la session).
export type CibleEvenement = { userId?: string; stripeSubscriptionId?: string };

type Brut = Record<string, unknown>;
const objet = (v: unknown): Brut => (v && typeof v === "object" ? (v as Brut) : {});
const texte = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);
const identifiant = (v: unknown): string | undefined => texte(v) ?? texte(objet(v).id);
const dateDepuisSecondes = (v: unknown): Date | undefined => (typeof v === "number" && Number.isFinite(v) ? new Date(v * 1000) : undefined);

const STATUTS_FOURNISSEUR: Record<string, StatutAbonnement> = {
  active: "ACTIF",
  trialing: "ACTIF",
  past_due: "IMPAYE",
  unpaid: "IMPAYE",
  canceled: "RESILIE",
  incomplete: "EN_ATTENTE_PAIEMENT",
  incomplete_expired: "RESILIE",
};

// Traduit un événement Stripe en mise à jour de notre abonnement ; null pour un événement sans effet.
export function miseAJourDepuisEvenement(evenement: { type: string; data: { object: unknown } }): { cible: CibleEvenement; maj: MiseAJourAbonnement } | null {
  const o = objet(evenement.data.object);
  switch (evenement.type) {
    case "checkout.session.completed": {
      const paye = o.payment_status === "paid" || o.payment_status === "no_payment_required";
      const userId = texte(o.client_reference_id) ?? texte(objet(o.metadata).userId);
      if (o.mode !== "subscription" || !paye || !userId) return null;
      return {
        cible: { userId },
        maj: { statut: "ACTIF", stripeCustomerId: identifiant(o.customer), stripeSubscriptionId: identifiant(o.subscription) },
      };
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      // Selon la version de l'API, l'abonnement est sur la facture ou dans parent.subscription_details.
      const abonnement = identifiant(o.subscription) ?? identifiant(objet(objet(o.parent).subscription_details).subscription);
      if (!abonnement) return null;
      if (evenement.type === "invoice.payment_failed") return { cible: { stripeSubscriptionId: abonnement }, maj: { statut: "IMPAYE" } };
      const lignes = objet(o.lines).data;
      const fin = Array.isArray(lignes) ? dateDepuisSecondes(objet(objet(lignes[0]).period).end) : undefined;
      return { cible: { stripeSubscriptionId: abonnement }, maj: { statut: "ACTIF", ...(fin ? { finPeriodeLe: fin } : {}) } };
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const id = texte(o.id);
      if (!id) return null;
      const items = objet(o.items).data;
      const fin = Array.isArray(items) ? dateDepuisSecondes(objet(items[0]).current_period_end) : undefined;
      const statut = evenement.type === "customer.subscription.deleted" ? "RESILIE" : STATUTS_FOURNISSEUR[String(o.status)];
      if (!statut) return null;
      return { cible: { stripeSubscriptionId: id }, maj: { statut, ...(fin ? { finPeriodeLe: fin } : {}) } };
    }
    default:
      return null;
  }
}

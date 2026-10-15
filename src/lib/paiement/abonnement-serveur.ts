// Abonnement du compte côté serveur : lecture, activation et application des événements de paiement.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { accesOuvert, type CibleEvenement, type MiseAJourAbonnement } from "./etat";

export async function abonnementDuCompte(userId: string) {
  return prisma.abonnement.findUnique({ where: { userId } });
}

// Le compte a-t-il un abonnement qui ouvre les agents ?
export async function abonnementOuvert(userId: string): Promise<boolean> {
  const a = await abonnementDuCompte(userId);
  return a !== null && accesOuvert(a, new Date());
}

// Espace abonné : connecté, avec une formule choisie et payée. Sinon on emmène le dirigeant là où
// il peut régler la situation, au lieu d'afficher une erreur.
export async function exigerEspaceAbonne(depuis: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/connexion?depuis=${encodeURIComponent(depuis)}`);
  const userId = session.user.id;
  const [utilisateur, abonnement] = await Promise.all([prisma.user.findUnique({ where: { id: userId } }), abonnementDuCompte(userId)]);
  if (!utilisateur) redirect("/connexion");
  if (!abonnement) redirect("/offres");
  if (!accesOuvert(abonnement, new Date())) redirect("/paiement");
  return { userId, utilisateur, abonnement };
}

// Applique une mise à jour de paiement à l'abonnement visé. Renvoie false si aucun abonnement ne correspond.
export async function appliquerMiseAJour(cible: CibleEvenement, maj: MiseAJourAbonnement): Promise<boolean> {
  const where = cible.stripeSubscriptionId ? { stripeSubscriptionId: cible.stripeSubscriptionId } : cible.userId ? { userId: cible.userId } : null;
  if (!where) return false;
  const existant = await prisma.abonnement.findUnique({ where });
  if (!existant) return false;
  await prisma.abonnement.update({
    where: { id: existant.id },
    data: {
      ...maj,
      fournisseur: maj.stripeSubscriptionId || maj.stripeCustomerId ? "stripe" : undefined,
      // Première activation : on garde la date du premier paiement.
      activeLe: maj.statut === "ACTIF" && !existant.activeLe ? (maj.activeLe ?? new Date()) : undefined,
    },
  });
  return true;
}

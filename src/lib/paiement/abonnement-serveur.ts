// Abonnement du compte côté serveur : lecture, activation et application des événements de paiement.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aSonMetier, estComplet, type UtilisateurComplet } from "@/lib/compte";
import { accesOuvert, type CibleEvenement, type MiseAJourAbonnement } from "./etat";

export async function abonnementDuCompte(userId: string) {
  return prisma.abonnement.findUnique({ where: { userId } });
}

// Le compte a-t-il un abonnement qui ouvre les agents ?
export async function abonnementOuvert(userId: string): Promise<boolean> {
  const a = await abonnementDuCompte(userId);
  return a !== null && accesOuvert(a, new Date());
}

// Espace abonné : connecté, avec son métier, une formule choisie et payée, et son dossier d'entreprise. Sinon
// on emmène le dirigeant à l'étape du parcours qui lui manque, au lieu d'afficher une erreur :
// métier → formule → paiement → dossier d'entreprise (après le paiement, dans l'application).
export async function exigerEspaceAbonne(depuis: string): Promise<{ userId: string; utilisateur: UtilisateurComplet; abonnement: NonNullable<Awaited<ReturnType<typeof abonnementDuCompte>>> }> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/connexion?depuis=${encodeURIComponent(depuis)}`);
  const userId = session.user.id;
  const [utilisateur, abonnement] = await Promise.all([prisma.user.findUnique({ where: { id: userId } }), abonnementDuCompte(userId)]);
  if (!utilisateur) redirect("/connexion");
  if (!aSonMetier(utilisateur)) redirect("/inscription/metier");
  if (!abonnement) redirect("/formule");
  if (!accesOuvert(abonnement, new Date())) redirect("/paiement");
  if (!estComplet(utilisateur)) redirect("/bienvenue");
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

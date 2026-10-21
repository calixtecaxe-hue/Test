import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { appliquerMiseAJour } from "@/lib/paiement/abonnement-serveur";
import { modePaiement } from "@/lib/paiement/etat";
import { lireSession } from "@/lib/paiement/stripe";
import { ActualisationAuto } from "./actualisation-auto";

export const metadata: Metadata = { title: "Paiement reçu — CAXE" };

// Retour de la page de paiement. On relit la session chez le fournisseur avant d'activer : l'adresse
// de retour seule ne prouve rien. L'événement envoyé par le fournisseur confirme ensuite la même chose.
export default async function SuccesPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?depuis=/paiement");
  if (modePaiement(process.env) !== "stripe" || !sessionId) redirect("/paiement");

  let verifie = false;
  try {
    const s = await lireSession(sessionId);
    if (s.paye && s.userId === session.user.id) {
      verifie = await appliquerMiseAJour({ userId: session.user.id }, { statut: "ACTIF", stripeCustomerId: s.customer ?? undefined, stripeSubscriptionId: s.subscription ?? undefined });
    }
  } catch {
    verifie = false;
  }
  if (verifie) redirect("/bienvenue");

  // Paiement pas encore confirmé (3D Secure, prélèvement…) : la page se rafraîchit seule, puis propose de reprendre le paiement.
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5 px-6 py-16">
      <ActualisationAuto sessionId={sessionId} />
      <h1 className="text-3xl">Confirmation en cours</h1>
      <p className="text-[var(--text-muted)]">
        Nous attendons la confirmation de votre paiement par la banque. Cela prend en général quelques instants : cette page se met à jour seule. Vous n&apos;avez rien à refaire.
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={`/paiement/succes?session_id=${encodeURIComponent(sessionId)}`} className="rounded-[4px] border border-[var(--line)] px-4 py-2.5 hover:border-[var(--blue-1)]">
          Actualiser
        </Link>
        <Link href="/paiement" className="px-1 py-2.5 text-[var(--blue-1)] hover:underline">
          Corriger ou changer le moyen de paiement
        </Link>
      </div>
    </main>
  );
}

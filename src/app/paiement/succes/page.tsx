import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { appliquerMiseAJour } from "@/lib/paiement/abonnement-serveur";
import { modePaiement } from "@/lib/paiement/etat";
import { lireSession } from "@/lib/paiement/stripe";

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
  if (verifie) redirect("/tableau-de-bord?bienvenue=1");

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5 px-6 py-16">
      <h1 className="text-3xl">Nous vérifions votre paiement</h1>
      <p className="text-[var(--text-muted)]">Nous n&apos;avons pas encore reçu la confirmation. Cela peut prendre quelques instants. Actualisez cette page, ou revenez à votre espace.</p>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={`/paiement/succes?session_id=${encodeURIComponent(sessionId)}`} className="rounded-[4px] border border-[var(--line)] px-4 py-2.5 hover:border-[var(--blue-1)]">
          Actualiser
        </Link>
        <Link href="/tableau-de-bord" className="px-1 py-2.5 text-[var(--blue-1)] hover:underline">
          Mon espace
        </Link>
      </div>
    </main>
  );
}

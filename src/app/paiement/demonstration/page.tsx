import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { modePaiement } from "@/lib/paiement/etat";
import { DemonstrationBouton } from "./demonstration-bouton";

export const metadata: Metadata = { title: "Paiement de démonstration — CAXE" };
// Le mode de paiement se lit à chaque requête, jamais figé à la compilation.
export const dynamic = "force-dynamic";

// Remplace la page du fournisseur de paiement tant que le paiement réel n'est pas branché. Elle le dit
// clairement : aucune carte, aucun prélèvement.
export default async function DemonstrationPage() {
  if (modePaiement(process.env) !== "demonstration") redirect("/paiement");
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?depuis=/paiement");
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-6 px-6 py-16">
      <p className="w-fit rounded-[3px] border border-[rgb(var(--amber-rgb)/0.5)] px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--amber-1)]">Mode démonstration</p>
      <h1 className="text-3xl">Activer l&apos;abonnement sans paiement</h1>
      <p className="text-[var(--text-muted)]">
        Cet écran remplace la page de paiement tant que le paiement réel n&apos;est pas ouvert. Aucune carte n&apos;est demandée et aucun prélèvement n&apos;est fait.
      </p>
      <DemonstrationBouton />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Conditions générales de vente — CAXE" };

// Les conditions générales de vente sont rédigées par le propriétaire du produit : elles s'intègrent ici telles quelles
// (CLAUDE.md, section 10). Cette page n'en contient pas : elle doit être remplacée avant l'ouverture du paiement réel.
export default function ConditionsGenerales() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl">Conditions générales de vente</h1>
      <p className="text-[var(--text-muted)]">Le texte des conditions générales de vente sera publié ici avant l&apos;ouverture du paiement.</p>
      <Link href="/" className="w-fit text-[var(--blue-1)] hover:underline">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}

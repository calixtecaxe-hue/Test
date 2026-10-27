import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page introuvable — CAXE" };

// Adresse inconnue ou page retirée : l'écran le dit en français et propose un chemin de retour (audit client, L-03).
export default function PageIntrouvable() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl">Page introuvable</h1>
      <p className="text-[var(--text-muted)]">Cette adresse ne correspond à aucune page de CAXE. Elle a peut-être été mal copiée, ou la page a changé de place.</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/tableau-de-bord" className="w-fit text-[var(--blue-1)] hover:underline">
          Retrouver mes agents
        </Link>
        <Link href="/" className="w-fit text-[var(--blue-1)] hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}

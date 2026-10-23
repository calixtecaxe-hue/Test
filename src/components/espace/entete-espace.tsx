import Link from "next/link";
import { Logo } from "@/components/logo";
import { BasculeTheme } from "@/components/bascule-theme";
import { DeconnexionBouton } from "@/components/deconnexion-bouton";
import { NavEspace } from "./nav-espace";

// Barre de l'espace abonné : le logo, deux entrées (Mes agents, Mon compte), et la déconnexion.
export function EnteteEspace({ email }: { email: string }) {
  return (
    <header className="border-b border-[var(--line)]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/tableau-de-bord" className="flex items-center" aria-label="CAXE, mes agents">
          <Logo priority />
        </Link>
        <NavEspace />
        <div className="flex items-center gap-4">
          <BasculeTheme />
          <span className="hidden max-w-[220px] truncate text-xs text-[var(--text-muted)] sm:inline">{email}</span>
          <DeconnexionBouton />
        </div>
      </div>
    </header>
  );
}

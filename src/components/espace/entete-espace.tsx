import Link from "next/link";
import { Logo } from "@/components/logo";
import { BasculeTheme } from "@/components/bascule-theme";
import { DeconnexionBouton } from "@/components/deconnexion-bouton";
import { NavEspace } from "./nav-espace";

// Barre de l'espace abonné, construite sur celle du site public (SiteHeader) : même largeur, mêmes marges, même logo,
// même bascule jour / nuit et même bouton bordé. Deux entrées (Mes agents, Mon compte), l'adresse du compte, la déconnexion.
export function EnteteEspace({ email }: { email: string }) {
  return (
    <header className="entete-espace relative z-20 mx-auto w-full max-w-[1320px] px-6 py-5 lg:px-10 lg:py-6">
      <div className="flex items-center justify-between gap-6">
        <Link href="/tableau-de-bord" className="flex shrink-0 items-center" aria-label="CAXE, mes agents">
          <Logo priority className="h-11 w-auto sm:h-14" />
        </Link>
        <div className="hidden md:block">
          <NavEspace />
        </div>
        <div className="flex items-center gap-3">
          <BasculeTheme />
          <span className="hidden max-w-[220px] truncate text-xs text-[var(--text-muted)] lg:inline">{email}</span>
          <DeconnexionBouton />
        </div>
      </div>
      <div className="mt-4 flex justify-center md:hidden">
        <NavEspace />
      </div>
    </header>
  );
}

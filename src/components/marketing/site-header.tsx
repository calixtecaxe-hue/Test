import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/logo-caxe-complet.png";
import { MenuAgents } from "@/components/marketing/menu-agents";

export function SiteHeader() {
  return (
    <header className="relative z-20 mx-auto w-full max-w-[1320px] px-6 py-6 lg:px-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src={logo}
            alt="CAXE — Un acte, un destin"
            priority
            className="h-12 w-auto sm:h-16"
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-[var(--text-muted)] sm:flex">
          <Link
            href="/"
            className="lien-nav transition hover:text-[var(--text)]"
          >
            Accueil
          </Link>

          <MenuAgents />

          <Link
            href="/offres"
            className="lien-nav transition hover:text-[var(--text)]"
          >
            Nos offres
          </Link>
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/inscription"
            className="bouton-eclat rounded-[4px] bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-4 py-2 text-sm font-medium text-[var(--bg)] transition hover:brightness-110"
          >
            Commencer mon audit
          </Link>
          <Link
            href="/connexion"
            className="rounded-[4px] border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
          >
            Se connecter
          </Link>
        </div>
      </div>

      <nav className="mt-4 flex justify-center gap-6 text-sm text-[var(--text-muted)] sm:hidden">
        <Link href="/" className="hover:text-[var(--text)]">
          Accueil
        </Link>
        <MenuAgents />
        <Link href="/offres" className="hover:text-[var(--text)]">
          Nos offres
        </Link>
        <Link href="/connexion" className="hover:text-[var(--text)]">
          Se connecter
        </Link>
      </nav>
    </header>
  );
}

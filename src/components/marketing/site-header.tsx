import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/logo-caxe.png";
import { MenuAgents } from "@/components/marketing/menu-agents";

export function SiteHeader() {
  return (
    <header className="relative z-20 mx-auto w-full max-w-[1320px] px-6 py-6 lg:px-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src={logo} alt="CAXE" priority className="h-6 w-auto sm:h-7" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-[var(--text-muted)] sm:flex">
          <Link href="/" className="lien-nav transition hover:text-[var(--text)]">
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

        <Link
          href="/connexion"
          className="hidden rounded-[4px] border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)] sm:inline-block"
        >
          Se connecter
        </Link>
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

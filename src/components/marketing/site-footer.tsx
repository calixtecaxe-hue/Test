import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1320px] px-6 py-10 text-sm text-[var(--text-faint)] lg:px-10">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--line)] pt-8 sm:flex-row">
        <span>CAXE — Un acte, un destin</span>
        <nav className="flex gap-6">
          <Link href="/agents" className="hover:text-[var(--text-muted)]">
            Agents IA
          </Link>
          <Link href="/offres" className="hover:text-[var(--text-muted)]">
            Nos offres
          </Link>
          <Link href="/connexion" className="hover:text-[var(--text-muted)]">
            Se connecter
          </Link>
        </nav>
      </div>
    </footer>
  );
}

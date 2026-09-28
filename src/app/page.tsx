import Link from "next/link";

export default function Accueil() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-faint)]">
        CAXE
      </p>
      <h1 className="accent-degrade mt-4 text-4xl sm:text-5xl">
        Un acte, un destin
      </h1>
      <p className="mt-6 max-w-xl text-balance text-[var(--text-muted)]">
        L&apos;auto-audit d&apos;entreprise, enfin accessible à tous les
        dirigeants.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/inscription"
          className="rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)]"
        >
          Créer un compte
        </Link>
        <Link
          href="/connexion"
          className="rounded-[4px] border border-[var(--line)] px-5 py-2.5 font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
        >
          Se connecter
        </Link>
      </div>
    </main>
  );
}

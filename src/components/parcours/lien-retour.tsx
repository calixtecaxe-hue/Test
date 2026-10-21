import Link from "next/link";

// Retour à l'étape précédente du parcours : un vrai bouton, visible en haut de l'écran, pas seulement le retour du navigateur.
export function LienRetour({ href, libelle = "Retour" }: { href: string; libelle?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-2 rounded-[4px] border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {libelle}
    </Link>
  );
}

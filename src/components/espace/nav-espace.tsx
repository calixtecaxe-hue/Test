"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/tableau-de-bord", libelle: "Mes agents", prefixes: ["/tableau-de-bord", "/audit"] },
  { href: "/compte", libelle: "Mon compte", prefixes: ["/compte"] },
];

export function NavEspace() {
  const chemin = usePathname();
  return (
    <nav aria-label="Espace" className="flex items-center gap-1 text-sm">
      {LIENS.map((l) => {
        const actif = l.prefixes.some((p) => chemin.startsWith(p));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={actif ? "page" : undefined}
            className={`rounded-[4px] px-3 py-2 transition ${actif ? "bg-[var(--panel)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
          >
            {l.libelle}
          </Link>
        );
      })}
    </nav>
  );
}

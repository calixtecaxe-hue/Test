"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/tableau-de-bord", libelle: "Mes agents", prefixes: ["/tableau-de-bord", "/audit"] },
  { href: "/compte", libelle: "Mon compte", prefixes: ["/compte"] },
];

// Navigation de l'espace : les liens du site public (gris doux, soulignement animé au survol) ; la page ouverte prend
// la pastille bleutée et la petite lumière du bouton principal.
export function NavEspace() {
  const chemin = usePathname();
  return (
    <nav aria-label="Espace" className="flex items-center gap-2 text-sm">
      {LIENS.map((l) => {
        const actif = l.prefixes.some((p) => chemin.startsWith(p));
        return (
          <Link key={l.href} href={l.href} aria-current={actif ? "page" : undefined} className="nav-espace-lien">
            <span className="lien-nav">{l.libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}

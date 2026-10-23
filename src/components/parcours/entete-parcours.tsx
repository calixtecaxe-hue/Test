import Link from "next/link";
import { Logo } from "@/components/logo";
import { BasculeTheme } from "@/components/bascule-theme";

// Les étapes de l'abonnement, de la création du compte à l'ouverture de l'application. Le métier passe avant la
// formule (les agents proposés en dépendent) ; le dossier d'entreprise vient après le paiement.
export const ETAPES_PARCOURS = ["Compte", "Métier", "Formule", "Paiement", "Dossier"] as const;
export type EtapeParcours = 1 | 2 | 3 | 4 | 5;

// En-tête sobre du parcours : sans le menu du site ni de l'espace abonné, pour ne pas distraire de l'étape.
export function EnteteParcours({ etape, avecLogo = true }: { etape: EtapeParcours; avecLogo?: boolean }) {
  return (
    <header className={`mx-auto flex w-full max-w-[1100px] items-center px-6 py-5 ${avecLogo ? "justify-between" : "justify-end"}`}>
      {avecLogo ? (
        <Link href="/" aria-label="CAXE, accueil">
          <Logo priority />
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
      <ol className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]" aria-label="Étapes de l'abonnement">
        {ETAPES_PARCOURS.map((nom, i) => (
          <li key={nom} className="flex items-center gap-2" aria-current={i + 1 === etape ? "step" : undefined}>
            {i > 0 ? <span aria-hidden="true">·</span> : null}
            <span className={i + 1 === etape ? "font-semibold text-[var(--text)]" : i + 1 < etape ? "text-[var(--text-muted)]" : "text-[var(--text-faint)]"}>
              {nom}
            </span>
          </li>
        ))}
      </ol>
      <BasculeTheme />
      </div>
    </header>
  );
}

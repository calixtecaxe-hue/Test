import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/logo-caxe-complet.png";

// Le paiement est une étape à part : un en-tête sobre, sans le menu du site ni de l'espace abonné.
export default function PaiementLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-5">
        <Link href="/" aria-label="CAXE, accueil">
          <Image src={logo} alt="CAXE" priority className="h-10 w-auto" />
        </Link>
        <ol className="flex items-center gap-2 text-xs text-[var(--text-muted)]" aria-label="Étapes de l'abonnement">
          <li>Compte</li>
          <li aria-hidden="true">·</li>
          <li>Formule</li>
          <li aria-hidden="true">·</li>
          <li aria-current="step" className="font-semibold text-[var(--text)]">
            Paiement
          </li>
        </ol>
      </header>
      {children}
    </>
  );
}

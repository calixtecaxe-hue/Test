import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { BasculeTheme } from "@/components/bascule-theme";
import { FormulaireDemande } from "./formulaire-demande";

export const metadata: Metadata = { title: "Mot de passe oublié — CAXE" };

export default function MotDePasseOublie() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <div className="flex items-center justify-between">
        <Link href="/" className="w-fit">
          <Logo variante="simple" className="h-5 w-auto" />
        </Link>
        <BasculeTheme />
      </div>
      <h1 className="mt-8 text-2xl">Mot de passe oublié</h1>
      <p className="mt-3 text-[var(--text-muted)]">Indiquez l&apos;adresse email de votre compte. Nous vous envoyons un lien pour choisir un nouveau mot de passe.</p>
      <FormulaireDemande />
    </main>
  );
}

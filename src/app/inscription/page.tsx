import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EnteteParcours } from "@/components/parcours/entete-parcours";
import logo from "../../../public/logo-caxe-complet.png";
import { FormulaireCompte } from "./formulaire-compte";

export const metadata: Metadata = { title: "Créer un compte — CAXE" };

// Un compte déjà connecté reprend le parcours là où il en est (métier, formule, paiement ou application).
export default async function Inscription() {
  if ((await auth())?.user?.id) redirect("/tableau-de-bord");
  return (
    <div className="flex flex-1">
      <aside className="hidden w-[38%] max-w-[480px] flex-col justify-between border-r border-[var(--line)] bg-[var(--panel)] p-10 lg:flex">
        <Link href="/" aria-label="CAXE, accueil" className="w-fit">
          <Image src={logo} alt="CAXE" priority className="h-12 w-auto" />
        </Link>
        <div>
          <p className="font-titre text-3xl leading-tight">Un acte, un destin.</p>
          <p className="mt-4 max-w-[30ch] text-[var(--text-muted)]">Votre entreprise, auditée agent par agent, avec un objectif chiffré.</p>
        </div>
        <p className="text-xs text-[var(--text-faint)]">CAXE, l&apos;auto-audit des dirigeants de TPE et de PME.</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <EnteteParcours etape={1} avecLogo={false} />
        <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center px-6 pb-16">
          <Link href="/" aria-label="CAXE, accueil" className="mb-8 w-fit lg:hidden">
            <Image src={logo} alt="CAXE" priority className="h-10 w-auto" />
          </Link>
          <h1 className="text-3xl">Créez votre compte</h1>
          <p className="mt-3 text-[var(--text-muted)]">Une adresse email et un mot de passe suffisent. Vous précisez ensuite votre métier, puis vous choisissez votre formule.</p>
          <Suspense fallback={null}>
            <FormulaireCompte />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

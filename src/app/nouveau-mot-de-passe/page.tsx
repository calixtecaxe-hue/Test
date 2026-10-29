import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { BasculeTheme } from "@/components/bascule-theme";
import { prisma } from "@/lib/prisma";
import { MESSAGE_LIEN, empreinteDe, etatDemande, jetonBienForme } from "@/lib/mot-de-passe/reinitialisation";
import { FormulaireNouveau } from "./formulaire-nouveau";

// Le jeton est dans l'adresse : la page ne le transmet à aucun autre site (pas de « Referer »).
export const metadata: Metadata = { title: "Nouveau mot de passe — CAXE", referrer: "no-referrer" };

// Page ouverte depuis le lien reçu par email : le lien est vérifié avant d'afficher le formulaire, pour
// ne pas faire taper un mot de passe pour rien.
export default async function NouveauMotDePasse({ searchParams }: { searchParams: Promise<{ jeton?: string | string[] }> }) {
  const { jeton } = await searchParams;
  const etat = jetonBienForme(jeton)
    ? etatDemande(await prisma.reinitialisationMotDePasse.findUnique({ where: { empreinte: empreinteDe(jeton) }, select: { expireLe: true, utiliseeLe: true } }), new Date())
    : "inconnue";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <div className="flex items-center justify-between">
        <Link href="/" className="w-fit">
          <Logo variante="simple" className="h-5 w-auto" />
        </Link>
        <BasculeTheme />
      </div>
      <h1 className="mt-8 text-2xl">Nouveau mot de passe</h1>
      {etat === "valide" && typeof jeton === "string" ? (
        <FormulaireNouveau jeton={jeton} />
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <p role="alert">{MESSAGE_LIEN[etat === "valide" ? "inconnue" : etat]}</p>
          <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/mot-de-passe-oublie" className="text-[var(--blue-1)] hover:underline">
              Demander un nouveau lien
            </Link>
            <Link href="/connexion" className="text-[var(--blue-1)] hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EnteteParcours } from "@/components/parcours/entete-parcours";
import { GrillePoints } from "@/components/marketing/grille-points";
import { QuestionsProfil } from "@/components/parcours/questions-profil";
import { aSonDossier, aSonMetier } from "@/lib/compte";
import { accesOuvert } from "@/lib/paiement/etat";
import { PROFILS } from "@/lib/donnees/constantes";
import type { ProfilId } from "@/lib/donnees/schemas";

export const metadata: Metadata = { title: "Bienvenue — CAXE" };

// Dernière étape du parcours, juste après le paiement : l'accès est ouvert, il reste le dossier de l'entreprise (chiffre
// d'affaires, effectif, ancienneté, zone, ville), posé dans l'application avec les mots du métier.
export default async function BienvenuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?depuis=/bienvenue");
  const userId = session.user.id;
  const [utilisateur, abonnement] = await Promise.all([prisma.user.findUnique({ where: { id: userId } }), prisma.abonnement.findUnique({ where: { userId } })]);
  if (!utilisateur) redirect("/connexion");
  if (!aSonMetier(utilisateur)) redirect("/inscription/metier");
  if (!abonnement) redirect("/formule");
  if (!accesOuvert(abonnement, new Date())) redirect("/paiement");
  if (aSonDossier(utilisateur)) redirect("/tableau-de-bord");

  const profils = utilisateur.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p));
  return (
    <>
      <EnteteParcours etape={5} />
      <main className="relative flex-1 overflow-hidden px-6 pb-20 pt-4">
        <GrillePoints position="centre" />
        <div className="relative z-10 mx-auto w-full max-w-xl">
          <p role="status" className="w-fit rounded-[3px] border border-[rgba(123,208,160,0.45)] px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em]">
            Accès CAXE activé
          </p>
          <h1 className="mt-4 text-3xl">Bienvenue</h1>
          <p className="mt-3 text-[var(--text-muted)]">
            Vos agents sont ouverts. Cinq questions sur votre entreprise, puis vous choisissez un agent et vous fixez votre objectif. Vos réponses servent à adapter les questions et les comparaisons à votre situation.
          </p>
          <QuestionsProfil groupe="dossier" profils={profils} suite="/tableau-de-bord?bienvenue=1" />
        </div>
      </main>
    </>
  );
}

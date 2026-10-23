import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EnteteParcours } from "@/components/parcours/entete-parcours";
import { GrillePoints } from "@/components/marketing/grille-points";
import { QuestionsProfil, type ValeursMetier } from "@/components/parcours/questions-profil";
import { accesOuvert } from "@/lib/paiement/etat";
import { adresseAvecPreselection, lirePreselection } from "@/lib/formule-url";
import { METIER_ABSENT } from "@/lib/routage";

export const metadata: Metadata = { title: "Votre métier — CAXE" };

// Deuxième étape : le métier et les activités exercées. Il précède le choix de la formule, car les agents
// proposés en dépendent (une profession réglementée n'a pas l'agent Comm).
export default async function MetierPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?depuis=/inscription/metier");
  const userId = session.user.id;
  const [utilisateur, abonnement] = await Promise.all([prisma.user.findUnique({ where: { id: userId } }), prisma.abonnement.findUnique({ where: { userId } })]);
  if (!utilisateur) redirect("/connexion");
  if (abonnement && accesOuvert(abonnement, new Date())) redirect("/tableau-de-bord");

  const preselection = lirePreselection(`?${new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined)).toString()}`);
  const initiales: ValeursMetier = {
    metier: utilisateur.metierPrecis ?? "",
    sousVariantes: utilisateur.sousVariantes,
    autre: utilisateur.autreActiviteTexte !== null,
    autreTexte: utilisateur.autreActiviteTexte ?? "",
    metierAbsentTexte: utilisateur.metierAbsentTexte ?? "",
    categorieAbsente: utilisateur.metierPrecis === METIER_ABSENT ? (utilisateur.categorie ?? "") : "",
    vendProduits: utilisateur.vendProduits === null ? "" : utilisateur.vendProduits ? "oui" : "non",
  };

  return (
    <>
      <EnteteParcours etape={2} />
      <main className="relative flex-1 overflow-hidden px-6 pb-20 pt-4">
        <GrillePoints position="centre" />
        <div className="relative z-10 mx-auto w-full max-w-xl">
          <h1 className="text-2xl">Votre métier</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Il nous sert à vous proposer les agents qui vous concernent et à adapter les questions à votre activité. Les autres informations sur votre entreprise viennent après le paiement.
          </p>
          <QuestionsProfil groupe="metier" initiales={initiales} suite={adresseAvecPreselection("/formule", preselection)} />
        </div>
      </main>
    </>
  );
}

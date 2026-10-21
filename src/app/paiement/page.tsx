import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AGENTS } from "@/lib/agents";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { GrillePoints } from "@/components/marketing/grille-points";
import { formaterEuros, OFFRES, prixMensuelEquivalentAnnuelCentimesHT } from "@/lib/offres";
import { accesOuvert, modePaiement, montantCentimesHT } from "@/lib/paiement/etat";
import { LienRetour } from "@/components/parcours/lien-retour";
import { ChoixPeriode } from "./choix-periode";
import { PaiementBouton } from "./paiement-bouton";

export const metadata: Metadata = { title: "Paiement — CAXE" };

export default async function PaiementPage({ searchParams }: { searchParams: Promise<{ annule?: string }> }) {
  const { annule } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?depuis=/paiement");
  const userId = session.user.id;

  const compte = await prisma.user.findUnique({ where: { id: userId }, select: { metierPrecis: true, categorie: true } });
  if (!compte?.metierPrecis) redirect("/inscription/metier");
  const abonnement = await prisma.abonnement.findUnique({ where: { userId } });
  if (!abonnement) redirect("/formule");
  if (accesOuvert(abonnement, new Date())) redirect("/tableau-de-bord");

  const periode = abonnement.periode === "ANNUEL" ? "annuel" : "mensuel";
  const acces = await prisma.agentAccess.findMany({ where: { userId, actif: true }, select: { agent: true } });
  const agents = AGENTS.filter((a) => acces.some((x) => x.agent === a.code));
  // Formule sans les agents choisis : on retourne les choisir avant de payer.
  if (agents.length !== abonnement.nombreAgents) redirect(`/formule?agents=${abonnement.nombreAgents}&periode=${periode}`);

  const utilisateur = await prisma.user.findUnique({ where: { id: userId }, select: { raisonSociale: true, numeroTva: true } });
  const montant = montantCentimesHT(abonnement.nombreAgents, periode)!;
  const offre = OFFRES.find((o) => o.nombreAgents === abonnement.nombreAgents)!;
  const mode = modePaiement(process.env);

  return (
    <main className="relative flex-1 overflow-hidden px-6 pb-20 pt-6">
      <GrillePoints position="centre" />
      <div className="relative z-10 mx-auto flex w-full max-w-[960px] flex-col gap-8">
        <div className="flex flex-col gap-4">
          <LienRetour href={`/formule?agents=${abonnement.nombreAgents}&periode=${periode}`} />
          <h1 className="text-3xl sm:text-4xl">Finalisez votre abonnement</h1>
          <p className="mt-3 max-w-[56ch] text-[var(--text-muted)]">Vérifiez votre formule. Dès le paiement, vos agents s&apos;ouvrent. Il vous reste ensuite cinq questions sur votre entreprise, puis vous définissez votre objectif.</p>
        </div>

        {annule ? (
          <p role="status" className="rounded-xl border border-[rgb(var(--amber-rgb)/0.5)] px-5 py-4 text-sm">
            Le paiement a été interrompu. Votre formule est conservée : vous pouvez reprendre quand vous voulez.
          </p>
        ) : null}

        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-start">
          <section aria-labelledby="recap" className="flex flex-col gap-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <h2 id="recap" className="text-xl">
              Votre formule
            </h2>
            <ul className="flex flex-col gap-3">
              {agents.map((a) => (
                <li key={a.code} className="flex items-center gap-4">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[var(--line)]">
                    <AgentAvatar code={a.code} />
                  </span>
                  <span>
                    <span className="block">{a.nom}</span>
                    <span className="block text-sm text-[var(--text-muted)]">{a.question}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href={`/formule?agents=${abonnement.nombreAgents}&periode=${periode}`} className="w-fit text-sm text-[var(--blue-1)] hover:underline">
              Modifier mes agents ou ma formule
            </Link>
          </section>

          <section aria-labelledby="total" className="flex flex-col gap-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <h2 id="total" className="text-xl">
              Total
            </h2>
            <ChoixPeriode periode={periode} nombreAgents={abonnement.nombreAgents} agents={agents.map((a) => a.code)} />
            <div>
              <p className="font-titre text-4xl">
                {formaterEuros(montant)}
                <span className="ml-2 text-base font-normal text-[var(--text-muted)]">HT {periode === "annuel" ? "par an" : "par mois"}</span>
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {abonnement.nombreAgents} agents, facturation {periode === "annuel" ? "annuelle" : "mensuelle"}.
              </p>
              {periode === "annuel" ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Soit {formaterEuros(prixMensuelEquivalentAnnuelCentimesHT(offre.prixMensuelCentimesHT))} HT / mois, au lieu de {formaterEuros(offre.prixMensuelCentimesHT)} HT / mois en facturation mensuelle.
                </p>
              ) : null}
            </div>
            <PaiementBouton
              initial={{ raisonSociale: utilisateur?.raisonSociale ?? "", numeroTva: utilisateur?.numeroTva ?? "" }}
              desactive={mode === "indisponible"}
              libelle={mode === "stripe" ? `Payer ${formaterEuros(montant)} HT` : mode === "demonstration" ? "Continuer vers le paiement de démonstration" : "Paiement indisponible"}
            />
            <p className="text-xs text-[var(--text-muted)]">
              {mode === "stripe"
                ? "Vous serez redirigé vers la page de paiement sécurisée de notre prestataire, Stripe. Nous ne voyons ni ne conservons votre numéro de carte."
                : mode === "demonstration"
                  ? "Mode démonstration : aucun paiement n'est pris. L'écran suivant active l'abonnement pour tester l'application."
                  : "Le paiement n'est pas encore ouvert. Votre formule est enregistrée : revenez dans quelques jours."}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

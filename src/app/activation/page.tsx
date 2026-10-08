import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { GrillePoints } from "@/components/marketing/grille-points";
import { OFFRES, type Offre } from "@/lib/offres";
import { ChoixAgents } from "./choix-agents";

export const metadata: Metadata = {
  title: "Choisir vos agents — CAXE",
};

// Maquette du moment qui suit le paiement : aucun paiement n'est pris et rien
// n'est enregistré. La formule arrive dans l'adresse (?agents=3&periode=annuel).
export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ agents?: string; periode?: string }>;
}) {
  const { agents, periode } = await searchParams;
  const offre: Offre =
    OFFRES.find((o) => String(o.nombreAgents) === agents) ??
    OFFRES.find((o) => o.nombreAgents === 3)!;

  return (
    <>
      <SiteHeader />
      <main className="relative flex-1 overflow-hidden px-6 pb-20 pt-12 sm:pt-16 lg:px-10">
        <GrillePoints position="centre" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <ChoixAgents offre={offre} annuel={periode === "annuel"} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

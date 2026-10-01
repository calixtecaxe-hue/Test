import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { GrillePoints } from "@/components/marketing/grille-points";
import { AgentIcone } from "@/components/marketing/agent-icone";
import { OffresTarifs } from "@/components/marketing/offres-tarifs";
import { Reveal } from "@/components/marketing/reveal";
import { AGENTS, couleurAgent } from "@/lib/agents";
import { REMISE_ANNUELLE_POURCENT } from "@/lib/offres";

export const metadata: Metadata = {
  title: "Nos offres — CAXE",
};

export default function OffresPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-8 pt-12 sm:pt-16 lg:px-10">
          <GrillePoints position="centre" />
          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
            <span className="badge-dispo sans-point">Prix hors taxes</span>
            <h1 className="accent-degrade mt-5 text-4xl sm:text-5xl">
              Nos offres
            </h1>
            <p className="mt-5 text-[var(--text-muted)]">
              Un abonnement par paliers, selon le nombre d&apos;agents que vous
              choisissez. Facturation mensuelle, ou annuelle avec{" "}
              {REMISE_ANNUELLE_POURCENT}&nbsp;% de réduction.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
          <OffresTarifs />

          <Reveal>
            <div className="mt-16 flex flex-col items-center text-center">
              <p className="text-sm text-[var(--text-faint)]">
                Les agents entre lesquels choisir
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {AGENTS.map((agent) => (
                  <span key={agent.code} className="puce-agent">
                    <span
                      className="selecteur-pastille"
                      style={{ background: couleurAgent[agent.couleur].texte }}
                      aria-hidden="true"
                    >
                      <AgentIcone code={agent.code} className="h-3 w-3" />
                    </span>
                    {agent.nom}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="mx-auto mt-16 flex max-w-3xl flex-col items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] px-6 py-12 text-center">
              <h2 className="text-2xl">Commencer votre audit</h2>
              <p className="mt-4 max-w-md text-[var(--text-muted)]">
                Créez un compte pour répondre au questionnaire et recevoir
                votre score.
              </p>
              <Link
                href="/inscription"
                className="bouton-eclat mt-8 rounded-[4px] bg-[var(--blue-1)] px-6 py-3 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)]"
              >
                Créer un compte
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

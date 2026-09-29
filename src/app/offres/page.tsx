import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { FondAnime } from "@/components/marketing/fond-anime";
import { Reveal } from "@/components/marketing/reveal";
import { AGENTS, couleurAgent } from "@/lib/agents";

export const metadata: Metadata = {
  title: "Nos offres — CAXE",
};

export default function OffresPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-8 pt-12 sm:pt-16">
          <FondAnime />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h1 className="accent-degrade text-3xl sm:text-4xl">Nos offres</h1>
            <p className="mt-5 text-[var(--text-muted)]">
              Un abonnement mensuel par paliers, selon le nombre
              d&apos;agents souscrits. Vous choisissez les agents qui vous
              intéressent plutôt que de payer un forfait unique.
            </p>
            <p className="mt-3 text-sm text-[var(--text-faint)]">
              Les tarifs sont en cours de finalisation et seront affichés
              ici dès qu&apos;ils seront arrêtés.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {AGENTS.map((agent, index) => (
              <Reveal key={agent.code} delai={index * 100}>
                <div className="carte-agent flex h-full flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] p-7">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h2
                        className="text-lg"
                        style={{ color: couleurAgent[agent.couleur].texte }}
                      >
                        {agent.nom}
                      </h2>
                      <span className="whitespace-nowrap rounded-[4px] border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--text-faint)]">
                        {agent.disponible ? "Disponible" : "Bientôt disponible"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[var(--text-muted)]">
                      {agent.couvre}
                    </p>
                  </div>
                  <p className="mt-6 text-sm text-[var(--text-faint)]">
                    Tarif à définir
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mx-auto mt-16 flex max-w-3xl flex-col items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] px-6 py-12 text-center">
              <h2 className="text-2xl">Commencer avec Acquisition & CA</h2>
              <p className="mt-4 max-w-md text-[var(--text-muted)]">
                C&apos;est le seul agent disponible aujourd&apos;hui. Créez un
                compte pour répondre au questionnaire et recevoir votre
                score.
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

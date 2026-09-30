import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Reveal } from "@/components/marketing/reveal";
import { AGENTS, couleurAgent } from "@/lib/agents";

export const metadata: Metadata = {
  title: "Agents IA — CAXE",
};

export default function AgentsPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="px-6 pb-8 pt-12 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="accent-degrade text-3xl sm:text-4xl">Les agents</h1>
            <p className="mt-5 text-[var(--text-muted)]">
              Chaque agent couvre un périmètre précis et ne dépasse jamais son
              rôle : le juridique, le fiscal et le médical restent hors
              périmètre. L&apos;accès à un agent est un droit attaché à votre
              compte — vous n&apos;ouvrez que ceux auxquels vous êtes abonné.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {AGENTS.map((agent, index) => (
              <Reveal key={agent.code} delai={index * 100}>
                <div
                  id={agent.code}
                  className="carte-agent flex h-full scroll-mt-24 flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)] p-7"
                >
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
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--text-faint)]">
                    {agent.nature === "diagnostic" ? "Diagnostic" : "Génératif"}
                  </p>

                  <div className="mt-5 flex-1 space-y-4 text-sm">
                    <div>
                      <p className="text-[var(--text-faint)]">Ce qu&apos;il couvre</p>
                      <p className="mt-1 text-[var(--text-muted)]">{agent.couvre}</p>
                    </div>
                    {agent.neFaitJamais ? (
                      <div>
                        <p className="text-[var(--text-faint)]">Ce qu&apos;il ne fait jamais</p>
                        <p className="mt-1 text-[var(--text-muted)]">
                          {agent.neFaitJamais}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {agent.disponible ? (
                    <Link
                      href="/inscription"
                      className="bouton-eclat mt-6 inline-flex w-fit rounded-[4px] bg-[var(--blue-1)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)]"
                    >
                      Créer un compte
                    </Link>
                  ) : null}
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

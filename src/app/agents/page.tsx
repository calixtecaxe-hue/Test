import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { AgentsSelecteur } from "@/components/marketing/agents-selecteur-lazy";

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
            <span className="badge-dispo">Disponible 24h/24, 7j/7</span>
            <h1 className="accent-degrade mt-5 text-4xl sm:text-5xl">
              Les agents
            </h1>
            <p className="mt-5 text-[var(--text-muted)]">
              Chaque agent couvre un périmètre précis et ne dépasse jamais son
              rôle : le juridique, le fiscal et le médical restent hors
              périmètre. L&apos;accès à un agent est un droit attaché à votre
              compte — vous n&apos;ouvrez que ceux auxquels vous êtes abonné.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-20">
          <AgentsSelecteur />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

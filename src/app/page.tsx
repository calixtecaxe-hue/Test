import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { EtoilesLogo } from "@/components/marketing/etoiles-logo-lazy";
import { Reveal } from "@/components/marketing/reveal";
import { AGENTS, couleurAgent } from "@/lib/agents";
import logoComplet from "../../public/logo-caxe-complet.png";

const etapes = [
  {
    numero: "01",
    titre: "Un questionnaire pour votre métier",
    texte:
      "Vous répondez à des questions rédigées à l'avance pour votre secteur. Aucune question n'est obligatoire, et une estimation est toujours acceptée.",
  },
  {
    numero: "02",
    titre: "Un score calculé, pas deviné",
    texte:
      "Vos réponses sont comparées à des seuils fixes. Le calcul est le même pour tout le monde : deux dirigeants qui répondent pareil obtiennent le même score.",
  },
  {
    numero: "03",
    titre: "Un plan d'action concret",
    texte:
      "Le compte rendu met en forme les résultats déjà calculés et propose des actions, avec une échéance propre à chacune.",
  },
];

export default function Accueil() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="relative">
              <EtoilesLogo />
              <Image
                src={logoComplet}
                alt="CAXE — Un acte, un destin"
                priority
                className="relative h-28 w-auto sm:h-36"
              />
            </div>
            <p className="mt-8 max-w-xl text-balance text-lg text-[var(--text-muted)]">
              L&apos;auto-audit d&apos;entreprise, enfin accessible à tous les
              dirigeants.
            </p>
            <p className="mt-4 max-w-xl text-balance text-sm text-[var(--text-faint)]">
              Un questionnaire pensé pour votre métier, un score calculé sans
              détour, un plan d&apos;action à votre rythme.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/inscription"
                className="bouton-eclat rounded-[4px] bg-[var(--blue-1)] px-6 py-3 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)]"
              >
                Créer un compte
              </Link>
              <Link
                href="/agents"
                className="rounded-[4px] border border-[var(--line)] px-6 py-3 font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
              >
                Découvrir les agents
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl">Comment ça marche</h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {etapes.map((etape, index) => (
              <Reveal key={etape.numero} delai={index * 120}>
                <div className="h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
                  <p className="font-titre text-sm text-[var(--text-faint)]">
                    {etape.numero}
                  </p>
                  <h3 className="mt-3 text-lg">{etape.titre}</h3>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {etape.texte}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <h2 className="text-2xl sm:text-3xl">
                Le conseil stratégique, sans son prix habituel
              </h2>
              <p className="mt-5 text-[var(--text-muted)]">
                Le concurrent réel n&apos;est pas l&apos;absence d&apos;outil,
                c&apos;est le consultant ou le coach externe, souvent cher et
                de qualité inégale. CAXE donne accès à un diagnostic
                sérieux, construit sur des seuils réels, pas sur des
                impressions.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <div className="flex items-end justify-between gap-4">
              <h2 className="accent-degrade text-2xl sm:text-3xl">Les agents</h2>
              <Link
                href="/agents"
                className="whitespace-nowrap text-sm text-[var(--blue-1)] hover:underline"
              >
                Tout voir
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {AGENTS.map((agent, index) => (
              <Reveal key={agent.code} delai={index * 100}>
                <div className="carte-agent h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
                  <div className="flex items-center justify-between">
                    <h3
                      className="text-base"
                      style={{ color: couleurAgent[agent.couleur].texte }}
                    >
                      {agent.nom}
                    </h3>
                    {!agent.disponible ? (
                      <span className="rounded-[4px] border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--text-faint)]">
                        Bientôt disponible
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {agent.couvre}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="px-6 py-20">
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] px-6 py-12 text-center">
              <h2 className="accent-degrade text-2xl sm:text-3xl">Commencer votre audit</h2>
              <p className="mt-4 max-w-md text-[var(--text-muted)]">
                La création d&apos;un compte prend quelques minutes. Vous
                répondez au questionnaire à votre rythme.
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

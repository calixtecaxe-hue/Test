import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { EtoilesLogo } from "@/components/marketing/etoiles-logo-lazy";
import { Reveal } from "@/components/marketing/reveal";
import { AGENTS, couleurAgent } from "@/lib/agents";

const etapes = [
  {
    numero: "01",
    couleur: "bleu",
    titre: "Un questionnaire pour votre métier",
    texte:
      "Vous répondez à des questions rédigées à l'avance pour votre secteur. Aucune question n'est obligatoire, et une estimation est toujours acceptée.",
    icone: (
      <>
        <rect x="3" y="5" width="4" height="4" rx="1" />
        <line x1="10" y1="7" x2="21" y2="7" />
        <rect x="3" y="11" width="4" height="4" rx="1" />
        <line x1="10" y1="13" x2="21" y2="13" />
        <rect x="3" y="17" width="4" height="4" rx="1" />
        <line x1="10" y1="19" x2="21" y2="19" />
      </>
    ),
  },
  {
    numero: "02",
    couleur: "blanc",
    titre: "Un score calculé, pas deviné",
    texte:
      "Vos réponses sont comparées à des seuils fixes. Le calcul est le même pour tout le monde : deux dirigeants qui répondent pareil obtiennent le même score.",
    icone: (
      <>
        <path d="M4 18a8 8 0 0 1 16 0" />
        <line x1="12" y1="18" x2="16" y2="12" />
        <circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    numero: "03",
    couleur: "rouge",
    titre: "Un plan d'action concret",
    texte:
      "Le compte rendu met en forme les résultats déjà calculés et propose des actions, avec une échéance propre à chacune.",
    icone: (
      <>
        <path d="M6 21V4" />
        <path d="M6 4h11l-3 4 3 4H6" />
      </>
    ),
  },
] as const;

export default function Accueil() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="relative">
              <EtoilesLogo />
              <h1 className="text-3xl sm:text-5xl">
                Des agents IA à votre disposition pour vous conseiller
              </h1>
            </div>
            <p className="mt-6 max-w-xl text-balance text-[var(--text-muted)]">
              Chaque agent couvre un périmètre précis et s&apos;appuie sur un
              diagnostic chiffré, pas sur des impressions.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/agents"
                className="bouton-eclat rounded-[4px] bg-[var(--blue-1)] px-6 py-3 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)]"
              >
                Venez les essayer
              </Link>
              <Link
                href="/inscription"
                className="rounded-[4px] border border-[var(--line)] px-6 py-3 font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-20">
          <Reveal>
            <h2 className="text-center text-2xl sm:text-3xl">
              Comment ça marche
            </h2>
          </Reveal>
          <div className="chemin mt-16">
            {etapes.map((etape, index) => (
              <Reveal key={etape.numero} delai={index * 150}>
                <div
                  className={`etape-chemin etape-${etape.couleur} ${
                    index % 2 === 1 ? "inverse" : ""
                  }`}
                >
                  <div className="etape-noeud">
                    <svg
                      className="etape-icone"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {etape.icone}
                    </svg>
                    <span className="etape-numero">{etape.numero}</span>
                  </div>
                  <div className="etape-carte">
                    <h3>{etape.titre}</h3>
                    <p>{etape.texte}</p>
                  </div>
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

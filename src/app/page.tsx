import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { EtoilesLogo } from "@/components/marketing/etoiles-logo-lazy";
import { Reveal } from "@/components/marketing/reveal";
import { AGENTS, couleurAgent } from "@/lib/agents";

const chemin = "M 18 8 C 65 8, 82 25, 82 50 C 82 75, 65 92, 18 92";

const etapes = [
  {
    numero: "01",
    couleur: "bleu",
    vx: 18,
    vy: 8,
    cote: "droite",
    titre: "Un questionnaire sur mesure",
    texte:
      "Vous répondez à un questionnaire conçu sur mesure pour votre entreprise : secteur d'activité, chiffre d'affaires, nombre de collaborateurs, emplacement, et les autres critères propres à votre activité.",
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
    vx: 82,
    vy: 50,
    cote: "gauche",
    titre: "Un score sur 100",
    texte:
      "Un score sur 100 vous est donné. Il vous situe sur cette échelle, et une stratégie est dressée en fonction de votre résultat.",
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
    vx: 18,
    vy: 92,
    cote: "droite",
    titre: "Une stratégie à mettre en place",
    texte:
      "Vous mettez en place cette stratégie. Nous suivons vos avancées et vous réorientons si besoin.",
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
              <h1 className="text-2xl sm:text-3xl">
                Chaque agent couvre un périmètre précis et s&apos;appuie sur
                un diagnostic chiffré, pas sur des impressions.
              </h1>
            </div>
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

        <section className="mx-auto max-w-4xl px-6 py-20">
          <Reveal>
            <h2 className="text-center text-2xl sm:text-3xl">
              Comment ça marche
            </h2>
          </Reveal>
          <div className="chemin mt-16">
            <svg
              className="chemin-virage"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={chemin} />
            </svg>
            {etapes.map((etape, index) => (
              <div
                key={etape.numero}
                className={`etape-chemin etape-${etape.couleur} carte-${etape.cote}`}
                style={
                  {
                    "--vx": `${etape.vx}%`,
                    "--vy": `${etape.vy}%`,
                  } as React.CSSProperties
                }
              >
                <Reveal delai={index * 150} className="etape-noeud-wrap">
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
                </Reveal>
                <Reveal delai={index * 150 + 80} className="etape-carte-wrap">
                  <div className="etape-carte">
                    <h3>{etape.titre}</h3>
                    <p>{etape.texte}</p>
                  </div>
                </Reveal>
              </div>
            ))}
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

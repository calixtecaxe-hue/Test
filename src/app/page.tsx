import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { EtoilesLogo } from "@/components/marketing/etoiles-logo-lazy";
import { GrillePoints } from "@/components/marketing/grille-points";
import { Reveal } from "@/components/marketing/reveal";
import { FenetreOutil } from "@/components/marketing/fenetre-outil";
import { AgentsSelecteur } from "@/components/marketing/agents-selecteur";

const chemin = "M 18 8 C 65 8, 82 25, 82 50 C 82 75, 65 92, 18 92";

const etapes = [
  {
    numero: "01",
    couleur: "bleu",
    vx: 18,
    vy: 8,
    cote: "droite",
    titre: "Fixez votre objectif",
    texte:
      "Fixez votre objectif chiffré, puis répondez à un questionnaire pensé à la fois pour votre secteur et, surtout, pour vous : votre chiffre d'affaires, vos collaborateurs, les objectifs que vous souhaitez, etc.",
  },
  {
    numero: "02",
    couleur: "blanc",
    vx: 82,
    vy: 50,
    cote: "gauche",
    titre: "Un plan d'action pour vos points faibles",
    texte:
      "Ensuite, vous recevez un plan d'action qui vous permet d'améliorer vos points faibles.",
  },
  {
    numero: "03",
    couleur: "rouge",
    vx: 18,
    vy: 92,
    cote: "droite",
    titre: "Mise en place et suivi",
    texte:
      "Enfin, vous n'avez plus qu'à le mettre en place, et nous suivons votre progression. En fonction des objectifs fixés, nous revenons vers vous pour faire le point : si tout se passe bien, on continue ; si vous rencontrez un blocage, vous nous le partagez et nous vous aidons à trouver une solution.",
  },
] as const;

export default function Accueil() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-24 pt-16 sm:pt-24 lg:px-10">
          <GrillePoints position="gauche" />
          <div className="relative z-10 mx-auto grid max-w-[1320px] gap-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="relative">
                <EtoilesLogo />
                <h1 className="text-3xl sm:text-5xl">
                  Votre entreprise stagne&nbsp;?{" "}
                  <span className="accent-degrade">Identifiez pourquoi.</span>
                </h1>
              </div>
              <p className="mt-6 max-w-xl text-balance text-[var(--text-muted)]">
                Réalisez l&apos;audit de votre entreprise grâce à{" "}
                <span className="text-[var(--blue-1)]">quatre agents IA</span>{" "}
                conçus sur mesure pour votre activité.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Link
                  href="/#agents-selecteur"
                  className="bouton-eclat rounded-[4px] bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-7 py-3.5 font-medium text-[var(--bg)] transition hover:brightness-110"
                >
                  Venez les essayer
                </Link>
                <Link
                  href="/inscription"
                  className="rounded-[4px] border border-[var(--line)] px-6 py-3 font-medium text-[var(--text)] transition hover:border-[var(--blue-1)] hover:text-[var(--blue-1)]"
                >
                  Créer un compte
                </Link>
              </div>
            </div>

            <Reveal delai={150}>
              <FenetreOutil />
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 lg:px-10">
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

        <section className="mx-auto max-w-[1560px] px-6 py-20 lg:px-12">
          <Reveal>
            <div className="flex flex-col items-center text-center">
              <span className="badge-dispo">Disponible 24h/24, 7j/7</span>
              <h2 className="accent-degrade mt-5 text-2xl sm:text-3xl">
                Les agents
              </h2>
            </div>
          </Reveal>
          <div className="mt-10">
            <AgentsSelecteur />
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

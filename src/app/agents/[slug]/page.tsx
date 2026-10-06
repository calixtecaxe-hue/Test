import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { GrillePoints } from "@/components/marketing/grille-points";
import {
  AgentAvatar,
  AgentPortrait,
} from "@/components/marketing/agent-avatar";
import { Reveal } from "@/components/marketing/reveal";
import { FenetreOutil } from "@/components/marketing/fenetre-outil";
import { AGENTS, agentParSlug, couleurAgent, type Agent } from "@/lib/agents";
import { COLONNES, PRESENTATIONS } from "@/lib/agent-presentation";

export const dynamicParams = false;

export function generateStaticParams() {
  return AGENTS.map((agent) => ({ slug: agent.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = agentParSlug(slug);
  return { title: agent ? `${agent.nom} — CAXE` : "Agent — CAXE" };
}

// Pont entre l'agent Acquisition et l'agent Comm (CLAUDE.md section 3). Côté
// Comm, il figure dans la colonne « Propositions » de « Comment il travaille ».
const LIEN_ENTRE_AGENTS: Partial<Record<Agent["code"], string>> = {
  ACQUISITION_CA:
    "Cet agent aborde votre communication sous l'angle de l'acquisition : il en évalue les fondamentaux, sans entrer dans l'analyse de vos contenus. Pour aller plus loin, l'agent Comm & Création de contenu prend le relais. S'il détecte un point à approfondir, votre rapport vous oriente vers lui, accessible en un clic.",
};

export default async function PageAgent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = agentParSlug(slug);
  if (!agent) notFound();

  const couleur = couleurAgent[agent.couleur];
  const generatif = agent.nature === "génératif";
  const presentation = PRESENTATIONS[agent.code];
  const autres = AGENTS.filter((a) => a.code !== agent.code);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-12 pt-12 sm:pt-16 lg:px-10">
          <GrillePoints position="gauche" teinte={agent.couleur} />
          <div className="agent-tete relative z-10 mx-auto max-w-6xl">
            <div className="agent-portrait" aria-hidden="true">
              <span
                className="agent-portrait-halo"
                style={{ background: couleur.halo }}
              />
              <AgentPortrait code={agent.code} />
            </div>
            <div className="agent-tete-texte">
              <span className="badge-dispo">
                {generatif ? "Agent génératif" : "Agent de diagnostic"}
              </span>
              <h1 className="mt-5 text-4xl sm:text-5xl">
                Découvrez l&apos;agent
                <span className="block" style={{ color: couleur.texte }}>
                  {agent.nom}
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-[var(--text-muted)]">
                {presentation.accroche}
              </p>
              <ul className="agent-atouts">
                {presentation.atouts.map((atout) => (
                  <li key={atout}>
                    <svg
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      aria-hidden="true"
                      style={{ color: couleur.texte }}
                    >
                      <path
                        d="M3 8.5 6.5 12 13 4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {atout}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/inscription"
                  className="bouton-eclat rounded-[4px] bg-[linear-gradient(100deg,var(--blue-1),var(--blue-2))] px-7 py-3.5 font-medium text-[var(--bg)] transition hover:brightness-110"
                >
                  Créer un compte
                </Link>
                <Link
                  href="/offres"
                  className="rounded-[4px] border border-[var(--line)] px-6 py-3 font-medium text-[var(--text)] transition hover:border-[var(--blue-1)] hover:text-[var(--blue-1)]"
                >
                  Voir les offres
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-4 lg:px-10">
          <Reveal>
            <h2 className="text-center text-2xl sm:text-3xl">
              Un aperçu de son déroulé
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[var(--text-muted)]">
              Questionnaire, compte rendu puis suivi. Exemple illustratif, avec
              des données fictives.
            </p>
          </Reveal>
          <Reveal delai={100}>
            <div className="mt-8">
              <FenetreOutil agentCode={agent.code} />
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
          <Reveal>
            <h2 className="text-center text-2xl sm:text-3xl">
              Comment il travaille
            </h2>
          </Reveal>
          <div className="agent-colonnes mt-10">
            {COLONNES[agent.code].map((colonne, index) => (
              <Reveal key={colonne.etiquette} delai={index * 100}>
                <div className="agent-colonne">
                  <p
                    className="agent-colonne-tete"
                    style={{ color: couleur.texte }}
                  >
                    {colonne.etiquette}
                  </p>
                  {colonne.lignes.map((ligne, rang) => (
                    <details
                      key={`${ligne.titre}-${rang}`}
                      className={`agent-acc${ligne.provisoire ? " agent-acc-provisoire" : ""}`}
                    >
                      <summary>{ligne.titre}</summary>
                      <p>{ligne.texte}</p>
                    </details>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>

          {LIEN_ENTRE_AGENTS[agent.code] ? (
            <Reveal>
              <p className="mx-auto mt-10 max-w-3xl rounded-xl border border-[var(--line)] bg-[var(--panel)] px-6 py-5 text-sm text-[var(--text-muted)]">
                {LIEN_ENTRE_AGENTS[agent.code]}
              </p>
            </Reveal>
          ) : null}
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
          <Reveal>
            <h2 className="text-center text-2xl sm:text-3xl">
              Les autres agents
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {autres.map((autre, index) => (
              <Reveal key={autre.code} delai={index * 100}>
                <Link
                  href={`/agents/${autre.slug}`}
                  className="carte-agent flex h-full items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5"
                >
                  <span
                    className="selecteur-panneau-icone"
                    style={{ background: couleurAgent[autre.couleur].barre }}
                    aria-hidden="true"
                  >
                    <AgentAvatar code={autre.code} />
                  </span>
                  <span>
                    <span
                      className="block"
                      style={{ color: couleurAgent[autre.couleur].texte }}
                    >
                      {autre.nom}
                    </span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.08em] text-[var(--text-faint)]">
                      {autre.nature === "diagnostic"
                        ? "Diagnostic"
                        : "Génératif"}
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="px-6 py-16">
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center rounded-xl border border-[var(--line)] bg-[var(--panel)] px-6 py-12 text-center">
              <h2 className="text-2xl">Commencer votre audit</h2>
              <p className="mt-4 max-w-md text-[var(--text-muted)]">
                Créez un compte pour répondre au questionnaire et recevoir votre
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

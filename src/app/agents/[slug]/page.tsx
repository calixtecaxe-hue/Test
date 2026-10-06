import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { GrillePoints } from "@/components/marketing/grille-points";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { Reveal } from "@/components/marketing/reveal";
import { FenetreOutil } from "@/components/marketing/fenetre-outil";
import { AGENTS, agentParSlug, couleurAgent, type Agent } from "@/lib/agents";

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

const ETAPES_DIAGNOSTIC = [
  {
    titre: "Un questionnaire pré-écrit",
    texte:
      "Les questions sont rédigées à l'avance, métier par métier. Aucune n'est obligatoire : vous pouvez passer toute question, et vos réponses sont enregistrées au fur et à mesure.",
  },
  {
    titre: "Un score calculé",
    texte:
      "Vos réponses sont comparées à des seuils fixes. Deux dirigeants qui répondent la même chose obtiennent exactement le même score.",
  },
  {
    titre: "Un compte rendu rédigé",
    texte:
      "Le texte met en forme des scores déjà calculés : il ne calcule rien et n'invente aucun chiffre. Un plan d'action en découle.",
  },
];

const ETAPES_GENERATIF = [
  {
    titre: "Vos publications existantes",
    texte: "L'agent analyse les publications que vous avez déjà faites.",
  },
  {
    titre: "Des indicateurs chiffrés",
    texte: "Il s'appuie sur des indicateurs chiffrés de performance.",
  },
  {
    titre: "Des propositions de contenu",
    texte:
      "Il génère des propositions de contenu quand vous le demandez, jamais automatiquement.",
  },
];

// Contenu propre à la page de l'agent Acquisition & Chiffre d'affaires.
const COUVRE_ACQUISITION = {
  intro:
    "Tout le parcours qui va du premier contact au chiffre d'affaires encaissé :",
  lignes: [
    {
      libelle: "Contacts",
      texte: "volume, canaux utilisés, canal qui rapporte le plus de clients",
    },
    { libelle: "Rendez-vous", texte: "délai de réponse, taux de présence" },
    {
      libelle: "Transformation",
      texte: "du rendez-vous à la signature",
    },
    {
      libelle: "Coût d'acquisition",
      texte: "budget marketing rapporté au CA, coût d'un client signé",
    },
    {
      libelle: "Présence en ligne",
      texte: "canaux actifs, régularité de publication",
    },
    {
      libelle: "Prix et honoraires",
      texte:
        "niveau pratiqué face au marché, écart entre prix affiché et prix final",
    },
    {
      libelle: "Fidélisation",
      texte: "clients récurrents, recommandation",
    },
    {
      libelle: "Productivité",
      texte: "CA et volume traité par collaborateur",
    },
    {
      libelle: "Saisonnalité",
      texte: "capacité à anticiper les creux et les pics",
    },
  ],
};

const ETAPES_ACQUISITION = [
  {
    titre: "Un questionnaire adapté à votre entreprise",
    texte:
      "À l'inscription, vous indiquez votre métier, votre nombre de collaborateurs, votre zone géographique et votre chiffre d'affaires. Le questionnaire s'adapte à ce profil.",
  },
  {
    titre: "Une stratégie sur mesure",
    texte:
      "À partir de vos réponses, CAXE construit une stratégie pour votre entreprise. Elle s'appuie sur ce qui fonctionne déjà et s'attaque en priorité à ce qui vous freine. Vous savez quoi améliorer, quelles actions mettre en place, et dans quel ordre.",
  },
  {
    titre: "Des objectifs et un suivi",
    texte:
      "Chaque action devient un objectif daté. Par exemple : décrocher 5 rendez-vous de plus par mois d'ici 3 semaines. À la date prévue, CAXE fait le point avec vous. Si l'objectif est atteint, vous passez à la suite. Sinon, on cherche ce qui a bloqué et on vous propose une autre piste.",
  },
];

// Pont entre l'agent Acquisition et l'agent Comm (CLAUDE.md section 3).
const LIEN_ENTRE_AGENTS: Partial<Record<Agent["code"], string>> = {
  ACQUISITION_CA:
    "Cet agent aborde votre communication sous l'angle de l'acquisition : il en évalue les fondamentaux, sans entrer dans l'analyse de vos contenus. Pour aller plus loin, l'agent Comm & Création de contenu prend le relais. S'il détecte un point à approfondir, votre rapport vous oriente vers lui, accessible en un clic.",
  COMM_CREATION:
    "Depuis le rapport de l'agent Acquisition & Chiffre d'affaires, le bouton « Voir des propositions de contenu » lance cet agent, à votre demande.",
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
  const acquisition = agent.code === "ACQUISITION_CA";
  const etapes = acquisition
    ? ETAPES_ACQUISITION
    : generatif
      ? ETAPES_GENERATIF
      : ETAPES_DIAGNOSTIC;
  const autres = AGENTS.filter((a) => a.code !== agent.code);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-12 pt-12 sm:pt-16 lg:px-10">
          <GrillePoints position="centre" />
          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
            <span
              className="avatar-hero"
              style={{ background: couleur.barre }}
              aria-hidden="true"
            >
              <AgentAvatar code={agent.code} />
            </span>
            <span className="badge-dispo mt-6">
              {agent.disponible ? "Disponible" : "Bientôt disponible"}
            </span>
            <h1
              className="mt-5 text-4xl sm:text-5xl"
              style={{ color: couleur.texte }}
            >
              {agent.nom}
            </h1>
            <p className="mt-2 text-sm uppercase tracking-[0.08em] text-[var(--text-faint)]">
              {generatif ? "Agent génératif" : "Agent de diagnostic"}
            </p>
            <p className="mt-5 max-w-2xl text-[var(--text-muted)]">
              {generatif
                ? "Il analyse vos publications et vous propose des contenus, à votre demande."
                : "Il mesure votre situation à partir de vos réponses, puis la traduit en score sur 100 et en plan d'action."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
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
          {acquisition ? (
            <Reveal>
              <div className="carte-agent h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-7">
                <p className="text-sm text-[var(--text-faint)]">
                  Ce qu&apos;il couvre
                </p>
                <p className="mt-3 text-lg">{COUVRE_ACQUISITION.intro}</p>
                <ul className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
                  {COUVRE_ACQUISITION.lignes.map((ligne) => (
                    <li key={ligne.libelle}>
                      <span
                        className="font-semibold"
                        style={{ color: couleur.texte }}
                      >
                        {ligne.libelle}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        {" "}
                        : {ligne.texte}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Reveal>
                <div className="carte-agent h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-7">
                  <p className="text-sm text-[var(--text-faint)]">
                    Ce qu&apos;il couvre
                  </p>
                  <p className="mt-3 text-lg" style={{ color: couleur.texte }}>
                    {agent.couvre}
                  </p>
                </div>
              </Reveal>
              <Reveal delai={100}>
                <div className="carte-agent h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-7">
                  <p className="text-sm text-[var(--text-faint)]">
                    {agent.neFaitJamais
                      ? "Ce qu'il ne fait jamais"
                      : "Hors périmètre"}
                  </p>
                  <p className="mt-3 text-lg text-[var(--text-muted)]">
                    {agent.neFaitJamais ??
                      "Le juridique, le fiscal et le médical sont hors périmètre de tous les agents."}
                  </p>
                </div>
              </Reveal>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
          <Reveal>
            <h2 className="text-center text-2xl sm:text-3xl">
              Comment il travaille
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {etapes.map((etape, index) => (
              <Reveal key={etape.titre} delai={index * 100}>
                <div className="carte-agent h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-7">
                  <span
                    className="font-[family-name:var(--titre)] text-sm font-bold"
                    style={{ color: couleur.texte }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-lg">{etape.titre}</h3>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {etape.texte}
                  </p>
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aAccesAgent } from "@/lib/acces-agent";
import { AGENTS } from "@/lib/agents";
import {
  decrireVariation,
  type ObjectifStructure,
} from "@/lib/objectif/interpreter";
import { ObjectifEtape } from "./objectif-etape";

export const metadata: Metadata = {
  title: "Votre objectif — CAXE",
};

const LIBELLES_STATUT: Record<string, string> = {
  ACTIF: "En cours",
  ATTEINT: "Atteint",
  ABANDONNE: "Abandonné",
  REMPLACE: "Remplacé",
};

function formaterDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// Première étape d'un audit : le dirigeant écrit son objectif, librement. Le
// profil de l'entreprise est déjà connu ; l'objectif, lui, est propre à cet
// agent et à cet audit (CLAUDE.md section 0).
export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = AGENTS.find((a) => a.slug === slug);
  if (!agent) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/connexion?depuis=/audit/${slug}`);

  const acces = await aAccesAgent(session.user.id, agent.code);
  if (!acces) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
        <h1 className="text-2xl">{agent.nom}</h1>
        <p className="mt-4 text-[var(--text-muted)]">
          Cet agent n&apos;est pas inclus dans votre formule. Vous pouvez modifier vos agents depuis les offres.
        </p>
        <Link href="/offres" className="mt-6 w-fit text-[var(--blue-1)] hover:underline">
          Voir les offres
        </Link>
      </main>
    );
  }

  const objectifs = await prisma.objectif.findMany({
    where: { userId: session.user.id, agent: agent.code },
    orderBy: { creeLe: "desc" },
    take: 10,
  });
  const actif = objectifs.find((o) => o.statut === "ACTIF") ?? null;
  const historique = objectifs.filter((o) => o.statut !== "ACTIF");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">
        Audit · {agent.nom}
      </p>

      <ObjectifEtape
        agent={agent.code}
        agentSlug={agent.slug}
        objectifActif={
          actif
            ? {
                texte: actif.texteBrut,
                echeance: formaterDate(actif.echeance),
                variation: decrireVariation(actif.structure as unknown as ObjectifStructure),
              }
            : null
        }
      />

      {historique.length > 0 ? (
        <section className="mt-14" aria-labelledby="historique">
          <h2 id="historique" className="text-base">
            Objectifs précédents
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {historique.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-[var(--line)] px-4 py-3"
              >
                <span className="text-[var(--text)]">{o.texteBrut}</span>
                <span className="text-xs text-[var(--text-faint)]">
                  {LIBELLES_STATUT[o.statut]} · créé le {formaterDate(o.creeLe)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

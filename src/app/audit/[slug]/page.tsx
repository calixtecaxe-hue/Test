import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aAccesAgent } from "@/lib/acces-agent";
import { AGENTS } from "@/lib/agents";
import { PROFILS, type ProfilId } from "@/lib/donnees/schemas";
import { ENSEMBLE } from "@/lib/audit/donnees-audit";
import { assemblerQuestionnaire, compterQuestions } from "@/lib/audit/assemblage";
import { ancienneteEnMois, tailleDepuisEffectif } from "@/lib/audit/affichage";
import { estScalaire } from "@/lib/audit/reponse";
import { reponsesDuCompte } from "@/lib/audit/compte";
import type { ObjectifEnregistre } from "@/lib/audit/objectif";
import { ObjectifFormulaire } from "./objectif-formulaire";
import { ObjectifActif } from "./objectif-actif";
import { NiveauChoix } from "./niveau-choix";
import { Questionnaire, type ThemeClient } from "./questionnaire";

export const metadata: Metadata = {
  title: "Votre audit — CAXE",
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

// Un audit commence par l'objectif du dirigeant pour cet agent, en trois champs. Vient
// ensuite le questionnaire, assemblé selon son profil, sa taille et ses réponses ; il
// se sauvegarde au fil des réponses et se reprend à tout moment.
export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = AGENTS.find((a) => a.slug === slug);
  if (!agent) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/connexion?depuis=/audit/${slug}`);
  const userId = session.user.id;

  const acces = await aAccesAgent(userId, agent.code);
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

  const [utilisateur, objectifs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { profils: true, nombreCollaborateurs: true, niveauAudit: true, dateCreationEntreprise: true } }),
    prisma.objectif.findMany({ where: { userId, agent: agent.code }, orderBy: { creeLe: "desc" }, take: 10 }),
  ]);
  if (!utilisateur) redirect("/connexion");

  const actif = objectifs.find((o) => o.statut === "ACTIF") ?? null;
  const historique = objectifs.filter((o) => o.statut !== "ACTIF");
  const profils = utilisateur.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p));
  const taille = tailleDepuisEffectif(utilisateur.nombreCollaborateurs);

  let corps: React.ReactNode = null;
  if (actif && !utilisateur.niveauAudit) {
    const n = compterQuestions(ENSEMBLE, agent.code, profils, taille);
    corps = <NiveauChoix essentielles={n.essentielles} approfondies={n.total} />;
  } else if (actif && utilisateur.niveauAudit) {
    const reponses = await reponsesDuCompte(userId);
    const a = assemblerQuestionnaire(ENSEMBLE, {
      agent: agent.code,
      profils,
      taille,
      niveau: utilisateur.niveauAudit === "APPROFONDI" ? "approfondi" : "essentiel",
      reponses,
      ancienneteMois: ancienneteEnMois(utilisateur.dateCreationEntreprise, new Date()),
    });
    const themes: ThemeClient[] = a.themes.map((t) => ({
      code: t.theme.code,
      nom: t.theme.nom,
      bloc: t.theme.bloc,
      questions: t.questions.map((q) => ({
        code: q.code,
        libelle: q.libelle,
        texte: q.texte,
        aide: q.aide,
        repli: q.repli,
        format: q.format,
        scalaire: estScalaire(q.format),
        quatreReponses: q.quatreReponses,
        dejaPosee: q.dejaPosee,
      })),
    }));
    // Seules les réponses utiles à cet écran partent au navigateur.
    const cles = new Set<string>([...a.declencheursConcernes.flatMap((d) => Object.keys(reponses).filter((c) => c === d.code || c.startsWith(`${d.code}.`))), ...themes.flatMap((t) => t.questions.map((q) => q.code))]);
    const reponsesEcran = Object.fromEntries(Object.entries(reponses).filter(([c]) => cles.has(c)));
    corps = (
      <Questionnaire
        declencheurs={a.declencheursConcernes.map((d) => ({ code: d.code, question: d.question, forme: d.forme }))}
        themes={themes}
        reponsesInitiales={reponsesEcran}
        masques={a.themesMasques.length}
        manquantes={a.statistiques.manquantes}
      />
    );
  }

  const structure = actif ? (actif.structure as unknown as ObjectifEnregistre) : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">Audit · {agent.nom}</p>

      {actif && structure ? (
        <>
          <ObjectifActif agent={agent.code} phrase={actif.texteBrut} echeance={formaterDate(actif.echeance)} indicateur={structure.indicateur?.nom ?? null} />
          {corps}
        </>
      ) : (
        <>
          <h1 className="mt-3 text-2xl">Votre objectif</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Quel résultat voulez-vous obtenir avec cet agent ? Dites ce que vous voulez changer, de combien, et en combien de temps.
          </p>
          <ObjectifFormulaire agent={agent.code} />
        </>
      )}

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

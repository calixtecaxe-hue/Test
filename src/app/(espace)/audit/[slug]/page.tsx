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
import { specDeLaDonnee } from "@/lib/audit/validation";
import { exclusionsAcquisition } from "@/lib/routage";
import { ancienneteEnMois, cleDeDonnee, clesDeLaRegle, donneeDuDeclencheur, tailleDepuisEffectif } from "@/lib/audit/affichage";
import { reponsesDuCompte } from "@/lib/audit/compte";
import type { ObjectifEnregistre } from "@/lib/audit/objectif";
import { ObjectifFormulaire } from "./objectif-formulaire";
import { ObjectifActif } from "./objectif-actif";
import { NiveauChoix } from "./niveau-choix";
import { NiveauReglage } from "./niveau-reglage";
import { Questionnaire, type ThemeClient } from "./questionnaire";
import { TeteAgent, type EtapeParcours } from "./tete-agent";

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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
        <h1 className="text-2xl">{agent.nom}</h1>
        <p className="mt-4 text-[var(--text-muted)]">
          Cet agent n&apos;est pas ouvert pour votre compte : il ne fait pas partie de votre formule, ou votre abonnement n&apos;est pas en cours.
        </p>
        <Link href="/tableau-de-bord" className="mt-6 w-fit text-[var(--blue-1)] hover:underline">
          Retour à mes agents
        </Link>
      </main>
    );
  }

  const [utilisateur, objectifs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { profils: true, categorie: true, metierPrecis: true, sousVariantes: true, nombreCollaborateurs: true, niveauAudit: true, dateCreationEntreprise: true } }),
    prisma.objectif.findMany({ where: { userId, agent: agent.code }, orderBy: { creeLe: "desc" }, take: 10 }),
  ]);
  if (!utilisateur) redirect("/connexion");

  const actif = objectifs.find((o) => o.statut === "ACTIF") ?? null;
  const historique = objectifs.filter((o) => o.statut !== "ACTIF");
  const profils = utilisateur.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p));
  const taille = tailleDepuisEffectif(utilisateur.nombreCollaborateurs);

  let corps: React.ReactNode = null;
  let reglageNiveau: React.ReactNode = null;
  if (actif && !utilisateur.niveauAudit) {
    const n = compterQuestions(ENSEMBLE, agent.code, profils, taille, exclusionsAcquisition(ENSEMBLE.routage, utilisateur));
    corps = <NiveauChoix essentielles={n.essentielles} approfondies={n.total} />;
  } else if (actif && profils.length === 0 && agent.code !== "RH_ORGANISATION") {
    // Catégorie dont le questionnaire reste à créer (Fabrication) : aucun profil, donc rien à poser pour l'instant.
    corps = (
      <p className="mt-10 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-sm text-[var(--text-muted)]" data-questionnaire-en-preparation>
        Le questionnaire de votre activité est en cours de préparation. Votre objectif est enregistré : vous retrouverez cet audit ici dès qu&apos;il sera ouvert.
      </p>
    );
  } else if (actif && utilisateur.niveauAudit) {
    const n = compterQuestions(ENSEMBLE, agent.code, profils, taille, exclusionsAcquisition(ENSEMBLE.routage, utilisateur));
    reglageNiveau = <NiveauReglage niveau={utilisateur.niveauAudit} essentielles={n.essentielles} total={n.total} />;
    const reponses = await reponsesDuCompte(userId);
    const a = assemblerQuestionnaire(ENSEMBLE, {
      agent: agent.code,
      profils,
      taille,
      niveau: utilisateur.niveauAudit === "APPROFONDI" ? "approfondi" : "essentiel",
      reponses,
      ancienneteMois: ancienneteEnMois(utilisateur.dateCreationEntreprise, new Date()),
      exclusions: exclusionsAcquisition(ENSEMBLE.routage, utilisateur),
    });
    // Un tableau dont les lignes viennent d'un déclencheur qui est lui-même une question (D03 → ACQ-03.01) lit la réponse à cette question.
    const lignesDeLaDonnee = (spec: typeof a.themes[number]["questions"][number]["spec"]) => {
      if (spec?.type !== "tableau" || spec.lignes.source !== "declencheur") return spec;
      const donnee = donneeDuDeclencheur(ENSEMBLE.reglesAffichage, spec.lignes.cle);
      return donnee ? { ...spec, lignes: { source: "declencheur" as const, cle: donnee } } : spec;
    };
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
        spec: lignesDeLaDonnee(q.spec),
        quatreReponses: q.quatreReponses,
        dejaPosee: q.dejaPosee,
        source: q.dejaPoseeDans
          ? {
              code: q.dejaPoseeDans,
              spec: specDeLaDonnee(ENSEMBLE, q.dejaPoseeDans).spec,
              agent: AGENTS.find((a) => a.code === ENSEMBLE.themes.find((t) => t.code === q.dejaPoseeDans!.slice(0, q.dejaPoseeDans!.indexOf(".")))?.agent)?.nom ?? "un autre agent",
            }
          : null,
      })),
    }));
    // Seules les réponses utiles à cet écran partent au navigateur.
    const cles = new Set<string>([...a.declencheursConcernes.flatMap((d) => Object.keys(reponses).filter((c) => c === d.code || c.startsWith(`${d.code}.`))), ...themes.flatMap((t) => t.questions.flatMap((q) => [q.code, ...(q.source ? [q.source.code] : []), ...(q.spec?.type === "tableau" && q.spec.lignes.source === "donnee" ? [q.spec.lignes.code] : []), ...(q.spec?.type === "tableau" && q.spec.lignes.source === "declencheur" ? [q.spec.lignes.cle] : [])]))]);
    const reponsesEcran = Object.fromEntries(Object.entries(reponses).filter(([c]) => cles.has(c)));
    // Noms des canaux, réseaux… cochés au cadrage, pour nommer les lignes des tableaux.
    const libellesLignes: Record<string, Record<string, string>> = {};
    for (const [code, f] of Object.entries(ENSEMBLE.reglesAffichage.declencheurs)) {
      if (f.type === "cases") libellesLignes[code] = Object.fromEntries(f.options.map((o) => [o.id, o.libelle]));
      // Déclencheur qui est une question de la banque : les libellés sont ceux de ses cases, sous le code de la donnée.
      if (f.type === "reponse_donnee") {
        const spec = specDeLaDonnee(ENSEMBLE, f.donnee).spec;
        if (spec?.type === "cases") libellesLignes[f.donnee] = Object.fromEntries(spec.options.map((o) => [o.id, o.libelle]));
      }
    }
    // Questions dont la réponse ouvre ou ferme d'autres questions (D03 → ACQ-03.01, « FIN-10.01#retours_par_mois »…) :
    // après leur enregistrement, l'écran recalcule les questions à poser.
    const donneesLues = new Set<string>();
    const regles = ENSEMBLE.reglesAffichage;
    for (const r of [...Object.values(regles.conditions), ...Object.values(regles.masquages)]) {
      for (const c of clesDeLaRegle(r)) {
        const dn = cleDeDonnee(c);
        if (dn) donneesLues.add(dn.donnee);
      }
    }
    for (const f of Object.values(regles.declencheurs)) if (f.type === "reponse_donnee") donneesLues.add(f.donnee);
    corps = (
      <Questionnaire
        donneesLues={[...donneesLues]}
        declencheurs={a.declencheursConcernes.map((d) => ({ code: d.code, question: d.question, forme: d.forme }))}
        themes={themes}
        reponsesInitiales={reponsesEcran}
        masques={a.themesMasques.length}
        manquantes={a.statistiques.manquantes}
        libellesLignes={libellesLignes}
      />
    );
  }

  const structure = actif ? (actif.structure as unknown as ObjectifEnregistre) : null;

  const etapeParcours: EtapeParcours = !actif ? 1 : !utilisateur.niveauAudit ? 2 : 3;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 px-6 py-10">
      <TeteAgent agent={agent} etape={etapeParcours} />

      {actif && structure ? (
        <>
          <ObjectifActif agent={agent.code} facteurAnnuelMax={ENSEMBLE.limitesObjectif.facteurAnnuelMax} phrase={actif.texteBrut} echeance={formaterDate(actif.echeance)} indicateur={structure.indicateur?.nom ?? null} />
          {reglageNiveau}
          {corps}
        </>
      ) : (
        <section aria-labelledby="objectif" className="mt-8">
          <h2 id="objectif" className="text-2xl">
            Votre objectif
          </h2>
          <p className="mt-2 text-[var(--text-muted)]">
            Avant toute question, dites ce que vous voulez obtenir avec cet agent : ce que vous voulez changer, de combien, et en combien de temps. Toute l&apos;analyse part de là.
          </p>
          <ObjectifFormulaire agent={agent.code} facteurAnnuelMax={ENSEMBLE.limitesObjectif.facteurAnnuelMax} />
        </section>
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
                <span className="text-xs text-[var(--text-muted)]">
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aAccesAgent } from "@/lib/acces-agent";
import { AGENTS } from "@/lib/agents";
import { PROFILS, type ProfilId } from "@/lib/donnees/schemas";
import { ENSEMBLE } from "@/lib/audit/donnees-audit";
import { compterQuestions } from "@/lib/audit/assemblage";
import { preparerQuestionnaire } from "@/lib/audit/preparation";
import { exclusionsAcquisition, metierDuCompte } from "@/lib/routage";
import { ancienneteEnMois, tailleDepuisEffectif } from "@/lib/audit/affichage";
import { ancragesDesReponses, reponsesDuCompte, reponsesPreremplies } from "@/lib/audit/compte";
import { moisDe } from "@/lib/audit/periodes";
import type { ObjectifEnregistre } from "@/lib/audit/objectif";
import { objectifTransmis, objectifsPourLaTaille, suiviParcours } from "@/lib/audit/objectifs-proposes";
import { ecartDeParcours } from "@/lib/audit/objectifs-agent";
import { ObjectifFormulaire } from "./objectif-formulaire";
import { ObjectifActif, ObjectifEdition } from "./objectif-actif";
import { ObjectifChoix } from "./objectif-choix";
import { DejaTente } from "./deja-tente";
import { lireTentatives, resumeTentatives } from "@/lib/audit/tentatives";
import { NiveauChoix } from "./niveau-choix";
import { ResultatsMaquette } from "./resultats-maquette";
import { Resultats, type Onglet } from "./resultats";
import { etatDuRapport, preparerDuCompte } from "@/lib/rapport/rapport-compte";
import { Questionnaire } from "./questionnaire";
import { TeteAgent, type EtapeParcours } from "./tete-agent";
import { estComplet } from "@/lib/compte";
import { vocabulaireDuCompte } from "@/lib/vocabulaire";

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
export default async function AuditPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ etape?: string; exemple?: string; onglet?: string }> }) {
  const { slug } = await params;
  const { etape: etapeDemandee, exemple: exempleDemande, onglet: ongletDemande } = await searchParams;
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
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.objectif.findMany({ where: { userId, agent: agent.code }, orderBy: [{ creeLe: "desc" }, { id: "asc" }], take: 40 }),
  ]);
  if (!utilisateur) redirect("/connexion");
  // Le dossier d'entreprise se complète après le paiement : tant qu'il manque, on y ramène le dirigeant.
  if (!estComplet(utilisateur)) redirect("/bienvenue");

  // Objectif en cours : un seul par agent (RH et Comm depuis le 28 octobre ; un compte enregistré avant peut en garder
  // plusieurs, affichés dans l'ordre où ils ont été choisis jusqu'à son prochain changement d'objectif).
  const actifs = objectifs.filter((o) => o.statut === "ACTIF");
  const actif = actifs[0] ?? null;
  const historique = objectifs.filter((o) => o.statut !== "ACTIF");
  const profils = utilisateur.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p));
  const taille = tailleDepuisEffectif(utilisateur.nombreCollaborateurs);
  // RH et Comm : une proposition de la liste écrite à l'avance, ou un objectif écrit par le dirigeant, avec ou sans chiffre.
  // Seules les propositions dont un thème s'applique à la taille de l'entreprise sont montrées (celles déjà choisies restent).
  const liste = ENSEMBLE.objectifsAgents.agents[agent.code] ?? null;
  const dejaChoisis = actifs.map((o) => (o.structure as unknown as ObjectifEnregistre).choix).filter((c): c is string => Boolean(c));
  const propositions = liste ? objectifsPourLaTaille(liste, ENSEMBLE.themes, ENSEMBLE.reglesAffichage, taille, dejaChoisis) : null;
  // Comm (décision 6C du 28 octobre) : la partie choisie pour l'objectif et le parcours du questionnaire (réponse à
  // COM-10.07) restent séparés ; quand ils ne correspondent pas, le dirigeant en est averti.
  const suivi = suiviParcours(liste ?? undefined, ENSEMBLE.banque);
  const reponseParcours = suivi ? await prisma.reponseAudit.findUnique({ where: { userId_cle: { userId, cle: suivi.donnee } } }) : null;
  const lue = reponseParcours?.reponse as { genre?: string; valeur?: unknown } | undefined;
  const publication = lue?.genre === "saisie" && typeof lue.valeur === "string" ? lue.valeur : null;
  const partieActive = actifs.map((o) => (o.structure as unknown as ObjectifEnregistre).partie).find(Boolean) ?? null;
  const ecart = ecartDeParcours(suivi, partieActive, publication);
  // « Autre » seul = activité par défaut : sert aux questions des modules métier et au vocabulaire du métier.
  const metier = metierDuCompte(ENSEMBLE.routage, utilisateur);

  let corps: React.ReactNode = null;
  if (actif && !utilisateur.niveauAudit) {
    const n = compterQuestions(ENSEMBLE, agent.code, profils, taille, exclusionsAcquisition(ENSEMBLE.routage, utilisateur), metier);
    corps = <NiveauChoix essentielles={n.essentielles} approfondies={n.total} />;
  } else if (actif && profils.length === 0 && agent.code !== "RH_ORGANISATION") {
    // Catégorie dont le questionnaire reste à créer (Fabrication) : aucun profil, donc rien à poser pour l'instant.
    corps = (
      <p className="mt-10 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-sm text-[var(--text-muted)]" data-questionnaire-en-preparation>
        Le questionnaire de votre activité est en cours de préparation. Votre objectif est enregistré : vous retrouverez cet audit ici dès qu&apos;il sera ouvert.
      </p>
    );
  } else if (actif && utilisateur.niveauAudit) {
    // Le niveau se change depuis l'étape « Niveau et contexte » du parcours (demande du propriétaire, 27 octobre : plus de
    // ligne de réglage en tête du questionnaire).
    const reponses = await reponsesDuCompte(userId, utilisateur);
    const preremplies = await reponsesPreremplies(userId);
    // Saisies partielles de tableaux à total imposé, gardées sur le compte (jamais utilisées par le calcul).
    const brouillons = new Map((await prisma.brouillonReponse.findMany({ where: { userId } })).map((b) => [b.cle, b.saisie as Record<string, string>]));
    const prep = preparerQuestionnaire(ENSEMBLE, {
      agent: agent.code,
      profils,
      taille,
      niveau: utilisateur.niveauAudit === "APPROFONDI" ? "approfondi" : "essentiel",
      reponses,
      brouillons,
      preremplies,
      ancienneteMois: ancienneteEnMois(utilisateur.dateCreationEntreprise, new Date()),
      exclusions: exclusionsAcquisition(ENSEMBLE.routage, utilisateur),
      vocabulaire: vocabulaireDuCompte(ENSEMBLE.vocabulairesMetiers, metier),
      metier,
      creation: moisDe(utilisateur.dateCreationEntreprise),
      aujourdhui: moisDe(new Date()),
      ancrages: await ancragesDesReponses(userId),
    });
    corps = (
      <Questionnaire
        donneesLues={prep.donneesLues}
        declencheurs={prep.declencheurs}
        themes={ecart && suivi ? prep.themes.map((t) => ({ ...t, questions: t.questions.map((q) => (q.code === suivi.donnee ? { ...q, ecartObjectif: ecart } : q)) })) : prep.themes}
        reponsesInitiales={prep.reponsesInitiales}
        masques={prep.masques}
        manquantes={prep.manquantes}
        libellesLignes={prep.libellesLignes}
      />
    );
  }

  const structure = actif ? (actif.structure as unknown as ObjectifEnregistre) : null;
  // Ce que le dirigeant a déjà essayé, rattaché à chaque objectif en cours (un seul par agent ; un compte enregistré avant le
  // 28 octobre peut en avoir plusieurs, chacun a alors sa réponse). La réponse d'un objectif remplacé est proposée, jamais reprise
  // sans l'accord du dirigeant.
  const dernierRemplace = historique.find((o) => lireTentatives(ENSEMBLE.dejaTente, o.tentatives) !== null) ?? null;
  const reprise = (o: (typeof actifs)[number]) => {
    if (!dernierRemplace || dernierRemplace.creeLe > o.creeLe) return null;
    const valeur = lireTentatives(ENSEMBLE.dejaTente, dernierRemplace.tentatives)!;
    return { objectifId: dernierRemplace.id, phrase: dernierRemplace.texteBrut, resume: resumeTentatives(ENSEMBLE.dejaTente, valeur) ?? "", valeur };
  };
  const dejaTente = actifs.length > 0 ? (
    <>
      {actifs.map((o) => (
        <DejaTente key={o.id} objectifId={o.id} def={ENSEMBLE.dejaTente} initiales={lireTentatives(ENSEMBLE.dejaTente, o.tentatives)} reprise={reprise(o)} pour={actifs.length > 1 ? o.texteBrut : undefined} />
      ))}
    </>
  ) : null;
  const structures = actifs.map((o) => o.structure as unknown as ObjectifEnregistre);
  // Ce que reçoivent les étapes suivantes : l'objectif tel qu'il a été choisi ou écrit, avec son origine (objectifs-proposes.ts).
  const transmis = actifs.map((o, i) => objectifTransmis(o.texteBrut, structures[i], liste?.objectifs ?? null));
  const affiches = transmis.map((t, i) => ({ phrase: t.phrase, echeance: formaterDate(actifs[i].echeance), indicateur: t.indicateur?.nom ?? null, reussite: t.reussite, origine: t.origine, chiffre: t.mesure === "chiffre" }));
  // Ce qui a été saisi, sans ce que le serveur a ajouté (indicateur, échéance) : repris pour modifier les objectifs.
  const saisies = structures.map(({ quoi, ampleur, reussite, choix, partie, delaiMois }) => ({ quoi, ampleur, reussite, choix, partie, delaiMois }));

  // L'étape atteinte, et l'étape affichée : une étape déjà atteinte se rouvre avec ?etape=1 ou ?etape=2.
  const etapeParcours: EtapeParcours = !actif ? 1 : !utilisateur.niveauAudit ? 2 : 3;
  const demandee = Number(etapeDemandee);
  // Compte rendu (étape 4) : ouvert dès que le niveau est choisi. Avec RESULTATS_MAQUETTE=1, « ?exemple=1 » montre la
  // maquette à chiffres fictifs (voir resultats-exemple.ts) à la place du constat réel.
  const resultatsOuverts = etapeParcours === 3;
  const vue: EtapeParcours = resultatsOuverts && demandee === 4 ? 4 : demandee === 1 || demandee === 2 ? (Math.min(demandee, etapeParcours) as EtapeParcours) : etapeParcours;
  const rouvre = vue < etapeParcours;
  const retourAudit = `/audit/${agent.slug}`;
  const exemple = process.env.RESULTATS_MAQUETTE === "1" && exempleDemande === "1";
  // Résultats, rapport et plan : préparés à partir des réponses actives du compte ; l'état du rapport dit s'il est à jour.
  const onglet: Onglet = ongletDemande === "rapport" || ongletDemande === "plan" ? ongletDemande : "resultats";
  const preparation = vue === 4 && actif && !exemple ? await preparerDuCompte(utilisateur, agent.code, actifs) : null;
  const etatRapport = preparation ? await etatDuRapport(actif!.id, preparation) : null;
  const nCompte = compterQuestions(ENSEMBLE, agent.code, profils, taille, exclusionsAcquisition(ENSEMBLE.routage, utilisateur), metier);

  return (
    <main data-couleur={agent.couleur} className="audit-agent mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 px-6 py-10">
      <TeteAgent agent={agent} etape={vue} max={etapeParcours} resultats={resultatsOuverts} />

      {vue >= 2 ? (
        <Link href={`${retourAudit}?etape=${vue - 1}`} className="audit-retour">
          <span aria-hidden="true">←</span> Revenir à l&apos;étape précédente
        </Link>
      ) : null}

      {vue === 4 && actif ? (
        exemple ? (
          <ResultatsMaquette agent={agent} objectifs={affiches} />
        ) : (
          <Resultats agent={agent} onglet={onglet} vue={preparation!.resultats} etat={etatRapport!} base={retourAudit} />
        )
      ) : rouvre && vue === 1 ? (
        <ObjectifEdition agent={agent.code} facteurAnnuelMax={ENSEMBLE.limitesObjectif.facteurAnnuelMax} propositions={propositions} saisies={saisies} retour={retourAudit} suivi={suivi} publication={publication} />
      ) : rouvre && vue === 2 && actif && structure ? (
        <>
          <ObjectifActif agent={agent.code} facteurAnnuelMax={ENSEMBLE.limitesObjectif.facteurAnnuelMax} objectifs={affiches} saisies={saisies} propositions={propositions} suivi={suivi} publication={publication} ecart={ecart} />
          {dejaTente}
          <NiveauChoix essentielles={nCompte.essentielles} approfondies={nCompte.total} actuel={utilisateur.niveauAudit} retour={retourAudit} />
        </>
      ) : actif && structure ? (
        <>
          <ObjectifActif agent={agent.code} facteurAnnuelMax={ENSEMBLE.limitesObjectif.facteurAnnuelMax} objectifs={affiches} saisies={saisies} propositions={propositions} suivi={suivi} publication={publication} ecart={ecart} />
          {dejaTente}
          {corps}
        </>
      ) : (
        <section aria-labelledby="objectif" className="audit-entree mt-8" style={{ "--d": "480ms" } as React.CSSProperties}>
          <h2 id="objectif" className="text-2xl">
            {propositions ? "Quel objectif souhaitez-vous atteindre ?" : "Votre objectif"}
          </h2>
          <p className="mt-2 text-[var(--text-muted)]">
            {propositions
              ? "Choisissez un objectif proposé ou écrivez le vôtre. Toute l'analyse part de là."
              : "Avant toute question, dites ce que vous voulez obtenir avec cet agent : ce que vous voulez changer, de combien, et en combien de temps. Toute l'analyse part de là."}
          </p>
          {propositions ? (
            <ObjectifChoix agent={agent.code} propositions={propositions} facteurAnnuelMax={ENSEMBLE.limitesObjectif.facteurAnnuelMax} suivi={suivi} publication={publication} />
          ) : (
            <ObjectifFormulaire agent={agent.code} facteurAnnuelMax={ENSEMBLE.limitesObjectif.facteurAnnuelMax} />
          )}
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
                {resumeTentatives(ENSEMBLE.dejaTente, lireTentatives(ENSEMBLE.dejaTente, o.tentatives)) ? (
                  <span className="w-full text-xs text-[var(--text-muted)]" data-historique-tentatives>
                    Déjà essayé : {resumeTentatives(ENSEMBLE.dejaTente, lireTentatives(ENSEMBLE.dejaTente, o.tentatives))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

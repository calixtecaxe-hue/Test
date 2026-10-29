// Rapport et plan d'action d'un compte (serveur) : préparation du dossier à partir des réponses réelles, lancement de la
// rédaction en arrière-plan, état lu par l'écran (en cours, prêt, échec, périmé) et suivi des actions du plan.

import type { AgentCode, Objectif, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { UtilisateurComplet } from "../compte";
import { AGENTS } from "../agents";
import { ENSEMBLE } from "../audit/donnees-audit";
import { constatDuCompte, type ConstatDuCompte } from "../audit/constat-compte";
import { agentsActifs } from "../audit/compte";
import { ancienneteEnMois } from "../audit/affichage";
import type { ObjectifEnregistre } from "../audit/objectif";
import { objectifTransmis } from "../audit/objectifs-proposes";
import { lireTentatives, tentativesTransmises } from "../audit/tentatives";
import { bilanNonSuivi } from "../audit/reponse";
import { contrainteDepuisCompte, routageDuCompte, trouverMetier } from "../routage";
import { composerResultats, type VueResultats } from "../resultats/resultats";
import { composerDossier, empreinteDossier, type Dossier } from "./dossier";
import { MESSAGE_ECHEC, rediger, type Redacteur } from "./rediger";
import { redacteurClaude } from "./client-rapport";
import { rapportSimule } from "./simulation";
import { modeRapport, type ModeRapport } from "./mode";
import type { Rapport } from "./schema";

const ZONES: Record<string, string> = { URBAINE_DENSE: "urbaine dense", PERIURBAINE: "périurbaine", RURALE: "rurale" };
const STATUTS_ACTION: Record<string, string> = { A_FAIRE: "à faire", EN_COURS: "en cours", FAITE: "faite", ABANDONNEE: "abandonnée" };

// --- Résultats et dossier ----------------------------------------------------------------------------------------------

export type Preparation = { resultats: VueResultats; dossier: Dossier; empreinte: string; constat: ConstatDuCompte };

export async function preparerDuCompte(utilisateur: UtilisateurComplet, agent: AgentCode, objectifs: Objectif[]): Promise<Preparation> {
  const constat = await constatDuCompte(utilisateur, agent);
  const liste = ENSEMBLE.objectifsAgents.agents[agent] ?? null;
  const transmis = objectifs.map((o) => ({ ...objectifTransmis(o.texteBrut, o.structure as unknown as ObjectifEnregistre, liste?.objectifs ?? null), id: o.id }));
  const resultats = composerResultats({
    agent,
    aujourdhui: new Date().toISOString().slice(0, 10),
    objectifs: transmis,
    mesures: constat.mesures,
    evolutions: constat.vue.evolutions,
    compteRendu: constat.vue,
  });

  const a = constat.assemblage;
  const questions = [...a.prealables, ...a.themes.flatMap((t) => t.questions)];
  const reponsesLibres = questions.flatMap((q) => {
    const r = a.reponsesActives[q.code];
    return q.spec?.type === "texte" && r?.genre === "saisie" && typeof r.valeur === "string" && r.valeur.trim() !== "" ? [{ question: q.texte ?? q.libelle, texte: r.valeur.trim() }] : [];
  });
  const essentielles = questions.filter((q) => q.niveau === "essentiel" && q.quatreReponses).map((q) => q.code);
  const bilan = bilanNonSuivi(essentielles, a.reponsesActives);

  const contrainte = contrainteDepuisCompte(ENSEMBLE.routage, utilisateur);
  const routage = routageDuCompte(ENSEMBLE.routage, utilisateur);
  const metier = trouverMetier(ENSEMBLE.routage, utilisateur.metierPrecis);
  const canaux = ENSEMBLE.banque.find((q) => q.donnee === "ACQ-03.01")?.reponse;
  const exclus = new Set(ENSEMBLE.routage.reglementees.acquisitionExclut?.optionsCadrage?.D03 ?? []);
  const objectifActif = objectifs[0];
  const precedent = objectifActif
    ? await prisma.rapport.findFirst({ where: { objectifId: objectifActif.id, statut: "PRET" }, orderBy: { creeLe: "desc" }, include: { actions: true } })
    : null;
  const historique = precedent?.contenu
    ? (precedent.contenu as unknown as Rapport).actions.map((x) => ({ intitule: x.intitule, statut: STATUTS_ACTION[precedent.actions.find((y) => y.cle === x.id)?.statut ?? "A_FAIRE"] }))
    : [];

  const agentDef = AGENTS.find((x) => x.code === agent)!;
  const dossier = composerDossier({
    agent: { code: agent, nom: agentDef.nom, question: agentDef.question },
    profil: {
      metier: metier?.libelle ?? utilisateur.metierPrecis,
      activites: (metier?.sousVariantes ?? []).filter((v) => utilisateur.sousVariantes.includes(v.id)).map((v) => v.libelle),
      modeles: utilisateur.profils,
      zone: ZONES[utilisateur.typeZone] ?? null,
      effectif: utilisateur.nombreCollaborateurs,
      ancienneteMois: ancienneteEnMois(utilisateur.dateCreationEntreprise, new Date()),
      caMensuelDeclare: `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(utilisateur.chiffreAffairesMensuel))} €`,
      stock: routage?.stock === "oui" ? true : routage?.stock === "non" ? false : utilisateur.vendProduits ?? null,
      agentsSouscrits: await agentsActifs(utilisateur.id),
      agentComm: !contrainte.agentsExclus.includes("COMM_CREATION"),
      professionReglementee: contrainte.reglementee,
      canauxAutorises: contrainte.reglementee && canaux?.type === "cases" ? canaux.options.filter((o) => !exclus.has(o.id)).map((o) => o.libelle) : null,
    },
    resultats,
    tentatives: tentativesTransmises(ENSEMBLE.dejaTente, objectifActif ? lireTentatives(ENSEMBLE.dejaTente, objectifActif.tentatives) : null),
    reponsesLibres,
    themesNotes: constat.vue.notes.filter((t) => t.couleur).map((t) => ({ theme: t.nom, couleur: t.couleur!, aValider: t.aValider })),
    suiviDonnees: { nonSuivies: bilan.nonSuivies, essentielles: bilan.essentielles, declenche: bilan.conseilPilotage },
    historique,
  });
  return { resultats, dossier, empreinte: empreinteDossier(dossier), constat };
}

// Le rapport s'appuie sur la situation de l'entreprise : sans aucun fait, aucune évolution, aucune réponse libre ni réponse à
// « déjà essayé », il n'y aurait que des conseils génériques.
export function dossierSuffisant(d: Dossier): boolean {
  return d.faits.length + d.evolutions.filter((e) => e.statut !== "non_etablie").length + d.marche.length + d.reponsesLibres.length > 0 || d.dejaEssaye.statut !== "sans_reponse";
}

// --- État lu par l'écran ------------------------------------------------------------------------------------------------

export type EtatRapport = {
  mode: ModeRapport;
  suffisant: boolean;
  rapport: null | {
    id: string;
    statut: "EN_COURS" | "PRET" | "ECHEC";
    mode: string;
    creeLe: string;
    termineLe: string | null;
    erreur: string | null;
    // Le dossier a changé depuis la rédaction (réponses, objectif, déjà essayé).
    perime: boolean;
    contenu: Rapport | null;
    actions: Record<string, "A_FAIRE" | "EN_COURS" | "FAITE" | "ABANDONNEE">;
    // Ce que désigne chaque référence citée (F1, E2, O…), d'après le dossier transmis : « d'après » sous chaque passage.
    references: Record<string, string>;
  };
};

function referencesDuDossier(d: Dossier): Record<string, string> {
  return Object.fromEntries([
    ["O", "votre objectif"],
    ["T", "ce que vous avez déjà essayé"],
    ...d.faits.map((f) => [f.id, `${f.libelle.charAt(0).toLowerCase()}${f.libelle.slice(1)} (${f.valeur})`]),
    ...d.evolutions.map((e) => [e.id, `évolution : ${e.libelle.charAt(0).toLowerCase()}${e.libelle.slice(1)}`]),
    ...d.marche.map((m) => [m.id, `repère de marché : ${m.theme}`]),
    ...d.reponsesLibres.map((l) => [l.id, `votre réponse à « ${l.question} »`]),
    ...d.constat.themesNotes.map((c) => [c.id, `constat : ${c.theme}`]),
  ]);
}

function interrompu(r: { statut: string; creeLe: Date }): boolean {
  return r.statut === "EN_COURS" && Date.now() - r.creeLe.getTime() > ENSEMBLE.parametresRapport.generation.dureeMaxSecondes * 1000;
}

export async function etatDuRapport(objectifId: string | null, p: Pick<Preparation, "dossier" | "empreinte">): Promise<EtatRapport> {
  const mode = modeRapport(process.env);
  const suffisant = dossierSuffisant(p.dossier);
  if (!objectifId) return { mode, suffisant, rapport: null };
  const r = await prisma.rapport.findFirst({ where: { objectifId }, orderBy: { creeLe: "desc" }, include: { actions: true } });
  if (!r) return { mode, suffisant, rapport: null };
  const coupe = interrompu(r);
  return {
    mode,
    suffisant,
    rapport: {
      id: r.id,
      statut: coupe ? "ECHEC" : r.statut,
      mode: r.mode,
      creeLe: r.creeLe.toISOString(),
      termineLe: r.termineLe?.toISOString() ?? null,
      erreur: coupe ? MESSAGE_ECHEC : r.erreur,
      perime: r.empreinte !== p.empreinte,
      contenu: r.statut === "PRET" ? (r.contenu as unknown as Rapport) : null,
      actions: Object.fromEntries(r.actions.map((a) => [a.cle, a.statut])),
      references: referencesDuDossier(r.dossier as unknown as Dossier),
    },
  };
}

// --- Lancement et rédaction ---------------------------------------------------------------------------------------------

export type Lancement = { ok: true; rapportId: string; deja: boolean } | { ok: false; status: number; erreur: string };

export async function lancerRapport(utilisateur: UtilisateurComplet, agent: AgentCode): Promise<Lancement> {
  const mode = modeRapport(process.env);
  if (mode === "indisponible") return { ok: false, status: 503, erreur: "La rédaction des rapports n'est pas encore ouverte." };
  const actifs = await prisma.objectif.findMany({ where: { userId: utilisateur.id, agent, statut: "ACTIF" }, orderBy: [{ creeLe: "desc" }, { id: "asc" }] });
  if (actifs.length === 0) return { ok: false, status: 409, erreur: "Fixez d'abord votre objectif : le rapport part de là." };
  const prep = await preparerDuCompte(utilisateur, agent, actifs);
  if (!dossierSuffisant(prep.dossier)) return { ok: false, status: 409, erreur: "Répondez d'abord à quelques questions : le rapport s'appuie sur vos réponses." };

  const enCours = await prisma.rapport.findFirst({ where: { objectifId: actifs[0].id, statut: "EN_COURS" }, orderBy: { creeLe: "desc" } });
  if (enCours && !interrompu(enCours)) return { ok: true, rapportId: enCours.id, deja: true };
  if (enCours) await prisma.rapport.update({ where: { id: enCours.id }, data: { statut: "ECHEC", erreur: MESSAGE_ECHEC, detailErreur: "Rédaction interrompue (durée maximale dépassée).", termineLe: new Date() } });

  const r = await prisma.rapport.create({
    data: {
      userId: utilisateur.id,
      agent,
      objectifId: actifs[0].id,
      empreinte: prep.empreinte,
      dossier: prep.dossier as unknown as Prisma.InputJsonValue,
      mode,
      modele: mode === "ia" ? ENSEMBLE.parametresRapport.generation.modele : null,
    },
  });
  return { ok: true, rapportId: r.id, deja: false };
}

// Échecs à provoquer en simulation (contrôle de la reprise après un échec) : RAPPORT_SIMULATION_ECHECS=N fait échouer les N
// premières rédactions de ce serveur.
let echecsSimules = Number(process.env.RAPPORT_SIMULATION_ECHECS ?? 0) || 0;

function redacteurSimulation(d: Dossier): Redacteur {
  return async () => {
    await new Promise((ok) => setTimeout(ok, Number(process.env.RAPPORT_SIMULATION_DELAI_MS ?? 1500)));
    if (echecsSimules > 0) {
      echecsSimules--;
      throw new Error("Échec simulé (RAPPORT_SIMULATION_ECHECS).");
    }
    const sortie = rapportSimule(d);
    return { sortie, contenu: JSON.stringify(sortie), refus: false, tronque: false, modele: "simulation", usage: { entree: 0, sortie: 0 } };
  };
}

export async function executerRapport(rapportId: string): Promise<void> {
  const r = await prisma.rapport.findUnique({ where: { id: rapportId } });
  if (!r || r.statut !== "EN_COURS") return;
  const dossier = r.dossier as unknown as Dossier;
  const p = ENSEMBLE.parametresRapport;
  const redacteur = r.mode === "ia" ? redacteurClaude(p) : redacteurSimulation(dossier);
  let issue;
  try {
    issue = await rediger(dossier, p, redacteur);
  } catch (e) {
    issue = { ok: false as const, erreur: MESSAGE_ECHEC, detail: e instanceof Error ? e.message : String(e), journal: null };
  }
  if (issue.ok) {
    await prisma.$transaction([
      prisma.rapport.update({ where: { id: r.id }, data: { statut: "PRET", contenu: issue.rapport as unknown as Prisma.InputJsonValue, journal: issue.journal as unknown as Prisma.InputJsonValue, modele: issue.journal.modele, termineLe: new Date() } }),
      prisma.actionPlan.createMany({ data: issue.rapport.actions.map((a) => ({ rapportId: r.id, cle: a.id })) }),
    ]);
  } else {
    // Le détail technique reste en base ; le dirigeant voit un message qui dit quoi faire.
    console.error(`Rapport ${r.id} : ${issue.detail}`);
    await prisma.rapport.update({
      where: { id: r.id },
      data: { statut: "ECHEC", erreur: issue.erreur, detailErreur: issue.detail.slice(0, 4000), journal: (issue.journal ?? undefined) as unknown as Prisma.InputJsonValue, termineLe: new Date() },
    });
  }
}

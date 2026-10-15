// Implémentation Prisma du dépôt de l'agent de recherche (serveur et scripts). Le client Prisma est
// injecté : ce fichier n'ouvre pas lui-même de connexion.

import type { NiveauReference, Prisma, PrismaClient, StatutReference } from "@prisma/client";
import type { DepotRecherche, EtatRecherche, Journal, NouvelleReference } from "./orchestrer.ts";
import { reference, type Reference } from "./types.ts";

// Un verrou plus vieux que cette durée est considéré comme abandonné (processus interrompu).
const VERROU_EXPIRE_MINUTES = 30;

function versReference(l: Awaited<ReturnType<PrismaClient["referenceMarche"]["findMany"]>>[number]): Reference | null {
  const r = reference.safeParse({
    id: l.id,
    themeId: l.themeId,
    indicateurId: l.indicateurId,
    niveau: l.niveau.toLowerCase(),
    metier: l.metier || null,
    famille: l.famille || null,
    sousVariante: l.sousVariante || null,
    zone: l.zone,
    trancheTaille: l.trancheTaille,
    valeurCentrale: l.valeurCentrale,
    borneBasse: l.borneBasse,
    borneHaute: l.borneHaute,
    statistique: l.statistique,
    unite: l.unite,
    periode: l.periode,
    sens: l.sens,
    source: l.source,
    secondeSource: l.secondeSource,
    confiance: l.confiance,
    statut: l.statut.toLowerCase(),
    dateExpiration: l.dateExpiration ? l.dateExpiration.toISOString().slice(0, 10) : null,
    version: l.version,
    actif: l.actif,
    nbUtilisations: l.nbUtilisations,
    motif: l.motif,
    creeLe: l.creeLe.toISOString(),
  });
  return r.success ? r.data : null;
}

export function depotPrisma(prisma: PrismaClient): DepotRecherche {
  return {
    async prendreVerrou(indicateurId, metier) {
      return prisma.$transaction(async (tx) => {
        // Un seul processus à la fois pour un couple : verrou de transaction PostgreSQL.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${indicateurId}|${metier}`}))`;
        const limite = new Date(Date.now() - VERROU_EXPIRE_MINUTES * 60_000);
        const enCours = await tx.rechercheReference.count({ where: { indicateurId, metier, etat: "en_cours", debutLe: { gt: limite } } });
        if (enCours > 0) return null;
        const r = await tx.rechercheReference.create({ data: { indicateurId, metier, etat: "en_cours" } });
        return r.id;
      });
    },

    async tentatives(indicateurId, metier) {
      // Les erreurs techniques (réseau, refus) ne comptent pas : seules les recherches menées au bout.
      return prisma.rechercheReference.count({ where: { indicateurId, metier, etat: { in: ["acceptee", "a_revoir", "aucune_reference", "rejetee"] } } });
    },

    async referencesMetier(indicateurId, metier) {
      const lignes = await prisma.referenceMarche.findMany({ where: { indicateurId, niveau: "METIER", metier } });
      return lignes.map(versReference).filter((r): r is Reference => r !== null);
    },

    async depenseCentimes(depuis) {
      const r = await prisma.rechercheReference.aggregate({ _sum: { coutCentimes: true }, where: { debutLe: { gte: depuis } } });
      return r._sum.coutCentimes ?? 0;
    },

    async valeursPairs(indicateurId, metiers) {
      if (metiers.length === 0) return [];
      const lignes = await prisma.referenceMarche.findMany({
        where: { indicateurId, niveau: "METIER", metier: { in: metiers }, actif: true, statut: { in: ["ACTIF", "VALIDE_FONDATEUR"] }, valeurCentrale: { not: null } },
        select: { valeurCentrale: true },
      });
      return lignes.map((l) => l.valeurCentrale as number);
    },

    async enregistrer(r: NouvelleReference) {
      const cle = {
        indicateurId: r.indicateurId,
        niveau: r.niveau.toUpperCase() as NiveauReference,
        metier: r.metier ?? "",
        famille: r.famille ?? "",
        sousVariante: r.sousVariante ?? "",
        zone: r.zone,
        trancheTaille: r.trancheTaille,
      } as const;
      return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ref|${r.indicateurId}|${cle.metier}|${cle.famille}|${cle.sousVariante}|${cle.zone}|${cle.trancheTaille}`}))`;
        const derniere = await tx.referenceMarche.aggregate({ _max: { version: true }, where: cle });
        // Une seule version active par clé : la nouvelle remplace l'ancienne ; l'ancienne reste en base.
        if (r.actif) await tx.referenceMarche.updateMany({ where: { ...cle, actif: true }, data: { actif: false } });
        const cree = await tx.referenceMarche.create({
          data: {
            themeId: r.themeId,
            ...cle,
            valeurCentrale: r.valeurCentrale,
            borneBasse: r.borneBasse,
            borneHaute: r.borneHaute,
            statistique: r.statistique,
            unite: r.unite,
            periode: r.periode,
            sens: r.sens,
            source: (r.source ?? undefined) as Prisma.InputJsonValue | undefined,
            secondeSource: (r.secondeSource ?? undefined) as Prisma.InputJsonValue | undefined,
            confiance: r.confiance,
            statut: r.statut.toUpperCase() as StatutReference,
            dateExpiration: r.dateExpiration ? new Date(`${r.dateExpiration}T00:00:00Z`) : null,
            version: (derniere._max?.version ?? 0) + 1,
            actif: r.actif,
            motif: r.motif,
          },
        });
        return cree.id;
      });
    },

    async cloturer(rechercheId: string, etat: EtatRecherche, journal: Journal, coutCentimes: number, referenceId: string | null) {
      await prisma.rechercheReference.update({
        where: { id: rechercheId },
        data: { etat, finLe: new Date(), journal: journal as unknown as Prisma.InputJsonValue, coutCentimes, referenceId },
      });
    },
  };
}

// Lecture des références de marché dans la base (serveur). Le moteur, lui, ne lit que des objets
// `Reference` : ce fichier est la seule porte entre la base et lui. Une ligne invalide est ignorée et
// signalée, jamais utilisée : un rapport n'est pas bloqué par une mauvaise ligne.

import { prisma } from "../prisma";
import { reference, type Reference } from "./types";

type Ligne = Awaited<ReturnType<typeof prisma.referenceMarche.findMany>>[number];

const ouNull = (v: string) => (v === "" ? null : v);
const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function ligneVersReference(l: Ligne): unknown {
  return {
    id: l.id,
    themeId: l.themeId,
    indicateurId: l.indicateurId,
    niveau: l.niveau.toLowerCase(),
    metier: ouNull(l.metier),
    famille: ouNull(l.famille),
    sousVariante: ouNull(l.sousVariante),
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
    dateExpiration: jour(l.dateExpiration),
    version: l.version,
    actif: l.actif,
    nbUtilisations: l.nbUtilisations,
    motif: l.motif,
    creeLe: l.creeLe.toISOString(),
  };
}

// Références actives pour des indicateurs donnés (toutes versions actives, tous niveaux).
export async function chargerReferencesActives(indicateurs: string[]): Promise<{ references: Reference[]; ignorees: string[] }> {
  if (indicateurs.length === 0) return { references: [], ignorees: [] };
  const lignes = await prisma.referenceMarche.findMany({
    where: { indicateurId: { in: indicateurs }, actif: true, statut: { in: ["ACTIF", "VALIDE_FONDATEUR"] } },
  });
  const references: Reference[] = [];
  const ignorees: string[] = [];
  for (const l of lignes) {
    const r = reference.safeParse(ligneVersReference(l));
    if (r.success) references.push(r.data);
    else ignorees.push(l.id);
  }
  return { references, ignorees };
}

import type { ProgressionAgent } from "@/lib/audit/progression";

// Ce que la carte d'un agent montre de son audit, d'après la progression calculée par le serveur (aucune règle nouvelle) :
// trois états visibles (disponible, en cours, analyse disponible) et le cas d'un questionnaire encore en préparation.
export type Statut = "disponible" | "en_cours" | "analyse" | "preparation" | "non_inclus";

export type EtatAudit = {
  statut: Statut;
  libelle: string;
  action: string;
  // Page ouverte par l'action : l'audit de l'agent, ou ses résultats quand le questionnaire est terminé.
  etapeResultats: boolean;
  // Part des questions traitées, quand elle est connue (questionnaire commencé ou terminé).
  pourcent: number | null;
};

export function etatAudit(p: ProgressionAgent): EtatAudit {
  const pourcent = p.questions > 0 ? Math.min(100, Math.round((p.traitees / p.questions) * 100)) : null;
  switch (p.etape) {
    case "objectif":
      return { statut: "disponible", libelle: "Disponible", action: "Commencer mon audit", etapeResultats: false, pourcent: null };
    case "niveau":
      return { statut: "en_cours", libelle: "Audit en cours", action: "Continuer mon audit", etapeResultats: false, pourcent: null };
    case "questionnaire":
      return { statut: "en_cours", libelle: "Audit en cours", action: "Continuer mon audit", etapeResultats: false, pourcent: pourcent ?? 0 };
    case "termine":
      return { statut: "analyse", libelle: "Analyse disponible", action: "Voir mon analyse", etapeResultats: true, pourcent: 100 };
    case "en_preparation":
      return { statut: "preparation", libelle: "En préparation", action: "Voir mon audit", etapeResultats: false, pourcent: null };
  }
}

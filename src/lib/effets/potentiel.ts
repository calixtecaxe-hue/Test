// Ce qu'une action peut rapporter à un client : le moteur applique le taux d'effet sourcé de son métier à
// ses propres volumes (décision du 19 octobre). L'IA ne choisit jamais le pourcentage.
//
//   - Taux sourcé et vérifié : potentiel chiffré (fourchette), toujours présenté comme un potentiel.
//   - Pas de taux : seul le montant réellement en jeu (calculé sur les réponses du client) est donné, jamais un
//     gain. Un rapport n'est jamais bloqué.
//   - Plusieurs actions : on n'additionne jamais les effets (deux actions sur la même étape se partagent les
//     mêmes clients) ; l'effet de l'ensemble se calcule en recalculant la chaîne (moteur/chaine.ts).
//
// Fonctions pures : ce fichier n'appelle ni réseau ni base.

import { choisirReference, type ContexteReference } from "../references/cascade.ts";
import type { Reference } from "../references/types.ts";
import type { EffetCatalogue } from "../donnees/schemas.ts";

export type PotentielAction =
  | {
      genre: "chiffre";
      // Montant réellement en jeu, calculé sur les réponses du client (par exemple devis sans réponse × montant moyen).
      enJeu: number;
      // Fourchette prudente : bornes de la source quand elle en donne, sinon la valeur centrale seule.
      bas: number;
      central: number;
      haut: number;
      // Taux appliqué, en pourcentage, et ce qui permet de le citer.
      tauxPourcent: number;
      confiance: "solide" | "indicatif";
      source: NonNullable<Reference["source"]>;
      // Niveau de la référence : métier, ou repli sur la famille de métiers.
      niveau: "metier" | "famille" | "national";
      // Échéance dépassée : le taux reste utilisé mais est à revérifier.
      aReverifier: boolean;
    }
  | { genre: "en_jeu"; enJeu: number; motif: "aucun_taux_source" }
  | { genre: "aucun"; motif: "volume_inconnu" };

const arrondi = (n: number) => Math.round(n * 100) / 100;

export function potentielAction(args: {
  effet: Pick<EffetCatalogue, "id" | "nationalAutorise">;
  references: Reference[];
  contexte: ContexteReference;
  // Montant en jeu pour ce client ; null quand ses réponses ne permettent pas de le calculer.
  enJeu: number | null;
  aujourdhui: Date;
}): PotentielAction {
  if (args.enJeu === null || !Number.isFinite(args.enJeu) || args.enJeu < 0) return { genre: "aucun", motif: "volume_inconnu" };
  const retenue = choisirReference(args.references, args.effet, args.contexte, args.aujourdhui);
  const r = retenue?.reference;
  if (!retenue || !r || r.valeurCentrale === null || r.source === null || r.confiance === null || r.unite !== "pourcent") {
    return { genre: "en_jeu", enJeu: arrondi(args.enJeu), motif: "aucun_taux_source" };
  }
  const part = (taux: number) => arrondi((args.enJeu as number) * (taux / 100));
  return {
    genre: "chiffre",
    enJeu: arrondi(args.enJeu),
    bas: part(r.borneBasse ?? r.valeurCentrale),
    central: part(r.valeurCentrale),
    haut: part(r.borneHaute ?? r.valeurCentrale),
    tauxPourcent: r.valeurCentrale,
    confiance: r.confiance,
    source: r.source,
    niveau: retenue.niveau,
    aReverifier: retenue.perimee,
  };
}

// Pourquoi on n'additionne pas : trois actions à 6 %, 4 % et 5 % ne font pas 15 %. Cette fonction refuse la
// somme et renvoie le plus grand des effets comme borne basse de l'ensemble ; le chiffre de l'ensemble vient
// du recalcul de la chaîne, pas d'ici.
export function borneBasseDeLEnsemble(potentiels: PotentielAction[]): number | null {
  const centraux = potentiels.flatMap((p) => (p.genre === "chiffre" ? [p.central] : []));
  return centraux.length === 0 ? null : Math.max(...centraux);
}

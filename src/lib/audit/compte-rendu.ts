// Compte rendu d'un audit (étape 4) : ce que le constat du moteur permet d'afficher, sans rien ajouter.
// Le moteur note (vert / orange / rouge), cite un repère de marché sourcé, ou dit qu'il manque des réponses.
// Ce fichier ne fait que classer ces constats pour l'écran ; il ne calcule aucune couleur, aucun chiffre, aucun
// impact. Pas encore construits : l'ordre de priorité et l'impact (étage 2 du moteur), le plan d'action (IA).

import type { Constat } from "../moteur/constat.ts";
import { presenterConstat } from "../moteur/affichage-constat.ts";
import type { Couleur } from "../moteur/notation.ts";

export type LigneTheme = {
  code: string;
  nom: string;
  bloc: string | null;
  couleur: Couleur | null;
  // Couleur calculée avec un seuil sans source, ou sur une valeur estimée.
  aValider: boolean;
  estimee: boolean;
  // Phrase sobre pour le dirigeant, ou null.
  message: string | null;
  reperes: { libelle: string; organisme: string; annee: string; url: string; confiance: "solide" | "indicatif"; perimee: boolean }[];
  couverture: { repondues: number; posees: number } | null;
};

export type VueCompteRendu = {
  // Thèmes notés : du plus faible au plus fort (ordre des couleurs, pas un classement par impact).
  notes: LigneTheme[];
  // Thèmes qui ont un repère de marché sourcé, sans note encore.
  avecRepere: LigneTheme[];
  // Thèmes analysés à partir des seuls chiffres du dirigeant, sans repère de marché.
  sansRepere: LigneTheme[];
  // Thèmes auxquels il manque des réponses (moins de la moitié).
  aCompleter: LigneTheme[];
  // Thèmes qui ne s'appliquent pas à l'entreprise, ou qui servent de contexte à l'IA : comptés, jamais listés.
  masques: number;
  contexte: number;
};

const ORDRE_COULEUR: Record<Couleur, number> = { rouge: 0, orange: 1, vert: 2 };

export function composerCompteRendu(constats: Constat[], blocs: ReadonlyMap<string, string>): VueCompteRendu {
  const vue: VueCompteRendu = { notes: [], avecRepere: [], sansRepere: [], aCompleter: [], masques: 0, contexte: 0 };
  for (const c of constats) {
    if (c.statut === "masque") {
      vue.masques++;
      continue;
    }
    if (c.statut === "contexte") {
      vue.contexte++;
      continue;
    }
    const ligne: LigneTheme = {
      code: c.theme,
      nom: c.nom,
      bloc: blocs.get(c.theme) ?? null,
      couleur: c.couleur,
      aValider: c.aValider,
      estimee: c.estimee,
      message: presenterConstat(c).message,
      reperes: c.reperes.map((r) => ({ libelle: r.libelle, organisme: r.organisme, annee: r.annee, url: r.url, confiance: r.confiance, perimee: r.perimee })),
      couverture: c.couverture ? { repondues: c.couverture.repondues, posees: c.couverture.posees } : null,
    };
    if (c.statut === "note") vue.notes.push(ligne);
    else if (c.statut === "reference_disponible") vue.avecRepere.push(ligne);
    else if (c.statut === "non_evalue") vue.aCompleter.push(ligne);
    else vue.sansRepere.push(ligne);
  }
  vue.notes.sort((a, b) => ORDRE_COULEUR[a.couleur!] - ORDRE_COULEUR[b.couleur!]);
  return vue;
}

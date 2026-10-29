// Compte rendu d'un audit (étape 4) : ce que le constat du moteur permet d'afficher, sans rien ajouter.
// Le moteur note (vert / orange / rouge), cite un repère de marché sourcé, ou dit qu'il manque des réponses.
// Ce fichier ne fait que classer ces constats pour l'écran ; il ne calcule aucune couleur, aucun chiffre, aucun
// impact. Pas encore construits : l'ordre de priorité et l'impact (étage 2 du moteur), le plan d'action (IA).

import type { Constat } from "../moteur/constat.ts";
import { presenterConstat } from "../moteur/affichage-constat.ts";
import type { Couleur } from "../moteur/notation.ts";
import type { ResultatEvolution } from "../moteur/evolution.ts";

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
  reperes: { indicateur: string; libelle: string; organisme: string; annee: string; url: string; confiance: "solide" | "indicatif"; perimee: boolean }[];
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
  // Évolutions sur un an (ou 6 mois) d'après les chiffres du dirigeant : établies, ou non établies avec ce qui manque.
  evolutions: ResultatEvolution[];
};

const ORDRE_COULEUR: Record<Couleur, number> = { rouge: 0, orange: 1, vert: 2 };

export function composerCompteRendu(constats: Constat[], blocs: ReadonlyMap<string, string>): VueCompteRendu {
  const vue: VueCompteRendu = { notes: [], avecRepere: [], sansRepere: [], aCompleter: [], masques: 0, contexte: 0, evolutions: [] };
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
      reperes: c.reperes.map((r) => ({ indicateur: r.indicateur, libelle: r.libelle, organisme: r.organisme, annee: r.annee, url: r.url, confiance: r.confiance, perimee: r.perimee })),
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

// --- Évolutions ----------------------------------------------------------------------------------------------------------

const FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const MOINS = "−";

function signe(n: number, texte: string): string {
  return n > 0 ? `+${texte}` : n < 0 ? `${MOINS}${texte}` : texte;
}

function valeur(n: number, unite: ResultatEvolution["unite"]): string {
  const t = FORMAT.format(Math.abs(n) < 100 || unite === "pourcent" ? Math.round(n * 10) / 10 : Math.round(n));
  return unite === "euros" ? `${t} €` : unite === "pourcent" ? `${t} %` : t;
}

// Phrases d'une évolution pour l'écran : deux chiffres, leurs mois, l'écart, sans jamais dire si c'est bien ou mal.
export function phraseEvolution(r: ResultatEvolution): string | null {
  if (!r.actuel || !r.passe) return null;
  const deux = `${valeur(r.actuel.valeur, r.unite)} (${r.actuel.periode}), contre ${valeur(r.passe.valeur, r.unite)} (${r.passe.periode}).`;
  if (r.statut !== "etablie" || r.ecart === null) return deux;
  if (r.ecart === 0) return `${deux} Écart : aucun.`;
  const ecart = r.mesure === "points" ? signe(r.ecart, `${FORMAT.format(Math.abs(Math.round(r.ecart * 10) / 10))} point${Math.abs(r.ecart) >= 2 ? "s" : ""}`) : signe(r.ecart, valeur(Math.abs(r.ecart), r.unite));
  const relatif = r.ecartRelatif !== null ? `, soit ${signe(r.ecartRelatif, `${FORMAT.format(Math.abs(r.ecartRelatif))} %`)}` : "";
  return `${deux} Écart : ${ecart}${relatif}.`;
}

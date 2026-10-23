// Chaîne de calcul vers l'objectif et période commune (CLAUDE.md sections 6 et 7).
//
//   - Plusieurs leviers : on recalcule toute la chaîne, on n'additionne jamais les gains.
//   - Deux leviers sur des étapes différentes se multiplient.
//   - Deux leviers sur la même étape se partagent les mêmes clients : le document ne dit
//     pas comment les combiner, le moteur le signale au lieu d'inventer un chiffre.
//   - La capacité plafonne le gain immédiat : quand elle bloque, deux chiffres.
//   - Jamais deux périodes mélangées : tout est ramené au mois.
//
// Ce fichier n'a aucune dépendance : il se teste directement avec Node.

export const SEMAINES_PAR_MOIS = 4.3;

export type Periode = "jour" | "semaine" | "mois" | "trimestre" | "an";

// Ramène un volume au mois. Pour une valeur « par jour », les jours d'ouverture par
// semaine sont nécessaires (par jour × jours ouverts par semaine × 4,3).
export function ramenerAuMois(valeur: number, periode: Periode, joursOuvertsParSemaine?: number): number {
  switch (periode) {
    case "mois":
      return valeur;
    case "jour": {
      if (joursOuvertsParSemaine === undefined || !(joursOuvertsParSemaine > 0) || joursOuvertsParSemaine > 7) {
        throw new RangeError("Les jours d'ouverture par semaine (de 1 à 7) sont nécessaires pour ramener une valeur par jour au mois.");
      }
      return valeur * joursOuvertsParSemaine * SEMAINES_PAR_MOIS;
    }
    case "semaine":
      return valeur * SEMAINES_PAR_MOIS;
    case "trimestre":
      return valeur / 3;
    case "an":
      return valeur / 12;
  }
}

// Une étape de la chaîne : le volume qui entre et la part qui passe à l'étape suivante.
export type Etape = { id: string; taux: number };

// Un levier améliore le taux d'une étape.
export type Levier = { etape: string; nouveauTaux: number };

export type Chaine = { entrant: number; etapes: Etape[] };

// Volume final = entrant × produit des taux. Les taux sont entre 0 et 1.
export function volumeFinal(chaine: Chaine, leviers: Levier[] = []): number {
  const taux = new Map(chaine.etapes.map((e) => [e.id, e.taux]));
  for (const l of leviers) {
    if (!taux.has(l.etape)) throw new RangeError(`Étape inconnue : ${l.etape}.`);
  }
  for (const l of leviers) taux.set(l.etape, l.nouveauTaux);
  let v = chaine.entrant;
  for (const e of chaine.etapes) v *= taux.get(e.id)!;
  return v;
}

export type ResultatLeviers =
  | { ok: true; avant: number; apres: number; gain: number }
  // Deux leviers sur la même étape : règle de combinaison à préciser, aucun chiffre inventé.
  | { ok: false; raison: "meme_etape"; etapes: string[] };

export function appliquerLeviers(chaine: Chaine, leviers: Levier[]): ResultatLeviers {
  const vues = new Map<string, number>();
  for (const l of leviers) vues.set(l.etape, (vues.get(l.etape) ?? 0) + 1);
  const doublons = [...vues].filter(([, n]) => n > 1).map(([e]) => e);
  if (doublons.length > 0) return { ok: false, raison: "meme_etape", etapes: doublons };
  const avant = volumeFinal(chaine);
  const apres = volumeFinal(chaine, leviers);
  return { ok: true, avant, apres, gain: apres - avant };
}

export type GainAvecCapacite = {
  // Gain possible avec la capacité actuelle.
  immediat: number;
  // Gain une fois la capacité augmentée ; égal à `immediat` quand la capacité ne bloque pas.
  apresCapacite: number;
  capaciteBloque: boolean;
};

// La capacité (ventes réalisables par mois) plafonne le volume final : au-delà, les
// demandes supplémentaires ne peuvent pas être servies.
export function gainAvecCapacite(avant: number, apres: number, capacite: number): GainAvecCapacite {
  const plafonne = Math.min(apres, Math.max(capacite, avant));
  return {
    immediat: plafonne - avant,
    apresCapacite: apres - avant,
    capaciteBloque: apres > Math.max(capacite, avant),
  };
}

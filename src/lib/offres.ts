// Offres d'abonnement (prix hors taxes), par paliers selon le nombre
// d'agents choisis. Montants en centimes pour que les calculs restent exacts.

export const REMISE_ANNUELLE_POURCENT = 15;

export type Offre = {
  nombreAgents: 2 | 3 | 4;
  prixMensuelCentimesHT: number;
};

export const OFFRES: Offre[] = [
  { nombreAgents: 2, prixMensuelCentimesHT: 5999 },
  { nombreAgents: 3, prixMensuelCentimesHT: 7999 },
  { nombreAgents: 4, prixMensuelCentimesHT: 9999 },
];

// 12 mois, remise annuelle appliquée.
export function prixAnnuelCentimesHT(prixMensuelCentimesHT: number): number {
  return Math.round(
    (prixMensuelCentimesHT * 12 * (100 - REMISE_ANNUELLE_POURCENT)) / 100
  );
}

// Équivalent mensuel d'un abonnement annuel.
export function prixMensuelEquivalentAnnuelCentimesHT(
  prixMensuelCentimesHT: number
): number {
  return Math.round(
    (prixMensuelCentimesHT * (100 - REMISE_ANNUELLE_POURCENT)) / 100
  );
}

export function formaterEuros(centimes: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(centimes / 100);
}

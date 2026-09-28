// Référentiel des métiers proposés à l'inscription.
//
// CLAUDE.md section 5 : sept catégories de modèle économique existent,
// mais seule l'agence immobilière (catégorie 4, variante "transaction")
// est construite pour l'instant (section 4 et section 9). On ne propose
// donc à l'inscription que ce que le produit sait réellement traiter —
// ajouter un métier plus tard consiste à ajouter une entrée ici, sans
// toucher au reste.

export type SousVariante = {
  id: string;
  libelle: string;
  actif: boolean;
};

export type Metier = {
  id: string;
  libelle: string;
  categorie: string; // catégorie de modèle économique (CLAUDE.md section 5)
  sousVariantes: SousVariante[] | null;
  actif: boolean;
};

export const METIERS: Metier[] = [
  {
    id: "agence-immobiliere",
    libelle: "Agence immobilière indépendante",
    categorie: "Transactions à forte valeur et cycle long",
    sousVariantes: [
      { id: "transaction", libelle: "Transaction (vente et achat)", actif: true },
      { id: "gestion-locative", libelle: "Gestion locative", actif: false },
      { id: "syndic", libelle: "Syndic", actif: false },
      { id: "conciergerie-saisonniere", libelle: "Conciergerie saisonnière", actif: false },
    ],
    actif: true,
  },
];

export function getMetier(id: string): Metier | undefined {
  return METIERS.find((m) => m.id === id);
}

export function getSousVariante(metierId: string, sousVarianteId: string | null | undefined) {
  const metier = getMetier(metierId);
  if (!metier?.sousVariantes) return undefined;
  return metier.sousVariantes.find((v) => v.id === sousVarianteId);
}

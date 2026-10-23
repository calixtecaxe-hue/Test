// Ce que l'on sait d'un compte à chaque étape du parcours (CLAUDE.md section 10) : identifiants seuls,
// puis métier (avant la formule), puis dossier d'entreprise (après le paiement). Les champs vides sont
// `null` en base ; ces fonctions disent où en est le compte et rassurent le typage pour la suite.
//
// Ce fichier n'importe que des types : il se teste directement avec Node.

import type { Prisma, TypeZone, User } from "@prisma/client";
import type { CompteRoutable } from "./routage.ts";

export type UtilisateurAvecMetier = User & { metierPrecis: string; categorie: string };

export type UtilisateurComplet = UtilisateurAvecMetier & {
  chiffreAffairesMensuel: Prisma.Decimal;
  nombreCollaborateurs: number;
  dateCreationEntreprise: Date;
  typeZone: TypeZone;
  ville: string;
};

export function aSonMetier<T extends Pick<User, "metierPrecis" | "categorie">>(u: T): u is T & { metierPrecis: string; categorie: string } {
  return u.metierPrecis !== null && u.categorie !== null;
}

export function aSonDossier(u: Pick<User, "chiffreAffairesMensuel" | "nombreCollaborateurs" | "dateCreationEntreprise" | "typeZone" | "ville">): boolean {
  return u.chiffreAffairesMensuel !== null && u.nombreCollaborateurs !== null && u.dateCreationEntreprise !== null && u.typeZone !== null && u.ville !== null && u.ville !== "";
}

export function estComplet(u: User): u is UtilisateurComplet {
  return aSonMetier(u) && aSonDossier(u);
}

// L'étape du parcours à laquelle ramener un compte qui n'a pas ce qu'il faut pour aller plus loin.
export type EtapeManquante = "metier" | "dossier" | null;
export function etapeManquante(u: User): EtapeManquante {
  if (!aSonMetier(u)) return "metier";
  return aSonDossier(u) ? null : "dossier";
}

// Ce qu'il faut au routage pour savoir quels agents le compte peut souscrire ; null tant que le métier manque.
export function compteRoutable(u: { metierPrecis: string | null; categorie: string | null; sousVariantes: string[] }): CompteRoutable | null {
  return u.metierPrecis !== null && u.categorie !== null ? { metierPrecis: u.metierPrecis, categorie: u.categorie, sousVariantes: u.sousVariantes } : null;
}

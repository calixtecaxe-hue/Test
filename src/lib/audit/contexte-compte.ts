// Contexte d'un compte pour lire ses réponses actives (reponses-actives.ts) hors de l'assemblage : total proposé à la
// Finance, contrôle d'un chiffre « prérempli ». Serveur et scripts.
import { ENSEMBLE } from "./donnees-audit";
import { appliquerExclusions } from "./assemblage";
import { ancienneteEnMois, tailleDepuisEffectif } from "./affichage";
import { reponsesActives, type ContexteActives } from "./reponses-actives";
import { exclusionsAcquisition, metierDuCompte } from "../routage";
import { PROFILS, type ProfilId } from "../donnees/schemas";
import type { Reponses } from "./reponse";
import type { Formulation } from "./partages";
import { vocabulaireDuCompte } from "../vocabulaire";

export type CompteActif = {
  profils: string[];
  metierPrecis: string | null;
  categorie: string | null;
  sousVariantes: string[];
  nombreCollaborateurs: number | null;
  dateCreationEntreprise: Date | null;
};

export function contexteActives(u: CompteActif): ContexteActives {
  const exclusions = u.metierPrecis && u.categorie ? exclusionsAcquisition(ENSEMBLE.routage, { metierPrecis: u.metierPrecis, categorie: u.categorie, sousVariantes: u.sousVariantes }) : null;
  return {
    profils: u.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p)),
    taille: tailleDepuisEffectif(u.nombreCollaborateurs ?? 1),
    ancienneteMois: u.dateCreationEntreprise ? ancienneteEnMois(u.dateCreationEntreprise, new Date()) : undefined,
    metier: metierDuCompte(ENSEMBLE.routage, u),
    themesExclus: exclusions?.themes ?? [],
  };
}

export function reponsesActivesDuCompte(u: CompteActif, reponses: Reponses): Reponses {
  const exclusions = u.metierPrecis && u.categorie ? exclusionsAcquisition(ENSEMBLE.routage, { metierPrecis: u.metierPrecis, categorie: u.categorie, sousVariantes: u.sousVariantes }) : null;
  return reponsesActives(ENSEMBLE, appliquerExclusions(reponses, exclusions, ENSEMBLE.reglesAffichage), contexteActives(u));
}

// Mots avec lesquels le compte lit les questions (profils, vocabulaire du métier) : un lien entre deux questions peut en
// dépendre (data/partages.json).
export function formulationDuCompte(u: CompteActif): Formulation {
  return {
    profils: u.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p)),
    vocabulaire: vocabulaireDuCompte(ENSEMBLE.vocabulairesMetiers, metierDuCompte(ENSEMBLE.routage, u)),
  };
}

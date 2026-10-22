import type { UtilisateurComplet } from "../compte";
import { ENSEMBLE } from "./donnees-audit";
import { assemblerQuestionnaire } from "./assemblage";
import { ancienneteEnMois, tailleDepuisEffectif } from "./affichage";
import { reponsesDuCompte } from "./compte";
import { composerCompteRendu, type VueCompteRendu } from "./compte-rendu";
import { PROFILS, type ProfilId } from "../donnees/schemas";
import { constaterAgent } from "../moteur/constat";
import { contexteReference } from "../references/contexte";
import { chargerReferencesActives } from "../references/depot";
import { exclusionsAcquisition } from "../routage";
import type { AgentCode } from "@prisma/client";

// Le constat du moteur pour un agent, sur les réponses réelles du compte (étape 4 du parcours).
// Les références de marché lues sont celles enregistrées en base, jamais cherchées ici ; sans elles, un thème
// de nature Marché s'affiche avec les chiffres du dirigeant et sans comparaison.
export async function compteRenduDuCompte(utilisateur: UtilisateurComplet, agent: AgentCode): Promise<VueCompteRendu> {
  const profils = utilisateur.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p));
  const taille = tailleDepuisEffectif(utilisateur.nombreCollaborateurs);
  const exclusions = exclusionsAcquisition(ENSEMBLE.routage, utilisateur);
  const reponses = await reponsesDuCompte(utilisateur.id);
  const a = assemblerQuestionnaire(ENSEMBLE, {
    agent,
    profils,
    taille,
    niveau: utilisateur.niveauAudit === "APPROFONDI" ? "approfondi" : "essentiel",
    reponses,
    ancienneteMois: ancienneteEnMois(utilisateur.dateCreationEntreprise, new Date()),
    exclusions,
  });

  const zone = utilisateur.typeZone;
  const indicateurs = ENSEMBLE.catalogue.filter((f) => a.themes.some((t) => t.theme.code === f.theme)).flatMap((f) => f.indicateurs.map((i) => i.id));
  const { references } = await chargerReferencesActives(indicateurs);
  const ctxRef = contexteReference(ENSEMBLE.routage, {
    metierPrecis: utilisateur.metierPrecis,
    sousVariantes: utilisateur.sousVariantes,
    categorie: utilisateur.categorie,
    typeZone: zone,
    effectif: utilisateur.nombreCollaborateurs,
  });

  const constats = constaterAgent(ENSEMBLE, ENSEMBLE.seuils, a, reponses, {
    zone,
    taille,
    references,
    contexteReference: ctxRef ?? undefined,
  });
  const blocs = new Map(ENSEMBLE.themes.map((t) => [t.code, t.bloc] as const));
  return composerCompteRendu(constats, blocs);
}

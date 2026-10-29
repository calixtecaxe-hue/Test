import type { UtilisateurComplet } from "../compte";
import { ENSEMBLE } from "./donnees-audit";
import { assemblerQuestionnaire } from "./assemblage";
import { equivalences, lecturePartagee, questionsLiees } from "./partages";
import { ancienneteEnMois, tailleDepuisEffectif } from "./affichage";
import { agentsActifs, ancragesDesReponses, reponsesDuCompte } from "./compte";
import { reponsesActivesDuCompte } from "./contexte-compte";
import { lignesActuelles } from "./reponses-actives";
import { specDeLaDonnee } from "./validation";
import { moisDe } from "./periodes";
import { calculerEvolutions } from "../moteur/evolution";
import { formuler } from "../donnees/lexique";
import { composerCompteRendu, type VueCompteRendu } from "./compte-rendu";
import { PROFILS, type ProfilId } from "../donnees/schemas";
import { constaterAgent } from "../moteur/constat";
import { contexteReference } from "../references/contexte";
import { chargerReferencesActives } from "../references/depot";
import { exclusionsAcquisition, metierDuCompte } from "../routage";
import { vocabulaireDuCompte } from "../vocabulaire";
import type { AgentCode } from "@prisma/client";

// Le constat du moteur pour un agent, sur les réponses réelles du compte (étape 4 du parcours).
// Les références de marché lues sont celles enregistrées en base, jamais cherchées ici ; sans elles, un thème
// de nature Marché s'affiche avec les chiffres du dirigeant et sans comparaison.
export async function compteRenduDuCompte(utilisateur: UtilisateurComplet, agent: AgentCode): Promise<VueCompteRendu> {
  const profils = utilisateur.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p));
  const taille = tailleDepuisEffectif(utilisateur.nombreCollaborateurs);
  const exclusions = exclusionsAcquisition(ENSEMBLE.routage, utilisateur);
  const reponses = await reponsesDuCompte(utilisateur.id, utilisateur);
  const a = assemblerQuestionnaire(ENSEMBLE, {
    agent,
    profils,
    taille,
    niveau: utilisateur.niveauAudit === "APPROFONDI" ? "approfondi" : "essentiel",
    reponses,
    ancienneteMois: ancienneteEnMois(utilisateur.dateCreationEntreprise, new Date()),
    exclusions,
    vocabulaire: vocabulaireDuCompte(ENSEMBLE.vocabulairesMetiers, metierDuCompte(ENSEMBLE.routage, utilisateur)),
    metier: metierDuCompte(ENSEMBLE.routage, utilisateur),
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

  // Seules les réponses actives comptent : une réponse à une question devenue inapplicable, ou la case d'un canal décoché, n'entre
  // ni dans la couverture d'un thème, ni dans une note.
  const constats = constaterAgent(ENSEMBLE, ENSEMBLE.seuils, a, a.reponsesActives, {
    zone,
    taille,
    references,
    contexteReference: ctxRef ?? undefined,
  });
  const blocs = new Map(ENSEMBLE.themes.map((t) => [t.code, t.bloc] as const));

  // Évolutions sur un an (ou 6 mois) : les chiffres du dirigeant comparés à ses propres chiffres passés, sans repère de marché.
  // Les questions posées à ce compte, par l'un de ses agents, décident de ce qui peut être comparé.
  const vocabulaire = vocabulaireDuCompte(ENSEMBLE.vocabulairesMetiers, metierDuCompte(ENSEMBLE.routage, utilisateur));
  const niveau = utilisateur.niveauAudit === "APPROFONDI" ? "approfondi" : "essentiel";
  const posees = new Set<string>();
  for (const ag of await agentsActifs(utilisateur.id)) {
    const x = ag === agent ? a : assemblerQuestionnaire(ENSEMBLE, { agent: ag, profils, taille, niveau, reponses, ancienneteMois: ancienneteEnMois(utilisateur.dateCreationEntreprise, new Date()), exclusions, vocabulaire, metier: metierDuCompte(ENSEMBLE.routage, utilisateur) });
    for (const q of [...x.prealables, ...x.themes.flatMap((t) => t.questions)]) posees.add(q.code);
  }
  const actives = reponsesActivesDuCompte(utilisateur, reponses);
  const equiv = equivalences(ENSEMBLE, { profils, vocabulaire });
  const nomDe = (code: string) => {
    const q = ENSEMBLE.banque.find((b) => b.donnee === code);
    const f = q ? formuler(q.texte, profils, ENSEMBLE.lexique, vocabulaire) : null;
    return f?.ok ? f.texte : ENSEMBLE.donnees.find((d) => d.code === code)?.libelle ?? code;
  };
  const evolutions = calculerEvolutions(ENSEMBLE.evolutions.evolutions, agent, {
    reponses: actives,
    ancrages: await ancragesDesReponses(utilisateur.id),
    aujourdhui: moisDe(new Date()),
    creation: moisDe(utilisateur.dateCreationEntreprise),
    ancienneteMois: ancienneteEnMois(utilisateur.dateCreationEntreprise, new Date()),
    donnees: new Map(ENSEMBLE.donnees.map((d) => [d.code, d])),
    partage: lecturePartagee(ENSEMBLE, actives, equiv),
    liees: questionsLiees(ENSEMBLE, equiv),
    posees,
    lignesActuelles: (code) => {
      const spec = specDeLaDonnee(ENSEMBLE, code).spec;
      return spec?.type === "tableau" ? lignesActuelles(spec, actives, ENSEMBLE.reglesAffichage) : null;
    },
    nomDe,
    effectifActuel: utilisateur.nombreCollaborateurs,
  });
  return { ...composerCompteRendu(constats, blocs), evolutions };
}

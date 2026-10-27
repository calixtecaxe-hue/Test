// Format des fichiers de données de CAXE (dossier `data/`).
//
// CLAUDE.md : aucune question codée en dur ; ajouter un métier ou un thème, c'est
// déposer ou modifier un fichier de données, sans toucher au moteur. Ces schémas
// décrivent ce que le moteur et l'assemblage peuvent attendre de ces fichiers.
//
// Les fichiers sont produits par `scripts/importer-classeur.py` à partir du
// classeur « CAXE_Themes_Chiffres_4_agents », sauf `routage.json` (écrit à la
// main d'après le document de règles) et `banque/questions.json` (la banque de
// questions, pas encore écrite).
//
// Ce fichier n'importe que zod : il se teste directement avec Node.

import { z } from "zod";

export const CODES_AGENT = [
  "ACQUISITION_CA",
  "FINANCE_RENTABILITE",
  "RH_ORGANISATION",
  "COMM_CREATION",
] as const;
export const codeAgent = z.enum(CODES_AGENT);
export type CodeAgent = z.infer<typeof codeAgent>;

// Préfixe des codes de thème et de donnée, par agent.
export const PREFIXE_AGENT: Record<CodeAgent, string> = {
  ACQUISITION_CA: "ACQ",
  FINANCE_RENTABILITE: "FIN",
  RH_ORGANISATION: "RH",
  COMM_CREATION: "COM",
};

import { PROFILS, TAILLES } from "./constantes.ts";
import { reponseSpec } from "./reponse-spec.ts";
export { reponseSpec };
export { PROFILS, TAILLES };
export const profilId = z.enum(PROFILS);
export type ProfilId = z.infer<typeof profilId>;

const codeTheme = z.string().regex(/^(ACQ|FIN|RH|COM)-\d{2}$/, "Code de thème attendu : ACQ-01.");
const codeDonnee = z.string().regex(/^(ACQ|FIN|RH|COM)-\d{2}\.\d{2}$/, "Code de donnée attendu : ACQ-01.01.");
const codeCroisement = z.string().regex(/^X[AFCR]\d{2}$/, "Code de croisement attendu : XA01.");

const marquesProfils = z.object(Object.fromEntries(PROFILS.map((p) => [p, z.boolean()])) as Record<(typeof PROFILS)[number], z.ZodBoolean>);
const marquesTailles = z.object(Object.fromEntries(TAILLES.map((t) => [t, z.boolean()])) as Record<(typeof TAILLES)[number], z.ZodBoolean>);

// --- Thèmes -----------------------------------------------------------------

// Étage 1 : une seule nature de notation par thème. Contexte = non noté.
export const natureNotation = z.enum(["marche", "pratique", "coherence", "contexte"]);

// Étage 2 : impact chiffré (sur une vraie chaîne de calcul) ou qualifié
// (Bloquant / Frein / Secondaire par règles fixes). Jamais de pourcentage inventé.
export const impactTheme = z.discriminatedUnion("type", [
  z.object({ type: z.literal("chiffre"), sur: z.enum(["ca", "tresorerie", "contacts", "marge", "heures"]) }),
  z.object({ type: z.literal("qualifie"), sur: z.null() }),
  z.object({ type: z.literal("aucun"), sur: z.null() }),
]);

export const theme = z.object({
  code: codeTheme,
  agent: codeAgent,
  bloc: z.string().min(1),
  nom: z.string().min(1),
  nature: natureNotation,
  impact: impactTheme,
  chiffreNecessaire: z.enum(["oui", "non", "calcule"]),
  dejaConnu: z.string().nullable(),
  methodeVolume: z.string().nullable(),
  siInconnu: z.string().nullable(),
  // Condition de masquage en clair (« Seul », « Sans stock », …).
  masquePour: z.string().nullable(),
});
export type Theme = z.infer<typeof theme>;

// --- Données ----------------------------------------------------------------

export const modeDonnee = z.enum(["demandee", "importee", "calculee", "partagee", "autre_agent"]);
export const niveauDonnee = z.enum(["essentiel", "approfondi"]);

const donneeBase = {
  code: codeDonnee,
  theme: codeTheme,
  ecran: z.string().nullable(),
  libelle: z.string().min(1),
  format: z.string().nullable(),
  mode: modeDonnee,
  niveau: niveauDonnee.nullable(),
  condition: z.string().nullable(),
  declencheurs: z.array(z.string().regex(/^D\d{2}$/)),
  periode: z.string().nullable(),
  sertA: z.array(z.string()),
  calcul: z.string().nullable(),
  entrees: z.array(z.union([codeDonnee, codeCroisement])),
  entreesTexte: z.string().nullable(),
  utiliseeDans: z.array(z.union([codeDonnee, codeCroisement])),
  utiliseeDansTexte: z.string().nullable(),
};

// Agents Acquisition, Finance, Comm : colonnes par profil d'entreprise.
export const donneeParProfil = z.object({ ...donneeBase, profils: marquesProfils });
// Agent RH : colonnes par taille (seul / 2 à 5 / 6 et plus), pas par métier.
export const donneeParTaille = z.object({ ...donneeBase, tailles: marquesTailles });
export const donnee = z.union([donneeParProfil, donneeParTaille]);
export type Donnee = z.infer<typeof donnee>;

// --- Croisements, scénarios, diagnostic Comm, déclencheurs, lexique -----------

export const croisement = z.object({
  code: codeCroisement,
  agent: codeAgent,
  nom: z.string().min(1),
  calcul: z.string().min(1),
  entrees: z.array(z.union([codeDonnee, codeCroisement])),
  entreesTexte: z.string().nullable(),
  profils: marquesProfils.optional(),
  tailles: marquesTailles.optional(),
  hypotheseExterne: z.string().nullable(),
  phraseRapport: z.string().nullable(),
});
export type Croisement = z.infer<typeof croisement>;

export const scenario = z.object({
  code: z.string().regex(/^S\d{2}$/),
  nom: z.string().min(1),
  calcul: z.string().min(1),
  entrees: z.array(z.union([codeDonnee, codeCroisement])),
  entreesTexte: z.string().nullable(),
  phraseRapport: z.string().nullable(),
});

export const diagnosticComm = z.object({
  problemes: z.array(
    z.object({
      code: z.string().regex(/^DC\d{2}$/),
      probleme: z.string().min(1),
      signaux: z.string().min(1),
      entrees: z.array(z.union([codeDonnee, codeCroisement])),
      entreesTexte: z.string().nullable(),
      recommande: z.string().min(1),
      neRecommandePas: z.string().min(1),
    })
  ),
  ordreLectureChiffres: z.array(z.string()),
  regleChiffresDeVanite: z.string().nullable(),
});

export const declencheur = z.object({
  code: z.string().regex(/^D\d{2}$/),
  question: z.string().min(1),
  posee: z.string().min(1),
  reponses: z.string().min(1),
  effet: z.string().min(1),
  donneesConcernees: z.number().int().nullable(),
});

// Une même question, les mots du métier : une forme par profil.
export const motLexique = z.object({
  mot: z.string().min(1),
  // Mot écrit dans un gabarit, quand il ne se déduit pas du libellé (« jours_ouverture »).
  cle: z.string().regex(/^[a-z0-9_]+$/).optional(),
  // Lexiques propres à un métier (hébergement, négoce, cabinet…) : pas encore branchés sur le moteur.
  metiers: z.record(z.string(), z.string().nullable()).optional(),
  formes: z.object(Object.fromEntries(PROFILS.map((p) => [p, z.string().nullable()])) as Record<(typeof PROFILS)[number], z.ZodNullable<z.ZodString>>),
});

// --- Règles d'affichage (conditions, masquages, réponses des déclencheurs) ------

// Réponses connues du dirigeant : clé → valeur (« D07 » → « oui », « D03 » → liste de
// canaux, « D08.achats » → « non »). D02 (effectif) vient du compte.
//
// Depuis le 20 octobre, une clé peut aussi être **la réponse à une donnée** : « ACQ-10.06 » (la valeur),
// « FIN-10.01#retours_par_mois » (un champ d'une question à plusieurs champs) ou
// « RH-32.01#demission.departs » (une case d'un tableau : ligne.colonne). C'est ce que le classeur appelle un
// déclencheur dérivé (D28 à D65) : la question suivante attend que celle-ci soit répondue.
const operateur = z.enum(["egal", "different", "contient", "non_vide", "vide", "dans", "moins_de", "plus_de"]);
const regleSimple = z.object({
  cle: z.string().min(1),
  op: operateur,
  valeur: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
});
export type RegleSimple = z.infer<typeof regleSimple>;
export type Regle = RegleSimple | { tous: Regle[] } | { un: Regle[] } | { aPreciser: string } | { toujours: true };
export const regle: z.ZodType<Regle> = z.lazy(() =>
  z.union([
    regleSimple,
    z.object({ tous: z.array(regle).min(1) }),
    z.object({ un: z.array(regle).min(1) }),
    // Règle que le classeur ne permet pas de trancher : la question reste affichée.
    z.object({ aPreciser: z.string().min(1) }),
    // Question toujours posée (le total pré-rempli se propose, il ne remplace pas la question).
    z.object({ toujours: z.literal(true) }),
  ])
);

// Comment poser un déclencheur au dirigeant. Les libellés viennent du classeur.
const optionDeclencheur = z.object({ id: z.string(), libelle: z.string() });
export const formeDeclencheur = z.discriminatedUnion("type", [
  z.object({ type: z.literal("oui_non") }),
  z.object({ type: z.literal("cases"), options: z.array(optionDeclencheur) }),
  z.object({ type: z.literal("choix"), options: z.array(optionDeclencheur) }),
  // Déclencheur qui est lui-même une question de la banque (D03 = ACQ-03.01…) : on ne le pose pas au cadrage,
  // sa réponse est celle de la donnée.
  z.object({ type: z.literal("reponse_donnee"), donnee: z.string().regex(/^(ACQ|FIN|RH|COM)-\d{2}\.\d{2}$/) }),
  // Plusieurs oui / non à la suite. Une sous-question peut dépendre d'une réponse précédente.
  z.object({
    type: z.literal("oui_non_multiple"),
    sousCles: z.array(
      z.object({
        cle: z.string(),
        libelle: z.string(),
        siCle: z.object({ cle: z.string(), egal: z.string() }).optional(),
      })
    ),
  }),
]);
export type FormeDeclencheur = z.infer<typeof formeDeclencheur>;

export const reglesAffichage = z.object({
  source: z.string(),
  declencheurs: z.record(z.string().regex(/^D\d{2}$/), formeDeclencheur),
  conditions: z.record(z.string(), regle),
  masquages: z.record(z.string(), regle),
});
export type ReglesAffichage = z.infer<typeof reglesAffichage>;

// --- Routage métier → catégorie → profil -------------------------------------

export const stockMetier = z.enum(["oui", "non", "a_demander"]);
export const agentCommMetier = z.enum(["oui", "non", "a_trancher"]);

// Une activité d'un métier à plusieurs sous-parties (« Gestion locative » pour une agence
// immobilière). Elle porte sa propre catégorie, son stock et l'accès à l'agent Comm.
const sousPartie = z.object({
  id: z.string(),
  libelle: z.string(),
  // Questionnaire reçu quand le client ne coche que « Autre (précisez) ».
  defaut: z.boolean().optional(),
  categorie: z.string(),
  stock: stockMetier,
  agentComm: agentCommMetier,
  // Profil propre à l'activité quand la catégorie n'en donne pas (réglementé).
  profils: z.array(profilId).optional(),
  // Profils qui remplacent ceux de la catégorie pour cette activité (hôtel : hébergement → location, restaurant → restaurant).
  profilsImposes: z.array(profilId).optional(),
  aConfirmer: z.string().optional(),
});

export const routage = z.object({
  source: z.string(),
  note: z.string(),
  profils: z.array(z.object({ id: profilId, libelle: z.string() })),
  categories: z.array(
    z.object({
      numero: z.number().int(),
      id: z.string(),
      libelle: z.string(),
      profils: z.array(profilId),
      profilsConditionnels: z.array(z.object({ profil: profilId, condition: z.string() })),
      reglementee: z.boolean(),
      // Catégorie dont le questionnaire reste à créer (Fabrication) : aucun profil rattaché.
      aCreer: z.boolean().optional(),
      notes: z.string().nullable(),
    })
  ),
  metiers: z.array(
    z.object({
      id: z.string(),
      libelle: z.string(),
      secteur: z.string(),
      // Catégorie du métier, ou de sa sous-partie par défaut.
      categorie: z.string(),
      // Stock : marchandises achetées d'avance. « À demander » : une question à l'inscription.
      stock: stockMetier,
      // Accès à l'agent Comm. « À trancher » : décision encore ouverte (traité comme « oui »).
      agentComm: agentCommMetier,
      pilote: z.boolean().optional(),
      // Mots que le client peut taper pour trouver ce métier (« consultant RH »).
      synonymes: z.array(z.string()).optional(),
      // Profil propre au métier quand la catégorie n'en donne pas (professions réglementées).
      profils: z.array(profilId).optional(),
      // Profils qui remplacent ceux de la catégorie (hébergement et location de véhicules : profil location).
      profilsImposes: z.array(profilId).optional(),
      aConfirmer: z.string().optional(),
      notes: z.string().optional(),
      sousVariantes: z.array(sousPartie).optional(),
    })
  ),
  reglementees: z.object({
    agentsExclus: z.array(codeAgent),
    nombreMaxAgents: z.number().int(),
    moduleMetier: z.boolean(),
    acquisitionNeRecommandePas: z.array(z.string()),
    // Ce que l'audit Acquisition ne pose pas à ces métiers : questions de cadrage, options de
    // cadrage et thèmes. Données, pas code : on ne demande pas ce qu'on n'a pas le droit de recommander.
    acquisitionExclut: z
      .object({
        declencheurs: z.array(z.string().regex(/^D\d{2}$/)),
        optionsCadrage: z.record(z.string().regex(/^D\d{2}$/), z.array(z.string())),
        themes: z.array(codeTheme),
        note: z.string().optional(),
      })
      .optional(),
  }),
});
export type Routage = z.infer<typeof routage>;

// --- Questions du dossier d'inscription ---------------------------------------

// Une question de l'inscription : un gabarit de texte qui peut employer les mots
// du lexique entre accolades (« {demande} »), l'unité de la réponse et une aide.
// `parProfil` permet une formulation propre à un profil ; vide tant que le
// document n'en fournit aucune (rien n'est inventé).
export const questionInscription = z.object({
  id: z.enum(["metier", "sousVariantes", "metierAbsent", "stock", "chiffreAffairesMensuel", "nombreCollaborateurs", "anciennete", "typeZone", "ville", "acces"]),
  libelle: z.string().min(1),
  aide: z.string().nullable(),
  unite: z.string().nullable(),
  parProfil: z.partialRecord(profilId, z.string()),
});
export const inscription = z.object({
  source: z.string(),
  questions: z.array(questionInscription),
});
export type Inscription = z.infer<typeof inscription>;

// --- Seuils de notation (pas encore écrits) -----------------------------------

// Voir src/lib/moteur/notation.ts : un seuil dit comment une donnée est notée, d'où vient
// sa référence, et pour quelle zone ou quelle taille il vaut.
// Défini ici pour que le contrôle des données puisse le lire sans importer le moteur.
export const seuilDonnee = z.object({
  theme: codeTheme,
  donnee: codeDonnee,
  notation: z.discriminatedUnion("type", [
    z.object({ type: z.literal("marche_haut"), moyenne: z.number(), rougeSous: z.number() }),
    z.object({ type: z.literal("marche_bas"), moyenne: z.number(), rougeAuDela: z.number() }),
    z.object({ type: z.literal("fourchette"), min: z.number(), max: z.number(), tolerance: z.number().positive().default(1) }),
    z.object({ type: z.literal("pratique") }),
  ]),
  source: z.string().min(1).nullable(),
  zones: z.array(z.enum(["URBAINE_DENSE", "PERIURBAINE", "RURALE"])).optional(),
  tailles: z.array(z.enum(["seul", "equipe_2_5", "structure_6_plus"])).optional(),
});

// --- Catalogue des thèmes et paramètres des références de marché ----------------------

// Une fiche par thème (data/catalogue-themes.json, écrit par scripts/ecrire-catalogue-themes.py).
// Seuls les thèmes de nature Marché se comparent à un chiffre de marché : `rechercheReference`
// est « non » pour tous les autres, qui ne déclenchent jamais de recherche. Un indicateur « en
// brouillon » n'est jamais cherché : le propriétaire le valide d'abord (définition, sens, bornes).
export const UNITES_INDICATEUR = ["pourcent", "jours", "mois", "euros", "euros_par_heure", "note"] as const;
export const SENS_INDICATEUR = ["plus_haut_mieux", "plus_bas_mieux", "fourchette_ideale"] as const;

export const indicateurCatalogue = z.object({
  id: codeDonnee,
  libelle: z.string().min(1),
  definition: z.string().min(1),
  unite: z.enum(UNITES_INDICATEUR),
  periode: z.string().min(1),
  sens: z.enum(SENS_INDICATEUR).nullable(),
  sensIncertain: z.boolean(),
  bornesVraisemblance: z.object({ min: z.number().nullable(), max: z.number().nullable() }),
  motsCles: z.array(z.string().min(1)).min(1),
  // Un repère national tous secteurs n'a de sens que si l'indicateur se compare d'un secteur à l'autre.
  nationalAutorise: z.boolean(),
  statutRedaction: z.enum(["brouillon", "valide"]),
});
export type IndicateurCatalogue = z.infer<typeof indicateurCatalogue>;

// Effet d'une action (data/catalogue-effets.json, écrit par scripts/ecrire-catalogue-effets.py). Ce que
// rapporte une action, mesuré dans une source citée, pour un métier : même chaîne de recherche et de
// contrôle que les chiffres de marché. Un effet a la forme d'un indicateur (définition, unité, bornes,
// mots-clés) pour réutiliser cette chaîne ; sa période vaut toujours « effet ». Un effet « en brouillon »
// n'est jamais cherché : le propriétaire le valide d'abord. Le moteur applique le taux aux volumes du
// client ; l'IA ne choisit jamais le pourcentage.
export const effetCatalogue = indicateurCatalogue.extend({
  id: z.string().regex(/^EFF-(ACQ|FIN|RH|COM)-\d{2}$/, "Code d'effet attendu : EFF-ACQ-01."),
  theme: codeTheme,
  agent: codeAgent,
  // L'action telle que le rapport la nomme (« Relancer systématiquement les devis sans réponse »).
  action: z.string().min(1),
  // Croisements du classeur qui calculent un gain avec ce taux (« part récupérable prudente »).
  croisements: z.array(z.string().regex(/^X[ARFC]\d{2}$/)),
  periode: z.literal("effet"),
});
export type EffetCatalogue = z.infer<typeof effetCatalogue>;

export const ficheTheme = z.object({
  theme: codeTheme,
  agent: codeAgent,
  libelle: z.string().min(1),
  nature: z.enum(["marche", "pratique", "coherence", "contexte"]),
  rechercheReference: z.boolean(),
  motif: z.string().nullable(),
  indicateurs: z.array(indicateurCatalogue),
});
export type FicheTheme = z.infer<typeof ficheTheme>;

// Sources reconnues (data/sources-reconnues.json) : domaines officiels de niveau 1, fédérations et
// observatoires validés à la main, domaines exclus. L'agent de recherche ne décide jamais seul qu'une
// source est officielle.
export const sourcesReconnues = z.object({
  source: z.string(),
  niveau1Domaines: z.array(z.string().min(1)),
  federationsEtObservatoiresValides: z.array(z.string().min(1)),
  exclusDomaines: z.array(z.string().min(1)),
  domainesCaxe: z.array(z.string().min(1)),
});
export type SourcesReconnues = z.infer<typeof sourcesReconnues>;

// Paramètres réglables (data/parametres-references.json). Valeurs de travail, modifiables sans toucher au code.
export const parametresReferences = z.object({
  source: z.string(),
  tolerancePourcent: z.number().positive(),
  recoupementEcartMaxPourcent: z.number().positive(),
  ageSourceMaxAns: z.object({ solide: z.number().positive(), indicatif: z.number().positive() }),
  echantillonMinSolide: z.number().int().positive(),
  sautDeValeurRevuePourcent: z.number().positive(),
  rechercheMaxParCouple: z.number().int().positive(),
  aucuneReferenceNouvelleTentativeJours: z.number().int().positive(),
  // Fréquence de mise à jour : 3 mois par défaut, réglable par catégorie de métier (clé = id de catégorie).
  miseAJour: z.object({ moisParDefaut: z.number().int().positive(), moisParCategorie: z.record(z.string(), z.number().int().positive()) }),
  plafondsBudget: z.object({ mensuelEuros: z.number().positive(), quotidienEuros: z.number().positive().nullable() }),
  // Au-delà de cet écart à la médiane des autres métiers de la même famille, une valeur passe en revue.
  ecartAuxPairsRevuePourcent: z.number().positive(),
  agentRecherche: z.object({
    modele: z.string().min(1),
    effort: z.enum(["low", "medium", "high", "xhigh", "max"]),
    maxTokens: z.number().int().positive(),
    recherchesWebMax: z.number().int().positive(),
    reprisesMax: z.number().int().nonnegative(),
    delaiPageSecondes: z.number().positive(),
    taillePageMaxOctets: z.number().int().positive(),
  }),
  tarifs: z.object({
    entreeUsdParMillionTokens: z.number().nonnegative(),
    sortieUsdParMillionTokens: z.number().nonnegative(),
    rechercheWebUsdPourMille: z.number().nonnegative(),
    usdVersEur: z.number().positive(),
  }),
  derive: z.object({ clientsMin: z.number().int().positive(), partMemeCote: z.number().gt(0).lt(1) }),
});
export type ParametresReferences = z.infer<typeof parametresReferences>;

// --- Limites d'un objectif ----------------------------------------------------------

// Ce qui écarte un objectif impossible (voir src/lib/audit/objectif.ts). Valeur à valider.
export const limitesObjectif = z.object({
  source: z.string(),
  aValider: z.boolean(),
  facteurAnnuelMax: z.number().gt(1),
  note: z.string().optional(),
});
export type LimitesObjectif = z.infer<typeof limitesObjectif>;

// --- Pré-réponses ---------------------------------------------------------------------

// Une donnée dont la réponse se propose d'après le détail déjà donné (voir src/lib/audit/prereponse.ts).
export const prereponses = z.object({
  source: z.string(),
  regles: z.array(
    z.object({
      donnee: codeDonnee,
      somme: z.array(codeDonnee).min(1),
      exige: z.array(codeDonnee),
      detail: z.string().min(1),
    })
  ),
});
export type Prereponses = z.infer<typeof prereponses>;

// --- Objectifs proposés par agent ---------------------------------------------------------

// Pour les agents dont l'objectif n'a pas forcément de chiffre (RH, Comm) : une liste d'objectifs écrits à
// l'avance, rattachés à des thèmes de l'agent, plus « Autre ». Un objectif « chiffre » se mesure (unité), un
// objectif « phrase » se décrit par ce que le dirigeant veut constater.
export const objectifAgent = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  libelle: z.string().min(3),
  groupe: z.string().optional(),
  mesure: z.enum(["chiffre", "phrase"]),
  unite: z.enum(["pourcent", "euros", "unites"]).optional(),
  themes: z.array(z.string()).min(1),
  exemple: z.object({ valeur: z.number().positive().optional(), reussite: z.string().optional(), delaiMois: z.number().int().min(1) }),
});
export type ObjectifAgent = z.infer<typeof objectifAgent>;
export const objectifsAgents = z.object({
  source: z.string(),
  aValider: z.boolean(),
  agents: z.record(z.string(), z.object({ intro: z.string().optional(), objectifs: z.array(objectifAgent).min(1) })),
});
export type ObjectifsAgents = z.infer<typeof objectifsAgents>;

// --- Banque de questions (pas encore écrite) ---------------------------------

// Contrat minimal : une question écrite pour une donnée « demandée ». Le texte
// emploie les mots du lexique entre accolades (« Combien de {demande} … »).
// La structure définitive viendra avec la banque.
export const question = z.object({
  donnee: codeDonnee,
  texte: z.string().min(1),
  aide: z.string().nullable(),
  repli: z.string().nullable(),
  // Réponse attendue (nombre, choix, cases, plusieurs valeurs, tableau). Absente : le
  // moteur utilise ce que le format du classeur permet de déduire, sinon la question
  // reste en saisie libre et le contrôle la signale.
  reponse: reponseSpec.nullable().optional(),
});
export type Question = z.infer<typeof question>;

// --- Retraits et réponses déduites ---------------------------------------------

// Données retirées des questionnaires (doublons) sans toucher au classeur : l'import du classeur ne les remet pas.
export const retraits = z.object({
  source: z.string(),
  retraits: z.array(
    z.object({
      donnee: codeDonnee,
      raison: z.string().min(1),
      // La donnée qui couvre désormais le même besoin.
      conservee: codeDonnee,
      decideLe: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  ),
});
export type Retraits = z.infer<typeof retraits>;

// Réponse déduite d'une autre : « oui » à COM-13.10 quand « site internet » est coché en ACQ-03.01.
export const implications = z.object({
  source: z.string(),
  implications: z.array(
    z.object({
      donnee: codeDonnee,
      valeur: z.string().min(1),
      siCoche: z.object({ donnee: codeDonnee, option: z.string().min(1) }),
      raison: z.string().min(1),
    })
  ),
});
export type Implications = z.infer<typeof implications>;

// --- Ensemble ----------------------------------------------------------------

export type EnsembleDonnees = {
  themes: Theme[];
  donnees: Donnee[];
  croisements: Croisement[];
  scenarios: z.infer<typeof scenario>[];
  diagnosticComm: z.infer<typeof diagnosticComm>;
  declencheurs: z.infer<typeof declencheur>[];
  lexique: z.infer<typeof motLexique>[];
  routage: Routage;
  inscription: Inscription;
  reglesAffichage: ReglesAffichage;
  seuils: z.infer<typeof seuilDonnee>[];
  limitesObjectif: LimitesObjectif;
  prereponses: Prereponses;
  objectifsAgents: ObjectifsAgents;
  retraits: Retraits;
  implications: Implications;
  catalogue: FicheTheme[];
  catalogueEffets: EffetCatalogue[];
  parametresReferences: ParametresReferences;
  sourcesReconnues: SourcesReconnues;
  banque: Question[];
};

export const schemaFichiers = {
  themes: z.array(theme),
  donnees: z.array(donnee),
  croisements: z.array(croisement),
  scenarios: z.array(scenario),
  diagnosticComm,
  declencheurs: z.array(declencheur),
  lexique: z.array(motLexique),
  routage,
  inscription,
  reglesAffichage,
  seuils: z.array(seuilDonnee),
  limitesObjectif,
  prereponses,
  objectifsAgents,
  retraits,
  implications,
  catalogue: z.array(ficheTheme),
  catalogueEffets: z.array(effetCatalogue),
  parametresReferences,
  sourcesReconnues,
  banque: z.array(question),
} as const;

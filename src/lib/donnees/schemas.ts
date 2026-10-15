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
  formes: z.object(Object.fromEntries(PROFILS.map((p) => [p, z.string().nullable()])) as Record<(typeof PROFILS)[number], z.ZodNullable<z.ZodString>>),
});

// --- Routage métier → catégorie → profil -------------------------------------

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
      blocStock: z.boolean(),
      reglementee: z.boolean(),
      notes: z.string().nullable(),
    })
  ),
  metiers: z.array(
    z.object({
      id: z.string(),
      libelle: z.string(),
      categorie: z.string(),
      pilote: z.boolean().optional(),
      // Profil propre au métier quand la catégorie n'en donne pas (professions réglementées).
      profils: z.array(profilId).optional(),
      notes: z.string().optional(),
      sousVariantes: z
        .array(z.object({ id: z.string(), libelle: z.string(), profils: z.array(profilId).nullable() }))
        .optional(),
    })
  ),
  reglementees: z.object({
    agentsExclus: z.array(codeAgent),
    nombreMaxAgents: z.number().int(),
    moduleMetier: z.boolean(),
    acquisitionNeRecommandePas: z.array(z.string()),
  }),
});
export type Routage = z.infer<typeof routage>;

// --- Questions du dossier d'inscription ---------------------------------------

// Une question de l'inscription : un gabarit de texte qui peut employer les mots
// du lexique entre accolades (« {demande} »), l'unité de la réponse et une aide.
// `parProfil` permet une formulation propre à un profil ; vide tant que le
// document n'en fournit aucune (rien n'est inventé).
export const questionInscription = z.object({
  id: z.enum(["metier", "sousVariantes", "chiffreAffairesMensuel", "nombreCollaborateurs", "anciennete", "typeZone", "ville", "acces"]),
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

// --- Banque de questions (pas encore écrite) ---------------------------------

// Contrat minimal : une question écrite pour une donnée « demandée ». Le texte
// emploie les mots du lexique entre accolades (« Combien de {demande} … »).
// La structure définitive viendra avec la banque.
export const question = z.object({
  donnee: codeDonnee,
  texte: z.string().min(1),
  aide: z.string().nullable(),
  repli: z.string().nullable(),
});
export type Question = z.infer<typeof question>;

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
  banque: z.array(question),
} as const;

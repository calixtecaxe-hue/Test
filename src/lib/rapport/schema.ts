// Forme du rapport et du plan d'action que l'IA renvoie (sortie structurée, validée par l'API puis par zod) et que l'écran
// affiche. Les contrôles que le schéma ne peut pas exprimer (chiffres présents dans le dossier, renvois, verbes, ton, zone
// interdite des professions réglementées) sont faits par garde-fous.ts.
//
// Ce fichier n'importe que zod : il se teste directement avec Node.

import { z } from "zod";

// Références vers le dossier : « F3 » (un fait chiffré), « E1 » (une évolution), « M1 » (un repère de marché), « L2 » (une
// réponse libre), « O » (l'objectif), « T » (ce que le dirigeant a déjà essayé), « C1 » (le constat d'un thème).
const refs = z.array(z.string()).describe("Identifiants des éléments du dossier sur lesquels s'appuie ce passage.");

export const conclusionSchema = z.object({
  type: z
    .enum(["fonctionne", "freine", "priorite", "a_verifier"])
    .describe("fonctionne : ce qui marche ; freine : ce qui freine l'objectif, établi par les faits ; priorite : ce qui compte le plus pour l'objectif ; a_verifier : piste qui reste une hypothèse."),
  titre: z.string().describe("Le point, en une phrase courte."),
  faits: z.array(z.object({ texte: z.string(), refs })).describe("Faits établis, repris du dossier sans les recalculer."),
  interpretation: z.string().describe("Ce que ces faits veulent probablement dire, présenté comme une lecture."),
  hypotheses: z.array(z.string()).describe("Causes possibles qui restent à vérifier, et comment les vérifier."),
  choix: z.string().describe("Le choix recommandé."),
  justification: z.string().describe("Pourquoi ce choix plutôt qu'un autre."),
});

export const actionSchema = z.object({
  id: z.string().describe("A1, A2… dans l'ordre du plan."),
  intitule: z.string().describe("Commence par un verbe à l'infinitif ; un résultat ; moins de 12 mots."),
  quand: z.enum(["maintenant", "ensuite"]).describe("maintenant : à lancer tout de suite ; ensuite : peut attendre."),
  apres: z.array(z.string()).describe("Actions à terminer avant celle-ci (identifiants)."),
  resultat: z.string().describe("Le résultat recherché."),
  pourquoi: z.string().describe("Pourquoi cette action est prioritaire, avec les faits du dossier."),
  etapes: z.array(z.string()).describe("2 à 4 étapes concrètes ; la première faisable dès le démarrage."),
  moyens: z.string().describe("Outil ou aide nécessaire, sans montant inventé."),
  prerequis: z.array(z.string()),
  tempsNecessaire: z.string().describe("Mise en place, puis temps récurrent."),
  delaiSemaines: z.number().int().describe("Échéance de l'action, en semaines après son démarrage."),
  pointEtapeSemaines: z.number().int().describe("Point d'étape, en semaines après le démarrage."),
  indicateur: z.string().describe("Le chiffre qui dira si l'action marche."),
  effetAttendu: z.string().describe("L'effet attendu, en mots, sans montant ni pourcentage projeté."),
  libereDuTemps: z.boolean(),
  repriseEssai: z.boolean().describe("Vrai si l'action reprend quelque chose que le dirigeant a déjà essayé."),
  ceQuiChange: z.string().nullable().describe("Si l'action reprend un essai : ce qui change par rapport à ce qui a été fait."),
  refs,
});

export const rapportSchema = z.object({
  synthese: z.string().describe("Trois ou quatre phrases : où en est l'entreprise par rapport à son objectif, le point principal, ce que le plan change."),
  conclusions: z.array(conclusionSchema),
  essais: z
    .object({ lecture: z.string().describe("Ce que l'on peut dire de ce qui a été essayé, d'après les réponses seulement."), suite: z.string().describe("Ce que le plan en fait.") })
    .nullable()
    .describe("Seulement si le dossier indique ce que le dirigeant a déjà essayé ; sinon null."),
  contradictions: z.array(z.object({ description: z.string(), refs, retenu: z.string().describe("Ce qui est retenu, et pourquoi.") })),
  manques: z.array(z.string()).describe("Ce qui manque pour aller plus loin, et ce que cela empêche de conclure."),
  renvois: z.array(z.object({ agent: z.enum(["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"]), sujet: z.string() })),
  suiviDonnees: z.string().nullable().describe("Conseil sur le suivi des données, seulement si le dossier le déclenche."),
  ordre: z.string().describe("En une ou deux phrases, pourquoi les actions sont dans cet ordre."),
  actions: z.array(actionSchema),
});

export type Rapport = z.infer<typeof rapportSchema>;
export type ActionRapport = z.infer<typeof actionSchema>;
export type Conclusion = z.infer<typeof conclusionSchema>;

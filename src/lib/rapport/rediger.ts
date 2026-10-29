// Rédaction d'un rapport : un appel à l'IA (ou à la simulation), la validation de sa forme, les contrôles du code, et au besoin
// un nouvel essai qui lui donne la liste précise de ce qui n'a pas passé. Au-delà du nombre d'essais permis, la rédaction
// échoue avec un message clair ; rien de ce qui n'a pas passé les contrôles n'est montré au dirigeant.
//
// Le rédacteur est injecté (client-rapport.ts pour l'API Claude, la simulation sinon) : ce fichier se teste avec Node.

import type { ParametresRapport } from "../donnees/schemas.ts";
import type { Dossier } from "./dossier.ts";
import { controlerRapport } from "./garde-fous.ts";
import { consignesSysteme, messageCorrection, messageUtilisateur } from "./prompt.ts";
import { rapportSchema, type Rapport } from "./schema.ts";

// Un message de la conversation. `contenu` d'une réponse est rendu tel quel au tour suivant (blocs de réflexion compris).
export type MessageRedaction = { role: "user"; contenu: string } | { role: "assistant"; contenu: unknown };

export type ReponseRedacteur = {
  // Sortie structurée déjà lue (null si elle n'a pas pu l'être).
  sortie: unknown | null;
  // Contenu de la réponse, à rendre tel quel dans la conversation pour un nouvel essai.
  contenu: unknown;
  refus: boolean;
  tronque: boolean;
  modele: string;
  usage: { entree: number; sortie: number };
};

export type Redacteur = (demande: { systeme: string; messages: MessageRedaction[] }) => Promise<ReponseRedacteur>;

export type Journal = { essais: number; erreursParEssai: string[][]; retraits: string[]; modele: string | null; usage: { entree: number; sortie: number } };

export type IssueRedaction = { ok: true; rapport: Rapport; journal: Journal } | { ok: false; erreur: string; detail: string; journal: Journal };

export const MESSAGE_ECHEC = "La rédaction de votre rapport n'a pas abouti. Vos réponses sont enregistrées : vous pouvez relancer la rédaction.";

export async function rediger(d: Dossier, p: ParametresRapport, redacteur: Redacteur): Promise<IssueRedaction> {
  const systeme = consignesSysteme(d.agent.code);
  const messages: MessageRedaction[] = [{ role: "user", contenu: messageUtilisateur(d) }];
  const journal: Journal = { essais: 0, erreursParEssai: [], retraits: [], modele: null, usage: { entree: 0, sortie: 0 } };
  for (let essai = 1; essai <= p.generation.essaisMax; essai++) {
    journal.essais = essai;
    let reponse: ReponseRedacteur;
    try {
      reponse = await redacteur({ systeme, messages });
    } catch (e) {
      return { ok: false, erreur: MESSAGE_ECHEC, detail: `Appel impossible : ${e instanceof Error ? e.message : String(e)}`, journal };
    }
    journal.modele = reponse.modele;
    journal.usage.entree += reponse.usage.entree;
    journal.usage.sortie += reponse.usage.sortie;
    if (reponse.refus) return { ok: false, erreur: MESSAGE_ECHEC, detail: "Le modèle a refusé de répondre.", journal };
    const forme = rapportSchema.safeParse(reponse.sortie);
    const erreurs = reponse.tronque
      ? ["La réponse a été coupée avant la fin : écris un rapport plus court."]
      : !forme.success
        ? forme.error.issues.slice(0, 10).map((i) => `Forme : ${i.path.join(".")} ${i.message}`)
        : [];
    if (forme.success && erreurs.length === 0) {
      const v = controlerRapport(forme.data, d, p);
      journal.retraits = v.retraits;
      if (v.ok) return { ok: true, rapport: v.rapport, journal };
      erreurs.push(...v.erreurs);
    }
    journal.erreursParEssai.push(erreurs);
    messages.push({ role: "assistant", contenu: reponse.contenu }, { role: "user", contenu: messageCorrection(erreurs) });
  }
  return { ok: false, erreur: MESSAGE_ECHEC, detail: `Contrôles non passés après ${p.generation.essaisMax} essais : ${journal.erreursParEssai.at(-1)?.slice(0, 5).join(" ; ")}`, journal };
}

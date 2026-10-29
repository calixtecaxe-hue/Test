// Le dossier que reçoit l'IA qui rédige le rapport et le plan d'action. Il est préparé par le code à partir de ce que l'écran
// « Résultats » montre (faits mesurés, évolutions, repères de marché), de l'objectif, de ce que le dirigeant a déjà essayé et de
// ses réponses libres. Chaque élément porte un identifiant (F1, E1, M1, L1, O, T) que le rapport cite ; aucun chiffre n'est
// recalculé par l'IA : elle ne reprend que les valeurs écrites ici, déjà mises en forme.
//
// Protection des données : ni nom, ni adresse e-mail, ni raison sociale, ni numéro de TVA, ni ville. Le métier, la taille, le
// type de zone et l'ancienneté suffisent à adapter le conseil.
//
// Ce fichier n'importe que des types et des fonctions pures : il se teste directement avec Node.

import { createHash } from "node:crypto";
import type { CodeAgent } from "../donnees/schemas.ts";
import type { ResultatEvolution } from "../moteur/evolution.ts";
import { phraseEvolution } from "../audit/compte-rendu.ts";
import type { TentativesTransmises } from "../audit/tentatives.ts";
import { formaterValeur, type CibleObjectif, type FaitMesure, type ResultatObjectif, type VueResultats } from "../resultats/resultats.ts";

export type FaitDossier = { id: string; libelle: string; valeur: string; periode: string; estimee: boolean; explication: string; lignes: string[] | null; questions: string[] };

export type Dossier = {
  version: 1;
  agent: { code: CodeAgent; nom: string; question: string };
  profil: {
    metier: string;
    activites: string[];
    // Profils de questionnaire (rendez-vous, commerce, chantier…) : modèle économique.
    modeles: string[];
    zone: string | null;
    effectif: number | null;
    ancienneteMois: number;
    caMensuelDeclare: string | null;
    stock: boolean | null;
    agentsSouscrits: CodeAgent[];
    agentComm: boolean;
    professionReglementee: boolean;
    // Professions réglementées : seuls canaux dont le rapport peut parler.
    canauxAutorises: string[] | null;
  };
  objectif: {
    ref: "O";
    phrase: string;
    origine: "proposition" | "personnel" | "libre";
    ceQuIlVeutChanger: string;
    changementVise: string | null;
    delaiMois: number;
    echeance: string;
    ceQuIlVeutConstater: string | null;
    mesure: string | null;
    situationDeDepart: string | null;
    cible: string | null;
    ecartACombler: string | null;
    limites: string[];
    // Objectif composé de plusieurs propositions (29 octobre) : chacune, sans hiérarchie, avec sa mesure quand elle existe.
    // Absent pour un objectif écrit par le dirigeant ou fait d'une seule proposition (les champs ci-dessus la décrivent).
    propositionsRetenues?: {
      proposition: string;
      phrase: string;
      changementVise: string | null;
      mesure: string | null;
      situationDeDepart: string | null;
      cible: string | null;
      ecartACombler: string | null;
      limites: string[];
    }[];
    // La formulation a été modifiée par le dirigeant (la phrase ci-dessus est alors la sienne, faite à partir de ses propositions).
    formulationModifiee?: boolean;
  };
  faits: FaitDossier[];
  evolutions: { id: string; libelle: string; statut: ResultatEvolution["statut"]; phrase: string | null; raison: string | null; notes: string[] }[];
  marche: { id: string; theme: string; repere: string; source: string; confiance: "confirmée" | "indicative"; votreValeur: string | null }[];
  manques: { libelle: string; raison: string }[];
  // Diagnostic du moteur : leviers signalés et thèmes notés. Vides tant que les seuils et les règles de notation ne sont pas écrits.
  constat: { themesNotes: { id: string; theme: string; couleur: string; aValider: boolean }[]; aCompleter: string[]; note: string };
  dejaEssaye: { ref: "T" } & TentativesTransmises;
  reponsesLibres: { id: string; question: string; texte: string }[];
  suiviDonnees: { declenche: boolean; nonSuivies: number; essentielles: number };
  // Actions des plans précédents pour le même objectif, avec leur état (hors empreinte : cocher une action ne périme pas le rapport).
  historique: { intitule: string; statut: string }[];
};

export type EntreeDossier = {
  agent: Dossier["agent"];
  // Le dirigeant a modifié la formulation de son objectif composé.
  formulationModifiee?: boolean;
  profil: Dossier["profil"];
  resultats: VueResultats;
  tentatives: TentativesTransmises;
  reponsesLibres: { question: string; texte: string }[];
  themesNotes: { theme: string; couleur: string; aValider: boolean }[];
  suiviDonnees: { nonSuivies: number; essentielles: number; declenche: boolean };
  historique: Dossier["historique"];
};

function valeurFait(f: FaitMesure): string {
  return `${formaterValeur(f.valeur, f.unite)}${f.estimee ? " (estimé)" : ""}`;
}

function faitDossier(id: string, f: FaitMesure): FaitDossier {
  return { id, libelle: f.libelle, valeur: valeurFait(f), periode: f.periode, estimee: f.estimee, explication: f.explication, lignes: f.lignes, questions: f.questions };
}

export function composerDossier(e: EntreeDossier): Dossier {
  const o = e.resultats.objectifs[0];
  const faits: FaitDossier[] = [];
  let n = 0;
  const idMesure = new Map<string, string>();
  const ajouter = (f: FaitMesure) => {
    if (idMesure.has(f.id)) return;
    const id = `F${++n}`;
    idMesure.set(f.id, id);
    faits.push(faitDossier(id, f));
  };
  if (o?.mesure) ajouter(o.mesure);
  o?.composantes.forEach((c) => (c.mesure ? ajouter(c.mesure) : undefined));
  e.resultats.facteursObjectif.forEach(ajouter);
  e.resultats.autresFacteurs.forEach(ajouter);

  const texteChangement = (c: ResultatObjectif["changement"]) =>
    c ? `${c.sens === "baisse" ? "−" : c.sens === "hausse" ? "+" : ""}${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(c.valeur)}${c.unite === "pourcent" ? " %" : c.unite === "euros" ? " €" : ""}` : null;
  const changement = texteChangement(o?.changement ?? null);
  const ecart = (c: CibleObjectif) => `${c.ecart > 0 ? "+" : c.ecart < 0 ? "−" : ""}${formaterValeur(Math.abs(c.ecart), c.unite)}`;
  return {
    version: 1,
    agent: e.agent,
    profil: e.profil,
    objectif: {
      ref: "O",
      phrase: o?.phrase ?? "",
      origine: o?.origine ?? "libre",
      ceQuIlVeutChanger: o?.phrase ?? "",
      changementVise: changement,
      delaiMois: o?.delaiMois ?? 0,
      echeance: o?.echeance ?? "",
      ceQuIlVeutConstater: o?.reussite ?? null,
      mesure: o?.mesure ? idMesure.get(o.mesure.id) ?? null : null,
      situationDeDepart: o?.mesure ? `${valeurFait(o.mesure)}, ${o.mesure.periode}` : null,
      cible: o?.cible ? formaterValeur(o.cible.cible, o.cible.unite) : null,
      ecartACombler: o?.cible ? ecart(o.cible) : null,
      limites: o?.limites ?? [],
      ...(o && o.composantes.length > 1
        ? {
            propositionsRetenues: o.composantes.map((c) => ({
              proposition: c.libelle,
              phrase: c.phrase,
              changementVise: texteChangement(c.changement),
              mesure: c.mesure ? idMesure.get(c.mesure.id) ?? null : null,
              situationDeDepart: c.mesure ? `${valeurFait(c.mesure)}, ${c.mesure.periode}` : null,
              cible: c.cible ? formaterValeur(c.cible.cible, c.cible.unite) : null,
              ecartACombler: c.cible ? ecart(c.cible) : null,
              limites: c.limites,
            })),
          }
        : {}),
      ...(e.formulationModifiee ? { formulationModifiee: true } : {}),
    },
    faits,
    evolutions: e.resultats.evolutions.map((r, i) => ({ id: `E${i + 1}`, libelle: r.libelle, statut: r.statut, phrase: phraseEvolution(r), raison: r.raison, notes: r.notes })),
    marche: e.resultats.marche.map((m, i) => ({
      id: `M${i + 1}`,
      theme: m.theme,
      repere: m.repere.libelle,
      source: `${m.repere.organisme}, ${m.repere.annee}`,
      confiance: m.repere.confiance === "solide" ? "confirmée" : "indicative",
      votreValeur: m.valeur ? valeurFait(m.valeur) : null,
    })),
    manques: e.resultats.manquantes.map((m) => ({ libelle: m.libelle, raison: m.raison })),
    constat: {
      themesNotes: e.themesNotes.map((t, i) => ({ id: `C${i + 1}`, ...t })),
      aCompleter: e.resultats.aCompleter.map((t) => `${t.nom} (${t.repondues} réponse${t.repondues > 1 ? "s" : ""} sur ${t.posees})`),
      note:
        e.themesNotes.length === 0
          ? "Le moteur ne signale encore aucun levier et ne note aucun thème : les seuils de marché et les règles de notation ne sont pas encore écrits. Aucun indicateur n'est donc jugé bon ou mauvais par le moteur."
          : "Thèmes notés par le moteur, du plus faible au plus fort ; un thème « à valider » repose sur un seuil sans source.",
    },
    dejaEssaye: { ref: "T", ...e.tentatives },
    reponsesLibres: e.reponsesLibres.map((r, i) => ({ id: `L${i + 1}`, question: r.question, texte: r.texte })),
    suiviDonnees: e.suiviDonnees,
    historique: e.historique,
  };
}

// --- Empreinte -----------------------------------------------------------------------------------------------------------

// JSON aux clés triées : deux dossiers identiques donnent toujours le même texte.
export function jsonStable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonStable).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v as Record<string, unknown>)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${jsonStable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}

// Ce qui compte pour dire qu'un rapport est à jour : tout le dossier sauf l'historique des actions (cocher une action du plan ne
// change pas le constat).
export function contenuEmpreinte(d: Dossier): string {
  return jsonStable({ ...d, historique: undefined });
}

export function empreinteDossier(d: Dossier): string {
  return createHash("sha256").update(contenuEmpreinte(d)).digest("hex");
}

// Texte du dossier dans le message : les chevrons sont échappés, pour qu'un texte écrit par le dirigeant ne puisse jamais fermer
// la balise du dossier ni en ouvrir une autre.
export function dossierPourMessage(d: Dossier): string {
  return JSON.stringify(d, null, 1).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

// Contrôle automatique des fichiers de données (CLAUDE.md, section 11).
//
// Il vérifie ce qui peut l'être avant que le moteur ne s'en serve : codes
// uniques, thèmes et données qui se retrouvent, déclencheurs qui existent,
// natures cohérentes, routage complet. Une erreur bloque ; un avertissement
// signale une donnée du classeur à regarder (ex. une référence vers un code
// qui n'existe pas), sans rien inventer.
//
// Ce fichier n'importe que le schéma : il se teste directement avec Node.

import { PREFIXE_AGENT, PROFILS, TAILLES } from "./schemas.ts";
import type { CodeAgent, EnsembleDonnees } from "./schemas.ts";
import { cleLexique, variablesDuGabarit } from "./lexique.ts";

export type Rapport = {
  erreurs: string[];
  avertissements: string[];
  statistiques: Record<string, number>;
};

function doublons(codes: string[]): string[] {
  const vus = new Set<string>();
  const dupliques = new Set<string>();
  for (const c of codes) (vus.has(c) ? dupliques : vus).add(c);
  return [...dupliques];
}

export function controlerDonnees(e: EnsembleDonnees): Rapport {
  const erreurs: string[] = [];
  const avertissements: string[] = [];

  // Codes uniques.
  for (const [nom, codes] of [
    ["thèmes", e.themes.map((t) => t.code)],
    ["données", e.donnees.map((d) => d.code)],
    ["croisements", e.croisements.map((c) => c.code)],
    ["scénarios", e.scenarios.map((s) => s.code)],
    ["déclencheurs", e.declencheurs.map((d) => d.code)],
    ["problèmes de communication", e.diagnosticComm.problemes.map((p) => p.code)],
    ["mots du lexique", e.lexique.map((m) => m.mot)],
    ["métiers", e.routage.metiers.map((m) => m.id)],
  ] as [string, string[]][]) {
    for (const d of doublons(codes)) erreurs.push(`Code en double parmi les ${nom} : ${d}.`);
  }

  const themes = new Map(e.themes.map((t) => [t.code, t]));
  const donnees = new Map(e.donnees.map((d) => [d.code, d]));
  const croisements = new Set(e.croisements.map((c) => c.code));
  const declencheurs = new Set(e.declencheurs.map((d) => d.code));

  // Un thème porte le préfixe de son agent ; une donnée porte celui de son thème.
  for (const t of e.themes) {
    if (!t.code.startsWith(PREFIXE_AGENT[t.agent])) {
      erreurs.push(`Le thème ${t.code} ne porte pas le préfixe de son agent (${PREFIXE_AGENT[t.agent]}).`);
    }
    // Contexte = non noté : pas de couleur, pas d'impact.
    if (t.nature === "contexte" && t.impact.type !== "aucun") {
      erreurs.push(`Le thème ${t.code} est de nature Contexte (non noté) mais porte un impact.`);
    }
    if (t.nature !== "contexte" && t.impact.type === "aucun") {
      erreurs.push(`Le thème ${t.code} est noté (${t.nature}) mais n'a aucun impact défini.`);
    }
  }

  const donneesParTheme = new Map<string, number>();
  for (const d of e.donnees) {
    const t = themes.get(d.theme);
    if (!t) {
      erreurs.push(`La donnée ${d.code} référence un thème inconnu : ${d.theme}.`);
      continue;
    }
    if (!d.code.startsWith(`${d.theme}.`)) erreurs.push(`La donnée ${d.code} n'appartient pas au thème ${d.theme}.`);
    donneesParTheme.set(d.theme, (donneesParTheme.get(d.theme) ?? 0) + 1);

    for (const dec of d.declencheurs) {
      if (!declencheurs.has(dec)) erreurs.push(`La donnée ${d.code} dépend d'un déclencheur inconnu : ${dec}.`);
    }
    // Une donnée posée au dirigeant porte un format de réponse.
    if (d.mode === "demandee" && d.format === null) {
      erreurs.push(`La donnée ${d.code} est demandée mais n'a pas de format de réponse.`);
    }
    // Essentiel / approfondi : seules les données posées ont un niveau.
    if (d.mode === "calculee" && d.niveau !== null) {
      avertissements.push(`La donnée calculée ${d.code} porte un niveau (${d.niveau}).`);
    }
    // Au moins un profil (ou une taille) concerné.
    const marques = "tailles" in d ? Object.values(d.tailles) : Object.values(d.profils);
    if (!marques.some(Boolean)) avertissements.push(`La donnée ${d.code} ne concerne aucun profil ni aucune taille.`);
  }

  // Références croisées : « données utilisées » et « utilisée dans ».
  let nonResolues = 0;
  const reference = (origine: string, code: string) => {
    if (!donnees.has(code) && !croisements.has(code)) {
      nonResolues++;
      avertissements.push(`${origine} référence un code introuvable : ${code}.`);
    }
  };
  for (const d of e.donnees) {
    d.entrees.forEach((c) => reference(`La donnée ${d.code}`, c));
    d.utiliseeDans.forEach((c) => reference(`La donnée ${d.code}`, c));
  }
  e.croisements.forEach((c) => c.entrees.forEach((x) => reference(`Le croisement ${c.code}`, x)));
  e.scenarios.forEach((s) => s.entrees.forEach((x) => reference(`Le scénario ${s.code}`, x)));
  e.diagnosticComm.problemes.forEach((p) => p.entrees.forEach((x) => reference(`Le problème ${p.code}`, x)));

  // Un croisement porte le préfixe de son agent.
  const lettreCroisement: Record<CodeAgent, string> = {
    ACQUISITION_CA: "XA",
    FINANCE_RENTABILITE: "XF",
    COMM_CREATION: "XC",
    RH_ORGANISATION: "XR",
  };
  for (const c of e.croisements) {
    if (!c.code.startsWith(lettreCroisement[c.agent])) {
      erreurs.push(`Le croisement ${c.code} ne porte pas le préfixe de son agent (${lettreCroisement[c.agent]}).`);
    }
    if (c.agent === "RH_ORGANISATION" ? !c.tailles : !c.profils) {
      erreurs.push(`Le croisement ${c.code} n'a pas les bonnes colonnes (${c.agent === "RH_ORGANISATION" ? "tailles" : "profils"}).`);
    }
  }

  // Thèmes sans aucune donnée : signalés.
  for (const t of e.themes) {
    if (!donneesParTheme.has(t.code)) avertissements.push(`Le thème ${t.code} (${t.nom}) n'a aucune donnée.`);
  }

  // Lexique : toutes les formes pour les 7 profils sont des colonnes connues.
  for (const m of e.lexique) {
    for (const p of PROFILS) if (!(p in m.formes)) erreurs.push(`Le mot « ${m.mot} » n'a pas de colonne ${p}.`);
  }

  // Routage : chaque métier pointe une catégorie existante ; une catégorie sans
  // profil par défaut (professions réglementées) exige un profil par métier.
  const categories = new Map(e.routage.categories.map((c) => [c.id, c]));
  const profilsConnus = new Set(e.routage.profils.map((p) => p.id));
  for (const p of PROFILS) if (!profilsConnus.has(p)) erreurs.push(`Le profil ${p} manque dans le routage.`);
  for (const m of e.routage.metiers) {
    const c = categories.get(m.categorie);
    if (!c) {
      erreurs.push(`Le métier ${m.id} référence une catégorie inconnue : ${m.categorie}.`);
      continue;
    }
    if (c.profils.length === 0 && !(m.profils && m.profils.length > 0)) {
      erreurs.push(`Le métier ${m.id} (${c.libelle}) n'a ni profil de catégorie ni profil propre.`);
    }
  }
  if (e.routage.categories.length !== 10) {
    avertissements.push(`Le routage compte ${e.routage.categories.length} catégories ; le document en prévoit 10.`);
  }

  // Inscription : questions complètes, et mots du lexique employés qui existent.
  const clesLexique = new Set(e.lexique.map((m) => cleLexique(m.mot)));
  const idsAttendus = ["metier", "sousVariantes", "chiffreAffairesMensuel", "nombreCollaborateurs", "anciennete", "typeZone", "ville", "acces"];
  for (const id of idsAttendus) {
    if (!e.inscription.questions.some((q) => q.id === id)) erreurs.push(`La question d'inscription « ${id} » manque.`);
  }
  for (const d of doublons(e.inscription.questions.map((q) => q.id))) erreurs.push(`Question d'inscription en double : ${d}.`);
  for (const q of e.inscription.questions) {
    for (const g of [q.libelle, q.aide ?? "", ...Object.values(q.parProfil)]) {
      for (const v of variablesDuGabarit(g)) {
        if (!clesLexique.has(v)) erreurs.push(`La question d'inscription « ${q.id} » emploie un mot inconnu du lexique : {${v}}.`);
      }
    }
  }

  // Banque : chaque question référence une donnée demandée.
  const questions = new Map<string, number>();
  for (const q of e.banque) {
    const d = donnees.get(q.donnee);
    if (!d) erreurs.push(`Une question référence une donnée inconnue : ${q.donnee}.`);
    else if (d.mode !== "demandee") erreurs.push(`La question de ${q.donnee} porte sur une donnée non demandée (${d.mode}).`);
    questions.set(q.donnee, (questions.get(q.donnee) ?? 0) + 1);
  }
  for (const [code, n] of questions) if (n > 1) erreurs.push(`La donnée ${code} a ${n} questions dans la banque.`);

  const demandees = e.donnees.filter((d) => d.mode === "demandee");
  const parAgent = (a: CodeAgent) => e.themes.filter((t) => t.agent === a).length;

  return {
    erreurs,
    avertissements,
    statistiques: {
      themes: e.themes.length,
      "thèmes Acquisition": parAgent("ACQUISITION_CA"),
      "thèmes Finance": parAgent("FINANCE_RENTABILITE"),
      "thèmes RH": parAgent("RH_ORGANISATION"),
      "thèmes Comm": parAgent("COMM_CREATION"),
      données: e.donnees.length,
      "données demandées": demandees.length,
      "questions écrites": e.banque.length,
      "questions manquantes": demandees.length - questions.size,
      croisements: e.croisements.length,
      scénarios: e.scenarios.length,
      déclencheurs: e.declencheurs.length,
      "références non résolues": nonResolues,
    },
  };
}

export { TAILLES };

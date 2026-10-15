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
import { proposerSpec } from "./reponse-spec.ts";

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

  // Routage : chaque métier et chaque activité pointent une catégorie existante ; une catégorie
  // sans profil (professions réglementées) exige un profil propre au métier ou à l'activité, sauf
  // la catégorie dont le questionnaire reste à créer (Fabrication) ; un métier à activités en a
  // exactement une « par défaut ».
  const categories = new Map(e.routage.categories.map((c) => [c.id, c]));
  const profilsConnus = new Set(e.routage.profils.map((p) => p.id));
  for (const p of PROFILS) if (!profilsConnus.has(p)) erreurs.push(`Le profil ${p} manque dans le routage.`);
  let activites = 0;
  let commATrancher = 0;
  const secteurs = new Set<string>();
  for (const m of e.routage.metiers) {
    secteurs.add(m.secteur);
    if (m.agentComm === "a_trancher") commATrancher++;
    if (m.aConfirmer) avertissements.push(`Le métier ${m.id} : ${m.aConfirmer}.`);
    const parts = m.sousVariantes ?? [];
    const profilManquant = (cat: string, propres: string[] | undefined, nom: string) => {
      const c = categories.get(cat);
      if (!c) {
        erreurs.push(`${nom} référence une catégorie inconnue : ${cat}.`);
        return;
      }
      if (c.profils.length === 0 && !c.aCreer && !(propres && propres.length > 0)) erreurs.push(`${nom} (${c.libelle}) n'a ni profil de catégorie ni profil propre.`);
    };
    profilManquant(m.categorie, m.profils, `Le métier ${m.id}`);
    if (parts.length > 0) {
      activites += parts.length;
      if (parts.filter((v) => v.defaut).length !== 1) erreurs.push(`Le métier ${m.id} doit avoir exactement une activité « par défaut ».`);
      for (const d of doublons(parts.map((v) => v.id))) erreurs.push(`Le métier ${m.id} a deux activités ${d}.`);
      for (const v of parts) {
        profilManquant(v.categorie, v.profils ?? m.profils, `L'activité ${m.id}/${v.id}`);
        if (v.agentComm === "a_trancher") commATrancher++;
        if (v.aConfirmer) avertissements.push(`L'activité ${m.id}/${v.id} : ${v.aConfirmer}.`);
      }
      const defaut = parts.find((v) => v.defaut);
      if (defaut && (defaut.categorie !== m.categorie || defaut.stock !== m.stock || defaut.agentComm !== m.agentComm)) {
        erreurs.push(`Le métier ${m.id} doit reprendre la catégorie, le stock et l'agent Comm de son activité par défaut.`);
      }
    }
  }
  for (const c of e.routage.categories) {
    if (c.aCreer) {
      const n = e.routage.metiers.filter((m) => m.categorie === c.id || (m.sousVariantes ?? []).some((v) => v.categorie === c.id)).length;
      avertissements.push(`La catégorie « ${c.libelle} » n'a pas encore de questionnaire (${n} métiers) : aucun profil rattaché.`);
    }
  }
  if (commATrancher > 0) avertissements.push(`${commATrancher} métier(s) ou activité(s) ont l'agent Comm « à trancher » : l'agent reste proposé tant que la décision est ouverte.`);

  // Exclusions des professions réglementées : tout ce qu'elles citent existe.
  const exclut = e.routage.reglementees.acquisitionExclut;
  if (exclut) {
    for (const d of exclut.declencheurs) if (!declencheurs.has(d)) erreurs.push(`Les exclusions réglementées citent un déclencheur inconnu : ${d}.`);
    for (const t of exclut.themes) if (!themes.has(t)) erreurs.push(`Les exclusions réglementées citent un thème inconnu : ${t}.`);
    for (const [cle, ids] of Object.entries(exclut.optionsCadrage)) {
      const forme = e.reglesAffichage.declencheurs[cle];
      if (!forme || forme.type !== "cases") erreurs.push(`Les exclusions réglementées citent des options pour ${cle}, qui n'est pas une question à cases.`);
      else for (const id of ids) if (!forme.options.some((o) => o.id === id)) erreurs.push(`Les exclusions réglementées citent une option inconnue de ${cle} : ${id}.`);
    }
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

  // Règles d'affichage : chaque condition et chaque masquage du classeur a sa règle,
  // et chaque règle porte sur un déclencheur connu.
  const regles = e.reglesAffichage;
  const conditionsClasseur = new Set(e.donnees.map((d) => d.condition).filter((c): c is string => c !== null));
  const masquagesClasseur = new Set(e.themes.map((t) => t.masquePour).filter((m): m is string => m !== null));
  for (const c of conditionsClasseur) {
    if (!(c in regles.conditions)) erreurs.push(`La condition « ${c} » n'a pas de règle d'affichage.`);
  }
  for (const m of masquagesClasseur) {
    if (!(m in regles.masquages)) erreurs.push(`Le masquage « ${m} » n'a pas de règle d'affichage.`);
  }
  for (const c of Object.keys(regles.conditions)) {
    if (!conditionsClasseur.has(c)) avertissements.push(`La règle d'affichage « ${c} » ne correspond à aucune condition du classeur.`);
  }
  for (const m of Object.keys(regles.masquages)) {
    if (!masquagesClasseur.has(m)) avertissements.push(`Le masquage « ${m} » ne correspond à aucun thème du classeur.`);
  }
  const clesDeclencheurs = new Set<string>(["D02"]);
  for (const [code, forme] of Object.entries(regles.declencheurs)) {
    if (!declencheurs.has(code)) erreurs.push(`Le déclencheur ${code} (règles d'affichage) n'existe pas.`);
    if (forme.type === "oui_non_multiple") for (const s of forme.sousCles) clesDeclencheurs.add(s.cle ? `${code}.${s.cle}` : code);
    else clesDeclencheurs.add(code);
  }
  const toutesRegles = [...Object.entries(regles.conditions), ...Object.entries(regles.masquages)];
  let aPreciser = 0;
  for (const [nom, r] of toutesRegles) {
    if ("aPreciser" in r) {
      aPreciser++;
      avertissements.push(`Règle à préciser (« ${nom} ») : ${r.aPreciser}`);
      continue;
    }
    for (const simple of "tous" in r ? r.tous : "un" in r ? r.un : [r]) {
      if (!clesDeclencheurs.has(simple.cle)) erreurs.push(`La règle « ${nom} » porte sur une réponse inconnue : ${simple.cle}.`);
    }
  }

  // Seuils : chaque seuil vise une donnée existante de son thème ; les thèmes notés sans
  // seuil sont comptés (rien n'est inventé : ils sortent « règle manquante » du moteur).
  for (const sd of e.seuils) {
    const d = donnees.get(sd.donnee);
    if (!d) erreurs.push(`Un seuil vise une donnée inconnue : ${sd.donnee}.`);
    else if (d.theme !== sd.theme) erreurs.push(`Le seuil de ${sd.donnee} annonce le thème ${sd.theme}, la donnée est dans ${d.theme}.`);
    if (sd.source === null) avertissements.push(`Seuil « à valider » (sans source) : ${sd.donnee}.`);
  }
  const themesAvecSeuil = new Set(e.seuils.map((s) => s.theme));
  const themesNotes = e.themes.filter((t) => t.nature !== "contexte");
  const sansSeuil = themesNotes.filter((t) => !themesAvecSeuil.has(t.code));
  // Document : au moins 2 questions par thème noté.
  let notesTropCourts = 0;
  for (const t of themesNotes) {
    // Données collectées (posées, partagées, importées ou lues chez un autre agent), hors calculs.
    const collectees = e.donnees.filter((d) => d.theme === t.code && d.mode !== "calculee").length;
    const posees = e.donnees.filter((d) => d.theme === t.code && (d.mode === "demandee" || d.mode === "partagee")).length;
    if (collectees < 2) {
      notesTropCourts++;
      avertissements.push(`Le thème noté ${t.code} (${t.nom}) n'a que ${collectees} donnée(s) collectée(s) (${posees} posée(s) au dirigeant) ; le document en demande au moins 2 questions.`);
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
  // Réponse attendue : cohérente avec le format du classeur, lignes de tableau issues d'un cadrage existant.
  for (const q of e.banque) {
    const d = donnees.get(q.donnee);
    if (!d || !q.reponse) continue;
    const p = proposerSpec(d.format);
    if (p.certitude === "sure" && p.spec && p.spec.type !== q.reponse.type) {
      avertissements.push(`La réponse de ${q.donnee} (${q.reponse.type}) s'écarte du format du classeur « ${d.format} » (${p.spec.type}).`);
    }
    if (q.reponse.type === "tableau" && q.reponse.lignes.source === "declencheur" && !(q.reponse.lignes.cle in e.reglesAffichage.declencheurs)) {
      erreurs.push(`Les lignes du tableau de ${q.donnee} viennent d'un déclencheur sans question de cadrage : ${q.reponse.lignes.cle}.`);
    }
  }
  for (const q of e.banque) {
    if (q.reponse?.type === "tableau" && q.reponse.lignes.source === "donnee") {
      const cible = q.reponse.lignes.code;
      const liste = e.banque.find((x) => x.donnee === cible)?.reponse;
      if (!donnees.get(cible)) erreurs.push(`Les lignes du tableau de ${q.donnee} viennent d'une donnée inconnue : ${cible}.`);
      else if (!liste || liste.type !== "liste") erreurs.push(`Les lignes du tableau de ${q.donnee} viennent de ${cible}, dont la réponse n'est pas une liste dans la banque.`);
    }
  }
  const posees = e.donnees.filter((d) => d.mode === "demandee" || d.mode === "partagee");
  const banqueParDonnee = new Map(e.banque.map((q) => [q.donnee, q]));
  const sansSpec = posees.filter((d) => !banqueParDonnee.get(d.code)?.reponse && proposerSpec(d.format).certitude !== "sure");

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
      "données posées dont la réponse se déduit du format": posees.length - sansSpec.length,
      "données posées dont la réponse reste à définir dans la banque": sansSpec.length,
      "questions manquantes": demandees.length - questions.size,
      croisements: e.croisements.length,
      scénarios: e.scenarios.length,
      déclencheurs: e.declencheurs.length,
      "références non résolues": nonResolues,
      "règles d'affichage à préciser": aPreciser,
      métiers: e.routage.metiers.length,
      "activités de métiers (sous-parties)": activites,
      "métiers avec agent Comm à trancher": commATrancher,
      seuils: e.seuils.length,
      "thèmes notés sans seuil": sansSeuil.length,
      "thèmes notés avec moins de 2 questions": notesTropCourts,
    },
  };
}

export { TAILLES };

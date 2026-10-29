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
import { cleDuMot, variablesDuGabarit } from "./lexique.ts";
import { groupesNumerotes, proposerSpec, type ReponseSpec } from "./reponse-spec.ts";
import type { Regle, RegleSimple } from "./schemas.ts";
import { cleDeDonnee } from "../audit/affichage.ts";
import { ancienneteExigee, reglePeriode } from "../audit/periodes.ts";
import { controlerEvolution, donneesDeLaSource, fenetresDeLaSource } from "../moteur/evolution.ts";
import { liensDuClasseur } from "../audit/partages.ts";
import type { SourceEvolution } from "./schemas.ts";

function reglesSimples(r: Regle): RegleSimple[] {
  if ("aPreciser" in r || "toujours" in r) return [];
  if ("tous" in r) return r.tous.flatMap(reglesSimples);
  if ("un" in r) return r.un.flatMap(reglesSimples);
  return [r];
}

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

  // Module métier : chaque métier ou activité listé existe ; jamais une profession réglementée (socle seulement, aucun module
  // métier) ; 5 questions au plus par module (CLAUDE.md section 6).
  const parModule = new Map<string, number>();
  for (const d of e.donnees) {
    if (!d.metiers) continue;
    for (const cle of d.metiers) {
      const [id, activite] = cle.split("/");
      const m = e.routage.metiers.find((x) => x.id === id);
      if (!m) { erreurs.push(`La donnée ${d.code} est réservée à un métier inconnu : ${id}.`); continue; }
      if (activite !== undefined && !(m.sousVariantes ?? []).some((v) => v.id === activite)) erreurs.push(`La donnée ${d.code} est réservée à une activité inconnue : ${cle}.`);
      const reglementee = e.routage.categories.find((c) => c.id === m.categorie)?.reglementee ?? false;
      if (reglementee && !e.routage.reglementees.moduleMetier) erreurs.push(`La donnée ${d.code} est réservée à ${m.libelle}, profession réglementée : aucun module métier pour elles.`);
    }
    if (d.mode === "demandee" || d.mode === "partagee") parModule.set(d.theme, (parModule.get(d.theme) ?? 0) + 1);
  }
  for (const [theme, n] of parModule) if (n > 5) erreurs.push(`Le module métier ${theme} pose ${n} questions : 5 au plus.`);

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
      // Un déclencheur qui est une question de la banque (D03 → ACQ-03.01) : les options sont celles de la donnée.
      let options: { id: string }[] | null = null;
      let enAttenteDeBanque = false;
      if (forme?.type === "cases") options = forme.options;
      else if (forme?.type === "reponse_donnee") {
        const question = e.banque.find((q) => q.donnee === forme.donnee);
        if (!question) enAttenteDeBanque = true;
        else if (question.reponse?.type === "cases") options = question.reponse.options;
      }
      if (enAttenteDeBanque) continue;
      if (!options) erreurs.push(`Les exclusions réglementées citent des options pour ${cle}, qui n'est pas une question à cases.`);
      else for (const id of ids) if (!options.some((o) => o.id === id)) erreurs.push(`Les exclusions réglementées citent une option inconnue de ${cle} : ${id}.`);
    }
  }

  // Inscription : questions complètes, et mots du lexique employés qui existent.
  const clesLexique = new Set(e.lexique.map((m) => cleDuMot(m)));
  const idsAttendus = ["metier", "sousVariantes", "metierAbsent", "stock", "chiffreAffairesMensuel", "nombreCollaborateurs", "anciennete", "typeZone", "ville", "acces"];
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
    for (const simple of reglesSimples(r)) {
      if (clesDeclencheurs.has(simple.cle) || simple.cle === "D30") continue;
      // Réponse à une donnée (déclencheur dérivé) : la donnée existe, est posée, et le champ visé existe.
      const dn = cleDeDonnee(simple.cle);
      const donnee = dn ? donnees.get(dn.donnee) : undefined;
      if (!dn || !donnee || (donnee.mode !== "demandee" && donnee.mode !== "partagee")) {
        erreurs.push(`La règle « ${nom} » porte sur une réponse inconnue : ${simple.cle}.`);
        continue;
      }
      // Tant que la question n'est pas écrite dans la banque, le champ ne peut pas être vérifié (les questions manquantes sont comptées à part).
      const questionBanque = e.banque.find((q) => q.donnee === dn.donnee);
      if (dn.chemin !== null && questionBanque) {
        const spec = questionBanque.reponse;
        const champs = new Set<string>();
        if (spec?.type === "composite") for (const c of spec.champs) champs.add(c.id);
        if (spec?.type === "tableau" && spec.lignes.source === "fixe") for (const l of spec.lignes.items) for (const c of spec.colonnes) champs.add(`${l.id}.${c.id}`);
        if (!champs.has(dn.chemin)) erreurs.push(`La règle « ${nom} » vise le champ ${dn.chemin} de ${dn.donnee}, qui n'existe pas dans la banque.`);
      }
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
  // Catalogue des références de marché : une fiche par thème, seuls les thèmes de nature Marché se
  // comparent à un marché, chaque indicateur est une donnée du bon thème avec un sens et des bornes
  // cohérentes. Un indicateur en brouillon n'est jamais cherché : c'est un avertissement tant que le
  // propriétaire ne l'a pas validé.
  const fiches = new Map(e.catalogue.map((f) => [f.theme, f]));
  for (const d of doublons(e.catalogue.map((f) => f.theme))) erreurs.push(`Catalogue : thème en double : ${d}.`);
  for (const t of e.themes) {
    const f = fiches.get(t.code);
    if (!f) {
      erreurs.push(`Le thème ${t.code} n'a pas de fiche dans data/catalogue-themes.json.`);
      continue;
    }
    if (f.nature !== t.nature) erreurs.push(`La fiche ${t.code} annonce la nature ${f.nature}, le thème est ${t.nature}.`);
    if (f.rechercheReference && t.nature !== "marche") erreurs.push(`La fiche ${t.code} demande une recherche de référence alors que le thème est de nature ${t.nature}.`);
    if (f.rechercheReference && f.indicateurs.length === 0) erreurs.push(`La fiche ${t.code} demande une recherche de référence sans indicateur.`);
    if (!f.rechercheReference && f.indicateurs.length > 0) erreurs.push(`La fiche ${t.code} liste des indicateurs sans recherche de référence.`);
    if (!f.rechercheReference && !f.motif) erreurs.push(`La fiche ${t.code} ne dit pas pourquoi elle n'a pas de recherche de référence.`);
    for (const i of f.indicateurs) {
      const dn = donnees.get(i.id);
      if (!dn) erreurs.push(`L'indicateur ${i.id} n'est pas une donnée connue.`);
      else if (dn.theme !== t.code) erreurs.push(`L'indicateur ${i.id} est rangé sous ${t.code}, la donnée est dans ${dn.theme}.`);
      const { min, max } = i.bornesVraisemblance;
      if (min !== null && max !== null && min > max) erreurs.push(`L'indicateur ${i.id} a des bornes de vraisemblance inversées.`);
      if (i.statutRedaction === "valide") {
        if (i.sens === null) erreurs.push(`L'indicateur ${i.id} est validé sans sens.`);
        if (i.sensIncertain) erreurs.push(`L'indicateur ${i.id} est validé alors que son sens est marqué incertain.`);
      }
    }
  }
  const brouillons = e.catalogue.flatMap((f) => f.indicateurs).filter((i) => i.statutRedaction === "brouillon");
  if (brouillons.length > 0) avertissements.push(`${brouillons.length} indicateurs de références de marché sont en brouillon : aucune recherche ne part avant leur validation.`);
  const sensIncertains = brouillons.filter((i) => i.sensIncertain).map((i) => i.id);
  if (sensIncertains.length > 0) avertissements.push(`Sens à trancher pour : ${sensIncertains.join(", ")}.`);
  // Catalogue des effets d'actions : une action, un effet mesuré, rattaché à un thème de son agent et aux
  // croisements qui l'utilisent. Un effet en brouillon n'est jamais cherché.
  const codesCroisements = new Set(e.croisements.map((c) => c.code));
  const themesParCode = new Map(e.themes.map((t) => [t.code, t]));
  for (const d of doublons(e.catalogueEffets.map((x) => x.id))) erreurs.push(`Catalogue des effets : code en double : ${d}.`);
  for (const x of e.catalogueEffets) {
    const t = themesParCode.get(x.theme);
    if (!t) erreurs.push(`L'effet ${x.id} est rangé sous un thème inconnu : ${x.theme}.`);
    else if (t.agent !== x.agent) erreurs.push(`L'effet ${x.id} annonce l'agent ${x.agent}, le thème ${x.theme} est celui de ${t.agent}.`);
    if (!x.id.includes(x.agent === "ACQUISITION_CA" ? "ACQ" : x.agent === "FINANCE_RENTABILITE" ? "FIN" : x.agent === "RH_ORGANISATION" ? "RH" : "COM")) erreurs.push(`Le code de l'effet ${x.id} ne correspond pas à son agent (${x.agent}).`);
    for (const c of x.croisements) if (!codesCroisements.has(c)) erreurs.push(`L'effet ${x.id} cite un croisement inconnu : ${c}.`);
    const { min, max } = x.bornesVraisemblance;
    if (min !== null && max !== null && min > max) erreurs.push(`L'effet ${x.id} a des bornes de vraisemblance inversées.`);
    if (x.statutRedaction === "valide" && (x.sens === null || x.sensIncertain)) erreurs.push(`L'effet ${x.id} est validé sans sens certain.`);
  }
  const effetsEnBrouillon = e.catalogueEffets.filter((x) => x.statutRedaction === "brouillon").length;
  if (effetsEnBrouillon > 0) avertissements.push(`Effets d'actions à valider : ${effetsEnBrouillon} ne sont pas validés ; aucune recherche ne part avant leur validation.`);
  const p = e.parametresReferences;
  if (p.plafondsBudget.quotidienEuros === null) avertissements.push("Aucun plafond quotidien de dépenses pour les recherches de références : seul le plafond mensuel s'applique.");
  for (const c of Object.keys(p.miseAJour.moisParCategorie)) if (!categories.has(c)) erreurs.push(`Fréquence de mise à jour : catégorie inconnue « ${c} ».`);

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
    else if (d.mode !== "demandee" && d.mode !== "partagee") erreurs.push(`La question de ${q.donnee} porte sur une donnée non demandée (${d.mode}).`);
    questions.set(q.donnee, (questions.get(q.donnee) ?? 0) + 1);
  }
  for (const [code, n] of questions) if (n > 1) erreurs.push(`La donnée ${code} a ${n} questions dans la banque.`);
  // Un mot du lexique écrit dans une question doit exister : sinon la question ne s'afficherait jamais.
  for (const q of e.banque) {
    for (const mot of new Set([q.texte, q.aide, q.repli].flatMap((t) => (t ? variablesDuGabarit(t) : [])))) {
      if (!clesLexique.has(mot)) erreurs.push(`La question de ${q.donnee} emploie le mot {${mot}}, absent du lexique.`);
    }
  }
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
  // Bornes (vérification du 28 octobre) : un nombre de personnes, d'heures, de jours ou d'euros ne peut pas être négatif, une part en %
  // reste entre 0 et 100. Seuls le résultat de l'année et la trésorerie peuvent être négatifs.
  const NEGATIF_PERMIS = new Set(["FIN-05.04", "FIN-11.01"]);
  for (const q of e.banque) {
    const champs: [string, ReponseSpec][] = !q.reponse
      ? []
      : q.reponse.type === "composite"
        ? q.reponse.champs.map((c) => [`#${c.id}`, c.spec as ReponseSpec])
        : q.reponse.type === "tableau"
          ? q.reponse.colonnes.map((c) => [`#${c.id}`, c.spec as ReponseSpec])
          : [["", q.reponse]];
    for (const [chemin, s] of champs) {
      if (s.type !== "nombre") continue;
      if (s.unite === "pourcent" && (s.min === undefined || s.max === undefined)) erreurs.push(`${q.donnee}${chemin} : une part en % doit être bornée entre 0 et 100 (min et max).`);
      else if (s.unite !== "pourcent" && s.unite !== "points" && s.min === undefined && !NEGATIF_PERMIS.has(q.donnee)) erreurs.push(`${q.donnee}${chemin} : ce nombre accepterait une valeur négative (min manquant).`);
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

  // Pré-réponses : les codes existent et la donnée visée se répond par un nombre.
  for (const p of e.prereponses.regles) {
    for (const code of [p.donnee, ...p.somme, ...p.exige]) {
      if (!donnees.has(code)) erreurs.push(`La pré-réponse de ${p.donnee} cite une donnée inconnue : ${code}.`);
    }
    for (const code of p.exige) {
      if (!p.somme.includes(code)) erreurs.push(`La pré-réponse de ${p.donnee} exige ${code}, qui ne fait pas partie de la somme.`);
    }
    const spec = banqueParDonnee.get(p.donnee)?.reponse;
    if (spec && spec.type !== "nombre") erreurs.push(`La pré-réponse de ${p.donnee} suppose une réponse en nombre, la banque en définit une autre (${spec.type}).`);
  }
  // Données partagées (data/partages.json) : un lien du classeur entre deux questions posées est une jumelle exacte (même texte,
  // même réponse), un lien qui n'est pas un partage, ou une correspondance partie à partie. Sinon, la réponse donnée chez un agent
  // serait reprise chez l'autre pour une autre question.
  {
    const paire = (a: string, b: string) => [a, b].sort().join(" et ");
    const prerepondues = new Set(e.prereponses.regles.map((r) => r.donnee));
    const pas = new Map(e.partages.pasDesPartages.map((p) => [paire(p.donnee, p.entree), p]));
    const coteDe = (cle: string) => ({ code: cle.split("#")[0], chemin: cle.includes("#") ? cle.slice(cle.indexOf("#") + 1) : "" });
    const enCorrespondance = new Set(e.partages.correspondances.map((c) => paire(coteDe(c.cle).code, coteDe(c.egale).code)));
    const liens = new Set<string>();
    for (const [a, b] of liensDuClasseur(e)) {
      if (prerepondues.has(a) || prerepondues.has(b)) continue;
      liens.add(paire(a, b));
      if (pas.has(paire(a, b)) || enCorrespondance.has(paire(a, b))) continue;
      const qa = banqueParDonnee.get(a);
      const qb = banqueParDonnee.get(b);
      if (qa && qb && (qa.texte !== qb.texte || JSON.stringify(qa.reponse ?? null) !== JSON.stringify(qb.reponse ?? null))) {
        erreurs.push(`Le classeur lie ${a} et ${b} (donnée partagée), mais ce ne sont pas les mêmes questions (texte ou réponse) : décrivez ce lien dans data/partages.json (pas un partage, ou correspondance partie à partie).`);
      }
    }
    for (const p of e.partages.pasDesPartages) {
      if (!liens.has(paire(p.donnee, p.entree))) erreurs.push(`data/partages.json : ${p.donnee} et ${p.entree} ne sont pas liées par le classeur.`);
      if (enCorrespondance.has(paire(p.donnee, p.entree))) erreurs.push(`data/partages.json : ${p.donnee} et ${p.entree} sont à la fois « pas un partage » et en correspondance.`);
    }
    // Ce qu'une partie attend comme réponse : un chiffre (et son unité) ou un choix (et ses options).
    // null : la question n'est pas (encore) écrite dans la banque, rien à comparer.
    const valeurDe = (cle: string): { forme: string; tableau?: string } | string | null => {
      const { code, chemin } = coteDe(cle);
      if (!banqueParDonnee.has(code)) return null;
      const spec = banqueParDonnee.get(code)?.reponse as ReponseSpec | undefined;
      if (!spec) return `${code} n'a pas de réponse écrite dans la banque`;
      const forme = (x: ReponseSpec): string | null =>
        x.type === "nombre" ? `nombre en ${x.unite}` : x.type === "choix" ? `choix ${x.options.map((o) => o.id).join(", ")}` : x.type === "oui_non" ? "oui ou non" : null;
      if (chemin === "") return forme(spec) ? { forme: forme(spec)! } : `${code} n'est pas un chiffre ni un choix : précisez la partie`;
      if (spec.type === "composite") {
        const champ = spec.champs.find((c) => c.id === chemin);
        return champ && forme(champ.spec) ? { forme: forme(champ.spec)! } : `${cle} : champ inconnu ou qui n'est pas un chiffre ni un choix`;
      }
      if (spec.type === "tableau") {
        const [ligne, colonne] = chemin.split(".");
        const col = spec.colonnes.find((c) => c.id === colonne);
        if (!col || !forme(col.spec)) return `${cle} : colonne inconnue ou qui n'est pas un chiffre ni un choix`;
        if (ligne === "*") return { forme: forme(col.spec)!, tableau: JSON.stringify(spec.lignes) };
        if (spec.lignes.source !== "fixe" || !spec.lignes.items.some((l) => l.id === ligne)) return `${cle} : ligne inconnue`;
        return { forme: forme(col.spec)! };
      }
      return `${cle} : une partie ne se lit que dans un groupe de champs ou un tableau`;
    };
    for (const c of e.partages.correspondances) {
      const [a, b] = [valeurDe(c.cle), valeurDe(c.egale)];
      if (typeof a === "string") erreurs.push(`data/partages.json : ${a}.`);
      if (typeof b === "string") erreurs.push(`data/partages.json : ${b}.`);
      if (a === null || b === null || typeof a === "string" || typeof b === "string") continue;
      if (a.forme !== b.forme) erreurs.push(`data/partages.json : ${c.cle} (${a.forme}) et ${c.egale} (${b.forme}) n'attendent pas la même réponse.`);
      if ((a.tableau === undefined) !== (b.tableau === undefined)) erreurs.push(`data/partages.json : ${c.cle} et ${c.egale} : une colonne entière ne correspond qu'à une colonne entière.`);
      else if (a.tableau !== undefined && a.tableau !== b.tableau) erreurs.push(`data/partages.json : ${c.cle} et ${c.egale} n'ont pas les mêmes lignes.`);
      if (!liens.has(paire(coteDe(c.cle).code, coteDe(c.egale).code))) avertissements.push(`data/partages.json : ${coteDe(c.cle).code} et ${coteDe(c.egale).code} ne sont pas liées par le classeur.`);
    }
  }

  // Ce que le dirigeant a déjà essayé (data/deja-tente.json) : des choix aux identifiants uniques.
  for (const [nom, options] of [["résultat", e.dejaTente.precisions.resultat.options], ["durée", e.dejaTente.precisions.duree.options]] as const) {
    for (const d of doublons(options.map((o) => o.id))) erreurs.push(`data/deja-tente.json : choix « ${d} » en double (${nom}).`);
  }
  if (e.dejaTente.aValider) avertissements.push("data/deja-tente.json : textes de la question « déjà essayé » à relire par le propriétaire.");

  // Tableaux liés : chaque tableau et chaque question suivie est un tableau à lignes numérotées de la banque, avec les mêmes
  // groupes de lignes ; la colonne qui nomme les lignes existe dans au moins une question suivie.
  const groupesDe = (code: string) => {
    const spec = banqueParDonnee.get(code)?.reponse;
    return spec?.type === "tableau" && spec.lignes.source === "fixe" ? groupesNumerotes(spec.lignes.items) : null;
  };
  for (const d of doublons(e.tableauxLies.liens.map((l) => l.tableau))) erreurs.push(`Tableaux liés : ${d} est écrit deux fois.`);
  let liensSansEffet = 0;
  for (const l of e.tableauxLies.liens) {
    for (const code of [l.tableau, ...l.suit]) if (!donnees.has(code)) erreurs.push(`Tableaux liés : ${code} n'est pas une donnée du classeur.`);
    if (l.suit.includes(l.tableau)) erreurs.push(`Tableaux liés : ${l.tableau} se suit lui-même.`);
    // Une question pas encore écrite dans la banque : le lien n'a pas d'effet tant qu'elle manque.
    if (![l.tableau, ...l.suit].every((code) => banqueParDonnee.has(code))) {
      liensSansEffet++;
      continue;
    }
    const g = groupesDe(l.tableau);
    if (!g) erreurs.push(`Tableaux liés : ${l.tableau} n'est pas un tableau à lignes numérotées dans la banque.`);
    for (const code of l.suit) {
      const gs = groupesDe(code);
      if (!gs) erreurs.push(`Tableaux liés : ${l.tableau} suit ${code}, qui n'est pas un tableau à lignes numérotées dans la banque.`);
      else if (g && gs.map((x) => x.base).join() !== g.map((x) => x.base).join()) erreurs.push(`Tableaux liés : ${l.tableau} et ${code} n'ont pas les mêmes lignes.`);
    }
    if (l.nom && !l.suit.some((code) => { const s = banqueParDonnee.get(code)?.reponse; return s?.type === "tableau" && s.colonnes.some((c) => c.id === l.nom); })) {
      erreurs.push(`Tableaux liés : la colonne ${l.nom} qui nomme les lignes de ${l.tableau} n'existe dans aucune question suivie.`);
    }
  }
  if (liensSansEffet > 0) avertissements.push(`Tableaux liés : ${liensSansEffet} lien(s) portent sur une question absente de la banque (sans effet tant qu'elle manque).`);
  // Objectifs proposés : l'agent existe, les identifiants sont uniques, les thèmes existent et sont ceux de l'agent.
  for (const [agent, def] of Object.entries(e.objectifsAgents.agents)) {
    if (!e.themes.some((t) => t.agent === agent)) erreurs.push(`Objectifs proposés : l'agent ${agent} n'existe pas.`);
    for (const d of doublons(def.objectifs.map((o) => o.id))) erreurs.push(`Objectifs proposés (${agent}) : identifiant en double ${d}.`);
    for (const o of def.objectifs) {
      for (const code of o.themes) {
        const t = themesParCode.get(code);
        if (!t) erreurs.push(`Objectif ${o.id} : le thème ${code} n'existe pas.`);
        else if (t.agent !== agent) erreurs.push(`Objectif ${o.id} : le thème ${code} n'est pas un thème de l'agent ${agent}.`);
      }
      if (o.mesure === "chiffre" && !o.unite) erreurs.push(`Objectif ${o.id} : un objectif chiffré a une unité.`);
      if (o.unite && o.unites && !o.unites.includes(o.unite)) erreurs.push(`Objectif ${o.id} : l'unité proposée d'abord (${o.unite}) n'est pas parmi ses unités.`);
      if (o.gabarit && (o.mesure !== "chiffre" || (o.unites ?? [o.unite]).length !== 1 || !o.question)) erreurs.push(`Objectif ${o.id} : un gabarit va avec un objectif chiffré, une seule unité et l'intitulé du chiffre (« question »).`);
      // Chaque phrase finale d'un objectif chiffré est écrite à l'avance (28 octobre) : un gabarit, ou une phrase par unité.
      if (o.mesure === "chiffre") {
        const unitesO = o.unites ?? (o.unite ? [o.unite] : []);
        if (!o.question) erreurs.push(`Objectif ${o.id} : un objectif chiffré a l'intitulé de son chiffre (« question »).`);
        if (o.gabarit && o.phrases) erreurs.push(`Objectif ${o.id} : un gabarit ou des phrases par unité, pas les deux.`);
        if (!o.gabarit && unitesO.some((u) => !o.phrases?.[u])) erreurs.push(`Objectif ${o.id} : une phrase finale par unité proposée (« phrases »).`);
        for (const u of Object.keys(o.phrases ?? {})) if (!unitesO.includes(u as (typeof unitesO)[number])) erreurs.push(`Objectif ${o.id} : phrase pour l'unité ${u}, qui n'est pas proposée.`);
        for (const g of [o.gabarit, ...Object.values(o.phrases ?? {})]) {
          if (g && [g.singulier, g.pluriel].some((t) => (t.match(/\{dici\}/g) ?? []).length > 1 || /\{(?!n\}|dici\})[^}]*\}/.test(t))) erreurs.push(`Objectif ${o.id} : une phrase finale n'emploie que {n} et au plus un {dici}.`);
        }
      }
      if (!o.exemple.reussite) erreurs.push(`Objectif ${o.id} : une phrase de réussite en exemple (ce que le dirigeant veut constater).`);
      if (o.mesure === "phrase" && (o.unite || o.unites || o.gabarit || o.phrases || o.libellesUnites)) erreurs.push(`Objectif ${o.id} : un objectif sans chiffre n'a ni unité ni phrase chiffrée.`);
      const parties = (def.parties ?? []).map((p) => p.nom);
      if (parties.length > 0 && !parties.includes(o.groupe ?? "")) erreurs.push(`Objectif ${o.id} : sa partie « ${o.groupe ?? ""} » n'est pas dans les parties de l'agent.`);
      if (parties.length === 0 && o.groupe) erreurs.push(`Objectif ${o.id} : partie « ${o.groupe} » sans liste des parties de l'agent.`);
    }
    for (const d of doublons(def.objectifs.map((o) => o.libelle.toLowerCase()))) erreurs.push(`Objectifs proposés (${agent}) : titre en double « ${d} ».`);
    // Parcours du questionnaire de chaque partie (Comm, 6C) : une question à choix de la banque, des réponses qui existent,
    // chacune rattachée à une seule partie.
    const vues = new Map<string, string>();
    for (const p of def.parties ?? []) {
      if (!p.parcours) continue;
      const q = banqueParDonnee.get(p.parcours.donnee);
      if (!q) {
        avertissements.push(`Objectifs proposés (${agent}) : la partie « ${p.nom} » suit ${p.parcours.donnee}, absente de la banque (aucun écart signalé tant qu'elle manque).`);
        continue;
      }
      const spec = q.reponse;
      if (spec?.type !== "choix") {
        erreurs.push(`Objectifs proposés (${agent}) : la partie « ${p.nom} » suit ${p.parcours.donnee}, qui n'est pas une question à choix de la banque.`);
        continue;
      }
      for (const r of p.parcours.reponses) {
        if (!spec.options.some((x) => x.id === r)) erreurs.push(`Objectifs proposés (${agent}) : la réponse ${r} de ${p.parcours.donnee} n'existe pas (partie « ${p.nom} »).`);
        if (vues.has(r)) erreurs.push(`Objectifs proposés (${agent}) : la réponse ${r} donne deux parties (« ${vues.get(r)} » et « ${p.nom} »).`);
        vues.set(r, p.nom);
      }
    }
  }
  if (e.objectifsAgents.aValider) avertissements.push("Objectifs proposés par agent (RH, Comm) : brouillon à valider par le propriétaire.");
  // Retraits (doublons) : la donnée existe, est posée, et n'alimente ni un calcul ni une règle d'affichage ; la donnée conservée existe.
  const donneesParCode = new Map(e.donnees.map((d) => [d.code, d]));
  const texteRegles = JSON.stringify(e.reglesAffichage);
  for (const r of e.retraits.retraits) {
    const d = donneesParCode.get(r.donnee);
    if (!d) erreurs.push(`Retrait : la donnée ${r.donnee} n'existe pas.`);
    else if (d.mode !== "demandee" && d.mode !== "partagee") erreurs.push(`Retrait : ${r.donnee} n'est pas une donnée posée au client.`);
    if (!donneesParCode.has(r.conservee)) erreurs.push(`Retrait de ${r.donnee} : la donnée conservée ${r.conservee} n'existe pas.`);
    const alimente = e.donnees.filter((x) => x.entrees.includes(r.donnee)).map((x) => x.code);
    if (alimente.length > 0) erreurs.push(`Retrait de ${r.donnee} impossible : elle alimente ${alimente.join(", ")}.`);
    if (e.croisements.some((c) => c.entrees.includes(r.donnee))) erreurs.push(`Retrait de ${r.donnee} impossible : un croisement l'utilise.`);
    if (texteRegles.includes(`"${r.donnee}`)) erreurs.push(`Retrait de ${r.donnee} impossible : une règle d'affichage la lit.`);
  }
  if (e.retraits.retraits.length > 0) {
    avertissements.push(`${e.retraits.retraits.length} donnée(s) retirée(s) des questionnaires (doublons, décision du propriétaire) : ${e.retraits.retraits.map((r) => r.donnee).join(", ")}. À supprimer au classeur, puis à enlever de data/retraits.json.`);
  }
  // Réponses déduites : la donnée existe, la source est une question à cases qui propose l'option.
  for (const i of e.implications.implications) {
    if (!donneesParCode.has(i.donnee)) erreurs.push(`Implication : la donnée ${i.donnee} n'existe pas.`);
    const specSource = banqueParDonnee.get(i.siCoche.donnee)?.reponse;
    if (specSource && (specSource.type !== "cases" || !specSource.options.some((o) => o.id === i.siCoche.option))) erreurs.push(`Implication sur ${i.donnee} : ${i.siCoche.donnee} n'a pas de case « ${i.siCoche.option} » dans la banque.`);
  }
  // Vocabulaires par métier : chaque vocabulaire existe dans le lexique, chaque métier et chaque activité dans le routage.
  const clesVocabulaire = new Set(e.lexique.flatMap((m) => Object.keys(m.metiers ?? {})));
  const idsMetiers = new Set(e.routage.metiers.map((m) => m.id));
  const idsActivites = new Set(e.routage.metiers.flatMap((m) => (m.sousVariantes ?? []).map((v) => `${m.id}/${v.id}`)));
  const vm = e.vocabulairesMetiers;
  for (const cle of Object.keys(vm.vocabulaires)) if (!clesVocabulaire.has(cle)) erreurs.push(`Vocabulaire « ${cle} » : absent du lexique (champ « metiers »).`);
  for (const [id, a] of Object.entries(vm.metiers)) {
    if (!idsMetiers.has(id)) erreurs.push(`Vocabulaire : le métier ${id} n'existe pas dans le routage.`);
    if (!clesVocabulaire.has(a.vocabulaire)) erreurs.push(`Vocabulaire du métier ${id} : « ${a.vocabulaire} » n'existe pas dans le lexique.`);
  }
  for (const [id, a] of Object.entries(vm.activites)) {
    if (!idsActivites.has(id)) erreurs.push(`Vocabulaire : l'activité ${id} n'existe pas dans le routage.`);
    if (!clesVocabulaire.has(a.vocabulaire)) erreurs.push(`Vocabulaire de l'activité ${id} : « ${a.vocabulaire} » n'existe pas dans le lexique.`);
  }
  if (!vm.valide) avertissements.push(`Vocabulaires par métier : proposition non validée (${Object.keys(vm.metiers).length} métiers, ${Object.keys(vm.activites).length} activités, ${Object.keys(vm.aTrancher).length} à trancher) ; les mots du profil restent en vigueur.`);
  else if (Object.keys(vm.aTrancher).length > 0) avertissements.push(`Vocabulaires par métier : ${Object.keys(vm.aTrancher).length} métiers ou activités attendent encore leur vocabulaire (${[...new Set(Object.values(vm.aTrancher))].join(" ")}) ; les mots du profil restent pour eux.`);
  for (const id of [...Object.keys(vm.profilConserve), ...Object.keys(vm.aTrancher)]) {
    if (!idsMetiers.has(id) && !idsActivites.has(id)) erreurs.push(`Vocabulaire : ${id} n'existe pas dans le routage.`);
    if (id in vm.metiers || id in vm.activites) erreurs.push(`Vocabulaire : ${id} a un vocabulaire et figure aussi parmi les métiers sans vocabulaire.`);
  }
  const sansSpec = posees.filter((d) => !banqueParDonnee.get(d.code)?.reponse && proposerSpec(d.format).certitude !== "sure");

  // Périodes (vérification de l'historique, 28 octobre) : chaque formulation de la colonne « Période » est lisible, et une question
  // sur des mois passés n'est posée qu'à une entreprise qui existait alors (sauf si ses mois « depuis la création » s'adaptent).
  for (const d of e.donnees) {
    const r = reglePeriode(d.periode);
    if (!r.reconnue) erreurs.push(`Période illisible pour ${d.code} : « ${d.periode} ».`);
    const f = r.fenetre;
    if (!f || r.adaptee || (f.type === "mois" && f.decalage === 0) || (f.type === "instant" && f.decalage === 0)) continue;
    const exige = ancienneteExigee(f);
    if ((r.minimumMois ?? 0) < exige)
      erreurs.push(`${d.code} demande des mois passés (${d.periode}) : il faut la masquer avant ${exige} mois d'existence, pas ${r.minimumMois ?? 0}.`);
  }
  // Évolutions : codes connus, deux périodes de même longueur décalées de l'écart annoncé, et chaque donnée calculée
  // « Évolution… » du classeur est soit calculée, soit listée avec la raison pour laquelle elle ne l'est pas encore.
  const periodeDe = (code: string) => donnees.get(code)?.periode ?? null;
  for (const d of doublons(e.evolutions.evolutions.map((x) => x.id))) erreurs.push(`Évolutions : identifiant en double ${d}.`);
  for (const ev of e.evolutions.evolutions) {
    if (!donnees.has(ev.code)) erreurs.push(`Évolution ${ev.id} : donnée calculée inconnue ${ev.code}.`);
    for (const c of [...donneesDeLaSource(ev.actuel), ...donneesDeLaSource(ev.passe)]) if (!donnees.has(c)) erreurs.push(`Évolution ${ev.id} : donnée inconnue ${c}.`);
    erreurs.push(...controlerEvolution(ev, periodeDe));
  }
  // Mesures de l'écran « Résultats » (data/mesures.json) : chaque donnée lue est la donnée de la mesure ou l'une de ses entrées
  // dans le classeur (aucune formule ajoutée) ; colonnes et champs existent ; les mois d'une mesure s'accordent ; un objectif
  // proposé n'est mesuré que par une seule mesure, avec des unités qu'il propose.
  const entreesDe = (code: string, vues = new Set<string>()): Set<string> => {
    for (const c of donnees.get(code)?.entrees ?? []) if (!vues.has(c)) { vues.add(c); entreesDe(c, vues); }
    return vues;
  };
  const objectifsProposes = new Map(Object.values(e.objectifsAgents.agents).flatMap((a) => a?.objectifs ?? []).map((o) => [o.id, o]));
  const objectifsMesures = new Map<string, string>();
  for (const d of doublons(e.mesures.mesures.map((m) => m.id))) erreurs.push(`Mesures : identifiant en double ${d}.`);
  const parcourir = (src: SourceEvolution, f: (x: SourceEvolution) => void) => {
    f(src);
    if (src.type === "somme") src.termes.forEach((t) => parcourir(t, f));
    if (src.type === "rapport" || src.type === "taux") { parcourir(src.numerateur, f); parcourir(src.denominateur, f); }
    if (src.type === "marge") { parcourir(src.ca, f); parcourir(src.chargesParMois, f); }
  };
  for (const m of e.mesures.mesures) {
    if (!donnees.has(m.code)) { erreurs.push(`Mesure ${m.id} : donnée inconnue ${m.code}.`); continue; }
    const permises = new Set([m.code, ...entreesDe(m.code)]);
    for (const c of donneesDeLaSource(m.source)) {
      if (!donnees.has(c)) erreurs.push(`Mesure ${m.id} : donnée inconnue ${c}.`);
      else if (!permises.has(c)) erreurs.push(`Mesure ${m.id} : ${c} n'est ni ${m.code} ni l'une de ses entrées dans le classeur.`);
    }
    for (const t of m.themes) if (!e.themes.some((x) => x.code === t)) erreurs.push(`Mesure ${m.id} : thème inconnu ${t}.`);
    parcourir(m.source, (x) => {
      if (x.type !== "nombre" && x.type !== "colonne" && x.type !== "mois") return;
      const spec = banqueParDonnee.get(x.donnee)?.reponse as ReponseSpec | undefined;
      if (!spec) return;
      if (x.type === "nombre" && x.champ && !(spec.type === "composite" && spec.champs.some((c) => c.id === x.champ))) erreurs.push(`Mesure ${m.id} : ${x.donnee} n'a pas de champ « ${x.champ} ».`);
      if ((x.type === "colonne" || x.type === "mois") && !(spec.type === "tableau" && spec.colonnes.some((c) => c.id === x.colonne))) erreurs.push(`Mesure ${m.id} : ${x.donnee} n'a pas de colonne « ${x.colonne} ».`);
      if (x.type === "colonne" && x.lignesVides === "ignorees" && !(spec.type === "tableau" && spec.lignes.source === "fixe"))
        erreurs.push(`Mesure ${m.id} : les lignes vides ne s'ignorent que dans un tableau à lignes fixes (${x.donnee}).`);
    });
    if (m.periode) {
      if (!reglePeriode(m.periode.texte).fenetre) erreurs.push(`Mesure ${m.id} : période « ${m.periode.texte} » illisible.`);
    } else {
      const fs = fenetresDeLaSource(m.source, periodeDe);
      const mois = (f: NonNullable<typeof fs>[number]) => (f.type === "instant" ? `${f.decalage}-${f.decalage}` : `${f.mois + f.decalage}-${1 + f.decalage}`);
      if (fs && fs.some((f) => mois(f) !== mois(fs[0]))) erreurs.push(`Mesure ${m.id} : ses données ne portent pas sur les mêmes mois ; indiquez la période retenue et pourquoi.`);
    }
    for (const o of m.objectifs ?? []) {
      const prop = objectifsProposes.get(o.id);
      if (!prop) { erreurs.push(`Mesure ${m.id} : objectif proposé inconnu ${o.id}.`); continue; }
      const unites = prop.unites ?? (prop.unite ? [prop.unite] : []);
      for (const u of o.unites) if (!unites.includes(u)) erreurs.push(`Mesure ${m.id} : l'objectif ${o.id} ne propose pas l'unité ${u}.`);
      if (objectifsMesures.has(o.id)) erreurs.push(`L'objectif ${o.id} est mesuré par ${objectifsMesures.get(o.id)} et par ${m.id}.`);
      objectifsMesures.set(o.id, m.id);
    }
  }

  const traitees = new Set([...e.evolutions.evolutions.map((x) => x.code), ...e.evolutions.nonCalculables.map((x) => x.code)]);
  for (const d of e.donnees) {
    if (d.mode === "calculee" && /^Évolution/.test(d.libelle) && !traitees.has(d.code)) erreurs.push(`La donnée calculée ${d.code} (« ${d.libelle} ») n'est ni dans data/evolutions.json, ni listée comme non calculable.`);
  }

  // Une donnée « partagée » se pose comme une donnée demandée (par le premier agent qui en a besoin).
  const demandees = posees;
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
      "questions manquantes": demandees.filter((d) => !questions.has(d.code)).length,
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
      "thèmes avec recherche de référence": e.catalogue.filter((f) => f.rechercheReference).length,
      "effets d'actions au catalogue": e.catalogueEffets.length,
      "indicateurs de référence en brouillon": brouillons.length,
    },
  };
}

export { TAILLES };

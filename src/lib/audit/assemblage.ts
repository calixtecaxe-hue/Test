// Assemblage du questionnaire d'un agent (CLAUDE.md section 6).
//
// Le questionnaire est assemblé selon le profil, la taille, le niveau et les réponses
// aux questions déclencheuses ; seul l'assemblage est automatique, les questions
// sont écrites à l'avance dans la banque. Le classeur marque les données par profil
// (ou par taille pour l'agent RH) : il ne distingue pas encore le socle, le module
// catégorie et le module métier, donc ces trois couches sont assemblées ensemble
// (profil), puis filtrées par la taille et par les déclencheurs.
//
// Une donnée « demandée » sans question dans la banque est signalée comme manquante :
// rien n'est inventé.
//
// Ce fichier n'importe que des types et des fonctions pures : il se teste avec Node.

import type { Donnee, EnsembleDonnees, ProfilId, Question, Theme, CodeAgent, FormeDeclencheur } from "../donnees/schemas.ts";
import { formuler } from "../donnees/lexique.ts";
import {
  cleDeDonnee,
  clesDeLaRegle,
  declencheurDeLaCle,
  declencheurRepondu,
  evaluer,
  lecteurDeclencheurs,
  donneeDuDeclencheur,
  moisMinimumDExistence,
  type TailleId,
} from "./affichage.ts";
import { accepteLesQuatreReponses, type Reponses } from "./reponse.ts";
import { prereponseDe, type Prereponse } from "./prereponse.ts";
import type { Prereponses } from "../donnees/schemas.ts";
import { proposerSpec, type ReponseSpec } from "../donnees/reponse-spec.ts";
import type { ReglesAffichage, Routage } from "../donnees/schemas.ts";

export type Exclusions = NonNullable<Routage["reglementees"]["acquisitionExclut"]>;

export type Niveau = "essentiel" | "approfondi";

export type ContexteAssemblage = {
  agent: CodeAgent;
  profils: ProfilId[];
  taille: TailleId;
  niveau: Niveau;
  // Ancienneté en mois (D01) : une donnée « si plus de N mois d'existence » est masquée
  // avant. Non renseignée : rien n'est masqué.
  ancienneteMois?: number;
  // Ce que l'audit ne pose pas à ce compte (professions réglementées, agent Acquisition).
  exclusions?: Exclusions | null;
  // Tout ce que le compte a déjà répondu, tous agents confondus (données partagées).
  reponses: Reponses;
};

export type QuestionAssemblee = {
  code: string;
  themeCode: string;
  libelle: string; // libellé de la donnée dans le classeur
  format: string | null;
  niveau: Niveau;
  // Texte écrit dans la banque, avec les mots du métier ; null tant que la banque ne
  // l'a pas écrit.
  texte: string | null;
  aide: string | null;
  repli: string | null;
  quatreReponses: boolean;
  // Réponse attendue : celle de la banque, sinon celle que le format du classeur permet de
  // déduire ; null si la banque doit encore la définir (saisie libre en attendant).
  spec: ReponseSpec | null;
  specSource: "banque" | "classeur" | null;
  // Déjà posée par un autre agent : reprise telle quelle, jamais redemandée.
  dejaPosee: boolean;
  // Code de la donnée qui porte la réponse quand elle a été donnée pour un autre agent.
  dejaPoseeDans: string | null;
  // Total calculé d'après le détail déjà donné à d'autres agents, proposé comme réponse (le
  // dirigeant le garde ou le corrige) ; null s'il n'y a rien à proposer.
  prereponse: Prereponse | null;
};

export type DeclencheurAPoser = { code: string; question: string; forme: FormeDeclencheur };

export type ThemeAssemble = { theme: Theme; questions: QuestionAssemblee[] };

export type Assemblage = {
  // Questions de cadrage à poser d'abord (déclencheurs sans réponse).
  declencheursAPoser: DeclencheurAPoser[];
  // Toutes les questions de cadrage dont dépend ce questionnaire, répondues ou non :
  // le dirigeant peut modifier ses réponses.
  declencheursConcernes: DeclencheurAPoser[];
  themes: ThemeAssemble[];
  // Questions d'un autre agent dont dépendent des questions de celui-ci (types de clients, canaux) : posées ici par le
  // premier agent qui en a besoin, avec leur réponse si elle existe déjà (CLAUDE.md section 6).
  prealables: QuestionAssemblee[];
  // Thèmes qui ne s'appliquent pas à cette entreprise : masqués, pas « non évalués ».
  themesMasques: Theme[];
  // Données qui attendent la réponse à un déclencheur.
  enAttente: number;
  // Données déjà posées par un autre agent.
  dejaPosees: number;
  statistiques: { aPoser: number; ecrites: number; manquantes: number; essentielles: number };
};

// Données équivalentes : une donnée « partagée » est posée une seule fois, par le
// premier agent qui en a besoin ; elle renvoie vers les données de l'autre agent
// qu'elle remplace (colonne « Données utilisées » du classeur).
// Données qui s'affichent toujours, déjà remplies d'après un détail (data/prereponses.json) : elles n'ont pas d'équivalent.
// Le budget marketing de la Finance reste posé même quand le détail (Comm, Acquisition) est connu, avec le total calculé ;
// le détail lui-même reste demandé : une réponse totale ne dispense pas du détail, ni l'inverse.
export function donneesPrerepondues(prereponses: Prereponses): Set<string> {
  return new Set(prereponses.regles.map((r) => r.donnee));
}

export function equivalences(donnees: Donnee[], exclues: ReadonlySet<string> = new Set()): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  const lier = (a: string, b: string) => {
    if (!index.has(a)) index.set(a, new Set());
    if (!index.has(b)) index.set(b, new Set());
    index.get(a)!.add(b);
    index.get(b)!.add(a);
  };
  const posables = new Set(donnees.filter((d) => d.mode === "demandee" || d.mode === "partagee").map((d) => d.code));
  for (const d of donnees) {
    if (d.mode !== "partagee" || exclues.has(d.code)) continue;
    for (const e of d.entrees) if (posables.has(e) && !exclues.has(e)) lier(d.code, e);
  }
  return index;
}

function concerne(d: Donnee, profils: ProfilId[], taille: TailleId): boolean {
  if ("tailles" in d) return d.tailles[taille];
  return profils.some((p) => d.profils[p]);
}

// Donnée dont la réponse porte une clé de règle (« D03 » → ACQ-03.01, « COM-23.01#tiktok.messages » → COM-23.01), ou null
// quand la clé est un vrai déclencheur de cadrage.
function donneeSource(cle: string, regles: ReglesAffichage): string | null {
  return cleDeDonnee(cle)?.donnee ?? donneeDuDeclencheur(regles, cle.split(".")[0]);
}

// Agent d'une donnée d'après le préfixe de son code.
function agentDeLaDonnee(e: EnsembleDonnees, code: string): CodeAgent | undefined {
  return e.themes.find((t) => t.code === code.slice(0, code.indexOf(".")))?.agent;
}

// Réponses que l'on déduit d'autres réponses (data/implications.json) : « oui » à « Avez-vous un site internet ? » quand le client a
// coché « site internet » parmi ses canaux. Une réponse déjà donnée l'emporte : rien n'est déduit.
export function reponsesDeduites(impl: EnsembleDonnees["implications"], reponses: Reponses): { reponses: Reponses; codes: Set<string> } {
  const deduites: Reponses = {};
  const codes = new Set<string>();
  for (const i of impl.implications) {
    if (reponses[i.donnee] !== undefined) continue;
    const source = reponses[i.siCoche.donnee];
    if (source?.genre === "saisie" && Array.isArray(source.valeur) && source.valeur.includes(i.siCoche.option)) {
      deduites[i.donnee] = { genre: "saisie", valeur: i.valeur };
      codes.add(i.donnee);
    }
  }
  return { reponses: deduites, codes };
}

// Les questions de cadrage exclues valent « non » ; les options exclues d'une question à cases
// sont retirées, y compris d'une réponse donnée avant.
export function appliquerExclusions(reponses: Reponses, ex: Exclusions | null | undefined, regles?: ReglesAffichage): Reponses {
  if (!ex) return reponses;
  const r: Reponses = { ...reponses };
  for (const d of ex.declencheurs) r[d] = { genre: "saisie", valeur: "non" };
  for (const [cle, ids] of Object.entries(ex.optionsCadrage)) {
    // Un déclencheur qui est une question de la banque (D03 → ACQ-03.01) : l'exclusion s'applique à la donnée.
    for (const k of [cle, regles ? donneeDuDeclencheur(regles, cle) : null]) {
      const v = k ? r[k] : undefined;
      if (k && v?.genre === "saisie" && Array.isArray(v.valeur)) r[k] = { genre: "saisie", valeur: v.valeur.filter((x) => !ids.includes(x)) };
    }
  }
  return r;
}

export function assemblerQuestionnaire(e: EnsembleDonnees, entree: ContexteAssemblage): Assemblage {
  const ex = entree.agent === "ACQUISITION_CA" ? entree.exclusions : null;
  const regles = e.reglesAffichage;
  const reponsesBrutes = appliquerExclusions(entree.reponses, ex, regles);
  // Données retirées des questionnaires (doublons), et réponses déduites d'autres réponses : ni les unes ni les autres ne sont posées.
  const retires = new Set(e.retraits.retraits.map((r) => r.donnee));
  const implicites = reponsesDeduites(e.implications, reponsesBrutes);
  const ctx: ContexteAssemblage = { ...entree, reponses: { ...reponsesBrutes, ...implicites.reponses } };
  const lire = lecteurDeclencheurs(ctx.reponses, ctx.taille, regles);
  const banque = new Map<string, Question>(e.banque.map((q) => [q.donnee, q]));
  const equiv = equivalences(e.donnees, donneesPrerepondues(e.prereponses));
  const declencheursParCode = new Map(e.declencheurs.map((d) => [d.code, d]));
  const themesAgent = e.themes.filter((t) => t.agent === ctx.agent && !(ex?.themes ?? []).includes(t.code));

  const concernes = new Set<string>();
  const themes: ThemeAssemble[] = [];
  const themesMasques: Theme[] = [];
  let enAttente = 0;
  let dejaPosees = 0;
  let essentielles = 0;

  // Données dont la réponse décide de l'affichage d'autres questions (conditions, masquages, lignes de tableaux).
  const sources = new Set<string>();
  const pointer = (cles: string[]) => {
    for (const c of cles) {
      concernes.add(declencheurDeLaCle(c));
      const source = donneeSource(c, regles);
      if (source) sources.add(source);
    }
  };

  // Une donnée devient une question : texte de la banque avec les mots du métier, type de réponse, réponse déjà donnée.
  // « attente » : sa condition attend la réponse à une autre question.
  const construire = (d: Donnee, themeCode: string): QuestionAssemblee | "attente" | null => {
    if (implicites.codes.has(d.code)) return null;
    const condition = d.condition ? regles.conditions[d.condition] : undefined;
    const minimum = moisMinimumDExistence(d.periode);
    if (minimum !== null && ctx.ancienneteMois !== undefined && ctx.ancienneteMois < minimum) return null;
    if (condition) pointer(clesDeLaRegle(condition));
    const visible = condition ? evaluer(condition, lire) : true;
    if (visible === false) return null;
    if (visible === null && condition) return "attente";

    const q = banque.get(d.code);
    let texte: string | null = null;
    if (q) {
      const f = formuler(q.texte, ctx.profils, e.lexique);
      // Un mot du lexique absent pour ce profil : la question ne s'applique pas.
      if (!f.ok) return null;
      texte = f.texte;
    }
    const proposee = proposerSpec(d.format);
    let spec = q?.reponse ?? (proposee.certitude === "sure" ? proposee.spec : null);
    // Question qui tient lieu de déclencheur : les options exclues pour ce compte (publicité…) ne sont pas proposées.
    if (spec?.type === "cases" && ex) {
      const retirees = Object.entries(ex.optionsCadrage).filter(([cle]) => donneeDuDeclencheur(regles, cle) === d.code).flatMap(([, ids]) => ids);
      if (retirees.length > 0) spec = { ...spec, options: spec.options.filter((o) => !retirees.includes(o.id)) };
    }
    const specSource = q?.reponse ? "banque" : spec ? "classeur" : null;
    const equivalents = [...(equiv.get(d.code) ?? [])];
    const deja = ctx.reponses[d.code] !== undefined || equivalents.some((c) => ctx.reponses[c] !== undefined);
    if (deja) dejaPosees++;
    if (d.niveau === "essentiel") essentielles++;
    // Les mots du lexique valent aussi dans l'aide et la question de repli.
    const mots = (t: string | null | undefined): string | null => {
      if (!t) return null;
      const f = formuler(t, ctx.profils, e.lexique);
      return f.ok ? f.texte : t.replace(/\{[a-z0-9_]+\}/g, "").replace(/\s+([.,;:])/g, "$1");
    };
    return {
      code: d.code,
      themeCode,
      libelle: d.libelle,
      format: d.format,
      niveau: d.niveau as Niveau,
      texte,
      aide: mots(q?.aide),
      repli: mots(q?.repli),
      quatreReponses: spec ? spec.type === "nombre" : accepteLesQuatreReponses(d.format),
      spec,
      specSource,
      dejaPosee: deja && ctx.reponses[d.code] === undefined,
      dejaPoseeDans: ctx.reponses[d.code] === undefined ? equivalents.find((c) => ctx.reponses[c] !== undefined) ?? null : null,
      prereponse: spec?.type === "nombre" && ctx.reponses[d.code] === undefined ? prereponseDe(e.prereponses, d.code, ctx.reponses) : null,
    };
  };

  for (const theme of themesAgent) {
    const candidates = e.donnees.filter(
      (d) =>
        d.theme === theme.code &&
        !retires.has(d.code) &&
        (d.mode === "demandee" || d.mode === "partagee") &&
        d.niveau !== null &&
        (ctx.niveau === "approfondi" || d.niveau === "essentiel") &&
        concerne(d, ctx.profils, ctx.taille)
    );
    // Un thème dont le masquage est vrai est masqué, pas « non évalué » — y compris
    // quand c'est la taille qui l'écarte (RH : aucune donnée pour « seul »).
    const concerneLEntreprise = e.donnees.some(
      (d) =>
        d.theme === theme.code &&
        (d.mode === "demandee" || d.mode === "partagee") &&
        ("tailles" in d ? Object.values(d.tailles).some(Boolean) : ctx.profils.some((p) => d.profils[p]))
    );
    if (!concerneLEntreprise) continue;

    const masquage = theme.masquePour ? regles.masquages[theme.masquePour] : undefined;
    if (masquage) pointer(clesDeLaRegle(masquage));
    const masque = masquage ? evaluer(masquage, lire) : false;
    // Une donnée qui porte sa propre condition, vraie, reste posée même si le thème est
    // masqué (ex. COM-10 : masqué pour qui ne publie pas, mais ses questions « si vous ne
    // publiez pas encore » s'adressent justement à lui).
    const conditionVraie = (d: Donnee) => {
      const c = d.condition ? regles.conditions[d.condition] : undefined;
      return c !== undefined && evaluer(c, lire) === true;
    };
    // La question dont la réponse décide du masquage reste toujours posée : sans elle, le thème attendrait
    // une réponse qu'il est seul à pouvoir demander (COM-10.07 « publiez-vous régulièrement ? » décide du masquage de COM-10).
    const sourcesMasquage = new Set(masquage ? clesDeLaRegle(masquage).map((c) => donneeSource(c, regles)).filter((c): c is string => c !== null) : []);
    const decideDuMasquage = (d: Donnee) => sourcesMasquage.has(d.code);
    let aPoser = masque === true ? candidates.filter((d) => conditionVraie(d) || decideDuMasquage(d)) : candidates;
    if (masque === true && aPoser.length === 0) {
      themesMasques.push(theme);
      continue;
    }
    if (candidates.length === 0) continue;
    if (masque === null && masquage) {
      aPoser = candidates.filter(decideDuMasquage);
      enAttente += candidates.length - aPoser.length;
      if (aPoser.length === 0) continue;
    }

    const questions: QuestionAssemblee[] = [];
    for (const d of aPoser) {
      const r = construire(d, theme.code);
      if (r === "attente") enAttente++;
      else if (r) questions.push(r);
    }
    // Un tableau dont les lignes viennent d'une question de cadrage ou d'une liste : cette question doit être posée.
    for (const q of questions) {
      if (q.spec?.type !== "tableau") continue;
      if (q.spec.lignes.source === "declencheur") pointer([q.spec.lignes.cle]);
      if (q.spec.lignes.source === "donnee") sources.add(q.spec.lignes.code);
    }
    if (questions.length > 0) themes.push({ theme, questions });
  }

  // Questions d'un autre agent dont dépendent celles-ci : le premier agent qui en a besoin les pose (avec leur réponse si elle existe).
  const posees = new Set(themes.flatMap((t) => t.questions.map((q) => q.code)));
  const prealables: QuestionAssemblee[] = [];
  const traitees = new Set<string>();
  for (let tour = 0; tour < 4; tour++) {
    const aTraiter = [...sources].filter((c) => !traitees.has(c)).sort();
    if (aTraiter.length === 0) break;
    for (const code of aTraiter) {
      traitees.add(code);
      const d = e.donnees.find((x) => x.code === code);
      if (!d || (d.mode !== "demandee" && d.mode !== "partagee") || d.niveau === null) continue;
      if (posees.has(code) || agentDeLaDonnee(e, code) === ctx.agent) continue;
      const equivalents = [...(equiv.get(code) ?? [])];
      // Déjà répondue sous un autre code (donnée partagée) : rien à poser. Répondue sous son propre code : elle reste listée,
      // avec sa réponse, pour que celui qui n'a pas l'agent propriétaire puisse la corriger.
      if (equivalents.some((c) => ctx.reponses[c] !== undefined)) continue;
      const r = construire(d, d.theme);
      if (r && r !== "attente") prealables.push(r);
    }
  }

  const declencheursConcernes: DeclencheurAPoser[] = [...concernes]
    .filter((code) => code !== "D02" && regles.declencheurs[code] && regles.declencheurs[code].type !== "reponse_donnee" && !(ex?.declencheurs ?? []).includes(code))
    .sort()
    .map((code) => {
      const forme = regles.declencheurs[code];
      const retirees = ex?.optionsCadrage[code];
      return {
        code,
        question: declencheursParCode.get(code)?.question ?? code,
        forme: forme.type === "cases" && retirees ? { ...forme, options: forme.options.filter((o) => !retirees.includes(o.id)) } : forme,
      };
    });
  const declencheursAPoser = declencheursConcernes.filter((d) => !declencheurRepondu(d.code, ctx.reponses, regles));

  const toutes = [...prealables, ...themes.flatMap((t) => t.questions)].filter((q) => !q.dejaPosee);
  const ecrites = toutes.filter((q) => q.texte !== null).length;
  return {
    declencheursAPoser,
    declencheursConcernes,
    themes,
    prealables,
    themesMasques,
    enAttente,
    dejaPosees,
    statistiques: { aPoser: toutes.length, ecrites, manquantes: toutes.length - ecrites, essentielles },
  };
}

// Nombre de questions d'un agent pour ce profil et cette taille, avant les
// déclencheurs : c'est ce que le dirigeant voit en choisissant son niveau.
export function compterQuestions(e: EnsembleDonnees, agent: CodeAgent, profils: ProfilId[], taille: TailleId, exclusions: Exclusions | null = null): { essentielles: number; total: number } {
  const themes = new Set(e.themes.filter((t) => t.agent === agent && !(agent === "ACQUISITION_CA" && exclusions?.themes.includes(t.code))).map((t) => t.code));
  const concernees = e.donnees.filter(
    (d) => themes.has(d.theme) && !e.retraits.retraits.some((r) => r.donnee === d.code) && (d.mode === "demandee" || d.mode === "partagee") && d.niveau !== null && concerne(d, profils, taille)
  );
  return { essentielles: concernees.filter((d) => d.niveau === "essentiel").length, total: concernees.length };
}

// Codes des données d'autres agents qu'un agent peut poser en préalable : sert à autoriser leur enregistrement à qui n'a
// pas l'agent propriétaire (écriture de la réponse), sans connaître encore les réponses.
export function codesPrealables(e: EnsembleDonnees, agent: CodeAgent): Set<string> {
  const regles = e.reglesAffichage;
  const themes = new Set(e.themes.filter((t) => t.agent === agent).map((t) => t.code));
  const sources = new Set<string>();
  const lire = (cles: string[]) => cles.forEach((c) => { const s = donneeSource(c, regles); if (s) sources.add(s); });
  for (const t of e.themes) {
    if (!themes.has(t.code)) continue;
    const m = t.masquePour ? regles.masquages[t.masquePour] : undefined;
    if (m) lire(clesDeLaRegle(m));
  }
  const banque = new Map(e.banque.map((q) => [q.donnee, q]));
  for (const d of e.donnees) {
    if (!themes.has(d.theme)) continue;
    const c = d.condition ? regles.conditions[d.condition] : undefined;
    if (c) lire(clesDeLaRegle(c));
    const spec = banque.get(d.code)?.reponse;
    if (spec?.type === "tableau") {
      if (spec.lignes.source === "donnee") sources.add(spec.lignes.code);
      if (spec.lignes.source === "declencheur") lire([spec.lignes.cle]);
    }
  }
  return new Set([...sources].filter((c) => agentDeLaDonnee(e, c) !== undefined && agentDeLaDonnee(e, c) !== agent));
}

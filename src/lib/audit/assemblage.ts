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
  clesDeLaRegle,
  declencheurDeLaCle,
  declencheurRepondu,
  evaluer,
  lecteurDeclencheurs,
  type TailleId,
} from "./affichage.ts";
import { accepteLesQuatreReponses, type Reponses } from "./reponse.ts";

export type Niveau = "essentiel" | "approfondi";

export type ContexteAssemblage = {
  agent: CodeAgent;
  profils: ProfilId[];
  taille: TailleId;
  niveau: Niveau;
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
  // Déjà posée par un autre agent : reprise telle quelle, jamais redemandée.
  dejaPosee: boolean;
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
export function equivalences(donnees: Donnee[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  const lier = (a: string, b: string) => {
    if (!index.has(a)) index.set(a, new Set());
    if (!index.has(b)) index.set(b, new Set());
    index.get(a)!.add(b);
    index.get(b)!.add(a);
  };
  const posables = new Set(donnees.filter((d) => d.mode === "demandee" || d.mode === "partagee").map((d) => d.code));
  for (const d of donnees) {
    if (d.mode !== "partagee") continue;
    for (const e of d.entrees) if (posables.has(e)) lier(d.code, e);
  }
  return index;
}

function concerne(d: Donnee, profils: ProfilId[], taille: TailleId): boolean {
  if ("tailles" in d) return d.tailles[taille];
  return profils.some((p) => d.profils[p]);
}

export function assemblerQuestionnaire(e: EnsembleDonnees, ctx: ContexteAssemblage): Assemblage {
  const regles = e.reglesAffichage;
  const lire = lecteurDeclencheurs(ctx.reponses, ctx.taille, regles);
  const banque = new Map<string, Question>(e.banque.map((q) => [q.donnee, q]));
  const equiv = equivalences(e.donnees);
  const declencheursParCode = new Map(e.declencheurs.map((d) => [d.code, d]));
  const themesAgent = e.themes.filter((t) => t.agent === ctx.agent);

  const concernes = new Set<string>();
  const themes: ThemeAssemble[] = [];
  const themesMasques: Theme[] = [];
  let enAttente = 0;
  let dejaPosees = 0;
  let essentielles = 0;

  const pointer = (cles: string[]) => {
    for (const c of cles) concernes.add(declencheurDeLaCle(c));
  };

  for (const theme of themesAgent) {
    const candidates = e.donnees.filter(
      (d) =>
        d.theme === theme.code &&
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
    if (masque === true) {
      themesMasques.push(theme);
      continue;
    }
    if (candidates.length === 0) continue;
    if (masque === null && masquage) {
      enAttente += candidates.length;
      continue;
    }

    const questions: QuestionAssemblee[] = [];
    for (const d of candidates) {
      const condition = d.condition ? regles.conditions[d.condition] : undefined;
      if (condition) pointer(clesDeLaRegle(condition));
      const visible = condition ? evaluer(condition, lire) : true;
      if (visible === false) continue;
      if (visible === null && condition) {
        enAttente++;
        continue;
      }

      const q = banque.get(d.code);
      let texte: string | null = null;
      if (q) {
        const f = formuler(q.texte, ctx.profils, e.lexique);
        // Un mot du lexique absent pour ce profil : la question ne s'applique pas.
        if (!f.ok) continue;
        texte = f.texte;
      }
      const equivalents = [...(equiv.get(d.code) ?? [])];
      const deja = ctx.reponses[d.code] !== undefined || equivalents.some((c) => ctx.reponses[c] !== undefined);
      if (deja) dejaPosees++;
      if (d.niveau === "essentiel") essentielles++;
      questions.push({
        code: d.code,
        themeCode: theme.code,
        libelle: d.libelle,
        format: d.format,
        niveau: d.niveau as Niveau,
        texte,
        aide: q?.aide ?? null,
        repli: q?.repli ?? null,
        quatreReponses: accepteLesQuatreReponses(d.format),
        dejaPosee: deja && ctx.reponses[d.code] === undefined,
      });
    }
    if (questions.length > 0) themes.push({ theme, questions });
  }

  const declencheursConcernes: DeclencheurAPoser[] = [...concernes]
    .filter((code) => code !== "D02" && regles.declencheurs[code])
    .sort()
    .map((code) => ({
      code,
      question: declencheursParCode.get(code)?.question ?? code,
      forme: regles.declencheurs[code],
    }));
  const declencheursAPoser = declencheursConcernes.filter((d) => !declencheurRepondu(d.code, ctx.reponses, regles));

  const toutes = themes.flatMap((t) => t.questions).filter((q) => !q.dejaPosee);
  const ecrites = toutes.filter((q) => q.texte !== null).length;
  return {
    declencheursAPoser,
    declencheursConcernes,
    themes,
    themesMasques,
    enAttente,
    dejaPosees,
    statistiques: { aPoser: toutes.length, ecrites, manquantes: toutes.length - ecrites, essentielles },
  };
}

// Nombre de questions d'un agent pour ce profil et cette taille, avant les
// déclencheurs : c'est ce que le dirigeant voit en choisissant son niveau.
export function compterQuestions(e: EnsembleDonnees, agent: CodeAgent, profils: ProfilId[], taille: TailleId): { essentielles: number; total: number } {
  const themes = new Set(e.themes.filter((t) => t.agent === agent).map((t) => t.code));
  const concernees = e.donnees.filter(
    (d) => themes.has(d.theme) && (d.mode === "demandee" || d.mode === "partagee") && d.niveau !== null && concerne(d, profils, taille)
  );
  return { essentielles: concernees.filter((d) => d.niveau === "essentiel").length, total: concernees.length };
}

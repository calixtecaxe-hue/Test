// Ce que l'écran du questionnaire reçoit : questions assemblées pour le compte, cadrage, libellés des lignes, données dont la
// réponse ouvre d'autres questions. Fonction pure, utilisée par la page de l'application (serveur) et par l'aperçu du
// questionnaire (navigateur) : les deux montrent exactement la même chose.

import type { EnsembleDonnees, ProfilId, CodeAgent } from "../donnees/schemas.ts";
import { AGENTS } from "../agents.ts";
import { assemblerQuestionnaire, type Exclusions } from "./assemblage.ts";
import { cleDeDonnee, clesDeLaRegle, donneeDuDeclencheur } from "./affichage.ts";
import { specDeLaDonnee } from "./validation.ts";
import type { Reponses } from "./reponse.ts";
import type { TailleId } from "./affichage.ts";
import type { DeclencheurClient, ThemeClient } from "../../app/(espace)/audit/[slug]/questionnaire.tsx";
import type { LibellesLignes } from "../../app/(espace)/audit/[slug]/question-carte.tsx";

export type EntreePreparation = {
  agent: CodeAgent;
  profils: ProfilId[];
  taille: TailleId;
  niveau: "essentiel" | "approfondi";
  reponses: Reponses;
  // Saisies partielles de tableaux à total imposé, gardées sur le compte.
  brouillons: Map<string, Record<string, string>>;
  // Données dont le chiffre vient du détail déjà donné (clé → phrase).
  preremplies: Map<string, string>;
  ancienneteMois: number;
  exclusions: Exclusions | null;
  vocabulaire: string | null;
};

export type SortiePreparation = {
  donneesLues: string[];
  declencheurs: DeclencheurClient[];
  themes: ThemeClient[];
  reponsesInitiales: Reponses;
  masques: number;
  manquantes: number;
  libellesLignes: LibellesLignes;
};

export function preparerQuestionnaire(e: EnsembleDonnees, o: EntreePreparation): SortiePreparation {
  const reponses = o.reponses;
  const a = assemblerQuestionnaire(e, {
    agent: o.agent,
    profils: o.profils,
    taille: o.taille,
    niveau: o.niveau,
    reponses,
    ancienneteMois: o.ancienneteMois,
    exclusions: o.exclusions,
    vocabulaire: o.vocabulaire,
  });
  // Un tableau dont les lignes viennent d'un déclencheur qui est lui-même une question (D03 → ACQ-03.01) lit la réponse à cette question.
  const lignesDeLaDonnee = (spec: typeof a.themes[number]["questions"][number]["spec"]) => {
    if (spec?.type !== "tableau" || spec.lignes.source !== "declencheur") return spec;
    const donnee = donneeDuDeclencheur(e.reglesAffichage, spec.lignes.cle);
    return donnee ? { ...spec, lignes: { source: "declencheur" as const, cle: donnee } } : spec;
  };
  const questionClient = (q: typeof a.themes[number]["questions"][number]) => ({
    code: q.code,
    libelle: q.libelle,
    texte: q.texte,
    aide: q.aide,
    repli: q.repli,
    format: q.format,
    spec: lignesDeLaDonnee(q.spec),
    quatreReponses: q.quatreReponses,
    dejaPosee: q.dejaPosee,
    prereponse: q.prereponse,
    preremplie: o.preremplies.get(q.code) ?? null,
    brouillon: reponses[q.code] === undefined ? o.brouillons.get(q.code) ?? null : null,
    source: q.dejaPoseeDans
      ? {
          code: q.dejaPoseeDans,
          spec: specDeLaDonnee(e, q.dejaPoseeDans).spec,
          agent: AGENTS.find((ag) => ag.code === e.themes.find((t) => t.code === q.dejaPoseeDans!.slice(0, q.dejaPoseeDans!.indexOf(".")))?.agent)?.nom ?? "un autre agent",
        }
      : null,
  });
  const themes: ThemeClient[] = [
    // Questions d'un autre agent dont dépendent celles-ci : posées ici une seule fois, jamais redemandées ensuite.
    ...(a.prealables.length > 0
      ? [
          {
            code: "PREALABLES",
            nom: "Pour commencer",
            bloc: "Questions qui servent aussi à d'autres agents",
            intro: "Ces réponses décident des questions suivantes. Elles sont partagées avec les autres agents : vous ne les saisissez qu'une fois.",
            questions: a.prealables.map(questionClient),
          },
        ]
      : []),
    ...a.themes.map((t) => ({
      code: t.theme.code,
      nom: t.theme.nom,
      bloc: t.theme.bloc,
      questions: t.questions.map(questionClient),
    })),
  ];
  // Seules les réponses utiles à cet écran partent au navigateur.
  const cles = new Set<string>([
    ...a.declencheursConcernes.flatMap((d) => Object.keys(reponses).filter((c) => c === d.code || c.startsWith(`${d.code}.`))),
    ...themes.flatMap((t) =>
      t.questions.flatMap((q) => [
        q.code,
        ...(q.source ? [q.source.code] : []),
        ...(q.spec?.type === "tableau" && q.spec.lignes.source === "donnee" ? [q.spec.lignes.code] : []),
        ...(q.spec?.type === "tableau" && q.spec.lignes.source === "declencheur" ? [q.spec.lignes.cle] : []),
      ]),
    ),
  ]);
  const reponsesInitiales = Object.fromEntries(Object.entries(reponses).filter(([c]) => cles.has(c)));
  // Noms des canaux, réseaux… cochés au cadrage, pour nommer les lignes des tableaux.
  const libellesLignes: LibellesLignes = {};
  for (const [code, f] of Object.entries(e.reglesAffichage.declencheurs)) {
    if (f.type === "cases") libellesLignes[code] = Object.fromEntries(f.options.map((op) => [op.id, op.libelle]));
    // Déclencheur qui est une question de la banque : les libellés sont ceux de ses cases, sous le code de la donnée.
    if (f.type === "reponse_donnee") {
      const spec = specDeLaDonnee(e, f.donnee).spec;
      if (spec?.type === "cases") libellesLignes[f.donnee] = Object.fromEntries(spec.options.map((op) => [op.id, op.libelle]));
    }
  }
  // Questions dont la réponse ouvre ou ferme d'autres questions (D03 → ACQ-03.01, « FIN-10.01#retours_par_mois »…) :
  // après leur enregistrement, l'écran recalcule les questions à poser.
  const donneesLues = new Set<string>();
  const regles = e.reglesAffichage;
  for (const r of [...Object.values(regles.conditions), ...Object.values(regles.masquages)]) {
    for (const c of clesDeLaRegle(r)) {
      const dn = cleDeDonnee(c);
      if (dn) donneesLues.add(dn.donnee);
    }
  }
  for (const f of Object.values(regles.declencheurs)) if (f.type === "reponse_donnee") donneesLues.add(f.donnee);
  return {
    donneesLues: [...donneesLues],
    declencheurs: a.declencheursConcernes.map((d) => ({ code: d.code, question: d.question, forme: d.forme })),
    themes,
    reponsesInitiales,
    masques: a.themesMasques.length,
    manquantes: a.statistiques.manquantes,
    libellesLignes,
  };
}

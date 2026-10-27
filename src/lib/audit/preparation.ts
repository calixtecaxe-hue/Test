// Ce que l'écran du questionnaire reçoit : questions assemblées pour le compte, cadrage, libellés des lignes, données dont la
// réponse ouvre d'autres questions. Fonction pure, utilisée par la page de l'application (serveur) et par l'aperçu du
// questionnaire (navigateur) : les deux montrent exactement la même chose.

import type { EnsembleDonnees, ProfilId, CodeAgent } from "../donnees/schemas.ts";
import { AGENTS } from "../agents.ts";
import { assemblerQuestionnaire, type Exclusions } from "./assemblage.ts";
import { cleDeDonnee, clesDeLaRegle, donneeDuDeclencheur } from "./affichage.ts";
import { specDeLaDonnee } from "./validation.ts";
import { formuler } from "../donnees/lexique.ts";
import type { Reponses } from "./reponse.ts";
import type { TailleId } from "./affichage.ts";
import type { MetierDuCompte } from "../routage.ts";
import type { DeclencheurClient, ThemeClient } from "../../app/(espace)/audit/[slug]/questionnaire.tsx";
import type { LibellesLignes, QuestionClient, RenvoiLignes } from "../../app/(espace)/audit/[slug]/question-carte.tsx";

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
  // Métier et activités du compte : les questions d'un module métier ne sont posées qu'aux métiers concernés.
  metier: MetierDuCompte | null;
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
    metier: o.metier,
  });
  // Un tableau dont les lignes viennent d'un déclencheur qui est lui-même une question (D03 → ACQ-03.01) lit la réponse à cette question.
  const lignesDeLaDonnee = (spec: typeof a.themes[number]["questions"][number]["spec"]) => {
    if (spec?.type !== "tableau" || spec.lignes.source !== "declencheur") return spec;
    const donnee = donneeDuDeclencheur(e.reglesAffichage, spec.lignes.cle);
    return donnee ? { ...spec, lignes: { source: "declencheur" as const, cle: donnee } } : spec;
  };
  // Tableaux dont les lignes se règlent ailleurs : la question d'où elles viennent, sur cette page ou dans l'audit d'un autre agent.
  const assemblees = new Map([...a.prealables, ...a.themes.flatMap((t) => t.questions)].map((q) => [q.code, q]));
  const nomAgent = (code: string) => AGENTS.find((ag) => ag.code === e.themes.find((t) => t.code === code.slice(0, code.indexOf(".")))?.agent)?.nom ?? "un autre agent";
  const renvoi = (code: string): RenvoiLignes => {
    const ici = assemblees.get(code);
    const banque = e.banque.find((b) => b.donnee === code);
    const f = banque ? formuler(banque.texte, o.profils, e.lexique, o.vocabulaire) : null;
    const texte = ici?.texte ?? (f?.ok ? f.texte : null) ?? e.donnees.find((d) => d.code === code)?.libelle ?? code;
    // Une liste ou des cases posées sur cette page : la question se répond aussi dans le tableau qui en dépend, tant
    // qu'il n'a pas de lignes (le dirigeant n'a pas à la chercher plus haut).
    const enLigne = ici && !ici.dejaPosee && (ici.spec?.type === "liste" || ici.spec?.type === "cases") ? questionClient(ici) : undefined;
    return { code, texte, ici: ici !== undefined, agent: nomAgent(code), ...(enLigne ? { question: enLigne } : {}) };
  };
  const lignesVenues = (code: string, spec: ReturnType<typeof lignesDeLaDonnee>) => {
    const lien = e.tableauxLies.liens.find((l) => l.tableau === code);
    const suiviPar = e.tableauxLies.liens.filter((l) => l.suit.includes(code)).map((l) => ({ code: l.tableau, suit: l.suit }));
    if (lien) return { lignesSuivies: { questions: lien.suit.map(renvoi), nom: lien.nom }, renvoiLignes: null, suiviPar };
    if (spec?.type === "tableau" && spec.lignes.source === "donnee") return { lignesSuivies: null, renvoiLignes: renvoi(spec.lignes.code), suiviPar };
    if (spec?.type === "tableau" && spec.lignes.source === "declencheur" && !/^D\d{2}$/.test(spec.lignes.cle)) return { lignesSuivies: null, renvoiLignes: renvoi(spec.lignes.cle), suiviPar };
    return { lignesSuivies: null, renvoiLignes: null, suiviPar };
  };
  const questionClient = (q: typeof a.themes[number]["questions"][number]): QuestionClient => ({
    code: q.code,
    libelle: q.libelle,
    texte: q.texte,
    aide: q.aide,
    repli: q.repli,
    format: q.format,
    spec: lignesDeLaDonnee(q.spec),
    ...lignesVenues(q.code, lignesDeLaDonnee(q.spec)),
    quatreReponses: q.quatreReponses,
    dejaPosee: q.dejaPosee,
    prereponse: q.prereponse,
    preremplie: o.preremplies.get(q.code) ?? null,
    brouillon: reponses[q.code] === undefined ? o.brouillons.get(q.code) ?? null : null,
    source: q.dejaPoseeDans
      ? {
          code: q.dejaPoseeDans,
          spec: specDeLaDonnee(e, q.dejaPoseeDans).spec,
          ...lignesVenues(q.dejaPoseeDans, lignesDeLaDonnee(specDeLaDonnee(e, q.dejaPoseeDans).spec)),
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
  // La question d'où viennent les lignes ne se répond dans un tableau que si elle est loin (autre thème, « Pour commencer ») et
  // dans le premier tableau qui en dépend : juste au-dessus, ou déjà proposée plus haut, un renvoi suffit (pas de répétition).
  const themeDe = new Map(themes.flatMap((t) => t.questions.map((q) => [q.code, t.code] as const)));
  const dejaEnLigne = new Set<string>();
  for (const t of themes) {
    for (const q of t.questions) {
      const r = q.renvoiLignes;
      if (!r?.question) continue;
      if (themeDe.get(r.code) === t.code || dejaEnLigne.has(r.code)) q.renvoiLignes = { ...r, question: undefined };
      else dejaEnLigne.add(r.code);
    }
  }
  // Seules les réponses utiles à cet écran partent au navigateur.
  const cles = new Set<string>([
    ...a.declencheursConcernes.flatMap((d) => Object.keys(reponses).filter((c) => c === d.code || c.startsWith(`${d.code}.`))),
    ...themes.flatMap((t) =>
      t.questions.flatMap((q) => [
        q.code,
        ...(q.source ? [q.source.code] : []),
        ...(q.spec?.type === "tableau" && q.spec.lignes.source === "donnee" ? [q.spec.lignes.code] : []),
        ...(q.spec?.type === "tableau" && q.spec.lignes.source === "declencheur" ? [q.spec.lignes.cle] : []),
        // Tableau qui suit les lignes d'un autre : la réponse de celui-ci donne les lignes et leurs noms.
        ...(q.lignesSuivies?.questions.map((r) => r.code) ?? []),
        ...(q.source?.lignesSuivies?.questions.map((r) => r.code) ?? []),
        // Tableaux qui suivent celui-ci : une ligne retirée ici l'est aussi chez eux.
        ...(q.suiviPar ?? []).flatMap((f) => [f.code, ...f.suit]),
        ...(q.source?.suiviPar ?? []).flatMap((f) => [f.code, ...f.suit]),
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

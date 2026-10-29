// Objectifs proposés à un compte, et objectifs tels que les étapes suivantes les reçoivent.
//
// Proposés : un objectif de la liste (RH, Comm) n'est proposé que si au moins un de ses thèmes s'applique à la taille de
// l'entreprise (règle des masquages, CLAUDE.md section 7 : un thème qui ne s'applique pas à la taille est masqué). Un
// dirigeant seul ne se voit donc pas proposer « Réduire les absences dans l'équipe ». Seule la taille est lue ici : les
// masquages qui dépendent d'une réponse (recrutement prévu, publication) ne retirent rien, la réponse n'étant pas encore
// donnée au moment de l'objectif. Un objectif déjà choisi reste toujours proposé, pour pouvoir être gardé ou modifié.
//
// Transmis : chaque objectif enregistré, avec son origine (proposition de la liste ou objectif écrit par le dirigeant), sa
// phrase, sa mesure (chiffre ou description de la réussite), son délai, son échéance et les thèmes liés. Un objectif composé
// (29 octobre) transmet aussi chaque proposition retenue, identifiable, avec son chiffre, et sa formulation (proposée par le
// code, modifiée ou non par le dirigeant). C'est ce que reçoivent l'étape Objectif, l'écran « Résultats », le rapport et le
// plan d'action.
import { evaluer, lecteurDeclencheurs, type TailleId } from "./affichage.ts";
import { origineDe, type Ampleur, type FormulationObjectif, type ModeObjectif, type ObjectifEnregistre, type OrigineObjectif } from "./objectif.ts";
import { partieDePhrase, type SuiviParcours } from "./objectifs-agent.ts";
import type { ObjectifAgent, ObjectifsAgents, Question, ReglesAffichage, Theme } from "../donnees/schemas.ts";

export function themeMasquePourLaTaille(theme: Pick<Theme, "masquePour"> | undefined, regles: ReglesAffichage, taille: TailleId): boolean {
  if (!theme?.masquePour) return false;
  const regle = regles.masquages[theme.masquePour];
  return regle ? evaluer(regle, lecteurDeclencheurs({}, taille, regles)) === true : false;
}

export function objectifsPourLaTaille<T extends { objectifs: ObjectifAgent[] }>(def: T, themes: Pick<Theme, "code" | "masquePour">[], regles: ReglesAffichage, taille: TailleId, dejaChoisis: string[] = []): T {
  const parCode = new Map(themes.map((t) => [t.code, t]));
  const garde = (o: ObjectifAgent) => dejaChoisis.includes(o.id) || o.themes.some((c) => !themeMasquePourLaTaille(parCode.get(c), regles, taille));
  return { ...def, objectifs: def.objectifs.filter(garde) };
}

// Identifiants des propositions d'un objectif enregistré (toutes celles d'un objectif composé, ou la proposition seule d'un
// objectif d'avant le 29 octobre) : elles restent proposées pour pouvoir être gardées.
export function propositionsDe(structure: Pick<ObjectifEnregistre, "choix" | "composition">): string[] {
  return structure.composition?.map((c) => c.choix) ?? (structure.choix ? [structure.choix] : []);
}

// Une proposition retenue, telle que les étapes suivantes la reçoivent.
export type ComposanteTransmise = { id: string; libelle: string; phrase: string; ampleur: Ampleur | null; themes: string[] };

export type ObjectifTransmis = {
  origine: OrigineObjectif;
  // RH, Comm : écrit par le dirigeant (« personnel ») ou composé de propositions (« composition ») ; null pour Acquisition et Finance.
  mode: ModeObjectif | null;
  // Propositions retenues (une ou plusieurs ; aucune pour un objectif écrit). Quand il y en a une seule, `proposition` et
  // `ampleur` la reprennent ; quand il y en a plusieurs, chacune garde son chiffre ici et `proposition`, `ampleur` sont vides.
  composantes: ComposanteTransmise[];
  // Formulation d'un objectif composé : proposée par le code, modifiée ou non par le dirigeant (null sinon).
  formulation: FormulationObjectif | null;
  // La phrase enregistrée (« obtenir 10 nouveaux avis clients sur les 3 prochains mois »).
  phrase: string;
  // Ce que le dirigeant veut obtenir : le titre de la proposition, ou son texte à lui, tel qu'il l'a écrit.
  quoi: string;
  proposition: { id: string; libelle: string } | null;
  mesure: "chiffre" | "reussite";
  ampleur: ObjectifEnregistre["ampleur"] | null;
  reussite: string | null;
  delaiMois: number;
  echeance: string;
  indicateur: { code: string; nom: string } | null;
  themes: string[];
  partie: string | null;
};

export function objectifTransmis(texteBrut: string, structure: ObjectifEnregistre, liste: ObjectifAgent[] | null): ObjectifTransmis {
  const p = structure.choix ? liste?.find((o) => o.id === structure.choix) : undefined;
  const lues = structure.composition ?? (structure.choix ? [{ choix: structure.choix, libelle: p?.libelle ?? structure.quoi, ...(structure.ampleur ? { ampleur: structure.ampleur } : {}), phrase: p ? partieDePhrase(p, structure.ampleur) : structure.quoi }] : []);
  const composantes = lues.map((c): ComposanteTransmise => {
    const def = liste?.find((o) => o.id === c.choix);
    return { id: c.choix, libelle: def?.libelle ?? c.libelle, phrase: c.phrase, ampleur: c.ampleur ?? null, themes: def?.themes ?? [] };
  });
  const plusieurs = composantes.length > 1;
  return {
    origine: origineDe(structure, liste !== null),
    mode: structure.mode ?? (liste ? (composantes.length > 0 ? "composition" : "personnel") : null),
    composantes,
    formulation: structure.formulation ?? null,
    phrase: texteBrut,
    quoi: structure.quoi,
    proposition: p ? { id: p.id, libelle: p.libelle } : structure.choix ? { id: structure.choix, libelle: structure.quoi } : null,
    mesure: structure.ampleur || composantes.some((c) => c.ampleur) ? "chiffre" : "reussite",
    ampleur: structure.ampleur ?? null,
    reussite: structure.reussite ?? null,
    delaiMois: structure.delaiMois,
    echeance: structure.echeance,
    indicateur: structure.indicateur,
    themes: plusieurs ? [...new Set(composantes.flatMap((c) => c.themes))] : p?.themes ?? (structure.indicateur ? [structure.indicateur.code] : []),
    partie: structure.partie ?? null,
  };
}

// Comm : ce qu'il faut pour comparer la partie de l'objectif au parcours du questionnaire (ecartDeParcours) : la question qui
// donne le parcours, ses réponses et la partie à laquelle chacune correspond. Null pour un agent sans parties.
export function suiviParcours(def: ObjectifsAgents["agents"][string] | undefined, banque: Question[]): SuiviParcours | null {
  const parties = (def?.parties ?? []).filter((p) => p.parcours);
  const donnee = parties[0]?.parcours?.donnee;
  const q = donnee ? banque.find((x) => x.donnee === donnee) : undefined;
  if (!q || q.reponse?.type !== "choix") return null;
  return {
    donnee: q.donnee,
    question: q.texte,
    options: Object.fromEntries(q.reponse.options.map((o) => [o.id, o.libelle])),
    parties: parties.map((p) => ({ nom: p.nom, reponses: p.parcours!.reponses })),
  };
}

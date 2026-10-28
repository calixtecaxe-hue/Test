// Objectifs proposés à un compte, et objectifs tels que les étapes suivantes les reçoivent.
//
// Proposés : un objectif de la liste (RH, Comm) n'est proposé que si au moins un de ses thèmes s'applique à la taille de
// l'entreprise (règle des masquages, CLAUDE.md section 7 : un thème qui ne s'applique pas à la taille est masqué). Un
// dirigeant seul ne se voit donc pas proposer « Réduire les absences dans l'équipe ». Seule la taille est lue ici : les
// masquages qui dépendent d'une réponse (recrutement prévu, publication) ne retirent rien, la réponse n'étant pas encore
// donnée au moment de l'objectif. Un objectif déjà choisi reste toujours proposé, pour pouvoir être gardé ou modifié.
//
// Transmis : chaque objectif enregistré, avec son origine (proposition de la liste ou objectif écrit par le dirigeant), sa
// phrase, sa mesure (chiffre ou description de la réussite), son délai, son échéance et les thèmes liés. C'est ce que
// reçoivent l'étape Objectif, le compte rendu et, quand elle sera branchée, l'analyse de l'IA.
import { evaluer, lecteurDeclencheurs, type TailleId } from "./affichage.ts";
import { origineDe, type ObjectifEnregistre, type OrigineObjectif } from "./objectif.ts";
import type { ObjectifAgent, ReglesAffichage, Theme } from "../donnees/schemas.ts";

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

export type ObjectifTransmis = {
  origine: OrigineObjectif;
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
  return {
    origine: origineDe(structure, liste !== null),
    phrase: texteBrut,
    quoi: structure.quoi,
    proposition: p ? { id: p.id, libelle: p.libelle } : structure.choix ? { id: structure.choix, libelle: structure.quoi } : null,
    mesure: structure.ampleur ? "chiffre" : "reussite",
    ampleur: structure.ampleur ?? null,
    reussite: structure.reussite ?? null,
    delaiMois: structure.delaiMois,
    echeance: structure.echeance,
    indicateur: structure.indicateur,
    themes: p?.themes ?? (structure.indicateur ? [structure.indicateur.code] : []),
    partie: structure.partie ?? null,
  };
}

// Objectif d'un agent. Acquisition et Finance : un objectif libre en trois champs. RH et Comm : un objectif par agent
// (décision du propriétaire du 28 octobre, option 1B, qui remplace la possibilité de plusieurs objectifs du 27 octobre),
// complet : son chiffre ou ce que le dirigeant veut constater, son délai, son avancement. Quand la liste de l'agent a des
// parties (Comm : « Améliorer ce que j'ai déjà », « Mettre en place ma présence en ligne »), l'objectif vient d'une partie.
//
// Deux façons de le définir (demande du propriétaire du 29 octobre), jamais les deux à la fois :
//   - « Écrire mon objectif » : le dirigeant l'écrit librement ; son texte est gardé tel qu'il l'a écrit (aux espaces de
//     début et de fin près), même s'il ressemble à une proposition ;
//   - « Composer mon objectif à partir des propositions » : une ou plusieurs propositions de la liste, sans objectif
//     principal ni sous-objectifs. Chaque proposition prend le texte de la liste ; son chiffre est facultatif ; le délai est
//     commun. Le code propose une formulation faite des seules phrases des propositions retenues ; le dirigeant peut la
//     modifier, mais pas y glisser un chiffre qui ne vient pas de ses propositions ou de son délai.
// Une proposition seule envoyée sans mode (forme d'avant le 29 octobre, gardée pour les outils de test) se lit comme un objectif
// composé d'une proposition.
//
// Contrôle commun à la route de l'application et à l'aperçu. Ce fichier n'importe que zod et des types.

import {
  formaterNombre,
  objectifCompositionSchema,
  objectifSaisieSchema,
  phraseObjectif,
  verifierVraisemblance,
  type Ampleur,
  type FormulationObjectif,
  type ModeObjectif,
  type ObjectifSaisie,
  type OrigineObjectif,
  type UniteAmpleur,
} from "./objectif.ts";
import type { ObjectifAgent } from "../donnees/schemas.ts";

// Un objectif par agent (décision du 28 octobre, option 1B ; le plafond de 10 du 27 octobre n'a plus d'objet).
export const MAX_OBJECTIFS = 1;

// Une proposition retenue, telle que le contrôle la rend : la proposition de la liste, son chiffre, sa partie de phrase.
export type ComposanteControlee = { choisi: ObjectifAgent; ampleur?: Ampleur; phrase: string };
export type ObjectifControle = {
  saisie: ObjectifSaisie;
  // La proposition, quand l'objectif en a une seule ; undefined pour un objectif écrit ou composé de plusieurs propositions.
  choisi: ObjectifAgent | undefined;
  origine: OrigineObjectif;
  mode: ModeObjectif | null;
  phrase: string;
  composition?: ComposanteControlee[];
  formulation?: FormulationObjectif;
};
export type ControleObjectifs = { ok: true; objectifs: ObjectifControle[] } | { ok: false; erreur: string; champ?: string; rang?: number; composante?: string };

const cleTexte = (t: string) => t.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.\s]+$/, "").replace(/\s+/g, " ");

// Ce que le dirigeant veut changer, pour une proposition : son titre, en minuscule initiale (« réduire les absences dans l'équipe »).
export const quoiDeProposition = (o: Pick<ObjectifAgent, "libelle">) => o.libelle.charAt(0).toLowerCase() + o.libelle.slice(1);

// Unités entre lesquelles le dirigeant choisit pour une proposition chiffrée (une seule quand le chiffre est un nombre visé).
export const unitesDe = (o: Pick<ObjectifAgent, "unite" | "unites">): UniteAmpleur[] => o.unites ?? (o.unite ? [o.unite] : []);

// Phrase d'un objectif : celle que la proposition a écrite pour l'unité choisie (nombre ou taux visé, hausse ou baisse).
export const gabaritDe = (saisie: Pick<ObjectifSaisie, "ampleur">, choisi: Pick<ObjectifAgent, "gabarit" | "phrases"> | undefined) =>
  choisi?.gabarit ?? (saisie.ampleur ? choisi?.phrases?.[saisie.ampleur.unite] : undefined);
export const phraseDe = (saisie: ObjectifSaisie, choisi: Pick<ObjectifAgent, "gabarit" | "phrases"> | undefined) => phraseObjectif(saisie, gabaritDe(saisie, choisi));

// --- Objectif composé -------------------------------------------------------------------------------------------------------

// Partie de la phrase d'une proposition retenue, sans délai : sa phrase écrite à l'avance avec le chiffre du dirigeant
// (« obtenir 10 nouveaux avis clients »), ou son titre quand elle n'a pas de chiffre (« clarifier qui fait quoi »).
export function partieDePhrase(choisi: Pick<ObjectifAgent, "libelle" | "gabarit" | "phrases">, ampleur?: Ampleur): string {
  const g = ampleur ? gabaritDe({ ampleur }, choisi) : undefined;
  if (!ampleur || !g) return quoiDeProposition(choisi);
  const forme = (ampleur.valeur === 1 ? g.singulier : g.pluriel).replace("{n}", formaterNombre(ampleur.valeur));
  return forme.replace("{dici}", "").replace(/\s+/g, " ").trim();
}

// « A », « A et B », « A, B et C ».
export function enumerer(morceaux: string[]): string {
  if (morceaux.length <= 1) return morceaux[0] ?? "";
  return `${morceaux.slice(0, -1).join(", ")} et ${morceaux[morceaux.length - 1]}`;
}

// Formulation proposée : rien que les phrases des propositions retenues et le délai. Une proposition seule garde exactement
// la phrase d'avant le 29 octobre (« obtenir 10 nouveaux avis clients sur les 3 prochains mois ») ; plusieurs propositions
// sont énumérées, puis le délai commun (« clarifier qui fait quoi et libérer 5 heures par semaine pour piloter
// l'entreprise, d'ici 3 mois »).
export function formulationProposee(retenues: { choisi: ObjectifAgent; ampleur?: Ampleur }[], delaiMois: number): string {
  if (retenues.length === 1) {
    const [c] = retenues;
    return phraseDe({ quoi: quoiDeProposition(c.choisi), ...(c.ampleur ? { ampleur: c.ampleur } : {}), delaiMois }, c.choisi);
  }
  return `${enumerer(retenues.map((c) => partieDePhrase(c.choisi, c.ampleur)))}, d'ici ${delaiMois} mois`;
}

// Les nombres d'un texte, écrits de façon comparable (« 1 200 » et « 1200 » se rejoignent ; « 4.5 » et « 4,5 » aussi).
export function nombresDe(texte: string): string[] {
  return (texte.match(/\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/[ \u00a0\u202f]/g, "").replace(".", ","));
}

// Un chiffre de la formulation modifiée qui ne vient ni des propositions ni du délai : la synthèse n'invente aucun chiffre.
export function chiffreEtranger(finale: string, proposee: string): string | null {
  const permis = new Set(nombresDe(proposee));
  return nombresDe(finale).find((n) => !permis.has(n)) ?? null;
}

const memeTexte = (a: string, b: string) => a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();

// Deux propositions qui se recouvrent (« exclut », écrit des deux côtés dans data/objectifs-agents.json).
export function recouvrement(retenues: Pick<ObjectifAgent, "id" | "libelle" | "exclut">[]): [string, string] | null {
  for (const a of retenues) for (const b of retenues) if (a.id !== b.id && (a.exclut ?? []).includes(b.id)) return [a.libelle, b.libelle];
  return null;
}

type Erreur = Extract<ControleObjectifs, { ok: false }>;

function controlerComposition(recu: unknown, liste: ObjectifAgent[], parties: string[], facteurAnnuelMax: number, maxComposition: number, rang: number): ObjectifControle | Erreur {
  const r = objectifCompositionSchema.safeParse(recu);
  if (!r.success) {
    const premier = r.error.issues[0];
    const cle = String(premier?.path[0] ?? "");
    const champ = cle === "composition" ? (premier?.path.includes("ampleur") ? "ampleur" : "choix") : cle;
    const composante = cle === "composition" && typeof premier?.path[1] === "number" ? (recu as { composition?: { choix?: unknown }[] }).composition?.[premier.path[1]]?.choix : undefined;
    return { ok: false, erreur: premier?.message ?? "Objectif invalide.", champ, rang, ...(typeof composante === "string" ? { composante } : {}) };
  }
  const lue = r.data;
  if (lue.composition.length > maxComposition) return { ok: false, erreur: `Retenez au plus ${maxComposition} propositions : un objectif trop large se suit mal.`, champ: "choix", rang };
  const ids = lue.composition.map((c) => c.choix);
  if (new Set(ids).size !== ids.length) return { ok: false, erreur: "La même proposition est retenue deux fois.", champ: "choix", rang };
  const retenues: { choisi: ObjectifAgent; ampleur?: Ampleur }[] = [];
  for (const c of lue.composition) {
    const choisi = liste.find((o) => o.id === c.choix);
    if (!choisi) return { ok: false, erreur: "Cette proposition n'est pas proposée pour cet agent.", champ: "choix", rang, composante: c.choix };
    if (c.ampleur) {
      if (choisi.mesure !== "chiffre") return { ok: false, erreur: "Cette proposition ne se chiffre pas : décrivez plutôt ce que vous voulez constater.", champ: "ampleur", rang, composante: c.choix };
      if (!unitesDe(choisi).includes(c.ampleur.unite)) return { ok: false, erreur: "Cette unité ne convient pas à cette proposition.", champ: "ampleur", rang, composante: c.choix };
    }
    retenues.push({ choisi, ...(c.ampleur ? { ampleur: c.ampleur } : {}) });
  }
  // Une liste en parties (Comm) : les propositions d'une seule partie.
  const groupes = [...new Set(retenues.map((c) => c.choisi.groupe ?? ""))];
  if (parties.length > 0 && groupes.length > 1) return { ok: false, erreur: `Retenez des propositions d'une seule partie : « ${groupes.join(" » ou « ")} ».`, champ: "choix", rang };
  if (lue.partie !== undefined && lue.partie !== groupes[0]) return { ok: false, erreur: "Ces propositions n'appartiennent pas à cette partie de la liste.", champ: "choix", rang };
  const doublon = recouvrement(retenues.map((c) => c.choisi));
  if (doublon) return { ok: false, erreur: `« ${doublon[0]} » et « ${doublon[1]} » se recouvrent : retenez l'une ou l'autre.`, champ: "choix", rang };
  // Vraisemblance de chaque hausse ou baisse en % (un nombre ou un taux visé n'a pas de valeur de départ ici).
  for (const c of retenues) {
    if (!c.ampleur || c.choisi.gabarit) continue;
    const v = verifierVraisemblance({ quoi: quoiDeProposition(c.choisi), ampleur: c.ampleur, delaiMois: lue.delaiMois }, facteurAnnuelMax);
    // Plusieurs propositions : le message dit laquelle est en cause.
    if (!v.ok) return { ok: false, erreur: retenues.length > 1 ? `« ${c.choisi.libelle} » : ${v.message}` : v.message, champ: v.champ, rang, composante: c.choisi.id };
  }
  // Ce que le dirigeant veut constater : demandé seulement quand aucune proposition n'a de chiffre (jamais un chiffre imposé).
  if (!lue.reussite && retenues.every((c) => !c.ampleur)) return { ok: false, erreur: "Décrivez ce que vous voulez constater, ou indiquez un chiffre pour une de vos propositions.", champ: "reussite", rang };
  const proposee = formulationProposee(retenues, lue.delaiMois);
  const finale = lue.formulation ?? proposee;
  const etranger = chiffreEtranger(finale, proposee);
  if (etranger) return { ok: false, erreur: `Le chiffre « ${etranger} » de votre formulation ne vient ni de vos propositions ni de votre délai : corrigez-le dans la proposition concernée, ou retirez-le de la formulation.`, champ: "formulation", rang };
  const seule = retenues.length === 1 ? retenues[0] : undefined;
  const groupe = groupes[0] || undefined;
  const saisie: ObjectifSaisie = {
    quoi: seule ? quoiDeProposition(seule.choisi) : enumerer(retenues.map((c) => quoiDeProposition(c.choisi))),
    ...(seule?.ampleur ? { ampleur: seule.ampleur } : {}),
    ...(lue.reussite ? { reussite: lue.reussite } : {}),
    ...(seule ? { choix: seule.choisi.id } : {}),
    ...(groupe ? { partie: groupe } : {}),
    delaiMois: lue.delaiMois,
  };
  return {
    saisie,
    choisi: seule?.choisi,
    origine: "proposition",
    mode: "composition",
    phrase: finale,
    composition: retenues.map((c) => ({ ...c, phrase: partieDePhrase(c.choisi, c.ampleur) })),
    formulation: { proposee, finale, modifiee: !memeTexte(finale, proposee) },
  };
}

// `liste` : objectifs proposés pour l'agent (null : objectif libre en trois champs, un seul). `maxComposition` : nombre de
// propositions retenues au plus dans un objectif composé (data/objectifs-agents.json, « composition.max »).
export function controlerObjectifs(saisies: unknown[], liste: ObjectifAgent[] | null, facteurAnnuelMax: number, maxComposition = Infinity): ControleObjectifs {
  if (saisies.length === 0) return { ok: false, erreur: "Écrivez votre objectif ou composez-le à partir des propositions.", champ: "choix" };
  if (saisies.length > MAX_OBJECTIFS) return { ok: false, erreur: "Cet agent suit un seul objectif à la fois.", champ: "choix" };
  const parties = liste ? [...new Set(liste.map((o) => o.groupe ?? ""))].filter((g) => g !== "") : [];
  const objectifs: ObjectifControle[] = [];
  for (const [rang, recu] of saisies.entries()) {
    const mode = recu && typeof recu === "object" ? (recu as { mode?: unknown }).mode : undefined;
    if (mode === "composition") {
      if (!liste) return { ok: false, erreur: "Cet agent n'a pas de propositions à composer.", champ: "choix", rang };
      const c = controlerComposition(recu, liste, parties, facteurAnnuelMax, maxComposition, rang);
      if ("ok" in c) return c;
      objectifs.push(c);
      continue;
    }
    // Une proposition prend le texte de la liste : jamais un autre texte sous l'identifiant d'une proposition.
    const proposee = recu && typeof recu === "object" && "choix" in recu ? liste?.find((o) => o.id === (recu as { choix?: unknown }).choix) : undefined;
    const brut = proposee ? { ...(recu as object), quoi: quoiDeProposition(proposee) } : recu;
    const r = objectifSaisieSchema.safeParse(brut);
    if (!r.success) {
      const premier = r.error.issues[0];
      return { ok: false, erreur: premier?.message ?? "Objectif invalide.", champ: String(premier?.path[0] ?? ""), rang };
    }
    const lue = r.data;
    const choisi = lue.choix ? liste?.find((o) => o.id === lue.choix) : undefined;
    if (lue.choix && !choisi) return { ok: false, erreur: "Cet objectif n'est pas proposé pour cet agent.", champ: "choix", rang };
    if (choisi && lue.partie !== undefined && lue.partie !== (choisi.groupe ?? "")) return { ok: false, erreur: "Cet objectif n'appartient pas à cette partie de la liste.", champ: "choix", rang };
    if (!choisi && lue.partie !== undefined && !parties.includes(lue.partie)) return { ok: false, erreur: "Cette partie de la liste n'existe pas.", champ: "choix", rang };
    if (choisi && lue.ampleur && !unitesDe(choisi).includes(lue.ampleur.unite)) return { ok: false, erreur: "Cette unité ne convient pas à cet objectif.", champ: "ampleur", rang };
    const saisie: ObjectifSaisie = choisi ? { ...lue, ...(choisi.groupe ? { partie: choisi.groupe } : {}) } : lue;
    // Un nombre ou un taux visé (gabarit) n'a pas de valeur de départ ici : rien à comparer.
    if (!choisi?.gabarit) {
      const v = verifierVraisemblance(saisie, facteurAnnuelMax);
      if (!v.ok) return { ok: false, erreur: v.message, champ: v.champ, rang };
    }
    const origine: OrigineObjectif = choisi ? "proposition" : liste ? "personnel" : "libre";
    const phrase = phraseDe(saisie, choisi);
    // Une proposition seule (forme d'avant le 29 octobre) s'enregistre comme un objectif composé d'une proposition.
    objectifs.push(
      choisi
        ? { saisie, choisi, origine, mode: "composition", phrase, composition: [{ choisi, ...(saisie.ampleur ? { ampleur: saisie.ampleur } : {}), phrase: partieDePhrase(choisi, saisie.ampleur) }], formulation: { proposee: phrase, finale: phrase, modifiee: false } }
        : { saisie, choisi, origine, mode: liste ? "personnel" : null, phrase },
    );
  }
  // Deux fois le même objectif : refusé, y compris un objectif personnel qui reprend mot pour mot une proposition choisie.
  const choix = objectifs.map((o) => o.saisie.choix).filter((c): c is string => c !== undefined);
  if (new Set(choix).size !== choix.length) return { ok: false, erreur: "Le même objectif est choisi deux fois.", champ: "choix" };
  const libres = objectifs.filter((o) => !o.choisi && o.mode !== "composition").map((o) => cleTexte(o.saisie.quoi));
  if (new Set(libres).size !== libres.length) return { ok: false, erreur: "Le même objectif est écrit deux fois.", champ: "quoi" };
  const titres = new Set(objectifs.filter((o) => o.choisi).map((o) => cleTexte(o.choisi!.libelle)));
  const repris = objectifs.findIndex((o) => !o.choisi && o.mode !== "composition" && titres.has(cleTexte(o.saisie.quoi)));
  if (repris >= 0) return { ok: false, erreur: "Cet objectif figure déjà parmi les propositions que vous avez choisies.", champ: "quoi", rang: repris };
  // Une liste en parties : un seul parcours à la fois.
  if (parties.length > 0) {
    const vues = new Set(objectifs.map((o) => o.saisie.partie).filter((p): p is string => p !== undefined));
    if (vues.size > 1) return { ok: false, erreur: `Choisissez vos objectifs dans une seule partie : « ${[...vues].join(" » ou « ")} ».`, champ: "choix" };
  }
  return { ok: true, objectifs };
}

// --- Reprise d'un objectif enregistré dans le formulaire ----------------------------------------------------------------------

// Ce que le formulaire reprend pour modifier l'objectif en cours : le mode, le texte écrit ou les propositions retenues avec leur
// chiffre, le délai, la réussite et la formulation. Un objectif d'avant le 29 octobre fait d'une proposition seule se rouvre
// en mode « Composer », avec cette proposition retenue.
export type ObjectifInitial = {
  mode: ModeObjectif;
  quoi: string;
  ampleur?: Ampleur;
  reussite?: string;
  partie?: string;
  delaiMois: number;
  composition: { choix: string; ampleur?: Ampleur }[];
  formulation?: { finale: string; modifiee: boolean };
};
export function objectifInitial(o: ObjectifSaisie & { mode?: ModeObjectif | null; composition?: { choix: string; ampleur?: Ampleur }[]; formulation?: { finale: string; modifiee: boolean } }): ObjectifInitial {
  const composition = o.composition?.map((c) => ({ choix: c.choix, ...(c.ampleur ? { ampleur: c.ampleur } : {}) })) ?? (o.choix ? [{ choix: o.choix, ...(o.ampleur ? { ampleur: o.ampleur } : {}) }] : []);
  return {
    mode: o.mode ?? (composition.length > 0 ? "composition" : "personnel"),
    quoi: o.quoi,
    ...(o.ampleur ? { ampleur: o.ampleur } : {}),
    ...(o.reussite ? { reussite: o.reussite } : {}),
    ...(o.partie ? { partie: o.partie } : {}),
    delaiMois: o.delaiMois,
    composition,
    ...(o.formulation ? { formulation: { finale: o.formulation.finale, modifiee: o.formulation.modifiee } } : {}),
  };
}

// Comm (décision du 28 octobre, option 6C) : la partie choisie pour l'objectif et le parcours du questionnaire restent
// séparés. Le parcours suit la réponse à une question (COM-10.07 « Publiez-vous… ? ») ; quand cette réponse correspond à
// l'autre partie, le dirigeant en est averti. Rien n'est bloqué ni changé à sa place.
export type SuiviParcours = { donnee: string; question: string; options: Record<string, string>; parties: { nom: string; reponses: string[] }[] };

export function ecartDeParcours(suivi: SuiviParcours | null, partie: string | null | undefined, valeur: unknown): string | null {
  if (!suivi || !partie || typeof valeur !== "string") return null;
  const choisie = suivi.parties.find((p) => p.nom === partie);
  const suivie = suivi.parties.find((p) => p.reponses.includes(valeur));
  if (!choisie || !suivie || suivie.nom === choisie.nom) return null;
  return `Votre objectif est dans la partie « ${choisie.nom} ». Votre questionnaire, lui, suit votre réponse à « ${suivi.question} » (« ${suivi.options[valeur] ?? valeur} ») : il vous pose les questions de la partie « ${suivie.nom} ». Rien n'est bloqué : vous pouvez garder cet objectif ou le changer.`;
}

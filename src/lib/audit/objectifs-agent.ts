// Objectif d'un agent. Acquisition et Finance : un objectif libre en trois champs. RH et Comm : un objectif par agent
// (décision du propriétaire du 28 octobre, option 1B, qui remplace la possibilité de plusieurs objectifs du 27 octobre),
// complet : son chiffre ou ce que le dirigeant veut constater, son délai, son avancement. Quand la liste de l'agent a des
// parties (Comm : « Améliorer ce que j'ai déjà », « Mettre en place ma présence en ligne »), l'objectif vient d'une partie.
//
// L'objectif est soit une proposition de la liste, soit un objectif écrit par le dirigeant (« Écrire mon propre
// objectif ») : jamais les deux. Une proposition prend le texte de la liste, quel que soit le texte reçu ; un objectif
// personnel garde le texte du dirigeant tel qu'il l'a écrit (aux espaces de début et de fin près), même s'il ressemble à
// une proposition.
//
// Contrôle commun à la route de l'application et à l'aperçu. Ce fichier n'importe que zod et des types.

import { objectifSaisieSchema, phraseObjectif, verifierVraisemblance, type ObjectifSaisie, type OrigineObjectif, type UniteAmpleur } from "./objectif.ts";
import type { ObjectifAgent } from "../donnees/schemas.ts";

// Un objectif par agent (décision du 28 octobre, option 1B ; le plafond de 10 du 27 octobre n'a plus d'objet).
export const MAX_OBJECTIFS = 1;

export type ObjectifControle = { saisie: ObjectifSaisie; choisi: ObjectifAgent | undefined; origine: OrigineObjectif; phrase: string };
export type ControleObjectifs = { ok: true; objectifs: ObjectifControle[] } | { ok: false; erreur: string; champ?: string; rang?: number };

const cleTexte = (t: string) => t.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.\s]+$/, "").replace(/\s+/g, " ");

// Ce que le dirigeant veut changer, pour une proposition : son titre, en minuscule initiale (« réduire les absences dans l'équipe »).
export const quoiDeProposition = (o: Pick<ObjectifAgent, "libelle">) => o.libelle.charAt(0).toLowerCase() + o.libelle.slice(1);

// Unités entre lesquelles le dirigeant choisit pour une proposition chiffrée (une seule quand le chiffre est un nombre visé).
export const unitesDe = (o: Pick<ObjectifAgent, "unite" | "unites">): UniteAmpleur[] => o.unites ?? (o.unite ? [o.unite] : []);

// Phrase d'un objectif : celle que la proposition a écrite pour l'unité choisie (nombre ou taux visé, hausse ou baisse).
export const gabaritDe = (saisie: Pick<ObjectifSaisie, "ampleur">, choisi: Pick<ObjectifAgent, "gabarit" | "phrases"> | undefined) =>
  choisi?.gabarit ?? (saisie.ampleur ? choisi?.phrases?.[saisie.ampleur.unite] : undefined);
export const phraseDe = (saisie: ObjectifSaisie, choisi: Pick<ObjectifAgent, "gabarit" | "phrases"> | undefined) => phraseObjectif(saisie, gabaritDe(saisie, choisi));

// `liste` : objectifs proposés pour l'agent (null : objectif libre en trois champs, un seul).
export function controlerObjectifs(saisies: unknown[], liste: ObjectifAgent[] | null, facteurAnnuelMax: number): ControleObjectifs {
  if (saisies.length === 0) return { ok: false, erreur: "Choisissez un objectif proposé ou écrivez votre propre objectif.", champ: "choix" };
  if (saisies.length > MAX_OBJECTIFS) return { ok: false, erreur: "Cet agent suit un seul objectif à la fois.", champ: "choix" };
  const parties = liste ? [...new Set(liste.map((o) => o.groupe ?? ""))].filter((g) => g !== "") : [];
  const objectifs: ObjectifControle[] = [];
  for (const [rang, recu] of saisies.entries()) {
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
    objectifs.push({ saisie, choisi, origine, phrase: phraseDe(saisie, choisi) });
  }
  // Deux fois le même objectif : refusé, y compris un objectif personnel qui reprend mot pour mot une proposition choisie.
  const choix = objectifs.map((o) => o.saisie.choix).filter((c): c is string => c !== undefined);
  if (new Set(choix).size !== choix.length) return { ok: false, erreur: "Le même objectif est choisi deux fois.", champ: "choix" };
  const libres = objectifs.filter((o) => !o.choisi).map((o) => cleTexte(o.saisie.quoi));
  if (new Set(libres).size !== libres.length) return { ok: false, erreur: "Le même objectif est écrit deux fois.", champ: "quoi" };
  const titres = new Set(objectifs.filter((o) => o.choisi).map((o) => cleTexte(o.choisi!.libelle)));
  const repris = objectifs.findIndex((o) => !o.choisi && titres.has(cleTexte(o.saisie.quoi)));
  if (repris >= 0) return { ok: false, erreur: "Cet objectif figure déjà parmi les propositions que vous avez choisies.", champ: "quoi", rang: repris };
  // Une liste en parties : un seul parcours à la fois.
  if (parties.length > 0) {
    const vues = new Set(objectifs.map((o) => o.saisie.partie).filter((p): p is string => p !== undefined));
    if (vues.size > 1) return { ok: false, erreur: `Choisissez vos objectifs dans une seule partie : « ${[...vues].join(" » ou « ")} ».`, champ: "choix" };
  }
  return { ok: true, objectifs };
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

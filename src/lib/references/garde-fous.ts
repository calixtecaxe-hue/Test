// Garde-fous automatiques d'une référence de marché (cahier « références de marché », partie 4) : le
// code contrôle ce que l'agent de recherche propose avant tout enregistrement. Rien n'est jugé par une
// IA ici : chaque règle est un test sur des données.
//
//   A. qualité de la source   B. exactitude du chiffre   C. confiance attribuée
//
// Fonctions pures : testables sans réseau ni base.

import type { IndicateurCatalogue, ParametresReferences, SourcesReconnues } from "../donnees/schemas.ts";
import type { Candidate } from "./proposition.ts";
import type { ResultatExtrait } from "./verification-page.ts";

export type ContexteGardeFous = {
  indicateur: IndicateurCatalogue;
  params: ParametresReferences;
  sources: SourcesReconnues;
  aujourdhui: Date;
  // Résultat de la relecture de la page citée (extrait et chiffre retrouvés ?).
  verification: ResultatExtrait;
  // Valeurs de ce même indicateur pour d'autres métiers de la même famille.
  pairs: number[];
};

export type Evaluation = {
  accepte: boolean;
  // Raisons du rejet : une seule suffit à écarter la source.
  rejets: string[];
  // Raisons qui plafonnent la confiance à « indicatif ».
  plafonds: string[];
  niveauSource: 1 | 2 | null;
  // Valeur dans l'unité et la période du catalogue, après la seule conversion permise.
  valeur: number | null;
  borneBasse: number | null;
  borneHaute: number | null;
  // Valeur très éloignée des autres métiers de la famille : passe en revue, n'est pas rejetée.
  aRevoir: string | null;
};

export function hoteDe(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function domaineDans(hote: string, liste: string[]): boolean {
  return liste.some((d) => hote === d || hote.endsWith(`.${d}`));
}

// Premier jour de la période publiée : une date « 2023 » est comptée au 1er janvier 2023, la lecture
// la plus prudente pour l'âge d'une source.
function dateDePublication(d: string): Date | null {
  const [a, m = "01", j = "01"] = d.split("-");
  const date = new Date(`${a}-${m}-${j}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageEnAnnees(publication: Date, aujourdhui: Date): number {
  return (aujourdhui.getTime() - publication.getTime()) / (365.25 * 86_400_000);
}

const CATEGORIES_EXCLUES: Record<string, string> = {
  presse: "Article de presse : il faut remonter à l'étude d'origine.",
  blog_editeur: "Blog d'éditeur de logiciel, de CRM ou vendeur de formation.",
  forum: "Forum ou contenu sans auteur identifiable.",
  genere_par_ia: "Contenu manifestement généré par IA.",
  publie_par_caxe: "Contenu publié par CAXE.",
  autre: "Catégorie de source non reconnue.",
};

export function mediane(valeurs: number[]): number {
  const t = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}

export function evaluerCandidate(c: Candidate, ctx: ContexteGardeFous): Evaluation {
  const rejets: string[] = [];
  const plafonds: string[] = [];
  const { indicateur, params, sources } = ctx;
  const s = c.source;
  const hote = hoteDe(s.url);

  // A. Qualité de la source ------------------------------------------------------------
  if (CATEGORIES_EXCLUES[s.categorie]) rejets.push(CATEGORIES_EXCLUES[s.categorie]);
  if (domaineDans(hote, sources.exclusDomaines)) rejets.push(`Domaine exclu : ${hote}.`);
  if (domaineDans(hote, sources.domainesCaxe)) rejets.push("Contenu publié par CAXE.");
  if (!s.auteurIdentifie) rejets.push("Contenu sans auteur ni organisme identifiable.");

  // Le niveau 1 n'est jamais accordé sur la seule parole de l'agent : le domaine doit être connu.
  let niveau: 1 | 2 | null = null;
  if (s.categorie === "officiel") niveau = domaineDans(hote, sources.niveau1Domaines) ? 1 : 2;
  else if (s.categorie === "federation" || s.categorie === "observatoire") niveau = domaineDans(hote, sources.federationsEtObservatoiresValides) ? 1 : 2;
  else if (s.categorie === "etude") niveau = 2;
  if (niveau === 2 && !s.methodologiePubliee) rejets.push("Étude sans méthodologie publiée.");

  const publication = dateDePublication(s.datePublication);
  if (!publication) rejets.push("Date de publication illisible.");
  else {
    const age = ageEnAnnees(publication, ctx.aujourdhui);
    if (age < 0) rejets.push("Date de publication dans le futur.");
    else if (age > params.ageSourceMaxAns.indicatif) rejets.push(`Source de plus de ${params.ageSourceMaxAns.indicatif} ans.`);
    else if (age > params.ageSourceMaxAns.solide) plafonds.push(`Source de plus de ${params.ageSourceMaxAns.solide} ans.`);
  }
  if (!/^france$/i.test(s.pays.trim())) plafonds.push("Source étrangère.");

  // B. Exactitude du chiffre -----------------------------------------------------------
  if (!ctx.verification.ok) rejets.push(ctx.verification.motif);
  if (c.concordanceDefinition === "differente") rejets.push("La source ne mesure pas la même chose que l'indicateur.");
  else if (c.concordanceDefinition === "proche") plafonds.push("Définition proche mais pas identique à celle de l'indicateur.");

  let valeur: number | null = c.valeurSource;
  let borneBasse = c.borneBasse;
  let borneHaute = c.borneHaute;
  if (c.uniteSource !== indicateur.unite) {
    rejets.push(`Unité différente : la source donne des ${c.uniteSource}, l'indicateur est en ${indicateur.unite}.`);
    valeur = null;
  } else if (c.periodeSource !== indicateur.periode) {
    // Seule conversion permise : un montant annuel ramené au mois. Jamais pour un taux.
    const permise = c.conversion === "annuel_vers_mensuel" && c.periodeSource === "an" && indicateur.periode === "mois" && (indicateur.unite === "euros" || indicateur.unite === "euros_par_heure");
    if (permise && indicateur.unite === "euros") {
      valeur = c.valeurSource / 12;
      borneBasse = borneBasse === null ? null : borneBasse / 12;
      borneHaute = borneHaute === null ? null : borneHaute / 12;
    } else {
      rejets.push(`Période différente (${c.periodeSource} au lieu de ${indicateur.periode}) : aucune conversion permise.`);
      valeur = null;
    }
  } else if (c.conversion !== null) {
    rejets.push("Conversion déclarée alors que l'unité et la période sont déjà celles de l'indicateur.");
    valeur = null;
  }

  if (s.populationTaille === "grandes_entreprises") plafonds.push("Population de grandes entreprises appliquée à une TPE.");
  else if (s.populationTaille === "inconnue") plafonds.push("Taille des entreprises de la population inconnue.");
  if (s.echantillon !== null && s.echantillon < params.echantillonMinSolide) plafonds.push(`Échantillon de moins de ${params.echantillonMinSolide} répondants.`);
  if (s.echantillon === null && niveau === 2) plafonds.push("Taille de l'échantillon inconnue.");

  let aRevoir: string | null = null;
  if (valeur !== null) {
    const { min, max } = indicateur.bornesVraisemblance;
    if (min !== null && valeur < min) rejets.push(`Valeur sous la borne de vraisemblance (${min}).`);
    if (max !== null && valeur > max) rejets.push(`Valeur au-dessus de la borne de vraisemblance (${max}).`);
    if (borneBasse !== null && borneHaute !== null && (valeur < borneBasse || valeur > borneHaute)) rejets.push("La valeur est hors de la fourchette donnée par la source.");
    if (ctx.pairs.length >= 3) {
      const ref = mediane(ctx.pairs);
      if (ref !== 0 && (Math.abs(valeur - ref) / Math.abs(ref)) * 100 > params.ecartAuxPairsRevuePourcent) {
        aRevoir = `Valeur très éloignée des autres métiers de la même famille (médiane ${ref}).`;
      }
    }
  }

  return { accepte: rejets.length === 0, rejets, plafonds, niveauSource: niveau, valeur, borneBasse, borneHaute, aRevoir };
}

// --- Recoupement et décision (B et C) ----------------------------------------------------

export type Decision =
  | { statut: "aucune_reference"; motifs: string[] }
  | {
      statut: "actif" | "a_revoir";
      confiance: "solide" | "indicatif";
      valeurCentrale: number;
      borneBasse: number | null;
      borneHaute: number | null;
      // Source principale ; la seconde est enregistrée quand elle a été retenue (confirmée ou divergente).
      principale: Candidate;
      seconde: Candidate | null;
      motifs: string[];
    };

type Evalue = { candidate: Candidate; evaluation: Evaluation };

// Deux sources sont indépendantes quand elles viennent d'organismes et de domaines différents et que
// la seconde ne cite pas la première.
export function independantes(a: Candidate, b: Candidate, citeLaPremiere: boolean): boolean {
  return !citeLaPremiere && hoteDe(a.source.url) !== hoteDe(b.source.url) && a.source.organisme.trim().toLowerCase() !== b.source.organisme.trim().toLowerCase();
}

export function decider(principale: Evalue | null, seconde: (Evalue & { citeLaPremiere: boolean }) | null, params: ParametresReferences, rejetsPrincipale: string[]): Decision {
  if (!principale || !principale.evaluation.accepte || principale.evaluation.valeur === null || principale.evaluation.niveauSource === null) {
    return { statut: "aucune_reference", motifs: rejetsPrincipale.length > 0 ? rejetsPrincipale : ["Aucune source n'a passé les contrôles."] };
  }
  const p = principale.evaluation;
  const motifs = [...p.plafonds];
  let valeurCentrale = p.valeur as number;
  let borneBasse = p.borneBasse;
  let borneHaute = p.borneHaute;
  let confirmee = false;
  let divergente = false;
  let secondeRetenue: Candidate | null = null;

  if (seconde && seconde.evaluation.accepte && seconde.evaluation.valeur !== null) {
    if (!independantes(principale.candidate, seconde.candidate, seconde.citeLaPremiere)) {
      motifs.push("La seconde source n'est pas indépendante de la première : elle ne confirme rien.");
    } else {
      const v2 = seconde.evaluation.valeur;
      const ecart = valeurCentrale === 0 ? (v2 === 0 ? 0 : Infinity) : (Math.abs(v2 - valeurCentrale) / Math.abs(valeurCentrale)) * 100;
      secondeRetenue = seconde.candidate;
      if (ecart <= params.recoupementEcartMaxPourcent) confirmee = true;
      else {
        // Les deux sources divergent : on garde les deux, on stocke la fourchette, jamais « solide ».
        divergente = true;
        borneBasse = Math.min(valeurCentrale, v2);
        borneHaute = Math.max(valeurCentrale, v2);
        valeurCentrale = (valeurCentrale + v2) / 2;
        motifs.push(`Sources divergentes (écart de ${Math.round(ecart)} %) : fourchette enregistrée, revue demandée.`);
      }
    }
  }
  if (p.aRevoir) motifs.push(p.aRevoir);

  let confiance: "solide" | "indicatif" = "indicatif";
  if (!divergente && p.plafonds.length === 0) {
    if (p.niveauSource === 1) confiance = "solide";
    else if (confirmee) confiance = "solide";
    else motifs.push("Source de niveau 2 non recoupée : confiance indicative.");
  }
  return {
    statut: divergente || p.aRevoir ? "a_revoir" : "actif",
    confiance,
    valeurCentrale,
    borneBasse,
    borneHaute,
    principale: principale.candidate,
    seconde: secondeRetenue,
    motifs,
  };
}

// Instructions rencontrées dans des pages lues : signalées dans le journal, jamais suivies.
export { detecterInstructions as detecterInstructionsDansPages } from "./verification-page.ts";

// Traitement d'un couple indicateur + métier : décider s'il faut chercher, chercher, relire les pages,
// appliquer les garde-fous, enregistrer la référence (ou « aucune référence ») et tenir le journal.
// Cahier « références de marché », parties 3.3, 3.4, 3.5, 4 et 8.
//
// Tout ce qui touche au réseau ou à la base passe par des interfaces injectées : ce fichier se teste
// avec de fausses réponses, sans réseau ni base.

import type { FicheTheme, IndicateurCatalogue, ParametresReferences, SourcesReconnues } from "../donnees/schemas.ts";
import { besoinDeRecherche, echeanceDeMiseAJour, type RaisonRecherche } from "./cascade.ts";
import { decider, detecterInstructionsDansPages, evaluerCandidate, type Decision, type Evaluation } from "./garde-fous.ts";
import { lireProposition, type Candidate } from "./proposition.ts";
import { coutEnCentimes, type ClientRecherche } from "./recherche.ts";
import type { Reference } from "./types.ts";
import { verifierExtrait, type LecteurPage } from "./verification-page.ts";

export type NouvelleReference = Omit<Reference, "id" | "version" | "nbUtilisations" | "creeLe">;

export type EtatRecherche = "acceptee" | "a_revoir" | "aucune_reference" | "rejetee" | "erreur";

export interface DepotRecherche {
  // Prend le verrou du couple ; null si une recherche est déjà en cours.
  prendreVerrou(indicateurId: string, metier: string): Promise<string | null>;
  tentatives(indicateurId: string, metier: string): Promise<number>;
  referencesMetier(indicateurId: string, metier: string): Promise<Reference[]>;
  depenseCentimes(depuis: Date): Promise<number>;
  // Valeurs actives de cet indicateur pour d'autres métiers de la même famille.
  valeursPairs(indicateurId: string, metiers: string[]): Promise<number[]>;
  enregistrer(r: NouvelleReference): Promise<string>;
  cloturer(rechercheId: string, etat: EtatRecherche, journal: Journal, coutCentimes: number, referenceId: string | null): Promise<void>;
}

export type Journal = {
  demande: { indicateur: string; metier: string };
  pagesVues: string[];
  pages: { url: string; ok: boolean; motif: string | null }[];
  rejets: string[];
  plafonds: string[];
  instructionsSignalees: string[];
  decision: string | null;
  erreur: string | null;
};

export type Dependances = {
  client: ClientRecherche;
  lirePage: LecteurPage;
  depot: DepotRecherche;
  params: ParametresReferences;
  sources: SourcesReconnues;
  maintenant: () => Date;
};

export type EntreeCouple = {
  // « effet » : l'effet d'une action (catalogue-effets.json) ; sinon un chiffre de marché.
  genre?: "marche" | "effet";
  action?: string;
  fiche: Pick<FicheTheme, "theme" | "rechercheReference">;
  indicateur: IndicateurCatalogue;
  metier: { id: string; libelle: string };
  famille: string;
  // Autres métiers de la même famille, pour repérer une valeur atypique.
  metiersPairs: string[];
};

export type ResultatCouple =
  | { etat: "ignoree"; raison: RaisonRecherche | "plafond_budget_mensuel" | "plafond_budget_quotidien"; coutCentimes: 0 }
  | { etat: EtatRecherche; raison: string; referenceId: string | null; coutCentimes: number };

const debutDeMois = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const debutDeJour = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export async function traiterCouple(dep: Dependances, e: EntreeCouple): Promise<ResultatCouple> {
  const { params } = dep;
  const maintenant = dep.maintenant();
  const refsMetier = await dep.depot.referencesMetier(e.indicateur.id, e.metier.id);
  const decision = besoinDeRecherche(
    {
      rechercheReference: e.fiche.rechercheReference,
      statutRedaction: e.indicateur.statutRedaction,
      metier: e.metier.id,
      referencesMetier: refsMetier,
      verrouPris: false,
      tentatives: await dep.depot.tentatives(e.indicateur.id, e.metier.id),
    },
    params,
    maintenant
  );
  if (!decision.chercher) return { etat: "ignoree", raison: decision.raison, coutCentimes: 0 };

  // Plafonds de dépenses : atteints, on se replie (jamais de blocage du rapport).
  if ((await dep.depot.depenseCentimes(debutDeMois(maintenant))) >= params.plafondsBudget.mensuelEuros * 100) return { etat: "ignoree", raison: "plafond_budget_mensuel", coutCentimes: 0 };
  if (params.plafondsBudget.quotidienEuros !== null && (await dep.depot.depenseCentimes(debutDeJour(maintenant))) >= params.plafondsBudget.quotidienEuros * 100) {
    return { etat: "ignoree", raison: "plafond_budget_quotidien", coutCentimes: 0 };
  }

  const verrou = await dep.depot.prendreVerrou(e.indicateur.id, e.metier.id);
  if (verrou === null) return { etat: "ignoree", raison: "recherche_en_cours", coutCentimes: 0 };

  const journal: Journal = {
    demande: { indicateur: e.indicateur.id, metier: e.metier.id },
    pagesVues: [],
    pages: [],
    rejets: [],
    plafonds: [],
    instructionsSignalees: [],
    decision: null,
    erreur: null,
  };
  let cout = 0;
  const clore = async (etat: EtatRecherche, raison: string, referenceId: string | null): Promise<ResultatCouple> => {
    journal.decision = raison;
    await dep.depot.cloturer(verrou, etat, journal, cout, referenceId);
    return { etat, raison, referenceId, coutCentimes: cout };
  };

  try {
    const reponse = await dep.client.chercher({ genre: e.genre ?? "marche", action: e.action, indicateur: e.indicateur, metierLibelle: e.metier.libelle, zone: null });
    cout = coutEnCentimes(reponse.usage, params.tarifs);
    journal.pagesVues = reponse.pagesVues;
    if (reponse.refus) return await clore("erreur", "La demande a été refusée par les classificateurs de sécurité.", null);

    const lue = lireProposition(reponse.texte);
    if (!lue.ok) return await clore("rejetee", lue.motif, null);
    const prop = lue.proposition;
    journal.instructionsSignalees.push(...prop.instructionsRencontrees);

    if (prop.resultat === "aucune_reference") {
      const id = await dep.depot.enregistrer(nouvelleAbsence(e, prop.motif, maintenant));
      return await clore("aucune_reference", prop.motif, id);
    }

    const pairs = await dep.depot.valeursPairs(e.indicateur.id, e.metiersPairs);
    const evaluer = async (c: Candidate) => {
      const page = await dep.lirePage(c.source.url);
      journal.pages.push({ url: c.source.url, ok: page.ok, motif: page.ok ? null : page.motif });
      if (page.ok) journal.instructionsSignalees.push(...detecterInstructionsDansPages(page.texte));
      const verification = page.ok ? verifierExtrait(page.texte, c.source.extrait, c.valeurSource) : page;
      const evaluation = evaluerCandidate(c, { indicateur: e.indicateur, params, sources: dep.sources, aujourdhui: maintenant, verification, pairs });
      return { candidate: c, evaluation };
    };

    const premiere = await evaluer(prop.principale);
    const seconde = prop.seconde ? { ...(await evaluer(prop.seconde)), citeLaPremiere: prop.seconde.citeLaPremiere } : null;
    journal.rejets.push(...premiere.evaluation.rejets.map((m) => `source 1 : ${m}`), ...(seconde?.evaluation.rejets.map((m) => `source 2 : ${m}`) ?? []));

    // Source principale rejetée et seconde acceptée : la seconde devient la principale, sans recoupement.
    const retenue: { principale: typeof premiere | null; seconde: typeof seconde } = premiere.evaluation.accepte
      ? { principale: premiere, seconde }
      : seconde && seconde.evaluation.accepte
        ? { principale: seconde, seconde: null }
        : { principale: null, seconde: null };
    const motifsRejet = premiere.evaluation.accepte ? [] : [...premiere.evaluation.rejets, ...(seconde ? seconde.evaluation.rejets : [])];
    const d: Decision = decider(retenue.principale, retenue.seconde, params, motifsRejet);
    if (d.statut === "aucune_reference") {
      const motif = d.motifs.join(" ");
      const id = await dep.depot.enregistrer(nouvelleAbsence(e, motif, maintenant));
      return await clore("aucune_reference", motif, id);
    }
    journal.plafonds.push(...d.motifs);
    const ev: Evaluation = retenue.principale!.evaluation;
    const id = await dep.depot.enregistrer(nouvelleReference(e, d, ev, maintenant, params));
    return await clore(d.statut === "actif" ? "acceptee" : "a_revoir", d.motifs.join(" ") || "Référence enregistrée.", id);
  } catch (erreur) {
    journal.erreur = erreur instanceof Error ? erreur.message.slice(0, 300) : "Erreur inconnue.";
    return await clore("erreur", journal.erreur, null);
  }
}

const aujourdhuiISO = (d: Date) => d.toISOString().slice(0, 10);

function base(e: EntreeCouple) {
  return { themeId: e.fiche.theme, indicateurId: e.indicateur.id, niveau: "metier" as const, metier: e.metier.id, famille: null, unite: e.indicateur.unite, periode: e.indicateur.periode };
}

function nouvelleAbsence(e: EntreeCouple, motif: string, maintenant: Date): NouvelleReference {
  void maintenant;
  return {
    ...base(e),
    sousVariante: null,
    zone: "toutes",
    trancheTaille: "toutes",
    valeurCentrale: null,
    borneBasse: null,
    borneHaute: null,
    statistique: null,
    sens: e.indicateur.sens ?? "plus_haut_mieux",
    source: null,
    secondeSource: null,
    confiance: null,
    statut: "aucune_reference",
    dateExpiration: null,
    actif: false,
    motif,
  };
}

function versSource(c: Candidate, maintenant: Date): NonNullable<Reference["source"]> {
  const s = c.source;
  return {
    organisme: s.organisme,
    titre: s.titre,
    url: s.url,
    datePublication: s.datePublication,
    dateConsultation: aujourdhuiISO(maintenant),
    pays: s.pays,
    population: s.population,
    echantillon: s.echantillon,
    definition: s.definition,
    extrait: s.extrait,
    niveau: 2,
  };
}

function nouvelleReference(e: EntreeCouple, d: Exclude<Decision, { statut: "aucune_reference" }>, ev: Evaluation, maintenant: Date, params: ParametresReferences): NouvelleReference {
  const p = d.principale;
  return {
    ...base(e),
    sousVariante: p.sousVariante,
    zone: p.zone,
    trancheTaille: p.trancheTaille,
    valeurCentrale: d.valeurCentrale,
    borneBasse: d.borneBasse,
    borneHaute: d.borneHaute,
    statistique: p.statistique,
    sens: e.indicateur.sens ?? "plus_haut_mieux",
    source: { ...versSource(p, maintenant), niveau: ev.niveauSource ?? 2 },
    secondeSource: d.seconde ? versSource(d.seconde, maintenant) : null,
    confiance: d.confiance,
    statut: d.statut,
    dateExpiration: echeanceDeMiseAJour(maintenant, e.famille, params),
    actif: d.statut === "actif",
    motif: d.motifs.length > 0 ? d.motifs.join(" ") : null,
  };
}

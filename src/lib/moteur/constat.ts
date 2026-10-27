// Étage 1 du moteur : le constat par thème (CLAUDE.md section 7).
//
// Chaque thème visible est : noté (vert / orange / rouge), « non évalué » (moins de 50 %
// de réponses), « contexte » (non noté, sert à l'IA), ou sans règle de notation.
//
// Thème de nature Marché : il se compare à une référence de marché trouvée par la cascade
// (src/lib/references/cascade.ts). Sans référence, le thème reste affiché avec les chiffres du
// client et sans comparaison au marché (`aucune_reference`) ; le client ne voit jamais d'erreur
// (voir affichage-constat.ts). Rien n'est inventé. Un thème masqué par la taille ou par un
// déclencheur est masqué, jamais « non évalué ».
//
// Le moteur n'appelle jamais l'IA et ne produit aucun score global.
//
// Ce fichier n'importe que des types et des fonctions pures : il se teste avec Node.

import type { EnsembleDonnees } from "../donnees/schemas.ts";
import { donneesPrerepondues, equivalences, type Assemblage } from "../audit/assemblage.ts";
import { couvertureTheme, valeurRetenue, type CouvertureTheme, type Reponse, type Reponses } from "../audit/reponse.ts";
import { choisirSeuil, noter, type Couleur, type NiveauPratique, type Seuil } from "./notation.ts";
import { choisirReference, type ContexteReference } from "../references/cascade.ts";
import type { NiveauReference, Reference } from "../references/types.ts";

// aucune_reference : thème de nature Marché sans référence trouvée.
// reference_disponible : une référence existe ; la position du client face au marché se calcule à l'étape c.
// sans_comparaison : thème de nature Marché qui ne se compare pas à un marché (volume absolu).
// regle_manquante : thème de nature Pratique ou Cohérence dont la règle de notation n'est pas écrite.
export type StatutTheme = "masque" | "non_evalue" | "contexte" | "regle_manquante" | "aucune_reference" | "reference_disponible" | "sans_comparaison" | "note";

// Le repère de marché retenu pour un indicateur, tel que le rapport le citera (partie 5.3).
export type Repere = {
  indicateur: string;
  libelle: string;
  niveau: NiveauReference;
  organisme: string;
  annee: string;
  url: string;
  confiance: "solide" | "indicatif";
  perimee: boolean;
  referenceId: string;
  version: number;
};

export type Constat = {
  theme: string;
  nom: string;
  nature: string;
  statut: StatutTheme;
  couleur: Couleur | null;
  // Seuil sans source : la couleur est calculée mais reste à valider.
  aValider: boolean;
  // Valeur estimée (fourchette) à l'origine de la couleur.
  estimee: boolean;
  couverture: CouvertureTheme | null;
  raison: string | null;
  // Repères de marché retenus (un par indicateur du catalogue qui en a un) ; vide sans référence.
  reperes: Repere[];
  // Indicateurs du thème pour lesquels aucune référence n'a été trouvée.
  indicateursSansReference: string[];
};

export type ContexteConstat = {
  zone: string;
  taille: string;
  // Références de marché disponibles et contexte du compte pour la cascade. Sans elles, aucun
  // thème de nature Marché ne trouve de repère.
  references?: Reference[];
  contexteReference?: ContexteReference;
  aujourdhui?: Date;
};

const NIVEAUX_PRATIQUE = new Set<string>(["en_place", "partielle", "absente"]);

function valeurNotable(r: Reponse | undefined): { valeur: number | NiveauPratique; estimee: boolean } | null {
  const v = valeurRetenue(r);
  if (v) return { valeur: v.valeur, estimee: v.estimee };
  if (r?.genre === "saisie" && typeof r.valeur === "string" && NIVEAUX_PRATIQUE.has(r.valeur)) {
    return { valeur: r.valeur as NiveauPratique, estimee: false };
  }
  return null;
}

export function constaterAgent(e: EnsembleDonnees, seuils: Seuil[], a: Assemblage, reponses: Reponses, ctx: ContexteConstat): Constat[] {
  const equiv = equivalences(e.donnees, donneesPrerepondues(e.prereponses));
  // Une donnée posée par un autre agent compte ici : on lit la réponse de son équivalent.
  const effective = (code: string): Reponse | undefined => {
    const direct = reponses[code];
    if (direct !== undefined) return direct;
    for (const autre of equiv.get(code) ?? []) if (reponses[autre] !== undefined) return reponses[autre];
    return undefined;
  };
  const base = { aValider: false, estimee: false, couleur: null as Couleur | null, couverture: null as CouvertureTheme | null, raison: null as string | null, reperes: [] as Repere[], indicateursSansReference: [] as string[] };
  const constats: Constat[] = [];

  for (const t of a.themesMasques) {
    constats.push({ ...base, theme: t.code, nom: t.nom, nature: t.nature, statut: "masque", raison: t.masquePour });
  }

  for (const { theme, questions } of a.themes) {
    const identite = { theme: theme.code, nom: theme.nom, nature: theme.nature };
    if (theme.nature === "contexte") {
      constats.push({ ...base, ...identite, statut: "contexte" });
      continue;
    }
    const codes = questions.map((q) => q.code);
    const effectives: Reponses = Object.fromEntries(codes.map((c) => [c, effective(c)]));
    const couverture = couvertureTheme(codes, effectives);
    if (!couverture.evaluable) {
      constats.push({ ...base, ...identite, statut: "non_evalue", couverture, raison: "Moins de la moitié des questions ont une réponse." });
      continue;
    }
    const duTheme = seuils.filter((s) => s.theme === theme.code);
    const applicables = duTheme
      .map((s) => choisirSeuil(duTheme, s.donnee, ctx.zone, ctx.taille))
      .filter((s, i, tous): s is Seuil => s !== null && tous.indexOf(s) === i);
    if (applicables.length === 0 && theme.nature === "marche") {
      constats.push({ ...base, ...identite, ...constatMarche(e, theme.code, ctx), couverture });
      continue;
    }
    if (applicables.length === 0) {
      constats.push({ ...base, ...identite, statut: "regle_manquante", couverture, raison: "La règle de notation de ce thème n'est pas écrite." });
      continue;
    }
    if (applicables.length > 1) {
      constats.push({ ...base, ...identite, statut: "regle_manquante", couverture, raison: "Plusieurs indicateurs notés dans ce thème : la règle d'agrégation reste à préciser." });
      continue;
    }
    const s = applicables[0];
    const lue = valeurNotable(effective(s.donnee));
    const couleur = lue ? noter(s.notation, lue.valeur) : null;
    if (!lue || couleur === null) {
      constats.push({ ...base, ...identite, statut: "non_evalue", couverture, raison: "La donnée notée n'a pas de valeur utilisable." });
      continue;
    }
    constats.push({ ...base, ...identite, statut: "note", couleur, aValider: s.source === null, estimee: lue.estimee, couverture });
  }
  return constats;
}

// Thème de nature Marché : une référence par indicateur du catalogue, choisie par la cascade.
function constatMarche(e: EnsembleDonnees, theme: string, ctx: ContexteConstat): Pick<Constat, "statut" | "raison" | "reperes" | "indicateursSansReference"> {
  const fiche = e.catalogue.find((f) => f.theme === theme);
  if (!fiche || !fiche.rechercheReference || fiche.indicateurs.length === 0) {
    return { statut: "sans_comparaison", raison: fiche?.motif ?? "Ce thème ne se compare pas à un marché.", reperes: [], indicateursSansReference: [] };
  }
  const aujourdhui = ctx.aujourdhui ?? new Date();
  const reperes: Repere[] = [];
  const sans: string[] = [];
  for (const ind of fiche.indicateurs) {
    const retenue = ctx.contexteReference && ctx.references ? choisirReference(ctx.references, ind, ctx.contexteReference, aujourdhui) : null;
    if (!retenue || !retenue.reference.source) {
      sans.push(ind.id);
      continue;
    }
    const r = retenue.reference;
    reperes.push({
      indicateur: ind.id,
      libelle: ind.libelle,
      niveau: retenue.niveau,
      organisme: r.source!.organisme,
      annee: r.source!.datePublication.slice(0, 4),
      url: r.source!.url,
      confiance: r.confiance ?? "indicatif",
      perimee: retenue.perimee,
      referenceId: r.id,
      version: r.version,
    });
  }
  if (reperes.length === 0) {
    return { statut: "aucune_reference", raison: "Aucune référence de marché n'est disponible pour ce thème.", reperes, indicateursSansReference: sans };
  }
  return { statut: "reference_disponible", raison: null, reperes, indicateursSansReference: sans };
}

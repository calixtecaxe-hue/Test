// Étage 1 du moteur : le constat par thème (CLAUDE.md section 7).
//
// Chaque thème visible est : noté (vert / orange / rouge), « non évalué » (moins de 50 %
// de réponses), « contexte » (non noté, sert à l'IA), ou « règle manquante » (aucun seuil
// dans data/seuils.json : rien n'est inventé). Un thème masqué par la taille ou par un
// déclencheur est masqué, jamais « non évalué ».
//
// Le moteur n'appelle jamais l'IA et ne produit aucun score global.
//
// Ce fichier n'importe que des types et des fonctions pures : il se teste avec Node.

import type { EnsembleDonnees } from "../donnees/schemas.ts";
import { equivalences, type Assemblage } from "../audit/assemblage.ts";
import { couvertureTheme, valeurRetenue, type CouvertureTheme, type Reponse, type Reponses } from "../audit/reponse.ts";
import { choisirSeuil, noter, type Couleur, type NiveauPratique, type Seuil } from "./notation.ts";

export type StatutTheme = "masque" | "non_evalue" | "contexte" | "regle_manquante" | "note";

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
};

export type ContexteConstat = { zone: string; taille: string };

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
  const equiv = equivalences(e.donnees);
  // Une donnée posée par un autre agent compte ici : on lit la réponse de son équivalent.
  const effective = (code: string): Reponse | undefined => {
    const direct = reponses[code];
    if (direct !== undefined) return direct;
    for (const autre of equiv.get(code) ?? []) if (reponses[autre] !== undefined) return reponses[autre];
    return undefined;
  };
  const base = { aValider: false, estimee: false, couleur: null, couverture: null, raison: null } as const;
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
    if (applicables.length === 0) {
      constats.push({ ...base, ...identite, statut: "regle_manquante", couverture, raison: "Aucun seuil n'est défini pour ce thème dans data/seuils.json." });
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

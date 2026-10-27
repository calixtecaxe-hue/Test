// Réponses actives d'un compte : celles qui s'appliquent encore à sa situation actuelle (vérification du 28 octobre).
//
// Le dirigeant change d'avis : il décoche un canal, répond « non » à une question qui en ouvrait d'autres, efface une
// réponse. Les réponses qu'il avait données aux questions qui ne le concernent plus restent en base (elles reviennent
// s'il revient à son choix précédent : rien n'est perdu), mais elles ne comptent plus nulle part :
//   - une réponse à une question masquée (condition fausse ou en attente, thème masqué, taille, ancienneté, métier) ne
//     décide plus de l'affichage d'autres questions (chaînes A → B → C) et sort des calculs ;
//   - dans un tableau dont les lignes viennent d'une autre réponse (canaux, réseaux, catégories de clients), la case d'une
//     ligne qui n'existe plus sort de la réponse ;
//   - une répartition à total imposé (100 %) dont une ligne a disparu, ou à laquelle une ligne nouvelle s'est ajoutée sans
//     valeur, n'est plus juste : elle ne compte plus tant que le dirigeant ne l'a pas complétée (aucune valeur n'est inventée
//     ni redistribuée).
// Le questionnaire (assemblage), le compte rendu, la progression et le total proposé à la Finance lisent ces réponses.
//
// Ce fichier n'importe que des types et des fonctions pures : il se teste directement avec Node.

import type { EnsembleDonnees, ProfilId, Donnee, ReglesAffichage } from "../donnees/schemas.ts";
import { colonnesDuTotal, idsDeListe, type ReponseSpec, type ValeursStructurees } from "../donnees/reponse-spec.ts";
import { clesDeLaRegle, cleDeDonnee, donneeDuDeclencheur, evaluer, lecteurDeclencheurs, moisMinimumDExistence, type TailleId } from "./affichage.ts";
import type { Reponse, Reponses } from "./reponse.ts";
import type { MetierDuCompte } from "../routage.ts";

export type ContexteActives = {
  profils: ProfilId[];
  taille: TailleId;
  ancienneteMois?: number;
  metier?: MetierDuCompte | null;
  // Thèmes que l'audit Acquisition ne pose pas à ce compte (professions réglementées).
  themesExclus?: string[];
};

type Tableau = Extract<ReponseSpec, { type: "tableau" }>;
const TOLERANCE_TOTAL = 0.5;

// État d'une répartition ou d'un tableau dont les lignes viennent d'une autre réponse, face aux lignes actuelles.
export type EtatTableau = {
  // Cases des lignes actuelles seulement.
  valeurs: ValeursStructurees;
  // Lignes actuelles que la réponse enregistrée ne connaissait pas (choix ajouté depuis).
  nouvelles: string[];
  // Des cases de lignes qui n'existent plus ont été écartées.
  retirees: boolean;
  // Total imposé : somme des lignes actuelles, et si elle tombe juste (null : pas de total imposé).
  somme: number | null;
  juste: boolean | null;
  // La réponse peut compter : au moins une valeur, et, pour un total imposé, total juste et aucune ligne nouvelle.
  utilisable: boolean;
};

export function etatTableau(spec: Tableau, valeurs: ValeursStructurees, lignes: string[]): EtatTableau {
  const actuelles = new Set(lignes);
  const gardees: ValeursStructurees = {};
  let retirees = false;
  for (const [cle, v] of Object.entries(valeurs)) {
    const ligne = cle.slice(0, cle.lastIndexOf("."));
    if (actuelles.has(ligne)) gardees[cle] = v;
    else if (v !== null && v !== "") retirees = true;
  }
  // Une ligne est « connue » si la réponse enregistrée a une case pour elle (une case laissée vide est enregistrée vide).
  const nouvelles = lignes.filter((l) => !spec.colonnes.some((c) => `${l}.${c.id}` in valeurs));
  const remplies = Object.values(gardees).some((v) => v !== null && v !== "");
  if (!spec.total) return { valeurs: gardees, nouvelles, retirees, somme: null, juste: null, utilisable: remplies };
  const total = spec.total;
  const sommeDe = (colonne: string) => lignes.reduce((s, l) => s + (typeof gardees[`${l}.${colonne}`] === "number" ? (gardees[`${l}.${colonne}`] as number) : 0), 0);
  // Chaque colonne au total imposé doit tomber juste (une colonne laissée entièrement vide n'est pas jugée).
  const juste = colonnesDuTotal(total).every((c) => !lignes.some((l) => typeof gardees[`${l}.${c}`] === "number") || Math.abs(sommeDe(c) - total.valeur) <= TOLERANCE_TOTAL);
  const somme = sommeDe(total.colonne);
  return { valeurs: gardees, nouvelles, retirees, somme: Math.round(somme * 100) / 100, juste, utilisable: remplies && juste && nouvelles.length === 0 };
}

// Lignes actuelles d'un tableau dont les lignes viennent d'une autre réponse (null pour les lignes fixes ou libres).
export function lignesActuelles(spec: Tableau, reponses: Reponses, regles: ReglesAffichage): string[] | null {
  const liste = (code: string): string[] => {
    const r = reponses[code];
    return r?.genre === "saisie" && Array.isArray(r.valeur) ? r.valeur : [];
  };
  if (spec.lignes.source === "declencheur") return liste(donneeDuDeclencheur(regles, spec.lignes.cle) ?? spec.lignes.cle);
  if (spec.lignes.source === "donnee") return idsDeListe(liste(spec.lignes.code));
  return null;
}

function concerneLeCompte(d: Donnee, ctx: ContexteActives): boolean {
  if (d.metiers) {
    const m = ctx.metier;
    if (!m?.metierPrecis) return false;
    const ok = d.metiers.some((cle) => {
      const [id, activite] = cle.split("/");
      return id === m.metierPrecis && (activite === undefined || m.sousVariantes.includes(activite));
    });
    if (!ok) return false;
  }
  if ("tailles" in d) return d.tailles[ctx.taille];
  return ctx.profils.some((p) => d.profils[p]);
}

const RE_DONNEE = /^(?:ACQ|FIN|RH|COM)-\d{2}\.\d{2}$/;

// Réponses que l'on déduit d'autres réponses (data/implications.json) : « oui » à « Avez-vous un site internet ? » quand le client a
// coché « site internet » parmi ses canaux. Une réponse déjà donnée (et active) l'emporte : rien n'est déduit.
export function reponsesDeduites(impl: EnsembleDonnees["implications"], reponses: Reponses): { reponses: Reponses; codes: Set<string> } {
  const deduites: Reponses = {};
  const codes = new Set<string>();
  for (const i of impl.implications) {
    if (reponses[i.donnee] !== undefined) continue;
    const source = reponses[i.siCoche.donnee];
    if (source?.genre === "saisie" && Array.isArray(source.valeur) && source.valeur.includes(i.siCoche.option)) {
      deduites[i.donnee] = { genre: "saisie", valeur: i.valeur };
      codes.add(i.donnee);
    }
  }
  return { reponses: deduites, codes };
}

export type Applicabilite = { actives: Reponses; inapplicables: Set<string> };

export function reponsesActives(e: EnsembleDonnees, reponses: Reponses, ctx: ContexteActives): Reponses {
  return analyserApplicabilite(e, reponses, ctx).actives;
}

// Réponses actives, et données qui ne s'appliquent pas à ce compte parmi celles qu'une condition lit ou qui ont une réponse.
export function analyserApplicabilite(e: EnsembleDonnees, reponses: Reponses, ctx: ContexteActives): Applicabilite {
  const regles = e.reglesAffichage;
  const donnees = new Map(e.donnees.map((d) => [d.code, d]));
  const themes = new Map(e.themes.map((t) => [t.code, t]));
  const retires = new Set(e.retraits.retraits.map((r) => r.donnee));
  const exclus = new Set(ctx.themesExclus ?? []);
  const sourceDe = (c: string) => cleDeDonnee(c)?.donnee ?? donneeDuDeclencheur(regles, c.split(".")[0]);

  // Une donnée s'applique-t-elle avec ces réponses ? Même règle que l'assemblage (assemblage.ts), le niveau en moins : une
  // réponse donnée en « approfondi » reste vraie en « essentiel » (le compte rendu ne lit de toute façon que les questions posées).
  const sApplique = (d: Donnee, lire: ReturnType<typeof lecteurDeclencheurs>): boolean => {
    if (retires.has(d.code) || (d.mode !== "demandee" && d.mode !== "partagee")) return true;
    if (!concerneLeCompte(d, ctx)) return false;
    const minimum = moisMinimumDExistence(d.periode);
    if (minimum !== null && ctx.ancienneteMois !== undefined && ctx.ancienneteMois < minimum) return false;
    const theme = themes.get(d.theme);
    if (!theme || exclus.has(theme.code)) return false;
    const condition = d.condition ? regles.conditions[d.condition] : undefined;
    const visible = condition ? evaluer(condition, lire) : true;
    if (visible === false || visible === null) return false;
    const masquage = theme.masquePour ? regles.masquages[theme.masquePour] : undefined;
    if (!masquage) return true;
    const masque = evaluer(masquage, lire);
    if (masque === false || masque === "a_preciser") return true;
    // Thème masqué (ou en attente) : seules restent la question qui décide du masquage et celles dont la condition propre est vraie.
    const decide = clesDeLaRegle(masquage).some((c) => sourceDe(c) === d.code);
    return decide || (masque === true && condition !== undefined && visible === true);
  };

  // Données dont une condition lit la réponse : leur applicabilité compte même sans réponse (A masquée → B qui la lit aussi).
  const lues = new Set<string>();
  for (const r of [...Object.values(regles.conditions), ...Object.values(regles.masquages)]) for (const c of clesDeLaRegle(r)) {
    const s = sourceDe(c);
    if (s) lues.add(s);
  }

  // Point fixe : écarter une réponse peut en rendre d'autres inapplicables (A → B → C).
  let actives: Reponses = { ...reponses };
  let inapplicables = new Set<string>();
  for (let tour = 0; tour < 10; tour++) {
    // Les réponses déduites comptent pour décider de l'affichage (COM-13.10 « oui » ouvre les questions sur le site) : une donnée
    // déduite n'est pas posée, mais sa valeur se lit.
    const deduites = reponsesDeduites(e.implications, actives);
    const vue = { ...actives, ...deduites.reponses };
    const lire = lecteurDeclencheurs(vue, ctx.taille, regles, new Set([...inapplicables].filter((c) => !deduites.codes.has(c))));
    const suivantes = new Set<string>();
    for (const code of new Set([...lues, ...Object.keys(reponses).filter((c) => RE_DONNEE.test(c))])) {
      const d = donnees.get(code);
      if (d && !sApplique(d, lire)) suivantes.add(code);
    }
    const stable = suivantes.size === inapplicables.size && [...suivantes].every((c) => inapplicables.has(c));
    inapplicables = suivantes;
    actives = Object.fromEntries(Object.entries(reponses).filter(([c]) => !inapplicables.has(c)));
    if (stable) break;
  }

  // Tableaux dont les lignes viennent d'une autre réponse : seules les cases des lignes actuelles comptent.
  const banque = new Map(e.banque.map((q) => [q.donnee, q]));
  for (const [cle, r] of Object.entries(actives)) {
    if (r?.genre !== "valeurs") continue;
    const spec = banque.get(cle)?.reponse;
    if (spec?.type !== "tableau") continue;
    const lignes = lignesActuelles(spec, actives, regles);
    if (lignes === null) continue;
    const etat = etatTableau(spec, r.valeurs, lignes);
    if (!etat.utilisable) delete actives[cle];
    else actives[cle] = { genre: "valeurs", valeurs: etat.valeurs } as Reponse;
  }
  // Une donnée déduite (COM-13.10 quand « site internet » est coché) se lit avec sa valeur déduite.
  const deduites = reponsesDeduites(e.implications, actives).codes;
  return { actives, inapplicables: new Set([...inapplicables].filter((c) => !deduites.has(c))) };
}

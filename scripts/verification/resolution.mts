// Résolution des règles d'affichage pour la vérification : lecture d'une règle en français, réponses qui la rendent vraie ou
// fausse, et « témoin » (un compte et des réponses qui font apparaître une question), par le vrai code d'assemblage.
// Utilisé par inventaire.mts et plan-dependances.mts.

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../../src/lib/donnees/disque.ts";
import { assemblerQuestionnaire, type QuestionAssemblee } from "../../src/lib/audit/assemblage.ts";
import { clesDeLaRegle, cleDeDonnee, evaluer, lecteurDeclencheurs, donneeDuDeclencheur, TAILLES_D02, type TailleId, type Valeur } from "../../src/lib/audit/affichage.ts";
import type { ReponseSpec } from "../../src/lib/donnees/reponse-spec.ts";
import { PROFILS, type CodeAgent, type Donnee, type ProfilId, type Regle } from "../../src/lib/donnees/schemas.ts";
import type { Reponse, Reponses } from "../../src/lib/audit/reponse.ts";

export const racine = fileURLToPath(new URL("../..", import.meta.url));
export const e = chargerDepuisDisque(join(racine, "data"));

export const regles = e.reglesAffichage;
export const banque = new Map(e.banque.map((q) => [q.donnee, q]));
export const themeDe = new Map(e.themes.map((t) => [t.code, t]));
export const donneeDe = new Map(e.donnees.map((d) => [d.code, d]));
export const retires = new Set(e.retraits.retraits.map((r) => r.donnee));
export const NOM_AGENT: Record<CodeAgent, string> = { ACQUISITION_CA: "Acquisition et CA", FINANCE_RENTABILITE: "Finance et rentabilité", RH_ORGANISATION: "RH et organisation", COMM_CREATION: "Comm et contenu" };

// --- Lecture d'une règle en français ---------------------------------------------------------------------------------

export function libelleOption(cle: string, id: string): string {
  const code = cle.split(".")[0];
  const forme = regles.declencheurs[code];
  const donnee = cleDeDonnee(cle)?.donnee ?? (forme?.type === "reponse_donnee" ? forme.donnee : null);
  const spec = donnee ? banque.get(donnee)?.reponse : undefined;
  const opts = spec && (spec.type === "cases" || spec.type === "choix") ? spec.options : forme && (forme.type === "cases" || forme.type === "choix") ? forme.options : [];
  return opts.find((o) => o.id === id)?.libelle ?? id;
}
export function nomCle(cle: string): string {
  if (cle === "D02") return "taille (D02)";
  if (cle === "D30") return "D30 (première création de contenu, hors audit)";
  const d = cleDeDonnee(cle);
  if (d) return d.chemin ? `${d.donnee} [${d.chemin}]` : d.donnee;
  const [code, sous] = cle.split(".");
  const source = donneeDuDeclencheur(regles, code);
  if (source) return `${source} (${code})`;
  return sous ? `${code}.${sous} (cadrage)` : `${code} (cadrage)`;
}
export function lireRegle(r: Regle): string {
  if ("aPreciser" in r) return `règle à préciser (${r.aPreciser})`;
  if ("toujours" in r) return "toujours";
  if ("tous" in r) return r.tous.map(lireRegle).join(" ET ");
  if ("un" in r) return `(${r.un.map(lireRegle).join(" OU ")})`;
  const v = r.valeur;
  const val = Array.isArray(v) ? v.map((x) => `« ${libelleOption(r.cle, String(x))} »`).join(", ") : typeof v === "string" ? `« ${libelleOption(r.cle, v)} »` : String(v);
  const op: Record<string, string> = { egal: "=", different: "≠", contient: "contient", ne_contient_pas: "ne contient pas", non_vide: "répondue", vide: "sans réponse", plus_de: ">", dans: "parmi", moins_de: "moins de N choix" };
  return `${nomCle(r.cle)} ${op[r.op] ?? r.op}${r.op === "non_vide" || r.op === "vide" ? "" : ` ${val}`}`;
}

// --- Résolution d'une règle : réponses qui la rendent vraie (ou fausse) --------------------------------------------

export type Ctx = { reponses: Reponses; taille: TailleId };
export function specDeCle(cle: string): ReponseSpec | undefined {
  const d = cleDeDonnee(cle);
  const code = d?.donnee ?? donneeDuDeclencheur(regles, cle.split(".")[0]);
  return code ? banque.get(code)?.reponse ?? undefined : undefined;
}
export function optionsDe(cle: string): string[] {
  const spec = specDeCle(cle);
  if (spec?.type === "cases" || spec?.type === "choix") return spec.options.map((o) => o.id);
  if (spec?.type === "oui_non") return ["oui", "non"];
  const forme = regles.declencheurs[cle.split(".")[0]];
  if (forme?.type === "cases" || forme?.type === "choix") return forme.options.map((o) => o.id);
  return ["oui", "non"];
}
export function estMultiple(cle: string): boolean {
  const spec = specDeCle(cle);
  const forme = regles.declencheurs[cle.split(".")[0]];
  return spec?.type === "cases" || (!spec && forme?.type === "cases");
}
// Écrit une valeur de déclencheur sous la forme que l'écran enregistre.
// Une réponse donnée à une question ne compte que si cette question s'applique elle-même (réponses actives) : on résout aussi
// sa condition et on lève le masquage de son thème (chaînes A → B → C).
const enCours = new Set<string>();
function rendreApplicable(ctx: Ctx, code: string): void {
  const d = donneeDe.get(code);
  if (!d || enCours.has(code)) return;
  enCours.add(code);
  try {
    const condition = d.condition ? regles.conditions[d.condition] : undefined;
    if (condition) resoudre(condition, ctx, true);
    const theme = themeDe.get(d.theme);
    const masquage = theme?.masquePour ? regles.masquages[theme.masquePour] : undefined;
    const decide = masquage ? clesDeLaRegle(masquage).some((c) => (cleDeDonnee(c)?.donnee ?? donneeDuDeclencheur(regles, c.split(".")[0])) === code) : false;
    if (masquage && !decide && !condition) resoudre(masquage, ctx, false);
  } finally {
    enCours.delete(code);
  }
}

export function poser(ctx: Ctx, cle: string, v: Valeur): void {
  poserBrut(ctx, cle, v);
  const code = cleDeDonnee(cle)?.donnee ?? donneeDuDeclencheur(regles, cle.split(".")[0]);
  if (code) rendreApplicable(ctx, code);
}

function poserBrut(ctx: Ctx, cle: string, v: Valeur): void {
  if (cle === "D02") {
    if (typeof v === "string" && (TAILLES_D02 as readonly string[]).includes(v)) ctx.taille = v as TailleId;
    return;
  }
  const d = cleDeDonnee(cle);
  const code = d?.donnee ?? donneeDuDeclencheur(regles, cle.split(".")[0]);
  if (code && !(d?.chemin)) {
    const spec = banque.get(code)?.reponse;
    if (spec?.type === "nombre") ctx.reponses[code] = { genre: "exact", valeur: Number(v) };
    else ctx.reponses[code] = { genre: "saisie", valeur: v as string | string[] } as Reponse;
    return;
  }
  if (code && d?.chemin) {
    const avant = ctx.reponses[code];
    const valeurs = avant?.genre === "valeurs" ? { ...avant.valeurs } : {};
    valeurs[d.chemin] = typeof v === "number" ? v : (v as string);
    ctx.reponses[code] = { genre: "valeurs", valeurs } as Reponse;
    return;
  }
  ctx.reponses[cle] = { genre: "saisie", valeur: v as string | string[] } as Reponse;
}
export function lu(ctx: Ctx, cle: string): Valeur | undefined {
  return lecteurDeclencheurs(ctx.reponses, ctx.taille, regles)(cle);
}
export function resoudre(r: Regle, ctx: Ctx, voulu: boolean): boolean {
  if ("aPreciser" in r) return true;
  if ("toujours" in r) return voulu;
  const vrai = () => evaluer(r, (c) => lu(ctx, c)) === voulu;
  if ("tous" in r) {
    if (voulu) for (const s of r.tous) resoudre(s, ctx, true);
    else resoudre(r.tous[0], ctx, false);
    return vrai();
  }
  if ("un" in r) {
    if (voulu) {
      for (const s of r.un) {
        const copie: Ctx = { reponses: { ...ctx.reponses }, taille: ctx.taille };
        if (resoudre(s, copie, true)) {
          Object.assign(ctx, copie);
          return vrai();
        }
      }
      return false;
    }
    for (const s of r.un) resoudre(s, ctx, false);
    return vrai();
  }
  const { cle, op, valeur } = r;
  if (cle === "D30") return vrai();
  const options = optionsDe(cle);
  const autre = (x: unknown) => options.find((o) => o !== x) ?? "autre";
  const multiple = estMultiple(cle);
  const actuel = lu(ctx, cle);
  const liste = Array.isArray(actuel) ? actuel : [];
  if (cle === "D02") {
    const t = TAILLES_D02 as readonly string[];
    const ok = (x: string) => { ctx.taille = x as TailleId; return evaluer(r, (c) => lu(ctx, c)) === voulu; };
    // La taille du compte d'abord : on ne la change que si elle ne convient pas.
    for (const x of [ctx.taille, ...t.filter((y) => y !== ctx.taille)]) if (ok(x)) return true;
    return false;
  }
  const veut = voulu ? op : ({ egal: "different", different: "egal", contient: "ne_contient_pas", ne_contient_pas: "contient", non_vide: "vide", vide: "non_vide", plus_de: "pas_plus", dans: "hors", moins_de: "pas_moins" } as Record<string, string>)[op];
  switch (veut) {
    case "egal": poser(ctx, cle, multiple ? [String(valeur)] : (valeur as Valeur)); break;
    case "different": poser(ctx, cle, multiple ? [autre(valeur)] : (typeof valeur === "number" ? valeur + 1 : autre(valeur))); break;
    case "contient": poser(ctx, cle, multiple ? [...new Set([...liste, String(valeur)])] : String(valeur)); break;
    case "ne_contient_pas": poser(ctx, cle, multiple ? (liste.filter((x) => x !== valeur).length ? liste.filter((x) => x !== valeur) : [autre(valeur)]) : autre(valeur)); break;
    // Non vide : un choix, ou pour une case de tableau ou un champ sans choix (« poste de la personne clé »), un texte.
    case "non_vide": poser(ctx, cle, multiple ? [options[0]] : options[0] ?? (specDeCle(cle)?.type === "nombre" ? 1 : "Responsable d'atelier")); break;
    case "vide": {
      const dn = cleDeDonnee(cle);
      if (dn?.chemin) {
        const r = ctx.reponses[dn.donnee];
        if (r?.genre === "valeurs") {
          const valeurs = { ...r.valeurs };
          delete valeurs[dn.chemin];
          if (Object.keys(valeurs).length) ctx.reponses[dn.donnee] = { genre: "valeurs", valeurs } as Reponse;
          else delete ctx.reponses[dn.donnee];
        }
      } else if (multiple) poser(ctx, cle, []);
      else delete ctx.reponses[dn?.donnee ?? cle];
      break;
    }
    case "plus_de": poser(ctx, cle, Number(valeur) + 1); break;
    case "pas_plus": poser(ctx, cle, Number(valeur)); break;
    case "dans": poser(ctx, cle, Array.isArray(valeur) ? String(valeur[0]) : String(valeur)); break;
    case "hors": poser(ctx, cle, options.find((o) => !(valeur as string[]).includes(o)) ?? "autre"); break;
    // Moins de N choix : le plus de choix possible sous N (une case au moins, si la question en exige une).
    case "moins_de": poser(ctx, cle, options.slice(0, Math.max(1, Number(valeur) - 1))); break;
    case "pas_moins": poser(ctx, cle, options.slice(0, Number(valeur))); break;
  }
  return vrai();
}

// --- Témoin : un compte et des réponses qui font apparaître la question ------------------------------------------------

export type Temoin = { profil: ProfilId; taille: TailleId; metier: string | null; reponses: Reponses; ou: "questionnaire" | "prealable"; texte: string | null };
const metiersDe = (d: Donnee) => d.metiers ?? [null];
export function chercherTemoin(d: Donnee): { temoin: Temoin | null; raison: string | null } {
  const theme = themeDe.get(d.theme)!;
  const condition = d.condition ? regles.conditions[d.condition] : undefined;
  const masquage = theme.masquePour ? regles.masquages[theme.masquePour] : undefined;
  if (condition && clesDeLaRegle(condition).includes("D30")) {
    const c: Ctx = { reponses: {}, taille: "equipe_2_5" };
    if (!resoudre(condition, c, true)) return { temoin: null, raison: "condition sur D30 (« avant la première création de contenu ») : posée à la première création de contenu, jamais pendant l'audit" };
  }
  const profils: ProfilId[] = "tailles" in d ? [...PROFILS] : PROFILS.filter((p) => d.profils[p]);
  if (profils.length === 0) return { temoin: null, raison: "aucun profil coché dans le classeur" };
  const tailles: TailleId[] = "tailles" in d ? TAILLES_D02.filter((t) => d.tailles[t]) : [...TAILLES_D02];
  if (tailles.length === 0) return { temoin: null, raison: "aucune taille cochée dans le classeur" };
  let derniere = "jamais assemblée";
  for (const metierCle of metiersDe(d)) {
    const [metierPrecis, activite] = metierCle ? metierCle.split("/") : [null, undefined];
    const metier = metierPrecis ? { metierPrecis, sousVariantes: activite ? [activite] : [] } : null;
    for (const profil of profils) {
      for (const taille0 of tailles) {
        const ctx: Ctx = { reponses: {}, taille: taille0 };
        if (masquage) resoudre(masquage, ctx, false);
        if (condition && !resoudre(condition, ctx, true)) { derniere = "condition impossible à satisfaire"; continue; }
        if ("tailles" in d && !d.tailles[ctx.taille]) continue;
        const a = assemblerQuestionnaire(e, {
          agent: theme.agent, profils: [profil], taille: ctx.taille, niveau: "approfondi", ancienneteMois: 240,
          exclusions: null, vocabulaire: null, metier: metier as never, reponses: ctx.reponses,
        });
        const trouve = (q: QuestionAssemblee) => q.code === d.code;
        const dansTheme = a.themes.flatMap((t) => t.questions).find(trouve);
        if (dansTheme) return { temoin: { profil, taille: ctx.taille, metier: metierCle, reponses: ctx.reponses, ou: "questionnaire", texte: dansTheme.texte }, raison: null };
        derniere = a.themesMasques.some((t) => t.code === d.theme) ? "thème masqué" : "absente de l'assemblage";
      }
    }
  }
  return { temoin: null, raison: derniere };
}


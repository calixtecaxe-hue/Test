// Audit final des questions (29 octobre) : contrôles automatiques de clarté, de suffisance des données et de conditions de
// pertinence, question par question. Chaque contrôle produit des candidats ; chacun est ensuite relu à la main
// (docs/audit-final/relecture.txt) : un candidat n'est pas une anomalie tant qu'il n'a pas été relu.
//
//   node scripts/verification/audit-final-controles.mts      → docs/audit-final/controles-auto.json
//
// Contrôles :
//   - posée au dirigeant seul alors que le texte parle d'une équipe (par le vrai code d'assemblage, à la taille « seul ») ;
//   - canal, outil, relance, financement ou stock évoqué sans condition qui le lise ;
//   - unité incohérente avec le texte (montant, heures, part, jours) ;
//   - zéro impossible à saisir, tranches qui se chevauchent ou laissent un trou, pas de choix « aucun » pour un « combien » ;
//   - plusieurs questions dans un texte, texte long, terme technique sans aide, montant sans HT / TTC ;
//   - comparaison avec le passé sans évolution calculée ni raison écrite ;
//   - textes très proches entre deux questions qui ne sont pas déclarées partagées.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assemblerQuestionnaire } from "../../src/lib/audit/assemblage.ts";
import { clesDeLaRegle, TAILLES_D02, type TailleId } from "../../src/lib/audit/affichage.ts";
import { PROFILS, type Donnee, type ProfilId } from "../../src/lib/donnees/schemas.ts";
import type { ReponseSpec } from "../../src/lib/donnees/reponse-spec.ts";
import { banque, donneeDe, e, lireRegle, racine, regles, resoudre, retires, themeDe, type Ctx } from "./resolution.mts";

const SORTIE = join(racine, "docs", "audit-final");
mkdirSync(SORTIE, { recursive: true });

type Candidat = { code: string; controle: string; detail: string };
const candidats: Candidat[] = [];
const noter = (code: string, controle: string, detail: string) => candidats.push({ code, controle, detail });

const sansAccents = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const questions = [...banque.values()].filter((q) => donneeDe.has(q.donnee) && !retires.has(q.donnee));
const texteComplet = (q: { texte: string; aide: string | null }) => `${q.texte} ${q.aide ?? ""}`;

// --- Taille : la question est-elle posable au dirigeant seul ? -------------------------------------------------------------
function posableA(d: Donnee, taille: TailleId): boolean {
  const theme = themeDe.get(d.theme)!;
  const condition = d.condition ? regles.conditions[d.condition] : undefined;
  const masquage = theme.masquePour ? regles.masquages[theme.masquePour] : undefined;
  if ("tailles" in d && !d.tailles[taille]) return false;
  const profils: ProfilId[] = "tailles" in d ? [...PROFILS] : PROFILS.filter((p) => d.profils[p]);
  for (const metierCle of d.metiers ?? [null]) {
    const [metierPrecis, activite] = metierCle ? metierCle.split("/") : [null, undefined];
    const metier = metierPrecis ? { metierPrecis, sousVariantes: activite ? [activite] : [] } : null;
    for (const profil of profils) {
      const ctx: Ctx = { reponses: {}, taille };
      if (masquage) resoudre(masquage, ctx, false);
      if (condition && !resoudre(condition, ctx, true)) continue;
      if (ctx.taille !== taille) continue;
      const a = assemblerQuestionnaire(e, { agent: theme.agent, profils: [profil], taille, niveau: "approfondi", ancienneteMois: 240, exclusions: null, vocabulaire: null, metier: metier as never, reponses: ctx.reponses });
      if ([...a.prealables, ...a.themes.flatMap((t) => t.questions)].some((q) => q.code === d.code)) return true;
    }
  }
  return false;
}

const conditionDe = (d: Donnee): string => {
  const parts: string[] = [];
  if (d.condition) parts.push(`condition : ${lireRegle(regles.conditions[d.condition])}`);
  const t = themeDe.get(d.theme)!;
  if (t.masquePour) parts.push(`thème masqué si ${t.masquePour}`);
  return parts.join(" ; ");
};
const clesConditions = (d: Donnee): string[] => {
  const cles: string[] = [];
  if (d.condition) cles.push(...clesDeLaRegle(regles.conditions[d.condition]));
  const t = themeDe.get(d.theme)!;
  if (t.masquePour) cles.push(...clesDeLaRegle(regles.masquages[t.masquePour]));
  return cles;
};

// --- Familles de mots ------------------------------------------------------------------------------------------------------
const EQUIPE = /\b(equipe|salarie|salaries|collaborateur|collaborateurs|employe|employes|recrue|recrues|vos managers?|entretiens? individuels?|chaque personne|vos personnes)\b/;
const FAMILLES: [string, RegExp][] = [
  ["canal ou outil", /\b(site internet|votre site|fiche google|google ads|annonces google|newsletter|e-?mailing|vos e-?mails|sms|instagram|facebook|linkedin|tiktok|youtube|pinterest|plateforme|logiciel|crm|caisse enregistreuse|boutique en ligne|panier|application)\b/],
  ["relance", /\b(relanc\w*|rappel\w*)\b/],
  ["financement", /\b(banque|banquier|pret|prets|credit|credits|emprunt\w*|financement|decouvert|leasing|affacturage)\b/],
  ["stock", /\bstock\w*\b/],
  ["recrutement", /\b(recrut\w*|candidat\w*|offre d'emploi)\b/],
];
const TERMES = [/taux de conversion/, /\bmarge\b/, /panier moyen/, /\bportee\b/, /taux d'engagement/, /tresorerie/, /\bbfr\b|besoin en fonds de roulement/, /seuil de rentabilite/, /charges fixes/, /charges variables/, /masse salariale/, /\bturnover\b/, /\bfunnel\b/, /\bseo\b/, /\bsea\b/, /taux de clic/, /taux d'ouverture/, /\bencours\b/, /amortissement/, /affacturage/, /\bleasing\b/, /\bkpi\b/, /coefficient/, /\bebe\b|excedent brut/];

// --- Tranches dans les choix -----------------------------------------------------------------------------------------------
type Tranche = { min: number; max: number; libelle: string };
function tranche(l: string): Tranche | null {
  const s = sansAccents(l).replace(/ /g, " ").replace(/(\d) (\d{3})/g, "$1$2");
  let m = s.match(/^(?:de |entre )?(\d+(?:[.,]\d+)?) ?(?:a|-|et) ?(\d+(?:[.,]\d+)?)/);
  if (m) return { min: Number(m[1].replace(",", ".")), max: Number(m[2].replace(",", ".")), libelle: l };
  m = s.match(/^(?:moins de|jusqu'a|au plus|0 a) ?(\d+(?:[.,]\d+)?)/);
  if (m) return { min: 0, max: Number(m[1].replace(",", ".")) - (s.startsWith("moins") ? 1e-9 : 0), libelle: l };
  m = s.match(/^(?:plus de|au moins|au-dela de) ?(\d+(?:[.,]\d+)?)/);
  if (m) return { min: Number(m[1].replace(",", ".")) + (s.startsWith("plus") || s.startsWith("au-dela") ? 1e-9 : 0), max: Infinity, libelle: l };
  m = s.match(/^(\d+(?:[.,]\d+)?) ?(?:\+|ou plus|et plus)/);
  if (m) return { min: Number(m[1].replace(",", ".")), max: Infinity, libelle: l };
  return null;
}
function controlerTranches(code: string, options: { libelle: string }[], combien: boolean) {
  const ts = options.map((o) => tranche(o.libelle)).filter((t): t is Tranche => t !== null);
  if (ts.length < 2) return;
  const tri = [...ts].sort((a, b) => a.min - b.min);
  for (let i = 1; i < tri.length; i++) {
    const a = tri[i - 1], b = tri[i];
    if (b.min < a.max - 1e-6 && a.max !== Infinity) noter(code, "tranches qui se chevauchent", `« ${a.libelle} » et « ${b.libelle} »`);
    // Trou : entiers seulement (une tranche « 3 à 5 » suivie de « 7 à 10 » laisse 6) ; pas de trou entre « moins de 5 » et « 5 à 10 ».
    if (Number.isInteger(a.max) && Number.isInteger(b.min) && b.min > a.max + 1) noter(code, "tranches avec un trou", `entre « ${a.libelle} » et « ${b.libelle} »`);
  }
  const zero = options.some((o) => /^(0|aucun|aucune|jamais|non|rien|pas de|zero)\b/i.test(sansAccents(o.libelle)) || /\b0\b/.test(o.libelle.split(" ")[0]));
  if (combien && tri[0].min > 0 && !zero) noter(code, "zéro impossible à choisir", `première tranche « ${tri[0].libelle} », pas de choix « aucun » ou « 0 »`);
}

// --- Unité attendue d'après le texte ---------------------------------------------------------------------------------------
function uniteAttendue(t: string): string | null {
  if (/\b(combien (vous )?(coute|coutent|depensez|payez|gagnez|facturez)|montant|chiffre d'affaires|budget|en euros|\beuros?\b|€)/.test(t)) return "euros";
  if (/\b(combien d'heures|heures par)/.test(t)) return "heures";
  if (/\b(quelle part|quel pourcentage|en %|taux)\b/.test(t)) return "pourcent";
  if (/\bcombien de jours\b/.test(t)) return "jours";
  return null;
}
const ACCEPTE: Record<string, string[]> = { euros: ["euros", "euros_par_heure"], heures: ["heures"], pourcent: ["pourcent", "points"], jours: ["jours"] };

// --- Parcours de chaque question -------------------------------------------------------------------------------------------
const posablesSeul: string[] = [];
for (const q of questions) {
  const d = donneeDe.get(q.donnee)!;
  const t = sansAccents(texteComplet(q as { texte: string; aide: string | null }));
  const texte = sansAccents(q.texte);
  const spec = q.reponse as ReponseSpec | null;
  const cond = conditionDe(d);
  const cles = clesConditions(d);

  // 1. Équipe posée au dirigeant seul.
  if (EQUIPE.test(texte)) {
    const seul = posableA(d, "seul");
    if (seul) {
      posablesSeul.push(d.code);
      noter(d.code, "équipe : posée au dirigeant seul", cond || "sans condition");
    }
  }
  // 2. Familles qui supposent une chose que le dirigeant peut ne pas avoir.
  for (const [famille, re] of FAMILLES) {
    if (!re.test(texte)) continue;
    noter(d.code, `${famille} : condition à vérifier`, cond || "sans condition ni masquage");
  }
  // 3. Unité et texte.
  const champs: { libelle: string; spec: ReponseSpec }[] = [];
  if (spec?.type === "nombre") champs.push({ libelle: q.texte, spec });
  if (spec?.type === "composite") for (const c of spec.champs) champs.push({ libelle: c.libelle, spec: c.spec as ReponseSpec });
  if (spec?.type === "tableau") for (const c of spec.colonnes) champs.push({ libelle: c.libelle, spec: c.spec as ReponseSpec });
  for (const c of champs) {
    if (c.spec.type !== "nombre") continue;
    const attendue = uniteAttendue(sansAccents(c.libelle)) ?? (champs.length === 1 ? uniteAttendue(texte) : null);
    if (attendue && !ACCEPTE[attendue].includes(c.spec.unite)) noter(d.code, "unité différente du texte", `« ${c.libelle} » : unité ${c.spec.unite}, le texte parle de ${attendue}`);
    if (c.spec.min !== undefined && c.spec.min > 0) noter(d.code, "zéro impossible à saisir", `« ${c.libelle} » : minimum ${c.spec.min}`);
    if (c.spec.unite === "euros" && !/\b(ht|ttc|hors taxes|toutes taxes)\b/.test(t)) noter(d.code, "montant sans HT ni TTC", `« ${c.libelle} »`);
  }
  // 4. Choix : tranches et zéro.
  if (spec?.type === "choix" || spec?.type === "cases") controlerTranches(d.code, spec.options, /\bcombien\b/.test(texte));
  if (spec?.type === "composite") for (const c of spec.champs) if (c.spec.type === "choix") controlerTranches(d.code, c.spec.options, /\bcombien\b/.test(sansAccents(c.libelle)) || /\bcombien\b/.test(texte));
  // 5. Clarté du texte.
  // Plusieurs demandes dans un texte qui n'a qu'un champ de réponse (un tableau ou plusieurs champs y répondent séparément).
  const unSeulChamp = spec !== null && spec.type !== "composite" && spec.type !== "tableau";
  const nbQ = (q.texte.match(/\?/g) ?? []).length;
  if (nbQ > 1 && unSeulChamp) noter(d.code, "plusieurs questions pour un seul champ", q.texte);
  if (q.texte.length > 170) noter(d.code, "texte long", `${q.texte.length} caractères`);
  if (unSeulChamp && / et (combien|quel|quelle|quels|quelles|comment|pourquoi|ou|quand|qui)\b/.test(texte)) noter(d.code, "question double pour un seul champ", q.texte);
  for (const re of TERMES) if (re.test(texte) && !q.aide) noter(d.code, "terme technique sans aide", re.source);
  // 6. Comparaison avec le passé.
  if (/\b(il y a \d+ mois|un an plus tot|plus tot|par rapport a|evolution|progresse|augmente|diminue)\b/.test(texte)) noter(d.code, "comparaison avec le passé : évolution à vérifier", "");
  void cles;
}

// --- Doublons possibles : textes très proches, non déclarés partagés ---------------------------------------------------------
const mots = (s: string) => new Set(sansAccents(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((m) => m.length > 3 && !["votre", "vous", "avez", "sont", "dans", "derniers", "combien", "quelle", "quel", "quels", "quelles", "pour", "chaque", "mois", "avec", "cette", "elle", "elles", "leur", "leurs", "plus", "moins", "entre", "comment"].includes(m)));
const partagees = new Set<string>();
for (const d of e.donnees) if (d.mode === "partagee") partagees.add(d.code);
const liste = questions.map((q) => ({ code: q.donnee, m: mots(q.texte) }));
for (let i = 0; i < liste.length; i++) {
  for (let j = i + 1; j < liste.length; j++) {
    const a = liste[i], b = liste[j];
    const inter = [...a.m].filter((x) => b.m.has(x)).length;
    const union = new Set([...a.m, ...b.m]).size;
    if (union > 0 && inter / union >= 0.6 && inter >= 4) noter(a.code, "texte très proche d'une autre question", `${b.code} (${Math.round((inter / union) * 100)} % de mots communs)`);
  }
}

// --- Évolutions : chaque donnée « Évolution… » est calculée ou listée (contrôle des données) ; ici, les croisements qui parlent
// d'évolution sans donnée passée parmi leurs entrées.
const passees = new Set<string>();
for (const ev of e.evolutions.evolutions) for (const s of JSON.stringify(ev).match(/[A-Z]{2,3}-\d{2}\.\d{2}/g) ?? []) passees.add(s);
for (const x of e.croisements) {
  const t = sansAccents(`${x.nom ?? ""} ${x.calcul ?? ""}`);
  if (!/\b(evolution|tendance|progression|croissance|il y a|plus tot|precedent)\b/.test(t)) continue;
  const passe = x.entrees.some((c) => /(il y a|plus tot|precedent|annee derniere)/.test(sansAccents(donneeDe.get(c)?.libelle ?? "")));
  if (!passe) noter(x.code, "croisement d'évolution sans donnée passée parmi ses entrées", x.calcul.slice(0, 160));
}

const parControle = new Map<string, number>();
for (const c of candidats) parControle.set(c.controle, (parControle.get(c.controle) ?? 0) + 1);
writeFileSync(join(SORTIE, "controles-auto.json"), JSON.stringify({ genereLe: new Date().toISOString(), questions: questions.length, parControle: Object.fromEntries(parControle), candidats }, null, 2) + "\n");
console.log(`${questions.length} questions contrôlées, ${candidats.length} candidats :`);
for (const [k, v] of [...parControle].sort((a, b) => b[1] - a[1])) console.log(`  ${v.toString().padStart(4)}  ${k}`);
void TAILLES_D02;

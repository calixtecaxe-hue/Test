// Spécification de la réponse attendue à une question : ce que le dirigeant peut saisir
// (un nombre, un choix, des cases, plusieurs valeurs, un tableau…), avec ses options,
// ses unités et ses bornes. Elle est écrite dans la banque de questions, validée côté
// serveur, et lue par le moteur : un chiffre n'entre dans un calcul que s'il a été saisi
// selon sa spécification.
//
// Le classeur décrit déjà le format de chaque donnée (« Nombre », « Tranches : 0-2 · 3-5… »,
// « Nombre et € »). `proposerSpec` en tire la spécification quand elle se déduit sans
// ambiguïté ; pour les autres (« Choix » sans liste d'options, tableaux), la banque la
// définit : rien n'est inventé.
//
// Ce fichier n'importe que zod : il se teste directement avec Node.

import { z } from "zod";

export const UNITES = ["nombre", "euros", "pourcent", "jours", "heures", "semaines", "mois", "annees", "km", "euros_par_heure", "points"] as const;
export type Unite = (typeof UNITES)[number];

export const LIBELLE_UNITE: Record<Unite, string> = {
  nombre: "",
  euros: "€",
  pourcent: "%",
  jours: "jours",
  heures: "heures",
  semaines: "semaines",
  mois: "mois",
  annees: "ans",
  km: "km",
  euros_par_heure: "€ / heure",
  points: "points",
};

const identifiant = z.string().regex(/^[a-z0-9_]{1,40}$/, "Identifiant en minuscules, chiffres et _ (40 caractères au plus).");
const option = z.object({ id: identifiant, libelle: z.string().min(1).max(120) });

const nombre = z.object({
  type: z.literal("nombre"),
  unite: z.enum(UNITES),
  min: z.number().optional(),
  max: z.number().optional(),
});
const ouiNon = z.object({ type: z.literal("oui_non") });
const choix = z.object({ type: z.literal("choix"), options: z.array(option).min(2).max(20) });
const texte = z.object({ type: z.literal("texte"), max: z.number().int().positive().max(2000).optional() });
const dateMois = z.object({ type: z.literal("date_mois") });

// Un champ isolé (réponse simple) ou une colonne / un champ d'une réponse composée.
const champSimple = z.discriminatedUnion("type", [nombre, ouiNon, choix, texte, dateMois]);
export type ChampSimple = z.infer<typeof champSimple>;

const champNomme = z.object({ id: identifiant, libelle: z.string().min(1).max(120), spec: champSimple });
export type ChampNomme = z.infer<typeof champNomme>;

const cases = z.object({
  type: z.literal("cases"),
  options: z.array(option).min(2).max(30),
  minChoix: z.number().int().min(0).optional(),
  maxChoix: z.number().int().positive().optional(),
});

// Une liste libre que le dirigeant écrit lui-même (ses types de clients, ses produits…).
// D'autres questions peuvent s'en servir pour nommer leurs lignes (lignes « donnee »).
const liste = z.object({
  type: z.literal("liste"),
  max: z.number().int().positive().max(20),
  min: z.number().int().min(0).optional(),
});

// Plusieurs valeurs de natures différentes (« Nombre et € », « 3 nombres »).
const composite = z.object({ type: z.literal("composite"), champs: z.array(champNomme).min(2).max(12) });

// Un tableau : des lignes (connues d'avance, tirées d'une question de cadrage, ou libres)
// et des colonnes. `total` impose une somme (ex. une répartition à 100 %).
const lignes = z.discriminatedUnion("source", [
  z.object({ source: z.literal("fixe"), items: z.array(option).min(1).max(30) }),
  // Les lignes sont les options cochées à une question de cadrage (D03 canaux, D22 réseaux…).
  z.object({ source: z.literal("declencheur"), cle: z.string().regex(/^D\d{2}$/) }),
  // Le dirigeant ajoute ses propres lignes, avec un nom.
  z.object({ source: z.literal("libre"), max: z.number().int().positive().max(30) }),
  // Les lignes sont les éléments de la liste écrite en réponse à une autre question (type « liste »).
  z.object({ source: z.literal("donnee"), code: z.string().regex(/^(ACQ|FIN|RH|COM)-\d{2}\.\d{2}$/) }),
]);
const tableau = z.object({
  type: z.literal("tableau"),
  lignes,
  colonnes: z.array(champNomme).min(1).max(8),
  total: z.object({ colonne: identifiant, valeur: z.number() }).optional(),
});

export const reponseSpec = z.discriminatedUnion("type", [nombre, ouiNon, choix, texte, dateMois, cases, liste, composite, tableau]).superRefine((s, ctx) => {
  const ids = s.type === "composite" ? s.champs.map((c) => c.id) : s.type === "tableau" ? s.colonnes.map((c) => c.id) : [];
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Deux champs ont le même identifiant." });
  if (s.type === "tableau" && s.total && !s.colonnes.some((c) => c.id === s.total!.colonne && c.spec.type === "nombre")) {
    ctx.addIssue({ code: "custom", message: "Le total porte sur une colonne numérique qui n'existe pas." });
  }
  if (s.type === "cases" && s.minChoix !== undefined && s.maxChoix !== undefined && s.minChoix > s.maxChoix) {
    ctx.addIssue({ code: "custom", message: "minChoix dépasse maxChoix." });
  }
  const optionsDoubles = (o: { id: string }[]) => new Set(o.map((x) => x.id)).size !== o.length;
  if ((s.type === "choix" || s.type === "cases") && optionsDoubles(s.options)) ctx.addIssue({ code: "custom", message: "Deux options ont le même identifiant." });
});
export type ReponseSpec = z.infer<typeof reponseSpec>;

// --- Valeurs saisies --------------------------------------------------------------------

// Réponse structurée : « ligne.colonne » → valeur (tableau), « champ » → valeur (composite).
export type ValeursStructurees = Record<string, number | string | boolean | string[] | null>;

export type Verdict = { ok: true } | { ok: false; message: string };
const ok: Verdict = { ok: true };
const non = (message: string): Verdict => ({ ok: false, message });

function nombreDansBornes(v: unknown, s: z.infer<typeof nombre>): Verdict {
  if (typeof v !== "number" || !Number.isFinite(v)) return non("Entrez un nombre.");
  if (s.min !== undefined && v < s.min) return non(`La valeur ne peut pas être inférieure à ${s.min}.`);
  if (s.max !== undefined && v > s.max) return non(`La valeur ne peut pas dépasser ${s.max}.`);
  return ok;
}

// Valeur d'un champ simple, hors réponse de type « je ne sais pas ».
export function validerChampSimple(spec: ChampSimple, v: unknown): Verdict {
  switch (spec.type) {
    case "nombre":
      return nombreDansBornes(v, spec);
    case "oui_non":
      return v === "oui" || v === "non" ? ok : non("Répondez par oui ou par non.");
    case "choix":
      return typeof v === "string" && spec.options.some((o) => o.id === v) ? ok : non("Choix non reconnu.");
    case "texte":
      return typeof v === "string" && v.length <= (spec.max ?? 2000) ? ok : non("Texte trop long.");
    case "date_mois": {
      if (typeof v !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) return non("Indiquez un mois et une année.");
      return Number(v.slice(0, 4)) >= 1900 && v <= new Date().toISOString().slice(0, 7) ? ok : non("Ce mois n'est pas possible.");
    }
  }
}

export type ReponseAValider =
  | { genre: "exact"; valeur: number }
  | { genre: "estimation"; min: number; max: number }
  | { genre: "inconnu" }
  | { genre: "non_suivi" }
  | { genre: "saisie"; valeur: string | boolean | string[] }
  | { genre: "valeurs"; valeurs: ValeursStructurees };

export type ContexteLignes = {
  // Options cochées à une question de cadrage (D03, D22…), dans l'ordre.
  lignesDeclencheur: (cle: string) => string[];
  // Éléments de la liste écrite en réponse à une autre question (type « liste »), dans l'ordre.
  elementsDeListe?: (code: string) => string[];
};

// Identifiants stables des éléments d'une liste : le nom sans accent, avec un numéro si deux se ressemblent.
export function idsDeListe(elements: string[]): string[] {
  const vus = new Set<string>();
  return elements.map((e) => {
    const base = slug(e).slice(0, 36);
    let id = base;
    let n = 2;
    while (vus.has(id)) id = `${base}_${n++}`;
    vus.add(id);
    return id;
  });
}

const TOLERANCE_TOTAL = 0.5;

// Une réponse est valide si elle correspond à la spécification. « Je ne sais pas » et « je
// ne suis pas cette donnée » sont toujours acceptés (jamais obligatoire).
export function validerSelonSpec(spec: ReponseSpec, r: ReponseAValider, ctx: ContexteLignes): Verdict {
  if (r.genre === "inconnu" || r.genre === "non_suivi") return ok;

  switch (spec.type) {
    case "nombre": {
      if (r.genre === "exact") return nombreDansBornes(r.valeur, spec);
      if (r.genre === "estimation") {
        const a = nombreDansBornes(r.min, spec);
        return a.ok ? nombreDansBornes(r.max, spec) : a;
      }
      return non("Répondez par un chiffre, une fourchette, ou « je ne sais pas ».");
    }
    case "oui_non":
    case "choix":
    case "texte":
    case "date_mois":
      return r.genre === "saisie" ? validerChampSimple(spec, r.valeur) : non("Réponse non conforme à la question.");
    case "liste": {
      if (r.genre !== "saisie" || !Array.isArray(r.valeur)) return non("Écrivez votre liste.");
      const v = r.valeur;
      if (v.some((x) => x.trim() === "" || x.length > 80)) return non("Chaque élément fait entre 1 et 80 caractères.");
      if (v.length > spec.max) return non(`${spec.max} éléments au plus.`);
      if (spec.min !== undefined && v.length < spec.min) return non(`Au moins ${spec.min} élément(s).`);
      if (new Set(v.map((x) => x.trim().toLowerCase())).size !== v.length) return non("Un élément est écrit deux fois.");
      return ok;
    }
    case "cases": {
      if (r.genre !== "saisie" || !Array.isArray(r.valeur)) return non("Cochez une ou plusieurs options.");
      const v = r.valeur;
      if (!v.every((x) => spec.options.some((o) => o.id === x))) return non("Choix non reconnu.");
      if (new Set(v).size !== v.length) return non("Une option est cochée deux fois.");
      if (spec.minChoix !== undefined && v.length < spec.minChoix) return non(`Cochez au moins ${spec.minChoix} option(s).`);
      if (spec.maxChoix !== undefined && v.length > spec.maxChoix) return non(`Cochez ${spec.maxChoix} option(s) au plus.`);
      return ok;
    }
    case "composite": {
      if (r.genre !== "valeurs") return non("Réponse non conforme à la question.");
      return validerChamps(spec.champs, r.valeurs, "");
    }
    case "tableau": {
      if (r.genre !== "valeurs") return non("Réponse non conforme à la question.");
      const v = r.valeurs;
      let idsLignes: string[];
      if (spec.lignes.source === "fixe") idsLignes = spec.lignes.items.map((i) => i.id);
      else if (spec.lignes.source === "declencheur") idsLignes = ctx.lignesDeclencheur(spec.lignes.cle);
      else if (spec.lignes.source === "donnee") idsLignes = idsDeListe(ctx.elementsDeListe?.(spec.lignes.code) ?? []);
      else idsLignes = Array.from({ length: spec.lignes.max }, (_, i) => String(i + 1));
      const autorisees = new Set(idsLignes.flatMap((l) => [...spec.colonnes.map((c) => `${l}.${c.id}`), ...(spec.lignes.source === "libre" ? [`${l}.nom`] : [])]));
      for (const cle of Object.keys(v)) if (!autorisees.has(cle)) return non("Une case du tableau n'existe pas.");
      for (const l of idsLignes) {
        const ligne: ValeursStructurees = {};
        for (const c of spec.colonnes) if (`${l}.${c.id}` in v) ligne[c.id] = v[`${l}.${c.id}`];
        const verdict = validerChamps(spec.colonnes, ligne, l);
        if (!verdict.ok) return verdict;
      }
      if (spec.total) {
        const { colonne, valeur } = spec.total;
        const somme = idsLignes.reduce((s, l) => {
          const x = v[`${l}.${colonne}`];
          return s + (typeof x === "number" ? x : 0);
        }, 0);
        const saisi = idsLignes.some((l) => typeof v[`${l}.${colonne}`] === "number");
        if (saisi && Math.abs(somme - valeur) > TOLERANCE_TOTAL) return non(`Le total doit faire ${valeur} (il fait ${Math.round(somme * 100) / 100}).`);
      }
      return ok;
    }
  }
}

function validerChamps(champs: ChampNomme[], valeurs: ValeursStructurees, prefixe: string): Verdict {
  const connus = new Set(champs.map((c) => c.id));
  for (const cle of Object.keys(valeurs)) if (!connus.has(cle)) return non("Un champ n'existe pas.");
  for (const c of champs) {
    const v = valeurs[c.id];
    if (v === undefined || v === null || v === "") continue; // champ laissé vide : permis, rien n'est obligatoire
    const verdict = validerChampSimple(c.spec, v);
    if (!verdict.ok) return non(`${prefixe ? `Ligne ${prefixe} · ` : ""}${c.libelle} : ${verdict.message}`);
  }
  return ok;
}

// --- Proposition à partir du format du classeur -------------------------------------------

export type Proposition = {
  spec: ReponseSpec | null;
  // sure : déduite sans ambiguïté du libellé du format. a_definir : la banque doit la définir.
  certitude: "sure" | "a_definir";
  // Aide à la rédaction de la banque : ce que le format laisse entendre.
  indice: string | null;
};

const NOMBRES: Record<string, Unite> = {
  "nombre": "nombre",
  "€": "euros",
  "%": "pourcent",
  "heures": "heures",
  "jours": "jours",
  "semaines": "semaines",
  "mois": "mois",
  "années": "annees",
  "km": "km",
  "€ par heure": "euros_par_heure",
  "points de %": "points",
};

function slug(t: string): string {
  const s = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return s || "option";
}

function optionsDepuis(liste: string[]): { id: string; libelle: string }[] {
  const vus = new Set<string>();
  return liste.map((libelle) => {
    let id = slug(libelle);
    let n = 2;
    while (vus.has(id)) id = `${slug(libelle).slice(0, 36)}_${n++}`;
    vus.add(id);
    return { id, libelle };
  });
}

const EST_JE_NE_SAIS_PAS = /^je ne sais pas$/i;

export function proposerSpec(format: string | null): Proposition {
  const f = (format ?? "").trim();
  if (f === "") return { spec: null, certitude: "a_definir", indice: null };
  const bas = f.toLowerCase();

  if (bas in NOMBRES) return { spec: { type: "nombre", unite: NOMBRES[bas] }, certitude: "sure", indice: null };
  if (bas === "oui / non") return { spec: { type: "oui_non" }, certitude: "sure", indice: null };
  if (bas === "mois et année") return { spec: { type: "date_mois" }, certitude: "sure", indice: null };
  if (bas === "texte court" || bas === "texte") return { spec: { type: "texte", max: bas === "texte court" ? 200 : 1000 }, certitude: "sure", indice: null };

  // « Tranches : a · b · c · je ne sais pas » et « Sur 10 : … » : « je ne sais pas » devient la
  // réponse « je ne sais pas » commune à toutes les questions, pas une tranche.
  const liste = /^(?:tranches(?: en %)?|sur \d+|choix)\s*:\s*(.+)$/i.exec(f);
  if (liste) {
    const libelles = liste[1].split("·").map((x) => x.trim()).filter((x) => x && !EST_JE_NE_SAIS_PAS.test(x));
    if (libelles.length >= 2) return { spec: { type: "choix", options: optionsDepuis(libelles) }, certitude: "sure", indice: null };
  }
  // Une réponse qui mêle un choix et un chiffre (« Oui chiffré / estimation / non ») n'est pas un simple choix.
  if (/chiffré|estimation/i.test(f)) return { spec: null, certitude: "a_definir", indice: `format « ${f} » : un choix suivi d'un chiffre ? À préciser.` };
  const barres = /^[^:]+$/.exec(f) && f.includes(" / ") && !/[+×]|ligne|colonne|tableau/i.test(f) ? f.split(" / ").map((x) => x.trim()) : null;
  if (barres && barres.length >= 3 && barres.every((x) => /^[A-Za-zÀ-ÿ' ]+$/.test(x))) {
    return { spec: { type: "choix", options: optionsDepuis(barres.map((x) => x[0].toUpperCase() + x.slice(1))) }, certitude: "sure", indice: null };
  }
  const points = f.includes("·") && !f.includes(":") ? f.split("·").map((x) => x.trim()) : null;
  if (points && points.length >= 2 && points.every((x) => /^[A-Za-zÀ-ÿ' ]+$/.test(x))) {
    return { spec: { type: "choix", options: optionsDepuis(points.map((x) => x[0].toUpperCase() + x.slice(1))) }, certitude: "sure", indice: null };
  }

  return { spec: null, certitude: "a_definir", indice: indiceDepuisFormat(f) };
}

const MOTS: [RegExp, string][] = [
  [/€ par heure/gi, "montant par heure"],
  [/€/g, "montant"],
  [/%/g, "pourcentage"],
  [/nombres?/gi, "nombre"],
  [/heures?/gi, "heures"],
  [/jours?/gi, "jours"],
  [/mois/gi, "mois"],
  [/semaines?/gi, "semaines"],
  [/choix/gi, "choix"],
  [/date/gi, "date"],
  [/note/gi, "note"],
  [/texte/gi, "texte"],
  [/oui \/ non/gi, "oui ou non"],
];

// Ce que dit le format d'une réponse que la banque doit préciser : famille et champs probables.
export function indiceDepuisFormat(f: string): string {
  if (/^tableau|par ligne|\(\d+ lignes\)|lignes?\)|colonnes?\)|\d+ × \d+|une ligne par|grille|jusqu'à \d+ lignes|par (canal|réseau|type|poste|cause|plateforme|messagerie|format|jour|motif)/i.test(f)) {
    return `tableau : ${f}. Précisez les lignes (fixes, issues d'une question de cadrage, ou libres) et les colonnes.`;
  }
  if (/^liste/i.test(f) && !/[+]/.test(f)) return `liste : précisez le nombre maximum d'éléments (type « liste »). D'autres questions pourront nommer leurs lignes avec elle.`;
  if (/^(choix|cases)/i.test(f) && !/[+]/.test(f)) {
    return `${f} : listez les options (séparées par ·).`;
  }
  if (/\b(et|\+)\b| \+ |^\d+ (nombres|montants|valeurs)|^\d+ champs/i.test(f)) {
    let t = f;
    for (const [re, mot] of MOTS) t = t.replace(re, mot);
    return `plusieurs champs : ${t}. Nommez chaque champ.`;
  }
  return `format « ${f} » : à préciser.`;
}

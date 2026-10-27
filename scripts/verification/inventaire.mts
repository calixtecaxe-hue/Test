// Inventaire de toutes les questions des quatre agents et matrice de leurs dépendances (vérification du 28 octobre).
//
// Pour chaque donnée posable du classeur (et chaque question de la banque, retirée ou en attente) : texte, aide, choix,
// format, unité, période, niveau, profils, conditions d'apparition, réponses dont elle dépend, questions, calculs et
// thèmes qu'elle influence. L'atteignabilité est vérifiée par le vrai code d'assemblage : pour chaque question, le script
// cherche un compte (profil, taille, métier) et des réponses qui la font apparaître (« témoin »), en résolvant sa condition
// et en levant le masquage de son thème. Une question sans témoin est signalée.
//
//   node scripts/verification/inventaire.mts            → docs/verification/inventaire-questions.{csv,json},
//                                                          docs/verification/matrice-dependances.csv, résumé à l'écran
//
// Lecture seule : rien n'est écrit dans les données.

import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { equivalences, donneesPrerepondues } from "../../src/lib/audit/assemblage.ts";
import { clesDeLaRegle, cleDeDonnee, moisMinimumDExistence, donneeDuDeclencheur, TAILLES_D02 } from "../../src/lib/audit/affichage.ts";
import { formuler, variablesDuGabarit } from "../../src/lib/donnees/lexique.ts";
import { LIBELLE_UNITE, type ReponseSpec } from "../../src/lib/donnees/reponse-spec.ts";
import { PROFILS, type Donnee } from "../../src/lib/donnees/schemas.ts";
import enAttente from "../../data/banque/en-attente.json" with { type: "json" };
import { NOM_AGENT, banque, chercherTemoin, donneeDe, e, libelleOption, lireRegle, nomCle, racine, regles, retires, themeDe, type Temoin } from "./resolution.mts";

const sortie = join(racine, "docs", "verification");
mkdirSync(sortie, { recursive: true });

// --- Période et unité -----------------------------------------------------------------------------------------------

const RE_PERIODE = /(\d+|douze|trois|six) derni(er|ère)s? (mois|semaines|années|ans|jours)|par (mois|semaine|jour|an|année|trimestre)|chaque (mois|semaine|jour|année|an)|(le|ce|du) mois (dernier|moyen|en cours)|un mois (moyen|normal|habituel|type)|une semaine (normale|type|habituelle)|une journée (normale|type)|l'an(née)? dernière?|cette année|l'année (dernière|passée|en cours)|dernier exercice|exercice|sur l'année|sur un an|sur 12 mois|en moyenne|aujourd'hui|actuellement|en ce moment|depuis (la|le|\d|un|une)|à ce jour|il y a \d+ mois|au cours des|ces derniers mois|par client|par commande|par vente|par heure/i;
function periodeDuTexte(t: string): string | null {
  const m = RE_PERIODE.exec(t);
  return m ? m[0] : null;
}
function unites(spec: ReponseSpec | null | undefined): string[] {
  if (!spec) return [];
  const u = (s: { type: string; unite?: string }) => (s.type === "nombre" && s.unite ? [LIBELLE_UNITE[s.unite as keyof typeof LIBELLE_UNITE] || "nombre"] : []);
  if (spec.type === "nombre") return u(spec);
  if (spec.type === "composite") return [...new Set(spec.champs.flatMap((c) => u(c.spec)))];
  if (spec.type === "tableau") return [...new Set(spec.colonnes.flatMap((c) => u(c.spec)))];
  return [];
}
function decrireSpec(spec: ReponseSpec | null | undefined): { type: string; choix: string; details: string } {
  if (!spec) return { type: "saisie libre (aucune spécification)", choix: "", details: "" };
  switch (spec.type) {
    case "nombre": return { type: "nombre", choix: "", details: `${LIBELLE_UNITE[spec.unite] || "nombre"}${spec.min !== undefined ? ` · min ${spec.min}` : ""}${spec.max !== undefined ? ` · max ${spec.max}` : ""}` };
    case "oui_non": return { type: "oui / non", choix: "Oui | Non", details: "" };
    case "choix": return { type: "choix unique", choix: spec.options.map((o) => o.libelle).join(" | "), details: "" };
    case "cases": return { type: "cases (plusieurs choix)", choix: spec.options.map((o) => o.libelle).join(" | "), details: [spec.minChoix ? `au moins ${spec.minChoix}` : "", spec.maxChoix ? `au plus ${spec.maxChoix}` : ""].filter(Boolean).join(" · ") };
    case "texte": return { type: "texte", choix: "", details: spec.max ? `${spec.max} caractères au plus` : "" };
    case "date_mois": return { type: "mois et année", choix: "", details: "" };
    case "liste": return { type: "liste libre", choix: "", details: `${spec.max} éléments au plus` };
    case "composite": return { type: "plusieurs champs", choix: spec.champs.map((c) => `${c.libelle} (${decrireSpec(c.spec).type}${c.spec.type === "nombre" ? ` ${LIBELLE_UNITE[c.spec.unite] || "nombre"}` : ""})`).join(" | "), details: "" };
    case "tableau": {
      const l = spec.lignes;
      const lignes = l.source === "fixe" ? `lignes : ${l.items.map((i) => i.libelle).join(", ")}` : l.source === "declencheur" ? `une ligne par choix de ${nomCle(l.cle)}` : l.source === "donnee" ? `une ligne par élément de ${l.code}` : `lignes libres (${l.max} au plus)`;
      return { type: "tableau", choix: spec.colonnes.map((c) => `${c.libelle} (${decrireSpec(c.spec).type}${c.spec.type === "nombre" ? ` ${LIBELLE_UNITE[c.spec.unite] || "nombre"}` : ""})`).join(" | "), details: `${lignes}${spec.total ? ` · total imposé ${spec.total.valeur}` : ""}` };
    }
  }
}

// --- Dépendances -------------------------------------------------------------------------------------------------------

type Lien = { source: string; type: string; condition: string; cible: string; attendu: string };
const liens: Lien[] = [];
const equiv = equivalences(e.donnees, donneesPrerepondues(e.prereponses));
const sourceDeCle = (cle: string): string => cleDeDonnee(cle)?.donnee ?? donneeDuDeclencheur(regles, cle.split(".")[0]) ?? (cle === "D02" ? "Taille (inscription)" : cle.split(".")[0]);

for (const d of e.donnees) {
  if (d.mode !== "demandee" && d.mode !== "partagee") continue;
  const c = d.condition ? regles.conditions[d.condition] : undefined;
  if (c) for (const cle of new Set(clesDeLaRegle(c))) liens.push({ source: sourceDeCle(cle), type: "condition d'affichage", condition: lireRegle(c), cible: d.code, attendu: "la question apparaît quand la condition est vraie, disparaît (et sort du calcul) quand elle devient fausse, attend tant que la réponse source manque" });
  const min = moisMinimumDExistence(d.periode);
  if (min !== null) liens.push({ source: "Date de création (inscription, D01)", type: "ancienneté", condition: `plus de ${min} mois d'existence`, cible: d.code, attendu: "masquée pour une entreprise plus jeune" });
  if ("tailles" in d) liens.push({ source: "Taille (inscription, D02)", type: "taille", condition: `tailles : ${TAILLES_D02.filter((t) => d.tailles[t]).join(", ")}`, cible: d.code, attendu: "posée seulement à ces tailles" });
  const spec = banque.get(d.code)?.reponse;
  if (spec?.type === "tableau" && spec.lignes.source === "declencheur") liens.push({ source: sourceDeCle(spec.lignes.cle), type: "lignes du tableau", condition: `une ligne par choix coché`, cible: d.code, attendu: "lignes = choix cochés, dans leur ordre ; un choix ajouté ajoute une ligne vide ; un choix retiré retire sa ligne et sa valeur de la réponse active et du calcul ; les autres valeurs sont gardées" });
  if (spec?.type === "tableau" && spec.lignes.source === "donnee") liens.push({ source: spec.lignes.code, type: "lignes du tableau", condition: "une ligne par élément de la liste", cible: d.code, attendu: "lignes = éléments écrits ; un élément renommé ou retiré retire sa ligne et sa valeur de la réponse active" });
  if (d.mode === "partagee") for (const x of equiv.get(d.code) ?? []) if (x !== d.code) liens.push({ source: x, type: "donnée partagée", condition: "même donnée chez un autre agent", cible: d.code, attendu: "posée une seule fois ; la réponse donnée chez l'un vaut chez l'autre" });
}
for (const t of e.themes) {
  const m = t.masquePour ? regles.masquages[t.masquePour] : undefined;
  if (m) for (const cle of new Set(clesDeLaRegle(m))) liens.push({ source: sourceDeCle(cle), type: "masquage du thème", condition: `${t.masquePour} : ${lireRegle(m)}`, cible: `thème ${t.code}`, attendu: "thème masqué (ni posé, ni « non évalué ») quand la règle est vraie, sauf ses questions dont la condition propre est vraie" });
}
for (const l of e.tableauxLies.liens) for (const s of l.suit) liens.push({ source: s, type: "tableau lié", condition: "reprend les lignes (et leurs noms)", cible: l.tableau, attendu: "lignes ajoutées ou retirées à l'origine suivent ; sans réponse à l'origine, le tableau garde ses lignes" });
for (const i of e.implications.implications) liens.push({ source: i.siCoche.donnee, type: "réponse déduite", condition: `« ${libelleOption("ACQ-03.01", i.siCoche.option)} » coché`, cible: i.donnee, attendu: `${i.donnee} vaut « ${i.valeur} » et n'est pas posée ; décoché, elle est posée ; une réponse donnée l'emporte` });
for (const p of e.prereponses.regles) for (const s of p.somme) liens.push({ source: s, type: "pré-réponse (total)", condition: `total de ${p.somme.join(" + ")} si ${p.exige.join(", ")} ont un chiffre`, cible: p.donnee, attendu: "champ prérempli avec le total, recalculé si le détail change, figé dès que le dirigeant corrige" });
for (const x of e.croisements) for (const s of x.entrees) liens.push({ source: s, type: "croisement (calcul)", condition: x.calcul, cible: x.code, attendu: "calcul pas encore exécutable (formule en texte libre) : la réponse active seule doit y entrer" });
for (const x of e.scenarios) for (const s of x.entrees) liens.push({ source: s, type: "scénario (calcul)", condition: x.calcul, cible: x.code, attendu: "calcul pas encore exécutable" });

// --- Relecture (docs/verification/relecture-questions.json) et contrôles automatiques du texte ---------------------------

const relecture = JSON.parse(readFileSync(join(racine, "docs", "verification", "relecture-questions.json"), "utf8")) as Record<string, { statut: string; constat: string }>;
// Montants sans période écrite, relus un par un : la base est dans la question elle-même.
const PERIODE_VUE: Record<string, string> = {
  "ACQ-15.11": "seuil d'achat à partir duquel le paiement en plusieurs fois est proposé, un montant par achat",
  "ACQ-18.07": "récompense pour un client recommandé, la question le dit",
  "FIN-11.02": "part de la trésorerie du jour, donnée juste avant (FIN-11.01, « aujourd'hui »)",
  "FIN-11.03": "plafond autorisé à ce jour, un montant à une date et pas un flux",
  "RH-28.05": "coût d'un recrutement, la question le dit",
};
function controlesAutomatiques(code: string, q: { texte: string | null; aide: string | null; reponse: ReponseSpec | null } | undefined, d: Donnee | undefined): string[] {
  const constats: string[] = [];
  if (!q?.texte) return ["texte absent de la banque"];
  const t = `${q.texte} ${q.aide ?? ""}`;
  if (/!/.test(t)) constats.push("point d'exclamation");
  // « ton » peut désigner le ton d'une communication (« votre ton », « quel ton ») ; « tes » est dans « êtes ».
  if (/(?<!\p{L})(tu|toi|ta|tes)(?!\p{L})/iu.test(q.texte) || /(?<!(votre|quel|le|un|même) )(?<!\p{L})ton(?!\p{L})/iu.test(q.texte)) constats.push("tutoiement");
  if (/\p{Extended_Pictographic}/u.test(t)) constats.push("émoji");
  const nombres: { spec: Extract<ReponseSpec, { type: "nombre" }>; ou: string }[] = [];
  const parcourir = (spec: ReponseSpec | null, ou: string) => {
    if (!spec) return;
    if (spec.type === "nombre") nombres.push({ spec, ou });
    if (spec.type === "composite") for (const c of spec.champs) parcourir(c.spec as ReponseSpec, `${ou}#${c.id}`);
    if (spec.type === "tableau") for (const c of spec.colonnes) parcourir(c.spec as ReponseSpec, `${ou}#${c.id}`);
  };
  parcourir(q.reponse, "");
  for (const { spec, ou } of nombres) {
    if (spec.unite === "pourcent" && (spec.min === undefined || spec.max === undefined)) constats.push(`part en % sans bornes${ou}`);
    else if (spec.unite !== "points" && spec.min === undefined && !["FIN-05.04", "FIN-11.01"].includes(code)) constats.push(`nombre sans minimum${ou}`);
  }
  // Un montant sans période ni base : par mois, par an, sur 12 mois, par client, prix d'une offre… dans le texte, l'aide, les
  // libellés des champs ou la période du classeur. Un nombre de jours ou d'heures est le plus souvent un délai ou une durée
  // (« combien de jours avant de relancer ») : il n'est pas contrôlé ici. Les cas restants sont tranchés à la main (PERIODE_VUE).
  const libelles = q.reponse?.type === "composite" ? q.reponse.champs.map((c) => c.libelle) : q.reponse?.type === "tableau" ? q.reponse.colonnes.map((c) => c.libelle) : [];
  const tout = `${t} ${libelles.join(" ")}`;
  const montant = nombres.some(({ spec }) => spec.unite === "euros");
  if (montant && !periodeDuTexte(tout) && !d?.periode && !/(moyen|en tout|au total|prochains|pour chaque|chaque fois|prix|tarif|factur|par (heure|jour|devis|vente|client|commande|personne|salarié|chantier|projet|nuit|séjour|unité|location|recrutement))/i.test(tout)) {
    constats.push(PERIODE_VUE[code] ? `montant sans période écrite, vérifié : ${PERIODE_VUE[code]}` : "montant sans période ni base explicite");
  }
  if (q.reponse && (q.reponse.type === "choix" || q.reponse.type === "cases")) {
    const libelles = q.reponse.options.map((o) => o.libelle.toLowerCase());
    if (new Set(libelles).size !== libelles.length) constats.push("deux choix identiques");
    if (libelles.length < 2) constats.push("moins de deux choix");
  }
  return constats;
}

// --- Inventaire ---------------------------------------------------------------------------------------------------------

type Ligne = Record<string, string | number>;
const lignes: Ligne[] = [];
const temoins: Record<string, Temoin> = {};
const posables = e.donnees.filter((d) => d.mode === "demandee" || d.mode === "partagee");
const statut = (d: Donnee | undefined, code: string) => {
  if (!d) return "en attente (absente du classeur)";
  if (retires.has(code)) return "retirée (doublon)";
  if (d.mode !== "demandee" && d.mode !== "partagee") return `non posée (${d.mode})`;
  if (d.niveau === null) return "non posée (sans niveau)";
  return "posable";
};
const codes = [...new Set([...posables.map((d) => d.code), ...e.banque.map((q) => q.donnee), ...(enAttente as { donnee: string }[]).map((q) => q.donnee)])].sort();
const attenteParCode = new Map((enAttente as { donnee: string; texte: string; aide: string | null; reponse: ReponseSpec; raison: string }[]).map((q) => [q.donnee, q]));
let n = 0;
for (const code of codes) {
  const d = donneeDe.get(code);
  const q = banque.get(code) ?? attenteParCode.get(code);
  const theme = themeDe.get(code.slice(0, code.indexOf(".")));
  const st = statut(d, code);
  let atteinte = "";
  let raison = "";
  let temoin: Temoin | null = null;
  if (st === "posable" && d) {
    const r = chercherTemoin(d);
    temoin = r.temoin;
    if (temoin) temoins[code] = temoin;
    atteinte = temoin ? "oui (assemblage)" : "NON";
    raison = r.raison ?? "";
  }
  const spec = q?.reponse ?? null;
  const ds = decrireSpec(spec);
  const variantes = new Set<string>();
  if (q?.texte) for (const p of PROFILS) { const f = formuler(q.texte, [p], e.lexique); if (f.ok) variantes.add(f.texte); }
  const sansProfil = q?.texte ? PROFILS.filter((p) => !formuler(q.texte, [p], e.lexique).ok) : [];
  const dependDe = liens.filter((l) => l.cible === code || (theme && l.cible === `thème ${theme.code}`));
  const influence = liens.filter((l) => l.source === code);
  const lisent = new Set([...influence.map((l) => l.cible), ...(d?.utiliseeDans ?? [])]);
  const periodeTexte = q?.texte ? periodeDuTexte(`${q.texte} ${q.aide ?? ""}`) : null;
  lignes.push({
    code,
    agent: theme ? NOM_AGENT[theme.agent] : "",
    theme: theme ? `${theme.code} ${theme.nom}` : "",
    bloc: theme?.bloc ?? "",
    nature_du_theme: theme?.nature ?? "",
    ecran_classeur: d?.ecran ?? "",
    statut: st,
    niveau: d?.niveau ?? "",
    donnee_recherchee: d?.libelle ?? "",
    texte: q?.texte ?? "(question à rédiger : libellé du classeur affiché)",
    variantes_selon_profil: variantes.size > 1 ? [...variantes].join(" ‖ ") : "",
    mots_du_lexique: q?.texte ? variablesDuGabarit(q.texte).join(", ") : "",
    profils_sans_texte: sansProfil.join(", "),
    aide: q?.aide ?? "",
    repli: (q as { repli?: string | null } | undefined)?.repli ?? "",
    format: ds.type,
    choix_ou_colonnes: ds.choix,
    details_format: ds.details,
    unite: unites(spec).join(", "),
    periode_classeur: d?.periode ?? "",
    periode_dans_le_texte: periodeTexte ?? "",
    obligatoire: "non (aucune question obligatoire, CLAUDE.md section 6)",
    quatre_reponses: spec?.type === "nombre" ? "oui (exact, fourchette, je ne sais pas, je ne suis pas)" : "je ne sais pas, je ne suis pas",
    profils: d ? ("tailles" in d ? `tous (agent RH, par taille : ${TAILLES_D02.filter((t) => d.tailles[t]).join(", ")})` : PROFILS.filter((p) => d.profils[p]).join(", ")) : "",
    metiers: d?.metiers?.join(", ") ?? "",
    condition: d?.condition ? `${d.condition} → ${regles.conditions[d.condition] ? lireRegle(regles.conditions[d.condition]) : "règle absente"}` : "",
    masquage_du_theme: theme?.masquePour ? `${theme.masquePour} → ${regles.masquages[theme.masquePour] ? lireRegle(regles.masquages[theme.masquePour]) : "règle absente"}` : "",
    depend_de: [...new Set(dependDe.map((l) => `${l.source} (${l.type})`))].join(" ; "),
    influence: [...lisent].join(", "),
    atteignable: atteinte,
    temoin: temoin ? `${temoin.profil} · ${temoin.taille}${temoin.metier ? ` · ${temoin.metier}` : ""}${Object.keys(temoin.reponses).length ? ` · réponses : ${Object.entries(temoin.reponses).map(([k, v]) => `${k}=${JSON.stringify(v && "valeur" in v ? v.valeur : v)}`).join(", ")}` : ""}` : "",
    raison_non_atteinte: atteinte === "NON" ? raison : "",
    relecture: relecture[code] ? `${relecture[code].statut} : ${relecture[code].constat}` : q?.texte ? "relue (texte, aide, choix, unité, période) : sans correction" : "non relue (pas de texte dans la banque)",
    controles_automatiques: q ? (controlesAutomatiques(code, q as { texte: string | null; aide: string | null; reponse: ReponseSpec | null }, d).join(" ; ") || "aucun constat") : "pas de question dans la banque",
  });
  if (++n % 100 === 0) process.stderr.write(`${n}/${codes.length}\n`);
}

// --- Écriture --------------------------------------------------------------------------------------------------------

const csv = (rows: Ligne[]) => {
  const cols = Object.keys(rows[0]);
  const echap = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => echap(r[c])).join(";"))].join("\r\n") + "\r\n";
};
writeFileSync(join(sortie, "inventaire-questions.csv"), csv(lignes));
writeFileSync(join(sortie, "inventaire-questions.json"), JSON.stringify({ genereLe: new Date().toISOString(), questions: lignes, temoins }, null, 1));
const liensUniques = [...new Map(liens.map((l) => [`${l.source}|${l.type}|${l.cible}`, l])).values()];
writeFileSync(join(sortie, "matrice-dependances.csv"), csv(liensUniques.map((l) => ({ source: l.source, type: l.type, condition: l.condition, cible: l.cible, comportement_attendu: l.attendu }))));

const compter = (f: (l: Ligne) => boolean) => lignes.filter(f).length;
const parType = new Map<string, number>();
for (const l of liensUniques) parType.set(l.type, (parType.get(l.type) ?? 0) + 1);
console.log(`Questions recensées : ${lignes.length}`);
console.log(`  posables : ${compter((l) => l.statut === "posable")} · avec texte de la banque : ${compter((l) => l.statut === "posable" && !String(l.texte).startsWith("(question"))}`);
console.log(`  retirées : ${compter((l) => String(l.statut).startsWith("retirée"))} · en attente : ${compter((l) => String(l.statut).startsWith("en attente"))} · non posées : ${compter((l) => String(l.statut).startsWith("non posée"))}`);
console.log(`  atteignables (témoin trouvé) : ${compter((l) => l.atteignable === "oui (assemblage)")} · NON atteignables : ${compter((l) => l.atteignable === "NON")}`);
for (const l of lignes.filter((x) => x.atteignable === "NON")) console.log(`    ${l.code} : ${l.raison_non_atteinte}`);
console.log(`Dépendances recensées : ${liensUniques.length}`);
for (const [t, k] of parType) console.log(`  ${t} : ${k}`);

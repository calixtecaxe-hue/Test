// Contrôles du code sur le rapport rédigé par l'IA, avant tout affichage (l'IA seule ne suffit pas, CLAUDE.md section 5).
//
//   - Chiffres : tout montant, pourcentage ou nombre d'heures, et tout nombre au-delà de 12, figure dans le dossier. Dans les
//     étapes d'une action, seules les durées de travail proposées (« 30 min par jour ») sont libres ; jamais un montant ni un %.
//   - Références : chaque passage cite des éléments qui existent dans le dossier ; une action sans fait cité est un conseil
//     générique, refusé.
//   - Ce que le dirigeant a déjà essayé : une question sans réponse n'est jamais présentée comme « rien essayé » ; une action qui
//     reprend un essai dit ce qui change.
//   - Plan : intitulé qui commence par un verbe, nombre d'actions et d'étapes, échéances, dépendances dans l'ordre, au moins une
//     action à lancer maintenant.
//   - Ton : ni point d'exclamation, ni émoji, ni tutoiement, ni formule creuse, ni superlatif, ni identifiant technique.
//   - Renvois : jamais vers l'agent lui-même, ni vers l'agent Comm quand le métier n'y a pas accès.
//   - Professions réglementées : une section qui touche la zone interdite est retirée (filet ; message fixe à écrire avec l'avocat).
//
// Ce fichier n'importe que des types : il se teste directement avec Node.

import type { ParametresRapport } from "../donnees/schemas.ts";
import type { Dossier } from "./dossier.ts";
import type { ActionRapport, Rapport } from "./schema.ts";

export type Verdict = { ok: boolean; erreurs: string[]; rapport: Rapport; retraits: string[] };

// --- Chiffres ------------------------------------------------------------------------------------------------------------

const NOMBRE =
  /(?<![\p{L}\d.,])(\d{1,3}(?:[   ]\d{3})+|\d+)(?:[.,](\d+))?(?![\p{L}\d])\s*(%|€|euros?(?![\p{L}])|points?(?![\p{L}])|h(?![\p{L}])|heures?(?![\p{L}])|min(?![\p{L}])|minutes?(?![\p{L}])|jours?(?![\p{L}])|semaines?(?![\p{L}])|mois(?![\p{L}])|ans?(?![\p{L}])|années?(?![\p{L}]))?/giu;

type Lu = { valeur: number; unite: string | null; texte: string };

export function nombresDuTexte(t: string): Lu[] {
  const lus: Lu[] = [];
  for (const m of t.matchAll(NOMBRE)) {
    const entier = m[1].replace(/[   ]/g, "");
    const valeur = Number(m[2] ? `${entier}.${m[2]}` : entier);
    if (Number.isFinite(valeur)) lus.push({ valeur, unite: m[3] ? m[3].toLowerCase() : null, texte: m[0].trim() });
  }
  return lus;
}

function nombresDuDossier(d: Dossier): number[] {
  const vus: number[] = [];
  const parcourir = (v: unknown) => {
    if (typeof v === "number") vus.push(Math.abs(v));
    else if (typeof v === "string") nombresDuTexte(v).forEach((n) => vus.push(n.valeur));
    else if (Array.isArray(v)) v.forEach(parcourir);
    else if (v && typeof v === "object") Object.values(v).forEach(parcourir);
  };
  parcourir(d);
  return vus;
}

function present(n: number, autorises: number[]): boolean {
  return autorises.some((a) => Math.abs(a - n) <= 0.05 || Math.abs(a - n) <= Math.abs(a) * 0.001);
}

const MONETAIRE = new Set(["%", "€", "euro", "euros", "point", "points"]);
const HEURES = new Set(["h", "heure", "heures"]);

// Passage factuel : tout montant, %, nombre d'heures, et tout nombre au-delà de 12, vient du dossier.
function chiffresFactuels(t: string, autorises: number[]): string[] {
  return nombresDuTexte(t)
    .filter((n) => ((n.unite && (MONETAIRE.has(n.unite) || HEURES.has(n.unite))) || n.valeur > 12) && !present(n.valeur, autorises))
    .map((n) => n.texte);
}

// Étape d'action : les durées proposées sont libres, jamais un montant ni un %.
function chiffresDuPlan(t: string, autorises: number[]): string[] {
  return nombresDuTexte(t)
    .filter((n) => n.unite && MONETAIRE.has(n.unite) && !present(n.valeur, autorises))
    .map((n) => n.texte);
}

// --- Ton -----------------------------------------------------------------------------------------------------------------

function normal(t: string): string {
  return t.toLowerCase().replace(/[’`]/g, "'");
}

function contient(t: string, terme: string): boolean {
  const echappe = normal(terme).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}])${echappe}(?![\\p{L}])`, "u").test(normal(t));
}

// Les mots du dirigeant cités entre guillemets (« … ») sont les siens : le ton ne s'y contrôle pas.
function horsCitations(t: string): string {
  return t.replace(/«[^»]*»/g, "« »");
}

function defautsDeTon(brut: string, p: ParametresRapport): string[] {
  const t = horsCitations(brut);
  const d: string[] = [];
  if (t.includes("!")) d.push("point d'exclamation");
  if (/\p{Extended_Pictographic}/u.test(t)) d.push("émoji");
  if (/(?<![\p{L}])(tu|toi)(?![\p{L}])/iu.test(t)) d.push("tutoiement");
  for (const f of p.formulesInterdites) if (normal(t).includes(normal(f))) d.push(`formule « ${f} »`);
  for (const s of p.superlatifs) if (contient(t, s)) d.push(`superlatif « ${s} »`);
  if (/(?<![\p{L}])(ACQ|FIN|RH|COM)-\d{2}/u.test(t) || /[([]\s*[FEMLCOT]\d*\s*[)\]]/u.test(t)) d.push("identifiant technique dans le texte");
  return d;
}

// --- Verbes --------------------------------------------------------------------------------------------------------------

export function commenceParUnVerbe(intitule: string): boolean {
  const premier = normal(intitule.trim()).replace(/^(s'|se |ne pas |ne plus )/, "").split(/[\s']/)[0] ?? "";
  return /^[a-zàâçéèêëîïôûùüÿœ-]{2,}(er|ir|re|oir|dre)$/.test(premier);
}

// --- Contrôle ------------------------------------------------------------------------------------------------------------

const RIEN_ESSAYE = /(?<![\p{L}])(rien|jamais)\s+(essayé|tenté)|aucune?\s+(tentative|essai)/iu;

export function controlerRapport(brut: Rapport, d: Dossier, p: ParametresRapport): Verdict {
  const erreurs: string[] = [];
  const retraits: string[] = [];
  let r: Rapport = structuredClone(brut);
  const autorises = nombresDuDossier(d);
  const ids = new Set<string>([
    "O",
    ...(d.dejaEssaye.statut !== "sans_reponse" ? ["T"] : []),
    ...d.faits.map((f) => f.id),
    ...d.evolutions.map((e) => e.id),
    ...d.marche.map((m) => m.id),
    ...d.reponsesLibres.map((l) => l.id),
    ...d.constat.themesNotes.map((c) => c.id),
  ]);

  // Professions réglementées : retrait des sections qui touchent la zone interdite, avant les autres contrôles.
  if (d.profil.professionReglementee) {
    const touche = (t: string) => p.reglementees.termesInterdits.find((x) => contient(t, x));
    const texte = (v: unknown) => JSON.stringify(v);
    const garder = <T,>(liste: T[], nom: (x: T) => string): T[] =>
      liste.filter((x) => {
        const t = touche(texte(x));
        if (t) retraits.push(`${nom(x)} (terme « ${t} »)`);
        return !t;
      });
    r = {
      ...r,
      conclusions: garder(r.conclusions, (c) => `Conclusion « ${c.titre} »`),
      contradictions: garder(r.contradictions, () => "Contradiction"),
      manques: garder(r.manques, () => "Manque"),
      renvois: garder(r.renvois, (x) => `Renvoi « ${x.sujet} »`),
      actions: garder(r.actions, (a) => `Action « ${a.intitule} »`),
    };
    const restantes = new Set(r.actions.map((a) => a.id));
    r.actions = r.actions.map((a) => ({ ...a, apres: a.apres.filter((x) => restantes.has(x)) }));
    for (const [nom, t] of [["synthèse", r.synthese], ["ordre du plan", r.ordre], ["déjà essayé", texte(r.essais)], ["suivi des données", r.suiviDonnees ?? ""]] as const) {
      const x = touche(t);
      if (x) erreurs.push(`La ${nom} touche un sujet interdit aux professions réglementées (« ${x} »).`);
    }
  }

  // Passages : chiffres, ton, références.
  const factuels: [string, string][] = [["synthèse", r.synthese], ["ordre du plan", r.ordre], ...r.manques.map((m, i) => [`manque ${i + 1}`, m] as [string, string])];
  if (r.suiviDonnees) factuels.push(["suivi des données", r.suiviDonnees]);
  if (r.essais) factuels.push(["déjà essayé", r.essais.lecture], ["déjà essayé (suite)", r.essais.suite]);
  r.conclusions.forEach((c, i) => {
    const nom = `conclusion ${i + 1}`;
    factuels.push([nom, c.titre], [nom, c.interpretation], [nom, c.choix], [nom, c.justification], ...c.hypotheses.map((h) => [nom, h] as [string, string]), ...c.faits.map((f) => [nom, f.texte] as [string, string]));
  });
  r.contradictions.forEach((c, i) => factuels.push([`contradiction ${i + 1}`, c.description], [`contradiction ${i + 1}`, c.retenu]));
  r.renvois.forEach((x, i) => factuels.push([`renvoi ${i + 1}`, x.sujet]));
  r.actions.forEach((a) => factuels.push([a.id, a.resultat], [a.id, a.pourquoi], [a.id, a.indicateur], [a.id, a.effetAttendu]));
  const duPlan: [string, string][] = r.actions.flatMap((a) => [[a.id, a.intitule], [a.id, a.moyens], [a.id, a.tempsNecessaire], ...a.etapes.map((x) => [a.id, x] as [string, string]), ...a.prerequis.map((x) => [a.id, x] as [string, string]), ...(a.ceQuiChange ? [[a.id, a.ceQuiChange] as [string, string]] : [])]);

  for (const [nom, t] of factuels) for (const c of chiffresFactuels(t, autorises)) erreurs.push(`${nom} : « ${c} » ne figure pas dans le dossier.`);
  for (const [nom, t] of duPlan) for (const c of chiffresDuPlan(t, autorises)) erreurs.push(`${nom} : « ${c} » ne figure pas dans le dossier (aucun montant ni pourcentage ne s'invente dans un plan).`);
  for (const [nom, t] of [...factuels, ...duPlan]) for (const x of defautsDeTon(t, p)) erreurs.push(`${nom} : ${x}.`);
  if (d.dejaEssaye.statut === "sans_reponse") {
    for (const [nom, t] of [...factuels, ...duPlan]) if (RIEN_ESSAYE.test(horsCitations(t))) erreurs.push(`${nom} : la question « déjà essayé » est sans réponse ; rien ne dit que le dirigeant n'a rien essayé.`);
  }

  const toutesRefs: [string, string[]][] = [
    ...r.conclusions.flatMap((c, i) => c.faits.map((f) => [`conclusion ${i + 1}`, f.refs] as [string, string[]])),
    ...r.contradictions.map((c, i) => [`contradiction ${i + 1}`, c.refs] as [string, string[]]),
    ...r.actions.map((a) => [a.id, a.refs] as [string, string[]]),
  ];
  for (const [nom, liste] of toutesRefs) for (const x of liste) if (!ids.has(x)) erreurs.push(`${nom} : la référence ${x} n'existe pas dans le dossier.`);
  r.conclusions.forEach((c, i) => {
    if (c.faits.length === 0) erreurs.push(`conclusion ${i + 1} : aucun fait établi n'est cité.`);
    if (c.type === "freine" && !c.faits.some((f) => f.refs.some((x) => x !== "O"))) erreurs.push(`conclusion ${i + 1} : un frein doit s'appuyer sur un fait du dossier.`);
  });

  // Déjà essayé.
  if (d.dejaEssaye.statut === "essaye" && !r.essais) erreurs.push("Le dirigeant a dit ce qu'il a déjà essayé : le rapport doit en tenir compte (partie « essais »).");
  if (d.dejaEssaye.statut !== "essaye" && r.essais) erreurs.push("La partie « essais » n'a pas lieu d'être : le dossier ne dit pas ce qui a été essayé.");

  // Plan d'action.
  const a = p.actions;
  if (r.actions.length < a.min || r.actions.length > a.max) erreurs.push(`Le plan compte ${r.actions.length} action(s) ; il en faut entre ${a.min} et ${a.max}.`);
  if (r.actions.length > 0 && !r.actions.some((x) => x.quand === "maintenant")) erreurs.push("Aucune action n'est à lancer maintenant.");
  const vues = new Map<string, ActionRapport>();
  for (const x of r.actions) {
    if (!/^A\d+$/.test(x.id) || vues.has(x.id)) erreurs.push(`Identifiant d'action invalide ou en double : ${x.id}.`);
    if (!commenceParUnVerbe(x.intitule)) erreurs.push(`${x.id} : l'intitulé ne commence pas par un verbe à l'infinitif.`);
    if (x.intitule.trim().split(/\s+/).length > a.motsIntituleMax) erreurs.push(`${x.id} : l'intitulé dépasse ${a.motsIntituleMax} mots.`);
    if (x.etapes.length < a.etapesMin || x.etapes.length > a.etapesMax) erreurs.push(`${x.id} : ${x.etapes.length} étape(s) ; il en faut entre ${a.etapesMin} et ${a.etapesMax}.`);
    if (x.refs.filter((y) => y !== "O").length === 0) erreurs.push(`${x.id} : aucun fait du dossier n'est cité ; une action doit partir de la situation de l'entreprise.`);
    if (x.delaiSemaines < 1 || x.delaiSemaines > a.delaiSemainesMax) erreurs.push(`${x.id} : échéance hors limites (${x.delaiSemaines} semaines).`);
    if (x.pointEtapeSemaines < 1 || x.pointEtapeSemaines > a.delaiSemainesMax) erreurs.push(`${x.id} : point d'étape hors limites (${x.pointEtapeSemaines} semaines).`);
    for (const y of x.apres) {
      const avant = vues.get(y);
      if (!avant) erreurs.push(`${x.id} : dépend de ${y}, qui ne la précède pas dans le plan.`);
      else if (x.quand === "maintenant" && avant.quand === "ensuite") erreurs.push(`${x.id} : à lancer maintenant, mais dépend d'une action qui peut attendre (${y}).`);
    }
    if (x.repriseEssai && d.dejaEssaye.statut !== "essaye") erreurs.push(`${x.id} : reprend un essai que le dossier ne mentionne pas.`);
    if (x.repriseEssai && !x.ceQuiChange?.trim()) erreurs.push(`${x.id} : reprend ce qui a déjà été essayé sans dire ce qui change.`);
    vues.set(x.id, x);
  }

  // Renvois.
  for (const x of r.renvois) {
    if (x.agent === d.agent.code) erreurs.push("Un renvoi désigne l'agent lui-même.");
    if (x.agent === "COMM_CREATION" && !d.profil.agentComm) erreurs.push("Renvoi vers l'agent Comm, auquel ce métier n'a pas accès.");
  }

  return { ok: erreurs.length === 0, erreurs: [...new Set(erreurs)], rapport: r, retraits };
}

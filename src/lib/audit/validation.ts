// Validation d'une réponse reçue du navigateur : jamais de confiance dans ce qui
// arrive. Le code doit désigner une donnée demandée ou une réponse de déclencheur, et la
// forme de la réponse doit correspondre à ce qui a été posé.
//
// Ce fichier n'importe que des types et reponse.ts : il se teste directement avec Node.

import type { CodeAgent, EnsembleDonnees } from "../donnees/schemas.ts";
import { reponseSchema, type Reponse, type Reponses } from "./reponse.ts";
import { proposerSpec, validerSelonSpec, type ReponseSpec } from "../donnees/reponse-spec.ts";
import type { Exclusions } from "./assemblage.ts";
import { donneeDuDeclencheur } from "./affichage.ts";

export type Verdict =
  | { ok: true; reponse: Reponse; agent: CodeAgent | null }
  | { ok: false; message: string };

const refus = (message: string): Verdict => ({ ok: false, message });

const CLE_DECLENCHEUR = /^(D\d{2})(?:\.([a-z_]+))?$/;

// Réponse attendue à une donnée : celle écrite dans la banque, sinon celle que le format du
// classeur permet de déduire sans ambiguïté, sinon aucune (saisie libre).
export function specDeLaDonnee(e: EnsembleDonnees, code: string): { spec: ReponseSpec | null; source: "banque" | "classeur" | null } {
  const q = e.banque.find((x) => x.donnee === code);
  if (q?.reponse) return { spec: q.reponse, source: "banque" };
  const d = e.donnees.find((x) => x.code === code);
  const p = proposerSpec(d?.format ?? null);
  return p.certitude === "sure" && p.spec ? { spec: p.spec, source: "classeur" } : { spec: null, source: null };
}

// `dejaRepondu` : réponses du compte, pour les tableaux dont les lignes viennent d'une question de cadrage.
export function validerReponse(e: EnsembleDonnees, cle: string, brut: unknown, dejaRepondu: Reponses = {}, exclusions: Exclusions | null = null): Verdict {
  const analyse = reponseSchema.safeParse(brut);
  if (!analyse.success) return refus(analyse.error.issues[0]?.message ?? "Réponse invalide.");
  const reponse = analyse.data;

  const dec = CLE_DECLENCHEUR.exec(cle);
  if (dec) {
    const [, code, sous] = dec;
    if (exclusions?.declencheurs.includes(code)) return refus("Cette question ne concerne pas votre activité.");
    const forme = e.reglesAffichage.declencheurs[code];
    if (!forme) return refus("Cette question n'existe pas.");
    if (reponse.genre !== "saisie") return refus("Répondez par un choix.");
    const v = reponse.valeur;
    switch (forme.type) {
      case "oui_non":
        if (sous || (v !== "oui" && v !== "non")) return refus("Répondez par oui ou par non.");
        break;
      case "cases":
        if (sous || !Array.isArray(v) || !v.every((x) => forme.options.some((o) => o.id === x))) return refus("Choix non reconnu.");
        if (v.some((x) => exclusions?.optionsCadrage[code]?.includes(x))) return refus("Ce choix ne concerne pas votre activité.");
        break;
      case "choix":
        if (sous || typeof v !== "string" || !forme.options.some((o) => o.id === v)) return refus("Choix non reconnu.");
        break;
      case "reponse_donnee":
        return refus("Cette question se répond dans le questionnaire.");
      case "oui_non_multiple":
        if (!forme.sousCles.some((s) => s.cle === (sous ?? "")) || (v !== "oui" && v !== "non")) return refus("Répondez par oui ou par non.");
        break;
    }
    return { ok: true, reponse, agent: null };
  }

  const donnee = e.donnees.find((d) => d.code === cle);
  if (!donnee || (donnee.mode !== "demandee" && donnee.mode !== "partagee")) return refus("Cette question n'existe pas.");
  const { spec } = specDeLaDonnee(e, cle);
  if (spec) {
    const lignesDeclencheur = (c: string): string[] => {
      const r = dejaRepondu[donneeDuDeclencheur(e.reglesAffichage, c) ?? c];
      return r?.genre === "saisie" && Array.isArray(r.valeur) ? r.valeur : [];
    };
    const elementsDeListe = (c: string): string[] => {
      const r = dejaRepondu[c];
      return r?.genre === "saisie" && Array.isArray(r.valeur) ? r.valeur : [];
    };
    // Question qui tient lieu de déclencheur : un choix exclu pour ce compte est refusé côté serveur.
    if (exclusions && spec.type === "cases" && reponse.genre === "saisie" && Array.isArray(reponse.valeur)) {
      const interdites = Object.entries(exclusions.optionsCadrage).filter(([c]) => donneeDuDeclencheur(e.reglesAffichage, c) === cle).flatMap(([, ids]) => ids);
      if (reponse.valeur.some((x) => interdites.includes(x))) return refus("Ce choix ne concerne pas votre activité.");
    }
    const verdict = validerSelonSpec(spec, reponse, { lignesDeclencheur, elementsDeListe });
    if (!verdict.ok) return refus(verdict.message);
  } else if (reponse.genre === "exact" || reponse.genre === "estimation" || reponse.genre === "valeurs") {
    // Sans spécification de réponse, seuls un texte, « je ne sais pas » et « je ne suis pas cette donnée » sont permis.
    return refus("Cette question ne se répond pas par un seul chiffre.");
  }
  const theme = e.themes.find((t) => t.code === donnee.theme);
  if (!theme) return refus("Cette question n'existe pas.");
  return { ok: true, reponse, agent: theme.agent };
}

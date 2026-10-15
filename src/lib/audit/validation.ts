// Validation d'une réponse reçue du navigateur : jamais de confiance dans ce qui
// arrive. Le code doit désigner une donnée demandée ou une réponse de déclencheur, et la
// forme de la réponse doit correspondre à ce qui a été posé.
//
// Ce fichier n'importe que des types et reponse.ts : il se teste directement avec Node.

import type { CodeAgent, EnsembleDonnees } from "../donnees/schemas.ts";
import { estScalaire, reponseSchema, type Reponse } from "./reponse.ts";

export type Verdict =
  | { ok: true; reponse: Reponse; agent: CodeAgent | null }
  | { ok: false; message: string };

const refus = (message: string): Verdict => ({ ok: false, message });

const CLE_DECLENCHEUR = /^(D\d{2})(?:\.([a-z_]+))?$/;

export function validerReponse(e: EnsembleDonnees, cle: string, brut: unknown): Verdict {
  const analyse = reponseSchema.safeParse(brut);
  if (!analyse.success) return refus(analyse.error.issues[0]?.message ?? "Réponse invalide.");
  const reponse = analyse.data;

  const dec = CLE_DECLENCHEUR.exec(cle);
  if (dec) {
    const [, code, sous] = dec;
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
        break;
      case "choix":
        if (sous || typeof v !== "string" || !forme.options.some((o) => o.id === v)) return refus("Choix non reconnu.");
        break;
      case "oui_non_multiple":
        if (!forme.sousCles.some((s) => s.cle === (sous ?? "")) || (v !== "oui" && v !== "non")) return refus("Répondez par oui ou par non.");
        break;
    }
    return { ok: true, reponse, agent: null };
  }

  const donnee = e.donnees.find((d) => d.code === cle);
  if (!donnee || (donnee.mode !== "demandee" && donnee.mode !== "partagee")) return refus("Cette question n'existe pas.");
  if ((reponse.genre === "exact" || reponse.genre === "estimation") && !estScalaire(donnee.format)) {
    return refus("Cette question ne se répond pas par un seul chiffre.");
  }
  const theme = e.themes.find((t) => t.code === donnee.theme);
  if (!theme) return refus("Cette question n'existe pas.");
  return { ok: true, reponse, agent: theme.agent };
}

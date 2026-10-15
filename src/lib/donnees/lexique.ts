// Application du lexique : une même question s'affiche avec les mots du métier.
// La question et sa notation ne changent pas ; seul le mot affiché change
// (« demande » devient « demande de devis » pour un artisan).
//
// Un gabarit emploie les mots entre accolades : « Combien de {demande} recevez-vous ? ».
// Ce fichier n'importe que des types : il se teste directement avec Node.

import type { ProfilId } from "./schemas.ts";

type Mot = { mot: string; formes: Record<ProfilId, string | null> };

// Clé d'un mot du lexique dans un gabarit : minuscules, sans accent, « _ » entre les mots.
// « Montant du premier achat » devient montant_du_premier_achat.
export function cleLexique(mot: string): string {
  return mot
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function variablesDuGabarit(gabarit: string): string[] {
  return [...gabarit.matchAll(/\{([a-z0-9_]+)\}/g)].map((m) => m[1]);
}

export type Formulation =
  | { ok: true; texte: string }
  // Un mot n'existe pas pour ce profil (cellule « — ») : la question ne s'applique pas.
  | { ok: false; motsAbsents: string[] };

// Remplace chaque variable par sa forme pour le profil. Avec plusieurs profils
// (ex. B2B et Abonnement), le premier profil qui a une forme pour le mot l'emporte.
export function formuler(gabarit: string, profils: ProfilId[], lexique: Mot[]): Formulation {
  const parCle = new Map(lexique.map((m) => [cleLexique(m.mot), m]));
  const absents: string[] = [];
  const texte = gabarit.replace(/\{([a-z0-9_]+)\}/g, (_, cle: string) => {
    const mot = parCle.get(cle);
    const forme = mot ? profils.map((p) => mot.formes[p]).find((f) => f != null) : undefined;
    if (forme == null) {
      absents.push(cle);
      return "";
    }
    return forme.charAt(0).toLowerCase() + forme.slice(1);
  });
  return absents.length > 0 ? { ok: false, motsAbsents: absents } : { ok: true, texte };
}

// Libellé d'une question d'inscription pour ces profils : la formulation propre
// au profil si le document en fournit une, sinon le gabarit commun ; puis les mots
// du lexique. Si un mot manque pour ces profils, on garde le gabarit commun.
export function libelleQuestion(
  question: { libelle: string; parProfil: Partial<Record<ProfilId, string>> },
  profils: ProfilId[],
  lexique: Mot[]
): string {
  const propre = profils.map((p) => question.parProfil[p]).find((t) => t != null);
  const formule = formuler(propre ?? question.libelle, profils, lexique);
  if (formule.ok) return formule.texte.charAt(0).toUpperCase() + formule.texte.slice(1);
  return question.libelle;
}

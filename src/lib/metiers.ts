// Référentiel des métiers proposés à l'inscription : il vient de data/routage.json
// (CLAUDE.md section 5). Ajouter un métier, c'est ajouter une entrée à ce fichier.
import { ROUTAGE } from "./routage-donnees.ts";
import { metiersTries, trouverMetier } from "./routage.ts";

export const METIERS = metiersTries(ROUTAGE);

export function getMetier(id: string) {
  return trouverMetier(ROUTAGE, id);
}

export function getSousVariantes(metierId: string, ids: string[]) {
  const metier = getMetier(metierId);
  return (metier?.sousVariantes ?? []).filter((v) => ids.includes(v.id));
}

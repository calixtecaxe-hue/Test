// Comparaison de textes et de nombres pour vérifier qu'un extrait et un chiffre figurent vraiment
// dans une page. Fonctions pures, sans dépendance.

export function normaliserTexte(t: string): string {
  return t
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[   ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Nombres écrits à la française (1 250, 12,5) ou à l'anglaise (1,250 ; 12.5) lus dans un texte.
export function extraireNombres(t: string): number[] {
  const trouves: number[] = [];
  for (const m of t.replace(/[   ]/g, " ").matchAll(/\d{1,3}(?:[ .,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g)) {
    const brut = m[0];
    const variantes = new Set<string>();
    // Séparateurs de milliers : espace, point ou virgule suivis d'exactement trois chiffres.
    if (/^\d{1,3}(?:[ .,]\d{3})+(?:[.,]\d+)?$/.test(brut)) {
      const sansMilliers = brut.replace(/[ .,](?=\d{3}(?:\D|$))/g, "");
      variantes.add(sansMilliers.replace(",", "."));
    }
    variantes.add(brut.replace(/ /g, "").replace(",", "."));
    for (const v of variantes) {
      const n = Number(v);
      if (Number.isFinite(n)) trouves.push(n);
    }
  }
  return trouves;
}

export function contientNombre(t: string, valeur: number, tolerance = 1e-9): boolean {
  return extraireNombres(t).some((n) => Math.abs(n - valeur) <= tolerance);
}

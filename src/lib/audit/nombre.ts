// Lecture d'un nombre tapé par un dirigeant français.
//
//   « 1 250 » et « 1 250 » (espaces, y compris insécables)  → 1250
//   « 12,5 » et « 12.5 »                                     → 12,5
//   « 1.000 » et « 12.345.678 » (points de milliers)         → 1000 et 12345678
//   « 1,234.56 » ou « 1.234,56 » (milliers + décimales)      → 1234,56
//   « abc », « 1e999 », « 1,2,3 »                            → illisible (null)
//
// Un point suivi d'exactement trois chiffres est lu comme un séparateur de milliers : c'est
// l'usage le plus courant en saisie de montants. L'écran affiche la valeur retenue pour que
// le dirigeant voie ce qui est enregistré.
//
// Ce fichier n'a aucune dépendance : il se teste directement avec Node.

export function lireNombre(texte: string): number | null {
  let t = texte.trim().replace(/[\s  ]/g, "");
  if (t === "") return null;
  if (!/^[-+]?[\d.,]+$/.test(t)) return null;
  const signe = t.startsWith("-") ? -1 : 1;
  t = t.replace(/^[-+]/, "");
  if (!/\d/.test(t)) return null;

  const virgules = (t.match(/,/g) ?? []).length;
  const points = (t.match(/\./g) ?? []).length;
  let entier: string;
  let decimales = "";

  if (virgules > 0 && points > 0) {
    // Les deux apparaissent : le dernier est le séparateur décimal, l'autre sépare les milliers.
    const decimal = t.lastIndexOf(",") > t.lastIndexOf(".") ? "," : ".";
    const milliers = decimal === "," ? "." : ",";
    const [e, ...reste] = t.split(decimal);
    if (reste.length !== 1 || !/^\d+$/.test(reste[0])) return null;
    if (!groupesDeMilliersValides(e, milliers)) return null;
    entier = e.split(milliers).join("");
    decimales = reste[0];
  } else if (virgules > 0) {
    if (virgules > 1) return null;
    const [e, d] = t.split(",");
    if (!/^\d*$/.test(e) || !/^\d+$/.test(d)) return null;
    entier = e === "" ? "0" : e;
    decimales = d;
  } else if (points > 0) {
    if (groupesDeMilliersValides(t, ".")) entier = t.split(".").join("");
    else if (points === 1) {
      const [e, d] = t.split(".");
      if (!/^\d*$/.test(e) || !/^\d+$/.test(d)) return null;
      entier = e === "" ? "0" : e;
      decimales = d;
    } else return null;
  } else {
    entier = t;
  }
  const n = Number(decimales ? `${entier}.${decimales}` : entier);
  return Number.isFinite(n) ? signe * n : null;
}

// « 1.000 », « 12.345.678 » : un à trois chiffres, puis des groupes de trois exactement.
function groupesDeMilliersValides(t: string, sep: string): boolean {
  const g = t.split(sep);
  return g.length > 1 && /^\d{1,3}$/.test(g[0]) && g.slice(1).every((x) => /^\d{3}$/.test(x));
}

export function formaterNombre(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 6 }).format(n);
}

// Mise en forme d'un nombre au fil de la saisie (champ du dossier d'entreprise : chiffre d'affaires,
// nombre de personnes). « 100000 » s'affiche « 100 000 » ; le formulaire envoie la valeur brute « 100000 ».
//
// Ce que tape un dirigeant français, et ce qui est retenu :
//   « 60k », « 60 k€ », « 1,5k »   → 60 000, 60 000, 1 500 (k = mille ; le champ se réécrit aussitôt)
//   « 1.250,75 », « 1 250,75 »     → 1 250,75 (le point sépare les milliers quand une virgule suit)
//   « 1.250 »                      → 1 250 (un point suivi de trois chiffres sépare les milliers)
//   « 12.5 »                       → 12,5 (le point reste affiché tant que la saisie est en cours)
//   « -5000 »                      → -5 000 : le signe est gardé, et le formulaire dit pourquoi il refuse
// Mêmes règles que la lecture des réponses du questionnaire (src/lib/audit/nombre.ts).
//
// Ce fichier n'a aucune dépendance : il se teste directement avec Node.

// Séparateur de milliers : espace fine insécable, usage français.
export const SEPARATEUR = " ";

export type SaisieNombre = { affichage: string; brut: string; multiplie: boolean };

const groupes = (entier: string) => entier.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATEUR);

export function formaterSaisie(saisie: string, decimales: boolean): SaisieNombre {
  const negatif = /^\s*[-−]/.test(saisie);
  const signe = negatif ? "-" : "";

  // « 60k » : k (mille) en fin de saisie, avec ou sans espace ni « € ».
  const enMilliers = /\d[\d\s  .,]*\s*[kK]\s*€?\s*$/.test(saisie);
  if (enMilliers) {
    const n = valeur(saisie.replace(/[kK€]/g, ""), decimales);
    if (n !== null) {
      const total = Math.round(n * 1000 * 100) / 100;
      const [e, f] = String(total).split(".");
      const fraction = decimales && f ? f.slice(0, 2) : null;
      return { affichage: signe + groupes(e) + (fraction ? `,${fraction}` : ""), brut: signe + e + (fraction ? `.${fraction}` : ""), multiplie: true };
    }
  }

  const { entier, fraction, pointProvisoire } = decouper(saisie, decimales);
  let e = entier.replace(/^0+(?=\d)/, "");
  if (e === "" && fraction !== null) e = "0";
  const sep = pointProvisoire ? "." : ",";
  return {
    affichage: signe + groupes(e) + (fraction !== null ? `${sep}${fraction}` : ""),
    brut: (e ? signe : "") + e + (fraction ? `.${fraction}` : ""),
    multiplie: false,
  };
}

// Sépare la partie entière et les décimales (2 au plus, sauf avant « k »). pointProvisoire : un seul point suivi de 0 à 2
// chiffres, sans virgule ; il peut encore devenir un séparateur de milliers (« 1.2 », puis « 1.250 »).
function decouper(saisie: string, decimales: boolean, maxDecimales = 2): { entier: string; fraction: string | null; pointProvisoire: boolean } {
  if (!decimales) return { entier: saisie.replace(/\D/g, ""), fraction: null, pointProvisoire: false };
  const propre = saisie.replace(/[^\d,.]/g, "");
  const virgule = propre.lastIndexOf(",");
  const point = propre.lastIndexOf(".");
  let decimal = -1;
  let pointProvisoire = false;
  if (virgule >= 0 && virgule > point) decimal = virgule;
  else if (point >= 0 && virgule >= 0) decimal = point;
  else if (point >= 0) {
    const apres = propre.slice(point + 1);
    const plusieurs = propre.indexOf(".") !== point;
    if (!plusieurs && apres.length !== 3) {
      decimal = point;
      pointProvisoire = apres.length <= 2;
    }
  }
  if (decimal < 0) return { entier: propre.replace(/\D/g, ""), fraction: null, pointProvisoire: false };
  return {
    entier: propre.slice(0, decimal).replace(/\D/g, ""),
    fraction: propre.slice(decimal + 1).replace(/\D/g, "").slice(0, maxDecimales),
    pointProvisoire,
  };
}

// Valeur avant « k » : trois décimales comptent (« 2,345k » = 2 345).
function valeur(saisie: string, decimales: boolean): number | null {
  const { entier, fraction } = decouper(saisie, decimales, 3);
  if (!entier && !fraction) return null;
  const n = Number(`${entier || "0"}${fraction ? `.${fraction}` : ""}`);
  return Number.isFinite(n) ? n : null;
}

// Fin de saisie : le point provisoire devient la virgule décimale française (« 12.5 » → « 12,5 »).
export function finaliserSaisie(s: SaisieNombre): SaisieNombre {
  if (!/\.\d{0,2}$/.test(s.affichage)) return s;
  return { ...s, affichage: s.affichage.replace(/\.(\d{0,2})$/, (_, d: string) => (d ? `,${d}` : "")) };
}

// Contrôle du chiffre d'affaires mensuel avant l'envoi (dossier d'entreprise) ; le serveur refait le même.
export function erreurChiffreAffaires(brut: string): string | null {
  if (brut === "" || brut === "-" || Number.isNaN(Number(brut))) return "Indiquez un chiffre d'affaires mensuel, même approximatif.";
  if (Number(brut) < 0) return "Le chiffre d'affaires ne peut pas être négatif : indiquez le montant encaissé sur un mois, sans le signe moins.";
  return null;
}

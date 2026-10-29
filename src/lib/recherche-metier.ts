// Recherche d'un métier dans la liste de l'inscription : le dirigeant tape ses mots, pas ceux de la liste.
//
// - accents, majuscules, tirets et apostrophes ne comptent pas (« plombier chauffagiste » trouve
//   « Plombier-chauffagiste ») ;
// - les mots de la même famille se rapprochent par leur racine : formes féminines et noms de commerce
//   (« coiffeuse » → Coiffeur, « boulangerie » → Boulanger-pâtissier, « garagiste » → Garage et mécanicien) ;
// - un mot en cours de frappe suffit (« coif ») ;
// - les activités du métier et ses mots de recherche (data/routage.json) comptent comme ses propres mots ;
// - plusieurs mots : les métiers qui en reconnaissent le plus passent devant, et un mot que la liste ne
//   connaît pas (« coiffeuse à domicile ») n'empêche pas de trouver les autres.
//
// Ce fichier n'a aucune dépendance : il se teste directement avec Node.

export type OptionRecherchee = { valeur: string; libelle: string; mots?: string[] };
export type Trouvee<T extends OptionRecherchee> = { option: T; indice?: string };

const MOTS_VIDES = new Set(["a", "au", "aux", "d", "de", "des", "du", "en", "et", "l", "la", "le", "les", "ou", "par", "pour", "sur", "un", "une"]);

// Terminaisons retirées pour trouver la racine, des plus longues aux plus courtes (une seule par mot).
const TERMINAISONS = [
  "issements", "issement", "iennes", "ienne", "ements", "ement", "ations", "ation", "atrices", "atrice", "ateurs", "ateur",
  "euses", "euse", "eurs", "eur", "ieres", "iere", "iers", "ier", "ennes", "enne", "iens", "ien", "eries", "erie",
  "istes", "iste", "iques", "ique", "ions", "ion", "ies", "ie", "es", "e", "s", "x",
];

export function normaliser(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function racine(mot: string): string {
  for (const t of TERMINAISONS) {
    if (mot.endsWith(t) && mot.length - t.length >= 4) return mot.slice(0, -t.length);
  }
  return mot;
}

type Mot = { brut: string; racine: string };
const mots = (t: string): Mot[] => normaliser(t).split(" ").filter((m) => m && !MOTS_VIDES.has(m)).map((brut) => ({ brut, racine: racine(brut) }));

// 4 : même mot ; 3 : même racine ; 2 : l'un prolonge l'autre (mot en cours de frappe, ou forme plus longue
// du mot de la liste) ; 0 : rien.
function proximite(q: Mot, w: Mot): number {
  if (q.brut === w.brut) return 4;
  if (q.racine === w.racine) return 3;
  if (w.brut.startsWith(q.brut) || w.racine.startsWith(q.racine)) return 2;
  if (w.racine.length >= 4 && q.racine.startsWith(w.racine)) return 2;
  return 0;
}

export function rechercherMetiers<T extends OptionRecherchee>(options: T[], texte: string): Trouvee<T>[] {
  const tous = normaliser(texte).split(" ").filter(Boolean).map((brut) => ({ brut, racine: racine(brut) }));
  // « de », « et », une lettre seule (« e-commerce »)… ne comptent que s'ils sont tapés seuls (début de frappe).
  const pleins = tous.filter((m) => !MOTS_VIDES.has(m.brut) && m.brut.length > 1);
  const requete = pleins.length > 0 ? pleins : tous;
  if (requete.length === 0) return options.map((option) => ({ option }));

  const notees = options.map((option, rang) => {
    const sources = [{ texte: option.libelle, mots: mots(option.libelle), libelle: true }, ...(option.mots ?? []).map((m) => ({ texte: m, mots: mots(m), libelle: false }))];
    let reconnus = 0;
    let total = 0;
    let parLibelle = true;
    let indice: string | undefined;
    for (const q of requete) {
      let meilleur = 0;
      let source: (typeof sources)[number] | null = null;
      for (const s of sources) {
        const p = Math.max(0, ...s.mots.map((w) => proximite(q, w)));
        // À proximité égale, le libellé du métier l'emporte sur un mot de recherche.
        if (p > meilleur || (p === meilleur && p > 0 && s.libelle && !source?.libelle)) {
          meilleur = p;
          source = s;
        }
      }
      if (meilleur > 0 && source) {
        reconnus += 1;
        total += meilleur;
        if (!source.libelle) {
          parLibelle = false;
          indice ??= source.texte;
        }
      }
    }
    return { option, rang, reconnus, total, parLibelle, indice };
  });

  const max = Math.max(0, ...notees.map((n) => n.reconnus));
  if (max === 0) return [];
  return notees
    .filter((n) => n.reconnus === max)
    .sort((a, b) => b.total - a.total || Number(b.parLibelle) - Number(a.parLibelle) || a.rang - b.rang)
    .map(({ option, indice }) => (indice ? { option, indice } : { option }));
}

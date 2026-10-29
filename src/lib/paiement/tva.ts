// Numéro de TVA intracommunautaire d'une entreprise (facturation professionnelle). Fonctions pures,
// utilisables dans le navigateur comme sur le serveur. Seuls les numéros de l'Union européenne sont
// acceptés, comme chez le fournisseur de paiement (type « eu_vat »). Le contrôle porte sur la forme
// et, pour la France, sur la clé de contrôle ; il ne dit pas que le numéro existe au registre VIES.

// Forme du numéro (sans espaces) par préfixe de pays.
const FORMES: Record<string, RegExp> = {
  AT: /^ATU\d{8}$/,
  BE: /^BE[01]\d{9}$/,
  BG: /^BG\d{9,10}$/,
  CY: /^CY\d{8}[A-Z]$/,
  CZ: /^CZ\d{8,10}$/,
  DE: /^DE\d{9}$/,
  DK: /^DK\d{8}$/,
  EE: /^EE\d{9}$/,
  EL: /^EL\d{9}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^FI\d{8}$/,
  FR: /^FR[0-9A-Z]{2}\d{9}$/,
  HR: /^HR\d{11}$/,
  HU: /^HU\d{8}$/,
  IE: /^IE(\d[A-Z0-9+*]\d{5}[A-Z]{1,2}|\d{7}[A-W][A-I]?)$/,
  IT: /^IT\d{11}$/,
  LT: /^LT(\d{9}|\d{12})$/,
  LU: /^LU\d{8}$/,
  LV: /^LV\d{11}$/,
  MT: /^MT\d{8}$/,
  NL: /^NL\d{9}B\d{2}$/,
  PL: /^PL\d{10}$/,
  PT: /^PT\d{9}$/,
  RO: /^RO\d{2,10}$/,
  SE: /^SE\d{12}$/,
  SI: /^SI\d{8}$/,
  SK: /^SK\d{10}$/,
};

// Retire espaces, points et tirets, met en majuscules : « fr 64 443 061 841 » → « FR64443061841 ».
export function normaliserTva(saisie: string): string {
  return saisie.replace(/[\s.\-]/g, "").toUpperCase();
}

export type ResultatTva = { ok: true; numero: string } | { ok: false; message: string };

export function verifierTva(saisie: string): ResultatTva {
  const numero = normaliserTva(saisie);
  const pays = numero.slice(0, 2);
  const forme = FORMES[pays];
  if (!forme) {
    return { ok: false, message: "Indiquez un numéro de TVA intracommunautaire de l'Union européenne, par exemple FR 64 443 061 841." };
  }
  if (!forme.test(numero)) {
    return { ok: false, message: pays === "FR" ? "Un numéro de TVA français compte FR, deux caractères de contrôle et les 9 chiffres du SIREN." : "Ce numéro de TVA n'a pas la forme attendue pour ce pays." };
  }
  if (pays === "FR") {
    const cle = numero.slice(2, 4);
    // Clé numérique : (12 + 3 × (SIREN modulo 97)) modulo 97. Les clés alphabétiques ne sont pas contrôlées.
    if (/^\d{2}$/.test(cle)) {
      const attendue = (12 + 3 * (Number(numero.slice(4)) % 97)) % 97;
      if (Number(cle) !== attendue) return { ok: false, message: "La clé de contrôle de ce numéro de TVA est incorrecte. Vérifiez la saisie." };
    }
  }
  return { ok: true, numero };
}

// Nom de l'entreprise et numéro de TVA, tous deux facultatifs. Un numéro sans nom est refusé : la
// facture doit porter les deux.
export type Facturation = { raisonSociale: string | null; numeroTva: string | null };

export function verifierFacturation(entree: { raisonSociale?: string | null; numeroTva?: string | null }): { ok: true; facturation: Facturation } | { ok: false; champ: "raisonSociale" | "numeroTva"; message: string } {
  const nom = (entree.raisonSociale ?? "").trim().replace(/\s+/g, " ");
  const brut = (entree.numeroTva ?? "").trim();
  if (nom.length > 120) return { ok: false, champ: "raisonSociale", message: "Le nom de l'entreprise ne dépasse pas 120 caractères." };
  if (brut === "") return { ok: true, facturation: { raisonSociale: nom || null, numeroTva: null } };
  if (nom === "") return { ok: false, champ: "raisonSociale", message: "Indiquez le nom de l'entreprise : il figurera sur la facture avec le numéro de TVA." };
  const tva = verifierTva(brut);
  if (!tva.ok) return { ok: false, champ: "numeroTva", message: tva.message };
  return { ok: true, facturation: { raisonSociale: nom, numeroTva: tva.numero } };
}

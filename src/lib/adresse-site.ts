// Adresse publique du site, pour les liens envoyés hors du site (retours de paiement, e-mails). Lue dans
// l'environnement, jamais dans la requête : un en-tête Host falsifié ne peut pas détourner un lien.
export function adresseSite(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

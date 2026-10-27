import type { Reponse } from "@/lib/audit/reponse";

// Sauvegarde continue : chaque réponse part au serveur dès qu'elle est donnée.
// Renvoie un message d'erreur à afficher, ou null si tout s'est bien passé.
// `rapide` : envoi qui survit à la fermeture de la page (keepalive), pour ne rien perdre en partant.
// `preremplie` : le chiffre est celui que CAXE propose d'après le détail déjà donné (le serveur le revérifie).
export async function enregistrerReponse(cle: string, reponse: Reponse | null, rapide = false, preremplie = false): Promise<string | null> {
  try {
    const r = await fetch("/api/audit/reponses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cle, reponse, ...(preremplie ? { preremplie: true } : {}) }),
      keepalive: rapide,
    });
    if (r.ok) return null;
    const corps = (await r.json().catch(() => null)) as { erreur?: string } | null;
    return corps?.erreur ?? "Votre réponse n'a pas pu être enregistrée. Réessayez.";
  } catch {
    return "Connexion impossible : votre réponse n'a pas été enregistrée. Réessayez.";
  }
}

// Brouillon d'un tableau à total imposé : la saisie partielle est gardée sur le compte, sans entrer dans le calcul.
export async function enregistrerBrouillon(cle: string, saisie: Record<string, string> | null, rapide = false): Promise<void> {
  try {
    await fetch("/api/audit/brouillon", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cle, saisie }),
      keepalive: rapide,
    });
  } catch {
    // Connexion coupée : la saisie reste à l'écran ; le brouillon est un filet, pas une réponse.
  }
}

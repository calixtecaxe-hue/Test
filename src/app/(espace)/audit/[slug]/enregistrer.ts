import type { Reponse } from "@/lib/audit/reponse";

// Sauvegarde continue : chaque réponse part au serveur dès qu'elle est donnée.
// Renvoie un message d'erreur à afficher, ou null si tout s'est bien passé.
// `rapide` : envoi qui survit à la fermeture de la page (keepalive), pour ne rien perdre en partant.
export async function enregistrerReponse(cle: string, reponse: Reponse | null, rapide = false): Promise<string | null> {
  try {
    const r = await fetch("/api/audit/reponses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cle, reponse }),
      keepalive: rapide,
    });
    if (r.ok) return null;
    const corps = (await r.json().catch(() => null)) as { erreur?: string } | null;
    return corps?.erreur ?? "Votre réponse n'a pas pu être enregistrée. Réessayez.";
  } catch {
    return "Connexion impossible : votre réponse n'a pas été enregistrée. Réessayez.";
  }
}

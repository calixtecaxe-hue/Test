// Comment se rédige un rapport.
// ia : appel réel à l'API Claude (clé ANTHROPIC_API_KEY ou ANTHROPIC_AUTH_TOKEN dans l'environnement, jamais dans le dépôt).
// simulation : texte de test produit sans IA à partir du dossier, annoncé comme tel à l'écran ; hors production, ou forcé par
//   RAPPORT_MODE=simulation (serveur de test).
// indisponible : production sans clé ; le dirigeant voit que la rédaction n'est pas encore ouverte, jamais un faux rapport.
//
// Ce fichier n'importe rien : il se teste directement avec Node.

export type ModeRapport = "ia" | "simulation" | "indisponible";

export function modeRapport(env: { ANTHROPIC_API_KEY?: string; ANTHROPIC_AUTH_TOKEN?: string; RAPPORT_MODE?: string; NODE_ENV?: string }): ModeRapport {
  const cle = Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  if (env.RAPPORT_MODE === "simulation") return "simulation";
  if (env.RAPPORT_MODE === "ia") return cle ? "ia" : "indisponible";
  if (cle) return "ia";
  return env.NODE_ENV !== "production" ? "simulation" : "indisponible";
}

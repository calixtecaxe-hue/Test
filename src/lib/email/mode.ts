// Mode d'envoi des e-mails, sur le modèle du paiement (src/lib/paiement/etat.ts).
//
// smtp : envoi réel par le serveur SMTP du fournisseur choisi (SMTP_HOST et suivants).
// demonstration : rien ne part ; le message est écrit dans un dossier local et dans le journal du
//   serveur, pour essayer le parcours sans fournisseur. Jamais en production, sauf EMAIL_MODE forcé
//   pour un environnement de test.
// indisponible : production sans serveur SMTP ; la demande est acceptée sans rien envoyer et
//   l'erreur est écrite dans le journal du serveur.
//
// Ce fichier n'a aucune dépendance : il se teste directement avec Node.

export type ModeEmail = "smtp" | "demonstration" | "indisponible";

export function modeEmail(env: { SMTP_HOST?: string; EMAIL_MODE?: string; NODE_ENV?: string }): ModeEmail {
  if (env.EMAIL_MODE === "demonstration") return "demonstration";
  if (env.SMTP_HOST) return "smtp";
  return env.NODE_ENV !== "production" ? "demonstration" : "indisponible";
}

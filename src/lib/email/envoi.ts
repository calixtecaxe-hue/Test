// Envoi d'un e-mail (serveur uniquement : les accès SMTP restent dans l'environnement).
//
// SMTP convient à la plupart des fournisseurs (Brevo, Mailjet, OVH, Resend, Postmark, Amazon SES…) :
// SMTP_HOST, SMTP_PORT (587 par défaut, 465 = connexion chiffrée d'emblée), SMTP_USER, SMTP_PASSWORD,
// et EMAIL_EXPEDITEUR, l'adresse qui envoie (« CAXE <adresse@domaine.fr> »).

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { modeEmail } from "./mode.ts";

export type Courriel = { a: string; sujet: string; texte: string; html: string };
export type ResultatEnvoi = "envoye" | "demonstration" | "indisponible";

let transport: Transporter | null = null;
function transporteur(): Transporter {
  const port = Number(process.env.SMTP_PORT || 587);
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" } : undefined,
  });
  return transport;
}

export async function envoyerCourriel(c: Courriel): Promise<ResultatEnvoi> {
  const mode = modeEmail(process.env);
  if (mode === "smtp") {
    const expediteur = process.env.EMAIL_EXPEDITEUR;
    if (!expediteur) throw new Error("EMAIL_EXPEDITEUR n'est pas défini : l'adresse qui envoie les e-mails manque.");
    await transporteur().sendMail({ from: expediteur, to: c.a, subject: c.sujet, text: c.texte, html: c.html });
    return "envoye";
  }
  if (mode === "demonstration") {
    // Un fichier par message, relu par les contrôles automatiques (scripts/audit-client.mjs).
    const dossier = process.env.EMAIL_DOSSIER_DEMONSTRATION || ".emails-demonstration";
    await mkdir(dossier, { recursive: true });
    const nom = `${Date.now()}-${c.a.replace(/[^a-z0-9]+/gi, "_")}.json`;
    await writeFile(path.join(dossier, nom), JSON.stringify({ ...c, envoyeLe: new Date().toISOString() }, null, 2));
    console.info(`[e-mail de démonstration, non envoyé] à ${c.a} : ${c.sujet} (${path.join(dossier, nom)})`);
    return "demonstration";
  }
  console.error(`E-mail non envoyé à ${c.a} (« ${c.sujet} ») : aucun serveur SMTP n'est configuré (SMTP_HOST).`);
  return "indisponible";
}

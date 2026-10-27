// « Mot de passe oublié » : jeton du lien envoyé par e-mail, état d'une demande et texte du message.
//
// Le jeton (32 octets aléatoires) n'existe que dans le lien ; la base ne garde que son empreinte
// SHA-256 : une copie de la base ne permet pas de réinitialiser un compte. Un lien vaut une heure et
// une seule fois ; au plus trois demandes par compte et par heure, pour qu'on ne puisse pas remplir la
// boîte d'un dirigeant.
//
// Ce fichier n'importe que node:crypto : il se teste directement avec Node.

import { createHash, randomBytes } from "node:crypto";

export const DUREE_VALIDITE_MS = 60 * 60 * 1000;
export const MAX_DEMANDES_PAR_HEURE = 3;

export function empreinteDe(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

export function nouveauJeton(): { jeton: string; empreinte: string } {
  const jeton = randomBytes(32).toString("base64url");
  return { jeton, empreinte: empreinteDe(jeton) };
}

// Forme d'un jeton émis par nouveauJeton : on ne cherche pas en base une chaîne qui ne peut pas en être un.
export function jetonBienForme(jeton: unknown): jeton is string {
  return typeof jeton === "string" && /^[A-Za-z0-9_-]{43}$/.test(jeton);
}

export type EtatDemande = "valide" | "expiree" | "utilisee" | "inconnue";

export function etatDemande(d: { expireLe: Date; utiliseeLe: Date | null } | null, maintenant: Date): EtatDemande {
  if (!d) return "inconnue";
  if (d.utiliseeLe) return "utilisee";
  return d.expireLe.getTime() > maintenant.getTime() ? "valide" : "expiree";
}

// Ce que voit le dirigeant quand le lien ne sert plus.
export const MESSAGE_LIEN: Record<Exclude<EtatDemande, "valide">, string> = {
  expiree: "Ce lien a expiré : il n'est valable qu'une heure. Demandez-en un nouveau.",
  utilisee: "Ce lien a déjà servi : un lien ne permet de changer le mot de passe qu'une fois. Demandez-en un nouveau si besoin.",
  inconnue: "Ce lien n'est pas valable. Vérifiez qu'il est complet, ou demandez-en un nouveau.",
};

const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function courrielReinitialisation(lien: string): { sujet: string; texte: string; html: string } {
  const sujet = "Choisir un nouveau mot de passe CAXE";
  const lignes = [
    "Bonjour,",
    "",
    "Vous avez demandé à changer le mot de passe de votre compte CAXE. Pour choisir un nouveau mot de passe, ouvrez ce lien :",
    "",
    lien,
    "",
    "Ce lien est valable une heure et ne sert qu'une fois.",
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe ne change pas.",
    "",
    "CAXE",
  ];
  const l = echapper(lien);
  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#F7F2E6;font-family:Inter,Arial,sans-serif;color:#07111B;">
<div style="max-width:520px;margin:0 auto;background:#FFFDF8;border:1px solid #E4DCC8;border-radius:12px;padding:28px;">
<p style="margin:0 0 16px;">Bonjour,</p>
<p style="margin:0 0 20px;line-height:1.5;">Vous avez demandé à changer le mot de passe de votre compte CAXE. Pour choisir un nouveau mot de passe, utilisez ce bouton :</p>
<p style="margin:0 0 20px;"><a href="${l}" style="display:inline-block;background:#1E4E96;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:4px;font-weight:600;">Choisir un nouveau mot de passe</a></p>
<p style="margin:0 0 20px;line-height:1.5;font-size:14px;">Ce lien est valable une heure et ne sert qu'une fois. Si le bouton ne s'ouvre pas, copiez cette adresse dans votre navigateur :<br><a href="${l}" style="color:#1E4E96;word-break:break-all;">${l}</a></p>
<p style="margin:0 0 20px;line-height:1.5;font-size:14px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe ne change pas.</p>
<p style="margin:0;">CAXE</p>
</div></body></html>`;
  return { sujet, texte: lignes.join("\n"), html };
}

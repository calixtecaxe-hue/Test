// Vérification d'un chiffre dans la page citée par l'agent (cahier « références de marché », 4.B) :
// le serveur relit lui-même la page et vérifie que l'extrait et le chiffre y figurent. Sinon, rejet.
//
// Partie pure (texte) : `verifierExtrait`, `detecterInstructions`, `extraireTexteHtml`.
// Partie réseau : `lirePage`, avec garde-fous (https seulement, pas d'adresse interne, taille et délai
// bornés, redirections revérifiées). Le contenu d'une page est une donnée, jamais une instruction.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { contientNombre, normaliserTexte } from "./texte.ts";

export type Page = { ok: true; texte: string; typeContenu: string } | { ok: false; motif: string };
export type LecteurPage = (url: string) => Promise<Page>;

// --- Partie pure ------------------------------------------------------------------------

const ENTITES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&rsquo;": "'", "&lsquo;": "'", "&laquo;": "«", "&raquo;": "»", "&euro;": "€" };

export function extraireTexteHtml(html: string): string {
  return html
    .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos|rsquo|lsquo|laquo|raquo|euro);|&#39;/g, (e) => ENTITES[e] ?? " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export type ResultatExtrait = { ok: true } | { ok: false; motif: string };

// L'extrait doit figurer dans la page (comparaison sans accents, casse ni espaces insécables), et le
// chiffre retenu doit figurer dans l'extrait.
export function verifierExtrait(page: string, extrait: string, valeurSource: number): ResultatExtrait {
  const p = normaliserTexte(page);
  const e = normaliserTexte(extrait);
  if (e.length < 10) return { ok: false, motif: "L'extrait cité est trop court pour être vérifié." };
  if (!p.includes(e)) return { ok: false, motif: "L'extrait cité ne figure pas dans la page." };
  if (!contientNombre(extrait, valeurSource)) return { ok: false, motif: "Le chiffre retenu ne figure pas dans l'extrait cité." };
  return { ok: true };
}

const MOTIFS_INSTRUCTION = [
  /ignore (?:all |any )?(?:previous|prior|above) (?:instructions|prompts?)/i,
  /ignore[zr]? (?:toutes? )?(?:les )?instructions (?:précédentes|ci-dessus)/i,
  /\b(?:system|developer) (?:prompt|message)\b/i,
  /\bvous êtes (?:maintenant )?un (?:assistant|agent|modèle)\b/i,
  /\byou are (?:now )?(?:an? )?(?:ai|assistant|language model)\b/i,
  /\b(?:réponds?|répondez|answer) (?:uniquement|only) (?:par|with)\b/i,
  /<\s*\/?\s*(?:system|instructions?)\s*>/i,
];

// Phrases qui ressemblent à des ordres adressés à un modèle : signalées dans le journal, jamais suivies.
export function detecterInstructions(texte: string): string[] {
  const trouvees: string[] = [];
  for (const m of MOTIFS_INSTRUCTION) {
    const r = m.exec(texte);
    if (r) trouvees.push(texte.slice(Math.max(0, r.index - 20), r.index + r[0].length + 40).replace(/\s+/g, " ").trim());
  }
  return trouvees;
}

// --- Partie réseau ----------------------------------------------------------------------

function adressePrivee(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

export async function urlAutorisee(url: string): Promise<{ ok: true; url: URL } | { ok: false; motif: string }> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, motif: "Adresse illisible." };
  }
  if (u.protocol !== "https:") return { ok: false, motif: "Seules les adresses https sont lues." };
  if (u.username || u.password) return { ok: false, motif: "Adresse avec identifiants refusée." };
  const h = u.hostname.replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return { ok: false, motif: "Adresse interne refusée." };
  if (isIP(h) !== 0) return adressePrivee(h) ? { ok: false, motif: "Adresse interne refusée." } : { ok: true, url: u };
  try {
    const resolues = await lookup(h, { all: true });
    if (resolues.length === 0 || resolues.some((r) => adressePrivee(r.address))) return { ok: false, motif: "Le nom de domaine mène à une adresse interne." };
  } catch {
    return { ok: false, motif: "Le nom de domaine ne se résout pas." };
  }
  return { ok: true, url: u };
}

export type OptionsLecture = { delaiSecondes: number; tailleMaxOctets: number; extrairePdf: (octets: Uint8Array) => Promise<string> };

export function lecteurReseau(o: OptionsLecture): LecteurPage {
  return async (url) => {
    let courante = url;
    for (let saut = 0; saut <= 3; saut++) {
      const autorise = await urlAutorisee(courante);
      if (!autorise.ok) return { ok: false, motif: autorise.motif };
      const controle = new AbortController();
      const minuteur = setTimeout(() => controle.abort(), o.delaiSecondes * 1000);
      try {
        const reponse = await fetch(autorise.url, { redirect: "manual", signal: controle.signal, headers: { "user-agent": "CAXE-references/1.0", accept: "text/html,application/pdf,text/plain" } });
        if (reponse.status >= 300 && reponse.status < 400) {
          const suite = reponse.headers.get("location");
          if (!suite) return { ok: false, motif: "Redirection sans destination." };
          courante = new URL(suite, autorise.url).toString();
          continue;
        }
        if (!reponse.ok) return { ok: false, motif: `La page répond ${reponse.status}.` };
        const typeContenu = (reponse.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        const octets = await lireBorne(reponse, o.tailleMaxOctets);
        if (octets === null) return { ok: false, motif: "La page dépasse la taille maximale lue." };
        if (typeContenu === "application/pdf") return { ok: true, texte: await o.extrairePdf(octets), typeContenu };
        if (typeContenu === "text/html" || typeContenu === "application/xhtml+xml") return { ok: true, texte: extraireTexteHtml(new TextDecoder("utf-8").decode(octets)), typeContenu };
        if (typeContenu === "text/plain") return { ok: true, texte: new TextDecoder("utf-8").decode(octets), typeContenu };
        return { ok: false, motif: `Type de contenu non lu : ${typeContenu || "inconnu"}.` };
      } catch (e) {
        return { ok: false, motif: e instanceof Error && e.name === "AbortError" ? "La page met trop de temps à répondre." : "La page n'a pas pu être lue." };
      } finally {
        clearTimeout(minuteur);
      }
    }
    return { ok: false, motif: "Trop de redirections." };
  };
}

async function lireBorne(reponse: Response, max: number): Promise<Uint8Array | null> {
  const lecteur = reponse.body?.getReader();
  if (!lecteur) return new Uint8Array();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await lecteur.cancel();
      return null;
    }
    morceaux.push(value);
  }
  const tout = new Uint8Array(total);
  let pos = 0;
  for (const m of morceaux) {
    tout.set(m, pos);
    pos += m.byteLength;
  }
  return tout;
}

import type { Reponse } from "@/lib/audit/reponse";

// Sauvegarde continue : chaque réponse part au serveur dès qu'elle est donnée.
// Renvoie un message d'erreur à afficher, ou null si tout s'est bien passé.
// `rapide` : envoi qui survit à la fermeture de la page (keepalive), pour ne rien perdre en partant.
// `preremplie` : le chiffre est celui que CAXE propose d'après le détail déjà donné (le serveur le revérifie).
//
// Coupure du réseau : la réponse reste gardée dans la page et repart seule, au retour de la connexion
// (événement « online ») et à intervalles (5 s, puis jusqu'à 30 s) ; le message HORS_LIGNE le dit à la
// question, et le navigateur prévient si l'on ferme la page avant l'envoi. Les envois d'une même question
// partent dans l'ordre : une réponse renvoyée n'écrase jamais une réponse plus récente.
export const HORS_LIGNE = "Pas de connexion : votre réponse est gardée sur cette page et partira seule dès le retour de la connexion.";

type Resultat = { ok: true } | { ok: false; erreur: string; reseau: boolean };
type EnAttente = { reponse: Reponse | null; preremplie: boolean };

const enAttente = new Map<string, EnAttente>();
const files = new Map<string, Promise<unknown>>();
const ecouteurs = new Set<(cle: string, erreur: string | null) => void>();
let minuteur: ReturnType<typeof setTimeout> | null = null;
let delai = 5000;

// Les envois d'une même clé s'enchaînent : le suivant attend que le précédent ait abouti ou échoué.
function enFile<T>(cle: string, envoi: () => Promise<T>): Promise<T> {
  const suite = (files.get(cle) ?? Promise.resolve()).then(envoi, envoi);
  files.set(cle, suite);
  void suite.finally(() => { if (files.get(cle) === suite) files.delete(cle); });
  return suite;
}

async function envoyerAuServeur(cle: string, reponse: Reponse | null, rapide: boolean, preremplie: boolean): Promise<Resultat> {
  try {
    const r = await fetch("/api/audit/reponses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cle, reponse, ...(preremplie ? { preremplie: true } : {}) }),
      keepalive: rapide,
    });
    if (r.ok) return { ok: true };
    const corps = (await r.json().catch(() => null)) as { erreur?: string } | null;
    // Serveur injoignable derrière un relais (502, 503, 504) : comme une coupure, on renvoie plus tard.
    if (r.status >= 502 && r.status <= 504) return { ok: false, erreur: HORS_LIGNE, reseau: true };
    return { ok: false, erreur: corps?.erreur ?? "Votre réponse n'a pas pu être enregistrée. Réessayez.", reseau: false };
  } catch {
    return { ok: false, erreur: HORS_LIGNE, reseau: true };
  }
}

export async function enregistrerReponse(cle: string, reponse: Reponse | null, rapide = false, preremplie = false): Promise<string | null> {
  // Une réponse plus récente remplace celle qui attendait le retour du réseau.
  enAttente.delete(cle);
  const r = await enFile(cle, () => envoyerAuServeur(cle, reponse, rapide, preremplie));
  if (r.ok) return null;
  if (r.reseau && !enAttente.has(cle)) {
    enAttente.set(cle, { reponse, preremplie });
    programmerRenvoi();
  }
  return r.erreur;
}

function programmerRenvoi() {
  if (typeof window === "undefined" || minuteur || enAttente.size === 0) return;
  minuteur = setTimeout(() => void renvoyer(), delai);
}

async function renvoyer() {
  if (minuteur) clearTimeout(minuteur);
  minuteur = null;
  for (const [cle, e] of [...enAttente]) {
    if (enAttente.get(cle) !== e) continue;
    const r = await enFile(cle, () => envoyerAuServeur(cle, e.reponse, false, e.preremplie));
    // Remplacée pendant l'envoi : la nouvelle réponse a sa propre suite.
    if (enAttente.get(cle) !== e) continue;
    if (r.ok || !r.reseau) {
      enAttente.delete(cle);
      for (const f of ecouteurs) f(cle, r.ok ? null : r.erreur);
      continue;
    }
    delai = Math.min(delai * 2, 30000);
    programmerRenvoi();
    return;
  }
  delai = 5000;
}

// Une question (ou le questionnaire) apprend qu'une réponse gardée est partie (null) ou a été refusée (message).
export function suivreRenvois(f: (cle: string, erreur: string | null) => void): () => void {
  ecouteurs.add(f);
  return () => {
    ecouteurs.delete(f);
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    delai = 5000;
    void renvoyer();
  });
  window.addEventListener("beforeunload", (event) => {
    if (enAttente.size === 0) return;
    event.preventDefault();
    event.returnValue = "";
  });
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

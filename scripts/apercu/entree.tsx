// Aperçu du questionnaire : le VRAI code de l'application (cartes de questions, assemblage, règles d'affichage, validation des
// réponses) tourne dans le navigateur, sans serveur. Seul l'enregistrement est simulé : les réponses restent dans l'onglet
// (sessionStorage) et ne partent nulle part. Construit par scripts/apercu/construire.mjs.

import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Questionnaire } from "../../src/app/(espace)/audit/[slug]/questionnaire";
import { ENSEMBLE } from "../../src/lib/audit/donnees-audit";
import { preparerQuestionnaire } from "../../src/lib/audit/preparation";
import { prereponseDe } from "../../src/lib/audit/prereponse";
import { validerReponse } from "../../src/lib/audit/validation";
import type { Reponses } from "../../src/lib/audit/reponse";
import type { CodeAgent } from "../../src/lib/donnees/schemas";
import { surRafraichir } from "./shim-navigation";

// --- Le compte de démonstration : un électricien (profil artisan / chantier), 4 personnes, 7 ans d'ancienneté ---------------------------
const PROFILS = ["chantier"] as const;
const CLE_ETAT = "caxe-apercu-etat-v1";
const CLE_NIVEAU = "caxe-apercu-niveau";

type Etat = { reponses: Reponses; brouillons: Record<string, Record<string, string>>; preremplies: string[] };

function lireEtat(): Etat {
  try {
    const brut = sessionStorage.getItem(CLE_ETAT);
    if (brut) return JSON.parse(brut) as Etat;
  } catch { /* stockage indisponible : l'état reste en mémoire */ }
  return { reponses: {}, brouillons: {}, preremplies: [] };
}
const etat: Etat = lireEtat();
const garder = () => { try { sessionStorage.setItem(CLE_ETAT, JSON.stringify(etat)); } catch { /* idem */ } };

function niveau(): "essentiel" | "approfondi" {
  try { return sessionStorage.getItem(CLE_NIVEAU) === "approfondi" ? "approfondi" : "essentiel"; } catch { return "essentiel"; }
}

// Un chiffre proposé d'après le détail se met à jour quand le détail change, tant que le dirigeant ne l'a pas corrigé.
function rafraichirPrereponses() {
  for (const cle of etat.preremplies) {
    const propose = prereponseDe(ENSEMBLE.prereponses, cle, etat.reponses);
    if (propose) etat.reponses[cle] = { genre: "exact", valeur: propose.total };
  }
}

// --- Le « serveur » : mêmes contrôles que l'application, réponses gardées dans l'onglet -------------------------------------------------
function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json" } });
}

const fetchReel = window.fetch.bind(window);
window.fetch = async (entree: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof entree === "string" ? entree : entree instanceof URL ? entree.pathname : entree.url;
  const chemin = url.replace(/^https?:\/\/[^/]+/, "");
  const corps = init?.body ? JSON.parse(String(init.body)) : {};
  if (chemin === "/api/audit/reponses") {
    const { cle, reponse, preremplie } = corps as { cle: string; reponse: unknown; preremplie?: boolean };
    if (reponse === null) {
      delete etat.reponses[cle];
      delete etat.brouillons[cle];
      etat.preremplies = etat.preremplies.filter((c) => c !== cle);
      garder();
      return json({ ok: true });
    }
    const verdict = validerReponse(ENSEMBLE, cle, reponse, etat.reponses, null);
    if (!verdict.ok) return json({ erreur: verdict.message }, 400);
    const propose = preremplie === true ? prereponseDe(ENSEMBLE.prereponses, cle, etat.reponses) : null;
    const r = verdict.reponse as { genre?: string; valeur?: number };
    etat.preremplies = etat.preremplies.filter((c) => c !== cle);
    if (propose && r.genre === "exact" && r.valeur === propose.total) etat.preremplies.push(cle);
    etat.reponses[cle] = verdict.reponse;
    delete etat.brouillons[cle];
    rafraichirPrereponses();
    garder();
    return json({ ok: true });
  }
  if (chemin === "/api/audit/brouillon") {
    const { cle, saisie } = corps as { cle: string; saisie: Record<string, string> | null };
    if (saisie === null) delete etat.brouillons[cle];
    else etat.brouillons[cle] = saisie;
    garder();
    return json({ ok: true });
  }
  return fetchReel(entree, init);
};

// --- L'écran --------------------------------------------------------------------------------------------------------------------
function Apercu({ agent }: { agent: CodeAgent }) {
  const [version, setVersion] = useState(0);
  useEffect(() => surRafraichir(() => setVersion((v) => v + 1)), []);
  const prep = useMemo(() => {
    rafraichirPrereponses();
    const detail = new Map(ENSEMBLE.prereponses.regles.map((r) => [r.donnee, r.detail]));
    return preparerQuestionnaire(ENSEMBLE, {
      agent,
      profils: [...PROFILS],
      taille: "equipe_2_5",
      niveau: niveau(),
      reponses: etat.reponses,
      brouillons: new Map(Object.entries(etat.brouillons)),
      preremplies: new Map(etat.preremplies.filter((c) => detail.has(c)).map((c) => [c, detail.get(c)!])),
      ancienneteMois: 84,
      exclusions: null,
      vocabulaire: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, agent]);
  return (
    <Questionnaire
      donneesLues={prep.donneesLues}
      declencheurs={prep.declencheurs}
      themes={prep.themes}
      reponsesInitiales={prep.reponsesInitiales}
      masques={prep.masques}
      manquantes={prep.manquantes}
      libellesLignes={prep.libellesLignes}
    />
  );
}

const racine = document.getElementById("apercu-questionnaire");
if (racine) createRoot(racine).render(<Apercu agent={racine.getAttribute("data-agent") as CodeAgent} />);

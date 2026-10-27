// Outils communs aux contrôles de la vérification (comptes fictifs, base, résultats). Serveur de test lancé :
//   AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration EMAIL_MODE=demonstration npx next start -p 3100
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
export const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
export const B = process.env.BASE ?? "http://127.0.0.1:3100";
const dbUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)[1].split("?")[0];
export const sql = (q) => execFileSync("psql", [dbUrl, "-At", "-c", q], { encoding: "utf8" }).trim();
export const MDP = "motdepasse-verification-2026";

export const AGENTS = {
  ACQ: { code: "ACQUISITION_CA", slug: "acquisition-chiffre-affaires", objectif: { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 6 } },
  FIN: { code: "FINANCE_RENTABILITE", slug: "finance-rentabilite", objectif: { quoi: "améliorer ma marge", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 6 } },
  RH: { code: "RH_ORGANISATION", slug: "rh-organisation", objectif: { quoi: "clarifier les rôles et les responsabilités", reussite: "chacun sait ce qu'il doit faire sans me solliciter", delaiMois: 3, choix: "rh-roles" } },
  COM: { code: "COMM_CREATION", slug: "comm-creation-contenu", objectif: { quoi: "augmenter mon taux de conversion", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 3, choix: "com-conversion" } },
};

// Résultats : chaque contrôle a un identifiant, ce qui est attendu, et ce qui a été observé.
export function journal(nom) {
  const resultats = [];
  const controle = (id, attendu, conforme, observe = "") => {
    resultats.push({ id, attendu, conforme: !!conforme, observe: String(observe ?? "").slice(0, 400) });
    console.log(`${conforme ? "conforme" : "ÉCART   "}  ${id.padEnd(7)} ${attendu}${conforme ? "" : ` — observé : ${String(observe).slice(0, 200)}`}`);
  };
  const ecrire = (dossier) => {
    mkdirSync(dossier, { recursive: true });
    writeFileSync(`${dossier}/${nom}.json`, JSON.stringify({ le: new Date().toISOString(), resultats }, null, 1));
    const ecarts = resultats.filter((r) => !r.conforme);
    console.log(`\n${resultats.length} contrôles, ${resultats.length - ecarts.length} conformes, ${ecarts.length} écart(s)${ecarts.length ? ` : ${ecarts.map((r) => r.id).join(", ")}` : ""}.`);
    return ecarts.length;
  };
  return { controle, ecrire, resultats };
}

// Compte fictif complet : métier, formule, paiement de démonstration, dossier, niveau, objectifs.
export async function creerCompte(navigateur, { metier = "electricien", sousVariantes = [], agents = ["ACQ", "FIN", "RH", "COM"], niveau = "APPROFONDI", effectif = 4, creation = "2019-03-01", viewport = { width: 1280, height: 1000 } } = {}) {
  const email = `verif.${Date.now()}.${Math.floor(Math.random() * 1e5)}@example.com`;
  const contexte = await navigateur.newContext({ viewport, reducedMotion: "reduce" });
  const page = await contexte.newPage();
  const ins = await fetch(B + "/api/inscription", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, motDePasse: MDP }) });
  if (!ins.ok) throw new Error("inscription " + ins.status);
  await connecter(page, email);
  const api = contexte.request;
  const m = await api.put(B + "/api/compte/metier", { data: { metierPrecis: metier, sousVariantes } });
  if (!m.ok()) throw new Error("métier " + (await m.text()));
  const codes = agents.map((a) => AGENTS[a].code);
  const ab = await api.post(B + "/api/abonnement", { data: { nombreAgents: Math.max(2, codes.length), periode: "mensuel", agents: codes } });
  if (!ab.ok()) throw new Error("abonnement " + (await ab.text()));
  await api.post(B + "/api/paiement/demonstration", { data: {} });
  const d = await api.put(B + "/api/compte/dossier", { data: { chiffreAffairesMensuel: 60000, nombreCollaborateurs: effectif, dateCreationEntreprise: creation, typeZone: "PERIURBAINE", ville: "Lyon" } });
  if (!d.ok()) throw new Error("dossier " + (await d.text()));
  if (niveau) await api.put(B + "/api/audit/niveau", { data: { niveau } });
  for (const a of agents) {
    const o = await api.post(B + "/api/audit/objectif", { data: { agent: AGENTS[a].code, objectif: AGENTS[a].objectif } });
    if (!o.ok()) throw new Error("objectif " + a + " " + (await o.text()));
  }
  return { email, contexte, page, api };
}

export async function connecter(page, email, mdp = MDP) {
  await page.goto(B + "/connexion", { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#motDePasse", mdp);
  await page.click('button[type="submit"]');
  await page.waitForURL(/inscription\/metier|tableau-de-bord|formule|bienvenue|paiement/, { timeout: 30000 });
}

// Réponse enregistrée en base (JSON) ou null.
export function reponseDb(email, cle) {
  const t = sql(`select r.reponse::text from "ReponseAudit" r join "User" u on u.id=r."userId" where u.email='${email}' and r.cle='${cle}'`);
  return t ? JSON.parse(t) : null;
}

export const carte = (page, code) => page.locator(`li[data-question="${code}"]`).first();
export async function attendreEnregistre(c, ms = 4000) {
  try { await c.getByText(/^Réponse enregistrée$/).waitFor({ timeout: ms }); return true; } catch { return false; }
}
// Attend que l'écran ait fini de recalculer les questions (enregistrement, puis actualisation des données de la page).
export async function stabiliser(page, ms = 1800) {
  await page.waitForTimeout(ms);
  await page.waitForLoadState("networkidle").catch(() => {});
}
// Lignes affichées d'un tableau : identifiant, libellé et valeurs des cases.
export async function lignesTableau(c) {
  return c.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => ({ id: tr.getAttribute("data-ligne"), libelle: tr.querySelector("th")?.innerText.split("\n")[0].trim(), valeurs: [...tr.querySelectorAll("td input")].map((i) => i.value) })));
}

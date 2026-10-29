// Exemple complet, de l'objectif au plan d'action, sur un profil fictif identifié (« Électricien fictif ») : réponses posées par
// l'API comme le ferait l'écran, puis captures réelles de chaque étape (ordinateur et téléphone), dossier transmis à l'IA et
// rapport obtenu. Sans clé d'API, le rapport est une simulation (aucun appel à l'IA) : le document produit le dit en tête.
//
// Prérequis : serveur de test lancé avec RAPPORT_MODE=simulation (voir docs/etat-technique.md).
//   node scripts/verification/exemple-complet.mjs [--dossier docs/rapport/exemple]
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, B, creerCompte, sql, AGENTS } from "./outils.mjs";

const args = process.argv.slice(2);
const dossier = args.includes("--dossier") ? args[args.indexOf("--dossier") + 1] : "docs/rapport/exemple";
mkdirSync(dossier, { recursive: true });
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const { email, page, api, contexte } = await creerCompte(nav, { agents: ["ACQ", "FIN"], effectif: 4, creation: "2019-03-01", objectifs: false });
const poser = async (cle, reponse) => {
  const r = await api.put(`${B}/api/audit/reponses`, { data: { cle, reponse } });
  if (!r.ok()) throw new Error(`${cle} : ${r.status()} ${await r.text()}`);
};
const url = (onglet) => `${B}/audit/${AGENTS.ACQ.slug}${onglet ? `?etape=4&onglet=${onglet}` : ""}`;

// Dossier d'entreprise cohérent avec les chiffres du questionnaire (environ 20 000 € de chiffre d'affaires par mois).
await api.put(`${B}/api/compte/dossier`, { data: { chiffreAffairesMensuel: 20000, nombreCollaborateurs: 4, dateCreationEntreprise: "2019-03-01", typeZone: "PERIURBAINE", ville: "Ville fictive" } });

// 1. Objectif, puis ce qui a déjà été essayé.
const o = await api.post(`${B}/api/audit/objectif`, { data: { agent: AGENTS.ACQ.code, objectif: { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 12 } } });
if (!o.ok()) throw new Error(await o.text());
const objectifId = sql(`select o.id from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.statut='ACTIF' and o.agent='ACQUISITION_CA'`);
await api.put(`${B}/api/audit/tentatives`, {
  data: { objectifId, tentatives: { etat: "essaye", texte: "J'ai relancé mes devis par téléphone, mais je n'ai pas tenu plus de trois semaines : le soir, je n'avais plus le temps.", resultat: "arrete_avant", duree: "moins_d_1_mois" } },
});

// 2. Réponses du questionnaire (chiffres fictifs).
const DOUZE = ["le_mois_dernier", ...Array.from({ length: 11 }, (_, k) => `il_y_a_${k + 2}_mois`)];
const recents = [24000, 21000, 19500, 22000, 18000, 16500, 15000, 17500, 20000, 23000, 21500, 22000];
const passes = [21000, 19000, 18500, 20000, 17000, 16000, 14000, 16500, 19000, 21000, 20000, 20500];
await poser("ACQ-23.01", { genre: "valeurs", valeurs: Object.fromEntries(DOUZE.map((l, i) => [`${l}.chiffre_d_affaires`, recents[i]])) });
await poser("ACQ-23.03", { genre: "valeurs", valeurs: Object.fromEntries(DOUZE.map((l, i) => [`${l}.chiffre_d_affaires_un_an_plus_tot`, passes[i]])) });
await poser("ACQ-02.01", { genre: "estimation", min: 30, max: 40 });
await poser("ACQ-11.01", { genre: "exact", valeur: 7 });
await poser("RH-05.01", { genre: "valeurs", valeurs: { jours: 5, heures: 58 } }).catch(() => {});
await poser("ACQ-01.07", { genre: "saisie", valeur: "Surtout dans les communes autour de Villefranche, moins en ville." }).catch(() => {});

// 3. Captures : objectif et « déjà essayé », résultats, rapport, plan.
await page.setViewportSize({ width: 1280, height: 1400 });
await page.goto(url(), { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({ path: `${dossier}/1-objectif-et-deja-essaye.png`, fullPage: false });
await page.setViewportSize({ width: 1280, height: 1000 });
await page.goto(url("resultats"), { waitUntil: "networkidle" });
await page.screenshot({ path: `${dossier}/2-resultats.png`, fullPage: true });
await page.goto(url("rapport"), { waitUntil: "networkidle" });
await page.locator("[data-rediger]").click();
await page.locator("[data-rapport-contenu]").waitFor({ timeout: 60000 });
await page.screenshot({ path: `${dossier}/3-rapport.png`, fullPage: true });
await page.goto(url("plan"), { waitUntil: "networkidle" });
await page.screenshot({ path: `${dossier}/4-plan.png`, fullPage: true });
await page.setViewportSize({ width: 360, height: 800 });
for (const [n, onglet] of [["2-resultats", "resultats"], ["3-rapport", "rapport"], ["4-plan", "plan"]]) {
  await page.goto(url(onglet), { waitUntil: "networkidle" });
  await page.screenshot({ path: `${dossier}/${n}-telephone-360.png`, fullPage: true });
}

// 4. Dossier transmis et rapport obtenu, tels qu'enregistrés.
const ligne = sql(`select r.mode || '|' || r.dossier::text || '|' || r.contenu::text from "Rapport" r join "User" u on u.id=r."userId" where u.email='${email}' and r.statut='PRET' order by r."creeLe" desc limit 1`);
const [mode, d, c] = ligne.split("|");
writeFileSync(`${dossier}/dossier.json`, JSON.stringify(JSON.parse(d), null, 2) + "\n");
writeFileSync(`${dossier}/rapport.json`, JSON.stringify({ mode, ...JSON.parse(c) }, null, 2) + "\n");
console.log(`Exemple écrit dans ${dossier} (rapport en mode ${mode}).`);
await contexte.close();
await nav.close();

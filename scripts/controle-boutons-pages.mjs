// Contrôle des boutons des écrans d'un agent (hors questions), dans le navigateur, sur les quatre agents : formulaire d'objectif
// (champs vides, valeurs fausses, objectif irréaliste, unités, enregistrement), liste d'objectifs RH et Comm (avec ou sans chiffre,
// « Autre »), niveau (choix, passage essentiel ↔ approfondi), étapes cliquables, « Changer d'objectif » et historique, compte rendu
// (onglets), tableau de bord, bascule jour / nuit et déconnexion.
//
//   (serveur lancé : AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration RESULTATS_MAQUETTE=1 npx next start -p 3100)
//   node scripts/controle-boutons-pages.mjs [--agents ACQ,FIN,RH,COM]
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const B = process.env.BASE ?? "http://127.0.0.1:3100";
const args = process.argv.slice(2);
const CHOIX = (args.includes("--agents") ? args[args.indexOf("--agents") + 1] : "ACQ,FIN,RH,COM").split(",");
const dbUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)[1].split("?")[0];
const sql = (q) => execFileSync("psql", [dbUrl, "-At", "-c", q], { encoding: "utf8" }).trim();
const PROP = JSON.parse(readFileSync("data/objectifs-agents.json", "utf8")).agents;

const AGENTS = {
  ACQ: { code: "ACQUISITION_CA", slug: "acquisition-chiffre-affaires", chiffre: true },
  FIN: { code: "FINANCE_RENTABILITE", slug: "finance-rentabilite", chiffre: true },
  RH: { code: "RH_ORGANISATION", slug: "rh-organisation", chiffre: false },
  COM: { code: "COMM_CREATION", slug: "comm-creation-contenu", chiffre: false },
};

let verifies = 0;
const echecs = [];
const verifier = (agent, nom, ok, detail = "") => {
  verifies++;
  if (!ok) { echecs.push(`${agent} · ${nom}`); console.log(`ECHEC [${agent}] ${nom}${detail ? " : " + detail : ""}`); }
};

const navigateur = await chromium.launch({ args: ["--proxy-bypass-list=*"], executablePath: "/opt/pw-browsers/chromium" });

async function compte() {
  const email = `pages${Date.now()}${Math.floor(Math.random() * 1e4)}@example.com`;
  const motDePasse = "motdepasse-controle-1234";
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce" });
  const page = await contexte.newPage();
  await fetch(B + "/api/inscription", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, motDePasse }) });
  await page.goto(B + "/connexion", { waitUntil: "networkidle" });
  await page.fill("#email", email); await page.fill("#motDePasse", motDePasse); await page.click('button[type="submit"]');
  await page.waitForURL(/inscription\/metier|tableau-de-bord|formule/, { timeout: 30000 });
  const api = contexte.request;
  await api.put(B + "/api/compte/metier", { data: { metierPrecis: "electricien", sousVariantes: [] } });
  await api.post(B + "/api/abonnement", { data: { nombreAgents: 4, periode: "mensuel", agents: Object.values(AGENTS).map((a) => a.code) } });
  await api.post(B + "/api/paiement/demonstration", { data: {} });
  await api.put(B + "/api/compte/dossier", { data: { chiffreAffairesMensuel: 60000, nombreCollaborateurs: 4, dateCreationEntreprise: "2019-03-01", typeZone: "PERIURBAINE", ville: "Lyon" } });
  return { email, contexte, page, api };
}

const objectifs = (email, agent) => sql(`select o.statut||'|'||o."texteBrut" from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.agent='${agent}' order by o."creeLe"`).split("\n").filter(Boolean);
const niveauDb = (email) => sql(`select coalesce("niveauAudit"::text,'') from "User" where email='${email}'`);
const texteErreurs = (page) => page.locator(".text-\\[var\\(--red-1\\)\\]").allInnerTexts();
const nbQuestions = (page) => page.locator("li[data-question]").count();

for (const cle of CHOIX) {
  const A = AGENTS[cle];
  const { email, contexte, page } = await compte();
  const erreursPage = [];
  page.on("pageerror", (e) => erreursPage.push(e.message.slice(0, 160)));
  console.log(`\n=== ${cle} ===`);
  await page.goto(`${B}/audit/${A.slug}`, { waitUntil: "networkidle" });

  // --- 1. Objectif -----------------------------------------------------------------------------------------------------------------
  const envoyer = page.getByRole("button", { name: "Enregistrer mon objectif" });
  if (A.chiffre) {
    await envoyer.click();
    const e1 = await texteErreurs(page);
    verifier(cle, "objectif : formulaire vide → trois messages d'erreur", e1.length >= 3, JSON.stringify(e1));
    const quoi = page.getByLabel("Ce que vous voulez changer"), combien = page.getByLabel("De combien"), delai = page.getByLabel(/En combien de temps/);
    await quoi.fill("ab"); await combien.fill("10"); await delai.fill("6"); await envoyer.click();
    verifier(cle, "objectif : « ab » trop court → refusé", (await texteErreurs(page)).some((t) => /changer/.test(t)));
    await quoi.fill("augmenter mon chiffre d'affaires"); await delai.fill("0"); await envoyer.click();
    verifier(cle, "objectif : délai 0 → refusé", (await texteErreurs(page)).some((t) => /mois/.test(t)));
    await delai.fill("500"); await envoyer.click();
    verifier(cle, "objectif : délai 500 mois → refusé", (await texteErreurs(page)).some((t) => /120|10 ans/.test(t)));
    await delai.fill("3,5"); await envoyer.click();
    verifier(cle, "objectif : délai 3,5 → refusé (entier attendu)", (await texteErreurs(page)).some((t) => /entier/.test(t)));
    await combien.fill("abc"); await delai.fill("6"); await envoyer.click();
    verifier(cle, "objectif : « abc » comme chiffre → refusé", (await texteErreurs(page)).some((t) => /nombre/.test(t)));
    await combien.fill("5000"); await delai.fill("1"); await envoyer.click();
    verifier(cle, "objectif : +5000 % en 1 mois → expliqué, pas enregistré", (await texteErreurs(page)).length >= 1 && objectifs(email, A.code).length === 0);
    await combien.fill("10"); await delai.fill("6");
    await page.getByText("En euros (€)").click();
    await page.waitForTimeout(200);
    verifier(cle, "objectif : l'unité « euros » change la phrase affichée", /€/.test(await page.locator("p[aria-live=polite]").first().innerText()));
    await page.getByText("En pourcentage (%)").click();
    verifier(cle, "objectif : l'aperçu de la phrase s'affiche", /Votre objectif/.test(await page.locator("p[aria-live=polite]").first().innerText()));
    await envoyer.click();
    await page.getByText("Jusqu'où voulez-vous aller ?").waitFor({ timeout: 8000 }).catch(() => {});
    verifier(cle, "objectif : enregistré en base (ACTIF)", objectifs(email, A.code).some((o) => o.startsWith("ACTIF|")), JSON.stringify(objectifs(email, A.code)));
  } else {
    const liste = PROP[A.code].objectifs;
    await envoyer.click().catch(() => {});
    verifier(cle, "objectif (liste) : bouton inactif tant qu'aucun objectif n'est choisi", await envoyer.isDisabled());
    for (const o of liste.slice(0, 2)) {
      await page.locator(`label.case-option:has-text("${o.libelle.slice(0, 40).replace(/"/g, '\\"')}")`).first().click();
      await page.waitForTimeout(300);
      verifier(cle, `objectif (liste) : choisir « ${o.libelle.slice(0, 30)} » ouvre le détail`, (await page.locator("[data-detail]").count()) === 1);
    }
    await page.locator("label.case-option:has-text('Autre (précisez)')").click();
    await page.waitForTimeout(300);
    await envoyer.click();
    verifier(cle, "objectif (« Autre », vide) : messages d'erreur", (await texteErreurs(page)).length >= 1);
    // Bascule avec / sans chiffre.
    const sans = page.locator("[data-sans-chiffre]"), avec = page.locator("[data-avec-chiffre]");
    if (await sans.count()) { await sans.click(); await page.waitForTimeout(200); verifier(cle, "objectif : « sans chiffre » ouvre « Comment saurez-vous que c'est atteint ? »", (await page.getByLabel(/Comment saurez-vous/).count()) === 1); }
    if (await avec.count()) { await avec.click(); await page.waitForTimeout(200); verifier(cle, "objectif : « avec chiffre » ramène le champ « De combien »", (await page.getByLabel("De combien").count()) === 1); }
    // Un objectif de la liste, sans chiffre, valide.
    const premier = liste[0];
    await page.locator(`label.case-option:has-text("${premier.libelle.slice(0, 40).replace(/"/g, '\\"')}")`).first().click();
    await page.waitForTimeout(300);
    if (await page.locator("[data-sans-chiffre]").count()) await page.locator("[data-sans-chiffre]").click();
    await page.waitForTimeout(200);
    await page.getByLabel(/Comment saurez-vous/).fill("je constate le résultat chaque semaine");
    await page.getByLabel(/En combien de temps/).fill("3");
    await envoyer.click();
    await page.getByText("Jusqu'où voulez-vous aller ?").waitFor({ timeout: 8000 }).catch(() => {});
    verifier(cle, "objectif (liste) : enregistré en base (ACTIF)", objectifs(email, A.code).some((o) => o.startsWith("ACTIF|")), JSON.stringify(objectifs(email, A.code)));
  }

  // --- 2. Niveau --------------------------------------------------------------------------------------------------------------------
  verifier(cle, "niveau : l'écran « Jusqu'où voulez-vous aller ? » s'affiche après l'objectif", (await page.getByText("Jusqu'où voulez-vous aller ?").count()) === 1);
  await page.getByRole("button", { name: /^Essentiel/ }).click();
  await page.locator("[data-niveau-reglage]").waitFor({ timeout: 10000 });
  verifier(cle, "niveau : « Essentiel » enregistré", niveauDb(email) === "ESSENTIEL", niveauDb(email));
  await page.waitForTimeout(800);
  const nEss = await nbQuestions(page);
  await page.getByRole("button", { name: /Passer en approfondi/ }).click();
  await page.waitForTimeout(2500);
  const nApp = await nbQuestions(page);
  verifier(cle, "niveau : « Passer en approfondi » enregistré et plus de questions", niveauDb(email) === "APPROFONDI" && nApp >= nEss, `${nEss} → ${nApp} ; ${niveauDb(email)}`);
  await page.getByRole("button", { name: "Passer en essentiel" }).click();
  await page.waitForTimeout(2500);
  verifier(cle, "niveau : « Passer en essentiel » enregistré", niveauDb(email) === "ESSENTIEL" && (await nbQuestions(page)) <= nApp, niveauDb(email));

  // --- 3. Étapes cliquables ---------------------------------------------------------------------------------------------------------
  const etapes = page.getByRole("list", { name: "Votre parcours avec cet agent" });
  await etapes.getByRole("link", { name: /Objectif/ }).click();
  await page.waitForURL(/etape=1/);
  verifier(cle, "étape « Objectif » : rouvre le changement d'objectif", (await page.getByRole("heading", { name: "Changer d'objectif" }).count()) === 1);
  await page.getByRole("button", { name: "Garder l'objectif actuel" }).click();
  await page.waitForURL((u) => !u.search.includes("etape=1"), { timeout: 8000 }).catch(() => {});
  verifier(cle, "« Garder l'objectif actuel » : retour à l'audit sans changer l'objectif", objectifs(email, A.code).filter((o) => o.startsWith("ACTIF|")).length === 1 && !page.url().includes("etape=1"), page.url());
  await etapes.getByRole("link", { name: /Niveau et contexte/ }).click();
  await page.waitForURL(/etape=2/);
  verifier(cle, "étape « Niveau et contexte » : « Choix actuel » affiché", (await page.getByText("Choix actuel").count()) === 1);
  await page.getByRole("link", { name: /Revenir à l'étape précédente/ }).click();
  await page.waitForURL(/etape=1/);
  verifier(cle, "« Revenir à l'étape précédente » depuis le niveau : va à l'objectif", page.url().includes("etape=1"));
  await page.goto(`${B}/audit/${A.slug}?etape=2`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Approfondi/ }).click();
  await page.waitForURL((u) => !u.search.includes("etape=2"), { timeout: 8000 }).catch(() => {});
  verifier(cle, "niveau rouvert : choisir « Approfondi » enregistre et revient à l'audit", niveauDb(email) === "APPROFONDI" && !page.url().includes("etape=2"), `${niveauDb(email)} ${page.url()}`);

  // --- 4. Changer d'objectif et historique -------------------------------------------------------------------------------------------
  await page.goto(`${B}/audit/${A.slug}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Changer d'objectif" }).click();
  verifier(cle, "« Changer d'objectif » : le formulaire s'ouvre", (await page.getByRole("button", { name: "Garder l'objectif actuel" }).count()) === 1);
  await page.getByRole("button", { name: "Garder l'objectif actuel" }).click();
  verifier(cle, "« Garder l'objectif actuel » referme le formulaire", (await page.getByRole("button", { name: "Garder l'objectif actuel" }).count()) === 0);
  await page.getByRole("button", { name: "Changer d'objectif" }).click();
  if (A.chiffre) {
    await page.getByLabel("Ce que vous voulez changer").fill("réduire mes coûts");
    await page.getByLabel("De combien").fill("5");
    await page.getByLabel(/En combien de temps/).fill("4");
  } else {
    const liste = PROP[A.code].objectifs;
    await page.locator(`label.case-option:has-text("${liste[1].libelle.slice(0, 40).replace(/"/g, '\\"')}")`).first().click();
    await page.waitForTimeout(300);
    if (await page.locator("[data-sans-chiffre]").count()) await page.locator("[data-sans-chiffre]").click();
    await page.waitForTimeout(200);
    await page.getByLabel(/Comment saurez-vous/).fill("je le vois dans mes chiffres");
    await page.getByLabel(/En combien de temps/).fill("2");
  }
  await page.getByRole("button", { name: "Enregistrer mon objectif" }).click();
  await page.waitForTimeout(2500);
  const hist = objectifs(email, A.code);
  verifier(cle, "nouvel objectif : l'ancien passe dans l'historique, un seul reste actif", hist.length === 2 && hist.filter((o) => o.startsWith("ACTIF|")).length === 1, JSON.stringify(hist));
  verifier(cle, "historique : « Objectifs précédents » affiché", (await page.getByRole("heading", { name: "Objectifs précédents" }).count()) === 1);

  // --- 5. Compte rendu (onglets) --------------------------------------------------------------------------------------------------------
  await page.goto(`${B}/audit/${A.slug}?etape=4`, { waitUntil: "networkidle" });
  verifier(cle, "résultats : l'écran s'ouvre avec ses onglets", (await page.locator("label[for^='res-o']").count()) === 3);
  for (const [i, nom] of [[2, "Priorités"], [3, "Plan d'action"], [1, "Objectif"]]) {
    await page.locator(`label[for="res-o${i}"]`).click();
    await page.waitForTimeout(250);
    verifier(cle, `résultats : l'onglet « ${nom} » s'affiche`, await page.locator(`.res-p${i}`).isVisible());
  }
  await page.goto(`${B}/audit/${A.slug}?etape=4&exemple=1`, { waitUntil: "networkidle" });
  if (await page.locator(".res-exemple").count()) {
    for (const i of [2, 3, 1]) { await page.locator(`label[for="res-o${i}"]`).click(); await page.waitForTimeout(250); verifier(cle, `maquette : onglet ${i}`, await page.locator(`.res-p${i}`).isVisible()); }
  }
  await page.goto(`${B}/audit/${A.slug}`, { waitUntil: "networkidle" });
  await page.getByRole("list", { name: "Votre parcours avec cet agent" }).getByRole("link", { name: /Résultats/ }).click();
  await page.waitForURL(/etape=4/);
  verifier(cle, "étape « Résultats » cliquable depuis l'audit", page.url().includes("etape=4"));

  verifier(cle, "aucune erreur JavaScript sur les écrans de l'agent", erreursPage.length === 0, erreursPage.slice(0, 2).join(" | "));
  if (cle === CHOIX[CHOIX.length - 1]) {
    // --- 6. Tableau de bord, thème, déconnexion ------------------------------------------------------------------------------------------
    await page.goto(`${B}/tableau-de-bord`, { waitUntil: "networkidle" });
    const liens = await page.locator("a[href^='/audit/']").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
    verifier("tous", "tableau de bord : un lien par agent ouvert", liens.length >= 4, JSON.stringify(liens));
    for (const href of [...new Set(liens)]) {
      const r = await page.goto(B + href, { waitUntil: "load" });
      verifier("tous", `tableau de bord : le lien ${href} s'ouvre`, r.status() === 200);
    }
    await page.goto(`${B}/tableau-de-bord`, { waitUntil: "networkidle" });
    const bascule = page.getByRole("button", { name: /jour|nuit|clair|sombre/i }).first();
    if (await bascule.count()) {
      const avant = await page.evaluate(() => document.documentElement.dataset.theme ?? "sombre");
      await bascule.click(); await page.waitForTimeout(300);
      const apres = await page.evaluate(() => document.documentElement.dataset.theme ?? "sombre");
      verifier("tous", "bascule jour / nuit : le thème change", avant !== apres, `${avant} → ${apres}`);
      await page.reload({ waitUntil: "networkidle" });
      verifier("tous", "bascule jour / nuit : le choix survit au rechargement", (await page.evaluate(() => document.documentElement.dataset.theme ?? "sombre")) === apres);
    } else verifier("tous", "bouton de bascule jour / nuit présent", false);
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 10000 }).catch(() => {});
    await page.goto(`${B}/tableau-de-bord`, { waitUntil: "load" });
    verifier("tous", "déconnexion : le tableau de bord redemande la connexion", page.url().includes("/connexion"), page.url());
  }
  await contexte.close();
}

await navigateur.close();
console.log(`\n${verifies} vérifications, ${echecs.length} échec(s).`);
process.exit(echecs.length === 0 ? 0 : 1);

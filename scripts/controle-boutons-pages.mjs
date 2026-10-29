// Contrôle des boutons des écrans d'un agent (hors questions), dans le navigateur, sur les quatre agents : formulaire d'objectif
// (champs vides, valeurs fausses, objectif irréaliste, unités, enregistrement), objectif RH et Comm (« Choisir un objectif
// proposé » ou « Écrire mon propre objectif », avec ou sans chiffre, un seul par agent), niveau (choix, passage essentiel ↔ approfondi), étapes cliquables, « Changer d'objectif » et historique, compte rendu
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
// Objectif de la liste (RH, Comm, 28 octobre) : deux choix (« Choisir un objectif proposé », « Écrire mon propre objectif »),
// puis des cartes à un choix ; la Comm demande d'abord la partie (« Où en êtes-vous ? »). Un seul objectif par agent.
const ouvert = (page) => page.locator("[data-objectif-choix]");
async function choisirMode(page, mode) {
  const m = page.locator(`[data-objectif-choix] li[data-mode="${mode}"]`);
  if (!(await m.locator("input").isChecked())) await m.locator(".objectif-mode-tete").click();
  await page.waitForTimeout(200);
}
async function choisirObjectif(page, code, o) {
  await choisirMode(page, "proposition");
  if (o.groupe) {
    const partie = page.locator(`[data-objectif-choix] li[data-partie="${o.groupe}"]`);
    if (!(await partie.locator("input").isChecked())) await partie.locator(".objectif-carte-tete").click();
  }
  await ouvert(page).locator(`li[data-carte="${o.id}"] .objectif-carte-tete`).click();
  await page.waitForTimeout(200);
}

// Remplit l'objectif ouvert : un chiffre ou une description, et un délai.
async function remplirOuvert(page, description, i) {
  const e = ouvert(page).locator("[data-detail]");
  if (await e.locator("input[id$='-ampleur']").count()) await e.locator("input[id$='-ampleur']").fill("5");
  else await e.getByLabel(/Comment saurez-vous/).fill(description);
  if (await e.getByLabel("Votre objectif", { exact: true }).count()) await e.getByLabel("Votre objectif", { exact: true }).fill(`objectif précisé ${i}`);
  await e.getByLabel(/En combien de temps/).fill(String(2 + i));
}

for (const cle of CHOIX) {
  const A = AGENTS[cle];
  const { email, contexte, page } = await compte();
  const erreursPage = [];
  page.on("pageerror", (e) => erreursPage.push(e.message.slice(0, 160)));
  console.log(`\n=== ${cle} ===`);
  await page.goto(`${B}/audit/${A.slug}`, { waitUntil: "networkidle" });

  // --- 1. Objectif -----------------------------------------------------------------------------------------------------------------
  const envoyer = page.getByRole("button", { name: /^Enregistrer mon objectif$/ });
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
    // RH et Comm (28 octobre) : un objectif proposé ou un objectif personnel, un seul par agent ; Comm : la partie d'abord.
    const liste = PROP[A.code].objectifs;
    const parties = [...new Set(liste.map((x) => x.groupe ?? ""))];
    const memePartie = liste.filter((x) => (x.groupe ?? "") === (liste[0].groupe ?? ""));
    const champPerso = () => page.getByLabel("Votre objectif", { exact: true });
    await envoyer.click();
    await page.waitForTimeout(300);
    verifier(cle, "objectif (liste) : rien de choisi → message qui dit quoi faire, rien en base", (await texteErreurs(page)).some((t) => /objectif proposé, ou écrivez votre propre objectif/.test(t)) && objectifs(email, A.code).length === 0, JSON.stringify(await texteErreurs(page)));
    if (parties.length > 1) {
      await choisirMode(page, "proposition");
      await envoyer.click();
      await page.waitForTimeout(300);
      verifier(cle, "objectif (Comm) : objectif proposé sans partie → « Choisissez d'abord où vous en êtes »", (await texteErreurs(page)).some((t) => /Choisissez d'abord où vous en êtes/.test(t)) && objectifs(email, A.code).length === 0, JSON.stringify(await texteErreurs(page)));
    }
    await choisirObjectif(page, A.code, memePartie[0]);
    verifier(cle, "objectif (liste) : choisir une proposition ouvre son détail dans la carte", (await ouvert(page).locator(`li[data-carte="${memePartie[0].id}"] [data-detail]`).count()) === 1);
    verifier(cle, "objectif (liste) : un seul objectif, pas de « Ajouter un autre objectif »", (await page.getByText(/Ajouter un autre objectif/).count()) === 0);
    // « Écrire mon propre objectif » : vide → messages ; puis retour au mode « proposé ».
    await choisirMode(page, "personnel");
    verifier(cle, "objectif personnel : le champ « Votre objectif » s'ouvre directement", (await champPerso().count()) === 1);
    await envoyer.click();
    verifier(cle, "objectif personnel vide : messages d'erreur", (await texteErreurs(page)).some((t) => /Décrivez votre objectif/.test(t)));
    await choisirMode(page, "proposition");
    verifier(cle, "objectif personnel : revenir au mode « proposé » ferme le champ personnel et retrouve la proposition", (await champPerso().count()) === 0 && (await ouvert(page).locator(`li[data-carte="${memePartie[0].id}"] .objectif-carte-tete input`).isChecked()));
    // Bascule avec / sans chiffre.
    const sans = page.locator("[data-sans-chiffre]"), avec = page.locator("[data-avec-chiffre]");
    if (await sans.count()) { await sans.click(); await page.waitForTimeout(200); verifier(cle, "objectif : « sans chiffre » ouvre « Comment saurez-vous que c'est atteint ? »", (await page.getByLabel(/Comment saurez-vous/).count()) === 1); }
    if (await avec.count()) { await avec.click(); await page.waitForTimeout(200); verifier(cle, "objectif : « avec chiffre » ramène le champ du chiffre", (await ouvert(page).locator("input[id$='-ampleur']").count()) === 1); }
    await remplirOuvert(page, "je constate le résultat chaque semaine", 0);
    await envoyer.click();
    await page.getByText("Jusqu'où voulez-vous aller ?").waitFor({ timeout: 8000 }).catch(() => {});
    verifier(cle, "objectif (liste) : enregistré en base (ACTIF), un seul", objectifs(email, A.code).filter((o) => o.startsWith("ACTIF|")).length === 1, JSON.stringify(objectifs(email, A.code)));
    const de = (o) => ({ quoi: o.libelle, ...(o.mesure === "chiffre" ? { ampleur: { valeur: 5, unite: o.unite ?? "pourcent" } } : { reussite: "je le constate" }), delaiMois: 3, choix: o.id });
    const r = await page.request.post(`${B}/api/audit/objectif`, { data: { agent: A.code, objectifs: [de(memePartie[0]), de(memePartie[1])] } });
    verifier(cle, "objectifs : deux objectifs envoyés ensemble → refusé par le serveur", r.status() === 400 && /un seul objectif/.test(await r.text()) && objectifs(email, A.code).length === 1);
  }

  // --- 2. Niveau --------------------------------------------------------------------------------------------------------------------
  verifier(cle, "niveau : l'écran « Jusqu'où voulez-vous aller ? » s'affiche après l'objectif", (await page.getByText("Jusqu'où voulez-vous aller ?").count()) === 1);
  await page.getByRole("button", { name: /^Essentiel/ }).click();
  await page.locator("li[data-question], section[aria-labelledby='questions']").first().waitFor({ timeout: 10000 });
  verifier(cle, "niveau : « Essentiel » enregistré", niveauDb(email) === "ESSENTIEL", niveauDb(email));
  // Plus de ligne de réglage du niveau en tête du questionnaire (demande du 27 octobre) : le niveau se change à l'étape 2.
  verifier(cle, "niveau : pas de ligne « Niveau du questionnaire » en tête", (await page.locator("[data-niveau-reglage]").count()) === 0 && (await page.getByText(/Niveau du questionnaire :/).count()) === 0);
  await page.waitForTimeout(800);
  const nEss = await nbQuestions(page);
  const changerNiveau = async (nom) => {
    await page.goto(`${B}/audit/${A.slug}?etape=2`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: new RegExp(`^${nom}`) }).click();
    await page.waitForURL((u) => !u.search.includes("etape=2"), { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
  };
  await changerNiveau("Approfondi");
  const nApp = await nbQuestions(page);
  verifier(cle, "niveau : « Approfondi » (étape 2) enregistré et plus de questions", niveauDb(email) === "APPROFONDI" && nApp >= nEss, `${nEss} → ${nApp} ; ${niveauDb(email)}`);
  await changerNiveau("Essentiel");
  verifier(cle, "niveau : « Essentiel » (étape 2) enregistré", niveauDb(email) === "ESSENTIEL" && (await nbQuestions(page)) <= nApp, niveauDb(email));

  // --- 3. Étapes cliquables ---------------------------------------------------------------------------------------------------------
  const etapes = page.getByRole("list", { name: "Votre parcours avec cet agent" });
  await etapes.getByRole("link", { name: /Objectif/ }).click();
  await page.waitForURL(/etape=1/);
  const actifsAvant = 1;
  const garder = "Garder l'objectif actuel";
  verifier(cle, "étape « Objectif » : rouvre le changement d'objectif", (await page.getByRole("heading", { name: "Changer d'objectif" }).count()) === 1);
  if (!A.chiffre) verifier(cle, "étape « Objectif » : l'objectif en cours est repris dans le formulaire", (await page.locator("[data-objectif-choix] li[data-mode='proposition'] input").isChecked()) && (await page.locator("[data-objectif-choix] li.objectif-carte.choisie[data-carte]").count()) === 1);
  await page.getByRole("button", { name: garder }).click();
  await page.waitForURL((u) => !u.search.includes("etape=1"), { timeout: 8000 }).catch(() => {});
  verifier(cle, `« ${garder} » : retour à l'audit sans changer l'objectif`, objectifs(email, A.code).filter((o) => o.startsWith("ACTIF|")).length === actifsAvant && !page.url().includes("etape=1"), page.url());
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
  const changer = "Changer d'objectif";
  await page.getByRole("button", { name: changer }).click();
  verifier(cle, `« ${changer} » : le formulaire s'ouvre`, (await page.getByRole("button", { name: garder }).count()) === 1);
  await page.getByRole("button", { name: garder }).click();
  verifier(cle, `« ${garder} » referme le formulaire`, (await page.getByRole("button", { name: garder }).count()) === 0);
  await page.getByRole("button", { name: changer }).click();
  if (A.chiffre) {
    // Le formulaire d'objectif seulement : une question du questionnaire (ACQ-24.01) porte aussi un champ « De combien ».
    const formulaire = page.locator("form").filter({ has: page.getByLabel("Ce que vous voulez changer") });
    await formulaire.getByLabel("Ce que vous voulez changer").fill("réduire mes coûts");
    await formulaire.getByLabel("De combien").fill("5");
    await formulaire.getByLabel(/En combien de temps/).fill("4");
  } else {
    // L'objectif en cours est repris avec ses réponses ; on en choisit un autre de la même partie.
    const liste = PROP[A.code].objectifs;
    const memePartie = liste.filter((x) => (x.groupe ?? "") === (liste[0].groupe ?? ""));
    verifier(cle, "changer : l'objectif en cours est repris avec ses réponses", (await ouvert(page).locator("[data-detail] input[id$='-delaiMois']").inputValue()) !== "");
    await choisirObjectif(page, A.code, memePartie[2]);
    await remplirOuvert(page, "je le vois dans mes chiffres", 2);
  }
  await page.getByRole("button", { name: "Enregistrer mon objectif" }).click();
  await page.waitForTimeout(2500);
  const hist = objectifs(email, A.code);
  verifier(cle, "nouvel objectif : l'ancien passe dans l'historique, le nouveau reste actif", hist.filter((o) => o.startsWith("ACTIF|")).length === 1 && hist.filter((o) => !o.startsWith("ACTIF|")).length === 1, JSON.stringify(hist));
  verifier(cle, "objectif : la carte « Votre objectif » montre sa phrase", (await page.locator(".audit-objectif-actif [data-objectif-phrase]").count()) === 1);
  verifier(cle, "historique : « Objectifs précédents » affiché", (await page.getByRole("heading", { name: "Objectifs précédents" }).count()) === 1);

  // --- 5. Compte rendu (onglets) --------------------------------------------------------------------------------------------------------
  await page.goto(`${B}/audit/${A.slug}?etape=4`, { waitUntil: "networkidle" });
  verifier(cle, "résultats : l'écran s'ouvre avec ses onglets", (await page.locator("label[for^='res-o']").count()) === 3);
  for (const [i, nom] of [[2, "Priorités"], [3, "Plan d'action"], [1, "Objectif"]]) {
    await page.locator(`label[for="res-o${i}"]`).click();
    await page.waitForTimeout(250);
    verifier(cle, `résultats : l'onglet « ${nom} » s'affiche`, await page.locator(`.res-p${i}`).isVisible());
  }
  verifier(cle, "résultats : un bloc d'avancement pour l'objectif", (await page.locator("[data-objectif-resultat]").count()) === 1);
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
    // Un objectif par agent (28 octobre). Chaque agent est contrôlé sur un compte neuf : sur ce compte, seul le dernier agent
    // contrôlé a un objectif ; sa carte montre « Votre objectif » et sa phrase, jamais une liste, et les autres cartes n'en ont pas.
    const etiquettes = await page.locator(".carte-conseil-etiquette").allTextContents();
    verifier("tous", "tableau de bord : l'agent qui a un objectif le montre (un seul), les autres n'en affichent pas", !etiquettes.some((t) => /^Vos \d+ objectifs$/.test(t.trim())) && etiquettes.filter((t) => t.trim() === "Votre objectif").length === 1, JSON.stringify(etiquettes));
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

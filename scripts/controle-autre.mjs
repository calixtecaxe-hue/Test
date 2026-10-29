// Contrôle de tous les « Autre » de l'application, dans le navigateur : on clique, on précise, on enregistre, et on relit la base.
//   1. Activités du métier (« Autre (précisez) ») : seule, avec une autre activité, et vide (message d'erreur).
//   2. Objectif des agents RH et Comm : « Écrire mon propre objectif », avec un chiffre ou une description.
//   3. Questions du questionnaire dont une option est « Autre » : la réponse est acceptée et enregistrée.
//
//   (serveur lancé : AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration npx next start -p 3100)
//   node scripts/controle-autre.mjs
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const B = process.env.BASE ?? "http://127.0.0.1:3100";
const dbUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)[1].split("?")[0];
const sql = (q) => execFileSync("psql", [dbUrl, "-At", "-c", q], { encoding: "utf8" }).trim();
const lire = (f) => JSON.parse(readFileSync(f, "utf8"));

let verifies = 0;
const echecs = [];
function verifier(ou, nom, ok, detail = "") {
  verifies++;
  if (!ok) { echecs.push(ou); console.log(`ECHEC ${ou} · ${nom}${detail ? " : " + detail : ""}`); }
}

const navigateur = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });

// Compte connecté, arrêté à l'étape du métier.
async function compte() {
  const email = `autre${Date.now()}${Math.floor(Math.random() * 1e4)}@example.com`;
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce" });
  const page = await contexte.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  await fetch(B + "/api/inscription", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, motDePasse: "motdepasse-controle-1234" }) });
  await page.goto(B + "/connexion", { waitUntil: "networkidle" });
  await page.fill("#email", email); await page.fill("#motDePasse", "motdepasse-controle-1234"); await page.click('button[type="submit"]');
  await page.waitForURL(/inscription\/metier|tableau-de-bord|formule/, { timeout: 30000 });
  return { email, contexte, page, api: contexte.request, erreurs };
}

// Compte abonné (électricien, agents choisis, dossier rempli, niveau choisi).
async function compteAbonne(agents) {
  const c = await compte();
  await c.api.put(B + "/api/compte/metier", { data: { metierPrecis: "electricien", sousVariantes: [] } });
  const ab = await c.api.post(B + "/api/abonnement", { data: { nombreAgents: agents.length, periode: "mensuel", agents } });
  if (!ab.ok()) throw new Error("abonnement " + (await ab.text()));
  await c.api.post(B + "/api/paiement/demonstration", { data: {} });
  await c.api.put(B + "/api/compte/dossier", { data: { chiffreAffairesMensuel: 60000, nombreCollaborateurs: 4, dateCreationEntreprise: "2019-03-01", typeZone: "PERIURBAINE", ville: "Lyon" } });
  return c;
}

// --- 1. Activités du métier -------------------------------------------------------------------------------------------------------
const routage = lire("data/routage.json");
const avecActivites = routage.metiers.filter((m) => (m.sousVariantes ?? []).length > 1);
console.log(`\n=== Métiers à plusieurs activités : ${avecActivites.length} ===`);
for (const [i, m] of avecActivites.entries()) {
  const c = await compte();
  const { page } = c;
  await page.goto(B + "/inscription/metier", { waitUntil: "networkidle" });
  await page.fill('input[role="combobox"]', m.libelle);
  await page.getByRole("option", { name: m.libelle, exact: true }).first().click();
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(400);
  const autre = page.locator('input[value="__autre"]');
  verifier(m.libelle, "la case « Autre (précisez) » est proposée", (await autre.count()) === 1);
  await page.locator('label:has(input[value="__autre"])').click();
  await page.waitForTimeout(200);
  verifier(m.libelle, "« Autre (précisez) » cochée : le champ « précisez » apparaît", (await page.locator("#autreTexte").count()) === 1);
  // Un cas sur trois : laissé vide, il faut un message ; un cas sur trois : avec une vraie activité cochée en plus.
  if (i % 3 === 0) {
    await page.click('form button[type="submit"]'); await page.waitForTimeout(400);
    verifier(m.libelle, "« Autre » sans précision : message « Précisez ce que vous faites »", (await page.getByText(/Précisez ce que vous faites/).count()) >= 1);
  }
  const avecUneAutre = i % 3 === 1;
  if (avecUneAutre) await page.locator(`label:has(input[value="${m.sousVariantes[1].id}"])`).click();
  const texte = `Activité précisée ${i}`;
  await page.fill("#autreTexte", texte);
  await page.click('form button[type="submit"]');
  // Le métier peut encore poser la question du stock avant la formule.
  for (let tour = 0; tour < 3 && !/\/formule/.test(page.url()); tour++) {
    await page.waitForTimeout(500);
    const oui = page.locator('label:has-text("Oui")').first();
    if (/inscription\/metier/.test(page.url()) && (await oui.count())) { await oui.click(); await page.click('form button[type="submit"]'); }
  }
  await page.waitForURL(/\/formule/, { timeout: 15000 }).catch(() => {});
  verifier(m.libelle, "« Autre (précisez) » enregistré : le parcours passe à la formule", /\/formule/.test(page.url()), page.url());
  const ligne = sql(`select "metierPrecis" || '|' || array_to_string("sousVariantes", ',') || '|' || coalesce("autreActiviteTexte", '') from "User" where email='${c.email}'`);
  const [metier, coches, garde] = ligne.split("|");
  verifier(m.libelle, "le métier est enregistré", metier === m.id, ligne);
  verifier(m.libelle, "le texte précisé est gardé sur le compte", garde === texte, ligne);
  verifier(m.libelle, avecUneAutre ? "l'activité cochée avec « Autre » est enregistrée" : "« Autre » seul : aucune activité cochée (l'activité par défaut s'applique)", avecUneAutre ? coches === m.sousVariantes[1].id : coches === "", ligne);
  verifier(m.libelle, "aucune erreur JavaScript", c.erreurs.length === 0, c.erreurs.join(" | "));
  await c.contexte.close();
}

// --- 2. Objectif des agents RH et Comm ----------------------------------------------------------------------------------------------
const objectifs = lire("data/objectifs-agents.json").agents;
const SLUG = { RH_ORGANISATION: "rh-organisation", COMM_CREATION: "comm-creation-contenu" };
console.log("\n=== Objectifs : « Écrire mon propre objectif » ===");
for (const agent of Object.keys(objectifs)) {
  {
    for (const mode of ["chiffre", "phrase"]) {
      const ou = `${agent} · objectif personnel (${mode})`;
      const c = await compteAbonne(["RH_ORGANISATION", "COMM_CREATION"]);
      const { page } = c;
      await page.goto(`${B}/audit/${SLUG[agent]}`, { waitUntil: "networkidle" });
      // Le choix est visible d'emblée, à égalité avec « Choisir un objectif proposé » (même en Comm, avant toute partie).
      const perso = page.locator("[data-objectif-choix] li[data-mode='personnel']");
      verifier(ou, "« Écrire mon propre objectif » est visible dès l'ouverture, à côté de « Choisir un objectif proposé »", (await perso.count()) === 1 && (await page.locator("[data-objectif-choix] li[data-mode]").count()) === 2, String(await perso.count()));
      await perso.locator(".objectif-mode-tete").click();
      await page.waitForTimeout(300);
      const champ = page.getByRole("textbox", { name: "Votre objectif", exact: true });
      verifier(ou, "« Écrire mon propre objectif » choisi : le champ « Votre objectif » apparaît", (await champ.count()) === 1);
      const quoi = `objectif précisé ${agent.slice(0, 3).toLowerCase()} ${mode}`;
      await champ.fill(quoi);
      const zone = page.locator("[data-objectif-choix] [data-mode-contenu='personnel']");
      // Un objectif personnel commence par la description ; « J'ai un chiffre » ouvre le chiffre et son unité.
      const enChiffre = (await zone.locator("input[id$='-ampleur']").count()) === 1;
      if (mode === "phrase" && enChiffre) await page.locator("[data-sans-chiffre]").click();
      if (mode === "chiffre" && !enChiffre) await page.locator("[data-avec-chiffre]").click();
      await page.waitForTimeout(200);
      if (mode === "chiffre") await zone.locator("input[id$='-ampleur']").fill("10");
      else await page.getByLabel(/Comment saurez-vous/).fill("je le constate chaque semaine");
      await page.getByLabel(/En combien de temps/).fill("6");
      await page.getByRole("button", { name: /Enregistrer mon objectif/ }).click();
      await page.waitForTimeout(1500);
      // La phrase de l'objectif, et la structure : la description (« reussite ») est gardée à part de la phrase.
      const enregistre = sql(`select o."texteBrut" || ' ¦ ' || o.structure::text from "Objectif" o join "User" u on u.id=o."userId" where u.email='${c.email}' and o.agent='${agent}' and o.statut='ACTIF'`);
      verifier(ou, "objectif enregistré avec le texte écrit, origine « personnel », sans proposition", enregistre.includes(quoi) && /"origine": "personnel"/.test(enregistre) && !/"choix"/.test(enregistre), enregistre || "rien en base");
      verifier(ou, mode === "chiffre" ? "le chiffre est enregistré" : "la description est enregistrée", mode === "chiffre" ? /"valeur": 10/.test(enregistre) : /"reussite": "je le constate chaque semaine"/.test(enregistre), enregistre);
      verifier(ou, "aucune erreur JavaScript", c.erreurs.length === 0, c.erreurs.join(" | "));
      await c.contexte.close();
    }
  }
}

// --- 3. Questions dont une option est « Autre » ---------------------------------------------------------------------------------------
const banque = lire("data/banque/questions.json");
const avecAutre = [];
for (const q of banque) {
  if ((q.reponse.type === "choix" || q.reponse.type === "cases") && q.reponse.options.some((o) => o.id === "autre")) avecAutre.push(q);
}
console.log(`\n=== Questions avec une option « Autre » : ${avecAutre.length} ===`);
const c = await compteAbonne(["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"]);
for (const q of avecAutre) {
  const valeur = q.reponse.type === "cases" ? ["autre"] : "autre";
  const r = await c.api.put(B + "/api/audit/reponses", { data: { cle: q.donnee, reponse: { genre: "saisie", valeur } } });
  verifier(q.donnee, "« Autre » accepté par le serveur", r.ok(), `${r.status()} ${(await r.text()).slice(0, 120)}`);
  const enBase = sql(`select r.reponse::text from "ReponseAudit" r join "User" u on u.id=r."userId" where u.email='${c.email}' and r.cle='${q.donnee}'`);
  verifier(q.donnee, "« Autre » enregistré", enBase.includes('"autre"'), enBase);
}
await c.contexte.close();

await navigateur.close();
console.log(`\n${verifies} vérifications, ${echecs.length} échec(s).`);
process.exit(echecs.length === 0 ? 0 : 1);

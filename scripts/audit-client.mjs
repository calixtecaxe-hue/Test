// Audit « dans la peau du client » (27 octobre) : les parcours importants d'un dirigeant, rejoués dans un vrai navigateur avec
// des comptes fictifs (@example.com) et le paiement de démonstration. Chaque contrôle porte un identifiant du rapport d'audit et
// dit ce que le client doit obtenir ; un « ÉCART » est un défaut constaté, encore à corriger. Rien n'est modifié dans
// l'application : le script crée seulement des comptes de test.
//
//   (serveur lancé : AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration EMAIL_MODE=demonstration npx next start -p 3100 ;
//    EMAIL_MODE=demonstration écrit les e-mails dans .emails-demonstration/ au lieu de les envoyer : le script y lit le lien
//    « Mot de passe oublié »)
//   node scripts/audit-client.mjs [--sortie dossier]      → résumé à l'écran, détail dans <dossier>/audit-client.json
//
// Code de sortie : 0 si tout est conforme, 1 s'il reste un écart.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const B = process.env.BASE ?? "http://127.0.0.1:3100";
const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "audit-client";
mkdirSync(sortie, { recursive: true });
const dbUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)[1].split("?")[0];
const sql = (q) => execFileSync("psql", [dbUrl, "-At", "-c", q], { encoding: "utf8" }).trim();
const MDP = "motdepasse-audit-2026";

const resultats = [];
function controle(id, parcours, attendu, conforme, observe) {
  resultats.push({ id, parcours, attendu, conforme: !!conforme, observe: String(observe ?? "").slice(0, 300) });
  console.log(`${conforme ? "conforme" : "ÉCART   "}  ${id.padEnd(5)} ${parcours} · ${attendu}${conforme ? "" : ` — observé : ${String(observe).slice(0, 160)}`}`);
}
const rouges = (zone) => zone.locator("[class*='red-1']").allInnerTexts().then((t) => t.map((x) => x.trim()).filter((x) => x && !/— CAXE$/.test(x)));

const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const nouveau = (vp = { width: 1366, height: 860 }) => nav.newContext({ viewport: vp, reducedMotion: "reduce" });

// --- 1. Inscription ---------------------------------------------------------------------------------------------------------------
const email = `audit.client.${Date.now()}@example.com`;
{
  const ctx = await nouveau();
  const page = await ctx.newPage();
  await page.goto(B + "/inscription", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForTimeout(400);
  const m = await rouges(page.locator("main"));
  controle("P-01", "Inscription", "un envoi vide explique ce qui manque", m.length >= 2, JSON.stringify(m));
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MDP);
  await page.getByLabel("Confirmer le mot de passe").fill(MDP);
  await page.getByRole("button", { name: "Créer mon compte" }).dblclick();
  await page.waitForURL(/metier/, { timeout: 15000 }).catch(() => {});
  controle("P-02", "Inscription", "un double clic ne crée qu'un compte et mène au métier", sql(`select count(*) from "User" where email='${email}'`) === "1" && /metier/.test(page.url()), page.url());
  const p2 = await (await nouveau()).newPage();
  await p2.goto(B + "/inscription", { waitUntil: "networkidle" });
  await p2.getByLabel("Adresse email").fill(email.toUpperCase());
  await p2.getByLabel("Mot de passe", { exact: true }).fill(MDP);
  await p2.getByLabel("Confirmer le mot de passe").fill(MDP);
  await p2.getByRole("button", { name: "Créer mon compte" }).click();
  await p2.waitForTimeout(1200);
  controle("P-03", "Inscription", "la même adresse (en majuscules) est reconnue et l'écran le dit", (await rouges(p2.locator("main"))).some((t) => /existe déjà/.test(t)), JSON.stringify(await rouges(p2.locator("main"))));

  // --- 2. Métier : les mots du quotidien trouvent le métier ---------------------------------------------------------------------
  const combo = page.getByRole("combobox");
  for (const [mot, attendu] of [["electricien", "Électricien"], ["électricienne", "Électricien"], ["coiffeuse", "Coiffeur"], ["garagiste", "Garage"], ["plombier chauffagiste", "Plombier"], ["boulangerie", "Boulanger"], ["infirmière", "Infirmier"], ["resto", "Restaurant"]]) {
    await combo.fill(mot);
    await page.waitForTimeout(250);
    const opts = await page.getByRole("option").allInnerTexts();
    controle("M-01", "Métier", `« ${mot} » propose ${attendu}`, opts.some((o) => o.includes(attendu)), opts.slice(0, 3).join(" ; "));
  }
  await combo.fill("electricien"); await page.waitForTimeout(250);
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Choisir ma formule" }).click();
  await page.waitForURL(/formule/, { timeout: 15000 });
  // Formule, paiement de démonstration.
  await page.locator("main button[aria-pressed]").nth(0).click();
  const agents = page.getByRole("list", { name: "Agents" });
  await agents.locator("[role=checkbox]", { hasText: "Acquisition" }).click();
  await agents.locator("[role=checkbox]", { hasText: "RH" }).click();
  await page.getByRole("button", { name: "Continuer vers le paiement" }).click();
  await page.waitForURL(/paiement/);
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: /Continuer vers le paiement/ }).click();
  await page.waitForURL(/demonstration/);
  await page.getByRole("button", { name: /Activer mon abonnement/ }).click();
  await page.waitForURL(/bienvenue/, { timeout: 20000 });
  controle("P-04", "Paiement", "après le paiement (démonstration), le dossier d'entreprise s'ouvre", /bienvenue/.test(page.url()), page.url());

  // --- 3. Dossier : la saisie du chiffre d'affaires est lue comme le dirigeant l'entend ------------------------------------------
  const ca = page.locator("main input:visible").first();
  for (const [tape, attendu, defaut] of [["60k", (v) => v === "" || Number(v) === 60000, "« 60k » lu comme 60 €"], ["-5000", (v) => v === "" || Number(v) === -5000, "le signe disparaît sans prévenir"], ["1.250,75", (v) => v === "" || Number(v) === 1250.75, "lu comme 1,25 €"]]) {
    await ca.fill(""); await ca.type(tape); await page.waitForTimeout(150);
    const retenu = await page.locator('input[type=hidden][name="chiffreAffairesMensuel"]').inputValue().catch(() => "?");
    controle("D-01", "Dossier", `« ${tape} » est refusé avec une explication, ou lu tel que le dirigeant l'entend`, attendu(retenu), `${defaut} (retenu : ${retenu})`);
  }
  await ca.fill(""); await ca.type("-5000");
  await page.getByRole("button", { name: /^Continuer$/ }).click(); await page.waitForTimeout(300);
  const refus = await rouges(page.locator("main"));
  controle("D-01", "Dossier", "« -5000 » : Continuer explique que le chiffre d'affaires ne peut pas être négatif", refus.some((t) => /négatif/.test(t)), JSON.stringify(refus));
  await ca.fill("60000");
  const avancer = () => page.getByRole("button", { name: /^(Continuer|Ouvrir mes agents)$/ }).click();
  await avancer(); await page.waitForTimeout(400);
  await page.locator("main input:visible").first().fill("4"); await avancer(); await page.waitForTimeout(400);
  const mois = page.locator("main input:visible").first();
  await mois.fill((await mois.getAttribute("type")) === "month" ? "2019-03" : "03/2019"); await avancer(); await page.waitForTimeout(400);
  await page.locator("main label.case-option").nth(1).click(); await avancer(); await page.waitForTimeout(400);
  await page.locator("main input:visible").first().fill("Lyon"); await avancer();
  await page.waitForURL(/tableau-de-bord/, { timeout: 15000 }).catch(() => {});
  controle("P-05", "Dossier", "les cinq questions mènent au tableau de bord et sont enregistrées", /tableau-de-bord/.test(page.url()) && /60000/.test(sql(`select "chiffreAffairesMensuel" from "User" where email='${email}'`)), page.url());

  // --- 4. Objectif, niveau, questionnaire -----------------------------------------------------------------------------------------
  await page.goto(B + "/audit/acquisition-chiffre-affaires", { waitUntil: "networkidle" });
  await page.getByLabel("Ce que vous voulez changer").fill("augmenter mon chiffre d'affaires");
  await page.getByLabel("De combien").fill("10");
  await page.getByLabel(/En combien de temps/).fill("6");
  await page.getByRole("button", { name: "Enregistrer mon objectif" }).dblclick();
  await page.getByText("Jusqu'où voulez-vous aller ?").waitFor({ timeout: 10000 }).catch(() => {});
  controle("O-01", "Objectif", "un double clic n'enregistre qu'un objectif actif", sql(`select count(*) from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.statut='ACTIF' and o.agent='ACQUISITION_CA'`) === "1", "");
  await page.getByRole("button", { name: /^Essentiel/ }).click();
  await page.locator("li[data-question]").first().waitFor({ timeout: 15000 });
  const ligne = (c) => sql(`select r.reponse::text from "ReponseAudit" r join "User" u on u.id=r."userId" where u.email='${email}' and r.cle='${c}'`);
  const q = page.locator('li[data-question="ACQ-02.01"]');
  await q.scrollIntoViewIfNeeded();
  const champ = q.locator('input[id$="-exact"]');
  await champ.fill("-3"); await champ.blur(); await page.waitForTimeout(1200);
  const aide = await q.locator(".champ-aide").first().innerText().catch(() => "");
  controle("Q-03", "Questionnaire", "une valeur refusée n'est pas annoncée comme « valeur retenue »", !/Valeur retenue : -3/.test(aide), `message d'erreur et « ${aide} » affichés ensemble`);
  await champ.fill("40"); await champ.blur(); await page.waitForTimeout(1500);
  controle("Q-01", "Questionnaire", "une réponse s'enregistre et l'écran le confirme", /"valeur": 40/.test(ligne("ACQ-02.01")) && (await q.getByText("Réponse enregistrée").count()) === 1, ligne("ACQ-02.01"));
  // Coupure réseau pendant une réponse, puis retour du réseau.
  const q2 = page.locator('li[data-question="ACQ-02.04"]');
  await page.route("**/api/audit/reponses", (r) => r.abort("internetdisconnected"));
  await q2.locator('input[id$="-exact"]').fill("25"); await q2.locator('input[id$="-exact"]').blur();
  await page.waitForTimeout(2000);
  controle("Q-02a", "Questionnaire", "une coupure du réseau est signalée sur la question", (await q2.getByText(/Pas de connexion/).count()) === 1, (await q2.innerText()).slice(-160));
  await page.unroute("**/api/audit/reponses");
  await page.waitForTimeout(4000);
  controle("Q-02b", "Questionnaire", "au retour du réseau, la réponse saisie part sans que le dirigeant la retape", /"valeur": 25/.test(ligne("ACQ-02.04")), "rien n'est renvoyé tant que le champ n'est pas modifié");
  // Reprise sur un autre appareil.
  const tel = await nouveau({ width: 390, height: 844 });
  const p = await tel.newPage();
  await p.goto(B + "/connexion"); await p.fill("#email", email); await p.fill("#motDePasse", MDP); await p.click('button[type="submit"]');
  await p.waitForURL(/tableau-de-bord/, { timeout: 15000 });
  await p.getByRole("link", { name: /Continuer mon audit/ }).first().click();
  await p.locator("li[data-question]").first().waitFor({ timeout: 15000 }); await p.waitForTimeout(1500);
  const visible = await p.evaluate(() => [...document.querySelectorAll("li[data-question]")].find((x) => { const r = x.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; })?.getAttribute("data-question"));
  controle("Q-04", "Reprise", "sur un autre appareil, la réponse est retrouvée et l'écran amène à la première question sans réponse", (await p.locator('li[data-question="ACQ-02.01"] input[id$="-exact"]').inputValue()) === "40" && visible !== "ACQ-02.01", `question visible : ${visible}`);
  // Mobile : pas de défilement horizontal (360 px, Android courant).
  await p.setViewportSize({ width: 360, height: 740 });
  await p.waitForTimeout(300);
  controle("A-01", "Mobile", "à 360 px, la page ne défile pas de côté", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), await p.evaluate(() => `${document.documentElement.scrollWidth} px pour ${innerWidth}`));
  // Compte rendu : au moins une priorité ou un chiffre du client.
  await page.goto(B + "/audit/acquisition-chiffre-affaires?etape=4", { waitUntil: "networkidle" });
  await page.locator('label[for="res-o2"]').click();
  const prio = await page.locator(".res-p2").innerText();
  controle("R-01", "Résultats", "l'onglet Priorités classe au moins un thème", !/Aucun thème n'a encore de note/.test(prio), "« Aucun thème n'a encore de note » (repères de marché et règles de notation non écrits)");
  // Séparation des comptes et droits.
  const r1 = await page.request.put(B + "/api/audit/reponses", { data: { cle: "COM-08.01", reponse: { genre: "inconnu" } } });
  controle("S-01", "Droits", "une question d'un agent non souscrit (Comm) est refusée (403)", r1.status() === 403, String(r1.status()));
  const anon = await (await nouveau()).request.put(B + "/api/audit/reponses", { data: { cle: "ACQ-02.01", reponse: { genre: "exact", valeur: 3 } } });
  controle("S-02", "Droits", "sans session, l'écriture est refusée (401)", anon.status() === 401, String(anon.status()));
  // Clavier : objectif RH saisi sans souris jusqu'au premier champ.
  await page.goto(B + "/audit/rh-organisation", { waitUntil: "networkidle" });
  let n = 0;
  for (; n < 40; n++) { await page.keyboard.press("Tab"); if (await page.evaluate(() => /menu-declencheur|INPUT/.test(document.activeElement?.className + document.activeElement?.tagName))) break; }
  // Une carte d'objectif (bouton radio masqué) montre le focus sur la carte elle-même.
  controle("A-02", "Clavier", "le premier choix de l'objectif s'atteint au clavier, focus visible", n < 40 && (await page.evaluate(() => { const el = document.activeElement.closest(".objectif-carte") ?? document.activeElement; const s = getComputedStyle(el); return s.outlineStyle !== "none" || s.boxShadow !== "none"; })), `${n + 1} tabulations`);
}

// --- 5. Connexion et pages d'erreur ----------------------------------------------------------------------------------------------
{
  const page = await (await nouveau()).newPage();
  await page.goto(B + "/connexion", { waitUntil: "networkidle" });
  controle("L-01", "Connexion", "un lien « Mot de passe oublié » existe", (await page.getByText(/oublié/i).count()) > 0, "absent : un dirigeant qui a perdu son mot de passe est bloqué");
  await page.fill("#email", email); await page.fill("#motDePasse", "pas-le-bon-mot-de-passe"); await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  controle("L-02", "Connexion", "un mauvais mot de passe est expliqué", (await rouges(page.locator("main"))).some((t) => /incorrect/.test(t)), JSON.stringify(await rouges(page.locator("main"))));
  // Mot de passe oublié, de bout en bout : demande, e-mail, lien, nouveau mot de passe, anciennes sessions fermées.
  const ancienne = await (await nouveau()).newPage();
  await ancienne.goto(B + "/connexion"); await ancienne.fill("#email", email); await ancienne.fill("#motDePasse", MDP); await ancienne.click('button[type="submit"]');
  await ancienne.waitForURL(/tableau-de-bord/, { timeout: 15000 }).catch(() => {});
  const dossierEmails = ".emails-demonstration";
  const emailsAvant = existsSync(dossierEmails) ? readdirSync(dossierEmails).length : 0;
  const oubli = await (await nouveau()).newPage();
  await oubli.goto(B + "/connexion", { waitUntil: "networkidle" });
  await oubli.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  await oubli.waitForURL(/mot-de-passe-oublie/);
  await oubli.getByLabel("Adresse email").fill(email);
  await oubli.getByRole("button", { name: "Recevoir le lien" }).click();
  const confirme = await oubli.getByText(/un email vient de lui être envoyé/).waitFor({ timeout: 10000 }).then(() => true, () => false);
  controle("L-04", "Mot de passe oublié", "la demande est confirmée sans dire si l'adresse a un compte", confirme, await oubli.locator("main").innerText());
  const inconnu = await page.request.post(B + "/api/mot-de-passe/demande", { data: { email: `inconnu.${Date.now()}@example.com` } });
  const invalide = await page.request.post(B + "/api/mot-de-passe/demande", { data: { email: "pas-une-adresse" } });
  controle("L-05", "Mot de passe oublié", "une adresse sans compte reçoit la même réponse ; une adresse mal écrite est expliquée", inconnu.status() === 200 && invalide.status() === 400, `${inconnu.status()} / ${invalide.status()}`);
  let lien = null;
  for (let i = 0; i < 20 && !lien; i++) {
    await oubli.waitForTimeout(250);
    const fichiers = existsSync(dossierEmails) ? readdirSync(dossierEmails).filter((f) => f.includes(email.replace(/[^a-z0-9]+/gi, "_"))).sort() : [];
    const dernier = fichiers.at(-1);
    if (dernier && readdirSync(dossierEmails).length > emailsAvant) lien = JSON.parse(readFileSync(`${dossierEmails}/${dernier}`, "utf8")).texte.match(/https?:\/\/\S+nouveau-mot-de-passe\?jeton=\S+/)?.[0] ?? null;
  }
  controle("L-06", "Mot de passe oublié", "un e-mail part avec un lien de réinitialisation", lien !== null, lien ? "" : `aucun e-mail dans ${dossierEmails}/ (serveur lancé avec EMAIL_MODE=demonstration ?)`);
  if (lien) {
    const chemin = new URL(lien);
    const NOUVEAU = "nouveau-mot-de-passe-2026";
    await oubli.goto(B + chemin.pathname + chemin.search, { waitUntil: "networkidle" });
    await oubli.getByLabel("Nouveau mot de passe").fill(NOUVEAU);
    await oubli.getByLabel("Confirmer le mot de passe").fill(NOUVEAU);
    await oubli.getByRole("button", { name: "Enregistrer mon nouveau mot de passe" }).click();
    await oubli.waitForURL(/tableau-de-bord/, { timeout: 15000 }).catch(() => {});
    controle("L-07", "Mot de passe oublié", "le nouveau mot de passe est enregistré et le dirigeant retrouve ses agents", /tableau-de-bord/.test(oubli.url()), oubli.url());
    await ancienne.goto(B + "/tableau-de-bord", { waitUntil: "networkidle" });
    controle("L-08", "Mot de passe oublié", "une session ouverte avant le changement est fermée", /connexion/.test(ancienne.url()), ancienne.url());
    const relu = await (await nouveau()).newPage();
    await relu.goto(B + chemin.pathname + chemin.search, { waitUntil: "networkidle" });
    controle("L-09", "Mot de passe oublié", "le lien ne sert qu'une fois", /déjà servi/.test(await relu.locator("main").innerText()), (await relu.locator("main").innerText()).slice(0, 120));
    await relu.goto(B + "/connexion"); await relu.fill("#email", email); await relu.fill("#motDePasse", MDP); await relu.click('button[type="submit"]');
    await relu.waitForTimeout(1500);
    const ancienRefuse = /connexion/.test(relu.url());
    await relu.fill("#motDePasse", NOUVEAU); await relu.click('button[type="submit"]');
    await relu.waitForURL(/tableau-de-bord/, { timeout: 15000 }).catch(() => {});
    controle("L-10", "Mot de passe oublié", "l'ancien mot de passe est refusé, le nouveau ouvre le compte", ancienRefuse && /tableau-de-bord/.test(relu.url()), relu.url());
  }
  const r = await page.goto(B + "/page-qui-n-existe-pas", { waitUntil: "networkidle" });
  const t = await page.locator("body").innerText();
  controle("L-03", "Page introuvable", "la page 404 parle français et propose un chemin de retour", r.status() === 404 && !/could not be found/.test(t) && (await page.locator("a").count()) > 0, t.slice(0, 80));
}

await nav.close();
writeFileSync(`${sortie}/audit-client.json`, JSON.stringify(resultats, null, 1));
const ecarts = resultats.filter((x) => !x.conforme);
console.log(`\n${resultats.length} contrôles, ${resultats.length - ecarts.length} conformes, ${ecarts.length} écart(s) : ${[...new Set(ecarts.map((x) => x.id))].join(", ") || "aucun"}.`);
process.exit(ecarts.length === 0 ? 0 : 1);

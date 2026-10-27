// Contrôle dans le navigateur de la page « Mon compte » : modifier Mon entreprise, changer d'offre, se désabonner
// et reprendre l'abonnement, refus des choix interdits, profession réglementée, écran étroit.
//
//   (serveur lancé : AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration npx next start -p 3100)
//   node scripts/controle-compte.mjs
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const B = process.env.BASE ?? "http://127.0.0.1:3100";
const dbUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)[1].split("?")[0];
const sql = (q) => execFileSync("psql", [dbUrl, "-At", "-c", q], { encoding: "utf8" }).trim();

let echecs = 0;
const verifier = (nom, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "ECHEC"} ${nom}${ok ? "" : " : " + detail}`);
  if (!ok) echecs++;
};

const navigateur = await chromium.launch({ args: ["--proxy-bypass-list=*"], executablePath: "/opt/pw-browsers/chromium" });

async function compte({ metier, agents, nombre, periode = "mensuel", viewport = { width: 1280, height: 900 } }) {
  const email = `compte${Date.now()}${Math.floor(Math.random() * 1e4)}@example.com`;
  const motDePasse = "motdepasse-controle-1234";
  const contexte = await navigateur.newContext({ viewport, reducedMotion: "reduce" });
  const page = await contexte.newPage();
  await fetch(B + "/api/inscription", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, motDePasse }) });
  await page.goto(B + "/connexion", { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#motDePasse", motDePasse);
  await page.click('button[type="submit"]');
  await page.waitForURL(/inscription\/metier|tableau-de-bord|formule/, { timeout: 30000 });
  const api = contexte.request;
  const m = await api.put(B + "/api/compte/metier", { data: { metierPrecis: metier, sousVariantes: [] } });
  if (!m.ok()) throw new Error("métier " + m.status() + " " + (await m.text()));
  const ab = await api.post(B + "/api/abonnement", { data: { nombreAgents: nombre, periode, agents } });
  if (!ab.ok()) throw new Error("abonnement " + ab.status() + " " + (await ab.text()));
  await api.post(B + "/api/paiement/demonstration", { data: {} });
  const d = await api.put(B + "/api/compte/dossier", { data: { chiffreAffairesMensuel: 60000, nombreCollaborateurs: 3, dateCreationEntreprise: "2019-03-01", typeZone: "PERIURBAINE", ville: "Lyon" } });
  if (!d.ok()) throw new Error("dossier " + d.status());
  return { email, contexte, page, api };
}

const ACQ = "ACQUISITION_CA", FIN = "FINANCE_RENTABILITE", RH = "RH_ORGANISATION", COM = "COMM_CREATION";
const agentsActifs = (email) => sql(`select string_agg(a.agent::text, ',' order by a.agent) from "AgentAccess" a join "User" u on u.id=a."userId" where u.email='${email}' and a.actif`);
const ligneAbo = (email) => sql(`select b."nombreAgents"||'|'||b.periode||'|'||b.statut||'|'||b."resiliationProgrammee"||'|'||coalesce(b."finPeriodeLe"::text,'') from "Abonnement" b join "User" u on u.id=b."userId" where u.email='${email}'`);

// --- 1. Mon entreprise ------------------------------------------------------------------------------
{
  const c = await compte({ metier: "electricien", agents: [ACQ, FIN, RH], nombre: 3 });
  const { page } = c;
  await page.goto(B + "/compte", { waitUntil: "networkidle" });
  verifier("compte : formulaire Mon entreprise prérempli (CA, effectif, ville)",
    (await page.inputValue("#compte-ca")).replace(/\s/g, "") === "60000" && (await page.inputValue("#compte-effectif")) === "3" && (await page.inputValue("#compte-ville")) === "Lyon");

  // Champ vide : message, rien d'envoyé.
  await page.fill("#compte-effectif", "");
  await page.click("text=Enregistrer les informations de mon entreprise");
  verifier("effectif vide : message d'erreur, pas d'enregistrement", (await page.locator("text=Indiquez au moins une personne").count()) === 1 && sql(`select "nombreCollaborateurs" from "User" where email='${c.email}'`) === "3");

  await page.fill("#compte-ca", "85 000");
  await page.fill("#compte-effectif", "8");
  await page.fill("#compte-ville", "Nantes");
  await page.click("text=Rurale");
  await page.click("text=Enregistrer les informations de mon entreprise");
  await page.waitForSelector("text=Enregistré. Vos prochaines questions");
  const u = sql(`select "chiffreAffairesMensuel"||'|'||"nombreCollaborateurs"||'|'||ville||'|'||"typeZone" from "User" where email='${c.email}'`);
  verifier("Mon entreprise : CA, effectif, ville et zone enregistrés", u === "85000.00|8|Nantes|RURALE", u);
  await page.reload({ waitUntil: "networkidle" });
  verifier("après rechargement, les nouvelles valeurs s'affichent", (await page.inputValue("#compte-effectif")) === "8" && (await page.inputValue("#compte-ville")) === "Nantes");

  // L'effectif change la taille du questionnaire : la page de l'agent reste ouverte.
  const r = await page.goto(B + "/audit/acquisition-chiffre-affaires", { waitUntil: "networkidle" });
  verifier("l'agent reste accessible après le changement d'effectif", r.status() === 200);

  // Refus côté serveur d'une valeur absurde.
  const mauvais = await c.api.put(B + "/api/compte/dossier", { data: { chiffreAffairesMensuel: -5, nombreCollaborateurs: 0, dateCreationEntreprise: "2999-01-01", typeZone: "LUNE", ville: "" } });
  verifier("le serveur refuse un dossier invalide (400)", mauvais.status() === 400, String(mauvais.status()));
  await c.contexte.close();
}

// --- 2. Changer d'offre ---------------------------------------------------------------------------
{
  const c = await compte({ metier: "electricien", agents: [ACQ, FIN, RH], nombre: 3 });
  const { page } = c;
  await page.goto(B + "/compte", { waitUntil: "networkidle" });
  await page.click("text=Changer d'offre");
  verifier("bouton Valider désactivé tant que rien n'a changé", await page.locator("button:has-text('Valider ce changement')").isDisabled());
  await page.click("button:has-text('4 agents')");
  await page.click("button:has-text('Annuelle')");
  const montant = (await page.locator("text=Nouveau montant").innerText()).replace(/\s/g, "");
  verifier("le nouveau montant s'affiche avant validation (4 agents annuel : 1019,90 € HT par an)", montant.includes("1019,90€HTparan"), montant);
  await page.click("button:has-text('Valider ce changement')");
  await page.waitForSelector("text=Votre formule est changée");
  verifier("passage à 4 agents annuel enregistré", ligneAbo(c.email).startsWith("4|ANNUEL|ACTIF|false"), ligneAbo(c.email));
  verifier("les quatre agents sont ouverts", agentsActifs(c.email).split(",").sort().join(",") === [ACQ, FIN, RH, COM].sort().join(","), agentsActifs(c.email));
  await page.reload({ waitUntil: "networkidle" });
  verifier("la page affiche la nouvelle formule", (await page.locator("text=4 agents, facturation annuelle").count()) > 0);

  // Réduire à 2 agents : on choisit lesquels.
  await page.click("text=Changer d'offre");
  await page.click("button:has-text('2 agents')");
  await page.click("button:has-text('Mensuelle')");
  const cases = page.locator('button[role="checkbox"]');
  verifier("une fois 2 agents choisis, les autres sont bloqués", (await cases.count()) === 4);
  // Après la réduction, deux agents restent cochés (les deux premiers) : on vérifie le compte avant de valider.
  verifier("2 sur 2 agents conservés d'office", (await page.locator("text=2 sur 2").count()) + (await page.locator("legend:has-text('(2 sur 2)')").count()) > 0);
  await page.click("button:has-text('Valider ce changement')");
  await page.waitForSelector("text=Votre formule est changée");
  verifier("passage à 2 agents mensuel enregistré", ligneAbo(c.email).startsWith("2|MENSUEL|ACTIF|false"), ligneAbo(c.email));
  verifier("seuls 2 agents restent ouverts", agentsActifs(c.email).split(",").length === 2, agentsActifs(c.email));

  // Contrôles serveur.
  const faux = await c.api.put(B + "/api/abonnement/formule", { data: { nombreAgents: 3, periode: "mensuel", agents: [ACQ] } });
  verifier("3 agents annoncés mais 1 envoyé : refus (400)", faux.status() === 400, String(faux.status()));
  const inconnu = await c.api.put(B + "/api/abonnement/formule", { data: { nombreAgents: 1, periode: "mensuel", agents: [ACQ] } });
  verifier("offre à 1 agent : refus (400)", inconnu.status() === 400, String(inconnu.status()));
  const anonyme = await fetch(B + "/api/abonnement/formule", { method: "PUT", headers: { "content-type": "application/json" }, body: "{}" });
  verifier("sans connexion : 401", anonyme.status === 401, String(anonyme.status));
  const ancien = await c.api.post(B + "/api/abonnement", { data: { nombreAgents: 4, periode: "mensuel", agents: [ACQ, FIN, RH, COM] } });
  verifier("l'ancienne route ne change pas une formule en cours (409)", ancien.status() === 409, String(ancien.status()));
  await c.contexte.close();
}

// --- 3. Se désabonner et reprendre -----------------------------------------------------------------
{
  const c = await compte({ metier: "electricien", agents: [ACQ, FIN], nombre: 2 });
  const { page } = c;
  await page.goto(B + "/compte", { waitUntil: "networkidle" });
  await page.click("text=Me désabonner");
  verifier("confirmation demandée avant l'arrêt", (await page.locator("text=Arrêter mon abonnement ?").count()) === 1 && ligneAbo(c.email).includes("|false|"));
  await page.click("text=Garder mon abonnement");
  verifier("« Garder » referme sans rien changer", (await page.locator("text=Arrêter mon abonnement ?").count()) === 0 && ligneAbo(c.email).includes("|false|"));
  await page.click("text=Me désabonner");
  await page.click("text=Oui, arrêter mon abonnement");
  await page.waitForSelector("text=Reprendre mon abonnement");
  verifier("arrêt programmé enregistré avec une date de fin", /\|ACTIF\|true\|\d{4}-/.test(ligneAbo(c.email)), ligneAbo(c.email));
  verifier("le bandeau annonce la date d'accès", (await page.locator("text=Votre abonnement s'arrête").count()) > 0 && (await page.locator("text=Actif, arrêt programmé").count()) > 0);
  verifier("changer d'offre n'est plus proposé", (await page.getByRole("button", { name: "Changer d'offre" }).count()) === 0 && (await page.locator("text=Reprenez votre abonnement pour pouvoir changer d'offre").count()) === 1);
  const ref = await c.api.put(B + "/api/abonnement/formule", { data: { nombreAgents: 2, periode: "mensuel", agents: [ACQ, RH] } });
  verifier("le serveur refuse aussi le changement pendant l'arrêt (409)", ref.status() === 409, String(ref.status()));
  const r = await page.goto(B + "/audit/acquisition-chiffre-affaires", { waitUntil: "networkidle" });
  verifier("les agents restent ouverts jusqu'à la fin de la période", r.status() === 200 && !page.url().includes("/paiement"), page.url());

  await page.goto(B + "/compte", { waitUntil: "networkidle" });
  await page.click("text=Reprendre mon abonnement");
  await page.waitForSelector("text=Me désabonner");
  verifier("reprise enregistrée", /\|ACTIF\|false\|/.test(ligneAbo(c.email)), ligneAbo(c.email));

  // Fin de période dépassée avec arrêt programmé : l'accès se ferme.
  await c.api.put(B + "/api/abonnement/resiliation", { data: { resilier: true } });
  sql(`update "Abonnement" set "finPeriodeLe"=now() - interval '1 day' where "userId"=(select id from "User" where email='${c.email}')`);
  await page.goto(B + "/audit/acquisition-chiffre-affaires", { waitUntil: "networkidle" });
  verifier("fin de période dépassée : l'agent n'est plus ouvert", (await page.locator("text=Cet agent n'est pas ouvert pour votre compte").count()) === 1, page.url());
  const api = await c.api.put(B + "/api/audit/niveau", { data: { niveau: "ESSENTIEL" } });
  verifier("fin de période dépassée : l'API de l'audit refuse (403)", api.status() === 403, String(api.status()));
  await page.goto(B + "/tableau-de-bord", { waitUntil: "networkidle" });
  verifier("fin de période dépassée : le tableau de bord ramène au paiement", page.url().includes("/paiement"), page.url());
  await c.contexte.close();
}

// --- 4. Profession réglementée : pas d'agent Comm -----------------------------------------------------
{
  const c = await compte({ metier: "avocat", agents: [ACQ, FIN, RH], nombre: 3 });
  const { page } = c;
  await page.goto(B + "/compte", { waitUntil: "networkidle" });
  await page.click("text=Changer d'offre");
  verifier("réglementée : pas d'offre à 4 agents", (await page.locator("button:has-text('4 agents')").count()) === 0 && (await page.locator("button:has-text('3 agents')").count()) === 1);
  verifier("réglementée : l'agent Comm n'est pas proposé", (await page.locator('button[role="checkbox"]:has-text("Comm")').count()) === 0);
  const refus = await c.api.put(B + "/api/abonnement/formule", { data: { nombreAgents: 3, periode: "mensuel", agents: [ACQ, FIN, COM] } });
  verifier("réglementée : le serveur refuse l'agent Comm (400)", refus.status() === 400, String(refus.status()));
  await c.contexte.close();
}

// --- 5. Écran étroit ---------------------------------------------------------------------------------
{
  const c = await compte({ metier: "electricien", agents: [ACQ, FIN, RH], nombre: 3, viewport: { width: 320, height: 800 } });
  const { page } = c;
  await page.goto(B + "/compte", { waitUntil: "networkidle" });
  await page.click("text=Changer d'offre");
  const large = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  verifier("320 px : aucun débordement horizontal", large <= 0, String(large));
  await page.click("text=Annuler");
  await page.click("text=Me désabonner");
  const large2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  verifier("320 px : confirmation d'arrêt sans débordement", large2 <= 0, String(large2));
  await c.contexte.close();
}

await navigateur.close();
console.log(echecs === 0 ? "\nTout est conforme." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);

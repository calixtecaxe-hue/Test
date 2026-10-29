// Retours en arrière et départs de page (vérification du 28 octobre) : une réponse tapée n'est pas perdue quand le dirigeant
// quitte la page sans sortir du champ, actualise, ou revient en arrière avec le navigateur.
//
//   node scripts/verification/retours.mjs [--sortie docs/verification/resultats]
import { chromium, B, journal, creerCompte, reponseDb, carte, stabiliser } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const { controle, ecrire } = journal("retours");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const ACQ = B + "/audit/acquisition-chiffre-affaires";
const { email, page } = await creerCompte(nav, { agents: ["ACQ", "FIN"] });
const champ = (code) => carte(page, code).locator('input[id$="-exact"]').first();
const attendre = (ms) => page.waitForTimeout(ms);

// 1. Taper puis cliquer sur « Mes agents » sans quitter le champ.
await page.goto(ACQ, { waitUntil: "networkidle" });
await champ("ACQ-02.01").fill("31");
await page.getByRole("link", { name: /Mes agents/ }).first().click();
await page.waitForURL(/tableau-de-bord/);
await attendre(1500);
controle("B-01", "réponse tapée puis lien « Mes agents » cliqué sans quitter le champ : la réponse est enregistrée", reponseDb(email, "ACQ-02.01")?.valeur === 31, JSON.stringify(reponseDb(email, "ACQ-02.01")));

// 2. Taper puis actualiser la page sans quitter le champ.
await page.goto(ACQ, { waitUntil: "networkidle" });
await champ("ACQ-02.02").fill("12");
await page.reload({ waitUntil: "networkidle" });
await attendre(800);
const apresActualisation = reponseDb(email, "ACQ-02.02");
controle("B-02", "réponse tapée puis page actualisée sans quitter le champ : la réponse est enregistrée, ou le navigateur prévient avant de quitter", apresActualisation?.valeur === 12, JSON.stringify(apresActualisation));

// 3. Taper, sortir du champ, aller au compte rendu, puis bouton « retour » du navigateur.
await page.goto(ACQ, { waitUntil: "networkidle" });
await champ("ACQ-02.03").fill("4");
await champ("ACQ-02.03").press("Tab");
await stabiliser(page, 1200);
await page.goto(ACQ + "?etape=4", { waitUntil: "networkidle" });
await page.goBack({ waitUntil: "networkidle" });
await attendre(800);
controle("B-03", "retour arrière du navigateur depuis le compte rendu : la réponse 4 est affichée", (await champ("ACQ-02.03").inputValue()) === "4", await champ("ACQ-02.03").inputValue());

// 4. Changer une réponse, retour arrière, puis avant : l'écran montre la dernière réponse, pas une copie ancienne.
await champ("ACQ-02.03").fill("9");
await champ("ACQ-02.03").press("Tab");
await stabiliser(page, 1200);
await page.goto(B + "/tableau-de-bord", { waitUntil: "networkidle" });
await page.goBack({ waitUntil: "networkidle" });
await attendre(800);
controle("B-04", "réponse changée en 9, départ puis retour arrière : l'écran affiche 9 (pas l'ancienne valeur 4)", (await champ("ACQ-02.03").inputValue()) === "9", await champ("ACQ-02.03").inputValue());

// 5. Fermeture de l'onglet juste après la frappe (sans sortir du champ) : départ par l'onglet fermé.
await champ("ACQ-02.04").fill("6");
await page.close({ runBeforeUnload: true });
await new Promise((r) => setTimeout(r, 1500));
controle("B-05", "réponse tapée puis onglet fermé sans quitter le champ : la réponse est enregistrée", reponseDb(email, "ACQ-02.04")?.valeur === 6, JSON.stringify(reponseDb(email, "ACQ-02.04")));

await nav.close();
process.exit(ecrire(sortie) ? 1 : 0);

// Captures d'écran de la vérification du 28 octobre (preuves visuelles des corrections) : docs/verification/captures/*.png.
//
//   node scripts/verification/captures.mjs
import { mkdirSync } from "node:fs";
import { chromium, B, creerCompte, carte, stabiliser } from "./outils.mjs";

const dossier = "docs/verification/captures";
mkdirSync(dossier, { recursive: true });
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const { page } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
const ACQ = B + "/audit/acquisition-chiffre-affaires";
const s = (v) => ({ genre: "saisie", valeur: v });
const poser = (cle, reponse) => page.request.put(B + "/api/audit/reponses", { data: { cle, reponse } });

// 1. Cadrage : « Effacer ma réponse » sous une question répondue.
await poser("D04", s("oui"));
await page.goto(ACQ, { waitUntil: "networkidle" });
await page.locator('div:has(> fieldset input[name="D04"])').first().screenshot({ path: `${dossier}/1-cadrage-effacer.png` });

// 2. Répartition par canal à refaire après l'ajout d'un canal.
await poser("ACQ-03.01", s(["bouche_a_oreille", "reseaux_sociaux"]));
await poser("ACQ-03.02", { genre: "valeurs", valeurs: { "bouche_a_oreille.part_des_demandes": 60, "reseaux_sociaux.part_des_demandes": 40 } });
await page.goto(ACQ, { waitUntil: "networkidle" });
await carte(page, "ACQ-03.01").locator("label.case-option", { hasText: /^Fiche Google$/ }).click();
await stabiliser(page, 2500);
await carte(page, "ACQ-03.02").screenshot({ path: `${dossier}/2-repartition-a-refaire.png` });

// 3. Valeur refusée : 120 % sur un canal, message, pas de « valeur retenue ».
const cellule = carte(page, "ACQ-03.02").locator("tbody tr td input").first();
await cellule.fill("120");
await cellule.press("Tab");
await stabiliser(page, 800);
await carte(page, "ACQ-03.02").screenshot({ path: `${dossier}/3-valeur-refusee.png` });

// 4. Téléphone (390 px) : le tableau défile dans son cadre.
const tel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce", storageState: await page.context().storageState() });
const pTel = await tel.newPage();
await pTel.goto(ACQ, { waitUntil: "networkidle" });
await carte(pTel, "ACQ-03.02").scrollIntoViewIfNeeded();
await carte(pTel, "ACQ-03.02").screenshot({ path: `${dossier}/4-telephone-tableau.png` });
await tel.close();

// 5. Budget marketing de la Finance pré-rempli d'après le détail.
await poser("ACQ-03.05", { genre: "valeurs", valeurs: { "bouche_a_oreille.depense_par_mois": 0, "reseaux_sociaux.depense_par_mois": 150, "fiche_google.depense_par_mois": 0 } });
for (const [c, v] of [["ACQ-07.01", 100], ["ACQ-07.03", 200], ["ACQ-07.04", 80]]) await poser(c, { genre: "exact", valeur: v });
await poser("COM-32.02", { genre: "valeurs", valeurs: { "community_manager.par_mois": 300 } });
await page.goto(B + "/audit/finance-rentabilite", { waitUntil: "networkidle" });
await carte(page, "FIN-05.02").scrollIntoViewIfNeeded();
await carte(page, "FIN-05.02").screenshot({ path: `${dossier}/5-finance-budget-prerempli.png` });

// 6. Compte rendu : thèmes à compléter et analysés.
await page.goto(ACQ + "?etape=4", { waitUntil: "networkidle" });
await page.locator("main").screenshot({ path: `${dossier}/6-compte-rendu.png` });

// 7. Mes agents : avancement.
await page.goto(B + "/tableau-de-bord", { waitUntil: "networkidle" });
await page.locator("li.carte-conseil").filter({ has: page.getByRole("progressbar") }).first().screenshot({ path: `${dossier}/7-mes-agents-avancement.png` });

await nav.close();
console.log("7 captures écrites dans", dossier);

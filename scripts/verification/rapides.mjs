// Changements rapides (vérification du 28 octobre) : le dirigeant coche, décoche et corrige sans attendre la fin de
// l'enregistrement. L'état final enregistré doit être le dernier choix fait à l'écran, et les questions qui en dépendent doivent
// suivre ce dernier choix.
//
//   node scripts/verification/rapides.mjs [--sortie docs/verification/resultats]
import { chromium, B, journal, creerCompte, reponseDb, carte, stabiliser, lignesTableau } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const { controle, ecrire } = journal("rapides");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const { email, page } = await creerCompte(nav, { agents: ["ACQ", "FIN"] });
const ACQ = B + "/audit/acquisition-chiffre-affaires";
await page.goto(ACQ, { waitUntil: "networkidle" });

// 1. Cinq clics de suite sur les canaux, sans pause : Bouche-à-oreille, Réseaux sociaux, Fiche Google, Bouche-à-oreille (décoché),
//    Site internet. Dernier état voulu : Réseaux sociaux, Fiche Google, Site internet.
const source = carte(page, "ACQ-03.01");
await source.scrollIntoViewIfNeeded();
for (const lib of ["Bouche-à-oreille", "Réseaux sociaux", "Fiche Google", "Bouche-à-oreille", "Site internet"]) {
  await source.locator("label.case-option", { hasText: new RegExp(`^${lib}$`) }).click({ delay: 0 });
}
await stabiliser(page, 4000);
const enBase = reponseDb(email, "ACQ-03.01")?.valeur ?? [];
const coches = await source.locator('input[type="checkbox"]:checked').evaluateAll((els) => els.map((e) => e.value));
const attendu = ["fiche_google", "reseaux_sociaux", "site_internet"];
controle("V-01", "cinq clics de suite sur les canaux : l'écran et la base gardent le dernier état (réseaux sociaux, fiche Google, site internet)", JSON.stringify([...enBase].sort()) === JSON.stringify(attendu) && JSON.stringify([...coches].sort()) === JSON.stringify(attendu), `base ${JSON.stringify(enBase)} écran ${JSON.stringify(coches)}`);
const lignes = (await lignesTableau(carte(page, "ACQ-03.02"))).map((l) => l.id);
controle("V-02", "la répartition par canal suit le dernier état : trois lignes, dans l'ordre de la liste des canaux", JSON.stringify([...lignes].sort()) === JSON.stringify(attendu) && lignes.length === 3, JSON.stringify(lignes));
await page.reload({ waitUntil: "networkidle" });
const apres = await carte(page, "ACQ-03.01").locator('input[type="checkbox"]:checked').evaluateAll((els) => els.map((e) => e.value));
controle("V-03", "après actualisation, les mêmes canaux sont cochés", JSON.stringify([...apres].sort()) === JSON.stringify(attendu), JSON.stringify(apres));

// 2. Un chiffre corrigé trois fois de suite (5, 0, 7) sur une question qui en ouvre une autre (appels manqués → ACQ-08.03).
const champ = carte(page, "ACQ-08.02").locator('input[id$="-exact"]').first();
await champ.scrollIntoViewIfNeeded();
for (const v of ["5", "0", "7"]) {
  await champ.fill(v);
  await champ.press("Tab");
}
await stabiliser(page, 4000);
controle("V-04", "chiffre corrigé trois fois de suite (5, 0, 7) : la base garde 7", reponseDb(email, "ACQ-08.02")?.valeur === 7, JSON.stringify(reponseDb(email, "ACQ-08.02")));
controle("V-05", "la question ouverte par un chiffre au-dessus de 0 (ACQ-08.03) est affichée, sans actualiser", (await carte(page, "ACQ-08.03").count()) === 1, String(await carte(page, "ACQ-08.03").count()));

// 3. Cadrage changé trois fois de suite (oui, non, oui) : publicité payante → coût par canal (ACQ-03.05).
for (const v of ["oui", "non", "oui"]) await page.locator(`label.case-option:has(input[name="D04"][value="${v}"])`).click({ delay: 0 });
await stabiliser(page, 4000);
controle("V-06", "cadrage « publicité payante » changé trois fois (oui, non, oui) : la base garde « oui »", reponseDb(email, "D04")?.valeur === "oui", JSON.stringify(reponseDb(email, "D04")));
controle("V-07", "le coût par canal (ouvert par « oui ») est affiché, sans actualiser", (await carte(page, "ACQ-03.05").count()) === 1, String(await carte(page, "ACQ-03.05").count()));

await nav.close();
process.exit(ecrire(sortie) ? 1 : 0);

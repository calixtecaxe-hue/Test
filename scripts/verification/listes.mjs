// Questions à liste (« Ajouter un élément ») : un élément ajouté par erreur se retire (demande du propriétaire, 28 octobre).
// Cas de référence : les catégories de clients (ACQ-01.01), dont les éléments deviennent les lignes de ACQ-01.02.
// Chaque étape vérifie l'écran, la réponse en base et le tableau qui dépend de la liste ; puis un téléphone de 360 px.
//
//   node scripts/verification/listes.mjs [--sortie docs/verification/resultats]
import { chromium, B, journal, creerCompte, reponseDb, carte, stabiliser, lignesTableau } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const CAPTURES = "docs/verification/captures-listes";
const { controle, ecrire } = journal("listes");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const URL_ACQ = B + "/audit/acquisition-chiffre-affaires";

const { email, page } = await creerCompte(nav, { agents: ["ACQ", "FIN"] });
await page.goto(URL_ACQ, { waitUntil: "networkidle" });
const liste = carte(page, "ACQ-01.01");
const tableau = carte(page, "ACQ-01.02");
const champs = () => liste.locator('input[type="text"]');
const textes = async () => champs().evaluateAll((l) => l.map((i) => i.value));
const ajouter = () => liste.getByRole("button", { name: "Ajouter un élément" });
const retirer = (nom) => liste.getByRole("button", { name: nom, exact: true });
const enBase = () => reponseDb(email, "ACQ-01.01")?.valeur ?? null;
const focusSur = () => page.evaluate(() => document.activeElement?.id ?? "");
const saisir = async (i, texte) => {
  await champs().nth(i).fill(texte);
  await champs().nth(i).blur();
  await stabiliser(page, 1500);
};

await liste.scrollIntoViewIfNeeded();
controle("LI-01", "Un seul champ vide : pas de bouton « Retirer »", (await champs().count()) === 1 && (await liste.getByRole("button", { name: /^Retirer/ }).count()) === 0);

await saisir(0, "Particuliers");
controle("LI-02", "Le premier élément est enregistré", JSON.stringify(enBase()) === '["Particuliers"]', JSON.stringify(enBase()));

await ajouter().click();
await page.waitForTimeout(200);
controle("LI-03", "« Ajouter un élément » ouvre un deuxième champ et y place le curseur", (await champs().count()) === 2 && (await focusSur()).endsWith("-el1"), await focusSur());
await page.screenshot({ path: `${CAPTURES}/ordinateur-1-element-ajoute.png`, clip: await liste.boundingBox() });

await retirer("Retirer l'élément 2").click();
await page.waitForTimeout(200);
controle("LI-04", "Un champ vide ajouté par erreur se retire, le curseur revient au champ précédent", (await champs().count()) === 1 && (await focusSur()).endsWith("-el0"), `${await champs().count()} champ(s), focus ${await focusSur()}`);
await stabiliser(page, 1200);
controle("LI-05", "Retirer un champ vide ne change pas la réponse enregistrée", JSON.stringify(enBase()) === '["Particuliers"]', JSON.stringify(enBase()));

await ajouter().click();
await saisir(1, "Professionnels");
await ajouter().click();
await saisir(2, "Collectivités");
controle("LI-06", "Trois éléments enregistrés", JSON.stringify(enBase()) === '["Particuliers","Professionnels","Collectivités"]', JSON.stringify(enBase()));
const lignesAvant = (await lignesTableau(tableau)).map((l) => l.libelle);
controle("LI-07", "Le tableau qui dépend de la liste a trois lignes", lignesAvant.length === 3, lignesAvant.join(" / "));

await retirer("Retirer « Professionnels »").click();
await stabiliser(page, 1500);
controle("LI-08", "« Retirer » enlève l'élément de l'écran, dans l'ordre", JSON.stringify(await textes()) === '["Particuliers","Collectivités"]', JSON.stringify(await textes()));
controle("LI-09", "… et de la réponse enregistrée", JSON.stringify(enBase()) === '["Particuliers","Collectivités"]', JSON.stringify(enBase()));
const lignesApres = (await lignesTableau(tableau)).map((l) => l.libelle);
controle("LI-10", "… et des lignes du tableau qui en dépend, sans actualiser la page", lignesApres.length === 2 && !lignesApres.some((l) => /Professionnels/.test(l)), lignesApres.join(" / "));
controle("LI-11", "Le curseur se place sur le champ qui a pris la place de l'élément retiré", (await focusSur()).endsWith("-el1"), await focusSur());

await page.reload({ waitUntil: "networkidle" });
await liste.scrollIntoViewIfNeeded();
controle("LI-12", "Après actualisation, la liste est celle qui reste", JSON.stringify(await textes()) === '["Particuliers","Collectivités"]', JSON.stringify(await textes()));

// Clavier : Tab jusqu'au bouton, puis Entrée.
await champs().nth(1).focus();
await page.keyboard.press("Tab");
const surBouton = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
await page.keyboard.press("Enter");
await stabiliser(page, 1500);
controle("LI-13", "Au clavier, « Retirer » se joint par Tab et s'actionne par Entrée", surBouton === "Retirer « Collectivités »" && JSON.stringify(enBase()) === '["Particuliers"]', `${surBouton} → ${JSON.stringify(enBase())}`);

// Le dernier élément se retire aussi : le champ reste, vide, et la question n'a plus de réponse.
await retirer("Retirer « Particuliers »").click();
await stabiliser(page, 1500);
controle("LI-14", "Retirer le dernier élément vide le champ et efface la réponse", (await champs().count()) === 1 && (await champs().first().inputValue()) === "" && enBase() === null, `${await champs().count()} champ(s), base ${JSON.stringify(enBase())}`);

// Maximum (4) : le bouton d'ajout laisse place à la limite, et revient quand on retire un élément.
for (const [i, t] of ["A", "B", "C", "D"].entries()) {
  if (i > 0) await ajouter().click();
  await saisir(i, `Catégorie ${t}`);
}
controle("LI-15", "À quatre éléments, plus de bouton d'ajout (limite affichée)", (await ajouter().count()) === 0 && (await liste.getByText("4 éléments au plus.").count()) === 1);
await retirer("Retirer « Catégorie C »").click();
await stabiliser(page, 1500);
controle("LI-16", "Après un retrait, le bouton d'ajout revient", (await ajouter().count()) === 1 && JSON.stringify(enBase()) === '["Catégorie A","Catégorie B","Catégorie D"]', JSON.stringify(enBase()));
await page.screenshot({ path: `${CAPTURES}/ordinateur-2-elements-retirables.png`, clip: await liste.boundingBox() });

// Téléphone (360 px) : le bouton tient à côté du champ, sans défilement horizontal.
const tel = await page.context().browser().newContext({ viewport: { width: 360, height: 780 }, reducedMotion: "reduce", storageState: await page.context().storageState() });
const pt = await tel.newPage();
await pt.goto(URL_ACQ, { waitUntil: "networkidle" });
const listeTel = carte(pt, "ACQ-01.01");
await listeTel.scrollIntoViewIfNeeded();
const mesure = await listeTel.evaluate((li) => {
  const r = li.getBoundingClientRect();
  const boutons = [...li.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Retirer").map((b) => b.getBoundingClientRect());
  const champsL = [...li.querySelectorAll('input[type="text"]')].map((i) => i.getBoundingClientRect().width);
  return { droite: r.right, boutonsDedans: boutons.every((b) => b.right <= r.right + 0.5 && b.width > 0), largeurMin: Math.min(...champsL), defile: document.documentElement.scrollWidth > window.innerWidth };
});
controle("LI-17", "Téléphone 360 px : boutons dans la carte, champs lisibles, pas de défilement horizontal", mesure.boutonsDedans && mesure.largeurMin >= 180 && !mesure.defile, JSON.stringify(mesure));
await pt.screenshot({ path: `${CAPTURES}/telephone-elements-retirables.png`, clip: await listeTel.boundingBox() });

await nav.close();
process.exit(ecrire(sortie) ? 1 : 0);

// Choix de l'objectif des agents RH et Comm (28 octobre) : une proposition de la liste ou « Définir mon propre objectif »,
// dans le navigateur, sur l'application construite et la base réelle, avec des comptes fictifs. Chaque contrôle compare l'écran
// ou la base à une valeur attendue écrite à la main. Captures sur ordinateur et téléphone dans docs/objectifs/captures.
//
//   node scripts/verification/objectifs.mjs [--sortie docs/verification/resultats]
import { readFileSync, mkdirSync } from "node:fs";
import { chromium, B, journal, creerCompte, connecter, sql } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const CAPTURES = "docs/objectifs/captures";
mkdirSync(CAPTURES, { recursive: true });
const { controle, ecrire } = journal("objectifs");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const DEF = JSON.parse(readFileSync("data/objectifs-agents.json", "utf8")).agents;
const AGENTS = {
  RH: { code: "RH_ORGANISATION", slug: "rh-organisation" },
  COM: { code: "COMM_CREATION", slug: "comm-creation-contenu" },
};

const formulaire = (page) => page.locator("form[data-objectif-choix]");
const ouvert = (page) => formulaire(page).locator("fieldset[data-emplacement]");
const cartes = (page) => ouvert(page).locator("li.objectif-carte[data-carte]");
const carte = (page, id) => ouvert(page).locator(`li[data-carte="${id}"]`);
// Le bouton radio de la carte elle-même (pas ceux de l'unité, dans ses champs).
const radio = (page, id) => carte(page, id).locator(".objectif-carte-tete input[type=radio]");
const enregistrer = (page) => page.getByRole("button", { name: /^Enregistrer (mon objectif|mes objectifs)$/ });
const lignes = (email, agent) =>
  sql(`select o.statut||'|'||o."texteBrut"||'|'||coalesce(o.structure->>'origine','')||'|'||coalesce(o.structure->>'choix','')||'|'||(o.structure->>'quoi') from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.agent='${agent}' order by o."creeLe", o.id`)
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [statut, phrase, origine, choix, quoi] = l.split("|");
      return { statut, phrase, origine, choix, quoi };
    });
const actifs = (email, agent) => lignes(email, agent).filter((l) => l.statut === "ACTIF");
async function choisirCarte(page, id) {
  await carte(page, id).locator(".objectif-carte-tete").click();
  await page.waitForTimeout(150);
}
async function attendreEnregistrement(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);
}
async function capture(page, nom) {
  await page.screenshot({ path: `${CAPTURES}/${nom}.png`, fullPage: false });
}

// --- 1. Un parcours complet par agent ---------------------------------------------------------------------------------
for (const [court, A] of Object.entries(AGENTS)) {
  const def = DEF[A.code];
  const { email, contexte, page } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false });
  const url = `${B}/audit/${A.slug}`;
  await page.goto(url, { waitUntil: "networkidle" });
  const p = court; // préfixe des identifiants : RH ou COM

  controle(`${p}-01`, "l'écran s'ouvre sur « Quel objectif souhaitez-vous atteindre ? » et « Choisissez une proposition ou décrivez votre propre objectif. »", (await page.getByRole("heading", { name: "Quel objectif souhaitez-vous atteindre ?" }).count()) === 1 && (await page.getByText(/Choisissez une proposition ou décrivez votre propre objectif/).count()) === 1);

  // Comm : d'abord « Où en êtes-vous ? », puis les propositions de la partie choisie.
  const partie = def.parties?.[0]?.nom ?? null;
  if (partie) {
    controle(`${p}-02`, "Comm : deux parties à choisir, aucune proposition affichée avant ce choix", (await formulaire(page).locator("li[data-partie]").count()) === 2 && (await cartes(page).count()) === 0);
    await formulaire(page).locator(`li[data-partie="${partie}"] .objectif-carte-tete`).click();
  }
  const proposees = def.objectifs.filter((o) => !partie || o.groupe === partie);
  controle(`${p}-03`, `les ${proposees.length} propositions et « Définir mon propre objectif » sont dans le même ensemble`, (await cartes(page).count()) === proposees.length + 1 && (await carte(page, "personnel").getByText("Définir mon propre objectif").count()) === 1, await cartes(page).count());
  if (court === "COM") {
    await page.setViewportSize({ width: 1280, height: 900 });
    await capture(page, "com-ordinateur-1-propositions");
  } else await capture(page, "rh-ordinateur-1-propositions");

  // Rien de choisi : le bouton reste accessible et explique quoi faire.
  await enregistrer(page).click();
  await page.waitForTimeout(300);
  controle(`${p}-04`, "rien de choisi : « Choisissez une proposition ou décrivez votre propre objectif. », rien en base", (await formulaire(page).getByText("Choisissez une proposition ou décrivez votre propre objectif.").count()) >= 1 && lignes(email, A.code).length === 0);

  // Une proposition : la carte se marque « Choisi » (pas seulement par la couleur) et s'ouvre sur ses champs.
  const prop = proposees.find((o) => o.mesure === "chiffre" && !o.gabarit) ?? proposees[0];
  await choisirCarte(page, prop.id);
  const choisie = carte(page, prop.id);
  controle(`${p}-05`, `proposition « ${prop.libelle} » : coche, mot « Choisi », bouton radio coché, champs ouverts dans la carte`, (await choisie.getAttribute("class")).includes("choisie") && (await choisie.getByText("Choisi", { exact: true }).count()) === 1 && (await choisie.locator(".objectif-carte-tete input[type=radio]").isChecked()) && (await choisie.locator("[data-detail]").count()) === 1);
  if (court === "COM") await capture(page, "com-ordinateur-2-selection");
  else await capture(page, "rh-ordinateur-2-selection");

  // Objectif personnel : le champ « Décrivez votre objectif », avec son aide et son exemple ; la proposition n'est plus choisie.
  await choisirCarte(page, "personnel");
  const champ = page.getByLabel("Décrivez votre objectif");
  const aide = await page.locator("[id$='-texte-aide']").first().innerText().catch(() => "");
  controle(`${p}-06`, "« Définir mon propre objectif » : champ « Décrivez votre objectif », aide et exemple propres à l'agent, une seule modalité active", (await champ.count()) === 1 && aide.includes(def.personnel.exemple) && !(await carte(page, prop.id).locator(".objectif-carte-tete input[type=radio]").isChecked()) && (await ouvert(page).locator("li.objectif-carte.choisie").count()) === 1, aide);
  controle(`${p}-07`, "le champ personnel reçoit le focus à l'ouverture", await champ.evaluate((el) => el === document.activeElement));

  // Brouillon personnel gardé pendant un changement temporaire de mode.
  const texte = court === "RH" ? "Que l'équipe ouvre seule le magasin le samedi" : "Être connu dans ma ville pour la rénovation de salles de bain";
  await champ.fill(texte);
  await choisirCarte(page, prop.id);
  controle(`${p}-08`, "en passant à une proposition, le champ personnel disparaît et rien n'est transmis pour lui", (await page.getByLabel("Décrivez votre objectif").count()) === 0);
  await choisirCarte(page, "personnel");
  controle(`${p}-09`, "en revenant à l'objectif personnel, le texte écrit est retrouvé tel quel", (await page.getByLabel("Décrivez votre objectif").inputValue()) === texte, await page.getByLabel("Décrivez votre objectif").inputValue());

  // Saisie vide ou faite d'espaces : refusée, avec un message qui dit comment continuer.
  await page.getByLabel("Décrivez votre objectif").fill("    ");
  await page.getByLabel("Comment saurez-vous que c'est atteint ?").fill("je le constate chaque semaine");
  await page.getByLabel(/En combien de temps/).fill("4");
  await enregistrer(page).click();
  await page.waitForTimeout(400);
  controle(`${p}-10`, "texte fait d'espaces : « Décrivez votre objectif en quelques mots pour continuer. », le champ reçoit le focus, rien en base", (await page.getByText("Décrivez votre objectif en quelques mots pour continuer.").count()) === 1 && (await page.getByLabel("Décrivez votre objectif").evaluate((el) => el === document.activeElement)) && lignes(email, A.code).length === 0);
  await page.getByLabel("Décrivez votre objectif").fill(texte);
  if (court === "RH") await capture(page, "rh-ordinateur-3-personnel");
  else await capture(page, "com-ordinateur-3-personnel");
  await enregistrer(page).click();
  await attendreEnregistrement(page);
  const apres = actifs(email, A.code);
  controle(`${p}-11`, "objectif personnel enregistré : un seul objectif actif, origine « personnel », sans proposition, texte du dirigeant intact", apres.length === 1 && apres[0].origine === "personnel" && apres[0].choix === "" && apres[0].quoi === texte && apres[0].phrase === `${texte} en 4 mois`, JSON.stringify(apres));

  // Restitution : écran suivant, actualisation, reconnexion, retour à l'étape Objectif.
  const phrase = async () => (await page.locator("[data-objectif-phrase]").first().innerText().catch(() => "")).trim();
  controle(`${p}-12`, "écran suivant : la phrase de l'objectif personnel et la mention « Objectif personnel »", (await phrase()) === `${texte} en 4 mois` && (await page.getByText(/Objectif personnel/).count()) >= 1, await phrase());
  await page.reload({ waitUntil: "networkidle" });
  controle(`${p}-13`, "après actualisation : même objectif", (await phrase()) === `${texte} en 4 mois`);
  await contexte.clearCookies();
  await connecter(page, email);
  await page.goto(url, { waitUntil: "networkidle" });
  controle(`${p}-14`, "après déconnexion et reconnexion : même objectif", (await phrase()) === `${texte} en 4 mois`);
  await page.goto(`${url}?etape=1`, { waitUntil: "networkidle" });
  controle(`${p}-15`, "retour à l'étape Objectif : « Définir mon propre objectif » est choisi, avec le texte, la réussite et le délai", (await carte(page, "personnel").locator(".objectif-carte-tete input[type=radio]").isChecked()) && (await page.getByLabel("Décrivez votre objectif").inputValue()) === texte && (await page.getByLabel(/En combien de temps/).inputValue()) === "4");

  // Modifier : passer à une proposition chiffrée remplace l'objectif personnel (gardé en historique), sans doublon.
  await choisirCarte(page, prop.id);
  const chiffre = carte(page, prop.id).locator("input[id$='-ampleur']");
  if (await chiffre.count()) await chiffre.fill("15");
  else await page.getByLabel("Comment saurez-vous que c'est atteint ?").fill("je le constate");
  await page.getByLabel(/En combien de temps/).fill("6");
  await enregistrer(page).click();
  await attendreEnregistrement(page);
  const remplace = lignes(email, A.code);
  controle(`${p}-16`, "objectif modifié : un seul actif (la proposition), l'objectif personnel passe en historique « remplacé »", remplace.filter((l) => l.statut === "ACTIF").length === 1 && remplace.find((l) => l.statut === "ACTIF")?.choix === prop.id && remplace.some((l) => l.statut === "REMPLACE" && l.origine === "personnel" && l.quoi === texte), JSON.stringify(remplace));

  // Transmission au compte rendu (onglet Objectif).
  await page.goto(`${url}?etape=4`, { waitUntil: "networkidle" });
  const res = (await page.locator("[data-objectif-resultat] [data-objectif-phrase]").first().innerText().catch(() => "")).trim();
  controle(`${p}-17`, "compte rendu : l'objectif en cours est celui qui vient d'être choisi", res === remplace.find((l) => l.statut === "ACTIF")?.phrase, res);

  await contexte.close();
}

// --- 2. Cas particuliers ------------------------------------------------------------------------------------------------
{
  const { email, contexte, page } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false });
  const comUrl = `${B}/audit/comm-creation-contenu`;
  const ameliorer = DEF.COMM_CREATION.parties[0].nom;
  const miseEnPlace = DEF.COMM_CREATION.parties[1].nom;
  await page.goto(comUrl, { waitUntil: "networkidle" });
  await enregistrer(page).click();
  await page.waitForTimeout(300);
  controle("X-00", "Comm : enregistrer avant de choisir où l'on en est → « Choisissez d'abord où vous en êtes… », le focus va sur cette question", (await formulaire(page).getByText("Choisissez d'abord où vous en êtes, puis une proposition ou votre propre objectif.").count()) === 1 && (await page.evaluate(() => document.activeElement?.textContent?.trim() === "Où en êtes-vous ?")));
  await formulaire(page).locator(`li[data-partie="${ameliorer}"] .objectif-carte-tete`).click();

  // Un nombre visé : la phrase suit le gabarit (« obtenir 10 nouveaux avis clients »), sans choix d'unité.
  await choisirCarte(page, "com-avis");
  const avis = carte(page, "com-avis");
  controle("X-01", "« Obtenir plus d'avis clients » : le chiffre s'intitule « Combien de nouveaux avis ? », sans choix d'unité", (await avis.getByLabel("Combien de nouveaux avis ?").count()) === 1 && (await avis.getByText("Unité du chiffre").count()) === 0);
  await avis.getByLabel("Combien de nouveaux avis ?").fill("10");
  await avis.getByLabel(/En combien de temps/).fill("3");
  const apercu = (await avis.locator("[data-apercu]").innerText()).trim();
  controle("X-02", "aperçu : « obtenir 10 nouveaux avis clients sur les 3 prochains mois »", apercu.includes("obtenir 10 nouveaux avis clients sur les 3 prochains mois"), apercu);

  // Plusieurs objectifs : le premier se replie, le second ne peut pas reprendre la même proposition.
  await formulaire(page).locator("[data-ajouter]").click();
  await page.waitForTimeout(200);
  controle("X-03", "« Ajouter un autre objectif » : le premier se replie avec sa phrase, le second s'ouvre, la proposition déjà choisie y est indisponible", (await formulaire(page).locator("[data-replie]").count()) === 1 && (await radio(page, "com-avis").isDisabled()) && (await carte(page, "com-avis").getByText("Déjà parmi vos objectifs").count()) === 1);
  // Changer de partie avec un objectif de l'autre partie : refusé, expliqué.
  await formulaire(page).locator(`li[data-partie="${miseEnPlace}"] .objectif-carte-tete`).click();
  await page.waitForTimeout(200);
  controle("X-04", "Comm : changer de partie quand un autre objectif est déjà dans la première est refusé et expliqué", (await formulaire(page).getByText(/Retirez-les d'abord/).count()) === 1);
  await choisirCarte(page, "personnel");
  await page.getByLabel("Décrivez votre objectif").fill("obtenir plus d'avis clients");
  await page.getByLabel("Comment saurez-vous que c'est atteint ?").fill("je reçois des avis");
  await page.getByLabel(/En combien de temps/).fill("2");
  await enregistrer(page).click();
  await page.waitForTimeout(1500);
  controle("X-05", "un objectif personnel qui reprend une proposition déjà choisie est refusé par le serveur, avec un message", (await formulaire(page).getByText(/figure déjà parmi les propositions/).count()) === 1 && actifs(email, "COMM_CREATION").length === 0);
  await page.getByLabel("Décrivez votre objectif").fill("être connu des architectes de ma ville");
  await enregistrer(page).click();
  await attendreEnregistrement(page);
  const deux = actifs(email, "COMM_CREATION");
  controle("X-06", "deux objectifs enregistrés ensemble : une proposition et un objectif personnel, chacun avec son origine", deux.length === 2 && deux.map((d) => d.origine).sort().join() === "personnel,proposition" && deux.some((d) => d.phrase === "obtenir 10 nouveaux avis clients sur les 3 prochains mois"), JSON.stringify(deux));

  // Une proposition reçue avec un autre texte : le serveur garde le texte de la liste.
  const r = await contexte.request.post(`${B}/api/audit/objectif`, { data: { agent: "RH_ORGANISATION", objectifs: [{ quoi: "un texte qui ne correspond pas", reussite: "chacun sait quoi faire", delaiMois: 3, choix: "rh-roles" }] } });
  controle("X-07", "serveur : une proposition reçue avec un autre texte est enregistrée avec le texte de la liste", r.ok() && actifs(email, "RH_ORGANISATION")[0]?.quoi === "clarifier qui fait quoi", JSON.stringify(actifs(email, "RH_ORGANISATION")));

  // Unité : une proposition en pourcentage seulement n'affiche pas de choix d'unité.
  await page.goto(`${B}/audit/rh-organisation?etape=1`, { waitUntil: "networkidle" });
  await choisirCarte(page, "rh-absences");
  controle("X-08", "« Réduire les absences dans l'équipe » : « De combien, en % ? », sans choix d'unité", (await carte(page, "rh-absences").getByLabel("De combien, en % ?").count()) === 1 && (await carte(page, "rh-absences").getByText("Unité du chiffre").count()) === 0);

  // Clavier : Tab jusqu'aux cartes, puis les flèches changent la proposition choisie.
  await page.goto(`${B}/audit/rh-organisation?etape=1`, { waitUntil: "networkidle" });
  await radio(page, "rh-roles").focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(200);
  const suivante = await ouvert(page).locator("li.objectif-carte.choisie").getAttribute("data-carte");
  const focusVisible = await page.evaluate(() => document.activeElement?.matches(":focus-visible") ?? false);
  controle("X-09", "clavier : les flèches passent d'une carte à la suivante, qui devient la carte choisie, focus visible", suivante === "rh-deleguer" && focusVisible, `${suivante} ${focusVisible}`);
  // Un groupe de boutons radio se parcourt aux flèches (la touche Fin n'y fait rien) : depuis la dernière proposition, la flèche
  // atteint « Définir mon propre objectif », dont le champ reçoit le focus ; on y écrit directement.
  await radio(page, "rh-absence-dirigeant").focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  await page.keyboard.type("Mieux préparer les saisons");
  const choisieClavier = await ouvert(page).locator("li.objectif-carte.choisie").getAttribute("data-carte");
  const ecrit = await page.getByLabel("Décrivez votre objectif").inputValue().catch(() => "");
  controle("X-10", "clavier : depuis la dernière proposition, la flèche atteint « Définir mon propre objectif » et le texte s'écrit dans son champ", choisieClavier === "personnel" && ecrit === "Mieux préparer les saisons", `${choisieClavier} « ${ecrit} »`);
  await contexte.close();
}

// --- 3. Taille de l'entreprise, téléphone ------------------------------------------------------------------------------
{
  const { contexte, page } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 1, objectifs: false, viewport: { width: 360, height: 760 } });
  await page.goto(`${B}/audit/rh-organisation`, { waitUntil: "networkidle" });
  const ids = await cartes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-carte")));
  controle("T-01", "dirigeant seul : ni « Réduire les départs de salariés », ni « Réduire les absences dans l'équipe », ni « Alléger la charge de travail de l'équipe »", !ids.includes("rh-turnover") && !ids.includes("rh-absences") && !ids.includes("rh-charge") && ids.includes("rh-absence-dirigeant"), ids.join(", "));
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  controle("T-02", "téléphone 360 px : aucune barre de défilement horizontale", largeur <= 360, largeur);
  await capture(page, "rh-telephone-1-propositions");
  await choisirCarte(page, "rh-recruter");
  await capture(page, "rh-telephone-2-selection");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
  await page.waitForTimeout(200);
  const bouton = await enregistrer(page).boundingBox();
  controle("T-03", "téléphone : le bouton « Enregistrer mon objectif » reste visible pendant le défilement de la liste", bouton !== null && bouton.y >= 0 && bouton.y + bouton.height <= 760, JSON.stringify(bouton));
  await choisirCarte(page, "personnel");
  await page.getByLabel("Décrivez votre objectif").fill("Trouver un apprenti pour la saison");
  await page.getByLabel("Comment saurez-vous que c'est atteint ?").fill("un apprenti travaille avec moi en mai");
  await page.getByLabel(/En combien de temps/).fill("6");
  await page.getByLabel("Décrivez votre objectif").scrollIntoViewIfNeeded();
  await capture(page, "rh-telephone-3-personnel");
  const cible = await page.getByLabel("Décrivez votre objectif").boundingBox();
  controle("T-04", "téléphone : le champ personnel tient dans la largeur et mesure au moins 40 px de haut", cible !== null && cible.x >= 0 && cible.x + cible.width <= 360 && cible.height >= 40, JSON.stringify(cible));
  await contexte.close();
}
{
  const { contexte, page } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false, viewport: { width: 390, height: 844 } });
  await page.goto(`${B}/audit/comm-creation-contenu`, { waitUntil: "networkidle" });
  await formulaire(page).locator(`li[data-partie="${DEF.COMM_CREATION.parties[1].nom}"] .objectif-carte-tete`).click();
  await page.waitForTimeout(200);
  await capture(page, "com-telephone-1-propositions");
  await choisirCarte(page, "com-premiers-avis");
  await carte(page, "com-premiers-avis").getByLabel("Combien d'avis visez-vous ?").fill("1");
  await carte(page, "com-premiers-avis").getByLabel(/En combien de temps/).fill("2");
  await capture(page, "com-telephone-2-selection");
  const ap = (await carte(page, "com-premiers-avis").locator("[data-apercu]").innerText()).trim();
  controle("T-05", "un seul avis visé : « obtenir mon premier avis client sur les 2 prochains mois »", ap.includes("obtenir mon premier avis client sur les 2 prochains mois"), ap);
  await choisirCarte(page, "personnel");
  await page.getByLabel("Décrivez votre objectif").fill("Être connu dans ma ville pour la rénovation de salles de bain");
  await capture(page, "com-telephone-3-personnel");
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  controle("T-06", "téléphone 390 px (Comm) : aucune barre de défilement horizontale", largeur <= 390, largeur);
  await contexte.close();
}

await nav.close();
process.exit(ecrire(sortie) > 0 ? 1 : 0);

// Choix de l'objectif des agents RH et Comm (décisions du propriétaire du 28 octobre) : un objectif par agent ; d'abord deux
// choix de même importance, « Choisir un objectif proposé » et « Écrire mon propre objectif », sans présélection ; puis le mode
// choisi. Dans le navigateur, sur l'application construite et la base réelle, avec des comptes fictifs. Chaque contrôle
// compare l'écran ou la base à une valeur attendue écrite à la main. Captures sur ordinateur et téléphone dans
// docs/objectifs/captures.
//
//   node scripts/verification/objectifs.mjs [--sortie docs/verification/resultats]
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { chromium, B, journal, creerCompte, connecter, sql, carte as carteQuestion } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const CAPTURES = "docs/objectifs/captures";
rmSync(CAPTURES, { recursive: true, force: true });
mkdirSync(CAPTURES, { recursive: true });
const { controle, ecrire } = journal("objectifs");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const DEF = JSON.parse(readFileSync("data/objectifs-agents.json", "utf8")).agents;
const AMELIORER = DEF.COMM_CREATION.parties[0].nom;
const MISE_EN_PLACE = DEF.COMM_CREATION.parties[1].nom;
const MODES = { proposition: "Choisir un objectif proposé", personnel: "Écrire mon propre objectif" };
const AIDES = { proposition: "Parcourez les suggestions adaptées à cet agent.", personnel: "Décrivez le résultat que vous souhaitez obtenir." };

const formulaire = (page) => page.locator("form[data-objectif-choix]");
const modeCarte = (page, m) => formulaire(page).locator(`li[data-mode="${m}"]`);
const modeRadio = (page, m) => modeCarte(page, m).locator("input[type=radio]");
const cartes = (page) => formulaire(page).locator("li.objectif-carte[data-carte]");
const carte = (page, id) => formulaire(page).locator(`li[data-carte="${id}"]`);
const radio = (page, id) => carte(page, id).locator(".objectif-carte-tete input[type=radio]");
const champPerso = (page) => formulaire(page).getByLabel("Votre objectif", { exact: true });
const enregistrer = (page) => page.getByRole("button", { name: /^Enregistrer mon objectif$/ });
const focusId = (page) => page.evaluate(() => document.activeElement?.id ?? "");
const lignes = (email, agent) =>
  sql(`select o.statut||'|'||o."texteBrut"||'|'||coalesce(o.structure->>'origine','')||'|'||coalesce(o.structure->>'choix','')||'|'||(o.structure->>'quoi') from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.agent='${agent}' order by o."creeLe", o.id`)
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [statut, phrase, origine, choix, quoi] = l.split("|");
      return { statut, phrase, origine, choix, quoi };
    });
const actifs = (email, agent) => lignes(email, agent).filter((l) => l.statut === "ACTIF");
async function choisirMode(page, m) {
  await modeCarte(page, m).locator(".objectif-mode-tete").click();
  await page.waitForTimeout(250);
}
async function choisirPartie(page, nom) {
  await formulaire(page).locator(`li[data-partie="${nom}"] .objectif-carte-tete`).click();
  await page.waitForTimeout(200);
}
async function choisirCarte(page, id) {
  await carte(page, id).locator(".objectif-carte-tete").click();
  await page.waitForTimeout(200);
}
async function attendreEnregistrement(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);
}
// Capture : la page entière (`pleine`), ou l'écran avec `haut` en haut (les deux choix restent visibles), ou l'écran sur `cible`.
async function capture(page, nom, { cible = null, haut = null, pleine = false } = {}) {
  if (haut) await haut.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24)).catch(() => {});
  else if (cible) await cible.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${CAPTURES}/${nom}.png`, fullPage: pleine });
}
const modes = (page) => formulaire(page).locator("[data-modes]");
// Les deux choix : position et taille de chaque carte, taille du titre.
const mesureModes = (page) =>
  formulaire(page).locator("li[data-mode]").evaluateAll((l) =>
    l.map((li) => {
      const r = li.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), l: Math.round(r.width), h: Math.round(r.height), bas: Math.round(r.bottom), titre: getComputedStyle(li.querySelector(".objectif-mode-titre")).fontSize };
    }),
  );

// --- 1. Un parcours complet par agent (ordinateur, équipe de 4 personnes) -----------------------------------------------
const PARCOURS = {
  RH: { code: "RH_ORGANISATION", slug: "rh-organisation", prop: "rh-temps", valeur: "5", unite: null, delai: "3", phrase: "libérer 5 heures par semaine pour piloter l'entreprise d'ici 3 mois", texte: "Que l'équipe ouvre seule le magasin le samedi" },
  COM: { code: "COMM_CREATION", slug: "comm-creation-contenu", prop: "com-audience", valeur: "200", unite: "En nombre d'abonnés", delai: "6", phrase: "gagner 200 abonnés d'ici 6 mois", texte: "Être connu dans ma ville pour la rénovation de salles de bain" },
};
for (const [p, A] of Object.entries(PARCOURS)) {
  const def = DEF[A.code];
  const nom = p.toLowerCase();
  const { email, contexte, page } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false, viewport: { width: 1280, height: 900 } });
  const url = `${B}/audit/${A.slug}`;
  await page.goto(url, { waitUntil: "networkidle" });

  controle(`${p}-01`, "l'écran s'ouvre sur « Quel objectif souhaitez-vous atteindre ? » et « Choisissez un objectif proposé ou écrivez le vôtre. »", (await page.getByRole("heading", { name: "Quel objectif souhaitez-vous atteindre ?" }).count()) === 1 && (await page.getByText(/Choisissez un objectif proposé ou écrivez le vôtre\./).count()) === 1);
  const titres = await formulaire(page).locator("li[data-mode] .objectif-mode-titre").allInnerTexts();
  const aides = await formulaire(page).locator("li[data-mode]").allInnerTexts();
  controle(`${p}-02`, "deux choix visibles avant tout formulaire, avec leur aide : « Choisir un objectif proposé » et « Écrire mon propre objectif »", titres.join("|") === `${MODES.proposition}|${MODES.personnel}` && aides[0].includes(AIDES.proposition) && aides[1].includes(AIDES.personnel) && (await formulaire(page).locator("[data-mode-contenu]").count()) === 0, titres.join(" | "));
  controle(`${p}-03`, "aucune présélection, ni « Autre », ni « Ajouter un autre objectif »", !(await modeRadio(page, "proposition").isChecked()) && !(await modeRadio(page, "personnel").isChecked()) && (await formulaire(page).getByText(/Autre \(précisez\)|Définir mon propre objectif|Ajouter un autre objectif/).count()) === 0);
  const m = await mesureModes(page);
  controle(`${p}-04`, "ordinateur : les deux choix côte à côte, de même taille, titres de même corps", m.length === 2 && m[0].y === m[1].y && m[0].l === m[1].l && m[0].h === m[1].h && m[0].titre === m[1].titre && m[1].x > m[0].x, JSON.stringify(m));
  await capture(page, `${nom}-ordinateur-1-deux-choix`);

  // Rien de choisi : le bouton reste accessible et dit quoi faire.
  await enregistrer(page).click();
  await page.waitForTimeout(400);
  controle(`${p}-05`, "rien de choisi : « Choisissez un objectif proposé, ou écrivez votre propre objectif. », le focus revient aux deux choix, rien en base", (await formulaire(page).getByText("Choisissez un objectif proposé, ou écrivez votre propre objectif.").count()) === 1 && (await focusId(page)).endsWith("-mode-legende") && lignes(email, A.code).length === 0, await focusId(page));

  // Mode « proposé » : les propositions et leurs champs ; en Comm, « Où en êtes-vous ? » d'abord.
  await choisirMode(page, "proposition");
  controle(`${p}-06`, "« Choisir un objectif proposé » : coché, « Choisi » écrit, l'autre choix reste visible et non coché, aucun champ de rédaction", (await modeRadio(page, "proposition").isChecked()) && (await modeCarte(page, "proposition").getByText("Choisi", { exact: true }).count()) === 1 && !(await modeRadio(page, "personnel").isChecked()) && (await modeCarte(page, "personnel").isVisible()) && (await champPerso(page).count()) === 0);
  if (def.parties) {
    controle(`${p}-07`, "Comm : deux parties à choisir, aucune proposition avant ce choix", (await formulaire(page).locator("li[data-partie]").count()) === 2 && (await cartes(page).count()) === 0);
    await enregistrer(page).click();
    await page.waitForTimeout(400);
    controle(`${p}-08`, "Comm sans partie : « Choisissez d'abord où vous en êtes… », le focus va sur « Où en êtes-vous ? »", (await formulaire(page).getByText("Choisissez d'abord où vous en êtes : les objectifs proposés s'afficheront ensuite.").count()) >= 1 && (await focusId(page)).endsWith("-partie-legende"), await focusId(page));
    await choisirPartie(page, AMELIORER);
  }
  const proposees = def.objectifs.filter((o) => !def.parties || o.groupe === AMELIORER);
  const ids = await cartes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-carte")));
  const attendus = proposees.filter((o) => o.id !== "rh-aide").map((o) => o.id);
  controle(`${p}-09`, `les ${attendus.length} propositions pertinentes, et rien d'autre${p === "RH" ? " (« Me faire aider dans mon travail » n'est pas proposé à une équipe)" : ""}`, ids.join() === attendus.join(), ids.join(", "));

  await choisirCarte(page, A.prop);
  const c = carte(page, A.prop);
  const o = def.objectifs.find((x) => x.id === A.prop);
  controle(`${p}-10`, `proposition « ${o.libelle} » : coche, « Choisi », champs ouverts dans la carte, intitulé « ${o.question} »`, (await c.getAttribute("class")).includes("choisie") && (await c.getByText("Choisi", { exact: true }).count()) === 1 && (await radio(page, A.prop).isChecked()) && (await c.getByLabel(o.question, { exact: true }).count()) === 1);
  await c.getByLabel(o.question, { exact: true }).fill(A.valeur);
  if (A.unite) await c.getByText(A.unite, { exact: true }).click();
  await c.getByLabel(/En combien de temps/).fill(A.delai);
  await page.waitForTimeout(150);
  const apercu = (await c.locator("[data-apercu]").innerText()).trim();
  controle(`${p}-11`, `la phrase finale vient de la saisie : « ${A.phrase} »`, apercu === `Votre objectif : ${A.phrase}`, apercu);
  await capture(page, `${nom}-ordinateur-2-mode-propose`, { haut: modes(page) });
  await capture(page, `${nom}-ordinateur-2b-proposition-choisie`, { cible: c });

  // Mode « personnel » : le champ de rédaction directement, avec son aide et son exemple ; le curseur y est placé.
  await choisirMode(page, "personnel");
  const aide = await formulaire(page).locator("[id$='-texte-aide']").innerText().catch(() => "");
  controle(`${p}-12`, "« Écrire mon propre objectif » : champ « Votre objectif » ouvert directement, aide et exemple de l'agent, les propositions disparaissent", (await champPerso(page).count()) === 1 && aide.includes(def.personnel.exemple) && (await cartes(page).count()) === 0 && (await modeRadio(page, "personnel").isChecked()) && !(await modeRadio(page, "proposition").isChecked()), aide);
  controle(`${p}-13`, "choisi à la souris, le champ « Votre objectif » reçoit le focus", await champPerso(page).evaluate((el) => el === document.activeElement));
  await champPerso(page).fill(A.texte);
  await capture(page, `${nom}-ordinateur-3-mode-personnel`, { haut: modes(page) });

  // Changement de mode : chaque brouillon est gardé, seul le mode actif compte.
  await choisirMode(page, "proposition");
  const garde = await carte(page, A.prop).getByLabel(o.question, { exact: true }).inputValue().catch(() => "");
  controle(`${p}-14`, "retour au mode « proposé » : la proposition et son chiffre sont retrouvés, le champ personnel n'est plus affiché", (await radio(page, A.prop).isChecked()) && garde === A.valeur && (await champPerso(page).count()) === 0, garde);
  await choisirMode(page, "personnel");
  controle(`${p}-15`, "retour au mode « personnel » : le texte écrit est retrouvé tel quel", (await champPerso(page).inputValue()) === A.texte);

  // Saisie vide ou faite d'espaces : refusée, avec un message qui dit comment continuer.
  await champPerso(page).fill("    ");
  await formulaire(page).getByLabel("Comment saurez-vous que c'est atteint ?").fill("je le constate chaque semaine");
  await formulaire(page).getByLabel(/En combien de temps/).fill("4");
  await enregistrer(page).click();
  await page.waitForTimeout(400);
  controle(`${p}-16`, "texte fait d'espaces : « Décrivez votre objectif en quelques mots pour continuer. », le champ reçoit le focus, rien en base", (await page.getByText("Décrivez votre objectif en quelques mots pour continuer.").count()) === 1 && (await champPerso(page).evaluate((el) => el === document.activeElement)) && lignes(email, A.code).length === 0);
  await champPerso(page).fill(A.texte);
  await enregistrer(page).click();
  await attendreEnregistrement(page);
  const perso = `${A.texte}, d'ici 4 mois`;
  const apres = actifs(email, A.code);
  controle(`${p}-17`, "objectif personnel enregistré : un seul actif, origine « personnel », sans proposition, texte du dirigeant intact (rien du mode « proposé » n'est transmis)", apres.length === 1 && apres[0].origine === "personnel" && apres[0].choix === "" && apres[0].quoi === A.texte && apres[0].phrase === perso, JSON.stringify(apres));

  // Restitution : écran suivant, actualisation, reconnexion.
  const phrase = async () => (await page.locator("[data-objectif-phrase]").first().innerText().catch(() => "")).trim();
  controle(`${p}-18`, "écran suivant : la phrase de l'objectif personnel et la mention « Objectif personnel »", (await phrase()) === perso && (await page.getByText(/Objectif personnel/).count()) >= 1, await phrase());
  await page.reload({ waitUntil: "networkidle" });
  controle(`${p}-19`, "après actualisation : même objectif", (await phrase()) === perso);
  await contexte.clearCookies();
  await connecter(page, email);
  await page.goto(url, { waitUntil: "networkidle" });
  controle(`${p}-20`, "après déconnexion et reconnexion : même objectif", (await phrase()) === perso);

  // Retour à l'étape Objectif : le mode « personnel » est choisi, avec le texte, la réussite et le délai.
  await page.goto(`${url}?etape=1`, { waitUntil: "networkidle" });
  controle(`${p}-21`, "retour à l'étape Objectif : « Écrire mon propre objectif » est choisi, avec le texte et le délai ; pas de second objectif possible", (await modeRadio(page, "personnel").isChecked()) && (await champPerso(page).inputValue()) === A.texte && (await formulaire(page).getByLabel(/En combien de temps/).inputValue()) === "4" && (await formulaire(page).getByText(/Ajouter un autre objectif/).count()) === 0);

  // Modification abandonnée, puis retour en arrière : rien n'a changé.
  await choisirMode(page, "proposition");
  if (def.parties) await choisirPartie(page, AMELIORER);
  await choisirCarte(page, A.prop);
  await page.getByRole("button", { name: "Garder l'objectif actuel" }).click();
  await page.waitForURL((u) => !u.search.includes("etape=1"), { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  controle(`${p}-22`, "modification abandonnée (« Garder l'objectif actuel ») : retour à l'audit, l'objectif personnel reste le seul actif", (await phrase()) === perso && actifs(email, A.code).length === 1 && lignes(email, A.code).length === 1, await phrase());
  await page.goBack({ waitUntil: "networkidle" });
  controle(`${p}-23`, "retour en arrière du navigateur vers l'étape Objectif : le formulaire montre l'objectif enregistré, pas la modification abandonnée", (await modeRadio(page, "personnel").isChecked()) && (await champPerso(page).inputValue()) === A.texte);

  // Modification enregistrée : la proposition remplace l'objectif personnel, qui passe en historique.
  await choisirMode(page, "proposition");
  if (def.parties) await choisirPartie(page, AMELIORER);
  await choisirCarte(page, A.prop);
  await carte(page, A.prop).getByLabel(o.question, { exact: true }).fill(A.valeur);
  if (A.unite) await carte(page, A.prop).getByText(A.unite, { exact: true }).click();
  await carte(page, A.prop).getByLabel(/En combien de temps/).fill(A.delai);
  await enregistrer(page).click();
  await attendreEnregistrement(page);
  const remplace = lignes(email, A.code);
  controle(`${p}-24`, "objectif modifié : un seul actif (la proposition, avec sa phrase), l'objectif personnel passe en historique « remplacé »", remplace.filter((l) => l.statut === "ACTIF").length === 1 && remplace.find((l) => l.statut === "ACTIF")?.phrase === A.phrase && remplace.some((l) => l.statut === "REMPLACE" && l.origine === "personnel" && l.quoi === A.texte), JSON.stringify(remplace));

  // Transmission au compte rendu (onglet Objectif), sans présenter l'analyse de l'IA comme faite.
  await page.goto(`${url}?etape=4`, { waitUntil: "networkidle" });
  const res = (await page.locator("[data-objectif-resultat] [data-objectif-phrase]").first().innerText().catch(() => "")).trim();
  controle(`${p}-25`, "compte rendu : l'objectif transmis est celui qui vient d'être choisi", res === A.phrase, res);
  await contexte.close();
}

// --- 2. Cas particuliers ------------------------------------------------------------------------------------------------
{
  const { email, contexte, page, api } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false });

  // Le serveur refuse un deuxième objectif, et impose le texte de la liste à une proposition.
  const deux = await api.post(`${B}/api/audit/objectif`, { data: { agent: "RH_ORGANISATION", objectifs: [{ quoi: "x", reussite: "chacun sait quoi faire", delaiMois: 3, choix: "rh-roles" }, { quoi: "mieux préparer les saisons", reussite: "le planning est prêt", delaiMois: 3 }] } });
  controle("X-01", "serveur : deux objectifs envoyés ensemble sont refusés (« Cet agent suit un seul objectif à la fois. »), rien en base", deux.status() === 400 && (await deux.json()).erreur === "Cet agent suit un seul objectif à la fois." && lignes(email, "RH_ORGANISATION").length === 0);
  const r = await api.post(`${B}/api/audit/objectif`, { data: { agent: "RH_ORGANISATION", objectifs: [{ quoi: "un texte qui ne correspond pas", reussite: "chacun sait quoi faire", delaiMois: 3, choix: "rh-roles" }] } });
  controle("X-02", "serveur : une proposition reçue avec un autre texte est enregistrée avec le texte de la liste", r.ok() && actifs(email, "RH_ORGANISATION")[0]?.quoi === "clarifier qui fait quoi", JSON.stringify(actifs(email, "RH_ORGANISATION")));

  // Un nombre visé et un taux visé (Comm) ; une proposition à une seule unité (RH).
  await page.goto(`${B}/audit/comm-creation-contenu`, { waitUntil: "networkidle" });
  await choisirMode(page, "proposition");
  await choisirPartie(page, AMELIORER);
  await choisirCarte(page, "com-avis");
  const avis = carte(page, "com-avis");
  await avis.getByLabel("Combien de nouveaux avis voulez-vous obtenir ?").fill("10");
  await avis.getByLabel(/En combien de temps/).fill("3");
  const apAvis = (await avis.locator("[data-apercu]").innerText()).trim();
  controle("X-03", "« Obtenir plus d'avis clients » : « Combien de nouveaux avis voulez-vous obtenir ? », sans choix d'unité ; « obtenir 10 nouveaux avis clients sur les 3 prochains mois »", (await avis.getByText("Unité du chiffre").count()) === 0 && apAvis.includes("obtenir 10 nouveaux avis clients sur les 3 prochains mois"), apAvis);
  await choisirCarte(page, "com-conversion");
  const conv = carte(page, "com-conversion");
  await conv.getByLabel("Quel taux visez-vous, en % ?").fill("4");
  await conv.getByLabel(/En combien de temps/).fill("3");
  const apConv = (await conv.locator("[data-apercu]").innerText()).trim();
  controle("X-04", "taux de conversion (2c-1) : la phrase dit le taux visé, « porter mon taux de conversion à 4 % d'ici 3 mois »", apConv.includes("porter mon taux de conversion à 4 % d'ici 3 mois"), apConv);
  await page.goto(`${B}/audit/rh-organisation?etape=1`, { waitUntil: "networkidle" });
  await choisirMode(page, "proposition");
  await choisirCarte(page, "rh-absences");
  controle("X-05", "« Réduire les absences dans l'équipe » : « De combien voulez-vous réduire les jours d'absence, en % ? », sans choix d'unité", (await carte(page, "rh-absences").getByLabel("De combien voulez-vous réduire les jours d'absence, en % ?").count()) === 1 && (await carte(page, "rh-absences").getByText("Unité du chiffre").count()) === 0);

  // Clavier : sans présélection, Tab atteint le premier choix ; les flèches passent de l'un à l'autre sans que le curseur saute.
  const k = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false });
  const pk = k.page;
  await pk.goto(`${B}/audit/rh-organisation`, { waitUntil: "networkidle" });
  await pk.getByRole("heading", { name: "Quel objectif souhaitez-vous atteindre ?" }).click();
  let tabs = 0;
  while (tabs < 40 && !(await pk.evaluate(() => Boolean(document.activeElement?.closest("li[data-mode]"))))) {
    await pk.keyboard.press("Tab");
    tabs += 1;
  }
  const surMode = await pk.evaluate(() => document.activeElement?.closest("li[data-mode]")?.getAttribute("data-mode") ?? "");
  const visible = await pk.evaluate(() => document.activeElement?.matches(":focus-visible") ?? false);
  controle("X-06", "clavier : Tab atteint « Choisir un objectif proposé » sans rien choisir, avec un focus visible", surMode === "proposition" && visible && !(await modeRadio(pk, "proposition").isChecked()), `${surMode} après ${tabs} Tab, visible ${visible}`);
  await pk.keyboard.press("Space");
  await pk.waitForTimeout(250);
  controle("X-07", "clavier : Espace choisit le mode ; le curseur reste sur ce choix", (await modeRadio(pk, "proposition").isChecked()) && (await pk.evaluate(() => document.activeElement?.closest("li[data-mode]")?.getAttribute("data-mode"))) === "proposition");
  await pk.keyboard.press("ArrowDown");
  await pk.waitForTimeout(250);
  controle("X-08", "clavier : la flèche passe à « Écrire mon propre objectif », qui s'ouvre ; le curseur reste sur le choix", (await modeRadio(pk, "personnel").isChecked()) && (await champPerso(pk).count()) === 1 && (await pk.evaluate(() => document.activeElement?.closest("li[data-mode]")?.getAttribute("data-mode"))) === "personnel");
  await pk.keyboard.press("Tab");
  await pk.keyboard.type("Mieux préparer les saisons");
  controle("X-09", "clavier : Tab mène au champ « Votre objectif », où le texte s'écrit", (await champPerso(pk).inputValue()) === "Mieux préparer les saisons", await champPerso(pk).inputValue());
  await pk.keyboard.down("Shift");
  await pk.keyboard.press("Tab");
  await pk.keyboard.up("Shift");
  await pk.keyboard.press("ArrowUp");
  await pk.waitForTimeout(250);
  await pk.keyboard.press("Tab");
  await pk.keyboard.press("ArrowDown");
  await pk.waitForTimeout(250);
  const choisieClavier = await formulaire(pk).locator("li.objectif-carte.choisie[data-carte]").getAttribute("data-carte").catch(() => null);
  controle("X-10", "clavier : retour au mode « proposé », Tab entre dans les propositions et la flèche en choisit une, qui s'ouvre", choisieClavier !== null && (await carte(pk, choisieClavier).locator("[data-detail]").count()) === 1, choisieClavier ?? "aucune");
  await k.contexte.close();

  // Comm (6C) : un objectif de « Mettre en place… » et une réponse « je publie déjà » : l'écart est signalé, rien n'est bloqué.
  await page.goto(`${B}/audit/comm-creation-contenu`, { waitUntil: "networkidle" });
  await choisirMode(page, "proposition");
  await choisirPartie(page, MISE_EN_PLACE);
  await choisirCarte(page, "com-cible");
  await carte(page, "com-cible").getByLabel("Comment saurez-vous que c'est atteint ?").fill("je sais décrire mon client idéal");
  await carte(page, "com-cible").getByLabel(/En combien de temps/).fill("1");
  await enregistrer(page).click();
  await attendreEnregistrement(page);
  const avant = (await page.locator("[data-ecart-partie]").count()) === 0;
  const rep = await api.put(`${B}/api/audit/reponses`, { data: { cle: "COM-10.07", reponse: { genre: "saisie", valeur: "oui_au_moins_une_fois_par_mois" } } });
  await page.reload({ waitUntil: "networkidle" });
  const notes = await page.locator("[data-ecart-partie]").allInnerTexts();
  const sousQuestion = await carteQuestion(page, "COM-10.07").locator("[data-ecart-partie]").count();
  controle("X-11", "Comm (6C) : objectif dans « Mettre en place… », réponse « Oui, au moins une fois par mois » → l'écart est expliqué sous l'objectif et sous la question, sans blocage", avant && rep.ok() && notes.length === 2 && sousQuestion === 1 && notes[0].includes(MISE_EN_PLACE) && notes[0].includes(AMELIORER) && notes[0].includes("Rien n'est bloqué") && (await page.locator("li[data-question]").count()) > 1, notes[0] ?? "aucun message");
  await capture(page, "com-ordinateur-4-ecart-partie", { haut: page.locator(".audit-objectif-actif") });
  await page.goto(`${B}/audit/comm-creation-contenu?etape=1`, { waitUntil: "networkidle" });
  controle("X-12", "Comm (6C) : à l'étape Objectif, la partie choisie montre aussi l'écart", (await formulaire(page).locator("[data-ecart-partie]").count()) === 1);
  await api.put(`${B}/api/audit/reponses`, { data: { cle: "COM-10.07", reponse: { genre: "saisie", valeur: "non_jamais" } } });
  await page.goto(`${B}/audit/comm-creation-contenu`, { waitUntil: "networkidle" });
  controle("X-13", "Comm (6C) : quand la réponse correspond à la partie (« Non, jamais »), aucun message", (await page.locator("[data-ecart-partie]").count()) === 0);
  await contexte.close();
}

// --- 3. Taille de l'entreprise, téléphone ------------------------------------------------------------------------------
{
  const { contexte, page } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 1, objectifs: false, viewport: { width: 360, height: 760 } });
  await page.goto(`${B}/audit/rh-organisation`, { waitUntil: "networkidle" });
  const m = await mesureModes(page);
  controle("T-01", "téléphone 360 px : les deux choix empilés, de même largeur et de même corps de titre", m.length === 2 && m[1].y >= m[0].bas && m[0].l === m[1].l && m[0].titre === m[1].titre, JSON.stringify(m));
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  controle("T-02", "téléphone 360 px : aucune barre de défilement horizontale", largeur <= 360, largeur);
  await capture(page, "rh-telephone-1-deux-choix", { haut: modes(page) });
  await choisirMode(page, "proposition");
  const ids = await cartes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-carte")));
  controle("T-03", "dirigeant seul : ni départs, ni absences, ni charge de l'équipe ; « Libérer du temps… » et « Me faire aider dans mon travail » sont proposés", !ids.includes("rh-turnover") && !ids.includes("rh-absences") && !ids.includes("rh-charge") && ids.includes("rh-temps") && ids.includes("rh-aide"), ids.join(", "));
  await capture(page, "rh-telephone-2-mode-propose", { haut: modes(page) });
  await choisirCarte(page, "rh-aide");
  await capture(page, "rh-telephone-2b-proposition-choisie", { cible: carte(page, "rh-aide") });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
  await page.waitForTimeout(200);
  const bouton = await enregistrer(page).boundingBox();
  controle("T-04", "téléphone : « Enregistrer mon objectif » reste visible pendant le défilement des propositions", bouton !== null && bouton.y >= 0 && bouton.y + bouton.height <= 760, JSON.stringify(bouton));
  await choisirMode(page, "personnel");
  await champPerso(page).fill("Trouver un apprenti pour la saison");
  await formulaire(page).getByLabel("Comment saurez-vous que c'est atteint ?").fill("un apprenti travaille avec moi en mai");
  await formulaire(page).getByLabel(/En combien de temps/).fill("6");
  await capture(page, "rh-telephone-3-mode-personnel", { haut: modes(page) });
  const cible = await champPerso(page).boundingBox();
  controle("T-05", "téléphone : le champ « Votre objectif » tient dans la largeur et mesure au moins 40 px de haut", cible !== null && cible.x >= 0 && cible.x + cible.width <= 360 && cible.height >= 40, JSON.stringify(cible));
  await contexte.close();
}
{
  const { contexte, page } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false, viewport: { width: 390, height: 844 } });
  await page.goto(`${B}/audit/comm-creation-contenu`, { waitUntil: "networkidle" });
  await capture(page, "com-telephone-1-deux-choix", { haut: modes(page) });
  await choisirMode(page, "proposition");
  await choisirPartie(page, MISE_EN_PLACE);
  await capture(page, "com-telephone-2-mode-propose", { haut: modes(page) });
  await choisirCarte(page, "com-premiers-avis");
  await carte(page, "com-premiers-avis").getByLabel("Combien de premiers avis visez-vous ?").fill("1");
  await carte(page, "com-premiers-avis").getByLabel(/En combien de temps/).fill("2");
  await capture(page, "com-telephone-2b-proposition-choisie", { cible: carte(page, "com-premiers-avis") });
  const ap = (await carte(page, "com-premiers-avis").locator("[data-apercu]").innerText()).trim();
  controle("T-06", "un seul avis visé : « obtenir mon premier avis client d'ici 2 mois »", ap.includes("obtenir mon premier avis client d'ici 2 mois"), ap);
  await choisirMode(page, "personnel");
  await champPerso(page).fill("Être connu dans ma ville pour la rénovation de salles de bain");
  await capture(page, "com-telephone-3-mode-personnel", { haut: modes(page) });
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  controle("T-07", "téléphone 390 px (Comm) : aucune barre de défilement horizontale", largeur <= 390, largeur);
  await contexte.close();
}

await nav.close();
process.exit(ecrire(sortie) > 0 ? 1 : 0);

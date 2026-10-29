// Objectif des agents RH et Comm (demande du propriétaire du 29 octobre) : un objectif par agent ; d'abord deux choix de même
// importance, « Écrire mon objectif » et « Composer mon objectif à partir des propositions », sans présélection ; puis le mode
// choisi. En composition : une ou plusieurs propositions cochées, un récapitulatif (retirer, ajouter, chiffre facultatif,
// délai, réussite), une formulation proposée et modifiable, puis la validation. Dans le navigateur, sur l'application
// construite et la base réelle, avec des comptes fictifs. Chaque contrôle compare l'écran ou la base à une valeur attendue
// écrite à la main. Captures sur ordinateur et téléphone dans docs/objectifs/captures.
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
const FICHIER = JSON.parse(readFileSync("data/objectifs-agents.json", "utf8"));
const DEF = FICHIER.agents;
const MAX = FICHIER.composition.max;
const AMELIORER = DEF.COMM_CREATION.parties[0].nom;
const MISE_EN_PLACE = DEF.COMM_CREATION.parties[1].nom;
const MODES = { personnel: "Écrire mon objectif", composition: "Composer mon objectif à partir des propositions" };
const AIDES = { personnel: "Décrivez librement le résultat que vous souhaitez obtenir.", composition: "Sélectionnez les améliorations qui correspondent à votre besoin." };
const SOUS_TITRE = "Écrivez votre objectif, ou composez-le avec les propositions qui correspondent à votre besoin.";

const formulaire = (page) => page.locator("form[data-objectif-choix]");
const modeCarte = (page, m) => formulaire(page).locator(`li[data-mode="${m}"]`);
const modeRadio = (page, m) => modeCarte(page, m).locator("input[type=radio]");
const cartes = (page) => formulaire(page).locator("li.objectif-carte[data-carte]");
const carte = (page, id) => formulaire(page).locator(`li[data-carte="${id}"]`);
const caseDe = (page, id) => carte(page, id).locator("input[type=checkbox]");
const recap = (page) => formulaire(page).locator("[data-recapitulatif]");
const retenue = (page, id) => recap(page).locator(`li[data-retenue="${id}"]`);
const retenuesIds = (page) => recap(page).locator("li[data-retenue]").evaluateAll((l) => l.map((x) => x.getAttribute("data-retenue")));
const formulation = (page) => formulaire(page).getByLabel("Formulation de votre objectif", { exact: true });
// Le champ (le récapitulatif de la composition porte aussi le titre « Votre objectif », mais n'est pas un champ).
const champPerso = (page) => formulaire(page).getByRole("textbox", { name: "Votre objectif", exact: true });
const delai = (page) => formulaire(page).getByLabel(/En combien de temps/);
const reussite = (page) => formulaire(page).getByLabel(/Comment saurez-vous que c'est atteint/);
const valider = (page) => page.getByRole("button", { name: /^Valider mon objectif$/ });
const compte = (page) => formulaire(page).locator("[data-compte]").innerText().catch(() => "");
const focusId = (page) => page.evaluate(() => document.activeElement?.id ?? "");
const lignes = (email, agent) =>
  sql(
    `select o.id||'|'||o.statut||'|'||o."texteBrut"||'|'||coalesce(o.structure->>'origine','')||'|'||coalesce(o.structure->>'mode','')||'|'||coalesce(o.structure->>'choix','')||'|'||(o.structure->>'quoi')||'|'||coalesce((select string_agg(c->>'choix'||':'||coalesce(c->'ampleur'->>'valeur',''), ',') from jsonb_array_elements(case when jsonb_typeof(o.structure->'composition')='array' then o.structure->'composition' else '[]'::jsonb end) c),'')||'|'||coalesce(o.structure->'formulation'->>'modifiee','') from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.agent='${agent}' order by o."creeLe", o.id`,
  )
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [id, statut, phrase, origine, mode, choix, quoi, composition, modifiee] = l.split("|");
      return { id, statut, phrase, origine, mode, choix, quoi, composition, modifiee };
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
async function cocher(page, id) {
  await carte(page, id).locator(".objectif-carte-tete").click();
  await page.waitForTimeout(200);
}
async function attendreEnregistrement(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);
}
async function attendre(f, ms = 8000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await f()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}
// Capture : la page entière (`pleine`), ou l'écran avec `haut` en haut, ou l'écran sur `cible`.
async function capture(page, nom, { cible = null, haut = null, pleine = false } = {}) {
  if (haut) await haut.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24)).catch(() => {});
  else if (cible) await cible.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${CAPTURES}/${nom}.png`, fullPage: pleine });
}
const modes = (page) => formulaire(page).locator("[data-modes]");
const mesureModes = (page) =>
  formulaire(page).locator("li[data-mode]").evaluateAll((l) =>
    l.map((li) => {
      const r = li.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), l: Math.round(r.width), h: Math.round(r.height), bas: Math.round(r.bottom), titre: getComputedStyle(li.querySelector(".objectif-mode-titre")).fontSize };
    }),
  );

// --- 1. Un parcours complet par agent (ordinateur, équipe de 4 personnes) -----------------------------------------------
// A : proposition chiffrable (chiffre donné) ; B : proposition sans chiffre ; C, D : deux propositions qui se recouvrent (Comm).
const PARCOURS = {
  RH: {
    code: "RH_ORGANISATION",
    slug: "rh-organisation",
    A: "rh-temps",
    valeur: "5",
    unite: null,
    B: "rh-roles",
    delai: "3",
    compose: "clarifier qui fait quoi et libérer 5 heures par semaine pour piloter l'entreprise, d'ici 3 mois",
    seule: "libérer 5 heures par semaine pour piloter l'entreprise d'ici 3 mois",
    libre: "Que chacun sache qui fait quoi et libérer 5 heures par semaine d'ici 3 mois",
    etranger: "Que chacun sache qui fait quoi et libérer 8 heures par semaine d'ici 3 mois",
    texte: "Que l'équipe ouvre seule le magasin le samedi",
  },
  COM: {
    code: "COMM_CREATION",
    slug: "comm-creation-contenu",
    A: "com-audience",
    valeur: "200",
    unite: "En nombre d'abonnés",
    B: "com-note",
    delai: "6",
    compose: "gagner 200 abonnés et améliorer ma note sur Google, d'ici 6 mois",
    seule: "gagner 200 abonnés d'ici 6 mois",
    libre: "Gagner 200 abonnés et une meilleure note sur Google d'ici 6 mois",
    etranger: "Gagner 250 abonnés et une meilleure note sur Google d'ici 6 mois",
    texte: "Être connu dans ma ville pour la rénovation de salles de bain",
    C: "com-cout-demande",
    D: "com-annonces",
  },
};
for (const [p, A] of Object.entries(PARCOURS)) {
  const def = DEF[A.code];
  const nom = p.toLowerCase();
  const oA = def.objectifs.find((x) => x.id === A.A);
  const oB = def.objectifs.find((x) => x.id === A.B);
  const { email, contexte, page, api } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false, viewport: { width: 1280, height: 900 } });
  const url = `${B}/audit/${A.slug}`;
  await page.goto(url, { waitUntil: "networkidle" });

  controle(`${p}-01`, `l'écran s'ouvre sur « Quel objectif souhaitez-vous atteindre ? » et « ${SOUS_TITRE} »`, (await page.getByRole("heading", { name: "Quel objectif souhaitez-vous atteindre ?" }).count()) === 1 && (await page.getByText(SOUS_TITRE).count()) === 1);
  const titres = await formulaire(page).locator("li[data-mode] .objectif-mode-titre").allInnerTexts();
  const aides = await formulaire(page).locator("li[data-mode]").allInnerTexts();
  controle(`${p}-02`, `deux choix visibles avant tout formulaire, dans cet ordre et avec leur aide : « ${MODES.personnel} », « ${MODES.composition} »`, titres.join("|") === `${MODES.personnel}|${MODES.composition}` && aides[0].includes(AIDES.personnel) && aides[1].includes(AIDES.composition) && (await formulaire(page).locator("[data-mode-contenu]").count()) === 0, titres.join(" | "));
  controle(`${p}-03`, "aucune présélection, ni « Autre », ni « Ajouter un autre objectif »", !(await modeRadio(page, "personnel").isChecked()) && !(await modeRadio(page, "composition").isChecked()) && (await formulaire(page).getByText(/Autre \(précisez\)|Ajouter un autre objectif/).count()) === 0);
  const m = await mesureModes(page);
  controle(`${p}-04`, "ordinateur : les deux choix côte à côte, de même taille, titres de même corps", m.length === 2 && m[0].y === m[1].y && m[0].l === m[1].l && m[0].h === m[1].h && m[0].titre === m[1].titre && m[1].x > m[0].x, JSON.stringify(m));
  await capture(page, `${nom}-ordinateur-1-deux-choix`);

  await valider(page).click();
  await page.waitForTimeout(400);
  controle(`${p}-05`, "rien de choisi : « Choisissez d'écrire votre objectif, ou de le composer à partir des propositions. », le focus revient aux deux choix, rien en base", (await formulaire(page).getByText("Choisissez d'écrire votre objectif, ou de le composer à partir des propositions.").count()) === 1 && (await focusId(page)).endsWith("-mode-legende") && lignes(email, A.code).length === 0, await focusId(page));

  // Mode « Composer » : en Comm, « Où en êtes-vous ? » d'abord ; puis des propositions à cocher, sans présélection.
  await choisirMode(page, "composition");
  controle(`${p}-06`, `« ${MODES.composition} » : coché, « Choisi » écrit, l'autre choix reste visible et non coché, aucun champ de rédaction`, (await modeRadio(page, "composition").isChecked()) && (await modeCarte(page, "composition").getByText("Choisi", { exact: true }).count()) === 1 && !(await modeRadio(page, "personnel").isChecked()) && (await modeCarte(page, "personnel").isVisible()) && (await champPerso(page).count()) === 0);
  if (def.parties) {
    controle(`${p}-07`, "Comm : deux parties à choisir, aucune proposition avant ce choix", (await formulaire(page).locator("li[data-partie]").count()) === 2 && (await cartes(page).count()) === 0);
    await valider(page).click();
    await page.waitForTimeout(400);
    controle(`${p}-08`, "Comm sans partie : « Choisissez d'abord où vous en êtes… », le focus va sur « Où en êtes-vous ? »", (await formulaire(page).getByText("Choisissez d'abord où vous en êtes : les propositions s'afficheront ensuite.").count()) >= 1 && (await focusId(page)).endsWith("-partie-legende"), await focusId(page));
    await choisirPartie(page, AMELIORER);
  }
  const proposees = def.objectifs.filter((o) => !def.parties || o.groupe === AMELIORER);
  const ids = await cartes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-carte")));
  const attendus = proposees.filter((o) => o.id !== "rh-aide").map((o) => o.id);
  const cases = await formulaire(page).locator("li[data-carte] input[type=checkbox]").evaluateAll((l) => l.map((x) => x.checked));
  controle(`${p}-09`, `les ${attendus.length} propositions pertinentes, à cocher, aucune cochée d'avance ; le récapitulatif invite à choisir${p === "RH" ? " (« Me faire aider dans mon travail » n'est pas proposé à une équipe)" : ""}`, ids.join() === attendus.join() && cases.length === attendus.length && cases.every((c) => !c) && (await recap(page).locator("[data-recap-vide]").count()) === 1 && (await compte(page)) === "Aucune proposition retenue", ids.join(", "));
  await valider(page).click();
  await page.waitForTimeout(400);
  controle(`${p}-10`, "rien de coché : « Sélectionnez au moins une proposition, ou choisissez « Écrire mon objectif ». », focus sur la liste, rien en base", (await formulaire(page).getByText("Sélectionnez au moins une proposition, ou choisissez « Écrire mon objectif ».").count()) === 1 && (await focusId(page)).endsWith("-choix-legende") && lignes(email, A.code).length === 0, await focusId(page));

  // Deux propositions cochées : récapitulatif dans l'ordre de la liste, chiffre facultatif, délai, formulation proposée.
  await cocher(page, A.A);
  await cocher(page, A.B);
  const ordre = attendus.filter((x) => x === A.A || x === A.B);
  controle(`${p}-11`, `« ${oA.libelle} » et « ${oB.libelle} » cochées : coche, « Retenue », récapitulatif dans l'ordre de la liste, « 2 propositions retenues »`, (await caseDe(page, A.A).isChecked()) && (await caseDe(page, A.B).isChecked()) && (await carte(page, A.A).getByText("Retenue", { exact: true }).count()) === 1 && (await carte(page, A.B).getAttribute("class")).includes("choisie") && (await retenuesIds(page)).join() === ordre.join() && (await compte(page)) === "2 propositions retenues", (await retenuesIds(page)).join(","));
  controle(`${p}-12`, `chiffre facultatif pour « ${oA.libelle} » (« ${oA.question} »), aucun chiffre demandé pour « ${oB.libelle} »`, (await retenue(page, A.A).getByLabel(oA.question, { exact: true }).count()) === 1 && (await retenue(page, A.A).getByText(/Facultatif/).count()) === 1 && (await retenue(page, A.B).locator("input").count()) === 0 && (await retenue(page, A.B).getByText(/Sans chiffre/).count()) === 1);
  await retenue(page, A.A).getByLabel(oA.question, { exact: true }).fill(A.valeur);
  if (A.unite) await retenue(page, A.A).getByText(A.unite, { exact: true }).click();
  await delai(page).fill(A.delai);
  await page.waitForTimeout(200);
  const propose = await formulation(page).inputValue().catch(() => "");
  controle(`${p}-13`, `formulation proposée faite des seules propositions et du délai : « ${A.compose} »`, propose === A.compose && (await formulation(page).getAttribute("data-modifiee")) === "non", propose);
  await capture(page, `${nom}-ordinateur-2-composer-liste`, { haut: formulaire(page).locator("[data-propositions]") });
  await capture(page, `${nom}-ordinateur-3-objectif-compose`, { haut: recap(page) });

  // Comm : deux propositions qui se recouvrent ne se retiennent pas ensemble.
  if (A.C) {
    await cocher(page, A.C);
    await cocher(page, A.D);
    const oC = def.objectifs.find((x) => x.id === A.C);
    const refus = await carte(page, A.D).locator("[data-refus]").innerText().catch(() => "");
    controle(`${p}-14`, "deux propositions qui se recouvrent : la seconde n'est pas cochée, sa carte dit pourquoi", !(await caseDe(page, A.D).isChecked()) && refus.includes(`« ${oC.libelle} »`) && (await carte(page, A.D).locator("[data-recouvre]").count()) === 1 && (await retenuesIds(page)).length === 3, refus);
    await cocher(page, A.C);
  }

  // Retirer depuis le récapitulatif, puis ajouter de nouveau : le chiffre déjà donné est retrouvé.
  await retenue(page, A.B).getByRole("button", { name: `Retirer « ${oB.libelle} »` }).click();
  await page.waitForTimeout(250);
  controle(`${p}-15`, `« Retirer » : « ${oB.libelle} » décochée dans la liste, une proposition restante, formulation « ${A.seule} », focus sur le récapitulatif`, !(await caseDe(page, A.B).isChecked()) && (await retenuesIds(page)).join() === A.A && (await formulation(page).inputValue()) === A.seule && (await compte(page)) === "1 proposition retenue" && (await focusId(page)).endsWith("-recap-titre"), await formulation(page).inputValue());
  await cocher(page, A.B);
  controle(`${p}-16`, "proposition ajoutée de nouveau : deux propositions, le chiffre donné est gardé", (await retenuesIds(page)).length === 2 && (await retenue(page, A.A).getByLabel(oA.question, { exact: true }).inputValue()) === A.valeur && (await formulation(page).inputValue()) === A.compose);

  // Formulation modifiée, propositions changées ensuite : à relire, jamais remplacée en silence.
  await formulation(page).fill(A.libre);
  controle(`${p}-17`, "formulation modifiée : gardée telle quelle, « Reprendre la formulation proposée » apparaît", (await formulation(page).inputValue()) === A.libre && (await formulation(page).getAttribute("data-modifiee")) === "oui" && (await formulaire(page).locator("[data-reprendre-formulation]").count()) === 1);
  await delai(page).fill("4");
  await page.waitForTimeout(150);
  const aRevoir = (await formulaire(page).locator("[data-formulation-a-revoir]").count()) === 1;
  await valider(page).click();
  await page.waitForTimeout(400);
  controle(`${p}-18`, "délai changé après la modification : la formulation est signalée à relire, la validation est refusée, le texte du dirigeant reste, rien en base", aRevoir && (await formulaire(page).getByText(/Vos propositions ont changé depuis que vous avez modifié la formulation : relisez-la/).count()) === 1 && (await formulation(page).inputValue()) === A.libre && lignes(email, A.code).length === 0);
  await formulaire(page).locator("[data-formulation-a-revoir] [data-reprendre-formulation]").click();
  await page.waitForTimeout(150);
  controle(`${p}-19`, "« Reprendre la formulation proposée » : la formulation suit de nouveau les propositions et le délai", (await formulation(page).getAttribute("data-modifiee")) === "non" && (await formulation(page).inputValue()) === A.compose.replace(`d'ici ${A.delai} mois`, "d'ici 4 mois"), await formulation(page).inputValue());
  await delai(page).fill(A.delai);
  await formulation(page).fill(A.etranger);
  await valider(page).click();
  await page.waitForTimeout(400);
  const chiffre = A.etranger.match(/\d+/)[0];
  controle(`${p}-20`, `chiffre absent des propositions écrit dans la formulation (« ${chiffre} ») : refusé, le message le nomme, rien en base`, (await formulaire(page).getByText(new RegExp(`Le chiffre « ${chiffre} » de votre formulation ne vient ni de vos propositions ni de votre délai`)).count()) === 1 && (await focusId(page)).endsWith("-formulation") && lignes(email, A.code).length === 0, await focusId(page));
  await formulation(page).fill(A.libre);
  // « Garder ma formulation » après un changement de chiffre : elle est gardée, mais son ancien chiffre n'y a plus sa place.
  await retenue(page, A.A).getByLabel(oA.question, { exact: true }).fill(String(Number(A.valeur) + 1));
  await page.waitForTimeout(150);
  await formulaire(page).locator("[data-garder-formulation]").click();
  await valider(page).click();
  await page.waitForTimeout(400);
  controle(`${p}-21`, "chiffre changé puis « Garder ma formulation » : la formulation reste celle du dirigeant, mais son ancien chiffre est signalé", (await formulaire(page).locator("[data-formulation-a-revoir]").count()) === 0 && (await formulaire(page).getByText(new RegExp(`Le chiffre « ${A.valeur} » de votre formulation`)).count()) === 1 && lignes(email, A.code).length === 0);
  await retenue(page, A.A).getByLabel(oA.question, { exact: true }).fill(A.valeur);
  await page.waitForTimeout(150);
  if ((await formulaire(page).locator("[data-garder-formulation]").count()) > 0) await formulaire(page).locator("[data-garder-formulation]").click();

  // Changement de mode : chaque brouillon est gardé, seul le mode actif compte.
  await choisirMode(page, "personnel");
  const aide = await formulaire(page).locator("[id$='-texte-aide']").innerText().catch(() => "");
  controle(`${p}-22`, `« ${MODES.personnel} » : champ « Votre objectif » ouvert directement, aide et exemple de l'agent, les propositions disparaissent, le curseur est dans le champ`, (await champPerso(page).count()) === 1 && aide.includes(def.personnel.exemple) && (await cartes(page).count()) === 0 && (await champPerso(page).evaluate((el) => el === document.activeElement)), aide);
  await champPerso(page).fill(A.texte);
  await capture(page, `${nom}-ordinateur-4-ecrire`, { haut: modes(page) });
  await choisirMode(page, "composition");
  controle(`${p}-23`, "retour au mode « Composer » : propositions cochées, chiffre, délai et formulation modifiée retrouvés ; le champ personnel n'est plus affiché", (await caseDe(page, A.A).isChecked()) && (await caseDe(page, A.B).isChecked()) && (await retenue(page, A.A).getByLabel(oA.question, { exact: true }).inputValue()) === A.valeur && (await delai(page).inputValue()) === A.delai && (await formulation(page).inputValue()) === A.libre && (await champPerso(page).count()) === 0);
  await choisirMode(page, "personnel");
  controle(`${p}-24`, "retour au mode « Écrire » : le texte écrit est retrouvé tel quel", (await champPerso(page).inputValue()) === A.texte);
  await champPerso(page).fill("    ");
  await reussite(page).fill("je le constate chaque semaine");
  await delai(page).fill("4");
  await valider(page).click();
  await page.waitForTimeout(400);
  controle(`${p}-25`, "texte fait d'espaces : « Décrivez votre objectif en quelques mots pour continuer. », le champ reçoit le focus, rien en base", (await page.getByText("Décrivez votre objectif en quelques mots pour continuer.").count()) === 1 && (await champPerso(page).evaluate((el) => el === document.activeElement)) && lignes(email, A.code).length === 0);
  await champPerso(page).fill(A.texte);

  // Validation de l'objectif composé (seul le mode actif part).
  await choisirMode(page, "composition");
  await valider(page).click();
  await attendreEnregistrement(page);
  const apres = actifs(email, A.code);
  controle(`${p}-26`, "objectif composé enregistré : un seul actif, mode « composition », les deux propositions identifiables (et le chiffre de la première), la formulation du dirigeant, rien du mode « Écrire »", apres.length === 1 && apres[0].mode === "composition" && apres[0].origine === "proposition" && apres[0].choix === "" && apres[0].composition === ordre.map((x) => `${x}:${x === A.A ? A.valeur : ""}`).join(",") && apres[0].phrase === A.libre && apres[0].modifiee === "true" && !apres[0].quoi.includes(A.texte), JSON.stringify(apres));
  const phrase = async () => (await page.locator("[data-objectif-phrase]").first().innerText().catch(() => "")).trim();
  const propositionsAffichees = () => page.locator(".audit-objectif-actif [data-proposition-retenue]").allInnerTexts();
  controle(`${p}-27`, "écran suivant : la formulation, « Composé de 2 propositions » avec chacune, « Formulation écrite par vous »", (await phrase()) === A.libre && (await propositionsAffichees()).length === 2 && (await page.getByText("Formulation écrite par vous", { exact: false }).count()) >= 1, (await propositionsAffichees()).join(" | "));
  const deja = await page.locator("section[data-deja-tente]").getAttribute("data-objectif-id").catch(() => null);
  const ordreDom = await page.evaluate(() => {
    const o = document.querySelector(".audit-objectif-actif");
    const d = document.querySelector("section[data-deja-tente]");
    return o && d ? Boolean(o.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
  });
  controle(`${p}-28`, "« Ce que vous avez déjà essayé » apparaît après la validation, sous l'objectif, rattaché à ce nouvel objectif", deja === apres[0].id && ordreDom, `${deja} / ${apres[0].id}`);
  await capture(page, `${nom}-ordinateur-5-objectif-valide`, { haut: page.locator(".audit-objectif-actif") });
  await page.reload({ waitUntil: "networkidle" });
  controle(`${p}-29`, "après actualisation : même objectif, mêmes propositions", (await phrase()) === A.libre && (await propositionsAffichees()).length === 2);
  await contexte.clearCookies();
  await connecter(page, email);
  await page.goto(url, { waitUntil: "networkidle" });
  controle(`${p}-30`, "après déconnexion et reconnexion : même objectif", (await phrase()) === A.libre && (await propositionsAffichees()).length === 2);

  // Retour à l'étape Objectif : le mode « Composer » est choisi, avec les propositions, le chiffre, le délai et la formulation.
  await page.goto(`${url}?etape=1`, { waitUntil: "networkidle" });
  controle(`${p}-31`, "retour à l'étape Objectif : « Composer » choisi, propositions cochées, chiffre, délai et formulation du dirigeant repris", (await modeRadio(page, "composition").isChecked()) && (await caseDe(page, A.A).isChecked()) && (await caseDe(page, A.B).isChecked()) && (await retenue(page, A.A).getByLabel(oA.question, { exact: true }).inputValue()) === A.valeur && (await delai(page).inputValue()) === A.delai && (await formulation(page).inputValue()) === A.libre && (await formulation(page).getAttribute("data-modifiee")) === "oui");

  // Modification abandonnée, puis retour en arrière : rien n'a changé.
  await retenue(page, A.B).getByRole("button", { name: `Retirer « ${oB.libelle} »` }).click();
  await page.getByRole("button", { name: "Garder l'objectif actuel" }).click();
  await page.waitForURL((u) => !u.search.includes("etape=1"), { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  controle(`${p}-32`, "modification abandonnée (« Garder l'objectif actuel ») : retour à l'audit, l'objectif composé reste le seul actif", (await phrase()) === A.libre && actifs(email, A.code).length === 1 && lignes(email, A.code).length === 1, await phrase());
  await page.goBack({ waitUntil: "networkidle" });
  controle(`${p}-33`, "retour en arrière du navigateur vers l'étape Objectif : le formulaire montre l'objectif enregistré, pas la modification abandonnée", (await modeRadio(page, "composition").isChecked()) && (await caseDe(page, A.B).isChecked()) && (await retenuesIds(page)).length === 2);

  // Transmission : l'onglet « Résultats » suit chaque proposition ; le dossier du rapport les nomme.
  await page.goto(`${url}?etape=4`, { waitUntil: "networkidle" });
  const composantes = await page.locator("[data-objectif-resultat] [data-composantes] li[data-composante]").evaluateAll((l) => l.map((x) => x.getAttribute("data-composante")));
  const resPhrase = (await page.locator("[data-objectif-resultat] [data-objectif-phrase]").first().innerText().catch(() => "")).trim();
  controle(`${p}-34`, "« Résultats » : la formulation, puis chaque proposition retenue suivie à part, sans ordre d'importance", resPhrase === A.libre && composantes.join() === ordre.join() && (await page.locator("[data-objectif-resultat]").getByText(/Composé de 2 propositions/).count()) === 1, composantes.join(","));
  await capture(page, `${nom}-ordinateur-6-resultats-objectif-compose`, { haut: page.locator("[data-objectif-resultat]") });
  await api.put(`${B}/api/audit/tentatives`, { data: { objectifId: apres[0].id, tentatives: { etat: "rien" } } });
  const lance = await api.post(`${B}/api/rapport`, { data: { agent: A.code } });
  const pret = await attendre(() => sql(`select coalesce(string_agg(r.statut::text, ','), '') from "Rapport" r join "User" u on u.id=r."userId" where u.email='${email}' and r.agent='${A.code}'`) === "PRET", 20000);
  const retenuesDossier = sql(`select coalesce(string_agg(x->>'proposition', ' ; '), '') from "Rapport" r join "User" u on u.id=r."userId", jsonb_array_elements(r.dossier->'objectif'->'propositionsRetenues') x where u.email='${email}' and r.agent='${A.code}'`);
  const phraseDossier = sql(`select r.dossier->'objectif'->>'phrase' from "Rapport" r join "User" u on u.id=r."userId" where u.email='${email}' and r.agent='${A.code}'`);
  const attenduDossier = ordre.map((x) => def.objectifs.find((o) => o.id === x).libelle).join(" ; ");
  controle(`${p}-35`, "rapport (simulation) : le dossier transmis à l'IA contient la formulation et chaque proposition retenue, nommée", lance.status() === 202 && pret && phraseDossier === A.libre && retenuesDossier === attenduDossier, `${lance.status()} ; ${retenuesDossier}`);

  // Modification enregistrée : un objectif écrit remplace l'objectif composé, qui passe en historique.
  await page.goto(`${url}?etape=1`, { waitUntil: "networkidle" });
  await choisirMode(page, "personnel");
  await champPerso(page).fill(A.texte);
  await reussite(page).fill("je le constate chaque semaine");
  await delai(page).fill("4");
  await valider(page).click();
  await attendreEnregistrement(page);
  const remplace = lignes(email, A.code);
  const perso = `${A.texte}, d'ici 4 mois`;
  controle(`${p}-36`, "objectif écrit enregistré : un seul actif, mode et origine « personnel », texte du dirigeant intact ; l'objectif composé passe en historique « remplacé »", remplace.filter((l) => l.statut === "ACTIF").length === 1 && remplace.find((l) => l.statut === "ACTIF")?.phrase === perso && remplace.find((l) => l.statut === "ACTIF")?.mode === "personnel" && remplace.find((l) => l.statut === "ACTIF")?.quoi === A.texte && remplace.some((l) => l.statut === "REMPLACE" && l.mode === "composition"), JSON.stringify(remplace));
  controle(`${p}-37`, "écran suivant : la phrase de l'objectif écrit et la mention « Objectif personnel »", (await phrase()) === perso && (await page.getByText(/Objectif personnel/).count()) >= 1, await phrase());
  await page.goto(`${url}?etape=4`, { waitUntil: "networkidle" });
  const res = (await page.locator("[data-objectif-resultat] [data-objectif-phrase]").first().innerText().catch(() => "")).trim();
  controle(`${p}-38`, "« Résultats » : l'objectif transmis est celui qui vient d'être écrit", res === perso && (await page.locator("[data-composantes]").count()) === 0, res);
  await contexte.close();
}

// --- 2. Cas particuliers ------------------------------------------------------------------------------------------------
{
  const { email, contexte, page, api } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false });

  // Le serveur refuse deux objectifs, impose le texte de la liste et garde la forme d'avant (proposition seule).
  const deux = await api.post(`${B}/api/audit/objectif`, { data: { agent: "RH_ORGANISATION", objectifs: [{ quoi: "x", reussite: "chacun sait quoi faire", delaiMois: 3, choix: "rh-roles" }, { quoi: "mieux préparer les saisons", reussite: "le planning est prêt", delaiMois: 3 }] } });
  controle("X-01", "serveur : deux objectifs envoyés ensemble sont refusés (« Cet agent suit un seul objectif à la fois. »), rien en base", deux.status() === 400 && (await deux.json()).erreur === "Cet agent suit un seul objectif à la fois." && lignes(email, "RH_ORGANISATION").length === 0);
  const r = await api.post(`${B}/api/audit/objectif`, { data: { agent: "RH_ORGANISATION", objectifs: [{ quoi: "un texte qui ne correspond pas", reussite: "chacun sait quoi faire", delaiMois: 3, choix: "rh-roles" }] } });
  const ancien = actifs(email, "RH_ORGANISATION")[0];
  controle("X-02", "serveur : une proposition seule envoyée sous la forme d'avant le 29 octobre est enregistrée avec le texte de la liste, comme un objectif composé d'une proposition", r.ok() && ancien?.quoi === "clarifier qui fait quoi" && ancien?.mode === "composition" && ancien?.composition === "rh-roles:" && ancien?.phrase === "clarifier qui fait quoi, d'ici 3 mois", JSON.stringify(ancien));
  const post = (agent, saisie) => api.post(`${B}/api/audit/objectif`, { data: { agent, objectifs: [saisie] } });
  const recouvre = await post("COMM_CREATION", { mode: "composition", composition: [{ choix: "com-annonces" }, { choix: "com-cout-demande" }], reussite: "chaque demande me coûte moins cher", delaiMois: 3 });
  controle("X-03", "serveur : deux propositions qui se recouvrent sont refusées, le message les nomme", recouvre.status() === 400 && (await recouvre.json()).erreur.includes("se recouvrent"));
  const trop = await post("COMM_CREATION", { mode: "composition", composition: DEF.COMM_CREATION.objectifs.filter((o) => o.groupe === MISE_EN_PLACE).slice(0, MAX + 1).map((o) => ({ choix: o.id })), reussite: "ma présence en ligne est en place", delaiMois: 3 });
  controle("X-04", `serveur : plus de ${MAX} propositions sont refusées`, trop.status() === 400 && (await trop.json()).erreur.includes(`au plus ${MAX} propositions`));
  const etranger = await post("COMM_CREATION", { mode: "composition", composition: [{ choix: "com-avis", ampleur: { valeur: 10, unite: "unites" } }], formulation: "obtenir 30 nouveaux avis clients d'ici 3 mois", delaiMois: 3 });
  const corpsEtranger = await etranger.json();
  controle("X-05", "serveur : une formulation qui ajoute un chiffre est refusée (champ « formulation »)", etranger.status() === 400 && corpsEtranger.champ === "formulation" && corpsEtranger.erreur.includes("« 30 »"), corpsEtranger.erreur);
  const qualitatif = await post("COMM_CREATION", { mode: "composition", composition: [{ choix: "com-note" }, { choix: "com-fichier" }], delaiMois: 3 });
  controle("X-06", "serveur : propositions sans chiffre et rien à constater : refusé, champ « reussite » (aucun chiffre imposé)", qualitatif.status() === 400 && (await qualitatif.json()).champ === "reussite");
  controle("X-07", "rien de ces refus n'a été enregistré pour la Comm", lignes(email, "COMM_CREATION").length === 0);

  // Plafond atteint à l'écran : la proposition de trop n'est pas cochée, sa carte dit pourquoi.
  await page.goto(`${B}/audit/comm-creation-contenu`, { waitUntil: "networkidle" });
  await choisirMode(page, "composition");
  await choisirPartie(page, MISE_EN_PLACE);
  const miseEnPlace = DEF.COMM_CREATION.objectifs.filter((o) => o.groupe === MISE_EN_PLACE);
  for (const o of miseEnPlace.slice(0, MAX)) await cocher(page, o.id);
  await cocher(page, miseEnPlace[MAX].id);
  const refusMax = await carte(page, miseEnPlace[MAX].id).locator("[data-refus]").innerText().catch(() => "");
  controle("X-08", `à l'écran, une ${MAX + 1}e proposition n'est pas cochée ; sa carte dit « le maximum pour un objectif »`, !(await caseDe(page, miseEnPlace[MAX].id).isChecked()) && refusMax.includes("le maximum pour un objectif") && (await retenuesIds(page)).length === MAX, refusMax);
  // Changement de partie : la sélection de l'autre partie est gardée mais n'est pas transmise.
  await choisirPartie(page, AMELIORER);
  controle("X-09", "Comm : changer de partie montre les propositions de cette partie, aucune cochée ; la sélection de l'autre partie revient avec elle", (await retenuesIds(page)).length === 0 && (await compte(page)) === "Aucune proposition retenue");
  await choisirPartie(page, MISE_EN_PLACE);
  controle("X-10", "retour à la première partie : sa sélection est retrouvée", (await retenuesIds(page)).length === MAX);

  // Clavier : sans présélection, Tab atteint le premier choix ; flèches, Espace, Tab vers les propositions.
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
  controle("X-11", `clavier : Tab atteint « ${MODES.personnel} » sans rien choisir, avec un focus visible`, surMode === "personnel" && visible && !(await modeRadio(pk, "personnel").isChecked()), `${surMode} après ${tabs} Tab, visible ${visible}`);
  await pk.keyboard.press("ArrowDown");
  await pk.waitForTimeout(250);
  controle("X-12", `clavier : la flèche choisit « ${MODES.composition} », qui s'ouvre ; le curseur reste sur le choix`, (await modeRadio(pk, "composition").isChecked()) && (await cartes(pk).count()) > 0 && (await pk.evaluate(() => document.activeElement?.closest("li[data-mode]")?.getAttribute("data-mode"))) === "composition");
  await pk.keyboard.press("Tab");
  const premiere = await pk.evaluate(() => document.activeElement?.closest("li[data-carte]")?.getAttribute("data-carte") ?? "");
  await pk.keyboard.press("Space");
  await pk.waitForTimeout(250);
  await pk.keyboard.press("Tab");
  await pk.keyboard.press("Space");
  await pk.waitForTimeout(250);
  controle("X-13", "clavier : Tab entre dans les propositions, Espace coche ; Tab passe à la suivante, Espace la coche aussi", premiere !== "" && (await retenuesIds(pk)).length === 2 && (await retenuesIds(pk))[0] === premiere, (await retenuesIds(pk)).join(","));
  await pk.keyboard.press("Space");
  await pk.waitForTimeout(250);
  controle("X-14", "clavier : Espace sur une proposition cochée la retire du récapitulatif", (await retenuesIds(pk)).join() === premiere);
  await modeRadio(pk, "composition").focus();
  await pk.keyboard.press("ArrowUp");
  await pk.waitForTimeout(250);
  await pk.keyboard.press("Tab");
  await pk.keyboard.type("Mieux préparer les saisons");
  controle("X-15", "clavier : retour à « Écrire mon objectif » par la flèche ; Tab mène au champ « Votre objectif », où le texte s'écrit", (await champPerso(pk).inputValue()) === "Mieux préparer les saisons", await champPerso(pk).inputValue());
  await k.contexte.close();

  // Comm (6C) : un objectif de « Mettre en place… » et une réponse « je publie déjà » : l'écart est signalé, rien n'est bloqué.
  await page.goto(`${B}/audit/comm-creation-contenu`, { waitUntil: "networkidle" });
  await choisirMode(page, "composition");
  await choisirPartie(page, MISE_EN_PLACE);
  for (const id of await retenuesIds(page)) await cocher(page, id);
  await cocher(page, "com-cible");
  await delai(page).fill("1");
  await reussite(page).fill("je sais décrire mon client idéal");
  await valider(page).click();
  await attendreEnregistrement(page);
  const avant = (await page.locator("[data-ecart-partie]").count()) === 0;
  const rep = await api.put(`${B}/api/audit/reponses`, { data: { cle: "COM-10.07", reponse: { genre: "saisie", valeur: "oui_au_moins_une_fois_par_mois" } } });
  await page.reload({ waitUntil: "networkidle" });
  const notes = await page.locator("[data-ecart-partie]").allInnerTexts();
  const sousQuestion = await carteQuestion(page, "COM-10.07").locator("[data-ecart-partie]").count();
  controle("X-16", "Comm (6C) : objectif dans « Mettre en place… », réponse « Oui, au moins une fois par mois » → l'écart est expliqué sous l'objectif et sous la question, sans blocage", avant && rep.ok() && actifs(email, "COMM_CREATION").length === 1 && notes.length === 2 && sousQuestion === 1 && notes[0].includes(MISE_EN_PLACE) && notes[0].includes(AMELIORER) && notes[0].includes("Rien n'est bloqué") && (await page.locator("li[data-question]").count()) > 1, notes[0] ?? "aucun message");
  await capture(page, "com-ordinateur-7-ecart-partie", { haut: page.locator(".audit-objectif-actif") });
  await page.goto(`${B}/audit/comm-creation-contenu?etape=1`, { waitUntil: "networkidle" });
  controle("X-17", "Comm (6C) : à l'étape Objectif, la partie choisie montre aussi l'écart", (await formulaire(page).locator("[data-ecart-partie]").count()) === 1);
  await api.put(`${B}/api/audit/reponses`, { data: { cle: "COM-10.07", reponse: { genre: "saisie", valeur: "non_jamais" } } });
  await page.goto(`${B}/audit/comm-creation-contenu`, { waitUntil: "networkidle" });
  controle("X-18", "Comm (6C) : quand la réponse correspond à la partie (« Non, jamais »), aucun message", (await page.locator("[data-ecart-partie]").count()) === 0);
  await contexte.close();
}

// --- 3. Taille de l'entreprise, téléphone ------------------------------------------------------------------------------
{
  const { email, contexte, page } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 1, objectifs: false, viewport: { width: 360, height: 760 } });
  await page.goto(`${B}/audit/rh-organisation`, { waitUntil: "networkidle" });
  const m = await mesureModes(page);
  controle("T-01", "téléphone 360 px : les deux choix empilés, de même largeur et de même corps de titre", m.length === 2 && m[1].y >= m[0].bas && m[0].l === m[1].l && m[0].titre === m[1].titre, JSON.stringify(m));
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  controle("T-02", "téléphone 360 px : aucune barre de défilement horizontale", largeur <= 360, largeur);
  await capture(page, "rh-telephone-1-deux-choix", { haut: modes(page) });
  await choisirMode(page, "composition");
  const ids = await cartes(page).evaluateAll((l) => l.map((x) => x.getAttribute("data-carte")));
  controle("T-03", "dirigeant seul : ni départs, ni absences, ni charge de l'équipe ; « Libérer du temps… » et « Me faire aider dans mon travail » sont proposés", !ids.includes("rh-turnover") && !ids.includes("rh-absences") && !ids.includes("rh-charge") && ids.includes("rh-temps") && ids.includes("rh-aide"), ids.join(", "));
  await cocher(page, "rh-aide");
  await cocher(page, "rh-recruter");
  controle("T-04", "dirigeant seul : « Recruter et intégrer… » recouvre « Me faire aider dans mon travail », déjà retenue : non cochée, raison écrite", !(await caseDe(page, "rh-recruter").isChecked()) && (await carte(page, "rh-recruter").locator("[data-refus]").count()) === 1);
  await cocher(page, "rh-temps");
  await capture(page, "rh-telephone-2-composer-liste", { haut: formulaire(page).locator("[data-propositions]") });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
  await page.waitForTimeout(200);
  const bouton = await valider(page).boundingBox();
  controle("T-05", "téléphone : « Valider mon objectif » et le nombre de propositions retenues restent visibles pendant le défilement", bouton !== null && bouton.y >= 0 && bouton.y + bouton.height <= 760 && (await compte(page)) === "2 propositions retenues", JSON.stringify(bouton));
  await retenue(page, "rh-temps").getByLabel("Combien d'heures par semaine voulez-vous libérer ?", { exact: true }).fill("4");
  await delai(page).fill("6");
  await page.waitForTimeout(200);
  const f = await formulation(page).inputValue();
  controle("T-06", "téléphone : formulation dans l'ordre de la liste, « libérer 4 heures par semaine pour piloter l'entreprise et me faire aider dans mon travail, d'ici 6 mois »", f === "libérer 4 heures par semaine pour piloter l'entreprise et me faire aider dans mon travail, d'ici 6 mois", f);
  const boites = await recap(page).locator("input, textarea").evaluateAll((l) => l.map((x) => { const r = x.getBoundingClientRect(); return { g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.height) }; }));
  controle("T-07", "téléphone : les champs du récapitulatif tiennent dans la largeur et mesurent au moins 40 px de haut", boites.length >= 3 && boites.every((b) => b.g >= 0 && b.d <= 360 && b.h >= 40), JSON.stringify(boites));
  await capture(page, "rh-telephone-3-objectif-compose", { haut: recap(page) });
  await valider(page).click();
  await attendreEnregistrement(page);
  const a = actifs(email, "RH_ORGANISATION");
  controle("T-08", "téléphone : objectif composé de deux propositions enregistré", a.length === 1 && a[0].mode === "composition" && a[0].composition.split(",").length === 2, JSON.stringify(a));
  await capture(page, "rh-telephone-4-objectif-valide", { haut: page.locator(".audit-objectif-actif") });
  await page.goto(`${B}/audit/rh-organisation?etape=1`, { waitUntil: "networkidle" });
  await choisirMode(page, "personnel");
  await champPerso(page).fill("Trouver un apprenti pour la saison");
  await reussite(page).fill("un apprenti travaille avec moi en mai");
  await delai(page).fill("6");
  await capture(page, "rh-telephone-5-ecrire", { haut: modes(page) });
  const cible = await champPerso(page).boundingBox();
  controle("T-09", "téléphone : le champ « Votre objectif » tient dans la largeur et mesure au moins 40 px de haut", cible !== null && cible.x >= 0 && cible.x + cible.width <= 360 && cible.height >= 40, JSON.stringify(cible));
  await contexte.close();
}
{
  const { contexte, page } = await creerCompte(nav, { agents: ["RH", "COM"], niveau: "ESSENTIEL", effectif: 4, objectifs: false, viewport: { width: 390, height: 844 } });
  await page.goto(`${B}/audit/comm-creation-contenu`, { waitUntil: "networkidle" });
  await capture(page, "com-telephone-1-deux-choix", { haut: modes(page) });
  await choisirMode(page, "composition");
  await choisirPartie(page, MISE_EN_PLACE);
  await cocher(page, "com-fiche");
  await cocher(page, "com-premiers-avis");
  await capture(page, "com-telephone-2-composer-liste", { haut: formulaire(page).locator("[data-parties]") });
  await retenue(page, "com-premiers-avis").getByLabel("Combien de premiers avis visez-vous ?", { exact: true }).fill("1");
  await delai(page).fill("2");
  await page.waitForTimeout(200);
  const f = await formulation(page).inputValue();
  controle("T-10", "Comm, téléphone : « créer et compléter ma fiche Google et obtenir mon premier avis client, d'ici 2 mois »", f === "créer et compléter ma fiche Google et obtenir mon premier avis client, d'ici 2 mois", f);
  await capture(page, "com-telephone-3-objectif-compose", { haut: recap(page) });
  await retenue(page, "com-fiche").getByRole("button", { name: /^Retirer/ }).click();
  await page.waitForTimeout(200);
  controle("T-11", "une seule proposition retenue : « obtenir mon premier avis client d'ici 2 mois » (même phrase qu'avant le 29 octobre)", (await formulation(page).inputValue()) === "obtenir mon premier avis client d'ici 2 mois", await formulation(page).inputValue());
  await choisirMode(page, "personnel");
  await champPerso(page).fill("Être connu dans ma ville pour la rénovation de salles de bain");
  await capture(page, "com-telephone-4-ecrire", { haut: modes(page) });
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  controle("T-12", "téléphone 390 px (Comm) : aucune barre de défilement horizontale", largeur <= 390, largeur);
  await contexte.close();
}

await nav.close();
process.exit(ecrire(sortie) > 0 ? 1 : 0);

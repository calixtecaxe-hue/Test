// Cohérence des résultats (vérification du 28 octobre) : ce que montrent le compte rendu, « Mes agents » et le total
// pré-rempli de la Finance, comparé à des valeurs attendues établies **sans le code testé** : comptées sur l'écran du
// questionnaire (cartes affichées, cartes répondues) et calculées à la main d'après les règles écrites (CLAUDE.md : un thème
// est évalué à partir de 50 % de réponses, « je ne sais pas » et « je ne suis pas cette donnée » comptent comme sans
// réponse ; total du budget = somme du détail donné).
//
//   node scripts/verification/resultats.mjs [--sortie docs/verification/resultats]
import { readFileSync } from "node:fs";
import { chromium, B, journal, creerCompte, carte, stabiliser } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const { controle, ecrire } = journal("resultats");
const banque = new Map(JSON.parse(readFileSync("data/banque/questions.json", "utf8")).map((q) => [q.donnee, q]));
const themes = new Map(JSON.parse(readFileSync("data/themes.json", "utf8")).map((t) => [t.code, t]));
// Données lues par une règle d'affichage (d'après le fichier de règles) : y répondre peut changer les questions posées.
const regles = readFileSync("data/regles-affichage.json", "utf8");
const lues = new Set(regles.match(/[A-Z]{2,3}-\d{2}\.\d{2}/g));

const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const { page } = await creerCompte(nav, { metier: "electricien", effectif: 4, agents: ["ACQ", "FIN", "RH", "COM"] });
const ACQ = B + "/audit/acquisition-chiffre-affaires";
const FIN = B + "/audit/finance-rentabilite";

// Thèmes et cartes affichés dans le questionnaire.
async function themesEcran() {
  return page.locator('section[aria-labelledby="questions"] div:has(> h3 + ul), section[aria-labelledby="questions"] div:has(> h3 ~ ul)').evaluateAll((divs) =>
    divs.map((d) => ({
      nom: d.querySelector(":scope > h3")?.textContent.trim(),
      cartes: [...d.querySelectorAll(":scope > ul > li[data-question]")].map((li) => ({ code: li.getAttribute("data-question"), traitee: li.getAttribute("data-traitee") === "oui" })),
    })),
  );
}
const SIMPLES = new Set(["nombre", "oui_non", "choix"]);
const repondre = async (code, valeur) => {
  const c = carte(page, code);
  await c.scrollIntoViewIfNeeded();
  const spec = banque.get(code)?.reponse;
  // « Je ne sais pas » ou « je ne suis pas cette donnée » choisi : un second clic rouvre la saisie, comme le ferait le dirigeant.
  const mode = c.locator('[aria-label="Autres réponses"] button[aria-pressed="true"]');
  if (await mode.count()) await mode.click();
  if (spec?.type === "nombre") {
    const champ = c.locator('input[id$="-exact"]').first();
    await champ.fill(String(valeur));
    await champ.press("Tab");
  } else {
    const v = spec?.type === "oui_non" ? "oui" : spec.options[0].id;
    await c.locator(`label.case-option:has(input[value="${v}"])`).first().click();
  }
  await stabiliser(page, 1200);
};
const bouton = async (code, nom) => {
  await carte(page, code).getByRole("button", { name: nom, exact: true }).click();
  await stabiliser(page, 1200);
};
// Ligne d'un thème dans le compte rendu : groupe et « N réponses sur M ».
async function ligneCompteRendu(nom) {
  await page.goto(ACQ + "?etape=4", { waitUntil: "networkidle" });
  return page.locator("li.res-theme").evaluateAll(
    (lis, n) => {
      const li = lis.find((x) => x.querySelector("p")?.textContent.trim() === n);
      if (!li) return null;
      const groupe = li.closest("section")?.querySelector("h4, h3")?.textContent.replace(/\s*\(\d+\)\s*$/, "").trim();
      return { groupe, texte: li.textContent.replace(/\s+/g, " ").trim() };
    },
    nom,
  );
}

// --- 1. Règle des 50 % ---------------------------------------------------------------------------------------------
await page.goto(ACQ, { waitUntil: "networkidle" });
const ecran = await themesEcran();
const candidat = ecran
  .filter((t) => t.cartes.length >= 3)
  .map((t) => ({ ...t, theme: themes.get(t.cartes[0].code.slice(0, t.cartes[0].code.indexOf("."))) }))
  .filter((t) => t.theme && t.theme.nature !== "contexte" && t.cartes.every((c) => SIMPLES.has(banque.get(c.code)?.reponse?.type) && !lues.has(c.code)))
  .sort((a, b) => (a.cartes.length % 2) - (b.cartes.length % 2) || b.cartes.length - a.cartes.length)[0];
if (!candidat) {
  controle("R-00", "un thème d'au moins 3 questions simples (chiffre, choix, oui / non), sans question qui en ouvre d'autres", false, `aucun thème de cette forme à l'écran : ${ecran.map((t) => `${t.nom} (${t.cartes.length})`).join(", ")}`);
} else {
  const n = candidat.cartes.length;
  const codes = candidat.cartes.map((c) => c.code);
  const moitie = Math.ceil(n / 2);
  console.log(`Thème retenu : ${candidat.nom} (${candidat.theme.code}, nature ${candidat.theme.nature}), ${n} questions : ${codes.join(", ")}`);
  // a. 1 réponse chiffrée, 1 « je ne sais pas » : 1 réponse sur n, à compléter.
  await repondre(codes[0], 12);
  await bouton(codes[1], "Je ne sais pas");
  let l = await ligneCompteRendu(candidat.nom);
  controle("R-01", `1 réponse et 1 « je ne sais pas » sur ${n} questions : thème « À compléter », « 1 réponse sur ${n} » (je ne sais pas = sans réponse)`, l?.groupe === "À compléter" && l.texte.includes(`1 réponse sur ${n}`), JSON.stringify(l));
  // b. Exactement la moitié (ou la moitié arrondie au-dessus) : thème évalué.
  await page.goto(ACQ, { waitUntil: "networkidle" });
  for (const c of codes.slice(2, 1 + moitie)) await repondre(c, 7);
  l = await ligneCompteRendu(candidat.nom);
  controle("R-02", `${moitie} réponses sur ${n} (${Math.round((moitie / n) * 100)} %) : thème analysé avec vos chiffres, « ${moitie} réponses sur ${n} »`, l?.groupe === "Analysés avec vos chiffres" && l.texte.includes(`${moitie} réponses sur ${n}`), JSON.stringify(l));
  // c. Un chiffre remplacé par « je ne suis pas cette donnée » : sous la moitié, de nouveau à compléter.
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await bouton(codes[0], "Je ne suis pas cette donnée");
  l = await ligneCompteRendu(candidat.nom);
  controle("R-03", `« je ne suis pas cette donnée » à la place d'une réponse : ${moitie - 1} réponse(s) sur ${n}, thème « À compléter »`, l?.groupe === "À compléter" && l.texte.includes(`${moitie - 1} réponse${moitie - 1 > 1 ? "s" : ""} sur ${n}`), JSON.stringify(l));
  // d. Retour du chiffre : de nouveau évalué.
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await repondre(codes[0], 12);
  l = await ligneCompteRendu(candidat.nom);
  controle("R-04", `réponse rétablie : ${moitie} réponses sur ${n}, thème de nouveau analysé`, l?.groupe === "Analysés avec vos chiffres" && l.texte.includes(`${moitie} réponses sur ${n}`), JSON.stringify(l));
}

// --- 2. Avancement sur « Mes agents » --------------------------------------------------------------------------------
async function avancementAttendu() {
  await page.goto(ACQ, { waitUntil: "networkidle" });
  const cartes = (await themesEcran()).flatMap((t) => t.cartes);
  const traitees = cartes.filter((c) => c.traitee).length;
  return { questions: cartes.length, traitees, pourcent: Math.min(100, Math.round((traitees / cartes.length) * 100)) };
}
async function avancementAffiche() {
  await page.goto(B + "/tableau-de-bord", { waitUntil: "networkidle" });
  const carteAcq = page.locator("article, li, div").filter({ has: page.getByRole("progressbar", { name: /Acquisition/ }) }).last();
  const t = (await carteAcq.innerText()).replace(/\s+/g, " ");
  const m = t.match(/(\d+) questions? sur (\d+)\s*(\d+)\s*%/);
  return m ? { traitees: Number(m[1]), questions: Number(m[2]), pourcent: Number(m[3]) } : { texte: t.slice(0, 200) };
}
let att = await avancementAttendu();
let aff = await avancementAffiche();
controle("R-05", `avancement : ${att.traitees} questions traitées sur ${att.questions} affichées dans le questionnaire, soit ${att.pourcent} %`, aff.traitees === att.traitees && aff.questions === att.questions && aff.pourcent === att.pourcent, JSON.stringify(aff));

// Une question ouverte par une autre, répondue, puis fermée : elle ne compte plus ni dans les questions ni dans les traitées.
await page.goto(ACQ, { waitUntil: "networkidle" });
if ((await carte(page, "ACQ-08.02").count()) === 0) {
  controle("R-06", "question ouverte puis fermée : l'avancement la retire", false, "BLOQUÉ : ACQ-08.02 n'est pas affichée pour ce compte");
} else {
  await repondre("ACQ-08.02", 5);
  await stabiliser(page, 1500);
  await repondre("ACQ-08.03", 2);
  const avant = await avancementAttendu();
  const affAvant = await avancementAffiche();
  controle("R-06", `appels manqués = 5 : la question qui en dépend (ACQ-08.03) est affichée et répondue ; avancement ${avant.traitees} sur ${avant.questions}`, affAvant.traitees === avant.traitees && affAvant.questions === avant.questions && affAvant.pourcent === avant.pourcent, JSON.stringify(affAvant));
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await repondre("ACQ-08.02", 0);
  await stabiliser(page, 1500);
  const apres = await avancementAttendu();
  const affApres = await avancementAffiche();
  controle("R-07", `appels manqués = 0 : ACQ-08.03 disparaît (${avant.questions} → ${apres.questions} questions) et sa réponse ne compte plus dans les traitées (${avant.traitees} → ${apres.traitees})`, apres.questions === avant.questions - 1 && apres.traitees === avant.traitees - 1 && affApres.traitees === apres.traitees && affApres.questions === apres.questions, JSON.stringify({ apres, affApres }));
}

// --- 3. Budget marketing pré-rempli dans la Finance (FIN-05.02) -------------------------------------------------------
// Détail posé par l'API (hors du champ testé). Total attendu, calculé à la main : 0 + 150 + 100 + 200 + 80 + 300 = 830.
const s = (v) => ({ genre: "saisie", valeur: v });
const detail = {
  D04: s("oui"),
  "ACQ-03.01": s(["bouche_a_oreille", "reseaux_sociaux"]),
  "ACQ-03.05": { genre: "valeurs", valeurs: { "bouche_a_oreille.depense_par_mois": 0, "reseaux_sociaux.depense_par_mois": 150 } },
  "ACQ-07.01": { genre: "exact", valeur: 100 },
  "ACQ-07.03": { genre: "exact", valeur: 200 },
  "ACQ-07.04": { genre: "exact", valeur: 80 },
  "COM-32.02": { genre: "valeurs", valeurs: { "community_manager.par_mois": 300 } },
};
for (const [cle, reponse] of Object.entries(detail)) {
  const r = await page.request.put(B + "/api/audit/reponses", { data: { cle, reponse } });
  if (!r.ok()) console.log("préparation refusée", cle, await r.text());
}
const valeurFin = async () => {
  await page.goto(FIN, { waitUntil: "networkidle" });
  const c = carte(page, "FIN-05.02");
  if ((await c.count()) === 0) return { absente: true };
  return { valeur: await c.locator('input[id$="-exact"]').inputValue(), mention: /Rempli d.après vos réponses précédentes/.test(await c.innerText()) };
};
let f = await valeurFin();
controle("R-08", "budget marketing de la Finance pré-rempli avec la somme du détail : 830 €, avec la mention « Rempli d'après vos réponses précédentes »", f.valeur?.replace(/\s/g, "") === "830" && f.mention, JSON.stringify(f));
// Canal décoché dans l'Acquisition, à l'écran : 150 € de moins.
await page.goto(ACQ, { waitUntil: "networkidle" });
await carte(page, "ACQ-03.01").locator("label.case-option", { hasText: /^Réseaux sociaux$/ }).click();
await stabiliser(page, 2500);
f = await valeurFin();
controle("R-09", "réseaux sociaux décochés dans l'Acquisition : le total pré-rempli passe à 680 € (le coût de ce canal ne compte plus)", f.valeur?.replace(/\s/g, "") === "680" && f.mention, JSON.stringify(f));
// Le dirigeant corrige le montant : sa réponse l'emporte, même si le détail change ensuite.
const champFin = carte(page, "FIN-05.02").locator('input[id$="-exact"]');
await champFin.fill("900");
await champFin.press("Tab");
await stabiliser(page, 1500);
await page.request.put(B + "/api/audit/reponses", { data: { cle: "ACQ-07.01", reponse: { genre: "exact", valeur: 50 } } });
f = await valeurFin();
controle("R-10", "montant corrigé à 900 € par le dirigeant : il reste 900 € quand le détail change ensuite, sans la mention de pré-remplissage", f.valeur?.replace(/\s/g, "") === "900" && !f.mention, JSON.stringify(f));

// --- 4. Compte rendu : aucun chiffre inventé -----------------------------------------------------------------------
await page.goto(ACQ + "?etape=4", { waitUntil: "networkidle" });
const cr = (await page.locator("main").innerText()).replace(/\s+/g, " ");
controle("R-11", "résultats sans repère de marché ni règle de notation : aucune couleur, aucun point d'étape déclaré, réalisme « pas encore calculé »", !/(Rouge|Orange|Vert)( ·|$| )/.test(cr) && /Aucun point d'étape pour l'instant/.test(cr) && /Pas encore calculés pour aucun métier : le réalisme de votre objectif/.test(cr), cr.slice(0, 300));

await nav.close();
process.exit(ecrire(sortie) ? 1 : 0);

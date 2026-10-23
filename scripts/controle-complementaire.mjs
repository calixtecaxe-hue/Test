// Contrôles complémentaires dans le navigateur : inscription du métier par l'interface (chaque cas : activités multiples, stock,
// profession réglementée, métier absent de la liste), écrans très étroits (320 px) et tablette (768 px), niveau approfondi,
// saisie réelle d'une réponse (enregistrée, retrouvée après rechargement), et l'agent RH d'une catégorie sans questionnaire.
//
//   (serveur lancé : AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration npx next start -p 3100)
//   node scripts/controle-complementaire.mjs [--sortie dossier]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const { chargerDepuisDisque } = await import("./../src/lib/donnees/disque.ts");
const { router } = await import("./../src/lib/routage.ts");
const { remplir } = await import("./demonstration.mts");

const B = process.env.BASE ?? "http://127.0.0.1:3100";
const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "controle-complementaire";
mkdirSync(sortie, { recursive: true });
const e = chargerDepuisDisque(join(process.cwd(), "data"));
const AGENTS = [
  { code: "ACQUISITION_CA", slug: "acquisition-chiffre-affaires", objectif: { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 6 } },
  { code: "FINANCE_RENTABILITE", slug: "finance-rentabilite", objectif: { quoi: "améliorer ma marge", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 6 } },
  { code: "RH_ORGANISATION", slug: "rh-organisation", objectif: { quoi: "clarifier les rôles et les responsabilités", reussite: "chacun sait ce qu'il doit faire sans me solliciter", delaiMois: 3, choix: "rh-roles" } },
  { code: "COMM_CREATION", slug: "comm-creation-contenu", objectif: { quoi: "augmenter mon taux de conversion", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 3, choix: "com-conversion" } },
];

function pageEvaluee() {
  const out = { debordement: 0, horsEcran: [], motsInterdits: [], champsSansLibelle: 0, boutonsSansNom: 0, imagesSansAlt: 0, titres: 0, cartes: 0, cartesTraitees: 0 };
  const largeur = window.innerWidth;
  out.debordement = document.documentElement.scrollWidth - largeur;
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const st = getComputedStyle(el);
    if (st.position === "fixed" || st.visibility === "hidden" || st.display === "none") continue;
    if (r.right > largeur + 1 || r.left < -1) {
      if (el.closest("[data-vide-ok], .sr-only, [aria-hidden=true], template")) continue;
      // Un conteneur qui défile sur place (tableaux) n'est pas un débordement de page.
      let defile = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if ((o === "auto" || o === "scroll" || o === "hidden") && p.clientWidth <= largeur) { defile = true; break; }
      }
      if (!defile && out.horsEcran.length < 5) out.horsEcran.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} (${Math.round(r.left)}→${Math.round(r.right)} sur ${largeur})`);
    }
  }
  const texte = document.body.innerText;
  for (const mot of ["undefined", "NaN", "[object", "{", "}", "question à rédiger", "règle manquante", "lorem", "TODO"]) if (texte.includes(mot)) out.motsInterdits.push(mot);
  // Avant toute réponse, « Répondez d'abord… » est normal sous un tableau ; une fois rempli, il signale des lignes jamais alimentées.
  if (window.__rempli && texte.includes("Répondez d'abord")) out.motsInterdits.push("Répondez d'abord");
  for (const c of document.querySelectorAll("input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea")) {
    const nom = c.getAttribute("aria-label") || c.getAttribute("aria-labelledby") || (c.id && document.querySelector(`label[for="${c.id}"]`)) || c.closest("label") || c.getAttribute("placeholder");
    if (!nom) out.champsSansLibelle++;
  }
  for (const b of document.querySelectorAll("button, a[href]")) {
    if (!b.textContent.trim() && !b.getAttribute("aria-label") && !b.querySelector("img[alt]") && !b.getAttribute("title")) out.boutonsSansNom++;
  }
  for (const i of document.querySelectorAll("img")) if (i.getAttribute("alt") === null) out.imagesSansAlt++;
  out.titres = document.querySelectorAll("h1").length;
  out.cartes = document.querySelectorAll("li[data-question]").length;
  out.cartesTraitees = document.querySelectorAll('li[data-question][data-traitee="oui"]').length;
  return out;
}


const navigateur = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const constats = [];
const compteurs = { comptes: 0, pages: 0 };
const noter = (gravite, secteur, ou, detail) => {
  constats.push({ gravite, secteur, ou, detail });
  console.log(`[${gravite}] ${secteur} · ${ou} : ${detail}`);
};
async function post(chemin, donnees) {
  const r = await fetch(B + chemin, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(donnees) });
  return { ok: r.ok, status: r.status, texte: await r.text() };
}

async function visiter(page, secteur, ou, url, { attendu = null, rempli = false } = {}) {
  const t0 = Date.now();
  const erreursPage = [];
  const surErreur = (m) => m.type() === "error" && erreursPage.push(`console : ${m.text().slice(0, 160)}`);
  const surPageErreur = (err) => erreursPage.push(`script : ${String(err.message).slice(0, 160)}`);
  const surReponse = (r) => { if (r.status() >= 400 && !/_next\/image|favicon/.test(r.url())) erreursPage.push(`HTTP ${r.status()} ${r.url().replace(B, "")}`); };
  page.on("console", surErreur);
  page.on("pageerror", surPageErreur);
  page.on("response", surReponse);
  let reponse;
  try {
    reponse = await page.goto(B + url, { waitUntil: "networkidle", timeout: 60000 });
  } catch (err) {
    noter("erreur", secteur, ou, `la page ne se charge pas (${err.message.slice(0, 100)})`);
    page.off("console", surErreur); page.off("pageerror", surPageErreur); page.off("response", surReponse);
    return null;
  }
  compteurs.pages++;
  await page.evaluate((v) => { window.__rempli = v; }, rempli);
  await page.waitForTimeout(250);
  const r = await page.evaluate(pageEvaluee);
  page.off("console", surErreur); page.off("pageerror", surPageErreur); page.off("response", surReponse);
  const duree = Date.now() - t0;
  if (reponse && reponse.status() >= 400 && attendu !== reponse.status()) noter("erreur", secteur, ou, `statut ${reponse.status()}`);
  for (const x of [...new Set(erreursPage)]) noter("erreur", secteur, ou, x);
  if (r.debordement > 1) noter("erreur", secteur, ou, `la page déborde de ${r.debordement}px à droite`);
  for (const h of r.horsEcran) noter("erreur", secteur, ou, `élément hors écran : ${h}`);
  if (r.motsInterdits.length) noter("erreur", secteur, ou, `texte inattendu : ${r.motsInterdits.join(", ")}`);
  if (r.champsSansLibelle) noter("attention", secteur, ou, `${r.champsSansLibelle} champ(s) sans libellé accessible`);
  if (r.boutonsSansNom) noter("attention", secteur, ou, `${r.boutonsSansNom} bouton(s) ou lien(s) sans nom accessible`);
  if (r.imagesSansAlt) noter("attention", secteur, ou, `${r.imagesSansAlt} image(s) sans texte alternatif`);
  if (r.titres !== 1) noter("attention", secteur, ou, `${r.titres} titre(s) de niveau 1`);
  if (duree > 6000) noter("attention", secteur, ou, `page lente : ${duree} ms`);
  return r;
}


// --- Comptes de test par l'API (comme le contrôle par secteur) --------------------------------

let nCompte = 0;
async function nouveauCompte({ metier, sousVariantes = [], autre = false, categorieAbsente = null, effectif = 3, viewport = { width: 1280, height: 900 }, theme = null, sansMetier = false }) {
  const email = `complement${Date.now()}${nCompte++}@example.com`;
  const motDePasse = "motdepasse-controle-1234";
  const contexte = await navigateur.newContext({ viewport, reducedMotion: "reduce" });
  if (theme) await contexte.addInitScript((t) => { try { localStorage.setItem("caxe-theme", t); } catch {} }, theme);
  const page = await contexte.newPage();
  const insc = await post("/api/inscription", { email, motDePasse });
  if (!insc.ok) throw new Error("inscription " + insc.status);
  await page.goto(B + "/connexion", { waitUntil: "networkidle" });
  await page.fill("#email", email); await page.fill("#motDePasse", motDePasse); await page.click('button[type="submit"]');
  await page.waitForURL(/inscription\/metier|tableau-de-bord|formule/, { timeout: 30000 });
  compteurs.comptes++;
  const api = contexte.request;
  const compte = { contexte, page, api, email, effectif };
  if (sansMetier) return compte;
  const ro = router(e.routage, metier, sousVariantes, { autre, categorieAbsente: categorieAbsente ?? undefined });
  if (!ro.ok) throw new Error("routage " + ro.erreur.message);
  const rt = ro.routage;
  compte.rt = rt;
  const m = await api.put(B + "/api/compte/metier", { data: { metierPrecis: metier, sousVariantes, autre, ...(categorieAbsente ? { categorieAbsente, metierAbsentTexte: "Activité de test" } : {}), ...(rt.stock === "a_demander" ? { vendProduits: true } : {}) } });
  if (!m.ok()) throw new Error("métier " + m.status() + " " + (await m.text()));
  const agents = AGENTS.filter((a) => !rt.agentsExclus.includes(a.code));
  compte.agents = agents;
  const ab = await api.post(B + "/api/abonnement", { data: { nombreAgents: Math.max(2, agents.length), periode: "mensuel", agents: agents.map((a) => a.code) } });
  if (!ab.ok()) throw new Error("abonnement " + ab.status() + " " + (await ab.text()));
  await api.post(B + "/api/paiement/demonstration", { data: {} });
  const d = await api.put(B + "/api/compte/dossier", { data: { chiffreAffairesMensuel: 60000, nombreCollaborateurs: effectif, dateCreationEntreprise: "2019-03-01", typeZone: "PERIURBAINE", ville: "Lyon" } });
  if (!d.ok()) throw new Error("dossier " + d.status());
  for (const a of agents) {
    const o = await api.post(B + "/api/audit/objectif", { data: { agent: a.code, objectif: a.objectif } });
    if (!o.ok()) throw new Error("objectif " + a.code + " " + o.status() + " " + (await o.text()));
  }
  return compte;
}

async function remplirCompte(compte, niveau, agents = compte.agents) {
  await compte.api.put(B + "/api/audit/niveau", { data: { niveau: niveau === "approfondi" ? "APPROFONDI" : "ESSENTIEL" } });
  const { tailleDepuisEffectif } = await import("./../src/lib/audit/affichage.ts");
  const taille = tailleDepuisEffectif(compte.effectif);
  const reponsesCompte = {};
  for (const a of agents) {
    const entree = { agent: a.code, profils: compte.rt.profils, taille, niveau, ancienneteMois: 84, exclusions: compte.rt.reglementee ? e.routage.reglementees.acquisitionExclut ?? null : null, reponses: reponsesCompte };
    const { reponses } = remplir(e, entree, "oui");
    for (const [cle, reponse] of Object.entries(reponses)) {
      if (reponsesCompte[cle] !== undefined) continue;
      const r = await compte.api.put(B + "/api/audit/reponses", { data: { cle, reponse } });
      if (!r.ok()) noter("erreur", "réponses", a.code, `${cle} refusée (${r.status()}) : ${(await r.text()).slice(0, 120)}`);
    }
    Object.assign(reponsesCompte, reponses);
  }
}

// --- A. Inscription du métier par l'interface ------------------------------------------------

async function parcoursMetier(secteur, libelle, { viewport = { width: 1280, height: 900 }, activites = "premiere", absent = false } = {}) {
  const c = await nouveauCompte({ sansMetier: true, viewport });
  const p = c.page;
  await visiter(p, secteur, "métier : liste", "/inscription/metier");
  if (absent) {
    await p.locator("[data-metier-absent]").click();
  } else {
    await p.fill('input[role="combobox"]', libelle);
    const option = p.getByRole("option", { name: libelle, exact: true }).first();
    if ((await option.count()) === 0) { noter("erreur", secteur, "métier : liste", `« ${libelle} » introuvable dans la recherche`); await c.contexte.close(); return null; }
    await option.click();
    await p.click('form button[type="submit"]');
  }
  for (let etape = 0; etape < 5 && !/\/formule/.test(p.url()); etape++) {
    await p.waitForTimeout(500);
    const titre = (await p.locator("form h2").first().innerText().catch(() => "")) || "?";
    const r = await p.evaluate(pageEvaluee);
    if (r.debordement > 1) noter("erreur", secteur, `métier : ${titre}`, `déborde de ${r.debordement}px`);
    for (const h of r.horsEcran) noter("erreur", secteur, `métier : ${titre}`, `élément hors écran : ${h}`);
    if (r.motsInterdits.length) noter("erreur", secteur, `métier : ${titre}`, `texte inattendu : ${r.motsInterdits.join(", ")}`);
    const cases = p.locator('form input[type="checkbox"]');
    const radios = p.locator('form input[type="radio"]');
    const texteChamp = p.locator("#metierAbsentTexte");
    if (await texteChamp.count()) await texteChamp.fill("Activité de test");
    if ((await cases.count()) > 0) {
      const n = await cases.count();
      for (let i = 0; i < (activites === "toutes" ? n - 1 : 1); i++) await cases.nth(i).check({ force: true });
    } else if ((await radios.count()) > 0) {
      await radios.first().check({ force: true });
    }
    await p.click('form button[type="submit"]');
  }
  try { await p.waitForURL(/\/formule/, { timeout: 15000 }); } catch { noter("erreur", secteur, "métier", `le parcours ne mène pas à la formule (page : ${p.url().replace(B, "")})`); await c.contexte.close(); return null; }
  compteurs.comptes += 0;
  await visiter(p, secteur, "formule", p.url().replace(B, ""));
  return c;
}

const casMetier = [
  ["Électricien", "Électricien"],
  ["Hôtel (toutes activités)", "Hôtel", { activites: "toutes" }],
  ["Agence immobilière", "Agence immobilière"],
  ["Avocat (réglementé)", "Avocat"],
  ["Atelier de production (en préparation)", "Atelier de production"],
  ["Métier absent de la liste", null, { absent: true }],
  ["Hôtel, mobile", "Hôtel", { viewport: { width: 390, height: 800 }, activites: "toutes" }],
  ["Avocat, mobile", "Avocat", { viewport: { width: 390, height: 800 } }],
];
const stockQuestion = e.routage.metiers.find((m) => m.stock === "a_demander" && !(m.sousVariantes?.length));
if (stockQuestion) casMetier.push([`${stockQuestion.libelle} (question du stock)`, stockQuestion.libelle]);
for (const [secteur, libelle, options] of casMetier) {
  console.log(`\n== Inscription : ${secteur}`);
  const c = await parcoursMetier(secteur, libelle, options ?? {});
  if (c) {
    const texte = await c.page.locator("main").innerText();
    if (/Avocat|réglementé/.test(secteur) && !/Comm n.est pas proposé|3 agents|trois agents|n.est pas proposé/i.test(texte)) noter("attention", secteur, "formule", "la formule d'une profession réglementée n'explique pas l'absence de l'agent Comm");
    await c.contexte.close();
  }
}

// --- B. Écrans étroits, tablette, niveau approfondi ---------------------------------------------

for (const [secteur, params] of [
  ["Électricien", { metier: "electricien", effectif: 3 }],
  ["Hôtel (toutes activités)", { metier: "hotel", sousVariantes: ["hebergement-chambres", "restaurant-de-l-hotel"], effectif: 12 }],
  ["Avocat", { metier: "avocat", effectif: 1 }],
]) {
  console.log(`\n== Écrans : ${secteur}`);
  const c = await nouveauCompte(params);
  await remplirCompte(c, "approfondi");
  for (const [largeur, theme] of [[320, "sombre"], [320, "clair"], [768, "clair"], [1920, "sombre"]]) {
    const ctx = await navigateur.newContext({ viewport: { width: largeur, height: 800 }, reducedMotion: "reduce", storageState: await c.contexte.storageState() });
    await ctx.addInitScript((t) => { try { localStorage.setItem("caxe-theme", t); } catch {} }, theme);
    const p = await ctx.newPage();
    for (const a of c.agents) {
      await visiter(p, secteur, `${largeur}px ${theme} · ${a.code.slice(0, 3)} approfondi`, `/audit/${a.slug}`, { rempli: true });
      await visiter(p, secteur, `${largeur}px ${theme} · ${a.code.slice(0, 3)} résultats`, `/audit/${a.slug}?etape=4`, { rempli: true });
    }
    await visiter(p, secteur, `${largeur}px ${theme} · tableau de bord`, "/tableau-de-bord");
    await visiter(p, secteur, `${largeur}px ${theme} · compte`, "/compte");
    await ctx.close();
  }
  await c.contexte.close();
}

// --- C. Saisie réelle ----------------------------------------------------------------------------

console.log("\n== Saisie réelle");
{
  const c = await nouveauCompte({ metier: "electricien", effectif: 3 });
  await c.api.put(B + "/api/audit/niveau", { data: { niveau: "ESSENTIEL" } });
  const p = c.page;
  const slug = c.agents[0].slug;
  await p.goto(B + `/audit/${slug}`, { waitUntil: "networkidle" });
  // Première question numérique : on tape un chiffre, on quitte le champ, on recharge.
  const champ = p.locator('li[data-question] input[inputmode="decimal"], li[data-question] input[type="number"]').first();
  if ((await champ.count()) === 0) noter("attention", "Saisie", "nombre", "aucun champ numérique trouvé pour le test de saisie");
  else {
    const code = await champ.evaluate((el) => el.closest("li").getAttribute("data-question"));
    await champ.fill("42");
    await champ.blur();
    await p.waitForTimeout(1500);
    await p.reload({ waitUntil: "networkidle" });
    const apres = await p.locator(`li[data-question="${code}"] input`).first().inputValue();
    if (apres !== "42") noter("erreur", "Saisie", code, `la valeur saisie (42) n'est pas retrouvée après rechargement : « ${apres} »`);
    else console.log(`  ${code} : 42 retrouvé après rechargement`);
  }
  // « Je ne sais pas » sur une autre question.
  const inconnu = p.locator('li[data-question] button:has-text("Je ne sais pas")').first();
  if ((await inconnu.count()) > 0) {
    const code = await inconnu.evaluate((el) => el.closest("li").getAttribute("data-question"));
    await inconnu.click();
    await p.waitForTimeout(1200);
    await p.reload({ waitUntil: "networkidle" });
    const traitee = await p.locator(`li[data-question="${code}"]`).getAttribute("data-traitee");
    if (traitee !== "oui") noter("erreur", "Saisie", code, "« Je ne sais pas » n'est pas retrouvé après rechargement");
    else console.log(`  ${code} : « Je ne sais pas » retrouvé après rechargement`);
  } else noter("attention", "Saisie", "je ne sais pas", "aucun bouton « Je ne sais pas » trouvé");
  // Passage en approfondi depuis l'écran : le nombre de questions augmente.
  const avant = await p.locator("li[data-question]").count();
  const bouton = p.getByRole("button", { name: /Passer en approfondi/ });
  if ((await bouton.count()) > 0) {
    await bouton.click();
    await p.waitForTimeout(2000);
    await p.reload({ waitUntil: "networkidle" });
    const apres = await p.locator("li[data-question]").count();
    if (apres <= avant) noter("erreur", "Saisie", "niveau", `le passage en approfondi n'ajoute aucune question (${avant} → ${apres})`);
    else console.log(`  essentiel → approfondi : ${avant} → ${apres} questions`);
  } else noter("attention", "Saisie", "niveau", "bouton « Passer en approfondi » introuvable");
  await c.contexte.close();
}

// --- D. L'agent RH d'une catégorie sans questionnaire ------------------------------------------

console.log("\n== Fabrication : agent RH");
{
  const c = await nouveauCompte({ metier: "atelier-de-production", effectif: 6 });
  await c.api.put(B + "/api/audit/niveau", { data: { niveau: "ESSENTIEL" } });
  const rh = c.agents.find((a) => a.code === "RH_ORGANISATION");
  const acq = c.agents.find((a) => a.code === "ACQUISITION_CA");
  const r = await visiter(c.page, "Fabrication", "RH questionnaire", `/audit/${rh.slug}`);
  if (r && r.cartes === 0) noter("erreur", "Fabrication", "RH questionnaire", "l'agent RH n'affiche aucune question alors qu'il ne dépend pas du profil");
  else if (r) console.log(`  RH : ${r.cartes} questions`);
  await visiter(c.page, "Fabrication", "ACQ questionnaire", `/audit/${acq.slug}`);
  const texte = await c.page.locator("main").innerText();
  if (!/préparation/.test(texte)) noter("erreur", "Fabrication", "ACQ questionnaire", "la catégorie en préparation n'est pas annoncée");
  await visiter(c.page, "Fabrication", "ACQ résultats", `/audit/${acq.slug}?etape=4`);
  await c.contexte.close();
}

await navigateur.close();
const erreurs = constats.filter((x) => x.gravite === "erreur");
console.log(`\nComptes : ${compteurs.comptes} · pages vérifiées : ${compteurs.pages}`);
console.log(`Erreurs : ${erreurs.length} · points d'attention : ${constats.length - erreurs.length}`);
writeFileSync(join(sortie, "constats.json"), JSON.stringify({ compteurs, constats }, null, 2));
process.exitCode = erreurs.length ? 1 : 0;

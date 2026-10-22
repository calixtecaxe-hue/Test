// Instantané des pages de l'application (accueil, offres, agents, connexion, puis le parcours d'abonnement :
// compte, métier, formule, paiement, dossier d'entreprise, tableau de bord) en fichiers statiques : CSS, polices et
// images locales, onglets des agents, bascule des offres, choix de la formule et des agents, questions du dossier en
// petit JavaScript. Le parcours est capturé avec un vrai compte de test (créé dans la base locale, mode démonstration).
// Sert à publier un lien « à jour » du site (artefact) sans le déployer.
//
//   npm run build && AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration npx next start -p 3100 &
//   SORTIE=/chemin/site node scripts/capturer-site.mjs
//
// Puis publier SORTIE/index.html avec les autres fichiers du dossier.
const pw = (await import(process.env.PLAYWRIGHT_INDEX ?? "/opt/node22/lib/node_modules/playwright/index.js")).default;
const { chromium } = pw;
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";

const B = "http://localhost:3100";
const OUT = process.env.SORTIE ?? "site-miroir";
// APERCU=site (par défaut) : le site et le parcours d'abonnement. APERCU=application : l'espace abonné seul
// (mes agents, audit, compte), publié à part pour être travaillé puis rattaché au site.
const APERCU = process.env.APERCU ?? "site";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/assets`, { recursive: true });

const PAGES = [
  { url: "/", fichier: "accueil.html", titre: "CAXE — Un acte, un destin" },
  { url: "/offres", fichier: "offres.html", titre: "Nos offres — CAXE" },
  { url: "/agents/acquisition-chiffre-affaires", fichier: "agent-acquisition-chiffre-affaires.html", titre: "Acquisition & Chiffre d'affaires — CAXE" },
  { url: "/agents/finance-rentabilite", fichier: "agent-finance-rentabilite.html", titre: "Finance & Rentabilité — CAXE" },
  { url: "/agents/rh-organisation", fichier: "agent-rh-organisation.html", titre: "RH & Organisation — CAXE" },
  { url: "/agents/comm-creation-contenu", fichier: "agent-comm-creation-contenu.html", titre: "Comm & Création de contenu — CAXE" },
  { url: "/connexion", fichier: "connexion.html", titre: "Se connecter — CAXE" },
  { url: "/inscription", fichier: "inscription.html", titre: "Créer un compte — CAXE" },
];
const LIENS = {
  "/": "accueil.html",
  "/offres": "offres.html",
  "/connexion": "connexion.html",
  "/inscription": "inscription.html",
  "/inscription/metier": "metier.html",
  "/formule": "formule.html",
  "/paiement": "paiement.html",
  "/bienvenue": "bienvenue.html",
  "/tableau-de-bord": "tableau-de-bord.html",
  "/#agents-selecteur": "accueil.html#agents-selecteur",
  "/agents/acquisition-chiffre-affaires": "agent-acquisition-chiffre-affaires.html",
  "/agents/finance-rentabilite": "agent-finance-rentabilite.html",
  "/agents/rh-organisation": "agent-rh-organisation.html",
  "/agents/comm-creation-contenu": "agent-comm-creation-contenu.html",
};
if (APERCU === "application") {
  Object.assign(LIENS, {
    "/": "tableau-de-bord.html",
    "/compte": "compte.html",
    "/audit/acquisition-chiffre-affaires": "audit-objectif.html",
    "/audit/finance-rentabilite": "audit-objectif.html",
    "/audit/rh-organisation": "audit-objectif.html",
    "/audit/comm-creation-contenu": "audit-objectif.html",
  });
  PAGES.length = 0;
}


const css = new Map(); // href -> texte
// Nettoyage du DOM d'une page affichée : scripts, feuilles de style et préchargements retirés, images et vidéos figées,
// liens de l'application renvoyés vers les pages du miroir (les autres vers `repli`).
async function nettoyerDom(p, repli) {
  const lisCss = await p.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href));
  for (const href of lisCss) if (!css.has(href)) css.set(href, await (await fetch(href)).text());
  return p.evaluate(({ liens, repli }) => {
    document.querySelectorAll('script, noscript, link[rel="preload"], link[rel="modulepreload"], link[rel="prefetch"], link[rel="stylesheet"], link[rel="icon"], meta[name="next-size-adjust"], style[data-precedence]').forEach((e) => e.remove());
    document.querySelectorAll("img").forEach((i) => { const s = i.currentSrc || i.src; i.removeAttribute("srcset"); i.removeAttribute("sizes"); i.removeAttribute("loading"); i.setAttribute("src", s); });
    document.querySelectorAll("video").forEach((v) => {
      const s = v.currentSrc || v.src; if (s) v.setAttribute("src", s);
      v.setAttribute("autoplay", ""); v.setAttribute("muted", ""); v.setAttribute("loop", ""); v.setAttribute("playsinline", "");
      if (v.poster) v.setAttribute("poster", v.poster);
    });
    document.querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href");
      if (h.startsWith("#") || h.startsWith("http")) return;
      const chemin = h.split("?")[0];
      if (liens[h]) a.setAttribute("href", liens[h]);
      else if (liens[chemin]) a.setAttribute("href", liens[chemin]);
      else if (h.startsWith("/")) a.setAttribute("href", repli);
    });
    return { corps: document.body.innerHTML, classeCorps: document.body.className, classeHtml: document.documentElement.className, lang: document.documentElement.lang || "fr" };
  }, { liens: LIENS, repli });
}

// Défilement de la page pour déclencher les apparitions, puis retour en haut.
async function defiler(p) {
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 350) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(600);
}

const cache = new Map(); // url absolue -> chemin local
async function telecharger(urlAbs) {
  if (cache.has(urlAbs)) return cache.get(urlAbs);
  const r = await fetch(urlAbs);
  if (!r.ok) { console.log("  ! introuvable", urlAbs, r.status); cache.set(urlAbs, null); return null; }
  const type = r.headers.get("content-type") || "";
  const buf = Buffer.from(await r.arrayBuffer());
  const ext = (/(woff2)/.test(type) && "woff2") || (/webp/.test(type) && "webp") || (/png/.test(type) && "png") || (/jpe?g/.test(type) && "jpg") || (/svg/.test(type) && "svg") || (/mp4/.test(type) && "mp4") || (/icon/.test(type) && "ico") || (urlAbs.match(/\.(\w{2,5})(\?|$)/)?.[1] ?? "bin");
  const nom = `assets/${createHash("sha1").update(urlAbs).digest("hex").slice(0, 10)}.${ext}`;
  writeFileSync(`${OUT}/${nom}`, buf);
  cache.set(urlAbs, nom);
  return nom;
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });

for (const page of PAGES) {
  const p = await ctx.newPage();
  await p.goto(B + page.url, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 350) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(600);

  // Accueil : les quatre panneaux d'agents (onglets) ; offres : les deux périodes (bascule).
  if (page.url === "/") {
    const onglets = p.locator('[role="tab"]');
    const n = await onglets.count();
    const panneaux = [];
    for (let i = 0; i < n; i++) { await onglets.nth(i).click(); await p.waitForTimeout(450); panneaux.push(await p.locator(".selecteur-panneau").evaluate((e) => e.outerHTML)); }
    await onglets.nth(0).click(); await p.waitForTimeout(450);
    await p.evaluate((ph) => {
      const base = document.querySelector(".selecteur-panneau");
      ph.forEach((h, i) => {
        if (i === 0) { base.setAttribute("data-panneau", "0"); return; }
        const t = document.createElement("div"); t.innerHTML = h; const el = t.firstElementChild; el.setAttribute("data-panneau", String(i)); el.setAttribute("hidden", ""); base.parentElement.appendChild(el);
      });
      document.querySelectorAll('[role="tab"]').forEach((t, i) => t.setAttribute("data-onglet", String(i)));
    }, panneaux);
  }
  if (page.url === "/offres") {
    const racine = p.locator(".bascule-periode").locator("xpath=../..");
    const mensuel = await racine.evaluate((e) => e.outerHTML);
    await p.locator('[role="radio"]').nth(1).click(); await p.waitForTimeout(500);
    const annuel = await racine.evaluate((e) => e.outerHTML);
    await p.locator('[role="radio"]').nth(0).click(); await p.waitForTimeout(300);
    await p.evaluate(({ a }) => {
      const r = document.querySelector(".bascule-periode").parentElement.parentElement;
      r.setAttribute("data-vue", "mensuel");
      const t = document.createElement("div"); t.innerHTML = a; const el = t.firstElementChild; el.setAttribute("data-vue", "annuel"); el.setAttribute("hidden", ""); r.parentElement.insertBefore(el, r.nextSibling);
    }, { a: annuel });
    void mensuel;
  }

  const lisCss = await p.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href));
  for (const href of lisCss) if (!css.has(href)) css.set(href, await (await fetch(href)).text());

  const html = await nettoyerDom(p, "inscription.html");

  page.dom = html;
  console.log(page.fichier, "ok", html.corps.length);
  await p.close();
}

// --- Parcours d'abonnement : un vrai compte de test, capturé étape par étape -------------------------------------------
// Chaque écran est capturé tel qu'il s'affiche ; les états qui se succèdent sur place (choix de la formule et des
// agents, questions du dossier) sont gardés dans des <template> que le petit JavaScript du miroir rejoue.
const modele = (nom, html) => `<template data-etat="${nom}">${html}</template>`;
const PARCOURS = [];
const EMAILS_TEST = []; // adresses des comptes de test, remplacées par une adresse neutre dans le miroir
{
  const email = `miroir${Date.now()}@example.com`;
  const motDePasse = "motdepasse-miroir-1234";
  const post = async (chemin, donnees) => { const r = await fetch(B + chemin, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(donnees) }); if (!r.ok) throw new Error(chemin + " " + r.status + " " + (await r.text())); };
  EMAILS_TEST.push(email);
  await post("/api/inscription", { email, motDePasse });
  const cp = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  const p = await cp.newPage();
  await p.goto(B + "/connexion", { waitUntil: "networkidle" });
  await p.fill("#email", email); await p.fill("#motDePasse", motDePasse); await p.click('button[type="submit"]');
  await p.waitForURL(/inscription\/metier|tableau-de-bord/, { timeout: 20000 });
  const capturer = async (fichier, titre, extra = "") => {
    await p.waitForLoadState("networkidle"); await defiler(p);
    const dom = await nettoyerDom(p, "#");
    PARCOURS.push({ fichier, titre, dom, modeles: extra });
    console.log(fichier, "ok", dom.corps.length);
  };
  const api = cp.request;

  // 2. Métier : la liste, puis, pour chaque métier à activités, l'écran des activités ; la question du stock ; « mon métier n'est pas dans la liste »
  const routage = JSON.parse((await import("node:fs")).readFileSync("data/routage.json", "utf8"));
  const categories = Object.fromEntries(routage.categories.map((c) => [c.id, c]));
  const TABLE = {};
  for (const m of routage.metiers) {
    TABLE[m.libelle] = {
      id: m.id, regl: !!categories[m.categorie]?.reglementee, stock: m.stock,
      act: (m.sousVariantes ?? []).map((v) => ({ id: v.id, regl: !!categories[v.categorie]?.reglementee, stock: v.stock, defaut: !!v.defaut })),
    };
  }
  await p.goto(B + "/inscription/metier", { waitUntil: "networkidle" });
  const marquerMetier = () => p.evaluate(() => document.querySelector("form").parentElement.setAttribute("data-metier-racine", ""));
  await marquerMetier();
  const racineM = p.locator("[data-metier-racine]");
  const saisirMetier = async (libelle) => { await p.fill('input[role="combobox"]', libelle); await p.getByRole("option", { name: libelle, exact: true }).first().click(); };
  const retour = async () => { await p.locator('form button:has-text("Retour")').click(); await p.waitForTimeout(300); };
  let modelesMetier = "";
  for (const [libelle, m] of Object.entries(TABLE)) {
    if (m.act.length === 0) continue;
    await saisirMetier(libelle);
    await p.click('form button[type="submit"]'); await p.waitForTimeout(400);
    modelesMetier += modele(`activites-${m.id}`, await racineM.evaluate((e) => e.innerHTML));
    if (libelle === "Paysagiste") {
      await p.locator('input[value="__autre"]').check(); await p.waitForTimeout(200);
      modelesMetier += modele("autre-texte", await p.locator("#autreTexte").evaluate((e) => e.parentElement.outerHTML));
    }
    await retour();
  }
  const sansActivite = Object.entries(TABLE).find(([, m]) => m.act.length === 0 && m.stock === "a_demander");
  await saisirMetier(sansActivite[0]);
  await p.click('form button[type="submit"]'); await p.waitForTimeout(400);
  modelesMetier += modele("stock", await racineM.evaluate((e) => e.innerHTML));
  await retour();
  await p.locator("[data-metier-absent]").click(); await p.waitForTimeout(300);
  modelesMetier += modele("absent", await racineM.evaluate((e) => e.innerHTML));
  await p.reload({ waitUntil: "networkidle" });
  await marquerMetier();
  await capturer("metier.html", "Votre métier — CAXE", modelesMetier + `<script type="application/json" id="metiers-donnees">${JSON.stringify(TABLE)}</script>`);
  await api.put(B + "/api/compte/metier", { data: { metierPrecis: "electricien", sousVariantes: [], autre: false } });

  // 3. Formule : grille mensuelle et annuelle, puis le panneau des agents pour chacune des formules
  const marquerFormule = (page) => page.evaluate(() => { document.querySelector("div.grid.items-stretch").setAttribute("data-formule-grille", ""); document.querySelector("div.mt-12.scroll-mt-6").setAttribute("data-formule-panneau", ""); });
  const modelesFormule = async (page, prefixe) => {
    const grille = page.locator("div.grid.items-stretch");
    const panneau = page.locator("div.mt-12.scroll-mt-6");
    await marquerFormule(page);
    let out = modele(`${prefixe}grille-mensuel`, await grille.evaluate((e) => e.innerHTML)) + modele(`${prefixe}panneau-0`, await panneau.evaluate((e) => e.innerHTML));
    await page.locator('[role="radio"]').nth(1).click(); await page.waitForTimeout(400);
    out += modele(`${prefixe}grille-annuel`, await grille.evaluate((e) => e.innerHTML));
    await page.locator('[role="radio"]').nth(0).click(); await page.waitForTimeout(300);
    const nb = await page.locator(".carte-offre > button").count();
    for (let i = 0; i < nb; i++) {
      await page.locator(".carte-offre > button").nth(i).click(); await page.waitForTimeout(500);
      out += modele(`${prefixe}panneau-${i + 2}`, await panneau.evaluate((e) => e.innerHTML));
    }
    return out;
  };
  await p.goto(B + "/formule", { waitUntil: "networkidle" });
  let modeles = await modelesFormule(p, "");
  await p.reload({ waitUntil: "networkidle" });
  await marquerFormule(p);

  // Formule d'un métier réglementé (commissaire de justice) : deux formules seulement, pas d'agent Comm.
  {
    const email3 = `miroir3${Date.now()}@example.com`;
    EMAILS_TEST.push(email3);
    await post("/api/inscription", { email: email3, motDePasse });
    const cp3 = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
    const r = await cp3.newPage();
    await r.goto(B + "/connexion", { waitUntil: "networkidle" });
    await r.fill("#email", email3); await r.fill("#motDePasse", motDePasse); await r.click('button[type="submit"]');
    await r.waitForURL(/inscription\/metier|tableau-de-bord/, { timeout: 20000 });
    await cp3.request.put(B + "/api/compte/metier", { data: { metierPrecis: "commissaire-de-justice", sousVariantes: [], autre: false } });
    await r.goto(B + "/formule", { waitUntil: "networkidle" });
    modeles += await modelesFormule(r, "reg-");
    modeles += modele("reg-note", await r.locator('[role="note"]').evaluate((e) => e.outerHTML));
    const classeReg = await r.locator("div.grid.items-stretch").getAttribute("class");
    await p.evaluate((c) => document.querySelector("[data-formule-grille]").setAttribute("data-classe-reg", c), classeReg);
    await cp3.close();
  }
  await capturer("formule.html", "Choisir votre formule — CAXE", modeles);

  // 4. Paiement : les agents et le prix de chaque formule, mensuel et annuel
  const AGENTS_CODES = ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"];
  let modelesPaiement = "";
  for (const n of [2, 3, 4]) {
    for (const periode of ["mensuel", "annuel"]) {
      await api.post(B + "/api/abonnement", { data: { nombreAgents: n, periode, agents: AGENTS_CODES.slice(0, n) } });
      await p.goto(B + "/paiement", { waitUntil: "networkidle" });
      modelesPaiement += modele(`prix-${n}-${periode}`, await p.locator("[data-recap]").evaluate((e) => e.innerHTML));
      if (n === 4 && periode === "annuel") modelesPaiement += modele("agents", await p.locator('section[aria-labelledby="recap"] ul').evaluate((e) => [...e.children].map((li) => `<li data-nom="${li.querySelector("span.block")?.textContent.trim()}">${li.innerHTML}</li>`).join("")));
    }
  }
  // L'aperçu de l'application montre un compte qui a les quatre agents ; celui du site garde la formule à trois agents.
  const nFinal = APERCU === "application" ? 4 : 3;
  await api.post(B + "/api/abonnement", { data: { nombreAgents: nFinal, periode: "annuel", agents: AGENTS_CODES.slice(0, nFinal) } });
  await p.goto(B + "/paiement", { waitUntil: "networkidle" });
  await p.evaluate(() => {
    document.querySelector("[data-recap]").setAttribute("data-prix", "");
    document.querySelector('section[aria-labelledby="recap"] ul').setAttribute("data-agents", "");
  });
  await capturer("paiement.html", "Paiement — CAXE", modelesPaiement);

  // 5. Dossier d'entreprise : l'abonnement est activé (mode démonstration), cinq questions
  await api.post(B + "/api/paiement/demonstration");
  await p.goto(B + "/bienvenue", { waitUntil: "networkidle" });
  const racine = p.locator("form").locator("xpath=..");
  const etats = [];
  const remplir = [
    async () => { await p.fill("#chiffreAffairesMensuel", "42000"); },
    async () => { await p.fill("#nombreCollaborateurs", "4"); },
    async () => { await p.locator('input[name="dateCreationEntreprise"]').evaluate((e) => (e.value = "2019-03-01")); await p.fill("#dateCreationEntreprise", "03/2019").catch(() => {}); },
    async () => { await p.locator('input[type="radio"]').first().check(); },
    async () => { await p.fill("#ville", "Lyon"); },
  ];
  for (let i = 0; i < 5; i++) {
    await p.waitForTimeout(300);
    etats.push(await racine.evaluate((e) => e.innerHTML));
    await remplir[i]();
    await p.click('button[type="submit"]');
    if (i < 4) await p.waitForTimeout(500);
  }
  await p.waitForURL(/tableau-de-bord/, { timeout: 20000 });
  await p.goto(B + "/tableau-de-bord?bienvenue=1", { waitUntil: "networkidle" });
  await capturer("tableau-de-bord.html", "Mes agents — CAXE");

  // 6. Application : l'audit d'un agent (objectif, niveau, questionnaire) et le compte, avec le même compte de test.
  if (APERCU === "application") {
  const SLUG = "/audit/acquisition-chiffre-affaires";
  await p.goto(B + SLUG, { waitUntil: "networkidle" });
  await capturer("audit-objectif.html", "Votre audit — CAXE");
  const obj = await api.post(B + "/api/audit/objectif", { data: { agent: "ACQUISITION_CA", objectif: { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 15, unite: "pourcent" }, delaiMois: 6 } } });
  if (!obj.ok()) throw new Error("objectif " + obj.status() + " " + (await obj.text()));
  await p.goto(B + SLUG, { waitUntil: "networkidle" });
  await capturer("audit-niveau.html", "Votre audit — CAXE");
  const niv = await api.put(B + "/api/audit/niveau", { data: { niveau: "ESSENTIEL" } });
  if (!niv.ok()) throw new Error("niveau " + niv.status());
  await p.goto(B + SLUG, { waitUntil: "networkidle" });
  await capturer("audit-questionnaire.html", "Votre audit — CAXE");
  await p.goto(B + "/compte", { waitUntil: "networkidle" });
  await capturer("compte.html", "Mon compte — CAXE");
  }
  // Retour à l'écran de bienvenue avec un second compte, pour avoir sa page entière (en-tête, titre) dans son premier état.
  const email2 = `miroir2${Date.now()}@example.com`;
  EMAILS_TEST.push(email2);
  await post("/api/inscription", { email: email2, motDePasse });
  const cp2 = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  const q = await cp2.newPage();
  await q.goto(B + "/connexion", { waitUntil: "networkidle" });
  await q.fill("#email", email2); await q.fill("#motDePasse", motDePasse); await q.click('button[type="submit"]');
  await q.waitForURL(/inscription\/metier|tableau-de-bord/, { timeout: 20000 });
  await cp2.request.put(B + "/api/compte/metier", { data: { metierPrecis: "electricien", sousVariantes: [], autre: false } });
  await cp2.request.post(B + "/api/abonnement", { data: { nombreAgents: 3, periode: "annuel", agents: ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION"] } });
  await cp2.request.post(B + "/api/paiement/demonstration");
  await q.goto(B + "/bienvenue", { waitUntil: "networkidle" });
  await q.evaluate(() => document.querySelector("form").parentElement.setAttribute("data-dossier", ""));
  await q.waitForTimeout(400);
  const domBienvenue = await nettoyerDom(q, "#");
  PARCOURS.push({ fichier: "bienvenue.html", titre: "Bienvenue — CAXE", dom: domBienvenue, modeles: etats.slice(1).map((h, i) => modele(`dossier-${i + 1}`, h)).join("") });
  console.log("bienvenue.html ok", domBienvenue.corps.length);
  await cp2.close();
  await cp.close();
}

for (const f of PARCOURS) if (APERCU === "site" ? true : /^(tableau-de-bord|audit-|compte)/.test(f.fichier)) PAGES.push(f);
await b.close();

// CSS : concaténation + polices locales
let site = "";
for (const [href, texte] of css) {
  const base = new URL(href);
  let t = texte;
  const urls = [...t.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/^["']|["']$/g, ""));
  for (const u of new Set(urls)) {
    if (u.startsWith("data:")) continue;
    const abs = new URL(u, base).href;
    const loc = await telecharger(abs);
    if (loc) t = t.split(u).join(loc);
  }
  site += t + "\n";
}
site += `
/* Miroir : les animations d'apparition sont déjà jouées */
.apparition { opacity: 1 !important; transform: none !important; filter: none !important; }
`;
writeFileSync(`${OUT}/site.css`, site);

const SCRIPT_THEME_TETE = `try{if(localStorage.getItem("caxe-theme")==="clair")document.documentElement.dataset.theme="clair"}catch(e){}`;

const SCRIPT = `
(function(){
  // Mode jour / nuit : le bouton soleil / lune bascule le thème et le garde dans le navigateur.
  var boutons = document.querySelectorAll('.bascule-theme button');
  function marquer(){ var clair = document.documentElement.dataset.theme === 'clair'; boutons.forEach(function(b){ var jour = b.getAttribute('aria-label') === 'Mode jour'; b.setAttribute('aria-pressed', jour === clair ? 'true' : 'false'); }); }
  boutons.forEach(function(b){ b.addEventListener('click', function(){
    var jour = b.getAttribute('aria-label') === 'Mode jour';
    if (jour) document.documentElement.dataset.theme = 'clair'; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('caxe-theme', jour ? 'clair' : 'sombre'); } catch (e) {}
    marquer();
  }); });
  marquer();
  document.querySelectorAll('[data-onglet]').forEach(function(t){ t.addEventListener('click', function(){
    var i = t.getAttribute('data-onglet');
    document.querySelectorAll('[data-onglet]').forEach(function(o){ var a=o===t; o.classList.toggle('actif',a); o.setAttribute('aria-selected',a); });
    document.querySelectorAll('[data-panneau]').forEach(function(p){ if(p.getAttribute('data-panneau')===i) p.removeAttribute('hidden'); else p.setAttribute('hidden',''); });
  });});
  function bascule(){ document.querySelectorAll('[data-vue]').forEach(function(v){ v.querySelectorAll('[role=radio]').forEach(function(r,i){ r.addEventListener('click', function(){ var cible=i===0?'mensuel':'annuel'; document.querySelectorAll('[data-vue]').forEach(function(x){ if(x.getAttribute('data-vue')===cible) x.removeAttribute('hidden'); else x.setAttribute('hidden',''); }); }); }); }); }
  bascule();
  document.querySelectorAll('.menu-agents-wrap > button').forEach(function(b){ b.addEventListener('click', function(){ b.parentElement.classList.toggle('ouvert'); }); });

  // Vidéo du héros : lecture, son, position et plein écran, rejoués pour le miroir (l'application les gère avec React).
  var fig = document.querySelector('figure.hero-video');
  if (fig) {
    var v = fig.querySelector('video');
    var bts = fig.querySelectorAll('.hero-video-bouton');
    var bLecture = bts[0], bSon = bts[1], bPlein = bts[2];
    var range = fig.querySelector('.hero-video-position');
    var horloge = fig.querySelector('.hero-video-temps');
    var invite = fig.querySelector('.hero-video-son');
    var svg = function(contenu){ return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + contenu + '</svg>'; };
    var HP = svg('<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>');
    var LP = svg('<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor"/>');
    var MU = svg('<path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor"/><path d="m16 9 5 6M21 9l-5 6"/>');
    var SO = svg('<path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>');
    var temps = function(t){ t = Math.max(0, Math.floor(isFinite(t) ? t : 0)); return Math.floor(t/60) + ':' + ('0' + (t%60)).slice(-2); };
    var pause = false;

    // Le fichier est chargé en entier : le curseur de position marche partout, même si le serveur ne gère pas les plages d'octets.
    var source = v.getAttribute('src');
    if (window.fetch && /^https?:/.test(location.protocol)) {
      fetch(source).then(function(r){ return r.blob(); }).then(function(b){
        var t = v.currentTime, enPause = v.paused;
        v.src = URL.createObjectURL(b);
        v.addEventListener('loadedmetadata', function restaurer(){ v.removeEventListener('loadedmetadata', restaurer); v.currentTime = t; if (!enPause) v.play().catch(function(){}); });
      }).catch(function(){});
    }

    var majLecture = function(){ bLecture.innerHTML = v.paused ? LP : HP; bLecture.setAttribute('aria-label', v.paused ? 'Lancer la vidéo' : 'Mettre la vidéo en pause'); };
    var majSon = function(){
      bSon.innerHTML = v.muted ? MU : SO; bSon.setAttribute('aria-pressed', v.muted ? 'false' : 'true'); bSon.setAttribute('aria-label', v.muted ? 'Activer le son' : 'Couper le son');
      if (invite) invite.style.display = v.muted ? '' : 'none';
    };
    var majPosition = function(){
      var d = v.duration || 0;
      if (range && document.activeElement !== range) { range.max = d; range.value = v.currentTime; range.style.setProperty('--p', d ? (v.currentTime / d * 100) + '%' : '0%'); }
      if (horloge) horloge.textContent = temps(v.currentTime) + ' / ' + temps(d);
    };
    var basculerLecture = function(){ if (v.paused) { pause = false; v.play().catch(function(){}); } else { pause = true; v.pause(); } };
    var basculerSon = function(){ v.muted = !v.muted; if (!v.muted && v.paused && !pause) v.play().catch(function(){}); majSon(); };
    bLecture.addEventListener('click', basculerLecture);
    v.addEventListener('click', basculerLecture);
    bSon.addEventListener('click', basculerSon);
    if (invite) invite.addEventListener('click', basculerSon);
    if (range) range.addEventListener('input', function(){ v.currentTime = Number(range.value); majPosition(); });
    if (bPlein) bPlein.addEventListener('click', function(){ if (document.fullscreenElement) document.exitFullscreen(); else if (fig.requestFullscreen) fig.requestFullscreen(); });
    document.addEventListener('fullscreenchange', function(){ fig.classList.toggle('hero-video-plein', document.fullscreenElement === fig); });
    v.addEventListener('play', majLecture); v.addEventListener('pause', majLecture);
    v.addEventListener('timeupdate', majPosition); v.addEventListener('loadedmetadata', majPosition); v.addEventListener('durationchange', majPosition);
    majLecture(); majSon(); majPosition();
  }
})();`;

// Parcours d'abonnement : ce que React fait dans l'application, rejoué en quelques lignes pour le miroir.
const SCRIPT_PARCOURS = String.raw`
(function(){
  function modele(k){ var t=document.querySelector('template[data-etat="'+k+'"]'); return t ? t.innerHTML : ''; }
  function norm(t){ return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
  function stocke(k, v){ try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function lit(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  // Cases à cocher et boutons radio : la rangée choisie et sa coche suivent l'état de la case, comme dans l'application.
  var COCHE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  function synchroCases(){
    document.querySelectorAll('.case-option').forEach(function(l){
      var i=l.querySelector('input'); if(!i) return;
      l.classList.toggle('choisie', i.checked);
      var m=l.querySelector('.case-marque'); if(m) m.innerHTML = i.checked ? (i.type==='checkbox' ? COCHE : '<span class="case-point"></span>') : '';
    });
  }
  document.addEventListener('change', function(e){ if (e.target.classList && e.target.classList.contains('case-entree')) synchroCases(); });

  // Étape 1 : le compte, puis le métier.
  document.querySelectorAll('button[aria-pressed]').forEach(function(b){
    if (b.textContent.trim()!=='Afficher' && b.textContent.trim()!=='Masquer') return;
    b.addEventListener('click', function(){
      var champ=b.parentElement.querySelector('input'); var visible=champ.type==='password';
      champ.type=visible?'text':'password'; b.setAttribute('aria-pressed', visible); b.textContent=visible?'Masquer':'Afficher';
    });
  });
  var formCompte=document.querySelector('form input#motDePasse');
  if (formCompte) { formCompte.form.addEventListener('submit', function(e){ e.preventDefault(); location.href='metier.html'; }); }

  // Étape 2 : le métier, ses activités, la question du stock, « mon métier n'est pas dans la liste ».
  var racineM=document.querySelector('[data-metier-racine]');
  var jsonMetiers=document.getElementById('metiers-donnees');
  if (racineM && jsonMetiers) {
    var DONNEES=JSON.parse(jsonMetiers.textContent);
    var initial=racineM.innerHTML;
    var etat={ m:null, absent:false, coches:[], etape:'liste', hist:[], libelle:'' };
    var stockNecessaire=function(){
      if (etat.absent) return true;
      var m=etat.m; if(!m) return false;
      if (!m.act.length) return m.stock==='a_demander';
      var ids=etat.coches.length ? etat.coches : m.act.filter(function(a){return a.defaut;}).map(function(a){return a.id;});
      var parts=m.act.filter(function(a){ return ids.indexOf(a.id)>=0; });
      if (parts.some(function(a){return a.stock==='oui';})) return false;
      return parts.some(function(a){return a.stock==='a_demander';});
    };
    var total=function(){ return 1 + (etat.absent?1:0) + ((etat.m && etat.m.act.length)?1:0) + (stockNecessaire()?1:0); };
    var afficher=function(k){
      racineM.innerHTML = k==='liste' ? initial : modele(k==='activites' ? 'activites-'+etat.m.id : k);
      etat.etape=k;
      var n=total(), i=etat.hist.length+1;
      var t=racineM.querySelector('p[aria-live]'); if(t) t.textContent='Question '+i+' sur '+n;
      var barre=racineM.querySelector('.inscription-progres > div'); if(barre) barre.style.width=(i/n*100)+'%';
      var bouton=racineM.querySelector('form button[type=submit]'); if(bouton) bouton.textContent = i>=n ? 'Choisir ma formule' : 'Continuer';
      if (k==='liste' && etat.libelle) {
        var champ=racineM.querySelector('input[role=combobox]'); champ.value=etat.libelle;
        [].slice.call(racineM.querySelectorAll('li[role=option]')).forEach(function(o){ o.setAttribute('aria-selected', o.textContent.trim()===etat.libelle ? 'true':'false'); });
      }
      if (k==='activites') {
        etat.coches.forEach(function(v){ var c=racineM.querySelector('input[value="'+v+'"]'); if(c) c.checked=true; });
        synchroCases();
      }
    };
    var avancer=function(suite){ if(suite===null){ finir(); return; } etat.hist.push(etat.etape); afficher(suite); };
    var finir=function(){
      var reg=false;
      if (!etat.absent && etat.m) {
        if (!etat.m.act.length) reg=etat.m.regl;
        else { var ids=etat.coches.length ? etat.coches : etat.m.act.filter(function(a){return a.defaut;}).map(function(a){return a.id;}); reg=etat.m.act.some(function(a){ return ids.indexOf(a.id)>=0 && a.regl; }); }
      }
      stocke('caxe-reg', reg ? '1' : '0');
      location.href='formule.html';
    };
    racineM.addEventListener('input', function(e){
      var champ=e.target; if(!champ.matches('input[role=combobox]')) return;
      var q=norm(champ.value.trim());
      [].slice.call(racineM.querySelectorAll('li[role=option]')).forEach(function(o){ o.style.display = norm(o.textContent).indexOf(q)>=0 ? '' : 'none'; });
    });
    racineM.addEventListener('click', function(e){
      var o=e.target.closest('li[role=option]');
      if (o) {
        var champ=racineM.querySelector('input[role=combobox]'); champ.value=o.textContent.trim();
        [].slice.call(racineM.querySelectorAll('li[role=option]')).forEach(function(x){ x.setAttribute('aria-selected', x===o ? 'true':'false'); });
        // Le nombre de questions dépend du métier choisi : le bouton et la progression le disent tout de suite.
        var choisi=DONNEES[champ.value]; var plus = choisi && (choisi.act.length || choisi.stock==='a_demander') ? 1 : 0;
        var tt=racineM.querySelector('p[aria-live]'); if(tt) tt.textContent='Question 1 sur '+(1+plus);
        var bb=racineM.querySelector('.inscription-progres > div'); if(bb) bb.style.width=(100/(1+plus))+'%';
        var bt=racineM.querySelector('form button[type=submit]'); if(bt) bt.textContent = plus ? 'Continuer' : 'Choisir ma formule';
        return;
      }
      var b=e.target.closest('button'); if(!b) return;
      if (b.hasAttribute('data-metier-absent')) { etat.absent=true; etat.m=null; etat.libelle=''; etat.hist.push('liste'); afficher('absent'); return; }
      if (b.type==='button' && b.textContent.trim()==='Retour') {
        var prec=etat.hist.pop(); if(!prec) return;
        if (etat.etape==='absent') etat.absent=false;
        afficher(prec);
      }
    });
    racineM.addEventListener('change', function(e){
      if (e.target.value!=='__autre') return;
      var zone=racineM.querySelector('[data-autre-texte]');
      if (e.target.checked && !zone) racineM.querySelector('fieldset.cases-groupe').insertAdjacentHTML('afterend', modele('autre-texte'));
      if (!e.target.checked && zone) zone.remove();
    });
    racineM.addEventListener('submit', function(e){
      e.preventDefault();
      var k=etat.etape;
      if (k==='liste') {
        var libelle=racineM.querySelector('input[role=combobox]').value.trim(); var m=DONNEES[libelle]; if(!m) return;
        etat.m=m; etat.libelle=libelle; etat.absent=false; etat.coches=[];
        avancer(m.act.length ? 'activites' : (stockNecessaire() ? 'stock' : null));
      } else if (k==='activites') {
        var cochees=[].slice.call(racineM.querySelectorAll('input[name=sousVariantes]:checked')).map(function(c){return c.value;});
        if (!cochees.length) return;
        etat.coches=cochees.filter(function(v){return v!=='__autre';});
        avancer(stockNecessaire() ? 'stock' : null);
      } else if (k==='absent') { avancer('stock'); }
      else { avancer(null); }
    });
  }

  // Étape 3 : la formule (mensuelle ou annuelle) et les agents. Un métier réglementé n'a que deux formules.
  var grille=document.querySelector('[data-formule-grille]');
  var panneau=document.querySelector('[data-formule-panneau]');
  if (grille && panneau) {
    var reg = lit('caxe-reg')==='1';
    var pre = reg ? 'reg-' : '';
    var NOMBRES = reg ? [2,3] : [2,3,4];
    var periode = lit('caxe-periode')==='mensuel' ? 'mensuel' : (lit('caxe-periode')==='annuel' ? 'annuel' : 'mensuel');
    var n=0;
    if (reg) {
      var classeReg=grille.getAttribute('data-classe-reg'); if (classeReg) grille.className=classeReg;
      grille.insertAdjacentHTML('beforebegin', modele('reg-note'));
    }
    var rendre=function(){
      grille.innerHTML=modele(pre+'grille-'+periode);
      if (n) {
        var carte=grille.querySelectorAll('.carte-offre')[NOMBRES.indexOf(n)];
        carte.classList.add('ring-2','ring-[var(--blue-1)]');
        var bouton=carte.querySelector(':scope > button'); bouton.setAttribute('aria-pressed','true'); bouton.textContent='Formule choisie';
      }
    };
    var lierPanneau=function(){
      var tuiles=[].slice.call(panneau.querySelectorAll('[role=checkbox]'));
      var bouton=[].slice.call(panneau.querySelectorAll('button')).filter(function(b){ return b.textContent.indexOf('Continuer vers le paiement')>=0; })[0];
      var message=panneau.querySelector('[aria-live]');
      var enregistrer=function(){
        var noms=tuiles.filter(function(t){ return t.classList.contains('choisi') || t.getAttribute('aria-checked')==='true'; }).map(function(t){ return t.querySelector('.choix-nom').textContent.trim(); });
        stocke('caxe-agents', JSON.stringify(noms)); stocke('caxe-n', String(n)); stocke('caxe-periode', periode);
      };
      if (bouton) bouton.addEventListener('click', function(){ if(!bouton.disabled){ enregistrer(); location.href='paiement.html'; } });
      if (!n || tuiles.every(function(t){ return t.getAttribute('aria-disabled')==='true' && t.classList.contains('choisi'); })) return;
      var maj=function(){
        var choisis=tuiles.filter(function(t){ return t.classList.contains('choisi'); }).length;
        tuiles.forEach(function(t){ var bloque=!t.classList.contains('choisi') && choisis>=n; t.classList.toggle('grise', bloque); t.setAttribute('aria-disabled', bloque ? 'true':'false'); });
        if (message) message.textContent=choisis+' sur '+n+' agents choisis'+(choisis===n?'. Retirez-en un pour en changer.':'.');
        if (bouton) bouton.disabled = choisis!==n;
      };
      tuiles.forEach(function(t){ t.addEventListener('click', function(){
        var choisis=tuiles.filter(function(x){ return x.classList.contains('choisi'); }).length;
        var actif=t.classList.contains('choisi');
        if (!actif && choisis>=n) return;
        t.classList.toggle('choisi', !actif); t.setAttribute('aria-checked', !actif ? 'true':'false'); maj();
      }); });
      maj();
    };
    grille.addEventListener('click', function(e){
      var b=e.target.closest('.carte-offre > button'); if(!b || b.disabled) return;
      var cartes=[].slice.call(grille.querySelectorAll('.carte-offre'));
      n=NOMBRES[cartes.indexOf(b.parentElement)];
      rendre(); panneau.innerHTML=modele(pre+'panneau-'+n); lierPanneau();
      panneau.scrollIntoView({behavior:'smooth', block:'nearest'});
    });
    var radios=document.querySelectorAll('.bascule-periode [role=radio]');
    var marquerPeriode=function(){ radios.forEach(function(x,j){ x.setAttribute('aria-checked', (j===0)===(periode==='mensuel') ? 'true':'false'); }); };
    radios.forEach(function(r,i){ r.addEventListener('click', function(){ periode=i===0?'mensuel':'annuel'; stocke('caxe-periode', periode); marquerPeriode(); rendre(); }); });
    marquerPeriode(); rendre();
  }

  // Étape 4 : mensuel ou annuel jusqu'au dernier moment ; les conditions générales de vente se cochent avant de payer.
  var prix=document.querySelector('[data-prix]');
  if (prix) {
    var nPaiement = lit('caxe-n') || '3';
    var periodePaiement = lit('caxe-periode')==='mensuel' ? 'mensuel' : 'annuel';
    var radiosPaiement=document.querySelectorAll('section[aria-labelledby=total] [role=radio]');
    var appliquer=function(){
      radiosPaiement.forEach(function(x,j){ x.setAttribute('aria-checked', (j===0)===(periodePaiement==='mensuel') ? 'true':'false'); });
      prix.innerHTML=modele('prix-'+nPaiement+'-'+periodePaiement);
    };
    radiosPaiement.forEach(function(r,i){ r.addEventListener('click', function(){ periodePaiement=i===0?'mensuel':'annuel'; stocke('caxe-periode', periodePaiement); appliquer(); }); });
    var liste=document.querySelector('[data-agents]');
    var noms=null; try { noms=JSON.parse(lit('caxe-agents')); } catch (e) {}
    if (liste && noms && noms.length) {
      var t=document.createElement('ul'); t.innerHTML=modele('agents');
      liste.innerHTML=''; [].slice.call(t.children).forEach(function(li){ if (noms.indexOf(li.getAttribute('data-nom'))>=0) liste.appendChild(li); });
    }
    appliquer();
  }
  var cgv=document.querySelector('main input[type=checkbox]');
  var payer=cgv && document.querySelector('main button.bouton-eclat');
  if (cgv && payer) {
    cgv.addEventListener('change', function(){ payer.disabled=!cgv.checked; });
    payer.addEventListener('click', function(){ if(!payer.disabled) location.href='bienvenue.html'; });
  }

  // Étape 5 : les cinq questions du dossier d'entreprise, une à une.
  var dossier=document.querySelector('[data-dossier]');
  if (dossier) {
    var etatD=0;
    var initialD=dossier.innerHTML;
    dossier.addEventListener('submit', function(e){
      e.preventDefault(); etatD+=1;
      if (etatD>4) { location.href='tableau-de-bord.html'; return; }
      dossier.innerHTML=modele('dossier-'+etatD);
    });
    dossier.addEventListener('click', function(e){
      var b=e.target.closest('button'); if(!b || b.type!=='button' || b.textContent.trim()!=='Retour' || etatD===0) return;
      etatD-=1; dossier.innerHTML = etatD===0 ? initialD : modele('dossier-'+etatD);
    });
  }

  // Application : l'audit d'un agent. Objectif, puis niveau, puis questionnaire ; les réponses se remplissent sur place.
  var formObjectif=document.querySelector('section[aria-labelledby=objectif] form');
  if (formObjectif) {
    formObjectif.addEventListener('submit', function(e){
      e.preventDefault();
      var vide=[].slice.call(formObjectif.querySelectorAll('input[type=text], input:not([type])')).filter(function(i){ return !i.value.trim(); })[0];
      if (vide) { vide.focus(); return; }
      location.href='audit-niveau.html';
    });
  }
  document.querySelectorAll('section[aria-labelledby=niveau] button').forEach(function(b){ b.addEventListener('click', function(){ location.href='audit-questionnaire.html'; }); });
  var ESTIM='<div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2"><div class="champ-groupe"><label class="champ-etiquette">Entre</label><input type="text" inputmode="decimal" class="champ-saisie"></div><div class="champ-groupe"><label class="champ-etiquette">Et</label><input type="text" inputmode="decimal" class="champ-saisie"></div><p class="champ-aide sm:col-span-2">Nous retenons le milieu de la fourchette, signalé comme estimé.</p></div>';
  document.querySelectorAll('li[data-question]').forEach(function(li){
    var corps=function(){ return [].slice.call(li.children).filter(function(c){ return c.tagName==='DIV' && c.getAttribute('aria-label')!=='Autres réponses' && !c.classList.contains('flex'); }); };
    var autres=li.querySelector('[aria-label="Autres réponses"]');
    var facon=li.querySelector('[aria-label="Façon de répondre"]');
    var note=document.createElement('p'); note.className='mt-3 text-sm text-[var(--text-muted)]'; note.style.display='none'; if (autres) autres.insertAdjacentElement('afterend', note);
    var exact=facon ? facon.nextElementSibling : null; var exactHtml=exact ? exact.outerHTML : '';
    if (facon) {
      var bs=facon.querySelectorAll('button');
      bs.forEach(function(b,i){ b.addEventListener('click', function(){
        bs.forEach(function(x,j){ x.classList.toggle('actif', i===j); x.setAttribute('aria-pressed', i===j ? 'true':'false'); });
        var cur=facon.nextElementSibling; var t=document.createElement('div'); t.innerHTML=i===0 ? exactHtml : ESTIM; cur.replaceWith(t.firstElementChild);
      }); });
    }
    if (autres) {
      var bAutres=autres.querySelectorAll('button');
      bAutres.forEach(function(b,i){ b.addEventListener('click', function(){
        var actif=b.classList.contains('actif');
        bAutres.forEach(function(x){ x.classList.remove('actif'); x.setAttribute('aria-pressed','false'); });
        if (!actif) { b.classList.add('actif'); b.setAttribute('aria-pressed','true'); }
        corps().forEach(function(c){ c.style.display = actif ? '' : 'none'; });
        note.style.display = actif ? 'none' : '';
        note.textContent = i===0 ? 'Pas de souci : vous pourrez compléter cette donnée plus tard, elle n’entre pas dans le calcul pour l’instant.' : 'Noté : cette donnée n’est pas suivie dans votre entreprise. Le rapport vous dira comment commencer à la suivre.';
      }); });
    }
  });
})();`;


for (const page of PAGES) {
  let corps = page.dom.corps + (page.modeles ?? "");
  for (const e of EMAILS_TEST) corps = corps.split(e).join("dirigeant@entreprise.fr");
  const refs = [...corps.matchAll(/(?:src|poster|href)="((?:https?:\/\/localhost:3100)?\/(?:_next\/image|_next\/static\/media|agents\/|videos\/)[^"]*)"/g)].map((m) => m[1]);
  for (const r of new Set(refs)) {
    const abs = r.startsWith("http") ? r : B + r.replace(/&amp;/g, "&");
    const loc = await telecharger(abs.replace(/&amp;/g, "&"));
    if (loc) corps = corps.split(r).join(loc);
  }
  const entete = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.titre}</title><link rel="stylesheet" href="site.css"><script>${SCRIPT_THEME_TETE}</script>`;
  const doc = `<!doctype html><html lang="${page.dom.lang}" class="${page.dom.classeHtml}"><head>${entete}</head><body class="${page.dom.classeCorps}">${corps}<script>${SCRIPT}</script><script>${SCRIPT_PARCOURS}</script></body></html>`;
  writeFileSync(`${OUT}/${page.fichier}`, doc);
  if (page.fichier === (APERCU === "site" ? "accueil.html" : "tableau-de-bord.html")) {
    // Page principale : fragment (le service d'artefacts fournit l'enveloppe) ; les classes du html passent sur un conteneur.
    const frag = `<title>${page.titre}</title><link rel="stylesheet" href="site.css"><script>${SCRIPT_THEME_TETE}</script><div class="${page.dom.classeHtml}"><div class="${page.dom.classeCorps}">${corps}</div></div><script>${SCRIPT}</script>`;
    writeFileSync(`${OUT}/index.html`, frag);
  }
}
console.log("fichiers locaux :", cache.size);

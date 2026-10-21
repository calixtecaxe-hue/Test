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

  // 2. Métier
  await p.goto(B + "/inscription/metier", { waitUntil: "networkidle" });
  await capturer("metier.html", "Votre métier — CAXE");
  await api.put(B + "/api/compte/metier", { data: { metierPrecis: "electricien", sousVariantes: [], autre: false } });

  // 3. Formule : grille mensuelle et annuelle, puis le panneau des agents pour chacune des trois formules
  await p.goto(B + "/formule", { waitUntil: "networkidle" });
  const grille = p.locator("div.grid.items-stretch");
  const panneau = p.locator("div.mt-12.scroll-mt-6");
  await p.evaluate(() => { document.querySelector("div.grid.items-stretch").setAttribute("data-formule-grille", ""); document.querySelector("div.mt-12.scroll-mt-6").setAttribute("data-formule-panneau", ""); });
  const grilleMensuelle = await grille.evaluate((e) => e.innerHTML);
  const panneauVide = await panneau.evaluate((e) => e.innerHTML);
  await p.locator('[role="radio"]').nth(1).click(); await p.waitForTimeout(400);
  const grilleAnnuelle = await grille.evaluate((e) => e.innerHTML);
  await p.locator('[role="radio"]').nth(0).click(); await p.waitForTimeout(300);
  let modeles = modele("grille-mensuel", grilleMensuelle) + modele("grille-annuel", grilleAnnuelle) + modele("panneau-0", panneauVide);
  for (const [i, n] of [[0, 2], [1, 3], [2, 4]]) {
    await p.locator(".carte-offre > button").nth(i).click(); await p.waitForTimeout(500);
    modeles += modele(`panneau-${n}`, await panneau.evaluate((e) => e.innerHTML));
  }
  await p.reload({ waitUntil: "networkidle" });
  await p.evaluate(() => { document.querySelector("div.grid.items-stretch").setAttribute("data-formule-grille", ""); document.querySelector("div.mt-12.scroll-mt-6").setAttribute("data-formule-panneau", ""); });
  await capturer("formule.html", "Choisir votre formule — CAXE", modeles);

  // 4. Paiement : trois agents, facturation annuelle
  await api.post(B + "/api/abonnement", { data: { nombreAgents: 3, periode: "annuel", agents: ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION"] } });
  await p.goto(B + "/paiement", { waitUntil: "networkidle" });
  await capturer("paiement.html", "Paiement — CAXE");

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

for (const f of PARCOURS) PAGES.push(f);
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

const SCRIPT = `
(function(){
  document.querySelectorAll('[data-onglet]').forEach(function(t){ t.addEventListener('click', function(){
    var i = t.getAttribute('data-onglet');
    document.querySelectorAll('[data-onglet]').forEach(function(o){ var a=o===t; o.classList.toggle('actif',a); o.setAttribute('aria-selected',a); });
    document.querySelectorAll('[data-panneau]').forEach(function(p){ if(p.getAttribute('data-panneau')===i) p.removeAttribute('hidden'); else p.setAttribute('hidden',''); });
  });});
  function bascule(){ document.querySelectorAll('[data-vue]').forEach(function(v){ v.querySelectorAll('[role=radio]').forEach(function(r,i){ r.addEventListener('click', function(){ var cible=i===0?'mensuel':'annuel'; document.querySelectorAll('[data-vue]').forEach(function(x){ if(x.getAttribute('data-vue')===cible) x.removeAttribute('hidden'); else x.setAttribute('hidden',''); }); }); }); }); }
  bascule();
  document.querySelectorAll('.menu-agents-wrap > button').forEach(function(b){ b.addEventListener('click', function(){ b.parentElement.classList.toggle('ouvert'); }); });
})();`;

// Parcours d'abonnement : ce que React fait dans l'application, rejoué en quelques lignes pour le miroir.
const SCRIPT_PARCOURS = String.raw`
(function(){
  function modele(k){ var t=document.querySelector('template[data-etat="'+k+'"]'); return t ? t.innerHTML : ''; }
  function norm(t){ return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }

  // Étape 1 : le compte, puis le métier.
  var motsDePasse = document.querySelectorAll('input[type=password]');
  document.querySelectorAll('button[aria-pressed]').forEach(function(b){
    if (b.textContent.trim()!=='Afficher' && b.textContent.trim()!=='Masquer') return;
    b.addEventListener('click', function(){
      var champ=b.parentElement.querySelector('input'); var visible=champ.type==='password';
      champ.type=visible?'text':'password'; b.setAttribute('aria-pressed', visible); b.textContent=visible?'Masquer':'Afficher';
    });
  });
  void motsDePasse;
  var formCompte=document.querySelector('form input#motDePasse'); 
  if (formCompte) { formCompte.form.addEventListener('submit', function(e){ e.preventDefault(); location.href='metier.html'; }); }

  // Étape 2 : la liste des métiers se réduit en tapant ; un clic choisit.
  var champMetier=document.querySelector('input[role=combobox]');
  if (champMetier) {
    var options=[].slice.call(document.querySelectorAll('ul[role=listbox] li[role=option]'));
    var libelles=options.map(function(o){ return o.textContent.trim(); });
    champMetier.addEventListener('input', function(){
      var q=norm(champMetier.value.trim());
      options.forEach(function(o,i){ o.style.display = norm(libelles[i]).indexOf(q)>=0 ? '' : 'none'; });
    });
    options.forEach(function(o,i){ o.addEventListener('click', function(){
      champMetier.value=libelles[i]; options.forEach(function(x){ x.setAttribute('aria-selected', x===o ? 'true':'false'); });
    }); });
    champMetier.form.addEventListener('submit', function(e){ e.preventDefault(); location.href='formule.html'; });
  }

  // Étape 3 : la formule (mensuelle ou annuelle) et les agents.
  var grille=document.querySelector('[data-formule-grille]');
  var panneau=document.querySelector('[data-formule-panneau]');
  if (grille && panneau) {
    var periode='mensuel', n=0;
    var NOMBRES=[2,3,4];
    var rendre=function(){
      grille.innerHTML=modele('grille-'+periode);
      if (n) {
        var cartes=grille.querySelectorAll('.carte-offre');
        var carte=cartes[NOMBRES.indexOf(n)];
        carte.classList.add('ring-2','ring-[var(--blue-1)]');
        var bouton=carte.querySelector(':scope > button'); bouton.setAttribute('aria-pressed','true'); bouton.textContent='Formule choisie';
      }
    };
    var lierPanneau=function(){
      var tuiles=[].slice.call(panneau.querySelectorAll('[role=checkbox]'));
      var bouton=[].slice.call(panneau.querySelectorAll('button')).filter(function(b){ return b.textContent.indexOf('Continuer vers le paiement')>=0; })[0];
      var message=panneau.querySelector('[aria-live]');
      if (bouton) bouton.addEventListener('click', function(){ if(!bouton.disabled) location.href='paiement.html'; });
      if (!n || n===4) return;
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
      rendre(); panneau.innerHTML=modele('panneau-'+n); lierPanneau();
      panneau.scrollIntoView({behavior:'smooth', block:'nearest'});
    });
    document.querySelectorAll('.bascule-periode [role=radio]').forEach(function(r,i){ r.addEventListener('click', function(){
      periode=i===0?'mensuel':'annuel';
      document.querySelectorAll('.bascule-periode [role=radio]').forEach(function(x,j){ x.setAttribute('aria-checked', j===i ? 'true':'false'); });
      rendre();
    }); });
  }

  // Étape 4 : les conditions générales de vente se cochent avant de payer.
  var cgv=document.querySelector('main input[type=checkbox]');
  var payer=cgv && document.querySelector('main button.bouton-eclat');
  if (cgv && payer) {
    cgv.addEventListener('change', function(){ payer.disabled=!cgv.checked; });
    payer.addEventListener('click', function(){ if(!payer.disabled) location.href='bienvenue.html'; });
  }

  // Étape 5 : les cinq questions du dossier d'entreprise, une à une.
  var dossier=document.querySelector('[data-dossier]');
  if (dossier) {
    var etat=0;
    dossier.addEventListener('submit', function(e){
      e.preventDefault(); etat+=1;
      if (etat>4) { location.href='tableau-de-bord.html'; return; }
      dossier.innerHTML=modele('dossier-'+etat);
    });
    dossier.addEventListener('click', function(e){
      var b=e.target.closest('button'); if(!b || b.type!=='button' || b.textContent.trim()!=='Retour' || etat===0) return;
      etat-=1; dossier.innerHTML = etat===0 ? initial : modele('dossier-'+etat);
    });
    var initial=dossier.innerHTML;
  }
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
  const entete = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.titre}</title><link rel="stylesheet" href="site.css">`;
  const doc = `<!doctype html><html lang="${page.dom.lang}" class="${page.dom.classeHtml}"><head>${entete}</head><body class="${page.dom.classeCorps}">${corps}<script>${SCRIPT}</script><script>${SCRIPT_PARCOURS}</script></body></html>`;
  writeFileSync(`${OUT}/${page.fichier}`, doc);
  if (page.fichier === "accueil.html") {
    // Page principale : fragment (le service d'artefacts fournit l'enveloppe) ; les classes du html passent sur un conteneur.
    const frag = `<title>${page.titre}</title><link rel="stylesheet" href="site.css"><div class="${page.dom.classeHtml}"><div class="${page.dom.classeCorps}">${corps}</div></div><script>${SCRIPT}</script>`;
    writeFileSync(`${OUT}/index.html`, frag);
  }
}
console.log("fichiers locaux :", cache.size);

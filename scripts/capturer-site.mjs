// Instantané des pages publiques de l'application (accueil, offres, agents, connexion, inscription) en fichiers
// statiques : CSS, polices et images locales, onglets des agents et bascule des offres en petit JavaScript.
// Sert à publier un lien « à jour » du site (artefact) sans le déployer.
//
//   npm run build && AUTH_TRUST_HOST=true npx next start -p 3100 &
//   SORTIE=/chemin/site node scripts/capturer-site.mjs
//
// Puis publier SORTIE/index.html avec les autres fichiers du dossier.
import pw from process.env.PLAYWRIGHT_INDEX ?? "/opt/node22/lib/node_modules/playwright/index.js";
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
  "/#agents-selecteur": "accueil.html#agents-selecteur",
  "/agents/acquisition-chiffre-affaires": "agent-acquisition-chiffre-affaires.html",
  "/agents/finance-rentabilite": "agent-finance-rentabilite.html",
  "/agents/rh-organisation": "agent-rh-organisation.html",
  "/agents/comm-creation-contenu": "agent-comm-creation-contenu.html",
};

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

const css = new Map(); // href -> texte
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

  // Nettoyage du DOM
  const html = await p.evaluate(({ liens }) => {
    document.querySelectorAll('script, noscript, link[rel="preload"], link[rel="modulepreload"], link[rel="prefetch"], link[rel="stylesheet"], link[rel="icon"], meta[name="next-size-adjust"], style[data-precedence]').forEach((e) => e.remove());
    document.querySelectorAll("img").forEach((i) => { const s = i.currentSrc || i.src; i.removeAttribute("srcset"); i.removeAttribute("sizes"); i.removeAttribute("loading"); i.setAttribute("src", s); });
    document.querySelectorAll("video").forEach((v) => {
      const s = v.currentSrc || v.src; if (s) v.setAttribute("src", s);
      v.setAttribute("autoplay", ""); v.setAttribute("muted", ""); v.setAttribute("loop", ""); v.setAttribute("playsinline", "");
      if (v.poster) v.setAttribute("poster", v.poster);
    });
    document.querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href");
      if (liens[h]) a.setAttribute("href", liens[h]);
      else if (h.startsWith("/")) a.setAttribute("href", "inscription.html");
    });
    return { corps: document.body.innerHTML, classeCorps: document.body.className, classeHtml: document.documentElement.className, lang: document.documentElement.lang || "fr" };
  }, { liens: LIENS });

  page.dom = html;
  console.log(page.fichier, "ok", html.corps.length);
  await p.close();
}
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

for (const page of PAGES) {
  let corps = page.dom.corps;
  const refs = [...corps.matchAll(/(?:src|poster|href)="((?:https?:\/\/localhost:3100)?\/(?:_next\/image|_next\/static\/media|agents\/|videos\/)[^"]*)"/g)].map((m) => m[1]);
  for (const r of new Set(refs)) {
    const abs = r.startsWith("http") ? r : B + r.replace(/&amp;/g, "&");
    const loc = await telecharger(abs.replace(/&amp;/g, "&"));
    if (loc) corps = corps.split(r).join(loc);
  }
  const entete = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.titre}</title><link rel="stylesheet" href="site.css">`;
  const doc = `<!doctype html><html lang="${page.dom.lang}" class="${page.dom.classeHtml}"><head>${entete}</head><body class="${page.dom.classeCorps}">${corps}<script>${SCRIPT}</script></body></html>`;
  writeFileSync(`${OUT}/${page.fichier}`, doc);
  if (page.fichier === "accueil.html") {
    // Page principale : fragment (le service d'artefacts fournit l'enveloppe) ; les classes du html passent sur un conteneur.
    const frag = `<title>${page.titre}</title><link rel="stylesheet" href="site.css"><div class="${page.dom.classeHtml}"><div class="${page.dom.classeCorps}">${corps}</div></div><script>${SCRIPT}</script>`;
    writeFileSync(`${OUT}/index.html`, frag);
  }
}
console.log("fichiers locaux :", cache.size);

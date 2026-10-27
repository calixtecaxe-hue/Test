// Contrôle dans un vrai navigateur du parcours de chaque secteur d'activité : un compte de test par catégorie de métier et par
// cas particulier (activités multiples, profession réglementée, catégorie en préparation, métier absent de la liste), chaque agent
// ouvert, ordinateur et mobile, thème sombre et clair. Il vérifie l'affichage (débordements, mots techniques, accolades, libellés
// manquants), les erreurs du navigateur et du serveur, que l'écran montre bien les questions que le moteur prévoit, et que le
// serveur accepte les réponses que le moteur juge valides.
//
//   (serveur lancé : AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration npx next start -p 3100)
//   node scripts/controle-parcours-secteurs.mjs [--filtre texte] [--sortie dossier]
//
// Les comptes de test portent une adresse @example.com ; rien n'est envoyé hors du serveur local.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const { chargerDepuisDisque } = await import("./../src/lib/donnees/disque.ts");
const { router, METIER_ABSENT, metierDuCompte } = await import("./../src/lib/routage.ts");
const { vocabulaireDuCompte } = await import("./../src/lib/vocabulaire.ts");
const { tailleDepuisEffectif } = await import("./../src/lib/audit/affichage.ts");
const { remplir } = await import("./demonstration.mts");
const { assemblerQuestionnaire } = await import("./../src/lib/audit/assemblage.ts");

const B = process.env.BASE ?? "http://127.0.0.1:3100";
const args = process.argv.slice(2);
const filtre = args.includes("--filtre") ? args[args.indexOf("--filtre") + 1] : null;
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "controle-parcours";
mkdirSync(sortie, { recursive: true });

const e = chargerDepuisDisque(join(process.cwd(), "data"));
const AGENTS = [
  { code: "ACQUISITION_CA", slug: "acquisition-chiffre-affaires", objectif: { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 6 } },
  { code: "FINANCE_RENTABILITE", slug: "finance-rentabilite", objectif: { quoi: "améliorer ma marge", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 6 } },
  { code: "RH_ORGANISATION", slug: "rh-organisation", objectif: { quoi: "clarifier les rôles et les responsabilités", reussite: "chacun sait ce qu'il doit faire sans me solliciter", delaiMois: 3, choix: "rh-roles" } },
  { code: "COMM_CREATION", slug: "comm-creation-contenu", objectif: { quoi: "augmenter mon taux de conversion", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 3, choix: "com-conversion" } },
];

// --- Scénarios --------------------------------------------------------------------------------

const scenarios = [];
const parCategorie = new Map();
for (const m of e.routage.metiers) {
  if (!parCategorie.has(m.categorie)) parCategorie.set(m.categorie, []);
  const liste = parCategorie.get(m.categorie);
  if (liste.length < 2) liste.push(m);
}
for (const [categorie, metiers] of parCategorie) {
  for (const m of metiers) {
    const v = m.sousVariantes ?? [];
    scenarios.push({ libelle: m.libelle + (v.length ? ` · ${v[0].libelle}` : ""), metier: m.id, sousVariantes: v.length ? [v[0].id] : [], autre: false, categorie });
  }
}
for (const id of ["hotel", "agence-immobiliere", "coach", "traiteur", "fleuriste"]) {
  const m = e.routage.metiers.find((x) => x.id === id);
  if (m?.sousVariantes?.length) scenarios.push({ libelle: `${m.libelle} · toutes les activités`, metier: m.id, sousVariantes: m.sousVariantes.map((v) => v.id), autre: false, categorie: m.categorie });
}
scenarios.push({ libelle: "Électricien · métier de chantier", metier: "electricien", sousVariantes: [], autre: false, categorie: "prestation-chantier" });
scenarios.push({ libelle: "Métier absent de la liste · commerce de détail", metier: METIER_ABSENT, sousVariantes: [], autre: false, categorie: "commerce-stock", categorieAbsente: "commerce-stock" });
const effectifs = [1, 3, 12];
const retenus = scenarios.filter((s) => !filtre || s.libelle.toLowerCase().includes(filtre.toLowerCase()));

// --- Contrôles de page ------------------------------------------------------------------------

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

// --- Exécution --------------------------------------------------------------------------------

const navigateur = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const constats = [];
const compteurs = { comptes: 0, pages: 0, reponsesEnvoyees: 0, reponsesRefusees: 0 };
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

let numero = 0;
for (const s of retenus) {
  const secteur = s.libelle;
  const effectif = effectifs[numero++ % effectifs.length];
  const taille = tailleDepuisEffectif(effectif);
  const ro = router(e.routage, s.metier, s.sousVariantes, { autre: s.autre, categorieAbsente: s.categorieAbsente });
  if (!ro.ok) {
    noter("erreur", secteur, "routage", ro.erreur.message);
    continue;
  }
  const rt = ro.routage;
  const agents = AGENTS.filter((a) => !rt.agentsExclus.includes(a.code));
  const email = `controle${Date.now()}${numero}@example.com`;
  const motDePasse = "motdepasse-controle-1234";

  const ctxBureau = await navigateur.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await ctxBureau.newPage();
  const api = ctxBureau.request;
  const insc = await post("/api/inscription", { email, motDePasse });
  if (!insc.ok) { noter("erreur", secteur, "inscription", `statut ${insc.status}`); await ctxBureau.close(); continue; }
  await page.goto(B + "/connexion", { waitUntil: "networkidle" });
  await page.fill("#email", email); await page.fill("#motDePasse", motDePasse); await page.click('button[type="submit"]');
  await page.waitForURL(/inscription\/metier|tableau-de-bord|formule/, { timeout: 30000 });
  compteurs.comptes++;

  const m = await api.put(B + "/api/compte/metier", { data: { metierPrecis: s.metier, sousVariantes: s.sousVariantes, autre: s.autre, ...(s.categorieAbsente ? { categorieAbsente: s.categorieAbsente, metierAbsentTexte: "Activité de test" } : {}), ...(rt.stock === "a_demander" ? { vendProduits: true } : {}) } });
  if (!m.ok()) { noter("erreur", secteur, "métier", `statut ${m.status()} ${(await m.text()).slice(0, 160)}`); await ctxBureau.close(); continue; }

  // Formule : tous les agents permis (les professions réglementées n'ont pas l'agent Comm : l'ajouter doit être refusé).
  if (rt.reglementee) {
    const interdit = await api.post(B + "/api/abonnement", { data: { nombreAgents: 4, periode: "mensuel", agents: AGENTS.map((a) => a.code) } });
    if (interdit.ok()) noter("erreur", secteur, "formule", "une profession réglementée peut souscrire l'agent Comm");
  }
  const ab = await api.post(B + "/api/abonnement", { data: { nombreAgents: Math.max(2, agents.length), periode: "mensuel", agents: agents.map((a) => a.code) } });
  if (!ab.ok()) { noter("erreur", secteur, "formule", `statut ${ab.status()} ${(await ab.text()).slice(0, 160)}`); await ctxBureau.close(); continue; }
  await api.post(B + "/api/paiement/demonstration", { data: {} });
  const d = await api.put(B + "/api/compte/dossier", { data: { chiffreAffairesMensuel: 60000, nombreCollaborateurs: effectif, dateCreationEntreprise: "2019-03-01", typeZone: "PERIURBAINE", ville: "Lyon" } });
  if (!d.ok()) { noter("erreur", secteur, "dossier", `statut ${d.status()} ${(await d.text()).slice(0, 160)}`); await ctxBureau.close(); continue; }

  const reponsesCompte = {};
  console.log(`\n== ${secteur} (${rt.profils.join("+") || "aucun profil"}, ${taille}, agents : ${agents.map((a) => a.code.slice(0, 3)).join(" ")})`);
  await visiter(page, secteur, "tableau de bord", "/tableau-de-bord");
  if (rt.questionnaireACreer) {
    // Catégorie sans questionnaire : l'écran doit le dire clairement.
    for (const a of agents.slice(0, 1)) {
      await api.post(B + "/api/audit/objectif", { data: { agent: a.code, objectif: a.objectif } });
      await api.put(B + "/api/audit/niveau", { data: { niveau: "ESSENTIEL" } });
      const r = await visiter(page, secteur, `${a.code} · questionnaire`, `/audit/${a.slug}`);
      const texte = await page.locator("main").innerText();
      if (!/en cours de préparation|préparation/.test(texte) && agents.length) noter("attention", secteur, `${a.code} · questionnaire`, "la catégorie en préparation n'est pas annoncée clairement");
      void r;
    }
    await ctxBureau.close();
    continue;
  }

  for (const a of agents) {
    const ou = (x) => `${a.code.slice(0, 3)} · ${x}`;
    await visiter(page, secteur, ou("objectif"), `/audit/${a.slug}`);
    const o = await api.post(B + "/api/audit/objectif", { data: { agent: a.code, objectif: a.objectif } });
    if (!o.ok()) { noter("erreur", secteur, ou("objectif"), `enregistrement refusé : ${o.status()} ${(await o.text()).slice(0, 120)}`); continue; }
    await visiter(page, secteur, ou("niveau"), `/audit/${a.slug}`);
    await api.put(B + "/api/audit/niveau", { data: { niveau: "ESSENTIEL" } });

    const entree = { agent: a.code, profils: rt.profils, taille, niveau: "essentiel", ancienneteMois: 12 * 7, exclusions: rt.reglementee ? e.routage.reglementees.acquisitionExclut ?? null : null, reponses: reponsesCompte, metier: metierDuCompte(e.routage, s), vocabulaire: vocabulaireDuCompte(e.vocabulairesMetiers, metierDuCompte(e.routage, s)) };
    const prevu = assemblerQuestionnaire(e, entree);
    const vide = await visiter(page, secteur, ou("questionnaire vide"), `/audit/${a.slug}`);
    const attendu = prevu.themes.reduce((n, t) => n + t.questions.length, 0) + prevu.prealables.length;
    if (vide && vide.cartes !== attendu) noter("erreur", secteur, ou("questionnaire vide"), `l'écran montre ${vide.cartes} question(s), le moteur en prévoit ${attendu}`);

    // Réponses de démonstration envoyées au serveur : il doit accepter ce que le moteur juge valide.
    const { reponses, assemblage } = remplir(e, entree, "oui");
    const nouvelles = Object.entries(reponses).filter(([cle]) => reponsesCompte[cle] === undefined);
    Object.assign(reponsesCompte, reponses);
    for (const [cle, reponse] of nouvelles) {
      const r = await api.put(B + "/api/audit/reponses", { data: { cle, reponse } });
      compteurs.reponsesEnvoyees++;
      if (!r.ok()) {
        compteurs.reponsesRefusees++;
        noter("erreur", secteur, ou("réponse"), `${cle} refusée (${r.status()}) : ${(await r.text()).slice(0, 140)}`);
      }
    }
    const attenduRempli = assemblage.themes.reduce((n, t) => n + t.questions.length, 0) + assemblage.prealables.length;
    const rempli = await visiter(page, secteur, ou("questionnaire rempli"), `/audit/${a.slug}`, { rempli: true });
    if (rempli && rempli.cartes !== attenduRempli) noter("erreur", secteur, ou("questionnaire rempli"), `l'écran montre ${rempli.cartes} question(s), le moteur en prévoit ${attenduRempli}`);
    if (rempli && rempli.cartesTraitees < rempli.cartes * 0.6) noter("attention", secteur, ou("questionnaire rempli"), `seulement ${rempli.cartesTraitees} question(s) traitée(s) sur ${rempli.cartes} après les réponses`);
    await visiter(page, secteur, ou("résultats"), `/audit/${a.slug}?etape=4`, { rempli: true });
  }

  // Mobile, thème clair : le premier agent, questionnaire rempli et résultats.
  const a0 = agents[0];
  if (a0) {
    const ctxMobile = await navigateur.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce", storageState: await ctxBureau.storageState() });
    await ctxMobile.addInitScript(() => { try { localStorage.setItem("caxe-theme", "clair"); } catch {} });
    const pm = await ctxMobile.newPage();
    await visiter(pm, secteur, `mobile clair · ${a0.code.slice(0, 3)} · questionnaire`, `/audit/${a0.slug}`, { rempli: true });
    await visiter(pm, secteur, `mobile clair · ${a0.code.slice(0, 3)} · résultats`, `/audit/${a0.slug}?etape=4`);
    await visiter(pm, secteur, "mobile clair · tableau de bord", "/tableau-de-bord");
    await ctxMobile.close();
  }
  await ctxBureau.close();
}

await navigateur.close();
const erreurs = constats.filter((c) => c.gravite === "erreur");
console.log(`\nComptes : ${compteurs.comptes} · pages vérifiées : ${compteurs.pages} · réponses envoyées : ${compteurs.reponsesEnvoyees} (refusées : ${compteurs.reponsesRefusees})`);
console.log(`Erreurs : ${erreurs.length} · points d'attention : ${constats.length - erreurs.length}`);
writeFileSync(join(sortie, "constats.json"), JSON.stringify({ compteurs, constats }, null, 2));
process.exitCode = erreurs.length ? 1 : 0;

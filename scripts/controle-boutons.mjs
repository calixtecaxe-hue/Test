// Contrôle de tous les boutons et mécanismes du questionnaire, dans le navigateur, sur les quatre agents :
// chiffre exact, estimation, « je ne sais pas », « je ne suis pas cette donnée » (et second clic qui annule),
// « Effacer ma réponse », cases à cocher, oui / non, choix, listes, tableaux (dont total imposé), textes, mois,
// cartes partagées, rechargement de la page, et mise à jour des questions suivantes après une réponse déclencheuse.
//
//   (serveur lancé : AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration npx next start -p 3100)
//   node scripts/controle-boutons.mjs [--metier electricien] [--agents ACQ,FIN,RH,COM] [--niveau APPROFONDI] [--max 400]
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright/index.js");
const B = process.env.BASE ?? "http://127.0.0.1:3100";
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const METIER = opt("metier", "electricien");
const NIVEAU = opt("niveau", "APPROFONDI");
const MAX = Number(opt("max", "600"));
// Nombre de questions de chaque type exercées à fond (toutes les réponses et tous les boutons) ; les autres : une réponse, vérifiée, puis « Effacer ».
const COMPLET = Number(opt("complet", "2"));
const CHOIX_AGENTS = opt("agents", "ACQ,FIN,RH,COM").split(",");
// --apercu <dossier> : le même contrôle sur la copie interactive (aperçu de l'application), sans serveur ni base.
const APERCU = opt("apercu", null);
const SUFFIXE = { ACQ: "acq", FIN: "fin", RH: "rh", COM: "com" };
const dbUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)[1].split("?")[0];
const sql = (q) => execFileSync("psql", [dbUrl, "-At", "-c", q], { encoding: "utf8" }).trim();

const AGENTS = {
  ACQ: { code: "ACQUISITION_CA", slug: "acquisition-chiffre-affaires", objectif: { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 6 } },
  FIN: { code: "FINANCE_RENTABILITE", slug: "finance-rentabilite", objectif: { quoi: "améliorer ma marge", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 6 } },
  RH: { code: "RH_ORGANISATION", slug: "rh-organisation", objectif: { quoi: "clarifier les rôles et les responsabilités", reussite: "chacun sait ce qu'il doit faire sans me solliciter", delaiMois: 3, choix: "rh-roles" } },
  COM: { code: "COMM_CREATION", slug: "comm-creation-contenu", objectif: { quoi: "augmenter mon taux de conversion", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 3, choix: "com-conversion" } },
};

// Réponses attendues de la banque : sert à choisir des valeurs dans les bornes de chaque champ (un chiffre hors bornes est refusé, à juste titre).
const BANQUE = Object.fromEntries(JSON.parse(readFileSync("data/banque/questions.json", "utf8")).map((q) => [q.donnee, q.reponse]));
const champsSaisis = (rep) => (rep?.type === "composite" ? rep.champs.filter((c) => c.spec.type === "nombre" || c.spec.type === "texte") : []);
const valeurDans = (spec) => {
  if (spec?.type !== "nombre") return String(10 + ((++graine * 7) % 40));
  const min = spec.min ?? 0, max = Math.min(spec.max ?? 97, 97);
  return String(min + ((++graine * 7 + 3) % (max - min + 1)));
};

const echecs = [];
const compte = { verifies: 0 };
function verifier(agent, ou, nom, ok, detail = "") {
  compte.verifies++;
  if (!ok) { echecs.push({ agent, ou, nom, detail }); console.log(`ECHEC [${agent}] ${ou} · ${nom}${detail ? " : " + detail : ""}`); }
}

const navigateur = await chromium.launch({ args: ["--proxy-bypass-list=*"], executablePath: "/opt/pw-browsers/chromium" });

async function nouveauCompte() {
  if (APERCU) {
    const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce" });
    const page = await contexte.newPage();
    return { email: "apercu", contexte, page, api: null, agents: Object.values(AGENTS) };
  }
  const email = `boutons${Date.now()}${Math.floor(Math.random() * 1e4)}@example.com`;
  const motDePasse = "motdepasse-controle-1234";
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce" });
  const page = await contexte.newPage();
  await fetch(B + "/api/inscription", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, motDePasse }) });
  await page.goto(B + "/connexion", { waitUntil: "networkidle" });
  await page.fill("#email", email); await page.fill("#motDePasse", motDePasse); await page.click('button[type="submit"]');
  await page.waitForURL(/inscription\/metier|tableau-de-bord|formule/, { timeout: 30000 });
  const api = contexte.request;
  const m = await api.put(B + "/api/compte/metier", { data: { metierPrecis: METIER, sousVariantes: [], ...(METIER === "hotel" ? {} : {}) } });
  if (!m.ok()) throw new Error("métier " + m.status() + " " + (await m.text()));
  const permis = Object.values(AGENTS);
  const ab = await api.post(B + "/api/abonnement", { data: { nombreAgents: 4, periode: "mensuel", agents: permis.map((a) => a.code) } });
  let agents = permis;
  if (!ab.ok()) {
    agents = permis.filter((a) => a.code !== "COMM_CREATION");
    const ab2 = await api.post(B + "/api/abonnement", { data: { nombreAgents: 3, periode: "mensuel", agents: agents.map((a) => a.code) } });
    if (!ab2.ok()) throw new Error("abonnement " + (await ab2.text()));
  }
  await api.post(B + "/api/paiement/demonstration", { data: {} });
  const d = await api.put(B + "/api/compte/dossier", { data: { chiffreAffairesMensuel: 60000, nombreCollaborateurs: 4, dateCreationEntreprise: "2019-03-01", typeZone: "PERIURBAINE", ville: "Lyon" } });
  if (!d.ok()) throw new Error("dossier " + d.status());
  await api.put(B + "/api/audit/niveau", { data: { niveau: NIVEAU } });
  for (const a of agents) {
    const o = await api.post(B + "/api/audit/objectif", { data: { agent: a.code, objectif: a.objectif } });
    if (!o.ok()) throw new Error("objectif " + a.code + " " + (await o.text()));
  }
  return { email, contexte, page, api, agents };
}

const ligneDb = (email, cle) => sql(`select r.reponse::text from "ReponseAudit" r join "User" u on u.id=r."userId" where u.email='${email}' and r.cle='${cle}'`);
const brouillonDb = (email, cle) => sql(`select b.saisie::text from "BrouillonReponse" b join "User" u on u.id=b."userId" where u.email='${email}' and b.cle='${cle}'`);

const codesVisibles = (page) => page.locator("li[data-question]").evaluateAll((els) => els.map((e) => e.getAttribute("data-question")));
async function attendreEnregistre(carte, ms = 2500) {
  try { await carte.getByText(/^Enregistré$/).waitFor({ timeout: ms }); return true; } catch { return false; }
}
const pause = (page, ms = 900) => page.waitForTimeout(ms);
let graine = 100;
const unique = () => String(1 + (++graine % 97));

// Remplit un tableau : chaque cellule, avec un total imposé respecté quand il existe.
async function remplirTableau(carte, marque = "1") {
  const zoneTotal = carte.getByText(/Total : .* sur /);
  const total = (await zoneTotal.count()) > 0 ? await zoneTotal.first().innerText() : null;
  const cible = total ? Number(total.split(" sur ")[1].replace(/[^\d.,]/g, "").replace(",", ".")) : null;
  const lignes = carte.locator("tbody tr");
  const n = await lignes.count();
  let colTotal = null;
  for (let i = 0; i < n; i++) {
    const cellules = lignes.nth(i).locator("td");
    const m = await cellules.count();
    for (let j = 0; j < m; j++) {
      const sel = cellules.nth(j).locator("select");
      if (await sel.count()) {
        const opts = await sel.locator("option").evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
        if (opts.length) await sel.selectOption(opts[0]);
        continue;
      }
      const champ = cellules.nth(j).locator("input").first();
      if (!(await champ.count())) continue;
      const type = await champ.getAttribute("type");
      if (type === "month") { await champ.fill("2020-01"); continue; }
      const valeur = cible !== null ? (i === 0 && colTotal === null ? String(cible) : "0") : marque;
      await champ.fill(valeur);
      if (cible !== null && i === 0) colTotal = j;
    }
    // Nom de ligne libre.
    const nom = lignes.nth(i).locator("th input");
    if (await nom.count()) await nom.fill(`Ligne ${i + 1}`);
  }
  await carte.locator("tbody tr").first().locator("input,select").first().blur().catch(() => {});
}

// Pose une réponse minimale du type reconnu (sert à remettre une réponse après « Effacer »).
async function reposer(page, carte, type) {
  if (type === "nombre") {
    const exact = carte.getByRole("button", { name: "Chiffre exact", exact: true });
    if ((await exact.getAttribute("aria-pressed")) !== "true") await exact.click();
    await carte.locator('input[id$="-exact"]').fill(valeurDans(BANQUE[await carte.getAttribute("data-question")]));
    await carte.locator('input[id$="-exact"]').blur();
  } else if (type === "cases" || type === "choix") {
    const o = carte.locator("label.case-option").first();
    if (!(await o.locator("input").isChecked())) await o.click();
  } else if (type === "liste") {
    await carte.locator('input[type="text"]').first().fill("Catégorie " + unique());
    await carte.locator('input[type="text"]').first().blur();
  } else if (type === "tableau") {
    await remplirTableau(carte, unique());
  } else if (type === "texte") {
    await carte.locator("textarea").fill("Réponse libre de test " + unique()); await carte.locator("textarea").blur();
  } else if (type === "mois") {
    await carte.locator('input[type="month"]').fill("2020-" + String(1 + (++graine % 9)).padStart(2, "0")); await carte.locator('input[type="month"]').blur();
  } else if (type === "composite") {
    const selects = carte.locator("select");
    for (let i = 0; i < (await selects.count()); i++) {
      const opts = await selects.nth(i).locator("option").evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
      if (opts.length) await selects.nth(i).selectOption(opts[0]);
    }
    const champs = carte.locator('input[type="text"]');
    const specs = champsSaisis(BANQUE[await carte.getAttribute("data-question")]);
    for (let i = 0; i < (await champs.count()); i++) await champs.nth(i).fill(valeurDans(specs[i]?.spec));
    await champs.first().blur().catch(() => {});
  }
  await page.waitForTimeout(700);
}

// Exerce une carte selon ce qu'elle contient. Renvoie le type reconnu.
async function exercer(page, agent, T, code, completPour) {
  const carte = page.locator(`li[data-question="${code}"]`);
  if ((await carte.count()) === 0) return "disparue";
  if ((await carte.getAttribute("data-partagee")) === "oui") {
    const modif = carte.getByRole("button", { name: "Modifier cette réponse" });
    verifier(agent, code, "carte partagée : bouton Modifier présent", (await modif.count()) === 1);
    if (await modif.count()) {
      await modif.click(); await pause(page, 400);
      const ouverte = page.locator(`li[data-question]`).filter({ has: page.getByRole("button", { name: "Terminer" }) });
      verifier(agent, code, "carte partagée : Modifier ouvre la saisie (bouton Terminer)", (await ouverte.count()) >= 1);
      if (await ouverte.count()) { await ouverte.first().getByRole("button", { name: "Terminer" }).click(); await pause(page, 400); }
    }
    return "partagee";
  }
  const dejaPosee = (await carte.getByText("Déjà renseigné avec un autre agent").count()) > 0;
  if (dejaPosee) return "deja";
  await carte.scrollIntoViewIfNeeded();
  let type = "?";
  let complet = true;

  const facon = carte.locator('[aria-label="Façon de répondre"]');
  const cases = carte.locator("fieldset.cases-groupe");
  const tableau = carte.locator("tbody tr");
  const liste = carte.getByRole("button", { name: "Ajouter un élément" });
  const zoneTexte = carte.locator("textarea");
  const mois = carte.locator('input[type="month"]');
  const selects = carte.locator("select");
  const champsTexte = carte.locator('input[type="text"]');

  if (await facon.count()) {
    type = "nombre";
    complet = completPour(type);
    // Chiffre exact.
    await carte.locator('input[id$="-exact"]').fill("12");
    await carte.locator('input[id$="-exact"]').blur();
    verifier(agent, code, "nombre exact : « Enregistré » affiché", await attendreEnregistre(carte));
    let r = await T.ligne(code);
    verifier(agent, code, "nombre exact : enregistré en base (12)", /"genre": "exact"/.test(r) && /"valeur": 12\b/.test(r), r);
    if (complet) {
    // Texte non numérique : une erreur, la réponse déjà enregistrée n'est pas écrasée.
    await carte.locator('input[id$="-exact"]').fill("abc");
    await carte.locator('input[id$="-exact"]').blur();
    await pause(page, 900);
    r = await T.ligne(code);
    verifier(agent, code, "nombre : « abc » refusé, l'ancienne réponse reste (12)", /"valeur": 12\b/.test(r), r);
    verifier(agent, code, "nombre : message d'erreur affiché pour « abc »", (await carte.locator(".text-\\[var\\(--red-1\\)\\]").count()) >= 1);
    // Estimation.
    await carte.getByRole("button", { name: "Estimation", exact: true }).click();
    await carte.locator('input[id$="-min"]').fill("10");
    await carte.locator('input[id$="-max"]').fill("30");
    await carte.locator('input[id$="-max"]').blur();
    verifier(agent, code, "estimation : « Enregistré » affiché", await attendreEnregistre(carte));
    r = await T.ligne(code);
    verifier(agent, code, "estimation : enregistrée en base (10 à 30)", /"genre": "estimation"/.test(r) && /"min": 10\b/.test(r) && /"max": 30\b/.test(r), r);
    // Fourchette inversée : refusée.
    await carte.locator('input[id$="-min"]').fill("50");
    await carte.locator('input[id$="-min"]').blur();
    await pause(page, 900);
    r = await T.ligne(code);
    verifier(agent, code, "estimation inversée (50 à 30) : refusée, l'ancienne reste", /"min": 10\b/.test(r), r);
    await carte.locator('input[id$="-min"]').fill("10");
    await carte.locator('input[id$="-min"]').blur();
    await pause(page, 900);
    }
  } else if (await cases.count()) {
    const coche = (await carte.locator('input[type="checkbox"]').count()) > 0;
    type = coche ? "cases" : "choix";
    complet = completPour(type);
    const options = carte.locator("label.case-option");
    const n = await options.count();
    if (n === 0) return type;
    await options.nth(0).click();
    verifier(agent, code, `${type} : « Enregistré » après la 1re option`, await attendreEnregistre(carte));
    let r = await T.ligne(code);
    verifier(agent, code, `${type} : enregistré en base`, r.length > 0 && /"genre": "saisie"/.test(r), r);
    verifier(agent, code, `${type} : la première option est cochée à l'écran`, (await options.nth(0).locator("input").isChecked()));
    if (complet && coche && n >= 2) {
      await options.nth(1).click(); await pause(page, 900);
      r = await T.ligne(code);
      verifier(agent, code, "cases : deux options enregistrées", (JSON.parse(r).valeur?.length ?? 0) === 2, r);
      await options.nth(1).click(); await pause(page, 900);
      r = await T.ligne(code);
      verifier(agent, code, "cases : décocher retire l'option", (JSON.parse(r).valeur?.length ?? 0) === 1, r);
    } else if (complet && !coche && n >= 2) {
      await options.nth(1).click(); await pause(page, 900);
      r = await T.ligne(code);
      verifier(agent, code, "choix : changer d'option remplace la réponse", !(await options.nth(0).locator("input").isChecked()) && (await options.nth(1).locator("input").isChecked()), r);
    }
  } else if (await liste.count()) {
    type = "liste";
    complet = completPour(type);
    await carte.locator('input[type="text"]').first().fill("Catégorie A");
    await carte.locator('input[type="text"]').first().blur();
    verifier(agent, code, "liste : « Enregistré » affiché", await attendreEnregistre(carte));
    await liste.click();
    await carte.locator('input[type="text"]').nth(1).fill("Catégorie B");
    await carte.locator('input[type="text"]').nth(1).blur();
    await pause(page, 900);
    const r = await T.ligne(code);
    verifier(agent, code, "liste : deux éléments enregistrés", /Catégorie A/.test(r) && /Catégorie B/.test(r), r);
  } else if (await tableau.count()) {
    type = "tableau";
    complet = completPour(type);
    await remplirTableau(carte);
    await pause(page, 1200);
    const r = await T.ligne(code);
    const b = await T.brouillon(code);
    verifier(agent, code, "tableau : enregistré (ou gardé en brouillon si total imposé non atteint)", r.length > 0 || b.length > 0, `réponse=${r.slice(0, 80)} brouillon=${b.slice(0, 80)}`);
  } else if (await mois.count() && (await selects.count()) === 0 && (await champsTexte.count()) === 0) {
    type = "mois";
    await mois.fill("2021-05"); await mois.blur();
    verifier(agent, code, "mois : « Enregistré » affiché", await attendreEnregistre(carte));
  } else if (await zoneTexte.count()) {
    type = "texte";
    complet = completPour(type);
    await zoneTexte.fill("Réponse libre de test"); await zoneTexte.blur();
    verifier(agent, code, "texte : « Enregistré » affiché", await attendreEnregistre(carte));
    const r = await T.ligne(code);
    verifier(agent, code, "texte : enregistré en base", /Réponse libre de test/.test(r), r);
  } else if ((await selects.count()) > 0 || (await champsTexte.count()) > 0 || (await mois.count()) > 0) {
    type = "composite";
    complet = completPour(type);
    for (let i = 0; i < (await selects.count()); i++) {
      const opts = await selects.nth(i).locator("option").evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
      if (opts.length) await selects.nth(i).selectOption(opts[0]);
    }
    const specsChamps = champsSaisis(BANQUE[code]);
    for (let i = 0; i < (await champsTexte.count()); i++) await champsTexte.nth(i).fill(valeurDans(specsChamps[i]?.spec));
    for (let i = 0; i < (await mois.count()); i++) await mois.nth(i).fill("2021-05");
    await champsTexte.first().blur().catch(() => {});
    await pause(page, 1200);
    const r = await T.ligne(code);
    verifier(agent, code, "composite : enregistré en base", r.length > 0, r);
  } else {
    type = "inconnu";
    verifier(agent, code, "type de réponse reconnu par le test", false, "aucun champ trouvé");
    return type;
  }

  // « Je ne sais pas » puis second clic : annule.
  const inconnu = carte.getByRole("button", { name: "Je ne sais pas", exact: true });
  if (complet && (await inconnu.count())) {
    await inconnu.click(); await pause(page, 700);
    let r = await T.ligne(code);
    verifier(agent, code, "« Je ne sais pas » : enregistré (inconnu)", /"genre": "inconnu"/.test(r), r);
    verifier(agent, code, "« Je ne sais pas » : bouton marqué actif", (await inconnu.getAttribute("aria-pressed")) === "true");
    await inconnu.click(); await pause(page, 700);
    r = await T.ligne(code);
    verifier(agent, code, "« Je ne sais pas » cliqué une seconde fois : annulé (la saisie valide reste, sinon plus de réponse)", !/"genre": "inconnu"/.test(r), r);
    const nonSuivi = carte.getByRole("button", { name: "Je ne suis pas cette donnée", exact: true });
    await nonSuivi.click(); await pause(page, 700);
    r = await T.ligne(code);
    verifier(agent, code, "« Je ne suis pas cette donnée » : enregistré (non_suivi)", /"genre": "non_suivi"/.test(r), r);
    await nonSuivi.click(); await pause(page, 700);
    verifier(agent, code, "« Je ne suis pas cette donnée » cliqué deux fois : annulé", !/"genre": "non_suivi"/.test(await T.ligne(code)), await T.ligne(code));
  }

  // Une réponse, puis « Effacer ma réponse », puis on remet une réponse (les questions qui en dépendent apparaissent).
  await reposer(page, carte, type);
  await pause(page, 900);
  const effacer = carte.getByRole("button", { name: "Effacer ma réponse" });
  verifier(agent, code, "« Effacer ma réponse » présent quand il y a une réponse", (await effacer.count()) === 1, `réponse en base: ${(await T.ligne(code)).slice(0, 60)}`);
  if (await effacer.count()) {
    await effacer.click(); await pause(page, 900);
    verifier(agent, code, "« Effacer ma réponse » : réponse supprimée en base", await T.ligne(code) === "", await T.ligne(code));
    verifier(agent, code, "« Effacer ma réponse » : le bouton disparaît", (await carte.getByRole("button", { name: "Effacer ma réponse" }).count()) === 0);
    if (type === "cases" || type === "choix") verifier(agent, code, "« Effacer » : plus aucune case cochée", (await carte.locator("input:checked").count()) === 0);
    if (type === "nombre") verifier(agent, code, "« Effacer » : champ vidé", (await carte.locator('input[id$="-exact"]').inputValue()) === "");
    if (type === "liste") verifier(agent, code, "« Effacer » : éléments vidés", (await carte.locator('input[type="text"]').first().inputValue()) === "");
    await reposer(page, carte, type);
    await pause(page, 900);
    verifier(agent, code, "réponse remise après « Effacer » : enregistrée", await T.ligne(code) !== "" || await T.brouillon(code) !== "", await T.ligne(code));
  }
  return type;
}

async function cadrage(page, agent) {
  const section = page.locator('section[aria-labelledby="cadrage"]');
  if ((await section.count()) === 0) return;
  const radios = section.locator("fieldset.cases-groupe");
  const n = await radios.count();
  for (let i = 0; i < n; i++) {
    const f = radios.nth(i);
    const options = f.locator("label.case-option");
    if ((await options.count()) === 0) continue;
    const avant = (await codesVisibles(page)).length;
    await options.first().click(); await pause(page, 1200);
    verifier(agent, `cadrage ${i + 1}`, "cadrage : l'option cliquée est cochée", await f.locator("input").first().isChecked());
    void avant;
  }
}

async function ouvrir(page, agent) {
  if (APERCU) {
    await page.goto(`file://${APERCU}/audit-questionnaire-${SUFFIXE[agent]}.html`, { waitUntil: "load" });
    await page.locator("li[data-question], section[aria-labelledby='cadrage']").first().waitFor({ timeout: 10000 });
    return;
  }
  await page.goto(`${B}/audit/${AGENTS[agent].slug}?etape=3`, { waitUntil: "networkidle" });
}

// Ce que le « serveur » a enregistré : la base (application) ou l'état gardé dans l'onglet (aperçu), au format de PostgreSQL.
const comme_pg = (o) => JSON.stringify(o).replace(/":/g, '": ').replace(/,"/g, ', "');
function temoin(page, email) {
  if (!APERCU) return { ligne: async (c) => ligneDb(email, c), brouillon: async (c) => brouillonDb(email, c) };
  const etat = async () => JSON.parse((await page.evaluate(() => sessionStorage.getItem("caxe-apercu-etat-v1"))) ?? '{"reponses":{},"brouillons":{}}');
  return {
    ligne: async (c) => { const r = (await etat()).reponses[c]; return r === undefined ? "" : comme_pg(r); },
    brouillon: async (c) => { const r = (await etat()).brouillons[c]; return r === undefined ? "" : comme_pg(r); },
  };
}

for (const cle of CHOIX_AGENTS) {
  const A = AGENTS[cle];
  const c = await nouveauCompte();
  const { page, email } = c;
  const T = temoin(page, email);
  if (!c.agents.some((a) => a.code === A.code)) { console.log(`(${cle} non proposé pour ${METIER})`); await c.contexte.close(); continue; }
  console.log(`\n=== ${cle} · ${METIER} · ${NIVEAU} ===`);
  const erreursPage = [];
  page.on("pageerror", (e) => erreursPage.push(e.message.slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) erreursPage.push(m.text().slice(0, 200)); });
  await ouvrir(page, cle);
  await cadrage(page, cle);

  const faites = new Set(), types = {}, complets = {};
  let tours = 0;
  while (tours++ < 12 && faites.size < MAX) {
    const codes = (await codesVisibles(page)).filter((x) => !faites.has(x));
    if (codes.length === 0) break;
    for (const code of codes) {
      if (faites.size >= MAX) break;
      faites.add(code);
      try {
        const debut = Date.now();
        const t = await exercer(page, cle, T, code, (type) => { const n = (complets[type] = (complets[type] ?? 0) + 1); return n <= COMPLET; });
        types[t] = (types[t] ?? 0) + 1;
        console.log(`  ${code} ${t} (${((Date.now() - debut) / 1000).toFixed(1)} s)`);
      } catch (e) {
        verifier(cle, code, "exercice sans exception", false, String(e.message).split("\n")[0].slice(0, 160));
        await ouvrir(page, cle);
      }
    }
  }
  console.log("questions exercées :", faites.size, JSON.stringify(types));

  // Mise à jour des questions suivantes : l'écran vivant et une page rechargée montrent la même liste.
  const vivant = (await codesVisibles(page)).sort();
  await ouvrir(page, cle);
  const rechargee = (await codesVisibles(page)).sort();
  verifier(cle, "page", "après rechargement : mêmes questions qu'à l'écran vivant", JSON.stringify(vivant) === JSON.stringify(rechargee), `vivant=${vivant.length} rechargée=${rechargee.length} ; seulement vivant: ${vivant.filter((x) => !rechargee.includes(x)).slice(0, 8)} ; seulement rechargée: ${rechargee.filter((x) => !vivant.includes(x)).slice(0, 8)}`);
  verifier(cle, "page", "aucune erreur JavaScript pendant le parcours", erreursPage.length === 0, erreursPage.slice(0, 3).join(" | "));
  await c.contexte.close();
}

await navigateur.close();
console.log(`\n${compte.verifies} vérifications, ${echecs.length} échec(s).`);
process.exit(echecs.length === 0 ? 0 : 1);

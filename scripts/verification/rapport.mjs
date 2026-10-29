// Contrôle navigateur de l'étape 4 d'un agent (décisions du 29 octobre) : onglets « Résultats » (faits, sans score ni couleur ni
// conseil), « Rapport » (interprétation et stratégie) et « Plan d'action » (actions, suivi). Comptes fictifs ; rédaction en mode
// simulation (aucun appel à l'IA). Le contrôle lance son propre serveur sur le port 3101, avec un premier échec de rédaction
// provoqué (RAPPORT_SIMULATION_ECHECS=1) pour vérifier la reprise.
//
// Prérequis : base démarrée, application construite (npx next build).
//   node scripts/verification/rapport.mjs [--sortie docs/verification/resultats] [--captures docs/rapport/captures]
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const PORT = 3101;
process.env.BASE = `http://127.0.0.1:${PORT}`;
const { chromium, B, journal, creerCompte, sql, AGENTS } = await import("./outils.mjs");

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const captures = args.includes("--captures") ? args[args.indexOf("--captures") + 1] : "docs/rapport/captures";
mkdirSync(captures, { recursive: true });
const { controle, ecrire } = journal("rapport");

const serveur = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env: { ...process.env, AUTH_TRUST_HOST: "true", PAIEMENT_MODE: "demonstration", EMAIL_MODE: "demonstration", RAPPORT_MODE: "simulation", RAPPORT_SIMULATION_DELAI_MS: "3000", RAPPORT_SIMULATION_ECHECS: "1" },
  stdio: "ignore",
  detached: true,
});
const arreter = () => {
  try {
    process.kill(-serveur.pid);
  } catch {}
};
process.on("exit", arreter);
for (let i = 0; i < 60; i++) {
  const ok = await fetch(`${B}/connexion`).then((r) => r.ok).catch(() => false);
  if (ok) break;
  await new Promise((r) => setTimeout(r, 1000));
}

const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const url = (a, onglet) => `${B}/audit/${AGENTS[a].slug}?etape=4${onglet ? `&onglet=${onglet}` : ""}`;
const poser = (api, cle, reponse) => api.put(`${B}/api/audit/reponses`, { data: { cle, reponse } });
const DOUZE = ["le_mois_dernier", ...Array.from({ length: 11 }, (_, k) => `il_y_a_${k + 2}_mois`)];
const normal = (t) => t.replace(/\s/g, " ");
const rapports = (email, agent = "ACQUISITION_CA") =>
  sql(`select string_agg(r.statut::text, ',' order by r."creeLe") from "Rapport" r join "User" u on u.id=r."userId" where u.email='${email}' and r.agent='${agent}'`);
async function attendre(f, ms = 25000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await f()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return f();
}
const largeurEnTrop = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// --- Compte fictif : électricien, 4 personnes, objectif Acquisition « augmenter mon chiffre d'affaires de 10 % » -------------
const { email, page, contexte, api } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
const poses = await Promise.all([
  poser(api, "ACQ-23.01", { genre: "valeurs", valeurs: Object.fromEntries(DOUZE.map((l) => [`${l}.chiffre_d_affaires`, 20000])) }),
  poser(api, "ACQ-02.01", { genre: "estimation", min: 30, max: 50 }),
  poser(api, "ACQ-11.01", { genre: "exact", valeur: 8 }),
  poser(api, "ACQ-10.01", { genre: "valeurs", valeurs: { nombre_par_mois: 20, montant_total_par_mois: 30000 } }),
  poser(api, "ACQ-10.03", { genre: "valeurs", valeurs: { nombre_par_mois: 6, montant_total_par_mois: 9000 } }),
  poser(api, "RH-05.01", { genre: "valeurs", valeurs: { jours: 5, heures: 55 } }),
]);
controle("RP-00", "réponses fictives enregistrées (chiffre d'affaires, demandes, nouveaux clients, devis, temps du dirigeant)", poses.every((r) => r.ok()), poses.map((r) => r.status()).join(" "));

// 1. Résultats : faits, sans couleur, sans score, sans conseil.
await page.goto(url("ACQ"), { waitUntil: "networkidle" });
const panneau = page.locator("[data-panneau=resultats]");
const objectifTexte = normal(await panneau.locator("[data-objectif-resultat]").innerText());
controle(
  "RP-01",
  "Résultats : situation de départ 240 000 €, cible 264 000 €, écart à combler +24 000 €, échéance, avancement déclaré",
  objectifTexte.includes("240 000 €") && objectifTexte.includes("264 000 €") && objectifTexte.includes("+24 000 €") && /Échéance/.test(objectifTexte) && /Aucun point d'étape/.test(objectifTexte),
  objectifTexte.slice(0, 400),
);
const faits = normal(await panneau.innerText());
controle(
  "RP-02",
  "Résultats : chaque chiffre avec son unité et ses mois (demandes « estimé », part des demandes devenues clientes 20 %, vos heures)",
  /Demandes reçues par mois\s*40/.test(faits) && /estimé \(milieu de votre fourchette\)/.test(faits) && /Part des demandes qui deviennent clientes\s*20 %/.test(faits) && /Vos heures de travail par semaine\s*55 h/.test(faits) && /[A-Za-zé]+ à [a-zé]+ 20\d\d/.test(faits),
  faits.slice(0, 600),
);
const couleurs = await panneau.locator(".res-statut, .res-point, .res-verdict, [class*=rouge], [class*=orange], [class*=vert]").count();
controle("RP-03", "Résultats : aucune couleur de jugement, aucun score, aucun conseil, aucun identifiant technique", couleurs === 0 && !/score|\/ ?100|vous devriez|nous recommandons|(ACQ|FIN|RH|COM)-\d\d/i.test(faits), `${couleurs} élément(s) coloré(s)`);
await panneau.locator("[data-questions] summary").first().click();
const utilisees = await panneau.locator("[data-questions]").first().innerText();
controle("RP-04", "Résultats : « Données utilisées » retrouve la question d'origine, en mots", /Quel a été votre chiffre d'affaires pour chacun des 12 derniers mois/.test(utilisees), utilisees.slice(0, 200));
controle(
  "RP-05",
  "Résultats : sans repère vérifié, la comparaison au marché est dite indisponible ; ce qui manque est listé, sans valeur à zéro",
  (await panneau.locator("[data-sans-marche]").count()) === 1 && (await panneau.locator("[data-manquante]").count()) > 0,
  `${await panneau.locator("[data-manquante]").count()} mesure(s) manquante(s)`,
);
await page.screenshot({ path: `${captures}/resultats-ordinateur.png`, fullPage: true });

// Objectif RH sans chiffre : aucun pourcentage fabriqué.
await page.goto(url("RH"), { waitUntil: "networkidle" });
const rh = normal(await page.locator("[data-objectif-resultat]").innerText());
controle("RP-06", "objectif RH sans chiffre : ni cible ni écart, la réussite décrite par le dirigeant, aucun pourcentage", !/Cible|Écart à combler|%/.test(rh) && /chacun sait ce qu'il doit faire/.test(rh) && /n'a pas de chiffre/.test(rh), rh.slice(0, 300));

// 2. Rapport : à rédiger, en cours, échec, reprise, prêt.
await page.goto(url("ACQ", "rapport"), { waitUntil: "networkidle" });
controle("RP-07", "Rapport avant rédaction : explication et bouton « Rédiger mon rapport »", (await page.locator("[data-rapport-absent] [data-rediger]").innerText()) === "Rédiger mon rapport");
await page.goto(url("ACQ", "plan"), { waitUntil: "networkidle" });
controle("RP-08", "Plan d'action avant rédaction : il est rédigé avec le rapport (bouton « Rédiger mon rapport et mon plan »)", (await page.locator("[data-rediger]").innerText()) === "Rédiger mon rapport et mon plan");
await page.goto(url("ACQ", "rapport"), { waitUntil: "networkidle" });
await page.locator("[data-rediger]").click();
const enCours = await page.locator("[data-redaction-en-cours]").waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
await page.screenshot({ path: `${captures}/rapport-en-cours.png` });
const echec = await attendre(async () => (await page.locator("[data-rapport-echec]").count()) === 1);
await page.screenshot({ path: `${captures}/rapport-echec.png` });
controle(
  "RP-09",
  "rédaction : état « en cours » affiché, puis échec (provoqué) avec un message clair et « Relancer la rédaction » ; rien d'autre n'est montré",
  enCours && echec && /n'a pas abouti/.test(await page.locator("[data-rapport-echec]").innerText()) && rapports(email) === "ECHEC" && (await page.locator("[data-rapport-contenu]").count()) === 0,
  `en cours ${enCours} ; échec ${echec} ; base ${rapports(email)}`,
);
await page.locator("[data-rediger]").click();
const pret = await attendre(async () => (await page.locator("[data-rapport-contenu]").count()) === 1);
const nActions = Number(sql(`select count(*) from "ActionPlan" a join "Rapport" r on r.id=a."rapportId" join "User" u on u.id=r."userId" where u.email='${email}'`));
const nContenu = Number(sql(`select jsonb_array_length(r.contenu->'actions') from "Rapport" r join "User" u on u.id=r."userId" where u.email='${email}' and r.statut='PRET'`) || 0);
controle("RP-10", "relance : le rapport est prêt, enregistré (statut PRET) avec une ligne de suivi par action", pret && rapports(email) === "ECHEC,PRET" && nActions === nContenu && nActions > 0, `base ${rapports(email)} ; ${nActions} action(s) suivie(s) pour ${nContenu}`);
const rapportTexte = await page.locator("[data-panneau=rapport]").innerText();
controle(
  "RP-11",
  "rapport : bandeau « Simulation », synthèse, faits établis et « D'après », sans point d'exclamation ni identifiant technique",
  (await page.locator("[data-simulation]").count()) === 1 && (await page.locator("[data-synthese]").count()) === 1 && /Faits établis/i.test(rapportTexte) && /D'après :/.test(rapportTexte) && !/!|(ACQ|FIN|RH|COM)-\d\d/.test(rapportTexte),
  rapportTexte.slice(0, 300),
);
controle("RP-12", "rapport : ce que le dirigeant a déjà essayé n'apparaît pas tant que la question est sans réponse", (await page.locator("[data-essais]").count()) === 0 && !/rien essayé|rien tenté/i.test(rapportTexte));
await page.screenshot({ path: `${captures}/rapport-ordinateur.png`, fullPage: true });
await page.reload({ waitUntil: "networkidle" });
controle("RP-13", "après actualisation, le rapport est repris, à jour (pas de bandeau de mise à jour)", (await page.locator("[data-rapport-contenu]").count()) === 1 && (await page.locator("[data-rapport-perime]").count()) === 0);

// 3. Plan d'action : maintenant / peut attendre, champs complets, suivi des actions.
await page.goto(url("ACQ", "plan"), { waitUntil: "networkidle" });
const plan = page.locator("[data-plan-contenu]");
const actions = plan.locator("[data-action]");
const premiere = normal(await actions.first().innerText());
controle(
  "RP-14",
  "plan : actions « À lancer maintenant » puis « Peut attendre », chacune avec résultat, pourquoi, étapes, échéance, point d'étape, indicateur, effet attendu",
  (await plan.locator("[data-plan-groupe=maintenant]").count()) === 1 &&
    (await plan.locator("[data-plan-groupe=ensuite]").count()) === 1 &&
    ["Résultat recherché", "Pourquoi maintenant", "Étapes", "Échéance", "Point d'étape", "Indicateur à suivre", "Effet attendu", "Temps nécessaire", "Moyens"].every((x) => premiere.toLowerCase().includes(x.toLowerCase())),
  premiere.slice(0, 400),
);
await actions.first().locator("label.case-option", { hasText: "En cours" }).click();
const enregistre = await actions.first().locator(".etat-enregistre").waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
const statutA1 = () => sql(`select a.statut from "ActionPlan" a join "Rapport" r on r.id=a."rapportId" join "User" u on u.id=r."userId" where u.email='${email}' and a.cle='A1' and r.statut='PRET' order by r."creeLe" desc limit 1`);
controle("RP-15", "suivi : « En cours » s'enregistre (base et écran) ; le texte rappelle que l'avancement de l'objectif est distinct", enregistre && statutA1() === "EN_COURS" && /ne change pas l'avancement de votre objectif/.test(await plan.innerText()), statutA1());
await page.reload({ waitUntil: "networkidle" });
const garde = await actions.first().locator("input[value=EN_COURS]").isChecked();
await page.goto(url("ACQ", "rapport"), { waitUntil: "networkidle" });
controle("RP-16", "après actualisation, l'état de l'action est repris ; cocher une action ne rend pas le rapport périmé", garde && (await page.locator("[data-rapport-perime]").count()) === 0);
await page.goto(url("ACQ", "plan"), { waitUntil: "networkidle" });
await page.screenshot({ path: `${captures}/plan-ordinateur.png`, fullPage: true });
// Clavier : la flèche passe au statut suivant, enregistré.
await actions.nth(1).locator("input[value=A_FAIRE]").focus();
await page.keyboard.press("ArrowRight");
const clavier = await attendre(() => sql(`select a.statut from "ActionPlan" a join "Rapport" r on r.id=a."rapportId" join "User" u on u.id=r."userId" where u.email='${email}' and a.cle='A2' and r.statut='PRET' order by r."creeLe" desc limit 1`) === "EN_COURS", 6000);
controle("RP-17", "au clavier, la flèche change l'état d'une action, enregistré", clavier);

// 4. Réponses modifiées après la rédaction : le rapport est signalé, puis mis à jour.
await poser(api, "ACQ-11.01", { genre: "exact", valeur: 9 });
await page.goto(url("ACQ", "rapport"), { waitUntil: "networkidle" });
const perime = (await page.locator("[data-rapport-perime]").count()) === 1;
const onglet = await page.locator("[data-onglet=rapport]").innerText();
await page.screenshot({ path: `${captures}/rapport-perime.png` });
controle("RP-18", "une réponse modifiée après la rédaction : bandeau « ont changé depuis ce rapport » et onglet « à mettre à jour »", perime && /à mettre à jour/.test(onglet), onglet);
await page.locator("[data-rapport-perime] [data-rediger]").click();
const pendant = await page.locator("[data-redaction-en-cours]").waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
const ancienCache = (await page.locator("[data-rapport-contenu]").count()) === 0;
const ajour = await attendre(async () => rapports(email) === "ECHEC,PRET,PRET" && (await page.locator("[data-rapport-contenu]").count()) === 1 && (await page.locator("[data-rapport-perime]").count()) === 0);
controle("RP-19", "« Mettre à jour le rapport » : l'ancien n'est plus montré pendant la rédaction ; le nouveau le remplace, l'ancien reste en base", pendant && ancienCache && ajour, `en cours ${pendant}, ancien caché ${ancienCache} ; base ${rapports(email)}`);

// 5. Ce que le dirigeant a déjà essayé, modifié : le rapport le signale, puis en tient compte.
const objectifId = sql(`select o.id from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.agent='ACQUISITION_CA' and o.statut='ACTIF'`);
await api.put(`${B}/api/audit/tentatives`, { data: { objectifId, tentatives: { etat: "essaye", texte: "J'ai relancé mes devis par téléphone pendant trois semaines.", resultat: "arrete_avant", duree: "moins_d_1_mois" } } });
await page.reload({ waitUntil: "networkidle" });
const perimeEssai = (await page.locator("[data-rapport-perime]").count()) === 1;
await page.locator("[data-rapport-perime] [data-rediger]").click();
await attendre(async () => (await page.locator("[data-essais]").count()) === 1);
const essais = await page.locator("[data-essais]").innerText().catch(() => "");
controle("RP-20", "réponse « déjà essayé » modifiée : rapport signalé périmé ; le nouveau la cite sous « Ce que vous avez déjà essayé »", perimeEssai && /J'ai relancé mes devis par téléphone/.test(essais), essais.slice(0, 200));
await page.goto(url("ACQ", "plan"), { waitUntil: "networkidle" });
controle("RP-21", "plan : une action qui reprend un essai dit ce qui change", (await page.locator("[data-reprise-essai]").count()) >= 1);

// 6. Quitter la page pendant la rédaction : elle continue et se retrouve au retour.
await poser(api, "ACQ-11.01", { genre: "exact", valeur: 10 });
await page.goto(url("ACQ", "rapport"), { waitUntil: "networkidle" });
await page.locator("[data-rapport-perime] [data-rediger]").click();
await page.locator("[data-redaction-en-cours]").waitFor({ timeout: 5000 }).catch(() => {});
await page.goto(`${B}/tableau-de-bord`, { waitUntil: "networkidle" });
await new Promise((r) => setTimeout(r, 4500));
await page.goto(url("ACQ", "rapport"), { waitUntil: "networkidle" });
const retrouve = await attendre(async () => (await page.locator("[data-rapport-contenu]").count()) === 1 && (await page.locator("[data-rapport-perime]").count()) === 0, 15000);
controle("RP-22", "quitter la page pendant la rédaction : elle continue côté serveur et le rapport à jour est là au retour", retrouve, rapports(email));

// 7. Téléphone 360 px : les trois onglets.
await page.setViewportSize({ width: 360, height: 800 });
const largeurs = [];
for (const o of ["resultats", "rapport", "plan"]) {
  await page.goto(url("ACQ", o), { waitUntil: "networkidle" });
  largeurs.push(await largeurEnTrop(page));
  await page.screenshot({ path: `${captures}/${o}-telephone-360.png`, fullPage: true });
}
controle("RP-23", "téléphone 360 px : les trois onglets sans défilement horizontal", largeurs.every((x) => x <= 0), largeurs.join(" "));
await page.setViewportSize({ width: 1280, height: 1000 });

// 8. Changement d'objectif : l'ancien rapport n'est pas présenté comme celui du nouvel objectif.
await api.post(`${B}/api/audit/objectif`, { data: { agent: AGENTS.ACQ.code, objectif: { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 15, unite: "pourcent" }, delaiMois: 12 } } });
await page.goto(url("ACQ", "rapport"), { waitUntil: "networkidle" });
controle("RP-24", "nouvel objectif : aucun rapport affiché tant qu'il n'est pas rédigé pour lui", (await page.locator("[data-rapport-contenu]").count()) === 0 && (await page.locator("[data-rapport-absent]").count()) === 1);

// 9. Données partielles, compte sans réponse, droits.
const b = await creerCompte(nav, { agents: ["ACQ", "FIN"] });
await b.page.goto(url("ACQ", "rapport"), { waitUntil: "networkidle" });
const insuffisant = (await b.page.locator("[data-rapport-insuffisant]").count()) === 1;
const refus = await b.api.post(`${B}/api/rapport`, { data: { agent: "ACQUISITION_CA" } });
controle("RP-25", "sans aucune réponse : le rapport n'est pas lancé (message clair, 409), jamais de conseil générique", insuffisant && refus.status() === 409, String(refus.status()));
await poser(b.api, "ACQ-02.01", { genre: "exact", valeur: 25 });
await b.page.goto(url("ACQ"), { waitUntil: "networkidle" });
const partiel = normal(await b.page.locator("[data-objectif-resultat]").innerText());
controle("RP-26", "données partielles : la situation de départ manque, avec la raison ; les chiffres donnés sont montrés", /situation de départ n'est pas encore connue/.test(partiel) && /Demandes reçues par mois\s*25/.test(normal(await b.page.locator("[data-panneau=resultats]").innerText())), partiel.slice(0, 300));
await b.page.goto(url("ACQ", "rapport"), { waitUntil: "networkidle" });
await b.page.locator("[data-rediger]").click();
const partielPret = await attendre(async () => (await b.page.locator("[data-rapport-contenu]").count()) === 1);
controle("RP-27", "données partielles : le rapport se rédige avec ce qui existe et liste ce qui manque", partielPret && (await b.page.locator("[data-rapport-manques]").count()) === 1);
const idA = sql(`select r.id from "Rapport" r join "User" u on u.id=r."userId" where u.email='${email}' and r.statut='PRET' order by r."creeLe" desc limit 1`);
const lireAutre = await b.api.get(`${B}/api/rapport?id=${idA}`);
const actionAutre = await b.api.put(`${B}/api/rapport/action`, { data: { rapportId: idA, cle: "A1", statut: "FAITE" } });
const horsFormule = await b.api.post(`${B}/api/rapport`, { data: { agent: "RH_ORGANISATION" } });
const invalide = await api.put(`${B}/api/rapport/action`, { data: { rapportId: idA, cle: "A1", statut: "PRESQUE" } });
controle(
  "RP-28",
  "droits : le rapport d'un autre compte est introuvable (404, lecture comme suivi), agent hors formule refusé (403), état d'action inconnu refusé (400)",
  lireAutre.status() === 404 && actionAutre.status() === 404 && horsFormule.status() === 403 && invalide.status() === 400,
  [lireAutre, actionAutre, horsFormule, invalide].map((r) => r.status()).join(" "),
);
await b.contexte.close();
await contexte.close();

await nav.close();
arreter();
process.exit(ecrire(sortie) > 0 ? 1 : 0);

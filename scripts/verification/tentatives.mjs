// Contrôle navigateur de la question « Avez-vous déjà essayé quelque chose pour atteindre cet objectif ? » (décision du
// 29 octobre ; data/deja-tente.json, src/app/(espace)/audit/[slug]/deja-tente.tsx). Comptes fictifs, serveur de test.
//
//   node scripts/verification/tentatives.mjs [--sortie docs/verification/resultats] [--captures docs/verification/captures-tentatives]
import { mkdirSync } from "node:fs";
import { chromium, B, journal, creerCompte, sql, AGENTS, attendreEnregistre } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const captures = args.includes("--captures") ? args[args.indexOf("--captures") + 1] : "docs/verification/captures-tentatives";
mkdirSync(captures, { recursive: true });
const { controle, ecrire } = journal("tentatives");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const url = (a) => `${B}/audit/${AGENTS[a].slug}`;
// La base ne garde pas l'ordre des clés : comparaison après tri.
const trie = (v) => (Array.isArray(v) ? v.map(trie) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, trie(v[k])])) : v);
const meme = (a, b) => JSON.stringify(trie(a)) === JSON.stringify(trie(b));
function enBase(email, agent, statut = "ACTIF") {
  const t = sql(`select coalesce(o.tentatives::text, 'null') from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.agent='${AGENTS[agent].code}' and o.statut='${statut}' order by o."creeLe" desc limit 1`);
  return t ? JSON.parse(t) : undefined;
}
const bloc = (page) => page.locator("section[data-deja-tente]");
async function choisir(page, libelle) {
  await bloc(page).locator("> div label.case-option", { hasText: new RegExp(`^${libelle}$`) }).first().click();
  await attendreEnregistre(bloc(page));
}
async function attendre(f, ms = 8000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (f()) return true; await new Promise((r) => setTimeout(r, 300)); }
  return f();
}

// 1. Les quatre agents : la question est sous l'objectif, avant le questionnaire, sans réponse cochée.
const { email, page, contexte, api } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
for (const a of ["ACQ", "FIN", "RH", "COM"]) {
  await page.goto(url(a), { waitUntil: "networkidle" });
  const ordre = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".audit-objectif-actif, section[data-deja-tente], [data-question]")];
    return els.map((e) => (e.matches(".audit-objectif-actif") ? "objectif" : e.matches("section[data-deja-tente]") ? "deja" : "question")).filter((x, i, t) => t.indexOf(x) === i);
  });
  controle(`T-01-${a}`, `${a} : la question « déjà essayé » est juste sous l'objectif, avant les questions`, JSON.stringify(ordre) === JSON.stringify(["objectif", "deja", "question"]), ordre.join(" → "));
  const coches = await bloc(page).locator("input:checked").count();
  controle(`T-02-${a}`, `${a} : aucune réponse cochée d'avance`, coches === 0, `${coches} cochée(s)`);
}

// 2. Réponses et sauvegarde continue (Acquisition).
await page.goto(url("ACQ"), { waitUntil: "networkidle" });
await choisir(page, "Non");
controle("T-03", "« Non » s'enregistre tout de suite", meme(enBase(email, "ACQ"), { deja: "non", actions: [] }), JSON.stringify(enBase(email, "ACQ")));
await choisir(page, "Oui");
const cartes = () => bloc(page).locator("li[data-action]");
controle("T-04", "« Oui » ouvre la description d'une action et s'enregistre", (await cartes().count()) === 1 && meme(enBase(email, "ACQ"), { deja: "oui", actions: [] }), `${await cartes().count()} action(s) ; ${JSON.stringify(enBase(email, "ACQ"))}`);
await cartes().nth(0).locator("textarea").fill("Relancer chaque devis par téléphone une semaine après l'envoi");
const texteGarde = await attendre(() => enBase(email, "ACQ")?.actions?.[0]?.quoi === "Relancer chaque devis par téléphone une semaine après l'envoi");
controle("T-05", "le texte s'enregistre quand le dirigeant s'arrête d'écrire, sans quitter le champ", texteGarde, JSON.stringify(enBase(email, "ACQ")));
await cartes().nth(0).locator("[data-champ=resultat] label.case-option", { hasText: "Pas de résultat" }).click();
await cartes().nth(0).locator("[data-champ=duree] label.case-option", { hasText: "1 à 3 mois" }).click();
await attendreEnregistre(bloc(page));
const un = enBase(email, "ACQ")?.actions?.[0];
controle("T-06", "résultat et durée s'enregistrent (« Pas de résultat », « 1 à 3 mois »)", un?.resultat === "sans_resultat" && un?.duree === "1_a_3_mois", JSON.stringify(un));
await bloc(page).locator("[data-ajouter]").click();
const focusAjout = await page.evaluate(() => document.activeElement?.closest("li[data-action]")?.getAttribute("data-action"));
await cartes().nth(1).locator("textarea").fill("Publier un avis client chaque semaine");
await cartes().nth(1).locator("textarea").blur();
await cartes().nth(1).locator("[data-champ=resultat] label.case-option", { hasText: "Je l'ai arrêté avant de voir le résultat" }).click();
await attendreEnregistre(bloc(page));
controle("T-07", "une deuxième action s'ajoute (curseur dans son champ) et s'enregistre", focusAjout === "2" && enBase(email, "ACQ")?.actions?.length === 2 && enBase(email, "ACQ").actions[1].resultat === "arrete_avant", `curseur action ${focusAjout} ; ${JSON.stringify(enBase(email, "ACQ"))}`);
await bloc(page).locator("[data-ajouter]").click();
const apresTrois = await bloc(page).locator("[data-ajouter]").count();
controle("T-08", "trois actions au plus : le bouton « Ajouter » disparaît à la troisième", (await cartes().count()) === 3 && apresTrois === 0, `${await cartes().count()} actions, bouton ${apresTrois}`);
await cartes().nth(2).getByRole("button", { name: /Retirer/ }).click();
await cartes().nth(0).getByRole("button", { name: /Retirer/ }).click();
await attendreEnregistre(bloc(page));
const reste = enBase(email, "ACQ");
const focusRetrait = await page.evaluate(() => document.activeElement?.tagName);
controle("T-09", "retirer la première action garde la deuxième, en base comme à l'écran ; le curseur reste dans un champ", (await cartes().count()) === 1 && reste?.actions?.length === 1 && reste.actions[0].quoi === "Publier un avis client chaque semaine" && focusRetrait === "TEXTAREA", `${await cartes().count()} action(s) ; ${JSON.stringify(reste)} ; curseur ${focusRetrait}`);
await page.reload({ waitUntil: "networkidle" });
const valeurRechargee = await cartes().nth(0).locator("textarea").inputValue();
const resultatRecharge = await cartes().nth(0).locator("[data-champ=resultat] input:checked").getAttribute("value").catch(() => null);
controle("T-10", "après actualisation, la réponse est reprise telle quelle", (await bloc(page).locator("> div input[value=oui]:checked").count()) === 1 && valeurRechargee === "Publier un avis client chaque semaine" && resultatRecharge === "arrete_avant", `${valeurRechargee} ; ${resultatRecharge}`);
await choisir(page, "Non");
const gardees = enBase(email, "ACQ");
const cacheesNon = await cartes().count();
await choisir(page, "Oui");
controle("T-11", "« Non » cache les actions sans les perdre ; « Oui » les fait revenir", cacheesNon === 0 && gardees?.deja === "non" && gardees.actions.length === 1 && (await cartes().count()) === 1 && enBase(email, "ACQ")?.deja === "oui", `avec « Non » : ${cacheesNon} affichée(s), base ${JSON.stringify(gardees)}`);
await page.setViewportSize({ width: 360, height: 800 });
const largeur = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
await page.screenshot({ path: `${captures}/telephone-360.png`, fullPage: false, clip: undefined });
await bloc(page).screenshot({ path: `${captures}/telephone-360-question.png` });
controle("T-12", "téléphone 360 px : aucun défilement horizontal", largeur <= 0, `${largeur} px de trop`);
await page.setViewportSize({ width: 1280, height: 1000 });
await bloc(page).screenshot({ path: `${captures}/ordinateur-question.png` });

// 3. Coupure du réseau : la réponse attend dans la page et repart seule.
await contexte.setOffline(true);
await cartes().nth(0).locator("textarea").fill("Publier un avis client chaque semaine, sur Instagram");
await cartes().nth(0).locator("textarea").blur();
const message = await bloc(page).locator(".etat-attente").isVisible({ timeout: 5000 }).catch(() => false);
await contexte.setOffline(false);
const repartie = await attendre(() => enBase(email, "ACQ")?.actions?.[0]?.quoi === "Publier un avis client chaque semaine, sur Instagram", 15000);
controle("T-13", "sans réseau, la réponse attend (message) et repart seule au retour de la connexion", message && repartie, `message ${message}, base ${JSON.stringify(enBase(email, "ACQ"))}`);

// 4. Clavier : les flèches changent la réponse, qui s'enregistre.
await page.reload({ waitUntil: "networkidle" });
await bloc(page).locator("> div input[value=oui]").focus();
await page.keyboard.press("ArrowDown");
await attendreEnregistre(bloc(page));
controle("T-14", "au clavier, la flèche passe de « Oui » à « Non », enregistré", enBase(email, "ACQ")?.deja === "non", JSON.stringify(enBase(email, "ACQ")));
await page.keyboard.press("ArrowUp");
await attendreEnregistre(bloc(page));

// 5. Changer d'objectif : ce qui a été essayé est repris par le nouvel objectif ; l'ancien le garde dans l'historique.
const avant = enBase(email, "ACQ");
const o = await api.post(`${B}/api/audit/objectif`, { data: { agent: AGENTS.ACQ.code, objectif: { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 15, unite: "pourcent" }, delaiMois: 12 } } });
await page.goto(url("ACQ"), { waitUntil: "networkidle" });
const affichee = await cartes().nth(0).locator("textarea").inputValue().catch(() => "");
controle("T-15", "après un changement d'objectif, la réponse est reprise sous le nouvel objectif (base et écran)", o.ok() && meme(enBase(email, "ACQ"), avant) && meme(enBase(email, "ACQ", "REMPLACE"), avant) && affichee === avant?.actions?.[0]?.quoi, `nouvel objectif ${JSON.stringify(enBase(email, "ACQ"))} ; écran « ${affichee} »`);

// 6. Effacer.
await bloc(page).getByRole("button", { name: "Effacer ma réponse" }).click();
await attendre(() => enBase(email, "ACQ") === null);
await page.reload({ waitUntil: "networkidle" });
controle("T-16", "« Effacer ma réponse » vide la réponse (base et écran)", enBase(email, "ACQ") === null && (await bloc(page).locator("input:checked").count()) === 0, JSON.stringify(enBase(email, "ACQ")));
controle("T-17", "le questionnaire reste affiché sous la question", (await page.locator("[data-question]").count()) > 0, `${await page.locator("[data-question]").count()} question(s)`);

// 7. Le serveur refuse ce qui ne va pas.
const r4 = await api.put(`${B}/api/audit/tentatives`, { data: { agent: AGENTS.ACQ.code, tentatives: { deja: "oui", actions: [1, 2, 3, 4].map((n) => ({ quoi: `a${n}`, resultat: null, duree: null })) } } });
const rInconnu = await api.put(`${B}/api/audit/tentatives`, { data: { agent: AGENTS.ACQ.code, tentatives: { deja: "oui", actions: [{ quoi: "x", resultat: "inconnu", duree: null }] } } });
controle("T-18", "le serveur refuse 4 actions et un résultat inconnu", r4.status() === 400 && rInconnu.status() === 400, `${r4.status()} ${rInconnu.status()}`);
await contexte.close();
const deux = await creerCompte(nav, { agents: ["ACQ", "FIN"], objectifs: false });
const sansAgent = await deux.api.put(`${B}/api/audit/tentatives`, { data: { agent: AGENTS.RH.code, tentatives: { deja: "non", actions: [] } } });
const sansObjectif = await deux.api.put(`${B}/api/audit/tentatives`, { data: { agent: AGENTS.ACQ.code, tentatives: { deja: "non", actions: [] } } });
await deux.page.goto(url("ACQ"), { waitUntil: "networkidle" });
const avantObjectif = await bloc(deux.page).count();
controle("T-19", "agent hors formule refusé (403) ; sans objectif, refusé (400) et la question n'est pas affichée", sansAgent.status() === 403 && sansObjectif.status() === 400 && avantObjectif === 0, `${sansAgent.status()} ${sansObjectif.status()} ; ${avantObjectif} bloc(s)`);
await deux.contexte.close();

await nav.close();
process.exit(ecrire(sortie) > 0 ? 1 : 0);

// Contrôle navigateur de « Qu'avez-vous déjà essayé pour atteindre cet objectif ? » (décisions du 29 octobre ; textes dans
// data/deja-tente.json, écran src/app/(espace)/audit/[slug]/deja-tente.tsx, route PUT /api/audit/tentatives). Comptes fictifs,
// serveur de test.
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
const trie = (v) => (Array.isArray(v) ? v.map(trie) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, trie(v[k])])) : v);
const meme = (a, b) => JSON.stringify(trie(a)) === JSON.stringify(trie(b));
const ligne = (email, agent, statut = "ACTIF") =>
  sql(`select o.id || '|' || coalesce(o.tentatives::text, 'null') from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.agent='${AGENTS[agent].code}' and o.statut='${statut}' order by o."creeLe" desc limit 1`);
const enBase = (email, agent, statut) => {
  const t = ligne(email, agent, statut);
  return t ? JSON.parse(t.slice(t.indexOf("|") + 1)) : undefined;
};
const idObjectif = (email, agent, statut) => ligne(email, agent, statut).split("|")[0];
const bloc = (page) => page.locator("section[data-deja-tente]").first();
const texte = (page) => bloc(page).locator("textarea[data-champ=texte]");
const rien = (page) => bloc(page).locator("label[data-champ=rien]");
async function attendre(f, ms = 8000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (f()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return f();
}
const TEXTE = "J'ai relancé mes devis par téléphone, mais je n'ai pas tenu plus de trois semaines.";

// 1. Les quatre agents : la question est juste sous l'objectif, avant le questionnaire, sans réponse.
const { email, page, contexte, api } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
for (const a of ["ACQ", "FIN", "RH", "COM"]) {
  await page.goto(url(a), { waitUntil: "networkidle" });
  const ordre = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".audit-objectif-actif, section[data-deja-tente], [data-question]")];
    return els.map((e) => (e.matches(".audit-objectif-actif") ? "objectif" : e.matches("section[data-deja-tente]") ? "deja" : "question")).filter((x, i, t) => t.indexOf(x) === i);
  });
  controle(`T-01-${a}`, `${a} : la question est juste sous l'objectif, avant les questions`, JSON.stringify(ordre) === JSON.stringify(["objectif", "deja", "question"]), ordre.join(" → "));
  const vide = (await bloc(page).locator("input:checked").count()) === 0 && (await texte(page).inputValue()) === "";
  const titre = await bloc(page).locator("h2").innerText();
  controle(`T-02-${a}`, `${a} : « Qu'avez-vous déjà essayé pour atteindre cet objectif ? », rien de coché ni d'écrit d'avance, aucune réponse en base`, vide && titre === "Qu'avez-vous déjà essayé pour atteindre cet objectif ?" && enBase(email, a) === null, `${titre} ; base ${JSON.stringify(enBase(email, a))}`);
}

// 2. « Je n'ai encore rien essayé », distinct d'une question sans réponse.
await page.goto(url("ACQ"), { waitUntil: "networkidle" });
await rien(page).click();
await attendreEnregistre(bloc(page));
controle("T-03", "« Je n'ai encore rien essayé » s'enregistre tout de suite ({ etat: rien }), alors qu'une question sans réponse reste vide en base", meme(enBase(email, "ACQ"), { etat: "rien" }) && enBase(email, "FIN") === null, JSON.stringify(enBase(email, "ACQ")));

// 3. Le texte : enregistré quand le dirigeant s'arrête d'écrire ; écrire retire « rien essayé ».
await texte(page).fill(TEXTE);
const pause = await attendre(() => enBase(email, "ACQ")?.texte === TEXTE);
controle("T-04", "le texte s'enregistre quand le dirigeant s'arrête d'écrire, sans quitter le champ ; « rien essayé » se décoche", pause && enBase(email, "ACQ")?.etat === "essaye" && !(await rien(page).locator("input").isChecked()), JSON.stringify(enBase(email, "ACQ")));
await texte(page).fill(`${TEXTE} Le soir, je n'avais plus le temps.`);
await texte(page).blur();
const quitte = await attendre(() => enBase(email, "ACQ")?.texte?.endsWith("plus le temps."), 2500);
controle("T-05", "une modification part dès que le dirigeant quitte le champ", quitte, JSON.stringify(enBase(email, "ACQ")));

// 4. Précisions facultatives.
const precisions = bloc(page).locator("details[data-precisions]");
await precisions.locator("summary").click();
await precisions.locator("[data-champ=resultat] label.case-option", { hasText: "Je l'ai arrêté avant de voir le résultat" }).click();
await precisions.locator("[data-champ=duree] label.case-option", { hasText: "Moins d'1 mois" }).click();
await attendreEnregistre(bloc(page));
const avecPrecisions = enBase(email, "ACQ");
controle("T-06", "résultat et durée, facultatifs, s'enregistrent", avecPrecisions?.resultat === "arrete_avant" && avecPrecisions?.duree === "moins_d_1_mois", JSON.stringify(avecPrecisions));
await page.reload({ waitUntil: "networkidle" });
const repris = (await texte(page).inputValue()).endsWith("plus le temps.") && (await precisions.evaluate((d) => d.open)) && (await precisions.locator("[data-champ=resultat] input:checked").getAttribute("value")) === "arrete_avant";
controle("T-07", "après actualisation, texte et précisions sont repris tels quels", repris, await texte(page).inputValue());
await bloc(page).screenshot({ path: `${captures}/ordinateur-question.png` });

// 5. « Rien essayé » après avoir écrit : le texte reste gardé mais ne compte plus ; écrire de nouveau le fait revenir.
await rien(page).click();
await attendreEnregistre(bloc(page));
const rienAvecTexte = enBase(email, "ACQ");
controle("T-08", "cocher « rien essayé » après avoir écrit garde le texte en base (sans qu'il compte) et masque les précisions", rienAvecTexte?.etat === "rien" && rienAvecTexte?.texte?.startsWith("J'ai relancé") && (await precisions.count()) === 0, JSON.stringify(rienAvecTexte));
await texte(page).fill(TEXTE);
await texte(page).blur();
await attendre(() => enBase(email, "ACQ")?.etat === "essaye");

// 6. Coupure du réseau : la réponse attend dans la page, repart seule au retour de la connexion.
await contexte.setOffline(true);
await texte(page).fill(`${TEXTE} (hors connexion)`);
await texte(page).blur();
const message = await bloc(page).locator(".etat-attente").isVisible({ timeout: 6000 }).catch(() => false);
await contexte.setOffline(false);
const repartie = await attendre(() => enBase(email, "ACQ")?.texte?.endsWith("(hors connexion)"), 15000);
controle("T-09", "sans réseau, la réponse attend avec un message, puis repart seule", message && repartie, `message ${message} ; ${JSON.stringify(enBase(email, "ACQ"))}`);

// 7. Clavier : la case « rien essayé » se coche avec Espace.
await page.reload({ waitUntil: "networkidle" });
await rien(page).locator("input").focus();
await page.keyboard.press("Space");
await attendreEnregistre(bloc(page));
const clavier = enBase(email, "ACQ")?.etat === "rien";
await page.keyboard.press("Space");
await attendreEnregistre(bloc(page));
controle("T-10", "au clavier, Espace coche et décoche « rien essayé », enregistré à chaque fois", clavier && enBase(email, "ACQ")?.etat === "essaye", JSON.stringify(enBase(email, "ACQ")));

// 8. Téléphone 360 px.
await page.setViewportSize({ width: 360, height: 800 });
await page.reload({ waitUntil: "networkidle" });
const largeur = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
await bloc(page).screenshot({ path: `${captures}/telephone-360-question.png` });
controle("T-11", "téléphone 360 px : aucun défilement horizontal", largeur <= 0, `${largeur} px de trop`);
await page.setViewportSize({ width: 1280, height: 1000 });

// 9. Changement d'objectif : la réponse reste attachée à l'ancien objectif ; elle est proposée, jamais reprise en silence.
const ancien = enBase(email, "ACQ");
const ancienId = idObjectif(email, "ACQ");
const o = await api.post(`${B}/api/audit/objectif`, { data: { agent: AGENTS.ACQ.code, objectif: { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 15, unite: "pourcent" }, delaiMois: 12 } } });
await page.goto(url("ACQ"), { waitUntil: "networkidle" });
const proposition = bloc(page).locator("[data-reprise-proposee]");
controle(
  "T-12",
  "nouvel objectif : aucune réponse reprise en base ; l'ancienne est proposée sous le nouvel objectif ; l'ancien objectif la garde",
  o.ok() && enBase(email, "ACQ") === null && meme(enBase(email, "ACQ", "REMPLACE"), ancien) && (await proposition.isVisible()) && (await texte(page).inputValue()) === "",
  `nouvel objectif ${JSON.stringify(enBase(email, "ACQ"))} ; proposition ${await proposition.isVisible()}`,
);
const historique = await page.locator("[data-historique-tentatives]").first().innerText().catch(() => "");
controle("T-13", "l'historique des objectifs montre ce qui avait été essayé pour l'ancien objectif", historique.startsWith("Déjà essayé : J'ai relancé"), historique);
await proposition.getByRole("button", { name: "Non, je réponds pour ce nouvel objectif" }).click();
controle("T-14", "« Non, je réponds pour ce nouvel objectif » ferme la proposition sans rien enregistrer", (await proposition.count()) === 0 && enBase(email, "ACQ") === null, JSON.stringify(enBase(email, "ACQ")));
await page.reload({ waitUntil: "networkidle" });
await bloc(page).locator("[data-reprise-proposee]").getByRole("button", { name: "Reprendre pour ce nouvel objectif" }).click();
await attendreEnregistre(bloc(page));
const reprise = enBase(email, "ACQ");
controle(
  "T-15",
  "« Reprendre pour ce nouvel objectif » copie la réponse avec son origine (reprisDe), à l'écran comme en base",
  reprise?.texte === ancien?.texte && reprise?.reprisDe === ancienId && (await texte(page).inputValue()) === ancien?.texte,
  JSON.stringify(reprise),
);

// 10. Le serveur refuse ce qui ne va pas.
const put = (data) => api.put(`${B}/api/audit/tentatives`, { data });
const nouveauId = idObjectif(email, "ACQ");
const remplace = await put({ objectifId: ancienId, tentatives: { etat: "rien" } });
const inconnu = await put({ objectifId: nouveauId, tentatives: { etat: "peut-etre" } });
const long = await put({ objectifId: nouveauId, tentatives: { etat: "essaye", texte: "x".repeat(1501), resultat: null, duree: null } });
const resultatInconnu = await put({ objectifId: nouveauId, tentatives: { etat: "essaye", texte: "x", resultat: "bof", duree: null } });
const autreAgent = await put({ objectifId: nouveauId, tentatives: { etat: "rien", reprisDe: idObjectif(email, "FIN") } });
controle(
  "T-16",
  "refusés : objectif remplacé (409), état inconnu, texte de plus de 1 500 caractères, résultat inconnu, reprise depuis l'objectif d'un autre agent (400)",
  remplace.status() === 409 && [inconnu, long, resultatInconnu, autreAgent].every((r) => r.status() === 400),
  [remplace, inconnu, long, resultatInconnu, autreAgent].map((r) => r.status()).join(" "),
);
const deux = await creerCompte(nav, { agents: ["ACQ", "FIN"], objectifs: false });
const etranger = await deux.api.put(`${B}/api/audit/tentatives`, { data: { objectifId: nouveauId, tentatives: { etat: "rien" } } });
await deux.page.goto(url("ACQ"), { waitUntil: "networkidle" });
const sansObjectif = await deux.page.locator("section[data-deja-tente]").count();
controle("T-17", "l'objectif d'un autre compte est introuvable (404) ; sans objectif, la question n'est pas affichée", etranger.status() === 404 && sansObjectif === 0, `${etranger.status()} ; ${sansObjectif} bloc(s)`);
await deux.contexte.close();
sql(`update "AgentAccess" set actif=false where "userId"=(select id from "User" where email='${email}') and agent='FINANCE_RENTABILITE'`);
const horsFormule = await put({ objectifId: idObjectif(email, "FIN"), tentatives: { etat: "rien" } });
controle("T-18", "un agent qui n'est plus dans la formule est refusé (403)", horsFormule.status() === 403, String(horsFormule.status()));

// 11. Plusieurs objectifs en cours (compte enregistré avant le 28 octobre) : une réponse par objectif, nommé.
const rhId = idObjectif(email, "RH");
sql(`insert into "Objectif" (id, "userId", agent, "texteBrut", structure, echeance, statut, "creeLe") select 'verif' || substr(md5(random()::text), 1, 20), "userId", agent, 'mieux faire circuler l''information, d''ici 3 mois', structure, echeance, statut, "creeLe" + interval '1 second' from "Objectif" where id='${rhId}'`);
await page.goto(url("RH"), { waitUntil: "networkidle" });
const sections = page.locator("section[data-deja-tente]");
const pour = await sections.locator("p", { hasText: "Pour l'objectif :" }).count();
await sections.nth(1).locator("label[data-champ=rien]").click();
await attendreEnregistre(sections.nth(1));
const parObjectif = sql(`select string_agg(coalesce(o.tentatives::text,'null'), ' ; ' order by o."creeLe") from "Objectif" o join "User" u on u.id=o."userId" where u.email='${email}' and o.agent='RH_ORGANISATION' and o.statut='ACTIF'`);
controle("T-19", "deux objectifs en cours : deux questions nommées, la réponse ne vaut que pour son objectif", (await sections.count()) === 2 && pour === 2 && parObjectif.split(" ; ").filter((x) => x === "null").length === 1, `${await sections.count()} question(s), ${pour} nommée(s) ; base ${parObjectif}`);

// 12. Effacer.
await page.goto(url("ACQ"), { waitUntil: "networkidle" });
await bloc(page).getByRole("button", { name: "Effacer ma réponse" }).click();
await attendre(() => enBase(email, "ACQ") === null);
await page.reload({ waitUntil: "networkidle" });
controle("T-20", "« Effacer ma réponse » remet la question sans réponse (base et écran)", enBase(email, "ACQ") === null && (await texte(page).inputValue()) === "" && (await bloc(page).locator("input:checked").count()) === 0, JSON.stringify(enBase(email, "ACQ")));
await contexte.close();

await nav.close();
process.exit(ecrire(sortie) > 0 ? 1 : 0);

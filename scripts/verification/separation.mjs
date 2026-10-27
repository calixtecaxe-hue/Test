// Séparation des comptes et appareils (vérification du 28 octobre) : deux dirigeants ne voient jamais les réponses l'un de
// l'autre ; un même dirigeant sur deux appareils retrouve ses réponses, et une page restée ouverte avec une ancienne valeur
// n'écrase pas la nouvelle quand il répond à une autre question.
//
//   node scripts/verification/separation.mjs [--sortie docs/verification/resultats]
import { chromium, B, journal, creerCompte, connecter, reponseDb, carte, stabiliser } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const { controle, ecrire } = journal("separation");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const ACQ = B + "/audit/acquisition-chiffre-affaires";
const exact = (c) => carte(c.page ?? c, "ACQ-02.01").locator('input[id$="-exact"]').first();
async function taper(page, code, valeur) {
  const champ = carte(page, code).locator('input[id$="-exact"]').first();
  await champ.fill(String(valeur));
  await champ.press("Tab");
  await stabiliser(page, 1500);
}

const A = await creerCompte(nav, { agents: ["ACQ", "FIN"] });
const Bc = await creerCompte(nav, { agents: ["ACQ", "FIN"] });

// 1. A répond ; B ne voit rien.
await A.page.goto(ACQ, { waitUntil: "networkidle" });
await taper(A.page, "ACQ-02.01", 42);
await Bc.page.goto(ACQ, { waitUntil: "networkidle" });
controle("S-01", "compte B : la réponse de A (42) n'apparaît pas dans son questionnaire", (await exact(Bc.page).inputValue()) === "", await exact(Bc.page).inputValue());
controle("S-02", "compte B : aucune réponse enregistrée à son nom pour cette question", reponseDb(Bc.email, "ACQ-02.01") === null, JSON.stringify(reponseDb(Bc.email, "ACQ-02.01")));
await taper(Bc.page, "ACQ-02.01", 7);
controle("S-03", "B répond 7 : la réponse de A reste 42, celle de B est 7", reponseDb(A.email, "ACQ-02.01")?.valeur === 42 && reponseDb(Bc.email, "ACQ-02.01")?.valeur === 7, `A ${JSON.stringify(reponseDb(A.email, "ACQ-02.01"))} B ${JSON.stringify(reponseDb(Bc.email, "ACQ-02.01"))}`);
const tdbB = (await (await Bc.page.goto(B + "/tableau-de-bord", { waitUntil: "networkidle" }), Bc.page.locator("main")).innerText());
controle("S-04", "tableau de bord de B : rien du compte A (adresse e-mail de A absente)", !tdbB.includes(A.email), "");

// 2. A sur un second appareil (téléphone).
const tel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
const pTel = await tel.newPage();
await connecter(pTel, A.email);
await pTel.goto(ACQ, { waitUntil: "networkidle" });
controle("S-05", "A sur son téléphone : la réponse 42 donnée sur l'ordinateur est là", (await exact(pTel).inputValue()) === "42", await exact(pTel).inputValue());
await taper(pTel, "ACQ-02.01", 43);
// L'ordinateur, resté ouvert avec 42, répond à une autre question : 43 n'est pas écrasé.
await taper(A.page, "ACQ-02.02", 10);
controle("S-06", "page restée ouverte sur l'ordinateur (42 affiché) : répondre à une autre question n'écrase pas le 43 donné sur le téléphone", reponseDb(A.email, "ACQ-02.01")?.valeur === 43, JSON.stringify(reponseDb(A.email, "ACQ-02.01")));
await A.page.reload({ waitUntil: "networkidle" });
controle("S-07", "ordinateur actualisé : il affiche 43", (await exact(A.page).inputValue()) === "43", await exact(A.page).inputValue());

// 3. Déconnexion : plus d'accès aux réponses depuis cet appareil.
await A.contexte.clearCookies();
await A.page.goto(ACQ, { waitUntil: "networkidle" });
controle("S-08", "sans session : la page d'un agent renvoie à la connexion, sans montrer de réponse", /\/connexion/.test(A.page.url()) && (await A.page.locator('li[data-question]').count()) === 0, A.page.url());
const r = await A.page.request.put(B + "/api/audit/reponses", { data: { cle: "ACQ-02.01", reponse: { genre: "exact", valeur: 1 } } });
controle("S-09", "sans session : l'enregistrement d'une réponse est refusé (401) et rien ne change", r.status() === 401 && reponseDb(A.email, "ACQ-02.01")?.valeur === 43, `${r.status()} ${JSON.stringify(reponseDb(A.email, "ACQ-02.01"))}`);

await nav.close();
process.exit(ecrire(sortie) ? 1 : 0);

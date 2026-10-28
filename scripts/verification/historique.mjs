// Historique et évolutions dans l'application (vérification du 28 octobre). Comptes fictifs de différents âges ; chaque contrôle
// compare l'écran à une valeur attendue écrite à la main (mois en clair, écarts calculés de tête). Les réponses sont saisies à
// l'écran, sauf les deux tableaux de 12 chiffres d'affaires, envoyés à l'API d'enregistrement de l'application (même route que
// l'écran), ce que dit chaque contrôle concerné.
//
//   node scripts/verification/historique.mjs [--sortie docs/verification/resultats]
import { chromium, B, journal, creerCompte, carte, stabiliser, reponseDb, sql, connecter, lignesTableau } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const { controle, ecrire } = journal("historique");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const ACQ = B + "/audit/acquisition-chiffre-affaires";
const FIN = B + "/audit/finance-rentabilite";

// Mois en français, relativement au mois en cours (les mois exacts dépendent du jour où le contrôle tourne).
const NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const maintenant = new Date();
const M0 = maintenant.getUTCFullYear() * 12 + maintenant.getUTCMonth();
const nom = (m) => `${NOMS[m % 12]} ${Math.floor(m / 12)}`;
const Nom = (m) => nom(m).charAt(0).toUpperCase() + nom(m).slice(1);
const plage = (debut, fin) => (Math.floor(debut / 12) === Math.floor(fin / 12) ? `${NOMS[debut % 12]} à ${nom(fin)}` : `${nom(debut)} à ${nom(fin)}`);
// Date de création « il y a n mois », au premier du mois : l'ancienneté vaut n mois.
const creeIlYA = (n) => {
  const m = M0 - n;
  return `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}-01`;
};

async function codesAffiches(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  return new Set(await page.locator("li[data-question]").evaluateAll((lis) => lis.map((l) => l.getAttribute("data-question"))));
}
async function periodeDe(page, code) {
  const p = carte(page, code).locator("[data-periode]");
  return (await p.count()) ? (await p.first().innerText()).trim() : null;
}
async function repondreNombre(page, code, valeur) {
  const c = carte(page, code);
  await c.scrollIntoViewIfNeeded();
  const mode = c.locator('[aria-label="Autres réponses"] button[aria-pressed="true"]');
  if (await mode.count()) await mode.click();
  const champ = c.locator('input[id$="-exact"]').first();
  await champ.fill(String(valeur));
  await champ.press("Tab");
  await stabiliser(page, 1300);
}
async function evolutions(page, url) {
  await page.goto(url + "?etape=4", { waitUntil: "networkidle" });
  return page.locator("[data-evolution]").evaluateAll((lis) => Object.fromEntries(lis.map((li) => [li.getAttribute("data-evolution"), { statut: li.getAttribute("data-statut"), texte: li.innerText.replace(/\s+/g, " ").trim() }])));
}
const CA = (col, v) => Object.fromEntries(["le_mois_dernier", ...Array.from({ length: 11 }, (_, k) => `il_y_a_${k + 2}_mois`)].map((id) => [`${id}.${col}`, v]));
const poser = (api, cle, reponse) => api.put(B + "/api/audit/reponses", { data: { cle, reponse } });

// --- 1. Entreprise de plus de trois ans (37 mois), niveau essentiel --------------------------------------------------------
{
  const { page } = await creerCompte(nav, { creation: creeIlYA(37), niveau: "ESSENTIEL", agents: ["ACQ", "FIN"] });
  const codes = await codesAffiches(page, ACQ);
  controle("H-01", "37 mois, niveau essentiel : les questions sur le passé de l'Acquisition sont posées (ACQ-02.02, ACQ-02.03, ACQ-11.02, ACQ-23.03, ACQ-23.13)", ["ACQ-02.02", "ACQ-02.03", "ACQ-11.02", "ACQ-23.03", "ACQ-23.13"].every((c) => codes.has(c)), [...codes].filter((c) => /ACQ-(02|11|23)\./.test(c)).join(", "));
  const attendu = `Période : ${plage(M0 - 15, M0 - 13)}, les mêmes mois un an plus tôt.`;
  controle("H-02", `la période d'ACQ-02.03 est écrite en mois : « ${attendu} »`, (await periodeDe(page, "ACQ-02.03")) === attendu, await periodeDe(page, "ACQ-02.03"));
  const attendu2 = `Période : ${plage(M0 - 3, M0 - 1)}.`;
  controle("H-03", `la période d'ACQ-02.01 (moyenne des 3 derniers mois) : « ${attendu2} »`, (await periodeDe(page, "ACQ-02.01")) === attendu2, await periodeDe(page, "ACQ-02.01"));
  const l01 = await lignesTableau(carte(page, "ACQ-23.01"));
  const l03 = await lignesTableau(carte(page, "ACQ-23.03"));
  controle("H-04", `les lignes du chiffre d'affaires nomment leurs mois : ${Nom(M0 - 1)} à ${Nom(M0 - 12)} (ACQ-23.01), ${Nom(M0 - 13)} à ${Nom(M0 - 24)} (ACQ-23.03)`, l01.length === 12 && l01[0].libelle === Nom(M0 - 1) && l01[11].libelle === Nom(M0 - 12) && l03.length === 12 && l03[0].libelle === Nom(M0 - 13) && l03[11].libelle === Nom(M0 - 24), `${l01.map((l) => l.libelle).join(", ")} | ${l03.map((l) => l.libelle).join(", ")}`);
  const fin = await codesAffiches(page, FIN);
  controle("H-05", "Finance, niveau essentiel : chiffre d'affaires de l'année précédente (FIN-14.03), périmètre (FIN-14.04) et effectif d'il y a 12 mois (FIN-07.17) sont posés", ["FIN-14.03", "FIN-14.04", "FIN-07.17"].every((c) => fin.has(c)), [...fin].filter((c) => /FIN-(14|07)\./.test(c)).join(", "));
}

// --- 2. Juste avant et après trois ans (35, 36, 37 mois) ; seuils réels (8/9, 12/13, 14/15, 23/24 mois) ----------------------
{
  const ensembles = {};
  for (const n of [35, 36, 37, 8, 9, 12, 13, 14, 15, 23, 24]) {
    const { page, contexte } = await creerCompte(nav, { creation: creeIlYA(n), niveau: "APPROFONDI", agents: ["ACQ", "FIN"] });
    ensembles[n] = await codesAffiches(page, ACQ);
    if (n === 13) {
      const lignes = await lignesTableau(carte(page, "ACQ-23.03"));
      controle("H-06", `13 mois : ACQ-23.03 ne pose que le mois qui suit la création (${Nom(M0 - 13)}), aucun mois antérieur`, lignes.length === 1 && lignes[0].libelle === Nom(M0 - 13), lignes.map((l) => l.libelle).join(", "));
    }
    await contexte.close();
  }
  const memes = (a, b) => [...ensembles[a]].sort().join() === [...ensembles[b]].sort().join();
  controle("H-07", "35, 36 et 37 mois : exactement les mêmes questions (aucune règle ne change à trois ans ; tout l'historique sur un an est posé dès 24 mois)", memes(35, 36) && memes(36, 37), `${ensembles[35].size} / ${ensembles[36].size} / ${ensembles[37].size}`);
  const bascule = (q, avant, apres) => !ensembles[avant].has(q) && ensembles[apres].has(q);
  controle("H-08", "seuils : ACQ-02.02 posée à 9 mois et pas à 8 ; ACQ-23.03 à 13 et pas à 12 ; ACQ-02.03 et ACQ-11.02 à 15 et pas à 14 ; ACQ-23.12 à 24 et pas à 23",
    bascule("ACQ-02.02", 8, 9) && bascule("ACQ-23.03", 12, 13) && bascule("ACQ-02.03", 14, 15) && bascule("ACQ-11.02", 14, 15) && bascule("ACQ-23.12", 23, 24),
    `02.02 ${ensembles[8].has("ACQ-02.02")}/${ensembles[9].has("ACQ-02.02")} 23.03 ${ensembles[12].has("ACQ-23.03")}/${ensembles[13].has("ACQ-23.03")} 02.03 ${ensembles[14].has("ACQ-02.03")}/${ensembles[15].has("ACQ-02.03")} 23.12 ${ensembles[23].has("ACQ-23.12")}/${ensembles[24].has("ACQ-23.12")}`);
}

// --- 3. Entreprise jeune (5 mois) ------------------------------------------------------------------------------------------
{
  const { page } = await creerCompte(nav, { creation: creeIlYA(5), niveau: "APPROFONDI", agents: ["ACQ", "FIN"] });
  const codes = await codesAffiches(page, ACQ);
  controle("H-09", "5 mois : aucune question sur une période antérieure à la création (ACQ-02.02, ACQ-02.03, ACQ-11.02, ACQ-23.03, ACQ-23.12, ACQ-23.13 absentes)", !["ACQ-02.02", "ACQ-02.03", "ACQ-11.02", "ACQ-23.03", "ACQ-23.12", "ACQ-23.13"].some((c) => codes.has(c)), [...codes].filter((c) => /ACQ-(02|11|16|23)\./.test(c)).join(", "));
  const lignes = await lignesTableau(carte(page, "ACQ-23.01"));
  controle("H-10", `5 mois : le chiffre d'affaires mois par mois ne demande que ${Nom(M0 - 1)} à ${Nom(M0 - 5)}`, lignes.length === 5 && lignes[0].libelle === Nom(M0 - 1) && lignes[4].libelle === Nom(M0 - 5), lignes.map((l) => l.libelle).join(", "));
  const p = await periodeDe(page, "ACQ-01.03");
  const attendu = `Période : depuis la création de votre entreprise (${nom(M0 - 5)}) jusqu'à ${nom(M0 - 1)}, soit 5 mois.`;
  controle("H-11", `5 mois : « sur les 12 derniers mois » devient « ${attendu} »`, p === attendu, p);
}

// --- 4. Évolutions dans le compte rendu (entreprise de 4 ans) -------------------------------------------------------------
{
  const { page, api, email, contexte } = await creerCompte(nav, { creation: creeIlYA(48), niveau: "ESSENTIEL", agents: ["ACQ", "FIN"] });
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await repondreNombre(page, "ACQ-02.01", 32);
  await repondreNombre(page, "ACQ-02.03", 40);
  let ev = await evolutions(page, ACQ);
  const phrase = `32 (${plage(M0 - 3, M0 - 1)}), contre 40 (${plage(M0 - 15, M0 - 13)}). Écart : −8, soit −20 %.`;
  controle("H-12", `baisse : « ${phrase} »`, ev["demandes-12-mois"]?.statut === "etablie" && ev["demandes-12-mois"].texte.includes(phrase), JSON.stringify(ev["demandes-12-mois"]));
  controle("H-13", "sans réponse sur le périmètre : la comparaison est faite, avec une précision sur le périmètre", ev["demandes-12-mois"]?.texte.includes("périmètre de votre activité n'est pas précisé"), ev["demandes-12-mois"]?.texte);
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await repondreNombre(page, "ACQ-02.01", 50);
  ev = await evolutions(page, ACQ);
  controle("H-14", "progression : 50 contre 40 → « Écart : +10, soit +25 % »", ev["demandes-12-mois"]?.texte.includes("Écart : +10, soit +25 %."), ev["demandes-12-mois"]?.texte);
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await repondreNombre(page, "ACQ-02.01", 40);
  ev = await evolutions(page, ACQ);
  controle("H-15", "absence de variation : 40 contre 40 → « Écart : aucun »", ev["demandes-12-mois"]?.texte.includes("Écart : aucun."), ev["demandes-12-mois"]?.texte);
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await repondreNombre(page, "ACQ-02.03", 0);
  await repondreNombre(page, "ACQ-02.01", 5);
  ev = await evolutions(page, ACQ);
  controle("H-16", "valeur historique nulle : écart +5, pourcentage non calculé et dit", ev["demandes-12-mois"]?.texte.includes("Écart : +5.") && ev["demandes-12-mois"].texte.includes("la valeur de départ est nulle"), ev["demandes-12-mois"]?.texte);
  // Donnée indisponible : « je ne sais pas ».
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await carte(page, "ACQ-02.03").getByRole("button", { name: "Je ne sais pas", exact: true }).click();
  await stabiliser(page, 1300);
  ev = await evolutions(page, ACQ);
  controle("H-17", "donnée indisponible (« je ne sais pas ») : comparaison non établie, la raison le dit", ev["demandes-12-mois"]?.statut === "non_etablie" && /je ne sais pas/.test(ev["demandes-12-mois"].texte), ev["demandes-12-mois"]?.texte);
  // Réinitialisation : « Effacer ma réponse », puis nouvelle réponse.
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await repondreNombre(page, "ACQ-02.03", 40);
  await carte(page, "ACQ-02.03").getByRole("button", { name: "Effacer ma réponse" }).click();
  await stabiliser(page, 1300);
  ev = await evolutions(page, ACQ);
  controle("H-18", "réponse effacée : non établie, « Il manque votre réponse »", ev["demandes-12-mois"]?.statut === "non_etablie" && /Il manque votre réponse/.test(ev["demandes-12-mois"].texte) && reponseDb(email, "ACQ-02.03") === null, ev["demandes-12-mois"]?.texte);
  await page.goto(ACQ, { waitUntil: "networkidle" });
  await repondreNombre(page, "ACQ-02.03", 40);
  await repondreNombre(page, "ACQ-02.01", 32);

  // Chiffre d'affaires sur 24 mois (deux tableaux de 12 montants, envoyés à l'API d'enregistrement) : un mois manquant, puis complet.
  await poser(api, "ACQ-23.01", { genre: "valeurs", valeurs: { ...CA("chiffre_d_affaires", 10000), "il_y_a_3_mois.chiffre_d_affaires": null } });
  await poser(api, "ACQ-23.03", { genre: "valeurs", valeurs: CA("chiffre_d_affaires_un_an_plus_tot", 8000) });
  ev = await evolutions(page, ACQ);
  controle("H-19", `données partielles : un mois manquant (${nom(M0 - 3)}) → chiffre d'affaires sur 12 mois non établi, le mois est nommé, jamais compté pour zéro`, ev["chiffre-affaires-12-mois"]?.statut === "non_etablie" && ev["chiffre-affaires-12-mois"].texte.includes(nom(M0 - 3)), ev["chiffre-affaires-12-mois"]?.texte);
  await poser(api, "ACQ-23.01", { genre: "valeurs", valeurs: CA("chiffre_d_affaires", 10000) });
  ev = await evolutions(page, ACQ);
  const caPhrase = `120 000 € (${plage(M0 - 12, M0 - 1)}), contre 96 000 € (${plage(M0 - 24, M0 - 13)}). Écart : +24 000 €, soit +25 %.`;
  controle("H-20", `chiffre d'affaires sur 12 mois, deux années complètes : « ${caPhrase} »`, ev["chiffre-affaires-12-mois"]?.statut === "etablie" && ev["chiffre-affaires-12-mois"].texte.includes(caPhrase.replace(/ /g, " ")), ev["chiffre-affaires-12-mois"]?.texte);
  const evFin = await evolutions(page, FIN);
  controle("H-21", "Finance : la même évolution du chiffre d'affaires, sans que les chiffres soient redemandés (réponses partagées)", evFin["chiffre-affaires-12-mois"]?.statut === "etablie", evFin["chiffre-affaires-12-mois"]?.texte);
  await page.goto(FIN, { waitUntil: "networkidle" });
  const partage = await carte(page, "FIN-14.03").getAttribute("data-partagee");
  controle("H-22", "Finance : FIN-14.03 affichée comme « déjà renseignée », pas redemandée", partage === "oui", String(partage));

  // Périmètre changé entre les deux périodes : non comparable, les deux chiffres restent affichés.
  const milieu = M0 - 8;
  await poser(api, "ACQ-23.13", { genre: "valeurs", valeurs: { changement: "ouverture_ou_fermeture_d_un_etablissemen", mois_du_changement_le_plus_recent: `${Math.floor(milieu / 12)}-${String((milieu % 12) + 1).padStart(2, "0")}` } });
  ev = await evolutions(page, ACQ);
  controle("H-23", `périmètre changé en ${nom(milieu)} : chiffre d'affaires et demandes « non comparables », sans pourcentage`, ev["chiffre-affaires-12-mois"]?.statut === "non_comparable" && ev["demandes-12-mois"]?.statut === "non_comparable" && !/soit/.test(ev["chiffre-affaires-12-mois"].texte), `${ev["chiffre-affaires-12-mois"]?.texte} || ${ev["demandes-12-mois"]?.texte}`);
  await poser(api, "ACQ-23.13", { genre: "valeurs", valeurs: { changement: "aucun_changement", mois_du_changement_le_plus_recent: null } });

  // Réponses de mois différents : la plus ancienne est signalée, la comparaison attend sa mise à jour.
  sql(`update "ReponseAudit" set "modifieLe" = "modifieLe" - interval '35 days' where cle = 'ACQ-02.03' and "userId" = (select id from "User" where email = '${email}')`);
  ev = await evolutions(page, ACQ);
  controle("H-24", "réponses données à deux mois différents : non établie, « mois différents »", ev["demandes-12-mois"]?.statut === "non_etablie" && /mois différents/.test(ev["demandes-12-mois"].texte), ev["demandes-12-mois"]?.texte);
  await page.goto(ACQ, { waitUntil: "networkidle" });
  const ancienne = await carte(page, "ACQ-02.03").locator("[data-periode-ancienne]").innerText().catch(() => "");
  controle("H-25", "la question dit que la réponse porte sur d'autres mois et invite à la mettre à jour", /Votre réponse, donnée en .* porte sur .*Mettez-la à jour/.test(ancienne), ancienne);
  await repondreNombre(page, "ACQ-02.03", 41);
  ev = await evolutions(page, ACQ);
  controle("H-26", "après mise à jour : de nouveau établie (32 contre 41)", ev["demandes-12-mois"]?.statut === "etablie" && ev["demandes-12-mois"].texte.includes("contre 41"), ev["demandes-12-mois"]?.texte);

  // Tableau mois par mois répondu le mois précédent : chaque montant reste en face de son mois.
  await poser(api, "ACQ-23.01", { genre: "valeurs", valeurs: { ...CA("chiffre_d_affaires", 10000), "le_mois_dernier.chiffre_d_affaires": 777 } });
  sql(`update "ReponseAudit" set "modifieLe" = "modifieLe" - interval '35 days' where cle = 'ACQ-23.01' and "userId" = (select id from "User" where email = '${email}')`);
  await page.goto(ACQ, { waitUntil: "networkidle" });
  const decale = await lignesTableau(carte(page, "ACQ-23.01"));
  const deuxieme = decale.find((l) => l.libelle === Nom(M0 - 2));
  const premier = decale.find((l) => l.libelle === Nom(M0 - 1));
  controle("H-27", `réponse du mois précédent : 777 € s'affiche en face de ${Nom(M0 - 2)} (son vrai mois), ${Nom(M0 - 1)} est vide`, deuxieme?.valeurs[0].replace(/\s/g, "") === "777" && premier?.valeurs[0] === "", JSON.stringify(decale.slice(0, 3)));

  // Modification du profil : date de création ramenée à 14 mois. La question disparaît, la réponse reste en base mais ne compte plus.
  await poser(api, "ACQ-23.01", { genre: "valeurs", valeurs: CA("chiffre_d_affaires", 10000) });
  const dossier = (creation) => contexte.request.put(B + "/api/compte/dossier", { data: { chiffreAffairesMensuel: 60000, nombreCollaborateurs: 4, dateCreationEntreprise: creation, typeZone: "PERIURBAINE", ville: "Lyon" } });
  await dossier(creeIlYA(14));
  const codes14 = await codesAffiches(page, ACQ);
  ev = await evolutions(page, ACQ);
  controle("H-28", "profil modifié (14 mois) : ACQ-02.03 n'est plus posée, l'évolution des demandes n'est plus établie et dit pourquoi ; la réponse reste en base", !codes14.has("ACQ-02.03") && ev["demandes-12-mois"]?.statut === "non_etablie" && /Votre entreprise a 14 mois/.test(ev["demandes-12-mois"].texte) && reponseDb(email, "ACQ-02.03") !== null, ev["demandes-12-mois"]?.texte);
  await dossier(creeIlYA(48));
  ev = await evolutions(page, ACQ);
  controle("H-29", "profil rétabli (4 ans) : la réponse gardée compte de nouveau", ev["demandes-12-mois"]?.statut === "etablie", ev["demandes-12-mois"]?.texte);

  // Reprise de session : autre navigateur, mêmes réponses, mêmes évolutions.
  const autre = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const p2 = await autre.newPage();
  await connecter(p2, email);
  const ev2 = await evolutions(p2, ACQ);
  controle("H-30", "reprise sur un autre appareil (téléphone, 390 px) : mêmes évolutions", ev2["demandes-12-mois"]?.texte === ev["demandes-12-mois"]?.texte && ev2["chiffre-affaires-12-mois"]?.texte === ev["chiffre-affaires-12-mois"]?.texte, ev2["demandes-12-mois"]?.texte);
  await p2.goto(ACQ, { waitUntil: "networkidle" });
  const largeur = await p2.evaluate(() => document.documentElement.scrollWidth);
  controle("H-31", "téléphone : la période s'affiche sous la question, sans défilement horizontal", (await periodeDe(p2, "ACQ-02.03"))?.startsWith("Période :") && largeur <= 390, `largeur ${largeur}`);
  await autre.close();
}

const ecarts = ecrire(sortie);
await nav.close();
process.exit(ecarts ? 1 : 0);

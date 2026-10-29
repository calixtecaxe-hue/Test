// Cas de référence : les canaux d'acquisition (ACQ-03.01) et les répartitions qui en dépendent (ACQ-03.02 à 03.06).
// Chaque étape modifie la question source, puis vérifie la question dépendante à l'écran (sans actualiser la page), en base,
// et dans ce qui sert aux calculs (réponse active lue par le serveur : compte rendu, progression, pré-réponse Finance).
//
//   node scripts/verification/canaux.mjs [--sortie docs/verification/resultats]
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium, B, journal, creerCompte, connecter, reponseDb, carte, stabiliser, lignesTableau } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const { controle, ecrire } = journal("canaux");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const { email, page } = await creerCompte(nav, { agents: ["ACQ", "FIN"] });
const URL_ACQ = B + "/audit/acquisition-chiffre-affaires";
// Préparation (par l'API, hors du champ testé) : « faites-vous de la publicité payante ? » = oui, qui ouvre le coût par canal (ACQ-03.05).
await page.request.put(B + "/api/audit/reponses", { data: { cle: "D04", reponse: { genre: "saisie", valeur: "oui" } } });
await page.goto(URL_ACQ, { waitUntil: "networkidle" });
const source = carte(page, "ACQ-03.01");
const repartition = carte(page, "ACQ-03.02");
const couts = carte(page, "ACQ-03.05");
const cocher = async (libelle) => { await source.locator("label.case-option", { hasText: new RegExp(`^${libelle}$`) }).click(); };
const libellesLignes = async (c) => (await lignesTableau(c)).map((l) => l.libelle);
const valeurs = async (c) => Object.fromEntries((await lignesTableau(c)).map((l) => [l.libelle, l.valeurs[0] ?? ""]));
const remplir = async (c, parLibelle) => {
  for (const [lib, v] of Object.entries(parLibelle)) {
    const champ = c.locator("tbody tr", { has: page.locator("th", { hasText: lib }) }).locator("td input").first();
    await champ.fill(String(v));
  }
  await c.locator("tbody tr td input").last().blur();
};
// Ce que les calculs retiennent : la réponse active, calculée par la fonction du serveur (reponsesActives) sur les réponses du
// compte lues en base (scripts/verification/actives.mts).
async function active(cle) {
  if (!existsSync("scripts/verification/actives.mts")) throw new Error("scripts/verification/actives.mts manquant");
  const t = execFileSync("node", ["scripts/verification/actives.mts", email, cle], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(t)[cle] ?? null;
}

// 0. Aucune sélection : la répartition n'est pas encore posée (elle attend les canaux) ; rien ne la remplace par une question vide.
await source.scrollIntoViewIfNeeded();
controle("C-00", "sans canal coché, la répartition par canal n'est pas posée (elle attend la réponse aux canaux)", (await repartition.count()) === 0, `${await repartition.count()} carte(s)`);
const ts = await source.innerText();
controle("C-00b", "la question des canaux annonce que ses choix ouvrent les questions par canal", /(chaque canal coché|questions par canal|répartition)/i.test(ts), ts.slice(0, 300));

// 1. Deux canaux : seules leurs lignes apparaissent, sans actualiser.
await cocher("Bouche-à-oreille");
await cocher("Réseaux sociaux");
await stabiliser(page, 2500);
controle("C-01", "deux canaux cochés : la répartition montre exactement leurs deux lignes, sans actualiser la page", JSON.stringify(await libellesLignes(repartition)) === JSON.stringify(["Bouche-à-oreille", "Réseaux sociaux"]), JSON.stringify(await libellesLignes(repartition)));

// 2. Répartition saisie : enregistrée telle quelle.
await remplir(repartition, { "Bouche-à-oreille": 60, "Réseaux sociaux": 40 });
await stabiliser(page);
const r2 = reponseDb(email, "ACQ-03.02");
controle("C-02", "répartition 60 / 40 enregistrée par canal", r2?.valeurs?.["bouche_a_oreille.part_des_demandes"] === 60 && r2?.valeurs?.["reseaux_sociaux.part_des_demandes"] === 40, JSON.stringify(r2));
await remplir(couts, { "Bouche-à-oreille": 0, "Réseaux sociaux": 150 });
await stabiliser(page);

// 3. Troisième canal ajouté : nouvelle ligne vide, valeurs gardées, et la répartition est signalée à compléter.
await cocher("Fiche Google");
await stabiliser(page, 2500);
const v3 = await valeurs(repartition);
controle("C-03a", "canal ajouté : une ligne « Fiche Google » apparaît, vide, sans toucher aux valeurs 60 et 40", v3["Bouche-à-oreille"] === "60" && v3["Réseaux sociaux"] === "40" && v3["Fiche Google"] === "", JSON.stringify(v3));
const t3 = await repartition.innerText();
controle("C-03b", "canal ajouté : la question dit que la répartition est à revoir pour le nouveau canal (le total ne peut pas être juste en le laissant vide)", /Fiche Google/.test(t3) && /(nouveau canal|à compléter|indiquez sa part|à revoir)/i.test(t3), t3.slice(-300));
controle("C-03c", "canal ajouté : la répartition incomplète ne compte pas comme réponse dans les calculs", (await active("ACQ-03.02")) === null, JSON.stringify(await active("ACQ-03.02")));

// 4. Canal retiré : sa valeur disparaît de l'écran, de la réponse active et des totaux calculés.
await cocher("Réseaux sociaux");
await stabiliser(page, 2500);
const v4 = await valeurs(repartition);
controle("C-04a", "canal retiré : sa ligne disparaît, les autres valeurs restent", !("Réseaux sociaux" in v4) && v4["Bouche-à-oreille"] === "60", JSON.stringify(v4));
const t4 = await repartition.innerText();
controle("C-04b", "canal retiré : le total affiché ne compte plus son ancienne valeur", /Total : 60 sur 100/.test(t4), t4.match(/Total[^\n]*/)?.[0]);
const a4 = await active("ACQ-03.02");
controle("C-04c", "canal retiré : son ancienne valeur ne fait plus partie de la réponse active", a4 === null || !JSON.stringify(a4).includes("reseaux_sociaux"), JSON.stringify(a4));
const a4c = await active("ACQ-03.05");
controle("C-04d", "canal retiré : son coût (150 €) sort des coûts actifs", a4c === null || !JSON.stringify(a4c).includes("reseaux_sociaux"), JSON.stringify(a4c));

// 5. Retour au canal : l'ancienne valeur revient (gardée pour la reprise).
await cocher("Réseaux sociaux");
await stabiliser(page, 2500);
const v5 = await valeurs(repartition);
controle("C-05", "canal coché de nouveau : sa valeur 40 revient", v5["Réseaux sociaux"] === "40", JSON.stringify(v5));

// 6. Ordre : décocher puis recocher ne déplace pas les lignes ; chaque valeur reste sur son canal.
const ordreAvant = await libellesLignes(repartition);
await cocher("Bouche-à-oreille"); await stabiliser(page, 1500);
await cocher("Bouche-à-oreille"); await stabiliser(page, 2500);
const ordreApres = await libellesLignes(repartition);
const v6 = await valeurs(repartition);
controle("C-06a", "décocher puis recocher un canal ne change pas l'ordre des lignes (ordre de la liste des canaux)", JSON.stringify(ordreAvant) === JSON.stringify(ordreApres), `${JSON.stringify(ordreAvant)} → ${JSON.stringify(ordreApres)}`);
controle("C-06b", "chaque valeur reste associée à son canal", v6["Bouche-à-oreille"] === "60" && v6["Réseaux sociaux"] === "40", JSON.stringify(v6));

// 7. Canaux remplacés : les lignes suivent, les anciennes valeurs ne s'affichent pas et ne comptent pas.
for (const l of ["Bouche-à-oreille", "Réseaux sociaux", "Fiche Google"]) await cocher(l);
await cocher("Passage");
await cocher("Partenaires");
await stabiliser(page, 2500);
const v7 = await valeurs(repartition);
controle("C-07a", "canaux remplacés : lignes « Partenaires » et « Passage » seulement, vides", JSON.stringify(Object.keys(v7).sort()) === JSON.stringify(["Partenaires", "Passage"]) && Object.values(v7).every((x) => x === ""), JSON.stringify(v7));
controle("C-07b", "canaux remplacés : aucune ancienne valeur dans la réponse active", (await active("ACQ-03.02")) === null, JSON.stringify(await active("ACQ-03.02")));

// 8. Saisies de répartition : bornes, décimales, formats.
const champ = (lib) => repartition.locator("tbody tr", { has: page.locator("th", { hasText: lib }) }).locator("td input").first();
await champ("Passage").fill("120"); await champ("Passage").blur(); await stabiliser(page, 900);
controle("C-08a", "120 % sur un canal est refusé avec un message", /dépasser 100/.test(await repartition.innerText()), (await repartition.innerText()).slice(-200));
await champ("Passage").fill("33,3"); await champ("Partenaires").fill("66,7"); await champ("Partenaires").blur(); await stabiliser(page);
controle("C-08b", "33,3 + 66,7 = 100 : accepté et enregistré", reponseDb(email, "ACQ-03.02")?.valeurs?.["passage.part_des_demandes"] === 33.3, JSON.stringify(reponseDb(email, "ACQ-03.02")));
await champ("Passage").fill("50 %"); await champ("Partenaires").fill("50%"); await champ("Partenaires").blur(); await stabiliser(page);
controle("C-08c", "« 50 % » et « 50% » sont lus comme 50", reponseDb(email, "ACQ-03.02")?.valeurs?.["passage.part_des_demandes"] === 50, (await repartition.innerText()).slice(-200));
await champ("Passage").fill("40"); await champ("Passage").blur(); await stabiliser(page);
const t8 = await repartition.innerText();
controle("C-08d", "total faux (90) : expliqué, la saisie est gardée, l'ancienne réponse juste n'est pas remplacée", /Le total doit faire 100/.test(t8) && reponseDb(email, "ACQ-03.02")?.valeurs?.["passage.part_des_demandes"] === 50, t8.slice(-250));
await champ("Passage").fill("50"); await champ("Passage").blur(); await stabiliser(page);

// 9. Question source effacée : les tableaux redemandent les canaux, rien d'ancien ne compte.
await source.getByRole("button", { name: "Effacer ma réponse" }).click();
await stabiliser(page, 2500);
controle("C-09a", "source effacée : la répartition n'est plus posée (elle attend de nouveau les canaux)", (await repartition.count()) === 0, `${await repartition.count()} carte(s)`);
controle("C-09b", "source effacée : la répartition ne compte plus dans les calculs", (await active("ACQ-03.02")) === null, JSON.stringify(await active("ACQ-03.02")));

// 10. Retour des canaux, actualisation, reconnexion : l'état est le même partout.
await cocher("Passage"); await cocher("Partenaires"); await stabiliser(page, 2500);
const avantRecharge = await valeurs(repartition);
await page.reload({ waitUntil: "networkidle" });
const apresRecharge = await valeurs(carte(page, "ACQ-03.02"));
controle("C-10a", "après actualisation : mêmes lignes et mêmes valeurs", JSON.stringify(avantRecharge) === JSON.stringify(apresRecharge) && apresRecharge.Passage === "50", `${JSON.stringify(avantRecharge)} → ${JSON.stringify(apresRecharge)}`);
const autre = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const tel = await autre.newPage();
await connecter(tel, email);
await tel.goto(URL_ACQ, { waitUntil: "networkidle" });
const surTel = await valeurs(carte(tel, "ACQ-03.02"));
controle("C-10b", "reconnexion sur un autre appareil (390 px) : mêmes lignes et mêmes valeurs", JSON.stringify(surTel) === JSON.stringify(apresRecharge), JSON.stringify(surTel));
const largeur = await tel.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
controle("C-10c", "390 px : la page ne défile pas de côté (le tableau défile dans son cadre)", largeur, await tel.evaluate(() => `${document.documentElement.scrollWidth}/${innerWidth}`));

// 11. Formulation : la mesure et la période sont dites.
const texte = (await carte(page, "ACQ-03.02").locator("p").first().innerText()).trim();
controle("C-11", "la répartition dit ce qu'elle mesure (demandes) et sur quelle période", /demande/i.test(texte) && /(sur les \d+ derniers mois|par mois|sur un an|sur l'année)/i.test(texte), texte);

const n = ecrire(sortie);
await nav.close();
console.log(`compte de test : ${email}`);
process.exit(n === 0 ? 0 : 1);

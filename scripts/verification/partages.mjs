// Données partagées entre agents (audit final du 29 octobre, data/partages.json) : une donnée partagée est posée une seule fois,
// et seulement avec sa vraie jumelle chez l'autre agent, ou composée des parties données ailleurs. Ce contrôle répond chez un
// agent (par l'API, comme l'écran) puis ouvre l'autre agent dans le navigateur et lit la carte : « déjà renseigné »
// (data-partagee="oui") pour une jumelle ou une question entièrement composée, question posée normalement pour une donnée qui
// n'est qu'utilisée par un calcul, question posée avec les valeurs connues reprises (data-reprise) quand une partie seulement
// est connue. Il couvre les six liens du classeur qui ne sont pas des partages, les jumelles, et les correspondances partie à
// partie (champs, colonnes et lignes de tableau), dans les deux sens, avec une modification depuis l'autre agent.
//
//   node scripts/verification/partages.mjs [--sortie docs/verification/resultats]
import { chromium, B, journal, creerCompte, reponseDb, attendreEnregistre } from "./outils.mjs";

const args = process.argv.slice(2);
const sortie = args.includes("--sortie") ? args[args.indexOf("--sortie") + 1] : "docs/verification/resultats";
const { controle, ecrire } = journal("partages");
const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });
const SLUG = { ACQ: "acquisition-chiffre-affaires", FIN: "finance-rentabilite", RH: "rh-organisation", COM: "comm-creation-contenu" };
const exact = (valeur) => ({ genre: "exact", valeur });
const saisie = (valeur) => ({ genre: "saisie", valeur });
const valeurs = (v) => ({ genre: "valeurs", valeurs: v });

async function repondre(api, cle, reponse) {
  const r = await api.put(`${B}/api/audit/reponses`, { data: { cle, reponse } });
  if (!r.ok()) throw new Error(`${cle} : ${r.status()} ${await r.text()}`);
}
// État de la carte d'une question sur la page d'un agent : absente, posée, posée avec des valeurs reprises, ou « déjà renseignée ».
async function etat(page, agent, code) {
  await page.goto(`${B}/audit/${SLUG[agent]}`, { waitUntil: "networkidle" });
  const c = page.locator(`li[data-question="${code}"]`).first();
  if ((await c.count()) === 0) return { vu: "absente", carte: c };
  if ((await c.getAttribute("data-partagee")) === "oui") return { vu: "deja", carte: c };
  return { vu: (await c.locator("[data-reprise]").count()) > 0 ? "reprise" : "posee", carte: c };
}
const NOMS = { deja: "« déjà renseigné »", posee: "posée", reprise: "posée avec des valeurs reprises", absente: "absente" };
async function verifier(id, attendu, page, agent, code, mots) {
  const r = await etat(page, agent, code);
  controle(id, mots, r.vu === attendu, `${code} chez ${agent} : ${NOMS[r.vu]}`);
  return r;
}
const champs = (c) => c.locator("input:not([type=checkbox]):not([type=radio]), select").evaluateAll((els) => els.map((e) => e.value));
const texteCarte = async (c) => (await c.innerText()).replace(/\s+/g, " ");
// Comparaison d'une réponse lue en base : la base ne garde pas l'ordre des clés.
const trie = (v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, trie(v[k])])) : v);
const meme = (a, b) => JSON.stringify(trie(a)) === JSON.stringify(trie(b));

// 1. Électricien (artisan), 4 personnes, les quatre agents, niveau approfondi : les liens qui ne sont pas des partages.
{
  const { page, api } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
  await repondre(api, "ACQ-21.03", exact(30));
  await verifier("P-01", "posee", page, "RH", "RH-07.01", "capacité maximale de ventes (ACQ-21.03) donnée : les heures en plus acceptables (RH-07.01) restent demandées");
  await repondre(api, "D18", saisie("oui"));
  await repondre(api, "ACQ-21.04", valeurs({ heures_travaillees: 300, heures_facturees: 250 }));
  await verifier("P-02", "posee", page, "RH", "RH-06.02", "heures travaillées et facturées de l'équipe (ACQ-21.04) données : les heures réelles d'un salarié (RH-06.02) restent demandées");
  await verifier("P-03", "posee", page, "RH", "RH-05.01", "… et les jours et heures du dirigeant (RH-05.01) aussi");
  await verifier("P-04", "deja", page, "FIN", "FIN-07.03", "vraie jumelle : FIN-07.03 (heures travaillées et facturées) est « déjà renseignée » d'après ACQ-21.04");
  await repondre(api, "RH-06.04", exact(18000));
  await verifier("P-05", "deja", page, "FIN", "FIN-07.01", "vraie jumelle : la masse salariale (FIN-07.01) est « déjà renseignée » d'après RH-06.04");
  // Les canaux d'abord (sans « Site internet ») : « Avez-vous un site ? » (COM-13.10) est alors posée, et la réponse « oui »
  // ouvre les visites du site.
  await repondre(api, "ACQ-03.01", saisie(["bouche_a_oreille", "fiche_google"]));
  await repondre(api, "ACQ-02.01", exact(40));
  await repondre(api, "COM-10.07", saisie("oui_au_moins_une_fois_par_mois"));
  await repondre(api, "COM-13.10", saisie("oui"));
  await verifier("P-06", "posee", page, "COM", "COM-13.01", "nombre de demandes (ACQ-02.01) donné : les visites du site (COM-13.01) restent demandées");
  // Répartition par canal : une colonne de COM-12.01 par tableau de l'Acquisition.
  await repondre(api, "ACQ-03.02", valeurs({ "bouche_a_oreille.part_des_demandes": 60, "fiche_google.part_des_demandes": 40 }));
  const p07a = await verifier("P-07a", "reprise", page, "COM", "COM-12.01", "un seul des trois tableaux de l'Acquisition répondu : la répartition de la Comm (COM-12.01) est posée, avec la colonne connue reprise");
  const vus = await champs(p07a.carte);
  controle("P-07b", "la colonne reprise est remplie (60 et 40), les deux autres colonnes sont vides", vus.includes("60") && vus.includes("40") && vus.filter((v) => v !== "").length === 2, JSON.stringify(vus));
  await repondre(api, "ACQ-03.03", valeurs({ "bouche_a_oreille.part_des_nouveaux_clients": 70, "fiche_google.part_des_nouveaux_clients": 30 }));
  await repondre(api, "ACQ-03.04", valeurs({ "bouche_a_oreille.part_du_chiffre_d_affaires": 80, "fiche_google.part_du_chiffre_d_affaires": 20 }));
  const p07c = await verifier("P-07c", "deja", page, "COM", "COM-12.01", "les trois tableaux répondus : COM-12.01 est « déjà renseignée », composée des trois");
  const t07 = await texteCarte(p07c.carte);
  controle("P-07d", "la carte nomme les trois questions d'où vient la réponse", (t07.match(/« Sur les 12 derniers mois/g) ?? []).length === 3, t07);
}
// 2. Même métier, dans l'autre sens : les visites du site données d'abord.
{
  const { page, api } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
  await repondre(api, "ACQ-03.01", saisie(["bouche_a_oreille"]));
  await repondre(api, "COM-10.07", saisie("oui_au_moins_une_fois_par_mois"));
  await repondre(api, "COM-13.10", saisie("oui"));
  await repondre(api, "COM-13.01", exact(900));
  await verifier("P-08a", "posee", page, "COM", "COM-13.01", "témoin : les visites du site (COM-13.01) sont posées et répondues chez la Comm");
  await verifier("P-08", "posee", page, "ACQ", "ACQ-02.01", "visites du site (COM-13.01) données : le nombre de demandes de devis (ACQ-02.01) reste demandé");
  await repondre(api, "ACQ-03.01", saisie(["bouche_a_oreille", "site_internet"]));
  await verifier("P-09", "deja", page, "ACQ", "ACQ-06.07", "vraie jumelle : les visites du site côté Acquisition (ACQ-06.07) sont « déjà renseignées »");
}
// 3. Restaurant : couverts par service et ventes par mois ; avis Google et avis de la plateforme.
{
  const { page, api } = await creerCompte(nav, { metier: "restaurant", agents: ["ACQ", "FIN", "RH", "COM"] });
  await repondre(api, "ACQ-11.07", valeurs({ "midi.couverts_par_service": 40, "soir.couverts_par_service": 30 }));
  await verifier("P-10", "posee", page, "FIN", "FIN-06.02", "couverts par service (ACQ-11.07) donnés : les ventes par mois (FIN-06.02) restent demandées");
  await repondre(api, "COM-44.01", valeurs({ avis_au_total: 120, note_sur_5: 4.6, avis_recus_sur_les_6_derniers_mois: 18 }));
  await repondre(api, "ACQ-03.01", saisie(["fiche_google", "plateformes"]));
  await verifier("P-11", "posee", page, "ACQ", "ACQ-06.08", "avis Google (COM-44.01) donnés : les avis de la plateforme principale (ACQ-06.08) restent demandés");
  await verifier("P-12", "deja", page, "ACQ", "ACQ-06.01", "vraie jumelle : les avis Google côté Acquisition (ACQ-06.01) sont « déjà renseignés »");
}
// 4. Dépenses marketing : COM-32.01 (trois champs) et ACQ-07.01, 07.03, 07.04 (trois questions).
{
  const { email, page, api } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
  await repondre(api, "COM-10.07", saisie("oui_au_moins_une_fois_par_mois"));
  await repondre(api, "D04", saisie("oui"));
  await repondre(api, "ACQ-07.03", exact(200));
  const p13 = await verifier("P-13", "reprise", page, "COM", "COM-32.01", "dépense de contenu donnée à l'Acquisition : COM-32.01 est posée, ce montant repris");
  const v13 = await champs(p13.carte);
  controle("P-13b", "le champ « Création de contenu » est rempli (200), les deux autres sont vides", v13[0] === "200" && v13.filter((v) => v !== "").length === 1, JSON.stringify(v13));
  controle("P-13c", "afficher la question ne l'enregistre pas : COM-32.01 n'a pas de réponse en base", reponseDb(email, "COM-32.01") === null, JSON.stringify(reponseDb(email, "COM-32.01")));
  await repondre(api, "ACQ-07.01", exact(300));
  await repondre(api, "ACQ-07.04", exact(50));
  const p14 = await verifier("P-14", "deja", page, "COM", "COM-32.01", "les trois dépenses données : COM-32.01 est « déjà renseignée »");
  const t14 = await texteCarte(p14.carte);
  controle("P-14b", "la carte montre chaque champ avec son montant (200, 300, 50 €)", /Création de contenu[^;]*: 200\s€/.test(t14) && /Agence ou prestataire marketing : 300\s€/.test(t14) && /Outils marketing : 50\s€/.test(t14), t14);
  // Modifier depuis la Comm : les trois questions de l'Acquisition s'ouvrent ; la réponse s'enregistre chez elles.
  await p14.carte.getByRole("button", { name: "Modifier cette réponse" }).click();
  const ouvertes = await page.locator('li[data-question="ACQ-07.03"], li[data-question="ACQ-07.01"], li[data-question="ACQ-07.04"]').count();
  controle("P-15", "« Modifier cette réponse » ouvre les trois questions de l'Acquisition sur la page de la Comm", ouvertes === 3, `${ouvertes} carte(s)`);
  const c703 = page.locator('li[data-question="ACQ-07.03"]').first();
  await c703.locator("input").first().fill("250");
  await c703.locator("input").first().blur();
  await attendreEnregistre(c703);
  controle("P-15b", "le montant corrigé s'enregistre dans ACQ-07.03 (250)", meme(reponseDb(email, "ACQ-07.03"), exact(250)), JSON.stringify(reponseDb(email, "ACQ-07.03")));
  const p15 = await etat(page, "COM", "COM-32.01");
  controle("P-15c", "après actualisation, COM-32.01 montre le nouveau montant", p15.vu === "deja" && /Création de contenu[^;]*: 250\s€/.test(await texteCarte(p15.carte)), await texteCarte(p15.carte));
  // Valeur reprise puis question complétée : la réponse de la Comm s'enregistre avec les trois montants.
  const { email: e3, page: p3, api: api3 } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
  await repondre(api3, "COM-10.07", saisie("oui_au_moins_une_fois_par_mois"));
  await repondre(api3, "ACQ-07.03", exact(200));
  const p13d = await etat(p3, "COM", "COM-32.01");
  const entrees = p13d.carte.locator("input:not([type=checkbox]):not([type=radio])");
  await entrees.nth(1).fill("300");
  await entrees.nth(2).fill("50");
  await entrees.nth(2).blur();
  await attendreEnregistre(p13d.carte);
  controle("P-13d", "le dirigeant complète les deux champs vides : COM-32.01 s'enregistre avec les trois montants (200 repris, 300, 50)", meme(reponseDb(e3, "COM-32.01"), valeurs({ creation_de_contenu_photographe_videaste: 200, agence_ou_prestataire_marketing: 300, outils_marketing: 50 })), JSON.stringify(reponseDb(e3, "COM-32.01")));
  const apres = await etat(p3, "COM", "COM-32.01");
  controle("P-13e", "après actualisation, la question a sa propre réponse (plus de valeurs reprises)", apres.vu === "posee" && JSON.stringify(await champs(apres.carte)) === JSON.stringify(["200", "300", "50"]), `${NOMS[apres.vu]} ${JSON.stringify(await champs(apres.carte))}`);
  // Dans l'autre sens : la Comm répond pour les trois.
  const { page: p2, api: api2 } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
  await repondre(api2, "COM-10.07", saisie("oui_au_moins_une_fois_par_mois"));
  await repondre(api2, "D04", saisie("oui"));
  await repondre(api2, "COM-32.01", valeurs({ creation_de_contenu_photographe_videaste: 200, agence_ou_prestataire_marketing: 300, outils_marketing: 50 }));
  const p16 = await verifier("P-16", "deja", p2, "ACQ", "ACQ-07.01", "COM-32.01 donnée : la dépense d'agence (ACQ-07.01) est « déjà renseignée »");
  controle("P-16b", "la carte montre le montant du champ (300 €), pas le groupe entier", /Votre réponse : 300\s€/.test(await texteCarte(p16.carte)), await texteCarte(p16.carte));
}
// 5. Fréquence de lecture des chiffres : une ligne du tableau ACQ-20.02 pour FIN-34.02 et COM-43.01 ; reprises de la RH et de la Finance.
{
  const { page, api } = await creerCompte(nav, { agents: ["ACQ", "FIN", "RH", "COM"] });
  await repondre(api, "COM-10.07", saisie("oui_au_moins_une_fois_par_mois"));
  await repondre(api, "FIN-34.02", saisie("chaque_mois"));
  await repondre(api, "COM-43.01", saisie("jamais"));
  const p17 = await verifier("P-17", "reprise", page, "ACQ", "ACQ-20.02", "FIN-34.02 et COM-43.01 répondues : le tableau ACQ-20.02 est posé (la ligne des chiffres commerciaux manque), leurs réponses reprises");
  const v17 = await champs(p17.carte);
  controle("P-17b", "les lignes « chiffres financiers » et « statistiques de communication » sont remplies, la ligne commerciale est vide", JSON.stringify(v17) === JSON.stringify(["", "chaque_mois", "jamais"]), JSON.stringify(v17));
  await repondre(api, "ACQ-20.02", valeurs({ "chiffres_commerciaux_demandes_clients_ch.frequence": "chaque_semaine", "chiffres_financiers_tresorerie_marge_cha.frequence": "chaque_trimestre", "statistiques_de_communication.frequence": "jamais" }));
  await repondre(api, "FIN-34.02", null);
  const p18 = await verifier("P-18", "deja", page, "FIN", "FIN-34.02", "réponse de la Finance effacée, tableau ACQ-20.02 répondu : FIN-34.02 est « déjà renseignée » d'après sa ligne");
  controle("P-18b", "la carte montre le libellé du choix (« Chaque trimestre »), pas son identifiant", /Votre réponse : Chaque trimestre/.test(await texteCarte(p18.carte)), await texteCarte(p18.carte));
  await repondre(api, "FIN-10.01", valeurs({ reprises_par_mois: 4, retours_par_mois: 0, gestes_commerciaux_par_mois: 0, cout_moyen_d_une_reprise: 150, cout_moyen_d_un_geste_commercial: 0 }));
  await repondre(api, "FIN-10.03", exact(2));
  const p19 = await verifier("P-19", "deja", page, "RH", "RH-16.01", "reprises (FIN-10.01) et temps par reprise (FIN-10.03) donnés : RH-16.01 est « déjà renseignée »");
  controle("P-19b", "la carte montre les deux champs (4 reprises, 2 heures)", /Reprises par mois : 4 ; Temps moyen d'une reprise : 2\sheures/.test(await texteCarte(p19.carte)), await texteCarte(p19.carte));
}
// 6. Boutique en ligne : ACQ-02.01 se lit « visiteurs de votre site » ; c'est alors la même donnée que COM-13.01.
{
  const { page, api } = await creerCompte(nav, { metier: "e-commercant", agents: ["ACQ", "FIN", "RH", "COM"] });
  await repondre(api, "ACQ-03.01", saisie(["bouche_a_oreille"]));
  await repondre(api, "COM-10.07", saisie("oui_au_moins_une_fois_par_mois"));
  await repondre(api, "COM-13.10", saisie("oui"));
  await repondre(api, "COM-13.01", exact(900));
  await verifier("P-20", "deja", page, "ACQ", "ACQ-02.01", "boutique en ligne : les visiteurs du site (ACQ-02.01) sont « déjà renseignés » d'après COM-13.01");
}

// 7. Finance et RH sans l'Acquisition : le chiffre d'affaires mois par mois est la même question chez les trois agents.
{
  const { page, api } = await creerCompte(nav, { agents: ["FIN", "RH"] });
  await repondre(api, "FIN-14.01", valeurs({ "le_mois_dernier.chiffre_d_affaires": 52000, "il_y_a_2_mois.chiffre_d_affaires": 48000 }));
  await verifier("P-21", "deja", page, "RH", "RH-11.01", "chiffre d'affaires mois par mois donné à la Finance : la RH ne le redemande pas (RH-11.01 « déjà renseignée »)");
}

await nav.close();
process.exit(ecrire(sortie) > 0 ? 1 : 0);

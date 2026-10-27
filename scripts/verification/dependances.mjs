// Contrôle navigateur des règles d'affichage, dans les deux sens (vérification du 28 octobre). Joue le plan écrit par
// plan-dependances.mts : pour chaque règle, un compte fictif, les réponses de départ posées par l'API (hors du champ testé),
// puis la réponse qui décide de la règle changée **à l'écran**, comme le ferait le dirigeant :
//   a. règle vraie : les questions qu'elle ouvre sont affichées, les autres non ;
//   b. réponse changée à l'écran (règle fausse) : l'écran se met à jour sans actualiser la page ;
//   c. une question ouverte, répondue avant le changement, ne compte plus (réponse active) mais reste gardée en base ;
//   d. retour au premier choix à l'écran : les questions reviennent, la réponse gardée compte de nouveau ;
//   e. après actualisation de la page : même état.
// Les règles sur la taille (effectif) se jouent en changeant l'effectif dans « Mon compte ».
//
//   node scripts/verification/plan-dependances.mts
//   node scripts/verification/dependances.mjs [--seulement D-001,M-083,T-01] [--reprendre] [--sortie docs/verification/resultats]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium, B, creerCompte, AGENTS, reponseDb, stabiliser } from "./outils.mjs";

const args = process.argv.slice(2);
const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const sortie = arg("--sortie") ?? "docs/verification/resultats";
const seulement = arg("--seulement")?.split(",") ?? null;
const fichier = `${sortie}/dependances.json`;
mkdirSync(sortie, { recursive: true });

const plan = JSON.parse(readFileSync("docs/verification/plan-dependances.json", "utf8"));
const banque = new Map(JSON.parse(readFileSync("data/banque/questions.json", "utf8")).map((q) => [q.donnee, q]));
const routage = JSON.parse(readFileSync("data/routage.json", "utf8"));
const COURT = Object.fromEntries(Object.entries(AGENTS).map(([k, a]) => [a.code, k]));
const url = (agent) => `${B}/audit/${AGENTS[COURT[agent]].slug}`;

// Résultats : conforme, écart (comportement observé différent de l'attendu) ou bloqué (le contrôle n'a pas pu être joué).
const resultats = args.includes("--reprendre") && existsSync(fichier) ? JSON.parse(readFileSync(fichier, "utf8")).resultats : [];
const dejaJoues = new Set(resultats.map((r) => r.item));
function noter(item, id, attendu, statut, observe = "") {
  resultats.push({ item, id, attendu, statut, observe: String(observe ?? "").slice(0, 600) });
  console.log(`${statut === "conforme" ? "conforme" : statut === "ecart" ? "ÉCART   " : "BLOQUÉ  "}  ${id.padEnd(9)} ${attendu}${statut === "conforme" ? "" : ` — ${String(observe).slice(0, 220)}`}`);
}
const ecrire = () => writeFileSync(fichier, JSON.stringify({ le: new Date().toISOString(), resultats }, null, 1));

// Réponses actives du compte (ce que les calculs retiennent), par la fonction du serveur.
function actives(email, cles) {
  return JSON.parse(execFileSync("node", ["scripts/verification/actives.mts", email, ...cles], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
}

const visibles = async (page) =>
  new Set(await page.locator("[data-question],[data-question-imbriquee]").evaluateAll((els) => els.map((e) => e.getAttribute("data-question") ?? e.getAttribute("data-question-imbriquee"))));
function comparer(vus, cibles, attendu) {
  const manquent = cibles.filter((c) => attendu.includes(c) && !vus.has(c));
  const enTrop = cibles.filter((c) => !attendu.includes(c) && vus.has(c));
  return { ok: manquent.length === 0 && enTrop.length === 0, detail: `${manquent.length ? `absentes : ${manquent.join(", ")} ` : ""}${enTrop.length ? `affichées à tort : ${enTrop.join(", ")}` : ""}` };
}

// Pose une réponse par l'API (départ du scénario). Les tableaux dont les lignes viennent d'une autre réponse sont refusés tant
// que cette réponse manque : on reprend jusqu'à ce que plus rien ne passe.
async function poserApi(page, reponses) {
  let reste = Object.entries(reponses).filter(([, r]) => r !== null);
  for (let tour = 0; tour < 6 && reste.length; tour++) {
    const refus = [];
    for (const [cle, reponse] of reste) {
      const r = await page.request.put(B + "/api/audit/reponses", { data: { cle, reponse } });
      if (!r.ok()) refus.push([cle, reponse, await r.text()]);
    }
    if (refus.length === reste.length) return refus;
    reste = refus.map(([c, r]) => [c, r]);
  }
  return [];
}

// --- Changer une réponse à l'écran ------------------------------------------------------------------------------------

const carteDe = (page, code) => page.locator(`[data-question="${code}"], [data-question-imbriquee="${code}"]`).first();

async function cliquerCase(scope, selecteurEntree) {
  const label = scope.locator(`label.case-option:has(${selecteurEntree})`).first();
  await label.scrollIntoViewIfNeeded();
  await label.click();
}

async function poserCadrage(page, cle, r) {
  if ((await page.locator(`input[name="${cle}"]`).count()) === 0) return "absente";
  if (r === null) {
    const effacer = page.locator(`div:has(> fieldset input[name="${cle}"]) > button`, { hasText: "Effacer ma réponse" });
    if (await effacer.count()) await effacer.first().click();
    else if (await page.locator(`input[name="${cle}"]:checked`).count()) return "une question de cadrage répondue n'a pas de bouton « Effacer ma réponse »";
    return null;
  }
  if (Array.isArray(r.valeur)) {
    const options = await page.locator(`input[name="${cle}"]`).evaluateAll((els) => els.map((e) => ({ v: e.value, c: e.checked })));
    for (const o of options) if (o.c !== r.valeur.includes(o.v)) await cliquerCase(page, `input[name="${cle}"][value="${o.v}"]`);
  } else {
    await cliquerCase(page, `input[name="${cle}"][value="${r.valeur}"]`);
  }
  return null;
}

async function poserCarte(page, code, r, autre) {
  let c = carteDe(page, code);
  if ((await c.count()) === 0) return "absente";
  const modifier = c.getByRole("button", { name: "Modifier cette réponse" });
  if (await modifier.count()) { await modifier.click(); c = carteDe(page, code); }
  await c.scrollIntoViewIfNeeded();
  const spec = banque.get(code)?.reponse ?? null;
  if (r === null) {
    const eff = c.getByRole("button", { name: "Effacer ma réponse" });
    if (await eff.count()) await eff.click();
    return null;
  }
  if (r.genre === "exact") {
    const champ = c.locator('input[id$="-exact"]').first();
    await champ.fill(String(r.valeur).replace(".", ","));
    await champ.press("Tab");
    return null;
  }
  if (r.genre === "saisie" && Array.isArray(r.valeur)) {
    const options = await c.locator('input[type="checkbox"]').evaluateAll((els) => els.map((e) => ({ v: e.value, c: e.checked })));
    const voulues = new Set(r.valeur);
    // Décocher d'abord, puis cocher : une option exclusive (« Aucun ») ne retire pas une case qu'on veut garder.
    for (const o of options) if (o.c && !voulues.has(o.v)) await cliquerCase(c, `input[type="checkbox"][value="${o.v}"]`);
    for (const o of options) if (!o.c && voulues.has(o.v)) await cliquerCase(c, `input[type="checkbox"][value="${o.v}"]`);
    return null;
  }
  if (r.genre === "saisie" && (spec?.type === "choix" || spec?.type === "oui_non")) {
    await cliquerCase(c, `input[type="radio"][value="${r.valeur}"]`);
    return null;
  }
  if (r.genre === "saisie") {
    const champ = c.locator('textarea, input[type="month"], input[type="text"]').first();
    await champ.fill(String(r.valeur));
    await champ.press("Tab");
    return null;
  }
  if (r.genre === "valeurs") {
    // Les champs de l'autre état qui ne sont pas dans celui-ci sont vidés.
    const cles = [...new Set([...Object.keys(r.valeurs), ...Object.keys(autre?.genre === "valeurs" ? autre.valeurs : {})])];
    let dernier = null;
    for (const k of cles) {
      const v = r.valeurs[k] ?? null;
      const champ = c.locator(`[id$="-${k.replace(".", "-")}"]`).first();
      if ((await champ.count()) === 0) return `champ ${k} introuvable dans la carte`;
      const tag = await champ.evaluate((e) => e.tagName);
      if (tag === "DIV") {
        const presse = await champ.locator('button[aria-pressed="true"]').innerText().catch(() => "");
        const voulu = v === "oui" ? "Oui" : v === "non" ? "Non" : null;
        if (voulu && presse !== voulu) await champ.getByRole("button", { name: voulu }).click();
        if (!voulu && presse) await champ.getByRole("button", { name: presse }).click();
      } else if (tag === "SELECT") {
        await champ.selectOption(v === null ? "" : String(v));
      } else {
        await champ.fill(v === null ? "" : String(v).replace(".", ","));
        dernier = champ;
      }
    }
    if (dernier) await dernier.press("Tab");
    return null;
  }
  return `réponse de forme ${r.genre} non jouée`;
}

// Cherche la question sur la page de l'agent, puis sur celles des autres agents ouverts. Rend la page où elle a été changée.
async function poserEcran(page, agent, agents, cle, r, autre) {
  const ordre = [agent, ...agents.filter((a) => a !== agent)];
  for (const a of ordre) {
    if (page.url() !== url(a)) await page.goto(url(a), { waitUntil: "networkidle" });
    const res = /^D\d/.test(cle) ? await poserCadrage(page, cle, r) : await poserCarte(page, cle, r, autre);
    if (res === "absente") continue;
    return { erreur: res, agentSource: a };
  }
  return { erreur: `question ${cle} introuvable à l'écran (agents ${ordre.map((a) => COURT[a]).join(", ")})`, agentSource: null };
}

// Une question ouverte par la règle, à réponse simple, répondue avant le changement : sert à vérifier qu'elle ne compte plus.
function temoinReponse(cibles) {
  for (const code of cibles) {
    const s = banque.get(code)?.reponse;
    if (s?.type === "nombre") return { code, reponse: { genre: "exact", valeur: Math.max(s.min ?? 0, Math.min(s.max ?? 3, 3)) } };
    if (s?.type === "oui_non") return { code, reponse: { genre: "saisie", valeur: "oui" } };
    if (s?.type === "choix") return { code, reponse: { genre: "saisie", valeur: s.options[0].id } };
  }
  return null;
}

function agentsDuMetier(metier, sousVariantes) {
  const m = routage.metiers.find((x) => x.id === metier);
  const sv = (m?.sousVariantes ?? []).filter((v) => sousVariantes.includes(v.id));
  const comm = [m?.agentComm, ...sv.map((v) => v.agentComm)].every((x) => x === undefined || x === "oui");
  return comm ? ["ACQ", "FIN", "RH", "COM"] : ["ACQ", "FIN", "RH"];
}

const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-bypass-list=*"] });

// --- Règles sur les réponses ---------------------------------------------------------------------------------------------
for (const it of plan.items) {
  if (seulement && !seulement.includes(it.id)) continue;
  if (dejaJoues.has(it.id)) continue;
  const p = `${it.id}`;
  const titre = `${it.regle} [${it.lisible}]`;
  let compte;
  try {
    compte = await creerCompte(nav, { metier: it.compte.metier, sousVariantes: it.compte.sousVariantes, effectif: it.compte.effectif, creation: "2006-10-01", agents: agentsDuMetier(it.compte.metier, it.compte.sousVariantes) });
  } catch (err) {
    noter(it.id, p, titre, "bloque", `compte non créé : ${err.message}`);
    ecrire();
    continue;
  }
  const { email, page, contexte } = compte;
  const agents = agentsDuMetier(it.compte.metier, it.compte.sousVariantes).map((a) => AGENTS[a].code);
  try {
    const refus = await poserApi(page, { ...it.base, ...it.vrai });
    if (refus.length) { noter(it.id, `${p}-0`, `${titre} : réponses de départ`, "bloque", refus.map((x) => `${x[0]} ${x[2]}`).join(" | ")); continue; }
    await page.goto(url(it.agent), { waitUntil: "networkidle" });
    const a = comparer(await visibles(page), it.cibles, it.attenduVrai);
    noter(it.id, `${p}-a`, `${titre} : règle vraie, ${it.attenduVrai.length} question(s) affichée(s)`, a.ok ? "conforme" : "ecart", a.detail);

    const tem = temoinReponse(it.attenduVrai.filter((c) => !it.attenduFaux.includes(c)));
    if (tem) await poserApi(page, { [tem.code]: tem.reponse });

    // b. Changement à l'écran, sans actualiser.
    let source = null;
    let bloque = null;
    for (const k of it.cles) {
      const r = await poserEcran(page, it.agent, agents, k, it.faux[k], it.vrai[k]);
      if (r.erreur) { bloque = r.erreur; break; }
      source = r.agentSource;
      await stabiliser(page, 2200);
    }
    if (bloque) { noter(it.id, `${p}-b`, `${titre} : changement à l'écran`, "bloque", bloque); continue; }
    const surPlace = source === it.agent;
    if (!surPlace) await page.goto(url(it.agent), { waitUntil: "networkidle" });
    const b = comparer(await visibles(page), it.cibles, it.attenduFaux);
    noter(it.id, `${p}-b`, `${titre} : règle fausse${surPlace ? " (sans actualiser la page)" : ` (question source dans l'audit ${COURT[source]})`}, ${it.attenduFaux.length} question(s) affichée(s)`, b.ok ? "conforme" : "ecart", b.detail);

    // c. La réponse donnée avant le changement ne compte plus, mais reste gardée.
    if (tem) {
      const act = actives(email, [tem.code])[tem.code];
      const enBase = reponseDb(email, tem.code);
      noter(it.id, `${p}-c`, `${titre} : la réponse à ${tem.code} ne compte plus et reste gardée`, act === null && enBase !== null ? "conforme" : "ecart", `active ${JSON.stringify(act)}, en base ${JSON.stringify(enBase)}`);
    }

    // d. Retour au premier choix, à l'écran.
    for (const k of it.cles) {
      const r = await poserEcran(page, it.agent, agents, k, it.vrai[k], it.faux[k]);
      if (r.erreur) { bloque = r.erreur; break; }
      source = r.agentSource;
      await stabiliser(page, 2200);
    }
    if (bloque) { noter(it.id, `${p}-d`, `${titre} : retour au premier choix`, "bloque", bloque); continue; }
    if (page.url() !== url(it.agent)) await page.goto(url(it.agent), { waitUntil: "networkidle" });
    const d = comparer(await visibles(page), it.cibles, it.attenduVrai);
    noter(it.id, `${p}-d`, `${titre} : retour au premier choix, les questions reviennent`, d.ok ? "conforme" : "ecart", d.detail);
    if (tem) {
      const act = actives(email, [tem.code])[tem.code];
      noter(it.id, `${p}-d2`, `${titre} : la réponse gardée à ${tem.code} compte de nouveau`, JSON.stringify(act) === JSON.stringify(tem.reponse) ? "conforme" : "ecart", JSON.stringify(act));
    }

    // e. Après actualisation.
    await page.reload({ waitUntil: "networkidle" });
    const e = comparer(await visibles(page), it.cibles, it.attenduVrai);
    noter(it.id, `${p}-e`, `${titre} : après actualisation, même état`, e.ok ? "conforme" : "ecart", e.detail);
  } catch (err) {
    noter(it.id, `${p}-x`, titre, "bloque", `exception : ${err.message.split("\n")[0]}`);
  } finally {
    await contexte.close();
    ecrire();
  }
}

// --- Règles sur la taille (effectif changé dans Mon compte) ----------------------------------------------------------------
async function changerEffectif(page, n) {
  await page.goto(B + "/compte", { waitUntil: "networkidle" });
  await page.fill("#compte-effectif", String(n));
  await page.getByRole("button", { name: "Enregistrer les informations de mon entreprise" }).click();
  await page.getByText(/^Enregistré\./).waitFor({ timeout: 10000 });
}
for (const t of plan.tailles ?? []) {
  if (seulement && !seulement.includes(t.id)) continue;
  if (dejaJoues.has(t.id)) continue;
  const titre = `${t.regle} [${t.lisible}]`;
  const agents = agentsDuMetier(t.metier, t.sousVariantes);
  let compte;
  try {
    compte = await creerCompte(nav, { metier: t.metier, sousVariantes: t.sousVariantes, effectif: t.effectifVrai, creation: "2006-10-01", agents });
  } catch (err) {
    noter(t.id, t.id, titre, "bloque", `compte non créé : ${err.message}`);
    ecrire();
    continue;
  }
  const { email, page, contexte } = compte;
  try {
    await page.goto(url(t.agent), { waitUntil: "networkidle" });
    const a = comparer(await visibles(page), t.cibles, t.attenduVrai);
    noter(t.id, `${t.id}-a`, `${titre} : effectif ${t.effectifVrai}, ${t.attenduVrai.length} question(s) affichée(s)`, a.ok ? "conforme" : "ecart", a.detail);
    const tem = temoinReponse(t.attenduVrai.filter((c) => !t.attenduFaux.includes(c)));
    if (tem) await poserApi(page, { [tem.code]: tem.reponse });
    await changerEffectif(page, t.effectifFaux);
    await page.goto(url(t.agent), { waitUntil: "networkidle" });
    const b = comparer(await visibles(page), t.cibles, t.attenduFaux);
    noter(t.id, `${t.id}-b`, `${titre} : effectif changé à ${t.effectifFaux} dans Mon compte, ${t.attenduFaux.length} question(s) affichée(s)`, b.ok ? "conforme" : "ecart", b.detail);
    if (tem) {
      const act = actives(email, [tem.code])[tem.code];
      noter(t.id, `${t.id}-c`, `${titre} : la réponse à ${tem.code} ne compte plus et reste gardée`, act === null && reponseDb(email, tem.code) !== null ? "conforme" : "ecart", JSON.stringify(act));
    }
    await changerEffectif(page, t.effectifVrai);
    await page.goto(url(t.agent), { waitUntil: "networkidle" });
    const d = comparer(await visibles(page), t.cibles, t.attenduVrai);
    noter(t.id, `${t.id}-d`, `${titre} : effectif rétabli à ${t.effectifVrai}, les questions reviennent`, d.ok ? "conforme" : "ecart", d.detail);
    if (tem) {
      const act = actives(email, [tem.code])[tem.code];
      noter(t.id, `${t.id}-d2`, `${titre} : la réponse gardée à ${tem.code} compte de nouveau`, JSON.stringify(act) === JSON.stringify(tem.reponse) ? "conforme" : "ecart", JSON.stringify(act));
    }
  } catch (err) {
    noter(t.id, `${t.id}-x`, titre, "bloque", `exception : ${err.message.split("\n")[0]}`);
  } finally {
    await contexte.close();
    ecrire();
  }
}

await nav.close();
ecrire();
const n = (s) => resultats.filter((r) => r.statut === s).length;
const items = new Set(resultats.map((r) => r.item));
console.log(`\n${items.size} règles jouées, ${resultats.length} contrôles : ${n("conforme")} conformes, ${n("ecart")} écart(s), ${n("bloque")} bloqué(s).`);
for (const r of resultats.filter((x) => x.statut !== "conforme")) console.log(`  ${r.statut.padEnd(8)} ${r.id} ${r.observe.slice(0, 160)}`);
process.exit(n("ecart") ? 1 : 0);

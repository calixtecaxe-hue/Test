// Contrôle navigateur des règles à plusieurs branches (audit final du 29 octobre). Joue le plan écrit par plan-branches.mts :
// pour chaque règle (« un », « tous », « parmi »), un compte fictif, puis chaque cas l'un après l'autre sur le même compte. Les
// réponses du cas sont posées par l'API (les réponses du cas précédent qui ne s'y trouvent plus sont effacées), la page de
// l'agent est ouverte, et les questions affichées sont comparées à celles que le vrai code d'assemblage affiche.
// Une question ouverte par la règle est répondue au premier cas qui l'affiche ; à chaque cas suivant, sa réponse doit compter
// tant que la question s'affiche (une autre branche la garde ouverte), et ne plus compter, tout en restant gardée en base, quand
// la question disparaît.
//
//   node scripts/verification/plan-branches.mts
//   node scripts/verification/branches.mjs [--seulement D-030,M-083] [--sortie docs/verification/resultats]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium, B, creerCompte, AGENTS, reponseDb } from "./outils.mjs";

const args = process.argv.slice(2);
const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const sortie = arg("--sortie") ?? "docs/verification/resultats";
const seulement = arg("--seulement")?.split(",") ?? null;
mkdirSync(sortie, { recursive: true });

const plan = JSON.parse(readFileSync("docs/verification/plan-branches.json", "utf8"));
const banque = new Map(JSON.parse(readFileSync("data/banque/questions.json", "utf8")).map((q) => [q.donnee, q]));
const routage = JSON.parse(readFileSync("data/routage.json", "utf8"));
const COURT = Object.fromEntries(Object.entries(AGENTS).map(([k, a]) => [a.code, k]));
const url = (agent) => `${B}/audit/${AGENTS[COURT[agent]].slug}`;

const resultats = [];
function noter(item, id, attendu, statut, observe = "") {
  resultats.push({ item, id, attendu, statut, observe: String(observe ?? "").slice(0, 600) });
  console.log(`${statut === "conforme" ? "conforme" : statut === "ecart" ? "ÉCART   " : "BLOQUÉ  "}  ${id.padEnd(10)} ${attendu}${statut === "conforme" ? "" : ` — ${String(observe).slice(0, 220)}`}`);
}
const ecrire = () => writeFileSync(`${sortie}/branches.json`, JSON.stringify({ le: new Date().toISOString(), resultats }, null, 1));
const actives = (email, cles) => JSON.parse(execFileSync("node", ["scripts/verification/actives.mts", email, ...cles], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const visibles = async (page) =>
  new Set(await page.locator("[data-question],[data-question-imbriquee]").evaluateAll((els) => els.map((e) => e.getAttribute("data-question") ?? e.getAttribute("data-question-imbriquee"))));
function comparer(vus, cibles, attendu) {
  const manquent = cibles.filter((c) => attendu.includes(c) && !vus.has(c));
  const enTrop = cibles.filter((c) => !attendu.includes(c) && vus.has(c));
  return { ok: manquent.length === 0 && enTrop.length === 0, detail: `${manquent.length ? `absentes : ${manquent.join(", ")} ` : ""}${enTrop.length ? `affichées à tort : ${enTrop.join(", ")}` : ""}` };
}
// Pose les réponses par l'API, dans l'ordre que le serveur accepte (un tableau attend la réponse qui donne ses lignes).
async function poserApi(page, reponses) {
  let reste = Object.entries(reponses);
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
for (const it of plan.items) {
  if (seulement && !seulement.includes(it.id)) continue;
  for (const x of it.nonJouables) noter(it.id, `${it.id}-nj`, `${it.regle} : ${x}`, "conforme", "cas non jouable seul, signalé dans le plan");
  let compte;
  try {
    compte = await creerCompte(nav, { metier: it.compte.metier, sousVariantes: it.compte.sousVariantes, effectif: it.compte.effectif, creation: "2006-10-01", agents: agentsDuMetier(it.compte.metier, it.compte.sousVariantes) });
  } catch (err) {
    noter(it.id, it.id, it.regle, "bloque", `compte non créé : ${err.message}`);
    continue;
  }
  const { email, page, contexte } = compte;
  let etat = {};
  let temoin = null;
  try {
    for (const c of it.cas) {
      // Réponses du cas ; celles du cas précédent qui n'y sont plus sont effacées. La réponse témoin est gardée telle quelle.
      const voulu = { ...c.reponses };
      const changes = {};
      for (const k of new Set([...Object.keys(etat), ...Object.keys(voulu)])) {
        if (temoin && k === temoin.code) continue;
        if (JSON.stringify(etat[k] ?? null) !== JSON.stringify(voulu[k] ?? null)) changes[k] = voulu[k] ?? null;
      }
      const refus = await poserApi(page, changes);
      if (refus.length) { noter(it.id, c.id, `${it.regle} : ${c.branche}`, "bloque", refus.map((x) => `${x[0]} ${x[2]}`).join(" | ")); continue; }
      etat = voulu;
      await page.goto(url(it.agent), { waitUntil: "networkidle" });
      const vus = await visibles(page);
      const r = comparer(vus, it.cibles, c.attendu);
      noter(it.id, c.id, `${it.regle} : ${c.branche} → ${c.attendu.length} question(s) affichée(s)`, r.ok ? "conforme" : "ecart", r.detail);
      if (!temoin && c.attendu.length > 0) {
        temoin = temoinReponse(c.attendu);
        if (temoin) await poserApi(page, { [temoin.code]: temoin.reponse });
        continue;
      }
      if (temoin) {
        const act = actives(email, [temoin.code])[temoin.code];
        const enBase = reponseDb(email, temoin.code);
        if (c.attendu.includes(temoin.code)) {
          noter(it.id, `${c.id}-r`, `${it.regle} : ${c.branche} → la réponse à ${temoin.code}, toujours posée, compte encore`, JSON.stringify(act) === JSON.stringify(temoin.reponse) ? "conforme" : "ecart", JSON.stringify(act));
        } else {
          noter(it.id, `${c.id}-r`, `${it.regle} : ${c.branche} → la réponse à ${temoin.code} ne compte plus et reste gardée`, act === null && enBase !== null ? "conforme" : "ecart", `active ${JSON.stringify(act)}, en base ${JSON.stringify(enBase)}`);
        }
      }
    }
    // Après actualisation, le dernier cas garde le même affichage.
    const dernier = it.cas[it.cas.length - 1];
    await page.reload({ waitUntil: "networkidle" });
    const r = comparer(await visibles(page), it.cibles, dernier.attendu);
    noter(it.id, `${it.id}-act`, `${it.regle} : après actualisation, même affichage`, r.ok ? "conforme" : "ecart", r.detail);
  } catch (err) {
    noter(it.id, `${it.id}-x`, it.regle, "bloque", `exception : ${err.message.split("\n")[0]}`);
  } finally {
    await contexte.close();
    ecrire();
  }
}
await nav.close();
ecrire();
const n = (s) => resultats.filter((r) => r.statut === s).length;
console.log(`\n${new Set(resultats.map((r) => r.item)).size} règles, ${resultats.length} contrôles : ${n("conforme")} conformes, ${n("ecart")} écart(s), ${n("bloque")} bloqué(s).`);
process.exit(n("ecart") || n("bloque") ? 1 : 0);

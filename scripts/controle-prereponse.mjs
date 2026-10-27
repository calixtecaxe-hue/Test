// Contrôle : le budget marketing de la Finance (FIN-05.02) rempli d'après le détail se met à jour quand le détail change,
// et ne bouge plus dès que le dirigeant donne lui-même un chiffre.
//   (serveur lancé : AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration npx next start -p 3100)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const B = process.env.BASE ?? "http://127.0.0.1:3100";
const dbUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)[1].split("?")[0];
const sql = (q) => execFileSync("psql", [dbUrl, "-At", "-c", q], { encoding: "utf8" }).trim();
let echecs = 0;
const verifier = (n, ok, d = "") => { console.log(`${ok ? "ok  " : "ECHEC"} ${n}${ok ? "" : " : " + d}`); if (!ok) echecs++; };

const email = `prerep${Date.now()}@example.com`, motDePasse = "motdepasse-controle-1234";
let cookies = "";
async function appel(methode, chemin, corps) {
  const r = await fetch(B + chemin, { method: methode, redirect: "manual", headers: { "content-type": "application/json", cookie: cookies }, body: corps ? JSON.stringify(corps) : undefined });
  const sc = r.headers.getSetCookie?.() ?? [];
  if (sc.length) cookies = [...new Map([...cookies.split("; ").filter(Boolean), ...sc.map((c) => c.split(";")[0])].map((c) => [c.split("=")[0], c])).values()].join("; ");
  return r;
}
await appel("POST", "/api/inscription", { email, motDePasse });
// Connexion Auth.js (identifiants).
const csrf = await (await appel("GET", "/api/auth/csrf")).json();
const form = new URLSearchParams({ csrfToken: csrf.csrfToken, email, motDePasse, callbackUrl: B + "/tableau-de-bord" });
const co = await fetch(B + "/api/auth/callback/credentials", { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookies }, body: form });
cookies = [...new Map([...cookies.split("; ").filter(Boolean), ...(co.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0])].map((c) => [c.split("=")[0], c])).values()].join("; ");

await appel("PUT", "/api/compte/metier", { metierPrecis: "electricien", sousVariantes: [] });
await appel("POST", "/api/abonnement", { nombreAgents: 4, periode: "mensuel", agents: ["ACQUISITION_CA", "FINANCE_RENTABILITE", "RH_ORGANISATION", "COMM_CREATION"] });
await appel("POST", "/api/paiement/demonstration", {});
await appel("PUT", "/api/compte/dossier", { chiffreAffairesMensuel: 60000, nombreCollaborateurs: 3, dateCreationEntreprise: "2019-03-01", typeZone: "PERIURBAINE", ville: "Lyon" });

await appel("PUT", "/api/audit/niveau", { niveau: "ESSENTIEL" });
await appel("POST", "/api/audit/objectif", { agent: "FINANCE_RENTABILITE", objectif: { quoi: "améliorer ma marge", ampleur: { valeur: 5, unite: "pourcent" }, delaiMois: 6 } });

const put = async (cle, reponse, extra = {}) => (await appel("PUT", "/api/audit/reponses", { cle, reponse, ...extra }));
const exact = (valeur) => ({ genre: "exact", valeur });
const ligne = (cle) => sql(`select r.reponse::text||'|'||r.preremplie from "ReponseAudit" r join "User" u on u.id=r."userId" where u.email='${email}' and r.cle='${cle}'`);

verifier("détail ACQ-07.03", (await put("ACQ-07.03", exact(100))).ok);
verifier("détail ACQ-07.04", (await put("ACQ-07.04", exact(50))).ok);
const com = await put("COM-32.02", { genre: "valeurs", valeurs: { "community_manager.par_mois": 200 } });
verifier("détail COM-32.02", com.ok, await com.text());

// Un chiffre faux annoncé comme « proposé » n'est pas accepté comme tel.
await put("FIN-05.02", exact(1), { preremplie: true });
verifier("un faux chiffre « préparé » n'est pas marqué comme tel", ligne("FIN-05.02").endsWith("|false"), ligne("FIN-05.02"));

// Le chiffre proposé (100 + 50 + 200 = 350), enregistré tel quel.
const ok1 = await put("FIN-05.02", exact(350), { preremplie: true });
verifier("total proposé enregistré", ok1.ok && ligne("FIN-05.02").includes('"valeur": 350') && ligne("FIN-05.02").endsWith("|true"), ligne("FIN-05.02"));

// Le détail change : le total suit à la prochaine lecture (ouverture de l'agent Finance).
await put("ACQ-07.03", exact(300));
await appel("GET", "/audit/finance-rentabilite");
verifier("le détail a changé : le total passe à 550", ligne("FIN-05.02").includes('"valeur": 550') && ligne("FIN-05.02").endsWith("|true"), ligne("FIN-05.02"));

// Le dirigeant corrige : sa réponse l'emporte, plus de mise à jour.
await put("FIN-05.02", exact(999));
verifier("chiffre corrigé : n'est plus « proposé »", ligne("FIN-05.02").endsWith("|false"), ligne("FIN-05.02"));
await put("ACQ-07.03", exact(10));
await appel("GET", "/audit/finance-rentabilite");
verifier("chiffre corrigé : le détail qui change ne le touche pas", ligne("FIN-05.02").includes('"valeur": 999'), ligne("FIN-05.02"));
console.log(echecs === 0 ? "\nTout est conforme." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);

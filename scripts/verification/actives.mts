// Réponses actives d'un compte de test, calculées par la fonction du serveur (src/lib/audit/reponses-actives.ts) sur ses réponses
// en base : ce que le compte rendu, la progression et le total proposé à la Finance retiennent.
//   node scripts/verification/actives.mts <email> [clé…]      → JSON { clé: réponse active ou null }
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../../src/lib/donnees/disque.ts";
import { appliquerExclusions } from "../../src/lib/audit/assemblage.ts";
import { reponsesActives } from "../../src/lib/audit/reponses-actives.ts";
import { ancienneteEnMois, tailleDepuisEffectif } from "../../src/lib/audit/affichage.ts";
import { exclusionsAcquisition, metierDuCompte } from "../../src/lib/routage.ts";
import { reponseSchema, type Reponses } from "../../src/lib/audit/reponse.ts";
import type { ProfilId } from "../../src/lib/donnees/schemas.ts";

const racine = fileURLToPath(new URL("../..", import.meta.url));
const e = chargerDepuisDisque(join(racine, "data"));
const [email, ...cles] = process.argv.slice(2);
const db = readFileSync(join(racine, ".env"), "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)![1].split("?")[0];
const sql = (q: string) => execFileSync("psql", [db, "-At", "-c", q], { encoding: "utf8" }).trim();
const u = JSON.parse(sql(`select row_to_json(x) from (select id, profils, "metierPrecis", categorie, "sousVariantes", "nombreCollaborateurs", "dateCreationEntreprise" from "User" where email='${email.replace(/'/g, "''")}') x`));
const reponses: Reponses = {};
for (const l of sql(`select json_build_object('cle', cle, 'reponse', reponse) from "ReponseAudit" where "userId"='${u.id}'`).split("\n").filter(Boolean)) {
  const { cle, reponse } = JSON.parse(l);
  const a = reponseSchema.safeParse(reponse);
  if (a.success) reponses[cle] = a.data;
}
const ex = exclusionsAcquisition(e.routage, { metierPrecis: u.metierPrecis, categorie: u.categorie, sousVariantes: u.sousVariantes });
const actives = reponsesActives(e, appliquerExclusions(reponses, ex, e.reglesAffichage), {
  profils: u.profils as ProfilId[],
  taille: tailleDepuisEffectif(u.nombreCollaborateurs ?? 1),
  ancienneteMois: u.dateCreationEntreprise ? ancienneteEnMois(new Date(u.dateCreationEntreprise), new Date()) : undefined,
  metier: metierDuCompte(e.routage, u),
  themesExclus: ex?.themes ?? [],
});
const sortie = cles.length ? Object.fromEntries(cles.map((c) => [c, actives[c] ?? null])) : actives;
process.stdout.write(JSON.stringify(sortie));

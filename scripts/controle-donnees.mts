// Contrôle des fichiers de données : npm run donnees:controle
// Code de sortie 1 s'il y a une erreur (un avertissement ne bloque pas).
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerDonnees } from "../src/lib/donnees/controle.ts";

const dossier = join(fileURLToPath(new URL("..", import.meta.url)), "data");
const rapport = controlerDonnees(chargerDepuisDisque(dossier));

console.log("Statistiques");
for (const [nom, valeur] of Object.entries(rapport.statistiques)) console.log(`  ${nom} : ${valeur}`);

const limite = process.argv.includes("--tout") ? Infinity : 15;
if (rapport.avertissements.length > 0) {
  console.log(`\n${rapport.avertissements.length} avertissement(s)${limite < Infinity ? " (15 premiers, --tout pour la liste complète)" : ""}`);
  for (const a of rapport.avertissements.slice(0, limite)) console.log(`  - ${a}`);
}
if (rapport.erreurs.length > 0) {
  console.error(`\n${rapport.erreurs.length} erreur(s)`);
  for (const e of rapport.erreurs) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\nContrôle réussi : aucune erreur.");

// Écrit, dans docs/rapport/rapport.md, la liste exacte des mesures de l'écran « Résultats » et des évolutions, d'après
// data/mesures.json et data/evolutions.json (bloc entre <!-- MESURES --> et <!-- /MESURES -->). À relancer après toute
// modification de ces fichiers.
//
//   node scripts/verification/rapport-doc.mjs
import { readFileSync, writeFileSync } from "node:fs";

const mesures = JSON.parse(readFileSync("data/mesures.json", "utf8")).mesures;
const evolutions = JSON.parse(readFileSync("data/evolutions.json", "utf8"));
const banque = new Map(JSON.parse(readFileSync("data/banque/questions.json", "utf8")).map((q) => [q.donnee, q]));
const donnees = new Map(["acquisition-ca", "finance-rentabilite", "rh-organisation", "comm-creation"].flatMap((a) => JSON.parse(readFileSync(`data/donnees-${a}.json`, "utf8"))).map((d) => [d.code, d]));
const AGENTS = { ACQUISITION_CA: "Acquisition", FINANCE_RENTABILITE: "Finance", RH_ORGANISATION: "RH", COMM_CREATION: "Comm" };
const UNITES = { nombre: "nombre", euros: "€", pourcent: "%", heures: "heures", jours: "jours" };

function lues(s) {
  switch (s.type) {
    case "nombre":
    case "colonne":
    case "mois":
      return [s.donnee];
    case "somme":
      return s.termes.flatMap(lues);
    case "rapport":
    case "taux":
      return [...lues(s.numerateur), ...lues(s.denominateur)];
    case "marge":
      return [...lues(s.ca), ...lues(s.chargesParMois)];
  }
}
function calcul(s) {
  switch (s.type) {
    case "nombre":
      return s.champ ? `réponse (${s.champ.replace(/_/g, " ")})` : "réponse";
    case "colonne":
      return `somme d'une colonne${s.lignesVides ? " (lignes renseignées)" : ""}`;
    case "mois":
      return s.lignes.length === 1 ? "le mois dernier" : `somme de ${s.lignes.length} mois`;
    case "somme":
      return `somme de ${s.termes.length} montants`;
    case "rapport":
      return "rapport de deux chiffres";
    case "taux":
      return "taux (a ÷ b × 100)";
    case "marge":
      return "taux de marge";
  }
}

const lignes = [
  `${mesures.length} mesures, écrites à la main dans \`data/mesures.json\`. « Formule du classeur » : la donnée calculée dont la mesure applique la formule ; sinon, la mesure lit directement la réponse.`,
  "",
  "| Agent(s) | Mesure | Unité | Calcul | Questions lues | Formule du classeur | Objectifs proposés suivis | Rattache un objectif écrit avec |",
  "|---|---|---|---|---|---|---|---|",
];
for (const m of mesures) {
  const d = donnees.get(m.code);
  lignes.push(
    `| ${m.agents.map((a) => AGENTS[a]).join(", ")} | ${m.libelle} | ${UNITES[m.unite]} | ${calcul(m.source)} | ${[...new Set(lues(m.source))].join(", ")} | ${d?.mode === "calculee" ? `${m.code} : ${(d.calcul ?? "").slice(0, 90).replace(/\|/g, "/")}` : "—"} | ${(m.objectifs ?? []).map((o) => `${o.id} (${o.unites.join(", ")})`).join(" ; ") || "—"} | ${(m.mots ?? []).map((g) => g.join(" + ")).join(" ; ") || "—"} |`,
  );
}
lignes.push("", `${evolutions.evolutions.length} évolutions (\`data/evolutions.json\`) :`, "", "| Évolution | Agent(s) | Écart | Unité |", "|---|---|---|---|");
for (const e of evolutions.evolutions) lignes.push(`| ${e.libelle} | ${e.agents.map((a) => AGENTS[a]).join(", ")} | ${e.ecart} mois | ${e.mesure === "points" ? "points" : UNITES[e.unite]} |`);
lignes.push("", "Non calculées (raison écrite dans `data/evolutions.json`) : " + evolutions.nonCalculables.map((n) => `${n.code} (${n.raison})`).join(" ; "));
const sansQuestion = mesures.flatMap((m) => lues(m.source)).filter((c) => !banque.has(c));
if (sansQuestion.length) lignes.push("", `Données lues sans question écrite : ${[...new Set(sansQuestion)].join(", ")}.`);

const chemin = "docs/rapport/rapport.md";
const doc = readFileSync(chemin, "utf8");
const debut = doc.indexOf("<!-- MESURES -->");
const fin = doc.indexOf("<!-- /MESURES -->");
if (debut < 0 || fin < 0) throw new Error("Marqueurs <!-- MESURES --> absents de " + chemin);
writeFileSync(chemin, `${doc.slice(0, debut)}<!-- MESURES -->\n${lignes.join("\n")}\n${doc.slice(fin)}`);
console.log(`${mesures.length} mesures et ${evolutions.evolutions.length} évolutions écrites dans ${chemin}.`);

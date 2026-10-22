// Lecture des fichiers de données depuis le disque, pour le script de contrôle et
// les tests. L'application, elle, importe les JSON (voir charger.ts).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { schemaFichiers } from "./schemas.ts";
import type { EnsembleDonnees } from "./schemas.ts";

function lire(dossier: string, ...chemin: string[]): unknown {
  return JSON.parse(readFileSync(join(dossier, ...chemin), "utf8"));
}

export function chargerDepuisDisque(dossier: string): EnsembleDonnees {
  const donnees = ["acquisition-ca", "finance-rentabilite", "rh-organisation", "comm-creation"].flatMap(
    (agent) => schemaFichiers.donnees.parse(lire(dossier, `donnees-${agent}.json`))
  );
  return {
    themes: schemaFichiers.themes.parse(lire(dossier, "themes.json")),
    donnees,
    croisements: schemaFichiers.croisements.parse(lire(dossier, "croisements.json")),
    scenarios: schemaFichiers.scenarios.parse(lire(dossier, "scenarios.json")),
    diagnosticComm: schemaFichiers.diagnosticComm.parse(lire(dossier, "diagnostic-comm.json")),
    declencheurs: schemaFichiers.declencheurs.parse(lire(dossier, "declencheurs.json")),
    lexique: schemaFichiers.lexique.parse(lire(dossier, "lexique.json")),
    routage: schemaFichiers.routage.parse(lire(dossier, "routage.json")),
    inscription: schemaFichiers.inscription.parse(lire(dossier, "inscription.json")),
    reglesAffichage: schemaFichiers.reglesAffichage.parse(lire(dossier, "regles-affichage.json")),
    seuils: schemaFichiers.seuils.parse(lire(dossier, "seuils.json")),
    limitesObjectif: schemaFichiers.limitesObjectif.parse(lire(dossier, "objectif-limites.json")),
    prereponses: schemaFichiers.prereponses.parse(lire(dossier, "prereponses.json")),
    catalogue: schemaFichiers.catalogue.parse(lire(dossier, "catalogue-themes.json")),
    catalogueEffets: schemaFichiers.catalogueEffets.parse(lire(dossier, "catalogue-effets.json")),
    parametresReferences: schemaFichiers.parametresReferences.parse(lire(dossier, "parametres-references.json")),
    sourcesReconnues: schemaFichiers.sourcesReconnues.parse(lire(dossier, "sources-reconnues.json")),
    banque: schemaFichiers.banque.parse(lire(dossier, "banque", "questions.json")),
  };
}

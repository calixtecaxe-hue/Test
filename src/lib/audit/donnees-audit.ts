// Les fichiers de données de l'audit, validés une fois au chargement (serveur).
import themes from "../../../data/themes.json";
import acquisition from "../../../data/donnees-acquisition-ca.json";
import finance from "../../../data/donnees-finance-rentabilite.json";
import rh from "../../../data/donnees-rh-organisation.json";
import comm from "../../../data/donnees-comm-creation.json";
import croisements from "../../../data/croisements.json";
import scenarios from "../../../data/scenarios.json";
import diagnosticComm from "../../../data/diagnostic-comm.json";
import declencheurs from "../../../data/declencheurs.json";
import lexique from "../../../data/lexique.json";
import routage from "../../../data/routage.json";
import inscription from "../../../data/inscription.json";
import reglesAffichage from "../../../data/regles-affichage.json";
import seuils from "../../../data/seuils.json";
import limitesObjectif from "../../../data/objectif-limites.json";
import prereponses from "../../../data/prereponses.json";
import objectifsAgents from "../../../data/objectifs-agents.json";
import retraits from "../../../data/retraits.json";
import implications from "../../../data/implications.json";
import catalogue from "../../../data/catalogue-themes.json";
import catalogueEffets from "../../../data/catalogue-effets.json";
import parametresReferences from "../../../data/parametres-references.json";
import sourcesReconnues from "../../../data/sources-reconnues.json";
import banque from "../../../data/banque/questions.json";
import { schemaFichiers, type EnsembleDonnees } from "../donnees/schemas.ts";

export const ENSEMBLE: EnsembleDonnees = {
  themes: schemaFichiers.themes.parse(themes),
  donnees: [acquisition, finance, rh, comm].flatMap((d) => schemaFichiers.donnees.parse(d)),
  croisements: schemaFichiers.croisements.parse(croisements),
  scenarios: schemaFichiers.scenarios.parse(scenarios),
  diagnosticComm: schemaFichiers.diagnosticComm.parse(diagnosticComm),
  declencheurs: schemaFichiers.declencheurs.parse(declencheurs),
  lexique: schemaFichiers.lexique.parse(lexique),
  routage: schemaFichiers.routage.parse(routage),
  inscription: schemaFichiers.inscription.parse(inscription),
  reglesAffichage: schemaFichiers.reglesAffichage.parse(reglesAffichage),
  seuils: schemaFichiers.seuils.parse(seuils),
  prereponses: schemaFichiers.prereponses.parse(prereponses),
  objectifsAgents: schemaFichiers.objectifsAgents.parse(objectifsAgents),
  retraits: schemaFichiers.retraits.parse(retraits),
  implications: schemaFichiers.implications.parse(implications),
  catalogue: schemaFichiers.catalogue.parse(catalogue),
  catalogueEffets: schemaFichiers.catalogueEffets.parse(catalogueEffets),
  parametresReferences: schemaFichiers.parametresReferences.parse(parametresReferences),
  sourcesReconnues: schemaFichiers.sourcesReconnues.parse(sourcesReconnues),
  limitesObjectif: schemaFichiers.limitesObjectif.parse(limitesObjectif),
  banque: schemaFichiers.banque.parse(banque),
};

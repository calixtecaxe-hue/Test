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
  banque: schemaFichiers.banque.parse(banque),
};

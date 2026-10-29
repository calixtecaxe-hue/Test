// Le routage de l'application : data/routage.json, validé une fois au chargement.
import brut from "../../data/routage.json";
import { schemaFichiers } from "./donnees/schemas.ts";

export const ROUTAGE = schemaFichiers.routage.parse(brut);

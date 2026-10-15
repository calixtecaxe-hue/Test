import { ROUTAGE } from "../routage-donnees.ts";
import { creerSchemaInscription } from "./inscription-schema.ts";

export const inscriptionSchema = creerSchemaInscription(ROUTAGE);
export type { InscriptionInput } from "./inscription-schema.ts";

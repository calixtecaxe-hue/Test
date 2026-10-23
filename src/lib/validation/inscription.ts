import { ROUTAGE } from "../routage-donnees.ts";
import { creerSchemaMetier } from "./inscription-schema.ts";

export { schemaDossier, schemaIdentifiants } from "./inscription-schema.ts";
export const metierSchema = creerSchemaMetier(ROUTAGE);
export type { DossierInput, IdentifiantsInput, MetierInput } from "./inscription-schema.ts";

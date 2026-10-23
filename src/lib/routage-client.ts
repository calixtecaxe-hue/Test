// Routage et lexique pour le navigateur : les fichiers de données tels quels,
// typés mais non revalidés (la validation par zod reste côté serveur).
import routageBrut from "../../data/routage.json";
import lexiqueBrut from "../../data/lexique.json";
import inscriptionBrut from "../../data/inscription.json";
import type { Inscription, ProfilId, Routage } from "./donnees/schemas.ts";

export const ROUTAGE_CLIENT = routageBrut as unknown as Routage;
export const LEXIQUE_CLIENT = lexiqueBrut as unknown as { mot: string; formes: Record<ProfilId, string | null> }[];
export const INSCRIPTION_CLIENT = inscriptionBrut as unknown as Inscription;

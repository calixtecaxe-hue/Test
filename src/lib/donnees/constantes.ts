// Constantes partagées, sans dépendance : utilisables dans le navigateur sans
// embarquer les schémas de validation.
// 8 profils depuis le 20 octobre : « location » regroupe l'hébergement et la location de véhicules.
export const PROFILS = ["rdv", "commerce", "ecommerce", "restaurant", "chantier", "b2b", "abonnement", "location"] as const;
export const TAILLES = ["seul", "equipe_2_5", "structure_6_plus"] as const;

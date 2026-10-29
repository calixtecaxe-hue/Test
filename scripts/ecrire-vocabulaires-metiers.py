#!/usr/bin/env python3
"""Écrit data/vocabulaires-metiers.json : quel vocabulaire par métier (hébergement, négoce, cabinet…) s'applique à quel
métier ou activité. VALIDÉ par le propriétaire le 27 octobre (attributions, « à confirmer » compris, et décisions sur les
cas à trancher) : l'application l'utilise. Les dix vocabulaires et leurs mots viennent du classeur
(data/lexique.json, champ « metiers »). Relancer après toute décision : python3 scripts/ecrire-vocabulaires-metiers.py"""
import json, pathlib, sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
routage = json.loads((RACINE / "data/routage.json").read_text(encoding="utf-8"))
lexique = json.loads((RACINE / "data/lexique.json").read_text(encoding="utf-8"))

VOCABULAIRES = {
    "hebergement": "Hébergement (nuitées, chambres, logements, emplacements)",
    "location_vehicules": "Location de véhicules",
    "immobilier": "Immobilier (mandats, estimations, honoraires)",
    "projet_particuliers": "Projets pour des particuliers (devis signé, projet réalisé)",
    "vente_de_biens": "Vente de biens (acheteurs, visite ou essai, bien livré)",
    "negoce": "Négoce, gros et distribution (commandes, propositions de prix)",
    "fabrication": "Fabrication (commandes à produire, production)",
    "cabinet": "Cabinet (dossiers, honoraires, consultations)",
    "course": "Courses (VTC, taxi, coursier)",
    "livraison_repas": "Cuisine en livraison seule (commandes, menu en ligne)",
}

# Chaque entrée : identifiant du métier -> (vocabulaire, certitude). Les attributions marquées « a_confirmer » dans la
# proposition ont été confirmées le 27 octobre : toutes sont « evident ». Un métier absent de ces tables garde les mots de son profil.
METIERS = {}
def poser(ids, vocab, certitude="evident"):
    for i in ids: METIERS[i] = (vocab, certitude)

poser(["camping", "gite", "chambre-d-hotes"], "hebergement")
poser(["location-de-vehicules"], "location_vehicules")
poser([
    "grossiste-alimentaire", "grossiste-en-fruits-et-legumes", "negoce-de-materiaux-de-construction", "negoce-de-bois",
    "distributeur-de-materiel-electrique", "distributeur-de-plomberie-et-sanitaire", "distributeur-de-fournitures-industrielles",
    "grossiste-en-pieces-automobiles", "grossiste-en-textile", "grossiste-en-produits-de-beaute-pour-salons",
    "distributeur-d-equipements-de-cuisine-professionnelle", "grossiste-en-fournitures-de-bureau", "grossiste-en-emballages",
    "grossiste-en-produits-d-entretien-et-d-hygiene", "import-export", "negoce-de-vins-et-spiritueux",
    "grossiste-en-boissons-pour-cafes-et-restaurants",
], "negoce")
poser([
    "atelier-de-production", "sous-traitance-industrielle", "mecanique-de-precision", "chaudronnerie", "imprimerie",
    "menuiserie-de-fabrication", "biscuiterie", "brasserie-artisanale-fabrication-de-biere",
], "fabrication")
poser(["avocat", "notaire", "commissaire-de-justice", "expert-comptable", "commissaire-aux-comptes", "architecte", "geometre-expert"], "cabinet")
poser(["vtc-et-taxi", "coursier"], "course")
poser(["cuisine-en-livraison-seule"], "livraison_repas")
poser(["vente-de-vehicules", "promoteur-immobilier", "marchand-de-biens"], "vente_de_biens")
poser(["constructeur-de-maisons-individuelles"], "vente_de_biens")
poser(["architecte-d-interieur", "cuisiniste", "pisciniste"], "projet_particuliers")
poser(["finance-et-assurance"], "cabinet")

# Métiers à activités : le vocabulaire se décide activité par activité (clé « métier/activité »).
ACTIVITES = {
    "hotel/hebergement-chambres": ("hebergement", "evident"),
    "agence-immobiliere/transaction": ("immobilier", "evident"),
    "agence-immobiliere/location-recherche-de-locataires": ("immobilier", "evident"),
    "agence-immobiliere/immobilier-d-entreprise-bureaux-locaux-commerciaux": ("immobilier", "evident"),
    "agence-immobiliere/gestion-locative": ("immobilier", "evident"),
    "paysagiste/creation": ("projet_particuliers", "evident"),
    "evenementiel/organisation-de-mariages-et-fetes-privees": ("projet_particuliers", "evident"),
    "photographe/particuliers-mariages-et-portraits": ("projet_particuliers", "evident"),
}

# Décision du propriétaire, 27 octobre : ces métiers et activités gardent les mots de leur profil.
PROFIL_CONSERVE = {
    "agence-immobiliere/syndic": "Un syndic ne fait pas d'estimation ni de vente : aucun des dix vocabulaires ne convient.",
    "agence-immobiliere/conciergerie-saisonniere": "Proche de l'hébergement, mais le client est le propriétaire du logement.",
    "agence-de-voyage": "Dossier de voyage : ni « devis signé » ni « vente de bien » ne décrit bien.",
    "livraison-du-dernier-kilometre": "Le vocabulaire « courses » parle de passagers ou de coursiers.",
    "transport-de-marchandises": "« Demande de course » ne convient pas à un transport de marchandises.",
    "demenagement": "Devis et chantier plutôt que course.",
    "autocariste": "Devis groupe.",
    "restauration-rapide": "Peut faire de la livraison : « livraison repas » ne vaut que pour la livraison seule.",
    "pizzeria": "Même remarque que la restauration rapide.",
    "recrutement-et-rh": "« Dossier ouvert / honoraires » convient à un cabinet de recrutement, moins à une agence d'intérim.",
    "consultant": "Mission plutôt que dossier.",
}

# Décision du propriétaire, 27 octobre : un vocabulaire « consultation » est à créer pour les professions de santé ; ses mots
# sont à écrire par le propriétaire (dans le classeur, lexique). En attendant, les mots du profil restent.
A_ECRIRE = "Vocabulaire « consultation » à créer (décision du 27 octobre) : ses mots sont à écrire par le propriétaire. En attendant, les mots du profil restent."
A_TRANCHER = {i: A_ECRIRE for i in [
    "medecin", "dentiste", "kine", "infirmier-liberal", "sage-femme", "orthophoniste", "veterinaire", "psychologue",
    "osteopathe", "naturopathe", "sophrologue",
]}

ids_metiers = {m["id"] for m in routage["metiers"]}
ids_activites = {f'{m["id"]}/{v["id"]}' for m in routage["metiers"] for v in m.get("sousVariantes", [])}
cles = {k for mot in lexique for k in (mot.get("metiers") or {})}
erreurs = [i for i in METIERS if i not in ids_metiers] + [i for i in ACTIVITES if i not in ids_activites]
erreurs += [i for i in list(PROFIL_CONSERVE) + list(A_TRANCHER) if i not in ids_metiers and i not in ids_activites]
erreurs += [v for v, _ in list(METIERS.values()) + list(ACTIVITES.values()) if v not in cles]
erreurs += [k for k in VOCABULAIRES if k not in cles]
if erreurs:
    sys.exit("Identifiants inconnus : " + ", ".join(erreurs))

sortie = {
    "source": "Validé par le propriétaire le 27 octobre. Les dix vocabulaires viennent du classeur (data/lexique.json, champ « metiers ») ; l'attribution à chaque métier est écrite par scripts/ecrire-vocabulaires-metiers.py.",
    "valide": True,
    "regle": "Un vocabulaire remplace les mots du profil. Plusieurs activités cochées : le vocabulaire s'applique seulement si elles ont toutes le même ; sinon les mots du profil restent. Un mot sans forme dans le vocabulaire (« — » dans le classeur) garde la forme du profil.",
    "vocabulaires": VOCABULAIRES,
    "metiers": {i: {"vocabulaire": v, "aConfirmer": c == "a_confirmer"} for i, (v, c) in sorted(METIERS.items())},
    "activites": {i: {"vocabulaire": v, "aConfirmer": c == "a_confirmer"} for i, (v, c) in sorted(ACTIVITES.items())},
    "profilConserve": PROFIL_CONSERVE,
    "aTrancher": A_TRANCHER,
}
(RACINE / "data/vocabulaires-metiers.json").write_text(json.dumps(sortie, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(METIERS)} métiers, {len(ACTIVITES)} activités, {len(PROFIL_CONSERVE)} gardent leur profil, {len(A_TRANCHER)} attendent le vocabulaire « consultation ».")

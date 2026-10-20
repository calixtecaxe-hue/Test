#!/usr/bin/env python3
"""Écrit la liste des métiers de `data/routage.json` d'après le document « CAXE — Liste des
métiers » (15 octobre 2026) : 15 métiers à sous-parties (liste 1) et les métiers classiques
rangés par secteur (liste 2). Les catégories, les profils et les règles des professions
réglementées restent ceux déjà présents dans le fichier ; la catégorie « Fabrication » est
ajoutée (questionnaire à créer).

Usage :  python3 scripts/ecrire-routage-metiers.py

Ce qui n'est PAS dans le document est signalé « aConfirmer » dans le fichier et listé par le
contrôle des données : le profil d'entreprise des professions réglementées nouvelles (le
document dit seulement « profil selon le métier »).
"""
import json
import re
import unicodedata
from pathlib import Path

FICHIER = Path(__file__).resolve().parent.parent / "data" / "routage.json"

CAT = {
    "Commerce": "commerce-stock",
    "Chantier": "prestation-chantier",
    "Abonnement": "prestation-recurrente",
    "Cycle long": "transaction-cycle-long",
    "Transport": "transport-logistique",
    "Réglementé": "professions-reglementees",
    "Rendez-vous": "rendez-vous-non-reglemente",
    "Hôtellerie-restauration": "restauration",
    "En ligne": "commerce-en-ligne",
    "Services B2B": "agences-services-entreprises",
    "Fabrication": "fabrication",
}
STOCK = {"Oui": "oui", "Non": "non", "À demander": "a_demander"}
COMM = {"Oui": "oui", "Non": "non", "À trancher": "a_trancher"}


def slug(t, n=60):
    s = unicodedata.normalize("NFD", t.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:n].strip("-")


def majuscule(t):
    return t[0].upper() + t[1:]


# --- Liste 1 : métiers à sous-parties --------------------------------------------------------
# (libellé du métier, synonymes, [(sous-partie, catégorie, stock, agent Comm, par défaut ?)])
LISTE1 = [
    ("Agence immobilière", [], [
        ("Transaction", "Cycle long", "Non", "Oui", True),
        ("Location (recherche de locataires)", "Cycle long", "Non", "Oui", False),
        ("Gestion locative", "Abonnement", "Non", "Oui", False),
        ("Syndic", "Abonnement", "Non", "Oui", False),
        ("Conciergerie saisonnière", "Abonnement", "Non", "Oui", False),
        ("Immobilier d'entreprise (bureaux, locaux commerciaux)", "Cycle long", "Non", "Oui", False),
    ]),
    ("Paysagiste", [], [
        ("Création", "Chantier", "Non", "Oui", True),
        ("Entretien régulier", "Abonnement", "Non", "Oui", False),
    ]),
    ("Fleuriste", [], [
        ("Boutique", "Commerce", "Oui", "Oui", True),
        ("Décoration florale de mariages et d'événements", "Cycle long", "Oui", "Oui", False),
        ("Abonnements floraux pour entreprises (hôtels, bureaux)", "Abonnement", "Oui", "Oui", False),
    ]),
    ("Agence de voyage", [], [
        ("Particuliers", "Cycle long", "Non", "Oui", True),
        ("Entreprises et groupes", "Cycle long", "Non", "Oui", False),
    ]),
    ("Vente de véhicules", [], [
        ("Généraliste", "Cycle long", "Oui", "Oui", True),
        ("Premium", "Cycle long", "Oui", "Oui", False),
        ("Prestige, sport et collection", "Cycle long", "Oui", "Oui", False),
    ]),
    ("Communication et marketing", [
        "Agence web", "Agence de communication", "Agence marketing et publicité", "Studio de design et graphiste",
        "Community manager", "Vidéaste", "Rédacteur", "Consultant marketing",
    ], [
        ("Projets ponctuels", "Services B2B", "Non", "Non", True),
        ("Contrats mensuels", "Abonnement", "Non", "Non", False),
    ]),
    ("Numérique et tech", ["Consultant IT"], [
        ("ESN et régie de consultants", "Services B2B", "Non", "Oui", False),
        ("Développement d'applications et de logiciels sur mesure", "Services B2B", "Non", "Oui", True),
        ("Conseil informatique et transformation numérique", "Services B2B", "Non", "Oui", False),
        ("Infogérance et maintenance informatique", "Abonnement", "Non", "Oui", False),
        ("Éditeur de logiciel en abonnement (SaaS)", "Abonnement", "Non", "Oui", False),
    ]),
    ("Recrutement et RH", ["Consultant RH"], [
        ("Cabinet de recrutement", "Services B2B", "Non", "Oui", True),
        ("Agence d'intérim", "Abonnement", "Non", "Oui", False),
        ("Conseil RH", "Services B2B", "Non", "Oui", False),
    ]),
    ("Finance et assurance", ["Conseiller en patrimoine"], [
        ("Conseiller en gestion de patrimoine", "Cycle long", "Non", "À trancher", False),
        ("Courtier en crédit", "Cycle long", "Non", "À trancher", False),
        ("Courtier en assurance", "Cycle long", "Non", "À trancher", True),
        ("Agent général d'assurance", "Cycle long", "Non", "À trancher", False),
    ]),
    ("Consultant", [], [
        ("Stratégie, management et organisation", "Services B2B", "Non", "Oui", True),
        ("Développement commercial", "Services B2B", "Non", "Oui", False),
        ("Qualité, sécurité, environnement (QSE, RSE)", "Services B2B", "Non", "Oui", False),
        ("Conseil juridique", "Réglementé", "Non", "Non", False),
    ]),
    ("Coach", [], [
        ("Sportif", "Rendez-vous", "Non", "Oui", True),
        ("Professionnel et dirigeants", "Services B2B", "Non", "Oui", False),
        ("Personnel (vie, parentalité)", "Rendez-vous", "Non", "Oui", False),
    ]),
    ("Enseignement et formation", [], [
        ("Formation pour les entreprises", "Services B2B", "Non", "Oui", True),
        ("Formation financée par le CPF", "Services B2B", "Non", "À trancher", False),
        ("École privée", "Abonnement", "Non", "Oui", False),
        ("Cours à l'année (musique, danse, langues)", "Abonnement", "Non", "Oui", False),
        ("Soutien scolaire et cours particuliers", "Rendez-vous", "Non", "Oui", False),
        ("Auto-école", "Rendez-vous", "Non", "Oui", False),
    ]),
    ("Traiteur", [], [
        ("Boutique et plats à emporter", "Hôtellerie-restauration", "Oui", "Oui", True),
        ("Mariages et événements", "Cycle long", "Oui", "Oui", False),
        ("Entreprises (plateaux-repas, séminaires)", "Abonnement", "Oui", "Oui", False),
    ]),
    ("Événementiel", [], [
        ("Organisation de mariages et fêtes privées", "Cycle long", "Non", "Oui", True),
        ("Organisation d'événements d'entreprise", "Services B2B", "Non", "Oui", False),
        ("Lieu de réception et location de salles", "Cycle long", "Non", "Oui", False),
        ("DJ et animation", "Rendez-vous", "Non", "Oui", False),
    ]),
    ("Photographe", [], [
        ("Particuliers, mariages et portraits", "Rendez-vous", "Non", "À trancher", True),
        ("Entreprises (produits, corporate)", "Services B2B", "Non", "À trancher", False),
    ]),
]

# --- Liste 2 : métiers classiques, sans sous-partie ----------------------------------------------
# (secteur, [métiers], catégorie, stock, agent Comm)
LISTE2 = [
    ("Commerce alimentaire", ["Boulanger-pâtissier", "boucher-charcutier", "poissonnier", "fromager", "primeur", "épicerie", "épicerie fine", "chocolatier"], "Commerce", "Oui", "Oui"),
    ("Commerce alimentaire", ["Caviste"], "Commerce", "Oui", "À trancher"),
    ("Commerce spécialisé", ["Opticien", "vêtements", "chaussures", "bijouterie", "librairie-papeterie", "jouets", "articles de sport", "décoration", "animalerie", "jardinerie", "quincaillerie", "téléphonie"], "Commerce", "Oui", "Oui"),
    ("Commerce spécialisé", ["Pharmacie"], "Commerce", "Oui", "À trancher"),
    ("Commerce spécialisé", ["Bureau de tabac"], "Commerce", "Oui", "À trancher"),
    ("E-commerce", ["E-commerçant"], "En ligne", "Oui", "Oui"),
    ("Négoce et commerce de gros", ["Grossiste alimentaire", "grossiste en fruits et légumes", "négoce de matériaux de construction", "négoce de bois", "distributeur de matériel électrique", "distributeur de plomberie et sanitaire", "distributeur de fournitures industrielles", "grossiste en pièces automobiles", "grossiste en textile", "grossiste en produits de beauté pour salons", "distributeur d'équipements de cuisine professionnelle", "grossiste en fournitures de bureau", "grossiste en emballages", "grossiste en produits d'entretien et d'hygiène", "import-export"], "Cycle long", "Oui", "Oui"),
    ("Négoce et commerce de gros", ["Négoce de vins et spiritueux", "grossiste en boissons pour cafés et restaurants"], "Cycle long", "Oui", "À trancher"),
    ("Industrie et fabrication", ["Atelier de production", "sous-traitance industrielle", "mécanique de précision", "chaudronnerie", "imprimerie", "menuiserie de fabrication", "biscuiterie"], "Fabrication", "Oui", "Oui"),
    ("Industrie et fabrication", ["Brasserie artisanale (fabrication de bière)"], "Fabrication", "Oui", "À trancher"),
    ("BTP et artisanat", ["Électricien", "plombier-chauffagiste", "maçon", "peintre", "plaquiste", "carreleur", "menuisier poseur", "charpentier", "couvreur", "serrurier", "vitrier", "façadier", "terrassier", "climaticien", "installateur solaire ou pompe à chaleur", "pisciniste", "entreprise générale de bâtiment", "architecte d'intérieur"], "Chantier", "Non", "Oui"),
    ("BTP et artisanat", ["Cuisiniste"], "Chantier", "Oui", "Oui"),
    ("Immobilier", ["Constructeur de maisons individuelles"], "Cycle long", "Non", "Oui"),
    ("Immobilier", ["Promoteur immobilier", "marchand de biens"], "Cycle long", "Oui", "Oui"),
    ("Immobilier", ["Diagnostiqueur immobilier"], "Rendez-vous", "Non", "Oui"),
    ("Automobile", ["Garage et mécanicien", "carrossier"], "Rendez-vous", "À demander", "Oui"),
    ("Automobile", ["Contrôle technique"], "Rendez-vous", "Non", "Oui"),
    ("Transport et logistique", ["Livraison du dernier kilomètre", "transport de marchandises", "déménagement", "VTC et taxi", "autocariste", "coursier", "entreposage", "location de véhicules"], "Transport", "Non", "Oui"),
    ("Hôtellerie-restauration", ["Restaurant", "brasserie (restaurant)", "pizzeria", "restauration rapide", "salon de thé", "food truck", "cuisine en livraison seule"], "Hôtellerie-restauration", "Oui", "Oui"),
    ("Hôtellerie-restauration", ["Café-bar"], "Hôtellerie-restauration", "Oui", "À trancher"),
    ("Hôtellerie-restauration", ["Hôtel"], "Hôtellerie-restauration", "À demander", "Oui"),
    ("Hôtellerie-restauration", ["Camping", "gîte", "chambre d'hôtes"], "Hôtellerie-restauration", "Non", "Oui"),
    ("Beauté", ["Coiffeur", "barbier", "esthéticienne", "onglerie"], "Rendez-vous", "À demander", "Oui"),
    ("Beauté", ["Tatoueur"], "Rendez-vous", "Non", "Oui"),
    ("Sport et loisirs", ["Salle de sport"], "Abonnement", "Non", "Oui"),
    ("Sport et loisirs", ["Professeur de yoga ou de pilates", "escape game", "bowling", "parc de loisirs"], "Rendez-vous", "Non", "Oui"),
    ("Services aux particuliers", ["Aide à domicile", "ménage", "garde d'enfants", "crèche et micro-crèche"], "Abonnement", "Non", "Oui"),
    ("Services aux particuliers", ["Toiletteur", "cordonnier", "pressing"], "Rendez-vous", "Non", "Oui"),
    ("Services aux particuliers", ["Réparation de téléphones"], "Rendez-vous", "À demander", "Oui"),
    ("Services aux entreprises", ["Nettoyage de locaux", "gardiennage et sécurité", "dératisation"], "Abonnement", "Non", "Oui"),
    ("Professions réglementées", ["Avocat", "notaire", "commissaire de justice", "expert-comptable", "commissaire aux comptes"], "Réglementé", "Non", "Non"),
    ("Professions réglementées", ["Architecte", "géomètre-expert"], "Réglementé", "Non", "Non"),
    ("Professions réglementées", ["Médecin", "dentiste", "kiné", "infirmier libéral", "sage-femme", "orthophoniste", "vétérinaire", "psychologue"], "Réglementé", "Non", "Non"),
    ("Bien-être à visée santé", ["Ostéopathe", "naturopathe", "sophrologue"], "Réglementé", "Non", "Non"),
]

# Profil d'entreprise des professions réglementées : le document dit « profil selon le métier » sans
# le donner. Les quatre premiers sont ceux déjà retenus dans data/routage.json (document de règles,
# partie 3) ; les autres sont rapprochés d'un métier voisin et à confirmer.
PROFILS_REGLEMENTES = {
    "avocat": (["b2b"], None), "notaire": (["b2b"], None), "expert-comptable": (["abonnement"], None),
    "architecte": (["b2b"], None), "medecin": (["rdv"], None), "kine": (["rdv"], None),
    "commissaire-de-justice": (["b2b"], "rapproché d'avocat et de notaire"),
    "commissaire-aux-comptes": (["b2b"], "rapproché d'expert-comptable (mission) ; à confirmer"),
    "geometre-expert": (["b2b"], "rapproché d'architecte"),
    "dentiste": (["rdv"], "rapproché de médecin"), "infirmier-liberal": (["rdv"], "rapproché de médecin"),
    "sage-femme": (["rdv"], "rapproché de médecin"), "orthophoniste": (["rdv"], "rapproché de médecin"),
    "veterinaire": (["rdv"], "rapproché de médecin"), "psychologue": (["rdv"], "rapproché de médecin"),
    "osteopathe": (["rdv"], "rapproché de kiné"), "naturopathe": (["rdv"], "rapproché de kiné"),
    "sophrologue": (["rdv"], "rapproché de kiné"),
}


# Métiers d'hébergement et de location de véhicules : leur profil d'entreprise est « location »
# (ACQ-11.31 à 11.37 ne sont posées qu'à ce profil). Le classeur ne dit pas si un hôtel avec restaurant
# garde aussi le profil restaurant : à confirmer par le propriétaire.
METIERS_LOCATION = {"hotel", "camping", "gite", "chambre-d-hotes", "location-de-vehicules"}


def main():
    r = json.loads(FICHIER.read_text(encoding="utf-8"))
    if not any(c["id"] == "fabrication" for c in r["categories"]):
        r["categories"].append({
            "numero": 11, "id": "fabrication", "libelle": "Fabrication", "profils": [], "profilsConditionnels": [],
            "blocStock": False, "reglementee": False, "aCreer": True,
            "notes": "Nouvelle catégorie pour l'industrie : le seul ajout qui demande un nouveau questionnaire (document « Liste des métiers »). Tant qu'il n'existe pas, aucun profil n'est rattaché.",
        })
    for c in r["categories"]:
        c.pop("blocStock", None)

    metiers, vus = [], set()

    def ajouter(m):
        base = m["id"]
        n = 2
        while m["id"] in vus:
            m["id"] = f"{base}-{n}"
            n += 1
        vus.add(m["id"])
        metiers.append(m)

    for libelle, synonymes, parts in LISTE1:
        defaut = next(p for p in parts if p[4])
        m = {
            "id": slug(libelle), "libelle": libelle, "secteur": "Métiers à sous-parties",
            "categorie": CAT[defaut[1]], "stock": STOCK[defaut[2]], "agentComm": COMM[defaut[3]],
        }
        if synonymes:
            m["synonymes"] = synonymes
        sv = []
        for nom, cat, stock, comm, par_defaut in parts:
            v = {"id": slug(nom), "libelle": nom, "categorie": CAT[cat], "stock": STOCK[stock], "agentComm": COMM[comm]}
            if par_defaut:
                v["defaut"] = True
            if cat == "Réglementé":
                v["profils"] = ["b2b"]
                v["aConfirmer"] = "profil d'entreprise non précisé par le document : rapproché d'avocat (B2B)"
            sv.append(v)
        m["sousVariantes"] = sv
        ajouter(m)

    for secteur, noms, cat, stock, comm in LISTE2:
        for nom in noms:
            libelle = majuscule(nom)
            m = {"id": slug(libelle), "libelle": libelle, "secteur": secteur, "categorie": CAT[cat], "stock": STOCK[stock], "agentComm": COMM[comm]}
            if cat == "Réglementé":
                profils, a_confirmer = PROFILS_REGLEMENTES[m["id"]]
                m["profils"] = profils
                if a_confirmer:
                    m["aConfirmer"] = f"profil d'entreprise non précisé par le document : {a_confirmer}"
                if secteur.startswith("Bien-être"):
                    m["notes"] = "Réglementé par prudence (document « Liste des métiers »)."
            ajouter(m)

    # Profil location (classeur du 20 octobre, point 3) : hébergement et location de véhicules.
    if not any(p["id"] == "location" for p in r["profils"]):
        r["profils"].append({"id": "location", "libelle": "Location"})
    for m in metiers:
        if m["id"] in METIERS_LOCATION:
            m["profilsImposes"] = ["location"]

    r["metiers"] = metiers
    r["source"] = "Document « CAXE — Règles de fonctionnement » (15 octobre 2026), partie 3, et document « CAXE — Liste des métiers » (15 octobre 2026)."
    FICHIER.write_text(json.dumps(r, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    nb_sous = sum(len(m.get("sousVariantes", [])) for m in metiers)
    print(f"{len(metiers)} métiers ({sum(1 for m in metiers if 'sousVariantes' in m)} à sous-parties, {nb_sous} sous-parties) écrits dans {FICHIER}")


if __name__ == "__main__":
    main()

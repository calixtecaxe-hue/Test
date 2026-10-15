#!/usr/bin/env python3
"""Écrit data/catalogue-themes.json : la fiche de chaque thème pour les références de marché.

Règle : seuls les thèmes de nature « Marché » se comparent à un chiffre de marché. Les autres
(pratique, cohérence, contexte) ne déclenchent jamais de recherche.

Pour les thèmes de nature Marché, la liste des indicateurs ci-dessous a été VALIDÉE par le propriétaire
le 15 octobre (« ok pour les 36 ») : libellé, formule et unité viennent du classeur ; le sens (plus haut /
plus bas mieux) et les mots-clés sont ses propositions retenues. Les bornes de vraisemblance ne portent
que sur ce que la logique impose (une part est entre 0 et 100 %, une durée n'est pas négative) ;
tout autre plafond reste à fixer. Aucune recherche ne part tant qu'un indicateur est en brouillon.
"""
import json, glob, sys, os

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
themes = json.load(open(os.path.join(RACINE, "data/themes.json"), encoding="utf-8"))
donnees = {}
for f in sorted(glob.glob(os.path.join(RACINE, "data/donnees-*.json"))):
    for d in json.load(open(f, encoding="utf-8")):
        donnees[d["code"]] = d

PLUS_HAUT, PLUS_BAS, FOURCHETTE = "plus_haut_mieux", "plus_bas_mieux", "fourchette_ideale"

# code de la donnée -> (sens proposé, unité, période, mots-clés)
# unité : pourcent | jours | mois | euros_par_heure | euros | note
INDICATEURS = {
    "ACQ-02.07": (PLUS_HAUT, "pourcent", "mois", ["part des demandes qualifiées", "leads qualifiés"]),
    "ACQ-02.08": (PLUS_HAUT, "pourcent", "mois", ["taux de prise de rendez-vous", "demande vers rendez-vous"]),
    "ACQ-08.03": (PLUS_HAUT, "pourcent", "mois", ["appels manqués rappelés", "taux de rappel"]),
    "ACQ-09.09": (PLUS_HAUT, "pourcent", "mois", ["taux de présence aux rendez-vous"]),
    "ACQ-09.10": (PLUS_BAS, "pourcent", "mois", ["taux d'absence aux rendez-vous", "no-show"]),
    "ACQ-09.11": (PLUS_HAUT, "pourcent", "mois", ["taux de transformation des rendez-vous"]),
    "ACQ-10.13": (PLUS_HAUT, "pourcent", "mois", ["taux d'acceptation des devis", "taux de transformation des devis"]),
    "ACQ-10.14": (PLUS_HAUT, "pourcent", "mois", ["taux d'acceptation des devis en montant"]),
    "ACQ-10.16": (PLUS_HAUT, "pourcent", "mois", ["efficacité des relances de devis"]),
    "ACQ-11.19": (PLUS_HAUT, "pourcent", "mois", ["taux de transformation", "taux de conversion des demandes"]),
    "ACQ-11.24": (PLUS_HAUT, "pourcent", "mois", ["taux de conversion visiteurs en acheteurs", "taux de transformation en magasin"]),
    "ACQ-12.05": (PLUS_BAS, "jours", "cycle", ["durée du cycle de vente"]),
    "ACQ-13.03": (FOURCHETTE, "euros_par_heure", "heure", ["taux horaire", "tarif horaire moyen"]),
    "ACQ-14.01": (PLUS_BAS, "pourcent", "mois", ["part des ventes avec remise"]),
    "ACQ-14.02": (PLUS_BAS, "pourcent", "mois", ["remise moyenne accordée"]),
    "ACQ-17.02": (PLUS_HAUT, "pourcent", "an", ["taux de fidélisation", "taux de rétention clients"]),
    "ACQ-17.17": (PLUS_BAS, "pourcent", "an", ["taux d'attrition clients", "taux de clients perdus"]),
    "ACQ-17.22": (PLUS_BAS, "pourcent", "mois", ["taux de résiliation mensuel", "churn"]),
    "ACQ-17.24": (PLUS_HAUT, "mois", "abonnement", ["durée moyenne d'un abonnement"]),
    "ACQ-21.09": (FOURCHETTE, "pourcent", "mois", ["taux d'utilisation de la capacité", "taux de remplissage"]),
    "ACQ-21.12": (PLUS_HAUT, "pourcent", "mois", ["taux d'heures facturées", "taux d'activité facturable"]),
    "FIN-07.08": (FOURCHETTE, "pourcent", "mois", ["poids de la masse salariale dans le chiffre d'affaires", "ratio masse salariale sur CA"]),
    "FIN-07.10": (PLUS_HAUT, "euros", "mois", ["chiffre d'affaires par salarié", "CA par personne"]),
    "FIN-17.05": (PLUS_BAS, "jours", "an", ["délai moyen de paiement clients", "DSO"]),
    "FIN-17.07": (PLUS_BAS, "jours", "an", ["retard moyen de paiement"]),
    "FIN-38.01": (FOURCHETTE, "jours", "an", ["rotation du stock", "jours de stock"]),
    "FIN-40.04": (PLUS_BAS, "pourcent", "an", ["taux de démarque", "pertes et invendus en pourcentage des achats"]),
    "RH-32.05": (PLUS_BAS, "pourcent", "an", ["taux de turnover", "taux de départ annuel"]),
    "RH-34.04": (PLUS_BAS, "pourcent", "an", ["taux d'absentéisme"]),
    "COM-18.03": (PLUS_HAUT, "pourcent", "mois", ["part des réactions fortes sur les réseaux sociaux"]),
    "COM-19.02": (PLUS_HAUT, "pourcent", "mois", ["taux de clic réseaux sociaux"]),
    "COM-19.03": (PLUS_HAUT, "pourcent", "mois", ["taux de conversion du trafic social"]),
    "COM-23.04": (PLUS_HAUT, "pourcent", "mois", ["taux de messages devenant des demandes commerciales"]),
    "COM-36.01": (PLUS_HAUT, "pourcent", "mois", ["taux d'engagement réseaux sociaux"]),
    "COM-44.01": (PLUS_HAUT, "note", "avis", ["note moyenne des avis Google"]),
    "COM-44.07": (PLUS_HAUT, "pourcent", "mois", ["taux de clients laissant un avis"]),
}

# Sens dont la direction dépend du métier ou du contexte : à trancher avec le propriétaire.
# Validé par le propriétaire le 15 octobre (« ok pour les 36 ») : les sens proposés sont retenus.
SENS_INCERTAIN = set()

# Quatre données du classeur regroupent plusieurs chiffres : on garde celui qui se compare à un marché.
PRECISIONS = {
    "FIN-38.01": ("Jours de ventes couverts par le stock", "Valeur du stock ÷ (achats mensuels ÷ 30)"),
    "FIN-40.04": ("Pertes de stock en % des achats", "Pertes ÷ achats"),
    "RH-34.04": ("Taux d'absence", "Jours d'absence ÷ effectif, puis ÷ jours travaillés"),
    "COM-44.01": ("Note moyenne des avis", "Note moyenne affichée sur la fiche Google et sur la plateforme d'avis principale"),
}

MOTIF_NON = {
    "pratique": "Thème de nature Pratique : noté selon la pratique en place, pas selon un chiffre de marché.",
    "coherence": "Thème de nature Cohérence : noté selon la cohérence des réponses du dirigeant.",
    "contexte": "Thème de nature Contexte : non noté, sert de contexte à l'IA.",
}
MOTIF_VOLUME = "Volume absolu qui dépend de la taille de l'entreprise : seuls des ratios se comparent à un marché."


def bornes(unite):
    if unite == "pourcent":
        return {"min": 0, "max": 100}  # une part est entre 0 et 100 %
    if unite in ("jours", "mois", "euros_par_heure", "euros"):
        return {"min": 0, "max": None}  # positif par logique ; le plafond reste à fixer
    return {"min": None, "max": None}  # note : l'échelle dépend de la plateforme


catalogue = []
for t in themes:
    fiche = {
        "theme": t["code"], "agent": t["agent"], "libelle": t["nom"], "nature": t["nature"],
        "rechercheReference": False, "motif": None, "indicateurs": [],
    }
    if t["nature"] != "marche":
        fiche["motif"] = MOTIF_NON[t["nature"]]
    else:
        inds = []
        for code, (sens, unite, periode, mots) in INDICATEURS.items():
            if not code.startswith(t["code"] + "."):
                continue
            d = donnees[code]
            libelle, definition = PRECISIONS.get(code, (d["libelle"], d["calcul"] or d["libelle"]))
            inds.append({
                "id": code, "libelle": libelle,
                "definition": definition,
                "unite": unite, "periode": periode, "sens": sens,
                "sensIncertain": code in SENS_INCERTAIN,
                "bornesVraisemblance": bornes(unite),
                "motsCles": mots, "nationalAutorise": False, "statutRedaction": "valide",
            })
        if inds:
            fiche["rechercheReference"] = True
            fiche["indicateurs"] = inds
        else:
            fiche["motif"] = MOTIF_VOLUME
    catalogue.append(fiche)

absents = set(INDICATEURS) - {i["id"] for f in catalogue for i in f["indicateurs"]}
if absents:
    sys.exit(f"Indicateurs sans thème de nature Marché : {sorted(absents)}")

json.dump(catalogue, open(os.path.join(RACINE, "data/catalogue-themes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
oui = [f for f in catalogue if f["rechercheReference"]]
print(f"{len(catalogue)} thèmes ; {len(oui)} avec recherche de référence ; {sum(len(f['indicateurs']) for f in oui)} indicateurs validés")
print("Thèmes de nature Marché sans indicateur :", [f["theme"] for f in catalogue if f["nature"] == "marche" and not f["rechercheReference"]])

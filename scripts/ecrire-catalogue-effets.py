#!/usr/bin/env python3
"""Écrit data/catalogue-effets.json : les actions dont on cherche l'effet, une fois par action et par métier.

Décision du propriétaire (19 octobre) : le rapport dit ce que chaque action peut rapporter, avec recul.
Ce taux dépend du métier ; il est cherché une seule fois par action et par métier par l'agent de recherche,
vérifié par le code dans la source citée, puis enregistré et réutilisé. L'IA qui rédige le rapport ne choisit
jamais le pourcentage ; le moteur l'applique aux volumes du client.

CETTE LISTE EST UN BROUILLON : elle reprend les six croisements du classeur qui portent une « part récupérable
prudente, à sourcer » (XA17, XA19, XA24, XA35, XC33, XR15). Chaque effet est « brouillon » : aucune recherche ne
part avant sa validation par le propriétaire (définition, mesure, bornes). Les bornes ne portent que sur ce que
la logique impose : une part est entre 0 et 100 %.
"""
import json, os

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
croisements = {c["code"] for c in json.load(open(os.path.join(RACINE, "data/croisements.json"), encoding="utf-8"))}
themes = {t["code"]: t["agent"] for t in json.load(open(os.path.join(RACINE, "data/themes.json"), encoding="utf-8"))}

# (id, thème, action, ce que mesure l'effet, mots-clés, croisements)
EFFETS = [
    ("EFF-ACQ-01", "ACQ-10", "Relancer systématiquement les devis restés sans réponse",
     "Part des devis restés sans réponse qui sont finalement signés après une relance systématique, en pourcentage des devis relancés",
     ["relance des devis", "devis sans réponse relancés", "taux de signature après relance"], ["XA24"]),
    ("EFF-ACQ-02", "ACQ-15", "Proposer un complément à chaque vente",
     "Part des clients qui acceptent le complément proposé, en pourcentage des clients à qui il est proposé",
     ["vente complémentaire", "taux d'acceptation d'un complément", "vente additionnelle"], ["XA19"]),
    ("EFF-ACQ-03", "ACQ-17", "Relancer les anciens clients qui n'ont rien acheté depuis un an",
     "Part des anciens clients inactifs qui achètent à nouveau après une relance, en pourcentage des clients relancés",
     ["réactivation des clients inactifs", "relance des anciens clients", "taux de réactivation"], ["XA17"]),
    ("EFF-ACQ-04", "ACQ-11", "Relancer les paniers abandonnés par une relance automatique",
     "Part des paniers abandonnés qui aboutissent à une commande après une relance automatique, en pourcentage des paniers relancés",
     ["récupération de paniers abandonnés", "relance de panier abandonné", "taux de récupération"], ["XA35"]),
    ("EFF-COM-01", "COM-10", "Solliciter son réseau existant au démarrage d'une présence en ligne",
     "Part des contacts sollicités qui suivent le compte ou laissent un avis, en pourcentage des contacts sollicités",
     ["taux de réponse d'une sollicitation de contacts", "premiers abonnés", "demande d'avis aux clients existants"], ["XC33"]),
    ("EFF-RH-01", "RH-17", "Automatiser les tâches répétitives",
     "Part du temps passé sur les tâches répétitives qui est effectivement récupérée après automatisation, en pourcentage du temps de ces tâches",
     ["gain de temps de l'automatisation", "automatisation des tâches administratives", "temps récupéré par l'automatisation"], ["XR15"]),
]

sortie = []
for id_, theme, action, definition, mots, croix in EFFETS:
    assert theme in themes, theme
    for c in croix:
        assert c in croisements, c
    sortie.append({
        "id": id_,
        "theme": theme,
        "agent": themes[theme],
        "action": action,
        "libelle": action,
        "definition": definition,
        "unite": "pourcent",
        "periode": "effet",
        "sens": "plus_haut_mieux",
        "sensIncertain": False,
        "bornesVraisemblance": {"min": 0, "max": 100},
        "motsCles": mots,
        "croisements": croix,
        "nationalAutorise": False,
        "statutRedaction": "brouillon",
    })
with open(os.path.join(RACINE, "data/catalogue-effets.json"), "w", encoding="utf-8") as f:
    json.dump(sortie, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(f"data/catalogue-effets.json : {len(sortie)} effets (tous en brouillon).")

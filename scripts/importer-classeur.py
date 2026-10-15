#!/usr/bin/env python3
"""Convertit le classeur « CAXE_Themes_Chiffres_4_agents » en fichiers de données
(`data/*.json`). Le classeur reste l'outil d'écriture ; les JSON sont ce que lit
le code. Les relancer ne change rien si le classeur n'a pas changé.

Usage :  python3 scripts/importer-classeur.py chemin/vers/classeur.xlsx
Besoin :  pip install openpyxl

Rien n'est inventé : tout champ vient d'une cellule du classeur. Une cellule
« — » devient null.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

SORTIE = Path(__file__).resolve().parent.parent / "data"

AGENTS = {
    "Acquisition & CA": "ACQUISITION_CA",
    "Finance & Rentabilité": "FINANCE_RENTABILITE",
    "RH & Organisation": "RH_ORGANISATION",
    "Comm & Création": "COMM_CREATION",
}
ONGLETS_DONNEES = {
    "Acquisition — données": "ACQUISITION_CA",
    "Finance — données": "FINANCE_RENTABILITE",
    "RH — données": "RH_ORGANISATION",
    "Comm — données": "COMM_CREATION",
}
NATURES = {"Marché": "marche", "Pratique": "pratique", "Cohérence": "coherence", "Contexte": "contexte"}
MODES = {"Demandée": "demandee", "Importée": "importee", "Calculée": "calculee", "Partagée": "partagee", "Autre agent": "autre_agent"}
NIVEAUX = {"Essentiel": "essentiel", "Approfondi": "approfondi"}
CHIFFRE = {"Oui": "oui", "Non": "non", "Calculé": "calcule"}
SUR = {"CA": "ca", "trésorerie": "tresorerie", "contacts": "contacts", "marge": "marge", "heures": "heures"}
PROFILS = ["rdv", "commerce", "ecommerce", "restaurant", "chantier", "b2b", "abonnement"]
TAILLES = ["seul", "equipe_2_5", "structure_6_plus"]
RE_DONNEE = re.compile(r"\b(?:ACQ|FIN|RH|COM)-\d{2}\.\d{2}\b")
RE_CROISEMENT = re.compile(r"\b(?:XA|XF|XC|XR)\d{2}\b")
RE_DECLENCHEUR = re.compile(r"\bD\d{2}\b")


def v(cellule):
    """Texte d'une cellule, ou None si vide ou « — »."""
    if cellule is None:
        return None
    t = str(cellule).strip()
    return None if t in ("", "—") else t


def codes(texte):
    if texte is None:
        return []
    vus = []
    for c in RE_DONNEE.findall(texte) + RE_CROISEMENT.findall(texte):
        if c not in vus:
            vus.append(c)
    return vus


def lignes(ws, depuis=2):
    for r in ws.iter_rows(min_row=depuis, values_only=True):
        if r and r[0] not in (None, ""):
            yield r


def ecrire(nom, contenu):
    SORTIE.mkdir(exist_ok=True)
    (SORTIE / nom).write_text(json.dumps(contenu, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"  {nom} : {len(contenu)} éléments")


def themes(wb):
    sortie = []
    for r in lignes(wb["Thèmes"]):
        impact = v(r[5])
        if impact is None:
            impact_obj = {"type": "aucun", "sur": None}
        elif impact == "Qualifié":
            impact_obj = {"type": "qualifie", "sur": None}
        else:
            m = re.fullmatch(r"Chiffré \((.+)\)", impact)
            impact_obj = {"type": "chiffre", "sur": SUR[m.group(1)]}
        sortie.append({
            "code": r[0],
            "agent": AGENTS[r[1]],
            "bloc": r[2],
            "nom": r[3],
            "nature": NATURES[r[4]],
            "impact": impact_obj,
            "chiffreNecessaire": CHIFFRE[r[6]],
            "dejaConnu": v(r[8]),
            "methodeVolume": v(r[9]),
            "siInconnu": v(r[10]),
            "masquePour": v(r[11]),
        })
    ecrire("themes.json", sortie)


def donnees(wb):
    for onglet, agent in ONGLETS_DONNEES.items():
        ws = wb[onglet]
        entetes = [c.value for c in ws[1]]
        rh = agent == "RH_ORGANISATION"
        cles = TAILLES if rh else PROFILS
        i0 = entetes.index("Seul") if rh else entetes.index("RDV")
        i_sert = entetes.index("Sert à")
        sortie = []
        for r in lignes(ws):
            marques = {k: (r[i0 + n] == "●") for n, k in enumerate(cles)}
            sortie.append({
                "code": r[0],
                "theme": r[1],
                "ecran": v(r[3]),
                "libelle": r[4],
                "format": v(r[5]),
                "mode": MODES[r[6]],
                "niveau": NIVEAUX.get(v(r[7]) or ""),
                "condition": v(r[8]),
                "declencheurs": RE_DECLENCHEUR.findall(r[8] or ""),
                "periode": v(r[9]),
                ("tailles" if rh else "profils"): marques,
                "sertA": [s.strip() for s in (v(r[i_sert]) or "").split(",") if s.strip()],
                "calcul": v(r[i_sert + 1]),
                "entrees": codes(v(r[i_sert + 2])),
                "entreesTexte": v(r[i_sert + 2]),
                "utiliseeDans": codes(v(r[i_sert + 3])),
                "utiliseeDansTexte": v(r[i_sert + 3]),
            })
        ecrire(f"donnees-{agent.lower().replace('_', '-')}.json", sortie)


def croisements(wb):
    sortie = []
    for onglet in ("Croisements", "Croisements RH"):
        ws = wb[onglet]
        entetes = [c.value for c in ws[1]]
        rh = onglet == "Croisements RH"
        cles = TAILLES if rh else PROFILS
        i0 = entetes.index("Seul") if rh else entetes.index("RDV")
        for r in lignes(ws):
            marques = {k: (r[i0 + n] == "●") for n, k in enumerate(cles)}
            sortie.append({
                "code": r[0],
                "agent": AGENTS[r[1]],
                "nom": r[2],
                "calcul": r[3],
                "entrees": codes(v(r[4])),
                "entreesTexte": v(r[4]),
                ("tailles" if rh else "profils"): marques,
                "hypotheseExterne": v(r[i0 + len(cles)]),
                "phraseRapport": v(r[i0 + len(cles) + 1]),
            })
    ecrire("croisements.json", sortie)


def scenarios(wb):
    sortie = []
    for r in lignes(wb["Scénarios"], depuis=5):
        sortie.append({
            "code": r[0],
            "nom": r[1],
            "calcul": r[2],
            "entrees": codes(v(r[3])),
            "entreesTexte": v(r[3]),
            "phraseRapport": v(r[4]),
        })
    ecrire("scenarios.json", sortie)


def diagnostic_comm(wb):
    problemes = []
    ordre = []
    regle_vanite = None
    for r in lignes(wb["Diagnostic Comm"], depuis=5):
        if re.fullmatch(r"DC\d{2}", str(r[0])):
            problemes.append({
                "code": r[0],
                "probleme": r[1],
                "signaux": r[2],
                "entrees": codes(v(r[3])),
                "entreesTexte": v(r[3]),
                "recommande": r[4],
                "neRecommandePas": r[5],
            })
        elif str(r[0]).startswith("1."):
            ordre = [re.sub(r"^\d+\.\s*", "", p).strip() for p in re.split(r"\s{2}·\s{2}", str(r[0]))]
        elif str(r[0]).startswith("Abonnés"):
            regle_vanite = str(r[0])
    (SORTIE / "diagnostic-comm.json").write_text(
        json.dumps({"problemes": problemes, "ordreLectureChiffres": ordre, "regleChiffresDeVanite": regle_vanite}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"  diagnostic-comm.json : {len(problemes)} problèmes, ordre de lecture en {len(ordre)} niveaux")


def declencheurs(wb):
    sortie = []
    for r in lignes(wb["Déclencheurs"], depuis=5):
        sortie.append({
            "code": r[0],
            "question": r[1],
            "posee": r[2],
            "reponses": r[3],
            "effet": r[4],
            "donneesConcernees": int(r[5]) if r[5] not in (None, "") else None,
        })
    ecrire("declencheurs.json", sortie)


def lexique(wb):
    ws = wb["Lexique"]
    toutes = [r for r in ws.iter_rows(values_only=True)]
    i_entete = next(i for i, r in enumerate(toutes) if r[0] == "Mot générique")
    profils = [str(c) for c in toutes[i_entete][1:8]]
    mots = []
    for r in toutes[i_entete + 1:]:
        if not r[0] or str(r[0]).startswith("Quel profil"):
            break
        mots.append({"mot": r[0], "formes": dict(zip(PROFILS, [v(c) for c in r[1:8]]))})
    ecrire("lexique.json", mots)
    return profils


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
    print("Import :", sys.argv[1])
    themes(wb)
    donnees(wb)
    croisements(wb)
    scenarios(wb)
    diagnostic_comm(wb)
    declencheurs(wb)
    lexique(wb)


if __name__ == "__main__":
    main()

"""Applique à la banque de questions les corrections de la relecture du 28 octobre (docs/verification/relecture-questions.json).

- textes et aides reformulés (champs « texte » et « aide » d'un constat) ;
- choix ajoutés à une question (« options_ajoutees ») ;
- total imposé sur plusieurs colonnes (« total_colonnes ») ;
- bornes : un nombre de personnes, d'heures, de jours, de kilomètres ou d'euros ne peut pas être négatif (min 0), une part en %
  reste entre 0 et 100. Seuls le résultat de l'année (FIN-05.04) et la trésorerie (FIN-11.01) peuvent être négatifs.

Puis régénérer le classeur Excel de la banque :
    python3 scripts/verification/appliquer-relecture.py
    python3 scripts/exporter-modele-banque.py --avec-questions
Le script s'arrête sans rien écrire si un constat vise une question absente ou si un texte d'origine a changé depuis la relecture.
"""

import json
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
BANQUE = RACINE / "data" / "banque" / "questions.json"
ATTENTE = RACINE / "data" / "banque" / "en-attente.json"
RELECTURE = RACINE / "docs" / "verification" / "relecture-questions.json"
NEGATIF_PERMIS = {"FIN-05.04", "FIN-11.01"}
UNITES_POSITIVES = {"nombre", "heures", "jours", "semaines", "mois", "annees", "km", "euros", "euros_par_heure"}


def borner(spec, code, journal, chemin=""):
    if not spec:
        return
    t = spec.get("type")
    if t == "nombre":
        if spec.get("unite") == "pourcent":
            if "min" not in spec:
                spec["min"] = 0
                journal.append(f"{code}{chemin} : min 0")
            if "max" not in spec:
                spec["max"] = 100
                journal.append(f"{code}{chemin} : max 100")
        elif spec.get("unite") in UNITES_POSITIVES and "min" not in spec and code not in NEGATIF_PERMIS:
            spec["min"] = 0
            journal.append(f"{code}{chemin} : min 0")
    elif t == "composite":
        for c in spec["champs"]:
            borner(c["spec"], code, journal, f"#{c['id']}")
    elif t == "tableau":
        for c in spec["colonnes"]:
            borner(c["spec"], code, journal, f"#{c['id']}")


def main():
    banque = json.loads(BANQUE.read_text(encoding="utf-8"))
    relecture = json.loads(RELECTURE.read_text(encoding="utf-8"))
    par_code = {q["donnee"]: q for q in banque}
    erreurs, journal = [], []
    for code, c in relecture.items():
        q = par_code.get(code)
        if q is None:
            erreurs.append(f"{code} : absente de la banque")
            continue
        for champ in ("texte", "aide"):
            if champ in c and q.get(champ) != c[champ]:
                journal.append(f"{code} : {champ} reformulé")
                q[champ] = c[champ]
        for o in c.get("options_ajoutees", []):
            spec = q.get("reponse") or {}
            if spec.get("type") not in ("choix", "cases"):
                erreurs.append(f"{code} : options ajoutées à une question sans choix")
            elif not any(x["id"] == o["id"] for x in spec["options"]):
                spec["options"].append(o)
                journal.append(f"{code} : choix ajouté « {o['libelle']} »")
        if "total_colonnes" in c:
            spec = q.get("reponse") or {}
            ids = [x["id"] for x in spec.get("colonnes", [])]
            if spec.get("type") != "tableau" or "total" not in spec or not all(i in ids for i in c["total_colonnes"]):
                erreurs.append(f"{code} : total sur plusieurs colonnes impossible")
            elif spec["total"].get("colonnes") != c["total_colonnes"]:
                spec["total"]["colonne"] = c["total_colonnes"][0]
                spec["total"]["colonnes"] = c["total_colonnes"]
                journal.append(f"{code} : total imposé sur {len(c['total_colonnes'])} colonnes")
    for q in banque:
        borner(q.get("reponse"), q["donnee"], journal)
    # Questions en attente (ACQ-26, Fabrication) : mêmes bornes, pour qu'elles arrivent déjà bornées dans la banque.
    attente = json.loads(ATTENTE.read_text(encoding="utf-8"))
    for q in attente:
        borner(q.get("reponse"), q["donnee"], journal)
    if erreurs:
        print("\n".join(erreurs))
        sys.exit(1)
    BANQUE.write_text(json.dumps(banque, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ATTENTE.write_text(json.dumps(attente, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(journal)} modification(s) :")
    print("\n".join(f"  {x}" for x in journal))


if __name__ == "__main__":
    main()

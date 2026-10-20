#!/usr/bin/env python3
"""Convertit le classeur de rédaction de la banque de questions en
`data/banque/questions.json`.

Usage :  python3 scripts/importer-banque.py CAXE_Banque_Questions.xlsx [--sortie fichier.json] [--sans-controle]
         python3 scripts/importer-banque.py Banque_de_question_Visuel.html --ecarter-inconnues
Le fichier peut être le classeur Excel ou la page « Banque de questions » (HTML) : même contenu, mêmes contrôles.

L'import contrôle chaque ligne (type de réponse, options, champs, lignes, total), signale
chaque erreur avec son numéro de ligne Excel, et n'écrit RIEN tant qu'il en reste. Il lance
ensuite le contrôle complet des données (npm run donnees:controle). Une ligne sans question
est ignorée : la donnée reste « manquante ».

Option `--ecarter-inconnues` : une question dont le code n'existe pas dans les données des
4 agents, ou dont la donnée n'est pas « demandée » dans le classeur des 4 agents (par exemple
ajoutée ou changée dans le classeur de rédaction avant de l'être dans le classeur des 4 agents),
n'est pas importée ; elle est mise de côté dans `data/banque/en-attente.json`, avec sa raison et un
avertissement, et reprise automatiquement quand la donnée existera.
"""
import argparse
import glob
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from banque_commun import (  # noqa: E402
    COLONNES, TYPES, UNITES, champs_depuis_texte, ids_uniques, nombre, options_depuis_texte, spec_champ_depuis_texte,
)

RACINE = Path(__file__).resolve().parent.parent
RE_CODE = re.compile(r"^(ACQ|FIN|RH|COM)-\d{2}\.\d{2}$")


def texte(v):
    if v is None:
        return None
    t = str(v).strip()
    return t if t and t != "—" else None


def nombre_cellule(v):
    if v is None or str(v).strip() == "":
        return None
    if isinstance(v, (int, float)):
        return int(v) if float(v).is_integer() else float(v)
    return nombre(str(v).strip())


PROFILS_LEXIQUE = ["rdv", "commerce", "ecommerce", "restaurant", "chantier", "b2b", "abonnement"]


def cle_lexique(mot):
    """Même règle que `cleLexique` (src/lib/donnees/lexique.ts)."""
    t = unicodedata.normalize("NFD", mot.lower())
    t = re.sub(r"[\u0300-\u036f]", "", t)
    t = re.sub(r"['’]", " ", t)
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_")


def fusionner_lexique(wb, chemin, ecrire):
    """Onglet « Lexique » du classeur de la banque -> data/lexique.json, pour les 7 profils.

    Un mot nouveau est ajouté ; une forme qui diffère est mise à jour (et listée). Les lexiques
    propres à un métier (hébergement, négoce, cabinet…) ne sont pas encore branchés : ils sont
    comptés et signalés, jamais perdus (ils restent dans le classeur).
    """
    if "Lexique" not in wb.sheetnames:
        return
    lignes = list(wb["Lexique"].iter_rows(values_only=True))
    if not lignes:
        return
    titres = [str(c).strip() if c is not None else "" for c in lignes[0]]
    colonnes = {p: titres.index(p) for p in PROFILS_LEXIQUE if p in titres}
    autres = [t for t in titres[2:] if t and t not in PROFILS_LEXIQUE]
    lexique = json.loads(chemin.read_text(encoding="utf-8"))
    par_cle = {m.get("cle") or cle_lexique(m["mot"]): m for m in lexique}
    ajoutes, modifies = [], []
    for ligne in lignes[1:]:
        brut = texte(ligne[0])
        mot = texte(ligne[1]) if len(ligne) > 1 else None
        if not brut or not mot:
            continue
        cle = brut.strip("{} ")
        formes = {p: texte(ligne[i]) for p, i in colonnes.items()}
        existant = par_cle.get(cle)
        if existant is None:
            lexique.append({"mot": mot, "cle": cle, "formes": {p: formes.get(p) for p in PROFILS_LEXIQUE}})
            ajoutes.append(cle)
            continue
        for p, f in formes.items():
            if existant["formes"].get(p) != f:
                modifies.append(f"{cle}/{p} : « {existant['formes'].get(p)} » devient « {f} »")
                existant["formes"][p] = f
    if ecrire and (ajoutes or modifies):
        chemin.write_text(json.dumps(lexique, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Lexique : {len(ajoutes)} mot(s) ajouté(s) ({', '.join(ajoutes) or '—'}), {len(modifies)} forme(s) mise(s) à jour.")
    for m in modifies:
        print("   - " + m)
    if autres:
        print(f"   Lexiques propres à un métier non branchés ({len(autres)}) : {', '.join(autres)}.")


def classeur_depuis_html(chemin):
    """Page « Banque de questions » (HTML) -> classeur en mémoire, avec les mêmes feuilles « Questions » et « Lexique »
    que le classeur Excel. Les données sont dans la constante `DATA` du script de la page."""
    page = Path(chemin).read_text(encoding="utf-8")
    debut = page.find("const DATA = ")
    if debut == -1:
        sys.exit("Page de la banque non reconnue : la constante DATA est introuvable.")
    data, _ = json.JSONDecoder().raw_decode(page[debut + len("const DATA = "):])
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Questions"
    ws.append([t for _k, t, _w, _r in COLONNES])
    for r in data["rows"]:
        ligne = {
            "code": r.get("c"), "agent": r.get("a"), "theme": r.get("t"), "niveau": r.get("n"), "format": None,
            "libelle": r.get("f"), "concerne": r.get("p"), "condition": r.get("h"), "question": r.get("q"), "aide": r.get("ai"),
            "repli": None, "type": r.get("ty"), "unite": r.get("u"), "min": r.get("mi"), "max": r.get("ma"), "options": r.get("o"),
            "champs": r.get("ch"), "lignes": r.get("li"), "total": r.get("to"), "indice": None,
        }
        ws.append([ligne[cle] if ligne[cle] not in ("",) else None for cle, *_r in COLONNES])
    wl = wb.create_sheet("Lexique")
    lex = data.get("lex", {})
    colonnes = []
    for mots in lex.values():
        for k in mots:
            if k != "Mot" and k not in colonnes:
                colonnes.append(k)
    ordre = [p for p in PROFILS_LEXIQUE if p in colonnes] + [c for c in colonnes if c not in PROFILS_LEXIQUE]
    wl.append(["Mot à écrire dans la question", "Mot"] + ordre)
    for cle, mots in lex.items():
        wl.append([cle, mots.get("Mot")] + [mots.get(c) for c in ordre])
    return wb


def construire_reponse(ligne, erreur):
    """Spécification de réponse d'une ligne, ou None si la colonne « Type » est vide."""
    t_txt = texte(ligne.get("type"))
    if t_txt is None:
        return None
    if t_txt not in TYPES:
        erreur(f"type de réponse inconnu « {t_txt} » (attendu : {', '.join(TYPES)})")
        return None
    t = TYPES[t_txt]
    try:
        mini, maxi = nombre_cellule(ligne.get("min")), nombre_cellule(ligne.get("max"))
    except ValueError:
        erreur("Min ou Max n'est pas un nombre")
        return None

    if t == "texte":
        spec = {"type": "texte"}
        if maxi is not None:
            spec["max"] = int(maxi)
        return spec
    if t in ("oui_non", "date_mois"):
        return {"type": t}
    if t == "nombre":
        u_txt = texte(ligne.get("unite"))
        if u_txt is None:
            erreur("type Nombre : choisissez l'unité")
            return None
        if u_txt not in UNITES:
            erreur(f"unité inconnue « {u_txt} » (attendu : {', '.join(UNITES)})")
            return None
        spec = {"type": "nombre", "unite": UNITES[u_txt]}
        if mini is not None:
            spec["min"] = mini
        if maxi is not None:
            spec["max"] = maxi
        return spec
    if t in ("choix", "cases"):
        opts = texte(ligne.get("options"))
        if not opts:
            erreur(f"type {t_txt} : écrivez les options, séparées par « · »")
            return None
        spec = {"type": t, "options": options_depuis_texte(opts)}
        if len(spec["options"]) < 2:
            erreur("au moins deux options")
            return None
        if t == "cases":
            if mini is not None:
                spec["minChoix"] = int(mini)
            if maxi is not None:
                spec["maxChoix"] = int(maxi)
        return spec
    if t == "liste":
        if maxi is None:
            erreur("type Liste libre : indiquez dans Max le nombre d'éléments au plus")
            return None
        spec = {"type": "liste", "max": int(maxi)}
        if mini is not None:
            spec["min"] = int(mini)
        return spec
    if t == "composite":
        champs = texte(ligne.get("champs"))
        if not champs:
            erreur("type Plusieurs champs : décrivez les champs (Libellé [type] · Libellé [type])")
            return None
        try:
            return {"type": "composite", "champs": champs_depuis_texte(champs)}
        except ValueError as e:
            erreur(str(e))
            return None
    if t == "tableau":
        champs = texte(ligne.get("champs"))
        lignes_txt = texte(ligne.get("lignes"))
        if not champs or not lignes_txt:
            erreur("type Tableau : remplissez « Champs ou colonnes » et « Lignes du tableau »")
            return None
        try:
            colonnes = champs_depuis_texte(champs)
        except ValueError as e:
            erreur(str(e))
            return None
        m = re.match(r"^(fixe|cadrage|liste|libre)\s*:\s*(.+)$", lignes_txt, re.I)
        if not m:
            erreur("lignes mal écrites : fixe: A / B, cadrage: D03, liste: ACQ-01.01 ou libre: 5")
            return None
        genre, reste = m.group(1).lower(), m.group(2).strip()
        if genre == "fixe":
            libelles = [x.strip() for x in reste.split("/") if x.strip()]
            if not libelles:
                erreur("lignes fixes : écrivez au moins une ligne")
                return None
            lg = {"source": "fixe", "items": [{"id": i, "libelle": lib} for i, lib in zip(ids_uniques(libelles), libelles)]}
        elif genre == "cadrage":
            if not re.match(r"^D\d{2}$", reste):
                erreur("cadrage : un code D03, D20 ou D22")
                return None
            lg = {"source": "declencheur", "cle": reste}
        elif genre == "liste":
            if not RE_CODE.match(reste):
                erreur("liste : un code de donnée, par exemple ACQ-01.01")
                return None
            lg = {"source": "donnee", "code": reste}
        else:
            if not reste.isdigit() or int(reste) < 1:
                erreur("libre : un nombre de lignes au plus, par exemple libre: 5")
                return None
            lg = {"source": "libre", "max": int(reste)}
        spec = {"type": "tableau", "lignes": lg, "colonnes": colonnes}
        total = texte(ligne.get("total"))
        if total:
            mt = re.match(r"^(.+?)\s*=\s*(-?\d+(?:[.,]\d+)?)$", total)
            if not mt:
                erreur("total mal écrit : Colonne = valeur (ex. Part du CA = 100)")
                return None
            col = next((c for c in colonnes if c["libelle"].lower() == mt.group(1).strip().lower()), None)
            if col is None:
                erreur(f"total : la colonne « {mt.group(1).strip()} » n'existe pas")
                return None
            spec["total"] = {"colonne": col["id"], "valeur": nombre(mt.group(2))}
        return spec
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("classeur")
    ap.add_argument("--sortie", default=str(RACINE / "data" / "banque" / "questions.json"))
    ap.add_argument("--sans-controle", action="store_true")
    ap.add_argument("--reporter-lexique", action="store_true", help="reporte aussi l'onglet Lexique de la banque dans data/lexique.json (le classeur des 4 agents en est la source depuis le 20 octobre)")
    ap.add_argument("--ecarter-inconnues", action="store_true",
                    help="met de côté les questions dont la donnée n'existe pas encore (data/banque/en-attente.json)")
    args = ap.parse_args()

    wb = classeur_depuis_html(args.classeur) if args.classeur.lower().endswith((".html", ".htm")) else openpyxl.load_workbook(args.classeur, data_only=True)
    if "Questions" not in wb.sheetnames:
        sys.exit("Feuille « Questions » introuvable : utilisez le gabarit généré par exporter-modele-banque.py.")
    ws = wb["Questions"]
    titres = [c.value for c in ws[1]]
    attendus = [t for _k, t, _w, _r in COLONNES]
    if titres[: len(attendus)] != attendus:
        sys.exit("Les colonnes de la feuille « Questions » ne correspondent pas au gabarit (ne les déplacez pas, ne les renommez pas).")

    erreurs, questions, vus, ignorees = [], [], set(), 0
    for n, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
        ligne = {cle: row[j] for j, (cle, *_r) in enumerate(COLONNES)}
        code = texte(ligne["code"])
        if not code:
            continue

        def erreur(msg, n=n, code=code):
            erreurs.append(f"ligne {n} ({code}) : {msg}")

        if not RE_CODE.match(code):
            erreur("code de donnée invalide")
            continue
        q = texte(ligne["question"])
        if q is None:
            ignorees += 1
            continue
        if code in vus:
            erreur("code en double")
            continue
        vus.add(code)
        if len(q) > 600:
            erreur("question trop longue (600 caractères au plus)")
        entree = {"donnee": code, "texte": q, "aide": texte(ligne["aide"]), "repli": texte(ligne["repli"])}
        reponse = construire_reponse(ligne, erreur)
        if reponse is not None:
            entree["reponse"] = reponse
        questions.append(entree)

    # Le lexique du classeur n'est reporté dans les données que pour l'import « officiel » (sortie par défaut).
    sortie_officielle = Path(args.sortie).resolve() == (RACINE / "data" / "banque" / "questions.json").resolve()
    if not erreurs and sortie_officielle and args.reporter_lexique:
        fusionner_lexique(wb, RACINE / "data" / "lexique.json", ecrire=True)

    en_attente = []
    if args.ecarter_inconnues and not erreurs:
        modes = {}
        for f in glob.glob(str(RACINE / "data" / "donnees-*.json")):
            for d in json.loads(Path(f).read_text(encoding="utf-8")):
                modes[d["code"]] = d["mode"]

        def raison(q):
            m = modes.get(q["donnee"])
            if m is None:
                return "donnee_inconnue"
            # « partagée » : posée par le premier agent qui en a besoin, comme une donnée demandée.
            return None if m in ("demandee", "partagee") else f"donnee_{m}"

        en_attente = [{**q, "raison": raison(q)} for q in questions if raison(q)]
        questions = [q for q in questions if not raison(q)]

    if erreurs:
        print(f"{len(erreurs)} erreur(s) : rien n'a été écrit.", file=sys.stderr)
        for e in erreurs:
            print("  - " + e, file=sys.stderr)
        sys.exit(1)

    Path(args.sortie).write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(questions)} question(s) écrites dans {args.sortie} ({ignorees} ligne(s) sans question ignorée(s)).")
    fichier_attente = Path(args.sortie).with_name("en-attente.json")
    if en_attente:
        fichier_attente.write_text(json.dumps(en_attente, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        par_raison = {}
        for q in en_attente:
            par_raison.setdefault(q["raison"], []).append(q["donnee"])
        libelles = {"donnee_inconnue": "donnée absente du classeur des 4 agents", "donnee_importee": "donnée « importée » dans le classeur", "donnee_calculee": "donnée « calculée » dans le classeur", "donnee_partagee": "donnée « partagée » dans le classeur", "donnee_autre_agent": "donnée d'un autre agent dans le classeur"}
        print(f"ATTENTION : {len(en_attente)} question(s) mise(s) de côté dans {fichier_attente.name} : elles ne sont pas posées tant que le classeur des 4 agents ne les contient pas comme données demandées.")
        for r, cs in par_raison.items():
            print(f"   - {libelles.get(r, r)} : {len(cs)} ({', '.join(cs[:8])}{'…' if len(cs) > 8 else ''})")
    elif args.ecarter_inconnues and fichier_attente.exists():
        fichier_attente.unlink()

    if not args.sans_controle:
        r = subprocess.run(["node", str(RACINE / "scripts" / "controle-donnees.mts")], cwd=RACINE, capture_output=True, text=True)
        sys.stdout.write(r.stdout)
        if r.returncode != 0:
            sys.stderr.write(r.stderr)
            print("Le contrôle des données a échoué : corrigez le classeur (le fichier a été écrit pour que vous voyiez le détail).", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()

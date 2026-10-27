"""Éléments communs au gabarit de la banque de questions (export et import).

La banque de questions s'écrit dans un classeur Excel : une ligne par donnée posée au
dirigeant. Ce module décrit les colonnes et la façon d'écrire une réponse attendue
(type, unité, options, champs, lignes), pour que l'export (gabarit prérempli) et l'import
(banque/questions.json) parlent la même langue.
"""
import re
import unicodedata

# Colonnes de la feuille « Questions » : (clé, titre, largeur, à remplir ?)
COLONNES = [
    ("code", "Code", 11, False),
    ("agent", "Agent", 14, False),
    ("theme", "Thème", 26, False),
    ("niveau", "Niveau", 11, False),
    ("format", "Format du classeur", 24, False),
    ("libelle", "Ce que le classeur veut savoir", 48, False),
    ("concerne", "Profils ou tailles concernés", 22, False),
    ("condition", "Posée si", 22, False),
    ("question", "QUESTION (à écrire)", 60, True),
    ("aide", "Aide (facultatif)", 34, True),
    ("repli", "Si « je ne sais pas » : que faire ? (facultatif)", 34, True),
    ("type", "Type de réponse", 18, True),
    ("unite", "Unité (si Nombre)", 12, True),
    ("min", "Min", 8, True),
    ("max", "Max", 8, True),
    ("options", "Options (A · B · C)", 34, True),
    ("champs", "Champs ou colonnes : Libellé [type] · Libellé [type]", 46, True),
    ("lignes", "Lignes du tableau", 34, True),
    ("total", "Total imposé (Colonne = valeur ; plusieurs colonnes séparées par « ; »)", 20, True),
    ("indice", "Ce que le format laisse entendre", 46, False),
]

TYPES = {
    "Nombre": "nombre",
    "Oui / non": "oui_non",
    "Choix unique": "choix",
    "Cases à cocher": "cases",
    "Liste libre": "liste",
    "Texte": "texte",
    "Mois et année": "date_mois",
    "Plusieurs champs": "composite",
    "Tableau": "tableau",
}
TYPES_INVERSE = {v: k for k, v in TYPES.items()}

UNITES = {
    "nombre": "nombre",
    "€": "euros",
    "%": "pourcent",
    "jours": "jours",
    "heures": "heures",
    "semaines": "semaines",
    "mois": "mois",
    "ans": "annees",
    "km": "km",
    "€ / heure": "euros_par_heure",
    "points": "points",
}
UNITES_INVERSE = {v: k for k, v in UNITES.items()}

SEP = "·"


def slug(texte):
    s = unicodedata.normalize("NFD", texte.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")[:40]
    return s or "option"


def ids_uniques(libelles):
    """Mêmes identifiants que optionsDepuis / idsDeListe côté code."""
    vus, sortie = set(), []
    for lib in libelles:
        base = slug(lib)
        ident, n = base, 2
        while ident in vus:
            ident = f"{base[:36]}_{n}"
            n += 1
        vus.add(ident)
        sortie.append(ident)
    return sortie


def options_depuis_texte(texte):
    libelles = [x.strip() for x in texte.split(SEP) if x.strip()]
    return [{"id": i, "libelle": lib} for i, lib in zip(ids_uniques(libelles), libelles)]


def options_vers_texte(options):
    return f" {SEP} ".join(o["libelle"] for o in options)


# --- Champs : « Libellé [type] » ---------------------------------------------------------

RE_CHAMP = re.compile(r"^(?P<libelle>.+?)\s*\[(?P<type>[^\]]+)\]\s*$")
RE_BORNES = re.compile(r"^(?P<u>.*?)\s*(?P<min>-?\d+(?:[.,]\d+)?)?\s*-\s*(?P<max>-?\d+(?:[.,]\d+)?)?$")


def nombre(t):
    return float(t.replace(",", ".")) if "." in t or "," in t else int(t)


def spec_champ_depuis_texte(texte):
    """« % 0-100 », « € 0- », « oui / non », « texte », « choix: A / B / C », « mois et année »."""
    t = texte.strip()
    bas = t.lower()
    if bas in ("oui / non", "oui/non", "oui_non"):
        return {"type": "oui_non"}
    if bas == "texte":
        return {"type": "texte"}
    if bas in ("mois et année", "date"):
        return {"type": "date_mois"}
    m = re.match(r"^choix\s*:\s*(.+)$", t, re.I)
    if m:
        options = [x.strip() for x in m.group(1).split("/") if x.strip()]
        return {"type": "choix", "options": [{"id": i, "libelle": lib} for i, lib in zip(ids_uniques(options), options)]}
    unite_txt, mini, maxi = t, None, None
    mb = RE_BORNES.match(t)
    if mb and (mb.group("min") is not None or mb.group("max") is not None or t.rstrip().endswith("-")):
        unite_txt = mb.group("u").strip()
        mini = nombre(mb.group("min")) if mb.group("min") else None
        maxi = nombre(mb.group("max")) if mb.group("max") else None
    unite = UNITES.get(unite_txt.lower()) or UNITES.get(unite_txt)
    if unite is None:
        raise ValueError(f"type de champ inconnu « {t} » (attendu : nombre, €, %, jours, heures, semaines, mois, ans, km, € / heure, points, oui / non, texte, mois et année, choix: A / B)")
    spec = {"type": "nombre", "unite": unite}
    if mini is not None:
        spec["min"] = mini
    if maxi is not None:
        spec["max"] = maxi
    return spec


def champs_depuis_texte(texte):
    champs = []
    for morceau in [x for x in texte.split(SEP) if x.strip()]:
        m = RE_CHAMP.match(morceau.strip())
        if not m:
            raise ValueError(f"champ mal écrit « {morceau.strip()} » (attendu : Libellé [type])")
        champs.append({"libelle": m.group("libelle").strip(), "spec": spec_champ_depuis_texte(m.group("type"))})
    ids = ids_uniques([c["libelle"] for c in champs])
    return [{"id": i, "libelle": c["libelle"], "spec": c["spec"]} for i, c in zip(ids, champs)]


def spec_champ_vers_texte(spec):
    t = spec["type"]
    if t == "oui_non":
        return "oui / non"
    if t == "texte":
        return "texte"
    if t == "date_mois":
        return "mois et année"
    if t == "choix":
        return "choix: " + " / ".join(o["libelle"] for o in spec["options"])
    u = UNITES_INVERSE[spec["unite"]]
    if "min" in spec or "max" in spec:
        return f"{u} {spec.get('min', '')}-{spec.get('max', '')}".replace("  ", " ")
    return u


def champs_vers_texte(champs):
    return f" {SEP} ".join(f"{c['libelle']} [{spec_champ_vers_texte(c['spec'])}]" for c in champs)

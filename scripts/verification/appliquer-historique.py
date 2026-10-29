"""Applique à la banque de questions la vérification de l'historique du 28 octobre (docs/verification/historique.md).

- questions sur le passé reformulées : la période comparée est dite (« les mêmes 3 mois, un an plus tôt »), les mois exacts
  s'affichent sous la question ;
- questions des données ajoutées au classeur 12 (ACQ-23.12, ACQ-23.13, FIN-07.17, FIN-14.03, FIN-14.04).

Puis régénérer le classeur Excel de la banque :
    python3 scripts/verification/appliquer-historique.py
    python3 scripts/exporter-modele-banque.py --avec-questions
Sans effet si c'est déjà fait. S'arrête sans rien écrire si un texte d'origine a changé depuis la vérification.
"""

import json
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
BANQUE = RACINE / "data" / "banque" / "questions.json"

MOIS_SOUS = "Les mois exacts sont indiqués sous la question."
MOIS_SOUS_1 = "Le mois exact est indiqué sous la question."
FOURCHETTE = "Un ordre de grandeur suffit : vous pouvez donner une fourchette."

# code → (texte d'origine, nouveau texte, nouvelle aide)
REFORMULATIONS = {
    "ACQ-02.02": ("Il y a 6 mois, combien de {demandes} aviez-vous par mois ?",
                  "Sur 3 mois, six mois plus tôt, combien de {demandes} aviez-vous par mois, en moyenne ?",
                  f"{MOIS_SOUS} {FOURCHETTE}"),
    "ACQ-02.03": ("Il y a un an, à la même période, combien de {demandes} aviez-vous par mois ?",
                  "Sur les mêmes 3 mois, un an plus tôt, combien de {demandes} aviez-vous par mois, en moyenne ?",
                  f"{MOIS_SOUS} Comparer les mêmes mois évite l'effet des vacances ou des fêtes. {FOURCHETTE}"),
    "ACQ-11.02": ("Il y a un an, à la même période, combien de nouveaux clients aviez-vous par mois ?",
                  "Sur les mêmes 3 mois, un an plus tôt, combien de nouveaux clients aviez-vous par mois, en moyenne ?",
                  f"{MOIS_SOUS} Seulement les clients venus pour la première fois. {FOURCHETTE}"),
    "ACQ-03.06": ("Sur les 12 derniers mois, chaque canal vous a-t-il apporté plus, autant ou moins de clients que l'année d'avant ?",
                  "Sur les 12 derniers mois, chaque canal vous a-t-il apporté plus, autant ou moins de clients que sur les 12 mois précédents ?",
                  f"{MOIS_SOUS} Les 12 mois précédents sont ceux qui précèdent les 12 derniers mois."),
    "ACQ-16.03": ("Et l'année d'avant, combien chacun de ces clients vous avait-il payé ?",
                  "Et sur les 12 mois précédents, combien chacun de ces clients vous avait-il payé ?",
                  f"{MOIS_SOUS} 0 pour un client que vous n'aviez pas encore. Laissez vide un montant que vous ne connaissez pas."),
    "ACQ-23.03": ("Pour chacun de ces 12 mois, quel était votre chiffre d'affaires un an plus tôt ?",
                  "Pour chacun de ces mois, un an plus tôt, quel était votre chiffre d'affaires ?",
                  "Chaque ligne indique le mois. Votre logiciel de facturation ou de caisse, ou votre comptable, donne ce détail. 0 pour un mois sans chiffre d'affaires ; laissez vide un mois que vous ne connaissez pas : il ne compte pas pour zéro."),
    "ACQ-23.01": ("Quel a été votre chiffre d'affaires pour chacun des 12 derniers mois ?", None,
                  "Chaque ligne indique le mois. Votre logiciel de facturation ou de caisse, ou votre comptable, donne ce détail. 0 pour un mois sans chiffre d'affaires ; laissez vide un mois que vous ne connaissez pas : il ne compte pas pour zéro."),
    "FIN-14.01": ("Quel a été votre chiffre d'affaires pour chacun des 12 derniers mois ?", None,
                  "Chaque ligne indique le mois. Votre logiciel de facturation ou de caisse, ou votre comptable, donne ce détail. 0 pour un mois sans chiffre d'affaires ; laissez vide un mois que vous ne connaissez pas : il ne compte pas pour zéro."),
    "RH-11.01": ("Quel a été votre chiffre d'affaires pour chacun des 12 derniers mois ?", None,
                 "Chaque ligne indique le mois. Votre logiciel de facturation ou de caisse, ou votre comptable, donne ce détail. 0 pour un mois sans chiffre d'affaires ; laissez vide un mois que vous ne connaissez pas : il ne compte pas pour zéro."),
    "COM-13.06": ("Il y a 6 mois, combien de visites votre site recevait-il par mois ?",
                  "Sur 3 mois, six mois plus tôt, combien de visites votre site recevait-il par mois, en moyenne ?",
                  f"{MOIS_SOUS} Si votre site ou votre outil de mesure n'existait pas encore, répondez « je ne suis pas cette donnée »."),
    "FIN-05.03": ("Il y a 12 mois, combien vous coûtaient vos charges fixes par mois, au total ?", None,
                  f"{MOIS_SOUS_1} Les mêmes postes qu'aujourd'hui : loyer, énergie, assurances, véhicules, frais bancaires, honoraires, abonnements et contrats, salaires de vos salariés, marketing et communication. Sans votre propre rémunération, les crédits ni les commissions sur ventes. Votre comptable peut vous donner ce total."),
    "FIN-06.03": ("Il y a un an, à la même période, combien vous coûtaient par mois les charges qui varient avec votre activité, achats compris ?",
                  "Sur les mêmes 3 mois, un an plus tôt, combien vous coûtaient par mois les charges qui varient avec votre activité, achats compris ?",
                  f"{MOIS_SOUS} Les mêmes postes qu'aujourd'hui : commissions, livraison, frais de paiement, consommables, intérim, achats et sous-traitance. {FOURCHETTE}"),
    "FIN-07.02": ("Il y a 12 mois, combien vous coûtaient vos salariés par mois, charges patronales comprises ?",
                  "Sur les mêmes 3 mois, un an plus tôt, combien vous coûtaient vos salariés par mois, charges patronales comprises ?",
                  f"{MOIS_SOUS} Vos bulletins de paie ou votre comptable donnent ce total."),
    "FIN-10.05": ("Par rapport à il y a 12 mois, ces coûts sont-ils plus élevés, stables ou plus bas ?",
                  "Ces coûts sont-ils plus élevés, stables ou plus bas qu'il y a 12 mois ?", MOIS_SOUS_1),
    "FIN-17.04": ("Par rapport à il y a 12 mois, vos clients vous paient-ils plus vite ou plus lentement ?",
                  "Vos clients vous paient-ils plus vite, dans les mêmes délais ou plus lentement qu'il y a 12 mois ?", MOIS_SOUS_1),
    "FIN-18.06": ("Et l'année d'avant, combien aviez-vous perdu en factures jamais payées ?",
                  "Et sur les 12 mois précédents, combien aviez-vous perdu en factures jamais payées ?",
                  f"{MOIS_SOUS} 0 si aucune facture n'a été abandonnée."),
    "FIN-37.02": ("Il y a 12 mois, quelle était la valeur de votre stock, au prix d'achat ?", None, f"{MOIS_SOUS_1} {FOURCHETTE}"),
    "FIN-40.02": ("Par rapport à il y a 12 mois, perdez-vous plus, autant ou moins de stock ?",
                  "Perdez-vous plus, autant ou moins de stock qu'il y a 12 mois ?", MOIS_SOUS_1),
    "RH-05.05": ("Par rapport à il y a 12 mois, travaillez-vous moins, autant ou plus ?",
                 "Travaillez-vous moins, autant ou plus qu'il y a 12 mois ?", MOIS_SOUS_1),
    "ACQ-07.05": ("Il y a 12 mois, combien dépensiez-vous par mois au total en publicité, plateformes, salons, agence, contenu et outils marketing ?", None,
                  f"{MOIS_SOUS_1} Sans les commissions des plateformes. {FOURCHETTE}"),
    "FIN-06.01": ("En moyenne sur les 3 derniers mois, combien vous coûtent par mois les charges qui varient avec votre activité, poste par poste ?", None,
                  "Les achats de marchandises et la sous-traitance sont demandés à part. 0 pour un poste que vous n'avez pas ; laissez vide un montant que vous ne connaissez pas."),
    "COM-32.02": ("Combien dépensez-vous par mois pour vos autres frais de communication ?", None,
                  "Pour une dépense payée à l'année, divisez-la par 12. Les flyers et affiches de publicité sont comptés avec vos canaux, pas ici. 0 pour un poste que vous n'avez pas ; laissez vide un montant que vous ne connaissez pas."),
    "COM-32.03": ("Il y a 12 mois, combien dépensiez-vous par mois en community manager, influence et impression ?", None,
                  f"{MOIS_SOUS_1} Le reste de votre budget d'il y a 12 mois est demandé avec votre budget marketing."),
}

PERIMETRE = {
    "type": "composite",
    "champs": [
        {"id": "changement", "libelle": "Changement", "spec": {"type": "choix", "options": [
            {"id": "aucun_changement", "libelle": "Aucun changement"},
            {"id": "ouverture_ou_fermeture_d_un_etablissemen", "libelle": "Ouverture ou fermeture d'un établissement"},
            {"id": "rachat_ou_vente_d_une_activite", "libelle": "Rachat ou vente d'une activité"},
            {"id": "nouvelle_activite_ou_arret_d_une_activit", "libelle": "Nouvelle activité, ou arrêt d'une activité"},
            {"id": "autre_changement_de_perimetre", "libelle": "Autre changement de périmètre"},
        ]}},
        {"id": "mois_du_changement_le_plus_recent", "libelle": "Mois du changement (le plus récent)", "spec": {"type": "date_mois"}},
    ],
}
TEXTE_PERIMETRE = "Sur les 24 derniers mois, le périmètre de votre activité a-t-il changé ?"
AIDE_PERIMETRE = ("Par exemple l'ouverture d'un deuxième magasin, le rachat d'un concurrent ou l'arrêt d'une activité. "
                  "Si c'est le cas, indiquez le mois du changement le plus récent : une comparaison d'une année sur l'autre "
                  "n'est faite que sur un même périmètre.")

NOUVELLES = [
    {"donnee": "ACQ-23.12", "texte": "Sur les 12 mois précédents, combien de {ventes_realisees} avez-vous réalisées au total ?",
     "aide": f"{MOIS_SOUS} Votre caisse ou votre logiciel de facturation donne ce chiffre. {FOURCHETTE}", "repli": None,
     "reponse": {"type": "nombre", "unite": "nombre", "min": 0}},
    {"donnee": "ACQ-23.13", "texte": TEXTE_PERIMETRE, "aide": AIDE_PERIMETRE, "repli": None, "reponse": PERIMETRE},
    {"donnee": "FIN-07.17", "texte": "Il y a 12 mois, combien de personnes travaillaient dans votre entreprise, vous compris ?",
     "aide": f"{MOIS_SOUS_1} Comptez comme dans votre dossier d'entreprise : vous y compris.", "repli": None,
     "reponse": {"type": "nombre", "unite": "nombre", "min": 1}},
    {"donnee": "FIN-14.04", "texte": TEXTE_PERIMETRE, "aide": AIDE_PERIMETRE, "repli": None, "reponse": PERIMETRE},
]


def main():
    banque = json.loads(BANQUE.read_text(encoding="utf-8"))
    par_code = {q["donnee"]: q for q in banque}
    erreurs, journal = [], []
    for code, (origine, texte, aide) in REFORMULATIONS.items():
        q = par_code.get(code)
        if q is None:
            erreurs.append(f"{code} : absente de la banque")
            continue
        if (texte is None or q["texte"] == texte) and q.get("aide") == aide:
            continue
        if q["texte"] != origine and q["texte"] != texte:
            erreurs.append(f"{code} : texte changé depuis la vérification ({q['texte']!r})")
            continue
        if texte:
            q["texte"] = texte
        if aide and q.get("aide") != aide:
            q["aide"] = aide
        journal.append(f"{code} : reformulée")
    # FIN-14.03 reprend la question d'ACQ-23.03, à laquelle elle est liée.
    nouvelles = list(NOUVELLES)
    acq = par_code["ACQ-23.03"]
    nouvelles.append({"donnee": "FIN-14.03", "texte": REFORMULATIONS["ACQ-23.03"][1], "aide": REFORMULATIONS["ACQ-23.03"][2],
                      "repli": None, "reponse": json.loads(json.dumps(acq["reponse"]))})
    for n in nouvelles:
        if n["donnee"] in par_code:
            par_code[n["donnee"]].update(n)
            continue
        banque.append(n)
        journal.append(f"{n['donnee']} : ajoutée")
    if erreurs:
        print("Rien n'est écrit :", *erreurs, sep="\n  ")
        sys.exit(1)
    BANQUE.write_text(json.dumps(banque, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(len(journal), "changements", *journal, sep="\n  ")


if __name__ == "__main__":
    main()

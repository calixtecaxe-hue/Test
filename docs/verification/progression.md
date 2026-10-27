# Vérification du questionnaire : journal de progression

Trace de travail de la vérification lancée le 27 octobre 2026 au soir (questionnaire, dépendances, parcours, résultats). Le rapport
est `docs/verification/rapport.md`. Chaque étape dit ce qui a été **exécuté** (navigateur, base), ce qui a été **vérifié dans le
code**, ce qui a été **simulé** (réponses fabriquées passées au vrai code) et ce qui reste une **hypothèse**.

| Étape | État | Sortie |
|---|---|---|
| V1 Inventaire des questions | fait | `inventaire-questions.csv`, `inventaire-questions.json` (`node scripts/verification/inventaire.mts`) |
| V2 Matrice des dépendances | fait | `matrice-dependances.csv` |
| V3 Cas de référence des canaux | fait, 26 contrôles conformes | `node scripts/verification/canaux.mjs` |
| V4 Relecture des questions | fait : 29 constats, 229 modifications de la banque, statut de relecture et contrôles automatiques du texte dans l'inventaire | `relecture-questions.json`, `appliquer-relecture.py` |
| V5 Dépendances dans le navigateur | fait : 91 règles jouées dans les deux sens (plan + exécution) ; 4 règles hors plan, expliquées | `plan-dependances.json`, `dependances.mjs` |
| V6 Parcours, cas difficiles, résultats | fait : cohérence des résultats, séparation, départs de page, changements rapides, parcours existants relancés | `resultats.mjs`, `separation.mjs`, `retours.mjs`, `rapides.mjs`, `tout.sh` |
| V7 Rapport | fait | `rapport.md`, `chiffres.json`, `resultats/`, `captures/` |

## Étapes de la journée

1. Inventaire et matrice : 561 questions, 1 088 liens. Défaut principal trouvé à la lecture du code : les réponses devenues inapplicables
   restaient actives (corrigé, M1 à M3 du rapport).
2. Canaux : 26 contrôles, corrections de l'ordre des lignes, de la lecture de « 50 % », de « Valeur retenue ».
3. Relecture : 29 constats, bornes sur 192 champs, total de COM-12.01 sur trois colonnes, doublons D27 et D13.
4. Plan des dépendances : il a révélé la sous-question de cadrage D12 gardée (M7, corrigé).
5. Premier passage navigateur des règles (avant les dernières corrections) : 90 règles, 481 contrôles, 478 conformes, 3 bloqués (deux
   par une modification faite pendant l'exécution, un par une réponse de départ refusée ; corrigés et rejoués : 40 contrôles conformes).
6. Captures : elles ont révélé le message d'erreur avec l'identifiant technique de la ligne (m4, corrigé) et la note du brouillon (m6).
7. Contrôles ajoutés : résultats (11), séparation (9), départs de page (5), changements rapides (7). Page 404 en français (m7).
8. Exécution complète finale : `bash scripts/verification/tout.sh`, synthèse dans `resultats/synthese.txt`.

# Vérification du questionnaire : journal de progression

Trace de travail de la vérification lancée le 27 octobre 2026 au soir (questionnaire, dépendances, parcours, résultats). Le rapport
final sera `docs/verification/rapport.md`. Chaque étape dit ce qui a été **exécuté** (navigateur, base), ce qui a été **vérifié
dans le code**, ce qui a été **simulé** (réponses fabriquées passées au vrai code) et ce qui reste une **hypothèse**.

| Étape | État | Sortie |
|---|---|---|
| V1 Inventaire des questions | fait | `inventaire-questions.csv`, `inventaire-questions.json` (`node scripts/verification/inventaire.mts`) |
| V2 Matrice des dépendances | fait | `matrice-dependances.csv` |
| V3 Cas de référence des canaux | 25 / 26 avant les derniers changements de texte ; à relancer | `node scripts/verification/canaux.mjs` |
| V4 Relecture des questions | corrections appliquées (229 modifications de la banque) ; statuts à reporter dans l'inventaire | `relecture-questions.json`, `scripts/verification/appliquer-relecture.py` |
| V5 Dépendances dans le navigateur | plan écrit (86 règles, 4 règles de taille) ; exécution à écrire | `plan-dependances.json` (`node scripts/verification/plan-dependances.mts`) |
| V6 Parcours complets et résultats | à faire | |
| V7 Rapport, commit | à faire | `rapport.md` |

## Corrections déjà faites (non encore relancées dans le navigateur après la dernière construction)

- Réponses devenues inapplicables : gardées en base, mais retirées des conditions, du calcul, de l'avancement et du total pré-rempli
  (`src/lib/audit/reponses-actives.ts`, lecture `INAPPLICABLE` dans `affichage.ts`).
- Répartitions par canal ou par catégorie : une ligne retirée sort de la réponse ; une ligne nouvelle rend la répartition « à refaire »
  (message sous le tableau, la répartition ne compte pas tant que le total n'est pas de nouveau juste). Rien n'est redistribué.
- Ordre des lignes d'un tableau : celui des options de la question source, même après avoir décoché puis recoché.
- « 50 % », « 1 200 € » lus comme des nombres ; « Valeur retenue » affichée seulement pour une valeur acceptée.
- Bornes : 194 champs chiffrés sans minimum (personnes, heures, euros…) ; parts en % entre 0 et 100.
- COM-12.01 : le total de 100 % est contrôlé sur ses trois colonnes, plus seulement la première.
- Doublons de cadrage : D27 lit RH-08.01, D13 lit RH-28.01 (la question n'est plus posée deux fois).
- 29 questions reformulées (période, unité, ambiguïtés) : `relecture-questions.json`.

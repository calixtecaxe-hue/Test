# Point de reprise : audit final des questions (29 octobre 2026)

> **Terminé le 29 octobre au soir.** Tout ce qui suit a été fait et commité : série complète relancée (tout à code 0, sauf R-01),
> puis la question « déjà essayé » refaite et les onglets Résultats, Rapport et Plan d'action construits (`docs/rapport/rapport.md`).
> Cette note n'est gardée que pour l'historique.

Demande en cours : l'audit final de toutes les questions avant la conception de l'IA (message du propriétaire qui commence par
« ensuite mets cela en place avant que on construise la partie résultats »). Ne pas faire de compte rendu avant la fin.

## Fait (commité)

- Défauts techniques corrigés : données partagées (A-01 à A-04 de `docs/audit-final/anomalies.json`) ; `data/partages.json`,
  `src/lib/audit/partages.ts`, écran (carte « déjà renseigné », valeurs reprises), contrôle des données, `tests/partages.test.mts`.
- Contrôles navigateur ajoutés à `tout.sh` : `scripts/verification/partages.mjs` (36/36), `plan-branches.mts` + `branches.mjs`
  (94/94). Tests unitaires : 386/386.
- Revue des 284 signalements automatiques (`docs/audit-final/controles-auto.json`) : verdicts dans
  `scripts/verification/audit-final-rapport.mjs` (VERDICTS).
- `docs/audit-final/anomalies.json` (A-01 à A-22), `docs/audit-final/revisions.txt` (12 questions), générateur
  `scripts/verification/audit-final-rapport.mjs` (inventaire.csv/json, chiffres.json, blocs de rapport.md), `rapport.md` rédigé.

## Série complète arrêtée en cours de route (à relancer)

Lancée à 09 h 26 UTC, arrêtée à 09 h 40 UTC pour enregistrer un état propre. Passés à code 0 : typescript, lint,
tests-unitaires, controle-donnees, balayage-secteurs, inventaire, plan-dependances, plan-branches, canaux (lignes gardées dans
`docs/verification/resultats/synthese.txt`). Relancer la suite sans les refaire :

    SAUTER="typescript lint tests-unitaires controle-donnees balayage-secteurs inventaire plan-dependances plan-branches canaux" bash scripts/verification/tout.sh

Prérequis si le conteneur a été recyclé : `pg_ctlcluster 16 main start`, `npx next build`, serveur de test sur le port 3100
(`docs/etat-technique.md`, section 1). Pendant la série, ne pas lancer `npx next build`.

## Reste, dans l'ordre

1. Lire `synthese.txt` (tout à code 0 attendu, sauf R-01 d'`audit-client`, connu) ; commiter les résultats.
2. `node scripts/verification/chiffres.mjs` puis `node scripts/verification/audit-final-rapport.mjs`.
3. Expliquer les questions de la banque non manipulées dans le navigateur, par raison (profils ou modules métier absents des
   comptes de test) ; vérifier le compte « Relues » (581) et les questions de cadrage manipulées.
4. Écrire `scripts/verification/audit-final-xlsx.py` (openpyxl) → `docs/audit-final/CAXE-inventaire-questions.xlsx`.
5. Relire `docs/audit-final/rapport.md` (sections 5, 8 avec les chiffres finaux).
6. Mettre à jour `CLAUDE.md` (section 6 : données partagées, jumelles et correspondances ; section 15 : A-05 à A-11, A-14, A-22)
   et `docs/etat-technique.md` (partages.json, partages.ts, contrôles partages et branches, 386 tests, audit final).
7. Commit, push, puis le compte rendu court demandé (inventaire, anomalies, synthèse, ce qui est prêt pour l'IA).

## Pendant la série (réglage local temporaire, à défaire avant le dernier commit)

Les fichiers de `docs/verification/` et `docs/objectifs/captures/` sont marqués `skip-worktree` et exclus dans `.git/info/exclude`
pendant que la série les réécrit. À la fin :

    git ls-files -v | grep '^S' | cut -c3- | xargs git update-index --no-skip-worktree
    sed -i '/temporaire pendant la série tout.sh/,+2d' .git/info/exclude

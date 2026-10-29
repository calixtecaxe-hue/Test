# Point de reprise (28 octobre 2026)

Note de travail pour reprendre la mission en cours après une interruption. À supprimer une fois la mission close.

## Mission en cours

Demande du propriétaire en deux parties :

1. objectifs RH et Comm (propositions ou « Définir mon propre objectif ») ;
2. audit d'utilité de toute la banque de questions, sans modifier la banque.

## Fait, enregistré et poussé

- **Objectifs RH et Comm.**
  - Commits `bdf8278` et `3da6bef`.
  - Écran, enregistrement, transmission, 50 contrôles navigateur.
  - Captures : `docs/objectifs/captures/`.
  - Compte rendu de référence : `docs/objectifs/objectifs-rh-comm.md`.
  - Résultats :
    - tests unitaires 373/0 ;
    - `objectifs.mjs` 50/50 ;
    - `controle-boutons-pages` RH et Comm 89/0 ;
    - `controle-autre` 168/0 ;
    - `audit-client` 37/38 (R-01 connu : compte rendu en conception).
- **Audit d'utilité.**
  - Commit `6412839`.
  - Rapport : `docs/audit-utilite/rapport.md`.
  - Tableau complet : `docs/audit-utilite/questions.csv`.
  - Évaluations écrites à la main : `docs/audit-utilite/evaluations/*.txt`.
  - Scripts : `scripts/verification/utilite-extraire.mjs` et `utilite-rapport.mjs`.
  - Arbitrages reportés dans `CLAUDE.md`, section 15, point 14.

## Reste à faire

1. **Relancer la série complète des contrôles** (environ 2 h), puis enregistrer `docs/verification/resultats/`.
   - Démarrer Postgres : `pg_ctlcluster 16 main start`.
   - Après une remise à zéro du conteneur, recréer d'abord l'environnement :
     - `npm ci --legacy-peer-deps` ;
     - `npx next typegen` ;
     - `python3 -m pip install openpyxl` ;
     - `.env` avec `DATABASE_URL` et `AUTH_SECRET`.
   - Construire : `npx next build`.
   - Lancer le serveur de test sur le port 3100 (commande dans `docs/etat-technique.md`, section 1).
   - Lancer `bash scripts/verification/tout.sh`, en tâche de fond.
   - Lire `docs/verification/resultats/synthese.txt`.
2. **Compte rendu global au propriétaire**, en français.
   - D'abord les objectifs :
     - avant et après ;
     - ce qui a changé à l'écran et dans le fonctionnement ;
     - tests et résultats ;
     - ce qui reste à brancher (analyse par l'IA, avancement aux points d'étape, lien entre la partie Comm et le parcours
       COM-10.07) ;
     - captures ordinateur et téléphone.
   - Puis l'audit :
     - 566 questions et 17 questions de cadrage examinées, 20 non vérifiées sur le fond ;
     - 428 justifiées, 81 à exploiter ;
     - 52 à modifier (20 retraits, 4 fusions, 20 conditions, 7 à préciser, 1 à remplacer), plus 3 en cadrage ;
     - 13 liens manquants ;
     - cas FIN-48.01 ;
     - classement par compréhension, pertinence et effort ;
     - arbitrages (rapport, section 8).

# Point de reprise (fin du 28 octobre 2026)

Demande en cours : les validations du propriétaire sur les objectifs RH et Comm (1B, 2a-1, périmètre Comm clarifié pour 2b, 2c-1,
3A à expliquer, 4a-1, 4b-1, point 5, 6C), la clarté des 54 objectifs, le nouvel écran à deux choix, les tests, les captures et le
compte rendu court. Le message complet du propriétaire est celui qui commence par « Voici mes validations et les précisions à
appliquer concernant les objectifs ».

## Ce qui est fait (commité)

- Données : `data/objectifs-agents.json` (54 objectifs, phrases finales par unité, questions, `libellesUnites`, `parcours` des parties
  Comm). Contrôle des données étendu (`src/lib/donnees/controle.ts`).
- Code : un objectif par agent (`MAX_OBJECTIFS` = 1), phrases (`phraseObjectif` avec `{dici}`, `gabaritDe`), écart Comm 6C
  (`ecartDeParcours`, `suiviParcours`), nouvel écran `objectif-choix.tsx`, message d'écart dans `objectif-actif.tsx`,
  `question-carte.tsx` et `page.tsx`, styles dans `globals.css`.
- Tests unitaires mis à jour (376, tous passent). Contrôle navigateur `scripts/verification/objectifs.mjs` réécrit : 68/68.
- `controle-boutons-pages.mjs`, `controle-autre.mjs`, `audit-client.mjs` (A-02) adaptés au nouvel écran.
- PDF régénérés : `docs/objectifs/CAXE-decisions-objectifs.pdf` (décisions cochées, 3A en attente),
  `docs/objectifs/CAXE-objectifs-proposes.pdf` (54 objectifs).
- Documentation : `CLAUDE.md` (sections 6, 9 et 15), `docs/etat-technique.md`, `docs/objectifs/objectifs-rh-comm.md`.
- Série complète de vérification lancée sur l'état d'avant ce travail : tout à code 0 sauf R-01 (connu).

## Ce qui reste, dans l'ordre

1. Remettre l'environnement en route (voir `docs/reprise-28-octobre.md`) : `pg_ctlcluster 16 main start`, `npx next build`, serveur de
   test sur le port 3100.
2. Comprendre l'échec de `node scripts/controle-boutons-pages.mjs` (tous agents) : « tableau de bord : chaque agent montre son
   objectif (un seul) » ne trouve qu'une étiquette « Votre objectif » (`.carte-conseil-etiquette`) ; il passe avec `--agents COM`.
   Regarder ce que montrent les cartes des agents ACQ, FIN et RH sur `/tableau-de-bord` (état de l'audit ?) et corriger le contrôle
   ou l'écran selon ce qui est juste ; ne pas affaiblir le contrôle sans raison.
3. Relancer `node scripts/controle-autre.mjs` et `node scripts/audit-client.mjs` sur le nouvel écran.
4. Relancer `node scripts/verification/objectifs.mjs --sortie docs/verification/resultats` si le code change, et vérifier les captures
   de `docs/objectifs/captures/` (deux choix, mode proposé, proposition choisie, mode personnel, écart Comm ; ordinateur et téléphone).
5. Compléter la section 5 de `docs/objectifs/objectifs-rh-comm.md` avec les résultats.
6. Commit, push, puis le compte rendu court demandé par le propriétaire :
   - validations appliquées, et le point 3A expliqué simplement (le filtre retire 3 objectifs d'équipe au seul dirigeant seul et
     réserve « Me faire aider dans mon travail » au dirigeant seul ; avec 3B, tout le monde verrait tout, y compris des objectifs
     qu'aucune question ne permet de suivre) ;
   - point 5 : la recommandation ne fixait pas de nombre ; avec 1B, le plafond est 1 (5C), signalé comme conséquence ;
   - 2b : aucune option choisie, périmètre clarifié ; la phrase du document de règles sur le funnel Comm est à corriger ;
   - principales formulations avant / après (section 4 du document des objectifs) ;
   - tests et résultats ; limites (aperçu publié non régénéré, « Questionnair / e » à 360 px, définition du taux de conversion et
     règle de l'écart 6C à confirmer) ;
   - captures réelles envoyées avec SendUserFile (ordinateur et téléphone : les deux choix, puis chaque mode ouvert).
7. Proposer de republier l'aperçu « Mes agents — CAXE » (ancien écran).

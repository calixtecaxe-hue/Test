# Vérification du questionnaire CAXE (27 et 28 octobre 2026)

Rapport de la vérification complète du questionnaire : clarté des questions, logique, dépendances entre réponses et questions,
parcours jusqu'aux résultats. Les défauts trouvés ont été corrigés quand la correction ne demandait aucune décision produit ;
les autres sont listés pour décision.

**Environnement.** Application construite (`next build`) et lancée en local (`next start`, port 3100). Base Postgres locale.
Comptes fictifs `@example.com`. Paiement en mode démonstration. Aucun e-mail envoyé (mode démonstration). Navigateur Chromium
(Playwright) sur ordinateur (1280 px) et téléphone simulé (390 px). Rien n'a été déployé, aucun vrai client n'a été touché.

Les chiffres de ce rapport sont recalculés par `node scripts/verification/chiffres.mjs` à partir des fichiers de résultats
(`chiffres.json`). Le résultat de la dernière exécution complète est dans `resultats/synthese.txt`.

---

## 1. Chiffres

<!-- CHIFFRES : section écrite par node scripts/verification/chiffres.mjs -->
Calculés le 2026-10-29 à 09:26 UTC.

| Mesure | Nombre | Écart expliqué |
|---|---|---|
| Questions recensées | 566 | 561 dans la banque, 5 en attente (ACQ-26, catégorie Fabrication). |
| Questions relues | 566 | Toutes. 26 corrigées (texte, aide, choix ou règle), 2 à arbitrer (section 5). |
| Contrôle automatique du texte (période, bornes, ton, choix) | 556 sans constat | 5 montants sans période écrite, vérifiés un par un (la base est dans la question). 0 constat ouvert. |
| Questions atteignables par le vrai moteur d'assemblage | 546 sur 561 | 15 questions COM-57 : posées à la première création de contenu, jamais pendant l'audit, par conception. |
| Questions affichées et manipulées dans le navigateur | 476 | Les autres questions atteignables sont vérifiées par le moteur d'assemblage sur des réponses simulées, pas à l'écran. Les contrôles navigateur utilisent un compte par règle ou par agent (électricien pour les boutons). |
| Liens de dépendance recensés | 1 101 | Dont 470 liens de calcul (croisements, scénarios), non exécutables tant que leurs formules sont en texte libre. Les autres liens portent sur l'affichage, les lignes, les données partagées et les pré-réponses. |
| Règles d'affichage | 95 | 79 conditions et 16 masquages. Elles portent les 287 liens « condition » et les 94 liens « masquage ». |
| Règles jouées dans le navigateur, dans les deux sens | 91 | 4 hors plan : « Pas posée si les agents Acquisition et Comm sont faits : calculée » (toujours posée, pas une dépendance) ; « D30 · avant la première création de contenu » (jamais pendant l'audit) ; « Vente immédiate (commerce) » (à préciser : aucune réponse ne la déclenche) ; « Sans travaux en cours » (à préciser : aucune réponse ne la déclenche). |
| Règles entièrement conformes | 91 | Aucun écart. Aucune règle bloquée. |
| Contrôles navigateur de la vérification (canaux, règles, résultats, séparation, départs de page, changements rapides, historique) | 716 | 716 conformes, 0 écart(s), 0 bloqué(s). |

Contrôles navigateur de la vérification, par script :

| Script | Contrôles | Conformes | Écarts | Bloqués |
|---|---|---|---|---|
| `canaux` | 26 | 26 | aucun | aucun |
| `resultats` | 11 | 11 | aucun | aucun |
| `separation` | 9 | 9 | aucun | aucun |
| `retours` | 5 | 5 | aucun | aucun |
| `rapides` | 7 | 7 | aucun | aucun |
| `historique` | 32 | 32 | aucun | aucun |
| `partages` | 36 | 36 | aucun | aucun |
| `branches` | 94 | 94 | aucun | aucun |
| `dependances` | 496 | 496 | aucun | aucun |

Dernière exécution complète (`resultats/synthese.txt`), un contrôle par ligne :

| Contrôle | Résultat | Dernière ligne du journal |
|---|---|---|
| `typescript` | réussi |  |
| `lint` | réussi |  |
| `tests-unitaires` | réussi | # duration_ms 20583.054858 |
| `controle-donnees` | réussi | Contrôle réussi : aucune erreur. |
| `balayage-secteurs` | réussi | POINTS D'ATTENTION : 0 |
| `inventaire` | réussi | scénario (calcul) : 31 |
| `plan-dependances` | réussi | M-092 Ne publie pas (parcours mise en place) : des cibles restent affichées quand la règle est fausse (condition propre vraie, ou question qui décide du masquage) → COM-10.03, COM-10.04, COM-10.05 |
| `canaux` | réussi | compte de test : verif.1793222610744.93475@example.com |
| `dependances` | réussi | 91 règles jouées, 496 contrôles : 496 conformes, 0 écart(s), 0 bloqué(s). |
| `resultats` | réussi | 11 contrôles, 11 conformes, 0 écart(s). |
| `separation` | réussi | 9 contrôles, 9 conformes, 0 écart(s). |
| `retours` | réussi | 5 contrôles, 5 conformes, 0 écart(s). |
| `rapides` | réussi | 7 contrôles, 7 conformes, 0 écart(s). |
| `historique` | réussi | 32 contrôles, 32 conformes, 0 écart(s). |
| `objectifs` | réussi | 50 contrôles, 50 conformes, 0 écart(s). |
| `listes` | réussi | 17 contrôles, 17 conformes, 0 écart(s). |
| `prereponse` | réussi | Tout est conforme. |
| `autre` | réussi | 168 vérifications, 0 échec(s). |
| `compte` | réussi | Tout est conforme. |
| `audit-client` | **code 1** | 38 contrôles, 37 conformes, 1 écart(s) : R-01. |
| `boutons-pages` | réussi | 157 vérifications, 0 échec(s). |
| `complementaire` | réussi | Erreurs : 0 · points d'attention : 0 |
| `captures` | réussi | 7 captures écrites dans docs/verification/captures |
| `parcours-secteurs` | réussi | Erreurs : 0 · points d'attention : 0 |
| `boutons-acq` | réussi | 670 vérifications, 0 échec(s). |
| `boutons-fin` | réussi | 415 vérifications, 0 échec(s). |
| `boutons-rh` | réussi | 716 vérifications, 0 échec(s). |
| `boutons-com` | réussi | 756 vérifications, 0 échec(s). |
<!-- /CHIFFRES -->

**Exécution finale.** Lancée le 27 octobre à 23 h 58 UTC, terminée le 28 octobre à 1 h 15 UTC. Le conteneur de travail a redémarré
pendant une première exécution complète. `canaux` et `dependances` reprennent donc leurs résultats de cette première exécution
(27 octobre, 23 h 42 et 23 h 55 UTC). Elle tournait sur la construction précédente, qui ne diffère de la construction finale que par
la page 404 : aucun code du questionnaire n'a changé entre les deux. Tous les autres contrôles ont été rejoués sur la construction finale.

Lecture des contrôles sortis en code 1 pendant l'exécution finale :

- `audit-client` : un seul écart, R-01 (compte rendu sans priorités ni plan). C'est normal tant que vous concevez le compte rendu
  (section 4). Q-03 et L-03, en écart avant cette vérification, sont maintenant conformes (corrections m3 et m7).
- `boutons-com` : 1 échec sur 749, COM-12.01. Cause : l'outil de test. Depuis la correction M4, chacune des trois colonnes doit faire
  100 %, et l'écran écrit le total colonne par colonne (« Part des demandes : 0 sur 100 · … ») au lieu de « Total : 0 sur 100 ».
  L'outil, qui cherchait « Total : », ne voyait plus de total imposé et remplissait des valeurs quelconques. La saisie restait donc
  en brouillon, ce qui est le comportement voulu du produit. L'outil lit maintenant le total dans la banque et remplit à 100 % chaque
  colonne soumise au total (`remplirTableau`), sans changer l'assertion. Contrôle Comm relancé seul le 28 octobre (10 h 21 à
  10 h 41 UTC, même construction) : 752 vérifications, 0 échec. Les 3 vérifications de plus qu'en première exécution sont celles
  qui suivent l'enregistrement de COM-12.01, que l'outil n'atteignait pas.

---

## 2. Niveau de preuve : ce qui a été réellement exécuté, et ce qui ne l'a pas été

| Niveau | Ce qui est couvert | Où |
|---|---|---|
| **Exécuté dans le navigateur** (vraie application, vraie base) | Règles d'affichage dans les deux sens. Canaux et répartitions. Cohérence des résultats. Séparation des comptes et des appareils. Départs de page et retour arrière. Changements rapides. Boutons de chaque question des 4 agents. Parcours par secteur. Audit client. Page « Mon compte ». | `scripts/verification/*.mjs`, `scripts/controle-*.mjs`, `scripts/audit-client.mjs` |
| **Vérifié par le code testé** (tests unitaires sur les vraies données) | Réponses actives, chaînes de conditions, répartitions à refaire, bornes, totaux sur plusieurs colonnes, doublons de cadrage, sous-question de cadrage, messages d'erreur, règle des 50 %. | `npm test` (356 tests) |
| **Simulé** (réponses fabriquées, passées au vrai code) | Balayage de tous les métiers, activités, tailles, niveaux et agents (229 scénarios, 7 704 questionnaires). Atteignabilité de chaque question (une réponse « témoin » qui la fait apparaître). Plan des règles (réponses qui rendent chaque règle vraie puis fausse). | `scripts/balayage-secteurs.mts`, `scripts/verification/inventaire.mts`, `plan-dependances.mts` |
| **Hypothèse ou interprétation** | Lecture de FIN-17.02 en montants, mesure de COM-22.04 sur les demandes, priorité donnée au canal coché sur un « non » caché (COM-13.10). | Section 5 |

**Indépendance des valeurs attendues.** L'attendu d'un contrôle navigateur vient de trois sources :

- **la règle écrite** : la question ouverte par une règle apparaît quand la règle est vraie et disparaît quand elle est fausse ;
- **des valeurs posées à la main** : par exemple 830 € = 0 + 150 + 100 + 200 + 80 + 300 ;
- **des comptages sur l'écran** : cartes affichées, cartes répondues, règle des 50 % de CLAUDE.md.

Pour les règles d'affichage, la liste complète des questions attendues à l'écran est aussi calculée par le moteur d'assemblage. Cette comparaison montre que l'écran suit le moteur, sans le recalculer de façon indépendante. La partie indépendante reste la règle écrite, vraie puis fausse.

---

## 3. Corrections faites, par impact

Gravité :

- **Majeur** : un calcul, un avancement ou un affichage faux pour le dirigeant, ou une même question posée deux fois.
- **Mineur** : une gêne ou un message trompeur, sans effet sur les calculs.

Chaque correction est rejouée par au moins un contrôle (colonne « Contre-essai »).

### Majeures

| # | Constat avant correction | Pour le reproduire (avant) | Correction | Contre-essai |
|---|---|---|---|---|
| M1 | Une réponse devenue inapplicable restait active. Une question fermée par une autre gardait sa réponse dans les conditions, l'avancement, la couverture des thèmes et les totaux. Elle pouvait aussi garder ouvertes les questions qu'elle ouvrait (chaîne A → B → C). | RH-04.01 = 3, RH-04.02 = 2, RH-04.03 répondue, puis RH-04.01 = 0 : RH-04.03 restait posée et comptée. | `src/lib/audit/reponses-actives.ts` (réponses actives, point fixe). Lecture « inapplicable » dans `affichage.ts`. Branché dans l'assemblage, le compte rendu, l'avancement et le total pré-rempli. La réponse reste en base et revient si le dirigeant revient à son premier choix. | `tests/reponses-actives.test.mts`. Navigateur : contrôles `-c` et `-d2` de chaque règle (`dependances.mjs`), R-06 et R-07 (`resultats.mjs`). |
| M2 | Canal décoché : son coût restait dans le budget marketing pré-rempli de la Finance (FIN-05.02), et sa part restait dans la répartition. | Canaux bouche-à-oreille et réseaux sociaux, coûts 0 et 150 €, puis réseaux décochés : le total restait 830 €. | Même mécanisme (cases d'une ligne qui n'existe plus ignorées). | C-04c, C-04d (`canaux.mjs`). R-09 : 830 € → 680 € (`resultats.mjs`). Test unitaire « coût par canal ». |
| M3 | Répartition à 100 % dont les lignes changent (canal ajouté ou retiré) : aucun signal, et l'ancienne répartition continuait de compter. | Répartition 60 / 40, puis « Fiche Google » coché : la répartition restait comptée telle quelle. | Message sous le tableau : « « Fiche Google » est nouveau depuis votre dernière répartition… ». La répartition ne compte plus tant que le total n'est pas de nouveau juste. Rien n'est redistribué. | C-03a à C-03c, C-04a à C-04c. Capture `2-repartition-a-refaire.png`. |
| M4 | COM-12.01 (trois répartitions dans un tableau) : le total de 100 % n'était contrôlé que sur la première colonne. | Demandes 100 %, nouveaux clients 40 %, chiffre d'affaires 250 % : accepté. | Total imposé sur plusieurs colonnes (`total.colonnes`, `reponse-spec.ts`). Banque et classeur mis à jour. | `tests/relecture.test.mts`. |
| M5 | 192 champs chiffrés de la banque sans borne : 186 nombres sans minimum (clients, personnes, heures, jours…) et 6 parts en % sans bornes. Les 5 questions en attente (ACQ-26) avaient le même défaut. | ACQ-01.03 : « -3 » clients sur 12 mois accepté (rejoué sur la banque d'avant, commit 7809dd5). | Bornes ajoutées dans la banque (`appliquer-relecture.py`, y compris les 5 questions en attente ACQ-26). Le contrôle des données refuse désormais un nombre sans minimum ou une part sans bornes. Seuls le résultat de l'année (FIN-05.04) et la trésorerie (FIN-11.01) peuvent être négatifs. | `npm run donnees:controle`, `tests/relecture.test.mts`, `tests/reponse-spec.test.mts`. |
| M6 | Deux questions posées deux fois, avec des choix différents : D27 (cadrage) et RH-08.01 ; D13 (cadrage) et RH-28.01. Deux réponses contradictoires étaient possibles, et les questions sur la personne la plus chargée disparaissaient. | D27 = « vous », RH-08.01 = « une personne à l'administratif » : RH-08.02 et RH-08.04 n'apparaissaient pas. | D27 lit RH-08.01, D13 lit RH-28.01 (`data/regles-affichage.json`). Le cadrage n'est plus posé. | `tests/audit.test.mts`. Règles D27 et D13 jouées dans le navigateur (`dependances.mjs`). |
| M7 | Sous-question de cadrage gardée après le changement de sa question parente. Les questions sur la mise en service (FIN-28.01, FIN-28.02) restaient affichées et comptées. Constaté par le plan des dépendances. | D12 « investissement » = oui, « déjà en service ? » = oui, puis D12 = non. | Une sous-question qui n'est plus posée ne compte plus (`sousQuestionOuverte`, `affichage.ts`, `reponses-actives.ts`). | Test unitaire « sous-question de cadrage ». Navigateur : M-088, 6 contrôles sur 6. |

### Mineures

| # | Constat avant correction | Correction | Contre-essai |
|---|---|---|---|
| m1 | Décocher puis recocher un canal déplaçait sa ligne en bas du tableau. | Lignes dans l'ordre de la liste des choix. | C-06a, C-06b. |
| m2 | « 50 % », « 1 200 € », « 50% » refusés comme illisibles. | `lireNombre` accepte le symbole final. | C-08c. Test unitaire. |
| m3 | « Valeur retenue : -3 » affiché sous une valeur refusée (audit client Q-03). | « Valeur retenue » seulement pour une valeur acceptée. | Audit client Q-03. Capture `3-valeur-refusee.png`. |
| m4 | Message d'erreur d'une case de tableau avec l'identifiant technique : « Ligne bouche_a_oreille · Part des demandes… ». | Le message nomme la ligne comme l'écran : « Bouche-à-oreille · Part des demandes… », dans le navigateur et sur le serveur. | Test unitaire. Capture `3-valeur-refusee.png`. |
| m5 | Une question de cadrage répondue ne pouvait plus revenir à « sans réponse ». Aucune question n'est pourtant obligatoire, et les autres questions ont « Effacer ma réponse ». | Bouton « Effacer ma réponse » sous chaque question de cadrage répondue. | M-083 (retour à « sans réponse » à l'écran). Capture `1-cadrage-effacer.png`. |
| m6 | Note du brouillon d'un tableau : « prise en compte dès que le total sera juste », y compris pour une valeur hors bornes. | « Elle comptera dans votre analyse dès que le tableau sera complet et juste. » | Capture `3-valeur-refusee.png`. |
| m7 | Page 404 en anglais (audit client L-03). | `src/app/not-found.tsx` : « Page introuvable », liens vers « Mes agents » et l'accueil. | Audit client L-03. |
| m8 | 29 constats de relecture. 24 questions reformulées : période absente (« sur les 12 derniers mois »), mesure ambiguë, choix incomplet (« Aucun… », « Les deux »), aide contraire au mode de réponse. Plus 2 doublons corrigés par une règle (M6), 2 questions à arbitrer et 1 question confirmée conforme. | Détail par question dans `relecture-questions.json`, appliqué à la banque et au classeur `CAXE_Banque_Questions.xlsx`. L'aller-retour Excel → banque redonne les mêmes 556 questions. | `tests/relecture.test.mts`, `npm run donnees:controle`, C-00b, C-11. |

---

## 4. Problèmes restants, par priorité

| Priorité | Problème | Pourquoi il n'est pas corrigé |
|---|---|---|
| **Haute** | ACQ-22.05 : le texte demande les créneaux **proposés** par semaine, l'aide laisse entendre les créneaux **libres**. Les deux donnent des chiffres différents pour le calcul de capacité. | Décision de mesure (section 5). Rien n'est modifié. |
| **Haute** | FIN-17.02 : répartition « des paiements » sans dire s'il faut compter les factures ou les montants. | Décision de mesure (section 5). La période a été ajoutée. |
| Moyenne | 2 masquages « à préciser » : « Vente immédiate (commerce) » et « Sans travaux en cours ». Le classeur ne dit pas quelle réponse les déclenche : ces thèmes ne sont jamais masqués. | Décision produit (déjà listée dans CLAUDE.md). |
| Moyenne | Compte rendu sans priorités ni plan (audit client R-01). Aucun thème n'a de note, faute de repères de marché et de règles de notation. | Normal à ce stade : vous concevez le compte rendu. |
| Basse | Textes qui annoncent un nombre alors que les lignes sont réglables : « vos 3 offres principales », « vos 5 plus gros clients ». | Déjà listé dans CLAUDE.md, à revoir par vous. |
| Basse | Les croisements (439 liens) et les scénarios (31) ne sont pas exécutables : leurs formules sont en texte libre dans le classeur. Leurs résultats ne peuvent donc pas être vérifiés. | Les formules sont à écrire. |

---

## 5. Décisions à prendre (propriétaire)

1. **ACQ-22.05** : faut-il demander les créneaux proposés par semaine ou les créneaux restés libres ? Selon la réponse, il faut corriger soit le texte, soit l'aide.
2. **FIN-17.02** : faut-il répartir les paiements par nombre de factures ou par montant ? Pour la trésorerie, le montant compte. C'est une interprétation, à confirmer.
3. **COM-13.10** (« Avez-vous un site internet ? »). Situation : le dirigeant a répondu « non », puis coche « Site internet » dans ses canaux. La question n'est alors plus posée, l'ancien « non » ne compte plus, et les questions sur le site s'ouvrent. Aujourd'hui, le canal coché l'emporte. Est-ce le comportement voulu ?
4. **COM-22.04** : la répartition entre réseaux porte maintenant sur les **demandes**, comme la ligne « Réseaux sociaux » d'ACQ-03.02. Elle portait avant sur « les clients et les demandes ». Formulation à valider.
5. **Budget marketing de la Finance (FIN-05.02) sans l'agent Comm.** La règle du 22 octobre exige un chiffre à COM-32.02 pour pré-remplir le total. Un dirigeant sans l'agent Comm ne peut pas répondre à COM-32.02 : son total n'est donc jamais pré-rempli, et la question reste vide. Faut-il garder cette règle, ou pré-remplir sans la partie Comm quand l'agent n'est pas souscrit ?
6. **Formulations reformulées** (section 3, m8) : 24 textes à relire ; les choix ajoutés (« Aucun : je réponds aussi vite partout », « Les deux », « Aucun changement récent ») sont aussi à valider.
7. Déjà ouverts avant cette vérification et toujours à fournir : les accès SMTP, le seuil d'un montant à faire confirmer, la liste des mots de recherche des métiers, les deux masquages « à préciser ».

---

## 6. Limites : ce qui n'a pas été vérifié

- **Une seule combinaison par règle d'affichage.** Chaque règle est jouée avec un compte témoin (un métier, une taille) et une seule façon de la rendre vraie puis fausse. Pour une règle à plusieurs branches (« A ou B »), une seule branche est jouée dans le navigateur. Les autres combinaisons ne sont vérifiées que par le balayage simulé.
- **Questions affichées dans le navigateur.** Toutes les questions atteignables n'ont pas été affichées à l'écran. Celles qui ne l'ont pas été sont vérifiées par l'assemblage (simulé), pas à l'écran (écart expliqué en section 1).
- **Calculs.** Notes de couleur, impacts, réalisme de l'objectif, plan d'action : non vérifiables. Les seuils sont vides, les règles de notation et les formules des croisements ne sont pas écrites, l'IA n'est pas branchée.
- **Navigateurs et appareils.** Chromium seulement : ni Safari, ni Firefox, ni vrai téléphone (écran de téléphone simulé). Pas de test avec un lecteur d'écran.
- **Charge et durée.** Pas de test de charge. Pas de session de plusieurs heures. Une seule coupure réseau, contrôlée dans l'audit client.
- **Services extérieurs.** Stripe (aucune clé), envoi réel d'e-mails, recherche de repères de marché : non testés.
- **Catégorie Fabrication** (ACQ-26) : en attente. Les 15 questions COM-57 ne sont posées qu'à la première création de contenu, hors audit, par conception.

---

## 7. Relancer les contrôles

Prérequis : base démarrée, application construite et lancée :

```
npx next build
AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration EMAIL_MODE=demonstration RESULTATS_MAQUETTE=1 npx next start -p 3100
```

| Commande | Ce qu'elle contrôle | Durée |
|---|---|---|
| `bash scripts/verification/tout.sh` | Tout ce qui suit, dans l'ordre. Synthèse dans `resultats/synthese.txt`. | environ 2 h |
| `bash scripts/verification/tout.sh rapide` | Tout, sauf les contrôles navigateur longs (boutons, secteurs). | environ 1 h |
| `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run donnees:controle` | Code, données, 356 tests unitaires. | 1 min |
| `node scripts/balayage-secteurs.mts` | Assemblage de chaque métier × activité × taille × niveau × agent (simulé). | 2 min |
| `node scripts/verification/inventaire.mts` | Inventaire, matrice des dépendances, atteignabilité, contrôles automatiques du texte. | 1 min |
| `node scripts/verification/plan-dependances.mts` puis `node scripts/verification/dependances.mjs` | Chaque règle d'affichage dans le navigateur, dans les deux sens. Options : `--seulement D-001,M-088`, `--reprendre`. | 45 min |
| `node scripts/verification/canaux.mjs` | Cas de référence des canaux et des répartitions (26 contrôles). | 2 min |
| `node scripts/verification/resultats.mjs` | Règle des 50 %, avancement, total pré-rempli de la Finance, compte rendu. | 2 min |
| `node scripts/verification/separation.mjs` | Deux comptes, deux appareils, sans session. | 1 min |
| `node scripts/verification/retours.mjs` | Départ de page sans quitter le champ, actualisation, retour arrière, onglet fermé. | 1 min |
| `node scripts/verification/rapides.mjs` | Clics et corrections en rafale. | 1 min |
| `node scripts/verification/captures.mjs` | Captures d'écran des corrections (`captures/`). | 1 min |
| `node scripts/verification/chiffres.mjs` | Recalcule les chiffres de ce rapport (`chiffres.json`). | instantané |
| `python3 scripts/verification/appliquer-relecture.py` puis `python3 scripts/exporter-modele-banque.py --avec-questions` | Réapplique la relecture et les bornes à la banque (sans effet si déjà fait), régénère le classeur. | instantané |

---

## 8. Fichiers et preuves (dossier `docs/verification/`)

| Fichier | Contenu |
|---|---|
| `rapport.md` | Ce rapport. |
| `progression.md` | Journal de progression de la vérification. |
| `inventaire-questions.csv` / `.json` | Une ligne par question, 34 colonnes. Contenu : agent, thème, texte, aide, choix, format, unité, période, conditions, masquage, dépendances, influences, atteignabilité, témoin, relecture, contrôles automatiques. Le CSV est séparé par des points-virgules et s'ouvre dans Excel. |
| `matrice-dependances.csv` | Une ligne par lien : source → type → condition → cible → comportement attendu. |
| `plan-dependances.json` | Pour chaque règle : compte témoin, réponses qui la rendent vraie puis fausse, questions attendues dans chaque cas. |
| `relecture-questions.json` | Les 29 constats de relecture, avec le texte corrigé. |
| `chiffres.json` | Chiffres du rapport, recalculés depuis les résultats. |
| `resultats/*.json` | Résultat de chaque contrôle navigateur (identifiant, attendu, observé). |
| `resultats/journaux/*.log` | Journal complet de chaque contrôle de la dernière exécution. |
| `resultats/synthese.txt` | Code de sortie et dernière ligne de chaque contrôle. |
| `captures/*.png` | Cadrage avec « Effacer ma réponse ». Répartition à refaire. Valeur refusée avec le nom de la ligne. Tableau sur téléphone. Budget pré-rempli. Compte rendu. Avancement sur « Mes agents ». |

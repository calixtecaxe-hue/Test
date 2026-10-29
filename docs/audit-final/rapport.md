# Audit final des questions de CAXE (29 octobre 2026)

Dernier audit de toutes les questions avant la conception de l'IA qui produira les stratégies et les comptes rendus. Il reprend
l'évaluation question par question du 28 octobre (`docs/audit-utilite/`), la complète, corrige les défauts techniques trouvés et
vérifie le comportement dans l'application.

Livrables :

- **Inventaire**, une ligne par question : `docs/audit-final/inventaire.csv` (et `CAXE-inventaire-questions.xlsx`). Colonnes :
  identifiant, question (texte exact), information recueillie, profils concernés, conditions, usage attendu et sa source,
  implémentation, effort, vérification, statut, recommandation, anomalies, propositions.
- **Anomalies** : section 10 ci-dessous (texte exact, problème, conséquence, correction, contrôle) ; source :
  `docs/audit-final/anomalies.json`.
- **Chiffres** : `docs/audit-final/chiffres.json`, recalculés par `node scripts/verification/audit-final-rapport.mjs`.

Ce qui a été **exécuté dans l'application** (navigateur, serveur de test, comptes fictifs), **simulé** (vrai code d'assemblage
appelé hors navigateur) ou seulement **lu dans le code** est dit à chaque fois.

## 1. Synthèse

<!-- debut:chiffres -->
| | Nombre |
|---|---|
| Questions recensées | 583 (561 de la banque, 17 de cadrage, 5 en attente) |
| Évaluées une à une (utilité, profils, conditions, usage) | 583 |
| Relues (texte, aide, choix, unité, période) | 581 |
| Assemblées par le vrai code et contrôlées par le balayage | 546 |
| Affichées et manipulées dans l'application | 432 (424 de la banque, 8 de cadrage) |
| Jamais posées pendant l'audit (brief de création de contenu) | 15 |

| Statut (un seul par question) | Nombre | dont exploitation à développer |
|---|---|---|
| Utile et bien définie | 432 | 33 |
| Utile, exploitation à développer | 80 | 80 |
| À clarifier ou à rendre conditionnelle | 41 | 21 |
| Faible utilité : retrait, fusion ou remplacement proposé | 25 | 2 |
| En attente (catégorie Fabrication) | 5 | 5 |
| **Total** | **583** | **141** |
<!-- fin:chiffres -->

**Lecture des chiffres.** Chaque question a un seul statut ; la colonne « dont exploitation à développer » le croise avec ce qui
reste à construire (calcul non écrit, lecture par l'IA, lien manquant) : une question peut être bien définie et attendre son
calcul. L'**utilité** (le statut) et l'**implémentation** (ce que le code fait aujourd'hui de la réponse) sont classées à part
(section 9) : « utile et bien définie » ne veut pas dire « déjà exploitée ».

**Corrigé pendant l'audit** (défauts techniques, contrôlés dans le navigateur) :

- **A-01** : six liens du classeur faisaient passer une question pour « déjà renseignée » avec la réponse d'une autre (capacité et
  heures, couverts et ventes, demandes et visites du site, avis Google et plateforme). La donnée n'était jamais recueillie et le
  moteur lisait une valeur fausse.
- **A-02** : les questions qui regroupent plusieurs questions d'un autre agent (dépenses marketing, répartition par canal,
  fréquence de lecture des chiffres, reprises) étaient « déjà renseignées » avec une partie des réponses. Elles se composent
  maintenant partie par partie ; une question connue en partie s'affiche avec les valeurs reprises, à compléter.
- **A-03** : le chiffre d'affaires mois par mois était demandé deux fois à un compte Finance et RH sans l'Acquisition.
- **A-04** : la carte « déjà renseigné » montrait des identifiants de choix et des nombres sans unité.

**À décider par le propriétaire** (rien n'est changé sans accord) : convention hors taxes (A-05), « Je ne suis pas cette donnée »
réservé aux chiffres (A-06), quatre conditions ou textes (A-07 à A-11), FIN-48.01 (A-12), les liens manquants des calculs (A-13),
les calculs qui éviteraient une question (A-14), et les décisions déjà ouvertes reprises en section 10.

## 2. Ce qui est assez défini pour concevoir l'IA, et ce qui ne l'est pas encore

**Assez défini** :

- **Les entrées.** Réponses fermées et chiffrées avec leurs quatre formes (exacte, fourchette marquée « estimée », « je ne sais
  pas », « je ne suis pas cette donnée »), seules réponses actives, données partagées lues correctement depuis cet audit
  (jumelles, correspondances partie à partie), profil, métier, vocabulaire, taille, ancienneté.
- **L'objectif** de chaque agent : un seul, structuré (ce que le dirigeant veut changer, chiffre éventuel, délai, origine
  « proposé » ou « personnel », partie Comm), enregistré avec son historique.
- **Le constat du moteur** tel qu'il existe : thème masqué, non évalué (moins de 50 % de réponses), contexte, règle manquante,
  sans repère de marché ; aucun chiffre inventé.
- **Les évolutions** : 16 comparaisons de l'entreprise à elle-même, calculées, avec ce qui manque quand elles ne le sont pas.
- **Les textes libres et les questions de contexte** que l'IA lit : repérés dans l'inventaire (colonne « Implémentation » : « lu
  par l'IA du rapport »).
- **Les périmètres** : agents étanches ; Comm et Acquisition clarifiés le 28 octobre (la Comm conseille sur l'acquisition par la
  communication, l'Acquisition sur les processus internes) ; zone interdite des professions réglementées écrite.

**Pas encore assez défini** (l'IA ne doit pas le combler elle-même : ce serait calculer ou juger à la place du code) :

1. **Les calculs** : 271 questions alimentent un calcul prévu par le classeur mais pas exécuté (formules en texte libre). Sans
   eux, l'IA recevrait des réponses brutes sans les indicateurs qui les relient à l'objectif, et serait tentée de calculer.
   Écrire d'abord les calculs que l'IA citera.
2. **Les règles de notation** : seuils de marché vides, règles Pratique et Cohérence non écrites, impact qualifié, agrégation,
   deux leviers sur la même étape. Aucune couleur ni priorité n'est possible sans elles.
3. **La règle commune des pratiques** (A-17) : sans elle, une pratique absente produit « organisez-vous mieux », « communiquez
   davantage » ou « suivez votre trésorerie » (section 7).
4. **Qui applique les grilles de qualité Comm** (A-18).
5. **La convention des montants** (A-05) : sans elle, l'IA compare des montants HT et TTC sans le savoir.
6. **Le message fixe des professions réglementées**, avec l'avocat.
7. **La règle du quart** « je ne suis pas cette donnée » (A-16) : à brancher, texte du conseil à écrire.
8. **Les prompts** : Acquisition à mettre à jour (effet d'une action), Finance, RH et Comm en brouillon ; coordination Comm et
   Acquisition à y écrire.
9. **Le compte rendu**, en conception par le propriétaire.
10. **Les questions RH hors périmètre** (A-19) : ce que le rapport peut en dire.

## 3. Méthode

- **Base** : les 583 évaluations du 28 octobre, écrites une à une (information apportée, usage prévu par le classeur, usage
  exécuté par le code, test « à situation identique, si la réponse change, qu'est-ce qui change légitimement », profils,
  doublons, effort). Elles restent la justification de chaque question (colonne « Usage attendu »).
- **Révisions du 29 octobre** : `docs/audit-final/revisions.txt` (12 questions), écrites après les contrôles ci-dessous.
- **Contrôles automatiques de clarté et de suffisance** (`scripts/verification/audit-final-controles.mts`, simulé) : questions
  d'équipe posées au dirigeant seul (par le vrai assemblage), relances, financement, stock, recrutement, canaux et outils sans
  condition, unités, zéro, tranches, montants HT ou TTC, textes proches, termes techniques, comparaisons au passé. 284
  signalements, relus un à un (section 6 et colonne « Vérification »).
- **Contrôles dans l'application** (exécutés) : la série complète (`scripts/verification/tout.sh`), dont deux contrôles ajoutés :
  `partages.mjs` (données partagées) et `branches.mjs` (chaque branche des règles à plusieurs branches).
- **Lecture du code** : là où le comportement ne se voit pas à l'écran (lecture par le moteur, règle du quart, pré-remplissage).
- Une « utilité possible pour l'IA » ne suffit pas : l'usage attendu cite sa source (calcul, règle, lecture par l'IA décrite), ou
  il est dit « à définir ».

## 4. FIN-48.01, le cas de référence

**Version actuelle** : « Quand avez-vous fait le point sur votre activité avec votre banquier pour la dernière fois ? » ; Dans les
6 derniers mois / Il y a 7 à 12 mois / Il y a plus d'un an / Jamais. Niveau essentiel, tous profils, sans condition, seule
question du thème FIN-48.

**Modifications depuis le 28 octobre** : aucune (banque, classeur et règles relus le 29). Ses limites ne sont donc pas résolues :
aucun calcul ni règle ne la lit, et le seul conseil possible reste « Allez voir votre banquier ».

**« Jamais » n'est pas un défaut en soi.** Une entreprise sans découvert, sans investissement à financer et sans tension de
trésorerie n'a aucune raison de voir son banquier. « Jamais » ne devient un sujet que si un besoin de financement est établi, et
ce besoin se lit déjà dans d'autres réponses : découvert (D11, FIN-24), investissement financé par prêt ou leasing (FIN-23.01),
trésorerie des prochains mois et mois de tension (FIN-13).

**Recommandation, inchangée** : la remplacer par « Votre banque connaît-elle ce besoin de financement ? », posée seulement quand
un besoin est établi. Chaque réponse donne alors un conseil précis (le besoin chiffré, l'action, l'échéance avant le mois de
tension) ; « Je ne compte pas passer par une banque » n'est pas un défaut. Détail et autres choix : `docs/audit-utilite/rapport.md`,
section 4.

**Même vigilance ailleurs** : section 7.

## 5. Conditions de pertinence

Vérifiées par le vrai code d'assemblage (simulé) et, pour les règles, dans l'application (exécuté : `dependances.mjs`,
`branches.mjs`).

- **Équipe et dirigeant seul.** 14 questions d'équipe sont posées au dirigeant seul. Huit sont justes : le bloc recrutement se
  répond en estimation par qui prévoit de recruter, RH-41 à RH-44 sont écrites pour lui. Six parlent de « vous et votre équipe »
  (A-10, texte à adapter). Deux défauts de condition : RH-28.10 porte sur des recrues passées (A-07) ; le dirigeant seul reçoit
  deux blocs voisins sur le recrutement et l'aide (A-08).
- **Relances sans problème.** Les relances de devis, d'appels manqués et de paiement ne sont posées que si le problème existe
  (devis, appels manqués, paiement après facture ; conditions jouées dans l'application). Trois pratiques restent posées sans
  problème constaté : rappel la veille d'un rendez-vous (ACQ-09.06), relance des paniers abandonnés (ACQ-11.16), relance des
  retards de paiement (FIN-18.04) ; elles relèvent de la règle commune (A-17).
- **Financement sans besoin.** Crédits (FIN-22) et découvert (FIN-24) ne sont posés que si D10 ou D11 l'indiquent. FIN-11.03
  (découvert autorisé) est posée à tous, à juste titre : elle dit ce qu'un imprévu peut absorber. Seule FIN-48.01 pose problème.
- **Canaux et outils non utilisés.** Les questions sur la fiche Google, le site, les plateformes, la publicité Google et les
  statistiques ne sont posées que si le canal ou l'outil existe, sauf COM-44.01 (avis Google à la Comm, A-09).
- **Usages préventifs justifiés.** Restent posées sans problème constaté, parce que la réponse change le plan même sans problème :
  FIN-11.03 (marge sous le découvert autorisé), RH-45.01 et RH-45.02 (qui reprend les clients du dirigeant seul, informations
  notées), COM-62.01 (Search Console, condition des autres questions de référencement), ACQ-07.04 (coût des outils : zéro est
  une réponse).
- **Inutile, ou utile au mauvais profil ou au mauvais moment.** RH-28.10 et COM-44.01 sont utiles mais mal ciblées ; les
  questions de la section 8 de `docs/audit-utilite/rapport.md` proposées au retrait sont, elles, sans usage.

## 6. Clarté et suffisance des données

- **Relecture** : texte, aide, choix, unité et période relus pour chaque question de la banque (vérification du 28 octobre,
  colonne « Vérification »).
- **Montants** : aucun ne dit HT ou TTC (A-05).
- **Zéro, inconnu, non applicable** : distincts dans les réponses et le calcul ; « Je ne suis pas cette donnée » est proposé à des
  questions qui ne se suivent pas (A-06).
- **Unités** : les 16 signalements « unité différente du texte » sont des parts du chiffre d'affaires en %, justes.
- **Zéro impossible** : les 5 signalements sont justes (position dans Google ≥ 1, effectif « vous compris », « Moins d'1 … »).
- **Tranches** : RH-28.03 n'est pas contiguë (A-11) ; les autres signalements comparent des unités différentes.
- **Périodes et âge de l'entreprise** : chaque question dit sa période ; une question sur le passé est masquée tant que
  l'entreprise est trop jeune (contrôles `historique.mjs`, exécutés). Les 24 questions sur le passé sont soit comparées dans
  `data/evolutions.json`, soit des faits datés ou des tendances déclarées ; COM-37.01 attend une décision (A-15).
- **Doublons** : les textes identiques ou presque sont des jumelles posées une fois, ou des questions différentes (relu).
  Questions qui redemandent une réponse connue : A-20.
- **Seuils, montants, cibles, délais** : aucun n'a été inventé ; ce qui manque est listé (sections 2 et 9).

## 7. Conseils génériques

Un conseil est précis quand il dit le problème constaté, l'action, la raison chiffrée, l'échéance et comment le suivre. Pour les
quatre conseils cités, ce que les réponses permettent déjà de préciser :

| Conseil à éviter | Questions qui risquent de ne produire que lui | Problème mesuré par ailleurs | Ce qui manque |
|---|---|---|---|
| « Communiquez davantage » | COM-07.01, COM-34.01, COM-47.01, COM-05.01, COM-27.02, COM-58.01, COM-61.01 | Chaque étape du parcours de communication : portée, réactions, visites du profil, clics, messages, demandes, clients (COM-17 à COM-23, COM-21.06, COM-22.02, COM-61.02) | Les calculs du parcours (COM-58.03, COM-61.03, COM-39.06) et une règle qui place l'action sur l'étape la plus faible |
| « Déléguez » | RH-05.03, RH-08.04, RH-02.01 | Heures du dirigeant (RH-05.01), heures délégables (RH-05.03), personne la plus chargée et ce qui l'attend (RH-08) | Au niveau essentiel, le nom des tâches n'est pas demandé : le plan doit le dire au lieu d'en inventer |
| « Organisez-vous mieux » | RH-01.01, RH-18.01, RH-20.01, RH-13.01, RH-35.01, RH-39.01, RH-47.01 | Urgences et leurs causes (RH-09), interruptions (RH-10), sollicitations (RH-03), reprises (RH-16), tâches sans responsable (RH-01.02), changements de planning (RH-47.03) | La règle commune : une pratique absente n'est retenue que si le problème qu'elle traite est constaté (A-17) |
| « Suivez votre trésorerie » | FIN-13.06, FIN-34.01 à 34.05, FIN-35.01, FIN-47.02 | Trésorerie des 3 prochains mois et mois de tension (FIN-13.01 à 13.04), découvert (FIN-24) | L'exécution de ces calculs, et FIN-13.06 parmi les entrées de XF46 (A-13) : le conseil doit nommer le mois et le montant |

## 8. Tests dans l'application

Exécutés sur le serveur de test, avec des comptes fictifs (aucun paiement réel, aucun e-mail envoyé) :

<!-- debut:scenarios -->
| canaux | 26 | 0 |
| resultats | 11 | 0 |
| separation | 9 | 0 |
| retours | 5 | 0 |
| rapides | 7 | 0 |
| historique | 32 | 0 |
| partages | 36 | 0 |
| branches | 94 | 0 |
| dependances | 158 | 0 |
<!-- fin:scenarios -->

(contrôle, nombre de contrôles, écarts). Série complète : `docs/verification/resultats/synthese.txt`.

- **Apparition et disparition selon les réponses** : 87 règles jouées dans les deux sens, réponse changée à l'écran, sans
  actualiser (`dependances.mjs`) ; 4 règles sur la taille, effectif changé dans « Mon compte ».
- **Branches** : les 14 règles à plusieurs branches, chaque branche seule (`branches.mjs`) ; une branche du masquage « Sans
  investissement récent » ne se joue pas seule, parce que « déjà en service ? » vaut « non » sans investissement (règle voulue).
- **Ajout, retrait, changement d'un choix ; questions dépendantes** : canaux cochés et décochés (`canaux.mjs`, `rapides.mjs`),
  listes et tableaux qui en dépendent (`listes.mjs`).
- **Retour en arrière et réinitialisation** : `retours.mjs`, « Effacer ma réponse » et second clic (`controle-boutons.mjs`).
- **Réponses encore valides gardées, réponses devenues inapplicables exclues** : vérifié dans la base et par la fonction du
  serveur à chaque règle (`dependances.mjs`, `branches.mjs`).
- **Sauvegarde, actualisation, reprise** : chaque contrôle relit la page après actualisation ; coupure réseau et reprise sur un
  autre appareil (`audit-client.mjs`).
- **Tableaux, unités, totaux, validations** : `controle-boutons.mjs` (chaque question de chaque agent), `controle-prereponse.mjs`
  (total pré-rempli), répartitions à refaire.
- **Données partagées** : `partages.mjs` (36 contrôles), ajouté par cet audit.

**Points non vérifiés, et pourquoi** :

- Le brief de création de contenu (15 questions COM-57) : posé à la première création de contenu, qui n'existe pas encore.
- Les 5 questions d'ACQ-26 : en attente de la catégorie Fabrication.
- Une partie des questions de la banque n'a pas été manipulée dans le navigateur, seulement assemblée, relue et contrôlée par le
  balayage : surtout des questions de profils ou de modules métier que les comptes de test n'ont pas (liste : colonne
  « Vérification » de l'inventaire, « non manipulée dans le navigateur »).
- L'usage des réponses par l'IA : l'IA n'est pas branchée.
- Les comparaisons au marché : aucune recherche réelle n'a été lancée.

## 9. Utilité et implémentation

Classées à part : le statut dit si la question est utile et bien posée ; l'implémentation dit ce que le code fait aujourd'hui de
sa réponse.

<!-- debut:implementation -->
| Implémentation \ utilité | Utile et bien définie | Utile, exploitation à développer | À clarifier ou à rendre conditionnelle | Faible utilité | En attente | Total |
|---|---|---|---|---|---|---|
| exécuté par le code | 115 | 10 | 13 | 1 | 0 | 139 |
| prévu par le classeur, pas encore exécuté | 242 | 8 | 17 | 4 | 0 | 271 |
| lu par l'IA du rapport (pas encore branchée) | 64 | 5 | 8 | 7 | 0 | 84 |
| aucun usage écrit | 2 | 56 | 3 | 13 | 0 | 74 |
| lu par l'IA du rapport, usage à écrire dans le classeur | 9 | 1 | 0 | 0 | 0 | 10 |
| en attente | 0 | 0 | 0 | 0 | 5 | 5 |
<!-- fin:implementation -->

- « Exécuté par le code » : la réponse décide de l'affichage d'autres questions, des lignes d'un tableau, d'une évolution ou d'un
  calcul du moteur.
- « Prévu par le classeur, pas encore exécuté » : un calcul ou un croisement la lit, mais sa formule est en texte libre.
- « Lu par l'IA du rapport » : réponse de contexte ou texte libre, que l'IA lira ; quand l'usage n'est décrit que dans
  l'évaluation, il est à écrire dans le classeur.
- « Aucun usage écrit » : l'évaluation dit ce que la réponse change, mais ni le classeur ni le code ne l'écrivent encore.

**Données recueillies absentes des calculs prévus** : les 13 liens manquants du 28 octobre sont toujours absents (A-13) ; trois
calculs du classeur qui éviteraient une question ne sont pas écrits (A-14) ; COM-37.01 attend une décision (A-15).

## 10. Anomalies

| Identifiant | Anomalie | Type | État | Questions |
|---|---|---|---|---|
<!-- debut:anomalies -->
| A-01 | Liens du classeur pris pour des données partagées | défaut technique | faite | 11 |
| A-02 | Regroupements « déjà renseignés » avec une partie seulement des réponses | défaut technique | faite | 14 |
| A-03 | Chiffre d'affaires mois par mois demandé deux fois (Finance et RH sans l'Acquisition) | défaut technique | faite | 3 |
| A-04 | Carte « déjà renseigné » : identifiants de choix et nombres sans unité | défaut technique | faite | toutes |
| A-05 | Montants sans « hors taxes » ni « toutes taxes comprises » | formulation | proposée | toutes |
| A-06 | « Je ne suis pas cette donnée » proposé sur des questions qui ne sont pas des chiffres | formulation | proposée | toutes |
| A-07 | RH-28.10 posée à qui prévoit seulement de recruter | condition | proposée | 1 |
| A-08 | Dirigeant seul : deux parcours voisins sur le recrutement | doublon | proposée | 2 |
| A-09 | Avis Google demandés à la Comm sans condition « fiche Google » | condition | proposée | 1 |
| A-10 | « Vous et votre équipe » au dirigeant seul | formulation | proposée | 6 |
| A-11 | RH-28.03 : tranches non contiguës | formulation | proposée | 1 |
| A-12 | FIN-48.01 (banquier) : limites non résolues | utilité | à décider | 1 |
| A-13 | Liens manquants dans les entrées des calculs | donnée | à décider | 13 |
| A-14 | Calculs décrits par le classeur et non écrits, qui remplaceraient une question | exploitation | à décider | 3 |
| A-15 | Données recueillies sans exploitation exécutée, en attente d'une décision | exploitation | à décider | 3 |
| A-16 | Règle du quart « je ne suis pas cette donnée » écrite mais non branchée | règle | à construire | toutes |
| A-17 | Pratiques notées sans problème constaté (risque de conseil générique) | règle | à décider | 15 |
| A-18 | Grilles de qualité Comm appliquées par l'IA | règle | à décider | 3 |
| A-19 | Questions RH hors du périmètre de l'agent | périmètre | à décider | 5 |
| A-20 | Questions qui redemandent une réponse connue | doublon | à décider | 2 |
| A-21 | Brief de création de contenu (COM-57) non vérifiable dans l'application | limite | à construire | 15 |
| A-22 | Budget marketing pré-rempli : seules les réponses directes comptent | règle | à décider | 2 |
<!-- fin:anomalies -->

<!-- debut:detail -->
### A-01 · Liens du classeur pris pour des données partagées

- **Questions** : 
  - ACQ-21.03 : « Au maximum, combien de {ventes_realisees} pourriez-vous avoir par mois ? »
  - RH-07.01 : « Sur une semaine habituelle, combien d'heures de travail en plus pourriez-vous accepter, vous et votre équipe, sans faire d'heures supplémentaires ? »
  - ACQ-21.04 : « En moyenne sur les 3 derniers mois, combien d'heures votre équipe passe-t-elle par mois à travailler pour les clients, et combien en facturez-vous ? »
  - RH-06.02 : « Sur une semaine habituelle, combien d'heures un salarié travaille-t-il réellement, en moyenne ? »
  - RH-05.01 : « Sur une semaine habituelle, combien de jours et combien d'heures travaillez-vous ? »
  - FIN-06.02 : « En moyenne sur les 3 derniers mois, combien de {ventes_realisees} avez-vous par mois ? »
  - ACQ-11.07 : « En moyenne, combien de couverts servez-vous par service, le midi et le soir ? »
  - COM-13.01 : « En moyenne sur les 3 derniers mois, combien de visites votre site reçoit-il par mois ? »
  - ACQ-02.01 : « En moyenne sur les 3 derniers mois, combien de {demandes} avez-vous par mois ? »
  - COM-44.01 : « Sur votre fiche Google, combien d'avis avez-vous, quelle est votre note, et combien d'avis avez-vous reçus sur les 6 derniers mois ? »
  - ACQ-06.08 : « Sur votre plateforme principale, quelle est votre note et combien d'avis avez-vous ? »
- **Problème** : La colonne « Données utilisées » d'une donnée partagée liste aussi des données qui servent seulement à la calculer. Le code les traitait comme la même question chez un autre agent : capacité de ventes (ACQ-21.03) et heures en plus par fonction (RH-07.01) ; heures de l'équipe (ACQ-21.04) et heures d'un salarié (RH-06.02) ou du dirigeant (RH-05.01) ; ventes par mois (FIN-06.02) et couverts par service (ACQ-11.07) ; visites du site (COM-13.01) et demandes de devis (ACQ-02.01) ; avis Google (COM-44.01) et avis de la plateforme (ACQ-06.08).
- **Conséquence** : Une fois l'une répondue, l'autre s'affichait « déjà renseignée » avec une réponse qui n'est pas la sienne : la donnée n'était jamais recueillie, et le moteur lisait une valeur fausse (des heures pour un nombre de ventes, des couverts par service pour des ventes par mois). Reproduit dans le navigateur le 29 octobre (7 écarts sur 13 contrôles).
- **Correction (faite)** : data/partages.json décrit chaque lien du classeur entre deux questions différentes : six liens « pas un partage », avec leur raison ; COM-13.01 et ACQ-02.01 restent la même donnée pour une boutique en ligne, où ACQ-02.01 se lit « visiteurs de votre site » (partageSeulementPour). Le contrôle des données refuse désormais un lien non décrit.
- **Contrôle** : Navigateur : scripts/verification/partages.mjs, P-01 à P-12 et P-20 conformes. Tests : tests/partages.test.mts (10 tests). Contrôle des données : un lien retiré de data/partages.json est refusé (test).

### A-02 · Regroupements « déjà renseignés » avec une partie seulement des réponses

- **Questions** : 
  - COM-32.01 : « Combien dépensez-vous par mois en création de contenu, en agence marketing et en outils marketing ? »
  - ACQ-07.01 : « Combien payez-vous par mois à une agence ou à un prestataire marketing ? »
  - ACQ-07.03 : « Combien dépensez-vous par mois pour faire créer du contenu : photographe, vidéaste, graphiste ? »
  - ACQ-07.04 : « Combien vous coûtent par mois vos outils marketing : emailing, logiciel de réservation ou de suivi des clients, banque d'images ? »
  - COM-12.01 : « Sur les 12 derniers mois, quelle part de vos demandes, de vos nouveaux clients et de votre chiffre d'affaires est arrivée par chaque canal ? »
  - ACQ-03.02 : « Sur les 12 derniers mois, quelle part de vos {demandes} est arrivée par chaque canal ? »
  - ACQ-03.03 : « Sur les 12 derniers mois, quelle part de vos nouveaux clients est arrivée par chaque canal ? »
  - ACQ-03.04 : « Sur les 12 derniers mois, quelle part de votre chiffre d'affaires vient de chaque canal ? »
  - FIN-34.02 : « À quelle fréquence regardez-vous vos chiffres financiers : trésorerie, marge, charges ? »
  - COM-43.01 : « À quelle fréquence regardez-vous vos statistiques de communication ? »
  - ACQ-20.02 : « À quelle fréquence regardez-vous vos chiffres ? »
  - RH-16.01 : « En moyenne sur les 3 derniers mois, combien de fois par mois devez-vous refaire ou corriger un travail, et combien de temps cela prend-il à chaque fois ? »
  - FIN-10.01 : « En moyenne sur les 3 derniers mois, combien de reprises, de retours et de gestes commerciaux avez-vous par mois, et combien coûtent-ils ? »
  - FIN-10.03 : « En moyenne, combien d'heures passez-vous sur une reprise ? »
- **Problème** : Une question qui regroupe plusieurs questions d'un autre agent (COM-32.01 et les trois dépenses de l'Acquisition, COM-12.01 et les trois répartitions par canal, une ligne du tableau ACQ-20.02, deux champs de RH-16.01) était liée à chacune comme si c'était la même question.
- **Conséquence** : COM-32.01 passait pour « déjà renseignée » dès qu'une seule dépense était connue, et les deux autres n'étaient jamais demandées à la Comm ; le moteur lisait un nombre là où il attend trois champs, ou un tableau là où il attend un choix. Dans l'autre sens, des questions entières étaient reposées alors que leurs valeurs étaient connues.
- **Correction (faite)** : Correspondances partie à partie (data/partages.json, src/lib/audit/partages.ts) : une question entièrement couverte par des réponses données ailleurs n'est pas reposée et le moteur lit la valeur de chaque partie ; couverte en partie, elle s'affiche avec les valeurs connues reprises, à vérifier et compléter, sans rien enregistrer à la place du dirigeant. « Modifier cette réponse » ouvre chaque question d'origine.
- **Contrôle** : Navigateur : P-07a à P-07d, P-13 à P-19b conformes (dont la reprise non enregistrée, la question complétée puis enregistrée, la modification depuis l'autre agent et après actualisation). Tests : 5 tests de correspondances, dont la lecture du moteur.

### A-03 · Chiffre d'affaires mois par mois demandé deux fois (Finance et RH sans l'Acquisition)

- **Questions** : 
  - ACQ-23.01 : « Quel a été votre chiffre d'affaires pour chacun des 12 derniers mois ? »
  - FIN-14.01 : « Quel a été votre chiffre d'affaires pour chacun des 12 derniers mois ? »
  - RH-11.01 : « Quel a été votre chiffre d'affaires pour chacun des 12 derniers mois ? »
- **Problème** : Les trois questions sont identiques ; le classeur lie FIN-14.01 et RH-11.01 à ACQ-23.01 seulement. Le code ne reliait pas les jumelles d'une même jumelle.
- **Conséquence** : Un compte avec la Finance et la RH, sans l'Acquisition, saisissait deux fois douze montants.
- **Correction (faite)** : Les jumelles d'un même groupe sont toutes reliées (equivalences, partages.ts). Le contrôle des données garantit que ces liens ne relient que des questions identiques. Un seul groupe de trois existe aujourd'hui.
- **Contrôle** : Navigateur : P-21 conforme. Test : « une jumelle de ma jumelle est ma jumelle ».

### A-04 · Carte « déjà renseigné » : identifiants de choix et nombres sans unité

- **Questions** : toutes celles décrites ci-dessous.
- **Problème** : La réponse reprise d'un autre agent s'affichait avec l'identifiant technique d'un choix (« chaque_trimestre ») et sans unité (« 300 » pour 300 €) ; un groupe de champs se résumait à « 3 valeurs renseignées ».
- **Conséquence** : Mot technique montré au dirigeant (CLAUDE.md, section 12 : une erreur ou un écran ne montre jamais un identifiant), lecture difficile de la réponse partagée.
- **Correction (faite)** : resumeReponse lit le libellé du choix, ajoute l'unité, et détaille un groupe de champs (libellé, montant, unité).
- **Contrôle** : Navigateur : P-14b, P-16b, P-18b et P-19b conformes.

### A-05 · Montants sans « hors taxes » ni « toutes taxes comprises »

- **Questions** : toutes celles décrites ci-dessous.
- **Problème** : Aucune des 100 questions qui demandent un montant en euros (115 champs), ni le chiffre d'affaires du dossier, ne dit si le montant est hors taxes ou toutes taxes comprises.
- **Conséquence** : Deux dirigeants identiques peuvent répondre l'un HT, l'autre TTC : un écart de 20 % sur le chiffre d'affaires, les charges et le panier moyen, qui fausse les marges, les seuils et toute comparaison au marché.
- **Correction (proposée)** : Écrire une règle unique, affichée en tête du questionnaire et du dossier : « Tous les montants sont hors taxes (HT). Si vous ne facturez pas la TVA, indiquez les montants réellement payés ou encaissés. » ; l'ajouter à l'aide des questions de chiffre d'affaires et de charges. Décision du propriétaire (convention HT, cas des entreprises sans TVA).
- **Contrôle** : Contrôle automatique (scripts/verification/audit-final-controles.mts) : 115 champs relevés, aucun ne mentionne HT ou TTC.

### A-06 · « Je ne suis pas cette donnée » proposé sur des questions qui ne sont pas des chiffres

- **Questions** : toutes celles décrites ci-dessous.
- **Problème** : Les boutons « Je ne sais pas » et « Je ne suis pas cette donnée » s'affichent sur les 561 questions, dont 257 ne se répondent pas par un chiffre (123 choix, 30 cases, 15 oui / non, 15 textes, 5 listes, 1 mois, 68 tableaux ou groupes de champs mixtes). La règle « quatre réponses pour un chiffre » vise les chiffres.
- **Conséquence** : « Je ne suis pas cette donnée » à « Avez-vous un site internet ? » ou « Comment fixez-vous vos prix ? » n'a pas de sens ; enregistrée comme absence de suivi, elle compterait dans la règle du quart et appellerait un conseil pour « commencer à suivre » une donnée qui ne se suit pas.
- **Correction (proposée)** : Garder « Je ne sais pas » partout ; réserver « Je ne suis pas cette donnée » aux questions chiffrées (nombre, tableaux et groupes de champs chiffrés). Les contrôles des boutons (controle-boutons.mjs) seraient à adapter. Décision du propriétaire.
- **Contrôle** : Lecture du code : question-carte.tsx affiche les deux boutons sans condition ; comptage sur la banque.

### A-07 · RH-28.10 posée à qui prévoit seulement de recruter

- **Questions** : 
  - RH-28.10 : « Lequel de ces moyens vous a apporté vos meilleures recrues ? »
- **Problème** : La question porte sur des recrues passées (« vous a apporté vos meilleures recrues ») ; sa condition (D13 · si recrutement fait ou prévu) l'ouvre aussi à « Je prévois de recruter ».
- **Conséquence** : Un dirigeant qui n'a jamais recruté ne peut pas répondre : réponse « je ne sais pas » forcée, effort inutile.
- **Correction (proposée)** : Lui donner la condition existante « D13 · si recrutement sur la période » (J'ai recruté, Les deux), comme RH-28.04 et RH-28.05. Les autres questions du bloc (délai, autonomie, heures d'accompagnement) se répondent en estimation par qui prévoit de recruter et servent au calendrier de l'objectif (XR19) : elles restent ouvertes.
- **Contrôle** : Navigateur : la condition actuelle est jouée branche par branche (branches.mjs, D-049 : 9 questions ouvertes pour chacune des trois réponses, conformes).

### A-08 · Dirigeant seul : deux parcours voisins sur le recrutement

- **Questions** : 
  - RH-28.01 : « Avez-vous recruté sur les 12 derniers mois, ou prévoyez-vous de recruter ? »
  - RH-41.01 : « Aimeriez-vous être aidé dans votre travail, par un salarié, un apprenti, un freelance ou un associé ? »
- **Problème** : Au dirigeant seul, la RH demande « Avez-vous recruté sur les 12 derniers mois, ou prévoyez-vous de recruter ? » (RH-28.01) et « Aimeriez-vous être aidé dans votre travail, par un salarié, un apprenti, un freelance ou un associé ? » (RH-41.01). « Je prévois de recruter » et « Oui, dans les 6 prochains mois » ouvrent deux blocs : RH-28 à RH-31 (7 questions) et RH-41 à RH-44 (8 questions).
- **Conséquence** : 34 questions RH au niveau essentiel pour un dirigeant seul qui envisage de l'aide, dont deux séries proches (préparer l'arrivée, délai, ce qui retient de se faire aider).
- **Correction (proposée)** : Pour le dirigeant seul, ne pas poser RH-28.01 : RH-41.01 ouvre son parcours (RH-41 à RH-44, écrit pour lui), et RH-44.02 dit s'il a déjà eu un salarié. Ou garder les deux et retirer du bloc RH-28 à RH-31 ce que RH-41 à RH-44 couvre déjà. Décision du propriétaire.
- **Contrôle** : Simulation par le vrai code d'assemblage (taille « seul », niveau essentiel) : 21 questions sans réponse, 34 avec « Je prévois de recruter » et « Oui, dans les 6 prochains mois ».

### A-09 · Avis Google demandés à la Comm sans condition « fiche Google »

- **Questions** : 
  - COM-44.01 : « Sur votre fiche Google, combien d'avis avez-vous, quelle est votre note, et combien d'avis avez-vous reçus sur les 6 derniers mois ? »
- **Problème** : COM-44.01 est posée à tous, alors que sa jumelle ACQ-06.01 et COM-14.01 (« Que contient votre fiche Google ? ») ne le sont que si « Fiche Google » est cochée dans les canaux.
- **Conséquence** : Un dirigeant sans fiche Google doit répondre « 0 avis » ou « je ne sais pas » à une question qui ne le concerne pas ; deux règles différentes pour la même donnée.
- **Correction (proposée)** : Condition « D03 · si « fiche Google » est cochée », comme ACQ-06.01. Les canaux (ACQ-03.01) sont déjà posés en « Pour commencer » à la Comm.
- **Contrôle** : Contrôle automatique (canal ou outil sans condition) ; règles d'affichage relues.

### A-10 · « Vous et votre équipe » au dirigeant seul

- **Questions** : 
  - ACQ-04.01 : « Sur une semaine habituelle, combien d'heures passez-vous, vous et votre équipe, à prospecter ? »
  - ACQ-21.04 : « En moyenne sur les 3 derniers mois, combien d'heures votre équipe passe-t-elle par mois à travailler pour les clients, et combien en facturez-vous ? »
  - FIN-02.01 : « En moyenne sur les 3 derniers mois, combien d'heures par mois passez-vous, vous et votre équipe, pour chacun de vos 5 plus gros clients ? »
  - RH-07.01 : « Sur une semaine habituelle, combien d'heures de travail en plus pourriez-vous accepter, vous et votre équipe, sans faire d'heures supplémentaires ? »
  - COM-31.01 : « Sur une semaine habituelle, combien d'heures passez-vous, vous et votre équipe, sur chaque tâche de communication ? »
  - COM-31.02 : « Comment se répartissent ces heures entre vous, vos salariés et vos prestataires ? »
- **Problème** : Ces questions, posées aussi au dirigeant seul, parlent de son équipe ou de ses salariés.
- **Conséquence** : Texte qui ne correspond pas à la situation ; le dirigeant seul peut se demander s'il est concerné. La réponse reste juste.
- **Correction (proposée)** : Une forme par taille, comme le lexique par profil : « combien d'heures passez-vous à prospecter ? » pour le dirigeant seul ; « vous et votre équipe » sinon. Demande un mot du lexique selon la taille (mécanisme à ajouter) ou une variante de texte. Textes à valider.
- **Contrôle** : Contrôle automatique (questions d'équipe posées au dirigeant seul : 14 relevées, 6 retenues ; les autres sont écrites pour lui ou ne parlent pas d'équipe).

### A-11 · RH-28.03 : tranches non contiguës

- **Questions** : 
  - RH-28.03 : « Combien de temps s'écoule entre l'annonce d'un poste et l'arrivée de la recrue ? »
- **Problème** : Choix : « Moins d'1 mois », « 1 à 2 mois », « 3 à 4 mois », « Plus de 4 mois ». Un délai de deux mois et demi n'a pas de case.
- **Conséquence** : Réponse approximative ou « je ne sais pas » pour un délai pourtant connu.
- **Correction (proposée)** : « Moins d'1 mois », « 1 à 2 mois », « Plus de 2 à 4 mois », « Plus de 4 mois ». À valider.
- **Contrôle** : Contrôle automatique des tranches, relu à la main (les autres signalements de tranches sont des faux positifs : unités différentes).

### A-12 · FIN-48.01 (banquier) : limites non résolues

- **Questions** : 
  - FIN-48.01 : « Quand avez-vous fait le point sur votre activité avec votre banquier pour la dernière fois ? »
- **Problème** : Question inchangée depuis le 28 octobre (texte, réponses, niveau essentiel, sans condition, aucun calcul, aucune règle). « Jamais » n'est pas un défaut en soi : il ne le devient que si un besoin de financement existe, et ce besoin se lit déjà dans d'autres réponses (découvert D11 et FIN-24, investissement FIN-23.01, trésorerie des prochains mois FIN-13).
- **Conséquence** : Seul conseil possible : « Allez voir votre banquier », sans problème, montant ni échéance.
- **Correction (à décider)** : Recommandation inchangée : remplacer par « Votre banque connaît-elle ce besoin de financement ? », posée seulement si un besoin est établi (D11 = oui, ou financement de l'investissement par prêt ou leasing). Autres choix : retirer, ou garder (déconseillé). docs/audit-utilite/rapport.md, section 4.
- **Contrôle** : Banque et classeur relus le 29 octobre : aucune modification depuis le 28.

### A-13 · Liens manquants dans les entrées des calculs

- **Questions** : 
  - FIN-09.10 : « Combien vous coûtent au total vos abonnements et contrats chaque mois ? »
  - FIN-46.01 : « Sur les 12 derniers mois, quelle somme avez-vous retirée de l'entreprise pour vous payer ? »
  - FIN-46.02 : « Combien l'entreprise paie-t-elle chaque mois pour vos cotisations sociales personnelles ? »
  - FIN-46.03 : « Combien voudriez-vous vous verser par mois pour que votre activité vous convienne ? »
  - FIN-20.08 : « De combien est cette remise ? »
  - FIN-13.06 : « Prévoyez-vous vos rentrées et vos sorties d'argent des prochains mois, dans un plan de trésorerie ? »
  - RH-15.03 : « Sur une semaine habituelle, combien d'heures ce matériel fait-il perdre ? »
  - RH-05.10 : « Combien de temps pourriez-vous vous absenter sans que vos clients subissent de retard ? »
  - RH-07.02 : « Pendant un pic d'activité de quelques semaines, combien d'heures en plus par semaine l'équipe peut-elle absorber, heures supplémentaires comprises ? »
  - ACQ-18.07 : « Que gagne la personne qui vous recommande un nouveau client ? »
  - ACQ-07.15 : « Parmi les clients venus par une plateforme, quelle part revient ensuite vous voir sans passer par elle ? »
  - COM-09.08 : « Pour chacune de vos offres principales, avez-vous au moins une preuve à montrer ? »
  - COM-22.04 : « Sur les 12 derniers mois, parmi les demandes qui vous sont venues des réseaux sociaux, quelle part est venue de chaque réseau ? »
- **Problème** : Treize questions posées ne figurent pas parmi les entrées du calcul qui en a besoin (charges fixes, seuil avec rémunération du dirigeant, remise fournisseur, pilotage financier, heures perdues, absence du dirigeant, réserve en période de pic, coût d'un client recommandé, coût réel d'une plateforme, offres sans preuve, demandes par réseau).
- **Conséquence** : Quand ces calculs seront écrits, ils ignoreront une donnée recueillie : résultat incomplet (charges fixes sans abonnements au niveau essentiel) ou faux (XR23 lit l'absence des autres personnes au lieu de celle du dirigeant).
- **Correction (à décider)** : Ajouter ces entrées dans le classeur (onglets des données et des croisements), puis réimporter. Aucun changement pour le dirigeant. Liste détaillée : docs/audit-utilite/rapport.md, section 6.
- **Contrôle** : Revérifié le 29 octobre sur data/croisements.json et les données : les 16 liens (13 questions) sont toujours absents.

### A-14 · Calculs décrits par le classeur et non écrits, qui remplaceraient une question

- **Questions** : 
  - ACQ-21.03 : « Au maximum, combien de {ventes_realisees} pourriez-vous avoir par mois ? »
  - ACQ-21.04 : « En moyenne sur les 3 derniers mois, combien d'heures votre équipe passe-t-elle par mois à travailler pour les clients, et combien en facturez-vous ? »
  - FIN-06.02 : « En moyenne sur les 3 derniers mois, combien de {ventes_realisees} avez-vous par mois ? »
- **Problème** : Le classeur décrit des calculs qui éviteraient une question quand un autre agent a déjà les données : capacité de ventes depuis les heures disponibles (RH-07), heures travaillées depuis les heures par personne (RH-06.02) ou celles du dirigeant (RH-05.01), ventes par mois d'un restaurant depuis les couverts et les services (ACQ-11.07 × ACQ-11.09 × 4,33, CLAUDE.md section 11). Aucun n'est écrit : depuis la correction A-01, la question est posée.
- **Conséquence** : Saisie en plus pour le dirigeant qui a déjà répondu à l'autre agent ; aucune valeur fausse.
- **Correction (à décider)** : Écrire ces calculs, puis proposer le résultat comme réponse pré-remplie (mécanisme de FIN-05.02), que le dirigeant garde ou corrige. Formules à confirmer par le propriétaire (ventes absorbables : heures disponibles ÷ heures par vente, donnée à identifier).
- **Contrôle** : Lecture du classeur (colonne « Calcul » de ACQ-21.03, ACQ-21.04, FIN-06.02).

### A-15 · Données recueillies sans exploitation exécutée, en attente d'une décision

- **Questions** : 
  - COM-37.01 : « Il y a 6 mois, combien d'abonnés aviez-vous sur chaque réseau ? »
  - FIN-05.03 : « Il y a 12 mois, combien vous coûtaient vos charges fixes par mois, au total ? »
  - ACQ-23.03 : « Pour chacun de ces mois, un an plus tôt, quel était votre chiffre d'affaires ? »
- **Problème** : COM-37.01 (abonnés il y a 6 mois) alimente une évolution par réseau qui n'est pas calculée (COM-37.02, « nonCalculables ») ; les croisements XC07 et XC18 en dépendent. FIN-05.03 (charges fixes il y a 12 mois) n'a pas de terme comparable au niveau essentiel (abonnements en approfondi). ACQ-23.03 demande 12 montants au niveau essentiel.
- **Conséquence** : Effort demandé sans résultat affiché tant que la décision n'est pas prise.
- **Correction (à décider)** : Décisions déjà listées (CLAUDE.md, section 15, point 13) : comparaison par réseau, abonnements au niveau essentiel, total annuel.
- **Contrôle** : data/evolutions.json relu ; évolutions calculées par le moteur (tests/historique.test.mts).

### A-16 · Règle du quart « je ne suis pas cette donnée » écrite mais non branchée

- **Questions** : toutes celles décrites ci-dessous.
- **Problème** : bilanNonSuivi (src/lib/audit/reponse.ts) calcule la part des données essentielles « non suivies », mais rien ne l'appelle : le compte rendu n'ajoute pas le conseil général de pilotage prévu au-delà d'un quart.
- **Conséquence** : Règle validée (CLAUDE.md, section 6) sans effet tant que le compte rendu n'est pas construit.
- **Correction (à construire)** : Brancher bilanNonSuivi dans le constat transmis à l'IA du compte rendu ; le texte du conseil reste à écrire.
- **Contrôle** : Recherche dans le code : aucun appel hors des tests.

### A-17 · Pratiques notées sans problème constaté (risque de conseil générique)

- **Questions** : 
  - RH-01.01 : « Les missions de chaque personne sont-elles écrites, dans une fiche de poste ou une simple liste ? »
  - RH-18.01 : « Comment les priorités de la semaine sont-elles partagées avec l'équipe ? »
  - RH-20.01 : « À quelle fréquence dites-vous à chacun ce qui va et ce qui ne va pas dans son travail ? »
  - RH-13.01 : « Quand quelqu'un est absent, comment son travail est-il repris ? »
  - RH-35.01 : « Comment recueillez-vous l'avis de l'équipe sur ses conditions de travail ? »
  - RH-39.01 : « Comment vos derniers changements d'organisation ont-ils été menés : nouvel outil, nouveaux rôles, nouveaux horaires ? »
  - COM-07.01 : « Votre logo, vos couleurs et votre ton sont-ils les mêmes partout : site, réseaux, devis, vitrine, véhicules ? »
  - COM-34.01 : « Déclinez-vous un même contenu sur plusieurs réseaux ou en plusieurs formats ? »
  - COM-47.01 : « Quelle part des commentaires sur vos publications reçoit une réponse ? »
  - FIN-13.06 : « Prévoyez-vous vos rentrées et vos sorties d'argent des prochains mois, dans un plan de trésorerie ? »
  - ACQ-09.06 : « Envoyez-vous un rappel à vos clients la veille de leur rendez-vous ? »
  - ACQ-11.16 : « Relancez-vous automatiquement les clients qui abandonnent leur panier ? »
  - ACQ-17.05 : « Recontactez-vous vos anciens clients pour leur proposer de revenir, par email, SMS, appel ou courrier ? »
  - ACQ-18.01 : « À quel moment demandez-vous à vos clients de vous recommander ? »
  - FIN-18.04 : « Comment relancez-vous un client qui paie en retard ? »
- **Problème** : Ces pratiques sont « notées directement » sans règle écrite. Sans lien avec un problème mesuré, elles ne peuvent produire que « organisez-vous mieux », « communiquez davantage » ou « suivez votre trésorerie ».
- **Conséquence** : Conseil sans problème, montant ni échéance ; une pratique absente pénaliserait une entreprise qui n'a pas le problème qu'elle traite.
- **Correction (à décider)** : Règle commune (section 15, point 14) : une pratique absente n'est un défaut que si le problème qu'elle traite est constaté par une réponse chiffrée (urgences RH-09, interruptions RH-10, reprises RH-16, étapes du parcours Comm COM-17 à COM-23, mois de tension FIN-13.04, rendez-vous non honorés, paniers abandonnés, retards de paiement). Le tableau des conseils génériques est dans docs/audit-final/rapport.md.
- **Contrôle** : Recensement : 88 questions de pratique ou de choix sans calcul, relues ; 15 retenues ici.

### A-18 · Grilles de qualité Comm appliquées par l'IA

- **Questions** : 
  - COM-01.01 : « En une phrase, que faites-vous, pour qui, et qu'est-ce qui vous rend différent ? »
  - COM-39.02 : « Pour vos 3 meilleures et vos 3 moins bonnes publications des 3 derniers mois, quel est leur texte et leur lien ? »
  - COM-44.04 : « Que disent vos clients dans leurs 20 derniers avis ? »
- **Problème** : Le classeur fait noter par l'IA, avec une grille, le positionnement (COM-01.02, lu dans COM-01.01), l'appel à l'action (COM-20.01) et la grille des publications (COM-49 à COM-54), lus dans COM-39.02, et les thèmes des avis (COM-44.05, lu dans COM-44.04).
- **Conséquence** : Si l'IA applique la grille, elle produit une couleur, ce que la règle fondatrice interdit.
- **Correction (à décider)** : Décider qui applique la grille de 6 critères (section 15, point 14) : règle de code sur des réponses fermées, ou thème en Contexte.
- **Contrôle** : Classeur relu ; inchangé depuis le 28 octobre.

### A-19 · Questions RH hors du périmètre de l'agent

- **Questions** : 
  - RH-06.06 : « Les heures supplémentaires sont-elles payées ou récupérées ? »
  - RH-25.02 : « Utilisez-vous les financements de formation de votre opérateur de compétences (OPCO) ? »
  - RH-46.02 : « Aujourd'hui, combien de personnes avez-vous par type de contrat ? »
  - RH-47.02 : « Combien de temps à l'avance l'équipe connaît-elle son planning ? »
  - RH-48.02 : « Une partie de la rémunération de l'équipe dépend-elle de ces objectifs ? »
- **Problème** : Heures supplémentaires ni payées ni récupérées, financements de formation, types de contrat, délai de prévenance du planning, rémunération liée aux objectifs : sujets de droit du travail ou de rémunération.
- **Conséquence** : L'agent RH ne peut rien en dire sans sortir de son périmètre (jamais de droit du travail).
- **Correction (à décider)** : Retrait, fusion, ou avis de l'avocat sur ce que le rapport peut en dire (section 15, point 14).
- **Contrôle** : Banque relue ; inchangée.

### A-20 · Questions qui redemandent une réponse connue

- **Questions** : 
  - COM-24.01 : « Quel est l'objectif principal de votre communication ? »
  - COM-63.01 : « Faites-vous de la publicité sur Google, avec Google Ads ? »
- **Problème** : COM-24.01 redemande l'objectif de l'agent Comm, choisi au début de l'agent. COM-63.01 (publicité Google) se déduit de D04 = non. D07 (stock) est reposé à la Finance alors que le métier ou l'inscription le donne.
- **Conséquence** : Saisie en double ; deux réponses qui peuvent se contredire.
- **Correction (à décider)** : COM-24.01 : finalité portée par chaque objectif Comm, question retirée ; COM-63.01 : réponse déduite « non » si D04 = non (mécanisme existant) ; D07 : repris du compte.
- **Contrôle** : Données et code relus ; inchangés.

### A-21 · Brief de création de contenu (COM-57) non vérifiable dans l'application

- **Questions** : 
  - COM-57.01 : « Comment décririez-vous votre client idéal, en deux ou trois phrases ? »
  - COM-57.02 : « Dans vos contenus, tutoyez-vous ou vouvoyez-vous vos clients ? »
  - COM-57.03 : « Quel ton voulez-vous donner à vos contenus ? »
  - COM-57.04 : « Quels mots voulez-vous employer dans vos contenus, et lesquels voulez-vous éviter ? »
  - COM-57.05 : « Êtes-vous prêt à apparaître en photo ou en vidéo dans vos contenus ? »
  - COM-57.06 : « Avez-vous un logo et une charte graphique, et quelles sont vos couleurs ? »
  - COM-57.07 : « Quels contenus voulez-vous recevoir ? »
  - COM-57.08 : « Voulez-vous valider chaque contenu avant qu'il soit publié ? »
  - COM-57.10 : « Quelle offre voulez-vous mettre en avant en priorité dans vos contenus ? »
  - COM-57.11 : « Quelles questions vos clients vous posent-ils le plus souvent ? »
  - COM-57.12 : « Quelles hésitations entendez-vous le plus souvent avant qu'un client se décide ? »
  - COM-57.13 : « Quelles dates comptent pour votre activité dans l'année ? »
  - COM-57.14 : « Votre métier impose-t-il des règles pour communiquer, par exemple sur l'alcool, la santé, les prix ou les promotions ? »
  - COM-57.15 : « Quels comptes ou quelles publications aimez-vous, dans votre métier ou ailleurs ? »
  - COM-57.16 : « Dans quelles langues voulez-vous publier ? »
- **Problème** : Ces questions se posent à la première création de contenu (D30), jamais pendant l'audit ; la création de contenu n'existe pas encore.
- **Conséquence** : Ni affichage ni enregistrement ne peuvent être essayés dans l'application ; leur utilité dépend d'une fonction à construire.
- **Correction (à construire)** : Les vérifier avec la création de contenu. Elles sont relues (texte, réponses) et évaluées une à une dans l'inventaire.
- **Contrôle** : Assemblage : non atteignables pendant l'audit (inventaire, colonne « atteignable »), comme prévu.

### A-22 · Budget marketing pré-rempli : seules les réponses directes comptent

- **Questions** : 
  - FIN-05.02 : « Combien dépensez-vous par mois en marketing et en communication, au total ? »
  - COM-32.01 : « Combien dépensez-vous par mois en création de contenu, en agence marketing et en outils marketing ? »
- **Problème** : Le total pré-rempli de FIN-05.02 additionne ACQ-07.01, 07.03, 07.04 telles qu'enregistrées. Depuis la correction A-02, ces dépenses peuvent être connues par COM-32.01 (Comm sans l'Acquisition) ; la règle de pré-remplissage ne les lit pas.
- **Conséquence** : Un compte Finance et Comm sans l'Acquisition n'a jamais le total proposé, même quand tout le détail est connu. Aucune valeur fausse.
- **Correction (à décider)** : Faire lire au pré-remplissage les réponses partagées (lecture composée), ou garder la règle telle qu'écrite le 22 octobre. Voisin de la question déjà ouverte « FIN-05.02 sans l'agent Comm » (section 15, point 6).
- **Contrôle** : Lecture du code (src/lib/audit/prereponse.ts) ; contrôle navigateur du total pré-rempli (controle-prereponse.mjs) inchangé.

<!-- fin:detail -->

## 11. Fichiers et commandes

| Fichier | Contenu |
|---|---|
| `docs/audit-final/inventaire.csv`, `inventaire.json`, `CAXE-inventaire-questions.xlsx` | Une ligne par question |
| `docs/audit-final/anomalies.json` | Anomalies (écrites à la main) |
| `docs/audit-final/revisions.txt` | Révisions des évaluations du 28 octobre |
| `docs/audit-final/controles-auto.json` | Signalements des contrôles automatiques |
| `docs/audit-final/chiffres.json` | Chiffres de la synthèse |
| `data/partages.json` | Liens entre questions de deux agents (correction A-01 à A-03) |

```
node scripts/verification/audit-final-controles.mts     # contrôles automatiques
bash scripts/verification/tout.sh                        # série complète, dont partages.mjs et branches.mjs
node scripts/verification/audit-final-rapport.mjs       # inventaire, chiffres, blocs de ce rapport
python3 scripts/verification/audit-final-xlsx.py         # version Excel de l'inventaire
```

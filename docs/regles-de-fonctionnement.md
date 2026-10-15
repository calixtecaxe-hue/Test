# CAXE — Règles de fonctionnement

Oct 15, 2026 · @Romain Dubois

## Mode d'emploi

Ce document rassemble les règles posées ensemble sur CAXE jusqu'au 15 octobre 2026, en trois parties (le fonctionnement de l'outil, les 4 agents, l'adaptation au profil du dirigeant), suivies des règles de mise en œuvre. Seule la version en vigueur de chaque règle figure ici.

Les fichiers de travail qui détaillent ces règles :

- **CLAUDE.md** : le brief donné à Claude Code (architecture, agents, routage, charte).
- **CAXE\_Questionnaire\_Grille\_Pilote.xlsx** : le questionnaire et la grille de seuils du pilote agence immobilière.
- **CAXE\_Themes\_Chiffres\_4\_agents.xlsx** : thèmes, données, croisements, déclencheurs et lexique des 4 agents.

Règles abandonnées, à ne pas réintroduire :

| Ancienne règle | Remplacée par | Date |
| --- | --- | --- |
| Score global sur 100 | Objectif chiffré du dirigeant et avancement vers cet objectif | 8 oct. |
| Types de questions A / B / C | 4 natures de notation (Marché, Pratique, Cohérence, Contexte) | 14 oct. |
| Un questionnaire complet écrit par secteur | Banque unique de questions, assemblée selon le profil | 14 oct. |
| Actions pré-écrites pour chaque indicateur | Recommandations générées par l'IA à partir de la situation complète | 30 sept. |
| Point d'étape mensuel à date fixe | Point d'étape à l'échéance propre de chaque action | 28 sept. |
| Forfait unique pour tous les agents | Abonnement par paliers selon le nombre d'agents | 28 sept. |
| Agents personnifiés (prénoms) | Noms fonctionnels uniquement | sept. |

# Partie 1 — L'outil

## Principes fondateurs

CAXE repose sur une règle unique : **le moteur diagnostique, l'IA prescrit.** Aucune question, aucune couleur et aucun chiffre ne sont produits par l'IA.

| Couche | Qui la fait | Son rôle | Ce qu'elle ne fait jamais |
| --- | --- | --- | --- |
| 1. Questionnaire | Écrit à l'avance, dans une banque de questions | Collecter des données fermées et chiffrées | Être généré à la volée par l'IA |
| 2. Moteur | Code déterministe, testé | Calculer les couleurs, les écarts, les impacts et les priorités | Faire appel à l'IA |
| 3. IA | Modèle génératif | Rédiger l'analyse et générer librement les recommandations | Recalculer ou réécrire un chiffre |

**Pourquoi l'IA prescrit librement.** Un constat doit être reproductible pour rester comparable dans le temps ; un conseil doit être adapté pour être utile. Deux entreprises en rouge sur le même indicateur n'ont pas forcément le même problème. Les actions pré-écrites par indicateur ont donc été écartées.

**Ce que l'IA reçoit pour raisonner :**

- les indicateurs faibles, avec leur valeur et leur écart chiffré à la référence ;
- les indicateurs forts ;
- le profil complet de l'entreprise et l'objectif fixé pour cet agent ;
- les réponses libres du dirigeant et ce qu'il a déjà tenté ;
- son historique, s'il en a un.

Dans le modèle de données, chaque indicateur porte une `reference_marche` et une `explication`, et aucun champ « action ». Ces deux champs sont la matière de raisonnement de l'IA : « 72 %, marché entre 70 et 85 % » produit un conseil sensé, « rouge » seul ne suffit pas.

**Les trois limites de l'IA :**

1. Elle ne traite que les indicateurs signalés par le moteur. Elle ne décide pas qu'un vert est un problème.
2. Elle ne réécrit aucun chiffre. Couleurs, pourcentages et références viennent du moteur.
3. Elle reste dans le périmètre de son agent : jamais de conseil juridique, fiscal, comptable, médical ou de droit du travail.

**Ce qui peut rester dynamique :** le choix, parmi des questions pré-écrites, de celles posées à un point d'étape ; la rédaction du rapport et des relances ; une légère adaptation du ton d'une question. Jamais la substance ni la structure d'une question.

**Deux couches de données.** Les réponses fermées et chiffrées alimentent le calcul. Les réponses ouvertes, toujours facultatives, n'entrent jamais dans le calcul : elles donnent du contexte à l'IA pour personnaliser le rapport.

## Le parcours d'un dirigeant

Un dirigeant passe par six étapes. L'IA n'intervient qu'aux étapes 5 et 6 (rapport et plan, puis suivi), toujours sur un constat déjà calculé par le moteur.

&#91;embedded content: parcours d'un dirigeant · 6 étapes, 1 boucle\]

Les étapes 1, 2 et 4 reposent sur des contenus écrits à l'avance, l'étape 3 est du code. Quand une action échoue, le suivi renvoie au plan avec une approche différente.

## Construction des questionnaires

On n'écrit plus un questionnaire par secteur : chaque dirigeant reçoit un questionnaire **assemblé automatiquement** à partir d'une banque unique de questions écrites à l'avance. Seul l'assemblage est automatique, donc la règle « jamais de questionnaire généré par l'IA » reste respectée.

### L'assemblage en 5 couches

| Couche | Contenu | Écrite |
| --- | --- | --- |
| 1. Dossier d'inscription | Métier, CA, effectif, ancienneté, zone, ville | Une fois, pour tous les agents |
| 2. Socle de l'agent | Les thèmes universels de l'agent (ex. les 23 de l'agent Acquisition) | Une fois par agent |
| 3. Module catégorie | Ce qui dépend du modèle économique : stock, chantiers, abonnement… | Une fois par catégorie |
| 4. Module métier | Le vraiment spécifique, 5 questions maximum | Une fois par métier |
| 5. Filtre taille | Masque ce qui ne s'applique pas (seul / petite équipe / structure) | Règle automatique |

### La fiche d'une question

- un code (ex. ACQ-CONV-03), l'agent et le thème ;
- le texte, avec ses variables de lexique, et le type de réponse ;
- la nature de notation et les seuils, avec leur statut : sourcé ou à valider ;
- les profils et tailles concernés, et la condition d'affichage (question déclencheuse) ;
- les agents qui partagent la donnée et son niveau : essentiel (audit initial) ou approfondi ;
- une question de repli si le dirigeant ne connaît pas le chiffre.

Dans le classeur, chaque donnée a aussi un **mode** : demandée, importée (sinon demandée), calculée, ou reprise d'un autre agent ; et un champ **« sert à »** : détecter un problème, mesurer une opportunité, comparer à une référence, calculer une perte, un potentiel de CA, repérer une dépendance, comprendre le parcours ou la capacité, identifier un levier, rendre la recommandation mesurable.

### Règles adaptatives

- **Questions déclencheuses** (D01 à D27) : une réponse ouvre ou masque un bloc (détail en Partie 3).
- **Période adaptée à l'ancienneté** : règle détaillée en Partie 3. Pour l'agent Comm, la période se calcule par compte (date d'ouverture de chaque réseau).
- **0, inconnu et non applicable sont distincts.** L'absence de donnée est elle-même un signal de pilotage, présenté sans culpabiliser.
- **Aucune question obligatoire.** Une note d'introduction invite à donner sa meilleure estimation ou une fourchette.

**Traitement des quatre réponses possibles pour un chiffre :**

| Réponse | Ce qu'elle signifie | Ce que fait le moteur | Ce que fait l'IA |
| --- | --- | --- | --- |
| Chiffre exact | La donnée est connue | L'utilise telle quelle | Rien de particulier |
| Estimation ou fourchette | Le dirigeant connaît l'ordre de grandeur | Prend le milieu de la fourchette et le marque « estimé » | Précise que le constat repose sur une estimation |
| « Je ne sais pas » | La donnée existe quelque part (logiciel, comptable, devis), il ne l'a pas en tête | La retire du calcul, propose la question de repli, la laisse complétable plus tard | Peut l'inviter à la retrouver pour affiner le constat |
| « Je ne suis pas cette donnée » | Personne ne la mesure dans l'entreprise | La retire du calcul et l'enregistre comme une absence de suivi | Donne la recommandation classique sur le thème, plus un conseil rapide pour commencer à suivre cette donnée |

Les deux dernières réponses comptent comme « sans réponse » pour la règle des 50 % (voir Règles de robustesse).

**Quand beaucoup de données ne sont pas suivies.** Le moteur compte les réponses « je ne suis pas cette donnée ». Au-delà d'un seuil, il ajoute automatiquement un conseil général de pilotage : mettre en place le suivi de ces données, en les listant. Ce conseil s'ajoute aux autres recommandations sans les remplacer : l'IA continue de donner ses idées sur chaque thème. Seuil retenu : un quart des données essentielles de l'agent marquées « je ne suis pas cette donnée ».

### Économie de données

- Ne jamais demander un ratio que le moteur peut calculer.
- **Jamais deux périodes mélangées dans un calcul.** Le CA est demandé au mois. Le nombre de ventes se demande dans l'unité la plus naturelle pour le métier, fixée dans le lexique : par jour pour un commerce ou un restaurant, par mois pour un artisan ou une entreprise B2B. La question elle-même est écrite avec les mots et l'unité du métier (« Combien de couverts servez-vous par jour ? » pour un restaurant, « Combien de chantiers signez-vous par mois ? » pour un artisan). Avant tout calcul, le moteur le ramène au mois avec les jours d'ouverture (ventes par jour × jours ouverts par semaine × 4,3). Le nombre de ventes compte les achats, pas les articles : 10 000 chaises vendues en 400 commandes font 400 ventes.
- Chaque donnée collectée sert une décision, un calcul ou une recommandation.
- Les données d'un même écran sont posées ensemble, souvent en tableau (un seul tableau des canaux donne demandes, clients, part du CA et dépense par canal).
- Des tranches plutôt qu'un chiffre précis quand elles suffisent (ex. délai de réponse : moins de 5 min, 1 h, 24 h…).

> « La meilleure question est celle qui collecte la donnée la plus utile, au bon moment, auprès du bon type d'entreprise, avec la précision que le dirigeant peut réellement fournir. »

### Règles de rédaction

- Pas de question rhétorique, pas de réponse ni de bénéfice glissés dans la question.
- Langage simple : « comment évolue… » plutôt qu'un terme technique.
- Une question conditionnelle se pose en deux temps (« est-ce élevé ? », puis l'impact seulement si oui), sans suggérer la réponse.

### Après le questionnaire

- **Pas d'écran de récapitulatif** ni de confirmation des chiffres : le dirigeant a déjà passé du temps à répondre.
- **Tour « ce que vous avez déjà tenté »**, posé après le premier calcul, uniquement sur les 5 ou 6 axes réellement faibles :

| Réponse | Ce que l'IA en fait |
| --- | --- |
| Non, rien pour l'instant | Conseil standard |
| Oui, c'est en place et ça fonctionne | Ne rien recommander sur cet axe ou proposer d'amplifier, en reconnaissant le travail fait |
| Oui, mais sans résultat | Une approche différente, jamais la même reformulée |
| Oui, mais je n'ai pas tenu dans la durée | Conseiller sur l'ancrage : rattacher l'action à un moment existant, la simplifier |

Une ligne libre facultative complète : « Qu'avez-vous mis en place ? ». Ces réponses n'entrent jamais dans le calcul et sont conservées dans l'historique du compte.

## Le moteur de diagnostic

Le moteur travaille en deux étages : il donne d'abord une couleur à chaque thème (le **constat**), puis il classe les leviers selon leur poids sur l'objectif du dirigeant (la **priorité**). Ce modèle a été appliqué aux 4 agents dans le classeur du 14 octobre.

### Étage 1 — Le constat

Chaque thème est noté vert, orange ou rouge selon **une seule** nature de notation :

| Nature | Ce qu'elle mesure | Référence | Exemple |
| --- | --- | --- | --- |
| Marché | Le chiffre du dirigeant face à son secteur | Donnée sourcée | Délai contact → rendez-vous en agence |
| Pratique | La bonne pratique existe-t-elle ? | Absente / partielle / en place | Rôles écrits, intégration des nouveaux |
| Cohérence | Les réponses tiennent-elles ensemble ? | Les propres chiffres du dirigeant | Budget concentré sur un canal qui ne rapporte pas |
| Contexte | Non noté | Sert seulement à l'IA | Historique des départs, ambiance perçue |

### Étage 2 — La priorité

- **Impact chiffré** quand le thème est sur une vraie chaîne de calcul vers l'objectif (tunnel commercial, marge). Surtout l'agent Acquisition et une partie de Finance.
- **Impact qualifié** dans les autres cas : le levier est classé **Bloquant**, **Frein** ou **Secondaire** par des règles fixes, sans aucun pourcentage. Exemple de règle : objectif de croissance d'au moins 10 % + dirigeant au-delà d'un seuil d'heures par jour travaillé + aucun relais → « dépendance au dirigeant » = Bloquant.
- Le moteur n'invente jamais un pourcentage d'impact.

**Un bloquant ne bloque jamais l'IA.** Elle donne toutes ses recommandations sur les autres leviers. Le bloquant change l'ordre du plan, pas son contenu.

**Le plan suit le temps réellement disponible du dirigeant.** Les actions qui libèrent du temps passent en premier. Celles qui lui demandent du temps restent dans le plan, programmées pour après (« à lancer une fois 6 h libérées ») ; les actions très légères peuvent démarrer tout de suite. Le dirigeant voit tout son potentiel sans recevoir une liste qu'il ne pourrait pas tenir.

**La charge du dirigeant se lit en heures par jour travaillé**, pas seulement par semaine : 60 h sur 5 jours (12 h par jour) n'est pas la même situation que 60 h sur 6 jours (10 h par jour). Les heures et les jours travaillés du dirigeant sont donc une donnée partagée, posée même sans l'agent RH.

### Règles de seuils

- **La moyenne du marché se place en orange**, le vert est réservé au-dessus du marché. Le plan d'action a ainsi toujours quelque chose à proposer. Seule exception : l'indicateur à deux sens, ci-dessous.
- **Indicateur à deux sens** (mauvais trop bas comme trop haut, ex. taux d'honoraires) : la fourchette du marché est verte, orange à moins d'un point hors fourchette, rouge au-delà.
- **Un indicateur n'est noté que si son résultat dépend surtout de l'entreprise.** S'il dépend surtout du client ou du marché, il passe en Contexte.
- **Préférer l'acquisition maîtrisable au hasard** quand le sens de notation est ambigu : dépendre peu du bouche-à-oreille est noté vert.
- **Seuils segmentés** par zone et par taille quand le volume en dépend, plutôt qu'un seuil universel.
- **Sans source, un seuil reste « à valider »** et sera recalibré au test sur des cas réels.
- **Une hypothèse extérieure** (taux de référence du secteur, part récupérable par une relance) doit être sourcée. Sinon une valeur basse est retenue et le rapport le précise.
- **Indicateur croisé dépense / résultat** plutôt qu'une dépense notée seule : dépense élevée + bon résultat = vert ; dépense élevée + faible résultat = rouge ; faible dépense + bon résultat = vert ; faible dépense + faible résultat = orange (pas de gaspillage, mais pas de croissance).

### Règles de robustesse

- Une question sautée est retirée du calcul. Elle ne vaut jamais zéro.
- Un thème n'est noté que si au moins 50 % de ses questions ont une réponse. Sinon il s'affiche « non évalué ».
- Un thème qui ne s'applique pas à la taille de l'entreprise est masqué, et non affiché « non évalué ». Une petite structure n'est jamais pénalisée faute de matière.

### Croisements et scénarios

Un croisement combine plusieurs réponses pour produire un constat chiffré qu'aucune réponse ne donne seule. Exemple : 40 demandes par mois × 20 % sans réponse = 8 demandes perdues par mois, puis, avec le taux de signature et le panier, le CA perdu sur un an.

- Plus de 50 croisements pour Acquisition, Finance et Comm (colonnes par profil d'entreprise), 31 croisements RH (colonnes par taille), 13 scénarios Finance (« si votre plus gros client part »).
- Chaque ligne donne : le calcul en mots simples, les codes des données utilisées, les profils concernés, l'éventuelle hypothèse extérieure, et la phrase que le rapport peut dire.
- Certains calculs servent de contrôle de cohérence, comme le CA moyen par vente comparé à prix moyen × taux d'honoraires.

## Objectif chiffré et suivi dans le temps

Le chiffre principal de CAXE est **l'avancement vers l'objectif que le dirigeant fixe lui-même au début de chaque audit, agent par agent** (ex. +15 % de CA sur 12 mois pour l'agent Acquisition). Les couleurs par thème restent, pour montrer où sont les leviers.

### L'objectif

- **Un objectif par agent, demandé au début de son audit.** Quand le dirigeant ouvre un agent, la toute première question porte sur l'objectif qu'il veut atteindre avec lui. Il le formule lui-même, mais selon une forme imposée : ce qu'il veut changer, de combien, et en combien de temps. Elle se remplit en trois champs courts : ce que je veux changer (« baisser le turnover »), de combien (5 %), en combien de temps (3 mois), avec un exemple affiché sous la question. Le chiffre et le délai sont utilisés directement. Ce que le dirigeant veut changer est rattaché à un indicateur de l'agent quand c'est possible (le turnover est un indicateur RH) ; sinon, l'objectif est gardé tel quel et l'avancement se mesure par ce que le dirigeant déclare à chaque point d'étape. L'objectif n'est plus demandé à l'inscription.
- Le moteur part des chiffres du client (contacts, taux de transformation, panier) et remonte la chaîne jusqu'à l'objectif. Le calcul s'adapte donc à la taille : +15 % ne représente pas les mêmes ventes pour une agence à 500 k€ et une à 4 M€.
- La comparaison au marché sert à savoir où il reste de la marge : un levier déjà au-dessus du marché rapportera peu.
- Le moteur vérifie si l'objectif est réaliste et le rapport le dit honnêtement s'il ne l'est pas.
- Chaque agent aborde l'objectif sous son propre angle :

| Agent | Sa question |
| --- | --- |
| Acquisition & CA | Quels leviers comblent l'écart ? |
| Finance & Rentabilité | L'objectif est-il rentable et finançable ? |
| RH & Organisation | L'organisation peut-elle porter l'objectif ? |
| Comm & Création de contenu | La présence en ligne génère-t-elle assez de contacts ? |

### Les impacts affichés sont réels

Tout impact chiffré (ex. « +6 % de CA » grâce à la relance des devis) est calculé sur les volumes du client, jamais sur une moyenne générique. Relancer les devis peut rapporter 10 % à qui ne relance jamais et 1 % à qui relance déjà. Les questions de volume nécessaires sont donc posées, pour tous les agents, partout où un chiffre sert à donner une méthode.

**Plusieurs leviers ensemble : on recalcule, on n'additionne jamais.** Le moteur recalcule toute la chaîne d'un coup (demandes → signature → ventes → CA) avec tous les leviers retenus :

- deux leviers sur des étapes différentes se multiplient (plus de demandes et un meilleur taux de signature) ;
- deux leviers sur la même étape se partagent les mêmes clients : on ne récupère pas plus de clients qu'il n'y en a à récupérer ;
- la capacité actuelle de l'entreprise plafonne le gain immédiat, mais ce plafond n'est pas une fin. Si la capacité est limitée par le temps, le rapport montre deux chiffres : le gain possible avec la capacité actuelle, et le gain possible une fois la capacité augmentée. Augmenter la capacité ne se résume jamais à « libérez du temps » : le questionnaire demande comment le dirigeant travaille (où part son temps, ce qu'il fait lui-même), puis l'IA propose des solutions concrètes à partir de ses réponses (tâches à déléguer, à automatiser ou à supprimer, puis recrutement si les heures récupérées ne suffisent pas). Ces premières questions forment le mini-bloc « temps du dirigeant », partagé par tous les agents : chaque agent peut ainsi donner de vraies premières solutions, même sans l'agent RH, qui va plus loin (organisation de l'équipe, seuil de recrutement). Les actions qui augmentent la capacité passent en tête du plan, et l'agent Finance vérifie que le recrutement est rentable.

### Le suivi qui justifie l'abonnement

1. **Audit initial** et plan d'action vivant : le dirigeant marque chaque action faite ou en cours. Durée visée : 1 h à 1 h 15 par agent, soit environ 60 à 80 données essentielles (estimation à vérifier au test) ; le reste est posé aux points d'étape. Le dirigeant choisit l'agent qu'il audite et avance à son rythme. Un audit n'a jamais à être fait d'une traite : les réponses sont sauvegardées en continu, il peut s'arrêter et reprendre plus tard.
2. **Point d'étape** de 5 ou 6 questions ciblées, déclenché à l'échéance propre de chaque action : quelques jours pour une action rapide, une ou plusieurs semaines pour une action longue ou à tester.
3. **Boucle d'ajustement** : si une action n'a pas marché, l'IA propose une autre approche. Les résultats reviennent dans le rapport de l'agent concerné.
4. **Alertes** quand une action stagne.
5. **Ré-audit trimestriel** complet, qui montre la progression.
6. **Classement sectoriel**, qui prend de la valeur avec le nombre d'utilisateurs.
7. **Historique accumulé** (constats, actions, ce qui a tenu chez ce dirigeant) : c'est aussi ce qui rend le départ coûteux.

Ordre de construction convenu : diagnostic + plan d'action d'abord, points d'étape dès les premiers clients payants, alertes quand il y a assez de données, classement et ré-audit trimestriel quand une catégorie compte assez d'utilisateurs.

### Gamification, discrète

Jauges d'avancement par agent, niveaux bronze / argent / or par thème, série de points d'étape tenus, classement sectoriel, actions présentées comme des quêtes avec des points. Pas d'avatar, de son ni d'animation tape-à-l'œil : le produit doit rester crédible pour un dirigeant de PME.

# Partie 2 — Les agents

## Les 4 agents

CAXE compte 4 agents au périmètre strictement délimité pour éviter tout chevauchement. Ils gardent leurs noms fonctionnels, sans prénom ni personnage. Croissance & Stratégie (trop de chevauchement) et Digital & Outils (trop transversal) ont été écartés, et pourront être reconsidérés plus tard. Aucun agent juridique, fiscal ou médical.

### Acquisition & Chiffre d'affaires

**Sa question : quels leviers comblent l'écart à l'objectif ?** 23 thèmes en 5 étapes, pensés pour tous les secteurs (276 données dans le classeur) :

| Étape | Thèmes |
| --- | --- |
| Attirer | Cible, volume de contacts, canaux, prospection active, partenaires, présence en ligne (dont avis clients), budget et coût d'acquisition |
| Convertir | Réactivité, rendez-vous, devis et relances, transformation, durée du cycle de vente |
| Chiffre d'affaires | Prix et honoraires, négociation, panier moyen, répartition du CA |
| Fidéliser | Clients récurrents, recommandation (mesurée sur sa sollicitation active, pas sur sa part dans les ventes), carnet de commandes |
| Piloter | Suivi commercial, productivité, capacité commerciale, saisonnalité |

- **Capacité commerciale** : jours et heures d'ouverture, demandes perdues faute de disponibilité, créneaux vides, demandes reçues les jours fermés. Le CA par jour d'ouverture est calculé (CA mensuel ÷ jours ouverts × 4,3), sans seuil pour l'instant. L'agent peut conseiller d'étudier l'ouverture d'un jour fermé s'il y a de la demande.
- **Reste factuel sur la communication** : fréquence de publication, présence sur les canaux, cohérence budget / résultats. Il ne juge jamais la qualité d'un contenu.
- **Renvois** : contenu → Comm ; marges, coût d'une journée d'ouverture, masse salariale → Finance ; dimensionnement de l'équipe et horaires → RH.
- Quand un signal de communication faible apparaît, le rapport affiche un bouton « voir des propositions de contenu » qui lance l'agent Comm à la demande, sans l'afficher d'office. Ni ce bouton ni le renvoi vers Comm n'apparaissent pour les professions réglementées.

### Finance & Rentabilité

**Sa question : l'objectif est-il rentable et finançable ?** Il mesure la santé de la rentabilité à partir de ratios simples déclarés. Il ne fait jamais d'analyse fiscale ou comptable comme un expert-comptable.

- 45 thèmes, dont un bloc **Stock** de 9 thèmes (valeur, rotation, pertes, ruptures, suivi) affiché seulement aux entreprises qui ont du stock ; 228 données.
- 13 scénarios de simulation calculés depuis les réponses existantes (ex. « si votre plus gros client part »).
- Constats prioritaires de l'audit initial : seuil de rentabilité, mois de sécurité de trésorerie, délais clients et fournisseurs.
- Limite connue : le dirigeant n'a souvent pas les marges par offre ou le besoin en fonds de roulement. D'où les natures Pratique et Cohérence et les réponses « je ne sais pas ».

### RH & Organisation

**Sa question : votre organisation peut-elle porter votre objectif ?** C'est un diagnostic d'organisation. Jamais de droit du travail, de contrats, de licenciements ni de médiation de conflit.

- Verdict calculé en trois niveaux : **Oui** ; **Sous conditions** (des freins) ; **Pas en l'état** (au moins un bloquant). Les leviers suivent, classés.
- 40 thèmes en 8 blocs, 142 données, adaptés à la **taille** de l'entreprise (seul / 2 à 5 / 6 et plus) et non au métier.
- Interruptions, sollicitations et urgences se donnent en tranches, avec « je ne sais pas » : pas de comptage artificiel.
- 31 croisements, dont « où part le temps du dirigeant » et « quand un recrutement devient nécessaire » : on ne recrute qu'après avoir récupéré les heures délégables, automatisables et évitables.
- La progression se lit en bloquants levés et en pratiques mises en place.

### Comm & Création de contenu

**Sa question : la présence en ligne génère-t-elle assez de contacts ?** L'objectif est d'amener de vrais clients, pas des likes. Il n'est pas proposé aux professions réglementées.

- **Son funnel part d'une publication et s'arrête là où commence celui de l'agent Acquisition**, au moment où quelqu'un devient un contact identifié.
- **Deux parcours**, choisis par une question d'entrée (« publiez-vous déjà régulièrement ? ») :
  - **Amélioration** : 54 thèmes en 8 groupes (identité et offre, présence et canaux, de la publication au contact, stratégie de contenu, production, performance, vitrines et relation, qualité et pertinence des publications).
  - **Mise en place** : pour un dirigeant sans présence, un plan de démarrage et les premiers contenus (réseaux où sont ses clients, temps disponible, contacts à solliciter).
- **La qualité des publications est notée sur une grille fixe de 6 critères** : accroche, angle client ou entreprise, bénéfice explicite, preuve, appel à l'action, alignement avec la cible déclarée. Grille vérifiable, pas un jugement de goût.
- **Table des 14 problèmes** (manque de contenu, mauvais contenu, mauvais canal, ciblage, régularité, audience insuffisante, conversion, appel à l'action faible, absence de preuves, suivi, temps mal alloué, budget mal alloué, audience sous-exploitée, réponse trop lente) : pour chacun, les signaux qui le révèlent, ce que l'agent recommande et ce qu'il ne recommande jamais. Il ne conseille jamais de publier plus quand le vrai problème est ailleurs.
- **Ordre de lecture des chiffres** : clients, CA, demandes qualifiées, demandes, clics, engagement, portée, abonnés. Les abonnés et les likes ne sont jamais lus seuls.
- **Données des publications** : les 10 dernières lues automatiquement si le réseau est connecté ; sinon le dirigeant saisit ses 3 meilleures et ses 3 moins bonnes. Le coût par contenu, par demande et par client est calculé, temps compris.
- **Connexion des réseaux en 3 temps** : saisie manuelle de 5 à 10 publications au lancement, Google Business Profile tout de suite, connexion Meta ensuite (validation de l'app par Meta nécessaire). LinkedIn est quasi fermé.
- Il génère aussi des propositions de contenu adaptées au métier : idées, brouillons, calendriers de publication.
- La méthode d'Alex Hormozi sert de grille de lecture interne, sans être citée publiquement.

## Règles entre agents

Les agents se complètent sans se chevaucher : une donnée n'est posée qu'une fois, et chaque agent donne un conseil complet avant tout renvoi.

### Données partagées

| Donnée | Posée par | Reprise par |
| --- | --- | --- |
| CA, effectif | Dossier d'inscription | Tous les agents |
| Masse salariale | Finance | RH |
| Budget marketing et communication | Acquisition | Comm, Finance |
| Nombre d'abonnés | Comm | Finance |
| Demandes, clients et CA par canal (réseaux, site, fiche Google) | Acquisition (tableau des canaux) | Comm |
| Mini-bloc « temps du dirigeant » (4 ou 5 questions) : heures et jours travaillés, répartition du temps (production, administratif, commercial, imprévus), présence d'un relais | Le premier agent qui en a besoin | Tous les agents (premières solutions dans le plan) ; RH l'approfondit |
| Objectif de croissance du CA | Acquisition (début d'audit) | Finance, RH |
| Nombre de ventes et jours d'ouverture par semaine | Le premier agent qui en a besoin | Tous les agents (panier moyen, CA par jour d'ouverture) |

- Si l'agent d'origine n'est pas souscrit, la donnée est posée quand même, comme donnée partagée, et le calcul est fait.
- **Une donnée partagée est enregistrée sur le compte dès qu'elle est posée, quel que soit l'agent.** Si le dirigeant décrit sa journée type dans l'agent Comm, aucun autre agent ne la lui redemande : RH la reprend et ne pose que ses questions d'approfondissement. Le dirigeant peut la modifier lui-même si sa situation change.
- Une donnée partagée a le même niveau (essentiel ou approfondi) chez tous les agents qui l'utilisent.
- Pas de double comptage : par exemple, les commissions de plateformes ne sont pas à la fois dans le budget marketing et dans les coûts variables.

### Renvois vers un autre agent

- Un renvoi est présenté comme un aperçu de ce que l'agent manquant apporterait sur le cas du client, avec un ajout en un clic.

### Abonnement

- Abonnement mensuel par paliers selon le nombre d'agents choisis, sur le modèle de Limova : 2 agents 59,99 € HT, 3 agents 79,99 € HT, 4 agents 109,99 € HT. Il n'existe pas d'offre à 1 agent : l'abonnement commence à 2 agents.
- L'accès aux agents est un droit attaché au compte, prévu dès le départ, même avec un seul agent en service.
- Le palier 3 agents est mis en avant : badge « Recommandé », formule suggérée à l'inscription, essai d'un agent non souscrit. Aucun agent n'est coché d'avance : le dirigeant choisit librement lesquels prendre, pour ne pas l'enfermer dans une combinaison qu'il ne voulait pas.

**Professions réglementées :** 3 agents au maximum, puisque l'agent Comm ne leur est pas proposé.

# Partie 3 — Le profil de l'utilisateur

## Dossier d'inscription

Le dossier d'inscription est rempli une seule fois et sert à tous les agents : il décide des questions posées, des mots employés, des seuils de comparaison et de la base de calcul. Les questions apparaissent une à une, au fur et à mesure : le métier est demandé en premier, puis chaque question suivante s'affiche déjà formulée avec les mots et l'unité de ce métier.

| Champ | Ce qu'il pilote |
| --- | --- |
| Métier précis | Catégorie et profil d'entreprise, donc les modules de questions et le lexique |
| Sous-variante (conditionnelle) | N'apparaît qu'après le choix du métier, et seulement si ce métier regroupe plusieurs activités (ex. agence immobilière, paysagiste, agence web ou com). Un boucher ne la voit jamais. Elle ajoute les blocs de spécialité cochés |
| CA mensuel | Base des indicateurs en % du CA (chiffre déclaré, jamais estimé à partir d'autres réponses) et calcul de l'écart à l'objectif |
| Nombre de collaborateurs | Filtre taille, variante RH, seuils de productivité |
| Ancienneté de l'entreprise | Période des questions ; une entreprise de 2 ans n'a pas le portefeuille ni la recommandation d'une entreprise de 15 ans |
| Type de zone | Urbaine dense / périurbaine / rurale (règle dans « Taille, ancienneté, zone ») |
| Ville | Comparaison au marché local (règle dans « Taille, ancienneté, zone ») |

Le nombre de ventes et les jours d'ouverture ne sont pas demandés à l'inscription, pour la garder courte. Ce sont des données partagées, posées par le premier agent qui en a besoin, comme le temps du dirigeant.

## Secteur d'activité

Le dirigeant choisit son métier exact (« électricien », « boulanger ») ; en coulisse, le système le rattache à une catégorie de modèle économique, puis à l'un des 7 profils d'entreprise qui pilotent les questions, les mots et les calculs. Il ne voit jamais la catégorie.

### Routage métier → catégorie → profil

| Catégorie | Exemples de métiers | Profil retenu | Particularités |
| --- | --- | --- | --- |
| 1. Commerce avec stock physique | Boulanger, boucher, fleuriste, caviste, opticien, pharmacie, magasin de vêtements | Commerce (+ E-commerce s'il vend en ligne) | Bloc Stock de Finance affiché |
| 2. Prestation sur chantier ou projet | Électricien, plombier, maçon, peintre, menuisier, couvreur, paysagiste création | Artisan / chantier | Paysagiste « entretien » → Abonnement |
| 3. Prestation récurrente ou abonnement | Aide à domicile, crèche, nettoyage de locaux, entretien paysager, syndic, conciergerie, éditeur de logiciel en abonnement (SaaS) | Abonnement | SaaS : lexique propre à écrire |
| 4. Transaction de forte valeur, cycle long | Agence immobilière (transaction), agence de voyage, concession automobile, courtier | B2B / cycle long | Immobilier « gestion locative » → Abonnement ; secteur pilote |
| 5. Transport et logistique | Dernier kilomètre, fret, déménagement, VTC / taxi, location de véhicules | B2B / cycle long | + Abonnement si contrats réguliers |
| 6. Professions libérales réglementées | Avocat, notaire, médecin, kiné, expert-comptable, architecte | Selon le métier : Rendez-vous (médecin, kiné), B2B / cycle long (avocat, notaire, architecte), Abonnement (expert-comptable) | Socle seulement, aucun module métier ; pas d'agent Comm ni de conseil publicitaire |
| 7. Rendez-vous non réglementé | Coiffeur, esthéticienne, garage, photographe, coach sportif, auto-école | Rendez-vous | Module métier de 5 questions maximum |
| 8. Restauration | Restaurant, café, food truck, traiteur | Restaurant (+ E-commerce si vente en ligne) | Lexique propre (couverts, services) |
| 9. Commerce en ligne | Boutique en ligne, marque vendue en direct, vendeur sur marketplace | E-commerce | Données locales masquées si l'activité est 100 % en ligne |
| 10. Agences et services aux entreprises | Agence web, agence com, agence marketing, studio de design, ESN, consultant, freelance tech | B2B / cycle long (+ Abonnement si contrats mensuels) | Sous-question : projets ponctuels, contrats mensuels |

- **Agriculture : supprimée du produit**, faute de légitimité terrain.
- **Professions réglementées : socle seulement**, parce que c'est là que le risque de dériver vers du conseil juridique ou médical est le plus fort, et qu'on ne connaît pas assez le fonctionnement interne de ces métiers. Pour la même raison, aucune publicité pour ces métiers, même ceux qui y ont droit sous conditions (avocats, architectes) : l'agent Comm ne leur est pas proposé, et l'agent Acquisition ne leur recommande ni publicité payante, ni démarchage, ni apporteurs d'affaires rémunérés. Les règles des ordres changent souvent ; le sujet sera rouvert plus tard, avec un avocat spécialisé.
- Le secteur est géré par ce routage : les seuils propres à un métier viennent de son module métier, et aucun agent n'y ajoute une seconde grille par secteur.

### Métiers à plusieurs activités

La sous-étape n'apparaît qu'une fois le métier choisi, et seulement pour un métier qui regroupe plusieurs activités. Elle demande alors de préciser, en cases à cocher (plusieurs choix possibles). Métiers concernés à ce jour :

- **Agence immobilière** : transaction, gestion locative, syndic, conciergerie saisonnière.
- **Paysagiste** : création, entretien régulier.
- **Agence de voyage** : clientèle particuliers, clientèle entreprises ou groupes.
- **Agence web, com ou marketing** : projets ponctuels, contrats mensuels.

Une seule case → la variante correspondante. Plusieurs cases → le socle une seule fois, plus le bloc de chaque spécialité, sans doublon. La concession automobile (vente + atelier) reste à un seul modèle pour le lancement.

### Le lexique du métier

Une même question s'affiche avec les mots du métier : une seule question, plusieurs formulations, une seule règle de notation. Le lexique est écrit à l'avance (dans l'immobilier, « contact » devient « contact vendeur »).

| Profil | Demande | Nouveau client | Premier achat | Capacité | Client fidèle |
| --- | --- | --- | --- | --- | --- |
| Rendez-vous | Demande de rendez-vous | Première visite | Prix moyen d'une prestation | Créneaux par semaine | Client qui revient |
| Commerce | Visiteur (entrée en boutique) | Acheteur (ticket de caisse) | Ticket moyen | Heures d'ouverture | Client avec carte de fidélité |
| E-commerce | Visiteur du site | Commande d'un nouveau client | Panier moyen | Commandes expédiables par jour | Client qui commande à nouveau |
| Restaurant | Réservation ou demande | Couvert | Ticket moyen par couvert | Places × services | Habitué |
| Artisan / chantier | Demande de devis | Devis signé | Montant moyen d'un chantier | Heures de chantier disponibles | Client qui redemande |
| B2B / cycle long | Contact entrant (lead) | Contrat signé | Valeur moyenne d'un contrat | Dossiers traitables par mois | Client qui renouvelle |
| Abonnement | Demande d'essai ou d'information | Nouvel abonné | Revenu moyen par abonné | Abonnés gérables | Abonné qui reste |

Le profil décide aussi des questions affichées (une donnée « devis » ne concerne pas un commerce) et des croisements applicables (un croisement sur les devis ne sert pas à un restaurant). Les données locales sont masquées pour une activité 100 % en ligne.

### Ajouter un secteur en 6 étapes

1. **Fiche métier** (une demi-page) : comment un client arrive, ce qui est vendu, la durée du cycle, le vocabulaire.
2. **Routage** : rattacher le métier à une catégorie ; il hérite du socle et du module catégorie.
3. **Lexique** : remplir les variables.
4. **Module métier** : 5 questions maximum, sans question rhétorique ni réponse glissée.
5. **Seuils** : seulement pour les questions de nature Marché, à partir de sources ; sans source, « à valider ».
6. **Contrôle automatique** par un script avant l'envoi à Claude Code : chaque question a un code, une nature et une règle ; aucun doublon avec le socle ; budget de questions respecté ; au moins 2 questions par thème noté ; lexique complet.

Les étapes 1 à 5 se font ensemble, en une session par métier. La validation se fait une fois par métier, jamais par client.

## Taille, ancienneté, zone et conditions

Au-delà du secteur, quatre éléments du profil changent ce que le dirigeant voit et la façon dont il est comparé.

| Élément | Règle |
| --- | --- |
| Taille | Trois variantes : seul, petite équipe (2 à 5), structure (6 et plus). Exemples de thèmes masqués : le management des négociateurs pour un agent seul, le temps libre du dirigeant pour une structure de 30 personnes. L'agent RH se règle sur la taille, pas sur le métier. Les seuils de productivité sont segmentés par taille. |
| Ancienneté | Fixe la période des questions : jamais de donnée antérieure à la création, pas de comparaison à 12 mois pour une entreprise de moins d'un an. |
| Zone | Les seuils de volume sont segmentés. Exemple du pilote, contacts vendeurs par mois : urbaine moins de 8 / 8 à 20 / plus de 20 ; périurbaine moins de 5 / 5 à 15 / plus de 15 ; rurale moins de 3 / 3 à 8 / plus de 8 (à valider). |
| Ville | Utilisée dans le calcul seulement si les sources locales sont solides et concordantes. Sinon, citée dans le texte du rapport sans entrer dans le calcul. |

### Questions déclencheuses

Les questions D01 à D27 ouvrent ou masquent des blocs selon la situation réelle, par exemple :

- l'entreprise a-t-elle du stock ? des salariés ? vend-elle en ligne ? fonctionne-t-elle par abonnement ?
- quels canaux utilise-t-elle vraiment ? (aucune question sur un canal non utilisé) ;
- pour l'agent Comm (D21 à D26) : publiez-vous déjà ; réseaux utilisés et leur date d'ouverture ; site et outil de mesure ; fichier de contacts ; offre d'appel ; accès aux statistiques.

La liste complète et le nombre de questions que chaque déclencheur ouvre ou retire se trouvent dans l'onglet « Déclencheurs » du classeur des 4 agents.

## Secteur pilote : agence immobilière indépendante

L'agence immobilière indépendante, activité transaction, est le pilote de l'agent Acquisition & CA : c'est le secteur où l'expérience terrain est la plus forte. Le questionnaire pilote compte 80 questions en 16 blocs, plus un bloc CA et honoraires de 5 questions ; il sert de référence de seuils pour les questions de nature Marché.

### Structure

- Le parcours acheteur (blocs 8 à 13) reproduit exactement le parcours vendeur : contacts, rendez-vous ou visites, transformation, conclusion, fraîcheur du portefeuille, avec un budget marketing acheteur en miroir du budget vendeur.
- Les blocs contacts vendeurs et acheteurs se terminent par une question sur le canal qui transforme le mieux, pas seulement sur le volume.
- **Contact vendeur** : personne qui a exprimé une intention de vendre et a contacté l'agence, avant tout rendez-vous (les visiteurs anonymes sont exclus). **Contact acheteur** : même logique pour un intérêt d'achat réel.

### Règles propres au pilote

| Sujet | Règle retenue |
| --- | --- |
| Mandats par négociateur | Calculé (total des mandats ÷ nombre de négociateurs), jamais demandé |
| Délai compromis → acte | Contexte, non noté : dépend de la banque et du notaire, plancher légal d'environ 3 mois |
| Passage d'une première à une seconde visite | Contexte : dépend surtout du coup de cœur de l'acheteur |
| Part des mandats venant de la recommandation | Sens inversé : moins de 10 % vert, plus de 25 % rouge (forte dépendance au bouche-à-oreille ; le thème Recommandation de l'agent mesure, lui, si elle est sollicitée activement) |
| Taux d'honoraires | Indicateur à deux sens, par tranche de prix : moins de 100 k€ 7-8 % ; 100-250 k€ 5-6 % ; 250-500 k€ 4-5 % ; plus de 500 k€ 3-4 % (sources divergentes, à valider) |
| Barème dégressif | Oui = vert, non = orange |
| Écart prix affiché / prix vendu | Comparé à la moyenne de la ville (Observatoire Interkab, T1 2026 : Lyon -2,8 %, Paris et Marseille -3,8 %, Strasbourg -8 %, Nantes -12,7 %, France -5,3 %) |
| Budget d'acquisition des mandats | Indicateur croisé : budget à 5 % du CA ou plus, résultat bon à 2 mandats par négociateur et par mois ou plus. Le résultat se mesure en mandats, pas en CA, à cause des 6 à 7 mois entre mandat et acte |
| Canal le plus rentable en CA sur 12 mois | Contexte ; sert de référence pour vérifier que le budget va au bon canal |

- Trois indicateurs calculés, sans seuil pour l'instant : CA moyen par vente, coût d'un mandat signé, CA par euro dépensé en acquisition.
- Les honoraires ne sont pas notés par ville : les sources se contredisent trop (Paris cité entre 5 et 10 %). La tranche de prix capte déjà une partie de l'effet ville.
- Seuils sans source fiable, à valider au test : mandats sans vente, biens en portefeuille depuis plus de 6 mois, taux offre → compromis, nombre de contre-propositions.

# Mise en œuvre

## Règles de développement

Claude Code construit le site ; les questionnaires, seuils et croisements sont construits ici, métier par métier, puis transmis comme des fichiers de données. **Ajouter un métier doit revenir à déposer un fichier de données, sans toucher au moteur.** Si ce n'est pas le cas, l'architecture est à revoir.

### Les trois réflexes donnés à Claude Code

1. Si une demande revient à faire calculer ou juger quelque chose par l'IA, le signaler avant d'exécuter.
2. Si un seuil ou une question manque, ne pas l'inventer : le marquer comme manquant et le signaler.
3. Si une décision engage le produit (pondération, champ d'inscription, périmètre d'un agent), demander avant.

### Exigences de qualité

- Le moteur est couvert par des tests : c'est là qu'une erreur silencieuse fait le plus de dégâts.
- Les réponses du dirigeant sont sauvegardées en continu.
- Le site fonctionne sur mobile : beaucoup de dirigeants répondront au téléphone.
- Focus clavier visible, contrastes lisibles, réduction des animations respectée.

### Règles d'interface

- Vouvoiement, français de France, ton sobre et factuel, sans superlatifs.
- Jamais le mot « fiable » : la fiabilité se démontre par la méthode.
- Agents nommés par leur fonction, sans personnage.
- Un écran vide est une invitation à agir.
- Inscription en une question à la fois : chaque question apparaît au fur et à mesure, déjà adaptée au métier choisi, avec une transition sobre (pas d'effet tape-à-l'œil, réduction des animations respectée).
- Charte : titres en Bricolage Grotesque, texte en Inter, fond navy #07111B, texte beige #F4ECD8, accent tricolore bleu / blanc / rouge. Les dégradés sont réservés aux jauges et barres de progression, pas au formulaire.

## Points encore ouverts

Ces sujets ont été discutés sans être tranchés.

- [ ] **Seuils « à valider »** : à recalibrer par un test manuel sur 5 à 10 cas réels avant automatisation.
- [ ] **Piste RH** : un mini-questionnaire anonyme de 5 questions aux salariés, seule vraie référence extérieure pour cet agent.
- [ ] **Connexion Meta** pour l'agent Comm, après le lancement.
- [ ] **Seuil de charge du dirigeant** (heures par jour travaillé) qui fait passer « dépendance au dirigeant » en Bloquant.
- [ ] **Publicité des professions réglementées** : à rouvrir avec un avocat spécialisé, quand CAXE en aura les moyens.

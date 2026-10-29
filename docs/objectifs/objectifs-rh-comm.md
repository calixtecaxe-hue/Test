# Choix de l'objectif des agents RH et Comm (28 octobre 2026)

Ce document décrit les décisions du propriétaire du 28 octobre et leur application, l'écran livré, les formulations avant et après,
les tests exécutés et ce qui reste. Les textes des objectifs (`data/objectifs-agents.json`) restent **à relire** par le propriétaire.
Documents à télécharger : `CAXE-decisions-objectifs.pdf` (les choix, cochés) et `CAXE-objectifs-proposes.pdf` (les 54 objectifs).

## 1. Décisions du 28 octobre et ce qui en découle

La numérotation est celle du document de décision. Le propriétaire a écrit « 2A, 2B, 2C, 4A, 4B » : ce sont les points 2a, 2b, 2c,
4a et 4b du document.

| Point | Choix | Appliqué |
|---|---|---|
| 1. Un objectif ou plusieurs | **1B** | Un objectif par agent en RH et en Comm. « Ajouter un autre objectif » est retiré ; le serveur refuse un deuxième objectif (« Cet agent suit un seul objectif à la fois. »). |
| 2a. « Relancer les personnes intéressées » | **2a-1** | Mesuré en clients en plus : « obtenir 3 clients de plus en relançant les personnes intéressées ». |
| 2b. Parcours de conversion (Comm) | **Aucune des trois options** : le propriétaire a clarifié le périmètre de l'agent Comm | L'objectif retrouve son intention : « Construire un parcours qui transforme mes visiteurs en clients ». Le périmètre est écrit dans `CLAUDE.md`, section 9 (voir plus bas). |
| 2c. Taux de conversion | **2c-1** | Le dirigeant donne le taux visé : « porter mon taux de conversion à 4 % d'ici 3 mois ». |
| 3. Filtre selon la taille | **Explication demandée**, pas de choix | Le filtre reste en place en attendant (voir section 7). |
| 4a. « Libérer du temps pour piloter l'entreprise » | **4a-1**, formulation concrète | Ajouté. « Combien d'heures par semaine voulez-vous libérer ? » → « libérer 5 heures par semaine pour piloter l'entreprise d'ici 3 mois ». |
| 4b. « Me faire aider » | **4b-1**, même clarté | Ajouté : « Me faire aider dans mon travail », précisé par « Par un salarié, un apprenti, un freelance ou un associé. » ; sans chiffre. Proposé au seul dirigeant seul. |
| 5. Plafond et liste entière | « Appliquer la recommandation » | La recommandation ne fixait pas de nombre. Avec 1B, le plafond est d'un objectif (option 5C) : c'est la conséquence du point 1, signalée comme telle. La liste entière est gardée et clarifiée. |
| 6. Partie Comm et parcours du questionnaire | **6C** | Les deux restent séparés ; un écart est expliqué au dirigeant, sans rien bloquer. |

**Périmètre de l'agent Comm (point 2b).** L'agent Comm conseille sur l'acquisition de clients obtenue grâce à la communication :
canaux et contenus, parcours de conversion lié à la communication, dispositifs à mettre en place, amélioration de l'existant.
L'agent Acquisition garde les processus internes (réactivité, rendez-vous, devis et relances commerciales, transformation, prix,
fidélisation). Les objectifs relus avec cette clarification :

- « Construire un parcours qui transforme mes visiteurs en clients » (au lieu de « Guider les visiteurs jusqu'à me contacter ») ; deux
  thèmes ajoutés : COM-60 « Arriver au bon endroit » et COM-61 « Relancer les intéressés » ;
- « Améliorer mon taux de conversion » : « Sur 100 visiteurs de votre site ou de vos profils, combien vous contactent ou achètent. »
  (au lieu de « … qui deviennent des demandes ») ;
- « Augmenter les demandes venues des réseaux et d'internet » : les commandes en font partie ;
- « Récupérer plus de contacts avec mon offre gratuite » et « Mettre en place le suivi de mes chiffres » : la réussite parle des
  clients, pas seulement des contacts.

Le document de règles du 15 octobre dit encore que le funnel de l'agent Comm « s'arrête […] au moment où quelqu'un devient un contact
identifié ». La correction est listée dans `CLAUDE.md`, section 15 (« À fournir »). Les données du classeur suivaient déjà la
clarification : demandes et clients venus de la communication (COM-22.02), contacts devenus clients (COM-21.06), personnes relancées
devenues clientes (COM-61.02).

**Coordination Acquisition et Comm** (`CLAUDE.md`, section 9) : une donnée commune est posée une fois ; chaque agent parle de ses
leviers (relancer les personnes qui ont réagi ou écrit sans demander de devis relève de la Comm, COM-61 ; relancer un devis envoyé
relève de l'Acquisition, ACQ-10) ; les deux rapports lisent les mêmes chiffres du moteur. Ces règles sont à écrire dans les prompts
des agents, qui ne sont pas encore branchés.

## 2. L'écran livré

**D'abord deux choix de même importance.** Sous « Quel objectif souhaitez-vous atteindre ? » et « Choisissez un objectif proposé ou
écrivez le vôtre. Toute l'analyse part de là. » :

- « Choisir un objectif proposé » — « Parcourez les suggestions adaptées à cet agent. » ;
- « Écrire mon propre objectif » — « Décrivez le résultat que vous souhaitez obtenir. ».

Les deux cartes ont la même taille, le même style et le même titre. Elles sont côte à côte sur ordinateur et l'une sous l'autre sur
téléphone. Aucune n'est choisie d'avance. Aucun formulaire ne s'affiche avant le choix. L'objectif personnel n'est plus une carte
« Définir mon propre objectif » en fin de liste.

**Le mode choisi s'ouvre dessous.**

- « Choisir un objectif proposé » : en Comm, « Où en êtes-vous ? » d'abord (« Améliorer ce que j'ai déjà » ou « Mettre en place ma
  présence en ligne ») ; puis les propositions de la partie (RH : toutes celles qui conviennent à la taille de l'entreprise). La
  proposition choisie s'ouvre sur ses champs : son chiffre, avec sa question et, s'il y a lieu, le choix de l'unité, ou « Comment
  saurez-vous que c'est atteint ? » ; puis le délai en mois.
- « Écrire mon propre objectif » : directement le champ « Votre objectif », avec l'aide et l'exemple de l'agent, puis la réussite (ou
  un chiffre avec « J'ai un chiffre ») et le délai.
- Sous les champs, la phrase qui sera enregistrée s'écrit au fur et à mesure (« Votre objectif : … »).

**Sélection visible et clavier.** L'état choisi se lit sans la couleur : coche, mot « Choisi », bordure gauche épaisse. Au clavier,
Tab atteint le premier choix sans rien choisir ; Espace choisit ; les flèches passent d'un choix à l'autre sans que le curseur saute
ailleurs ; Tab mène ensuite au contenu ouvert. À la souris, le curseur se place dans le contenu qui vient de s'ouvrir.

**Messages quand il manque quelque chose** (le curseur va sur ce qui manque) :

- rien de choisi : « Choisissez un objectif proposé, ou écrivez votre propre objectif. » ;
- Comm, objectif proposé sans partie : « Choisissez d'abord où vous en êtes : les objectifs proposés s'afficheront ensuite. » ;
- aucune proposition choisie : « Choisissez un des objectifs proposés, ou écrivez votre propre objectif. » ;
- texte vide ou fait d'espaces : « Décrivez votre objectif en quelques mots pour continuer. » ;
- chiffre, réussite ou délai manquant : un message sous le champ concerné.

**Écart Comm (6C).** Le parcours du questionnaire suit la réponse à « Publiez-vous pour votre entreprise sur les réseaux sociaux ? »
(COM-10.07). Quand elle correspond à l'autre partie que celle de l'objectif, un message l'explique, par exemple : « Votre objectif est
dans la partie « Mettre en place ma présence en ligne ». Votre questionnaire, lui, suit votre réponse à « Publiez-vous pour votre
entreprise sur les réseaux sociaux ? » (« Oui, au moins une fois par mois ») : il vous pose les questions de la partie « Améliorer ce
que j'ai déjà ». Rien n'est bloqué : vous pouvez garder cet objectif ou le changer. » Il s'affiche sous l'objectif en cours, sous la question COM-10.07 et
à l'étape Objectif. La correspondance (« Oui, au moins une fois par mois » → « Améliorer… » ; « Rarement ou plus du tout » et « Non,
jamais » → « Mettre en place… ») reprend les règles d'affichage existantes du questionnaire ; elle est écrite dans
`data/objectifs-agents.json` (« parcours ») et reste à confirmer par le propriétaire.

**Ce qui est proposé selon la taille** (point 3, en attente) : un dirigeant seul ne voit pas « Réduire les départs de salariés »,
« Réduire les absences dans l'équipe » ni « Alléger la charge de travail de l'équipe » ; « Me faire aider dans mon travail » n'est
proposé qu'à lui. Aucun objectif Comm ne dépend de la taille.

## 3. Sauvegarde, restitution et transmission

- **Un seul mode est transmis.** Le brouillon de l'autre mode reste dans la page : en revenant à « Écrire mon propre objectif », le
  texte écrit est retrouvé ; en revenant à « Choisir un objectif proposé », la proposition et son chiffre aussi.
- **Une proposition prend toujours le texte de la liste**, quel que soit le texte reçu par le serveur. **Un objectif personnel garde
  le texte du dirigeant**, aux espaces de début et de fin près, même s'il ressemble à une proposition : jamais de remplacement
  silencieux.
- **L'origine est enregistrée** (`proposition` ou `personnel`) ; un objectif personnel ne porte plus de partie Comm.
- **Un nouvel enregistrement remplace l'objectif en cours**, qui passe en historique (« Remplacé »). « Garder l'objectif actuel »
  revient à l'audit sans rien changer.
- L'objectif est retrouvé après actualisation, après déconnexion et reconnexion, et en revenant à l'étape Objectif, où le formulaire
  se rouvre sur le bon mode avec ses réponses.
- Le compte rendu (onglet Objectif) reprend l'objectif en cours. `objectifTransmis` donne aux étapes suivantes : origine, phrase,
  texte, proposition, mesure, délai, échéance, indicateur et thèmes liés.
- **Pas encore branché** : l'analyse de l'IA (aucun prompt n'est branché ; le compte rendu dit « pas encore » au lieu d'un chiffre) et
  l'avancement déclaré aux points d'étape (0 %).
- Un compte enregistré avant le 28 octobre avec plusieurs objectifs les garde affichés jusqu'à son prochain changement d'objectif ;
  seuls des comptes de test sont dans ce cas.

## 4. Les 54 objectifs : avant et après (28 octobre, après les décisions)

**Règles d'écriture appliquées à toute la liste.**

- Les 52 objectifs gardent leur identifiant et leur intention ; deux sont ajoutés (4a-1, 4b-1).
- **Chaque objectif chiffré a sa question et sa phrase finale écrites à l'avance**, pour chaque unité proposée. Le chiffre vient
  toujours de la saisie ; aucun n'est suggéré. Les phrases ne s'écrivent plus « titre de N », qui ne disait pas de quoi (« augmenter
  les visites de mon profil de 300 »).
- **« par mois »** quand le chiffre est un flux (visites, clics, messages, demandes, appels) ; **« d'ici N mois »** quand il s'agit
  d'atteindre un niveau ; **« sur les N prochains mois »** quand il s'agit d'un nombre à cumuler sur la période (avis, recrutements,
  départs, contacts récupérés, clients obtenus par la relance).
- **Sans chiffre** : « titre, d'ici N mois » (avec une virgule : « pouvoir m'absenter sans que l'activité s'arrête, d'ici 6 mois »
  pouvait se lire comme si l'activité s'arrêtait dans 6 mois). La réussite reste à part.
- Le nom de l'unité est dit quand « en nombre » ne suffit pas (« en nombre d'abonnés », « en heures par semaine »).
- Une précision est ajoutée quand le titre ne dit pas ce qui est compté ; aucun chiffre n'est imposé à un objectif qui ne s'y prête
  pas.

**RH & Organisation (11)** — phrases données pour 5 et le délai d'exemple.

| Objectif | Avant | Après |
|---|---|---|
| Réduire les départs de salariés | Sans précision ; « réduire les départs de salariés de 5 sur les 3 prochains mois » | Précision « Les salariés qui quittent l'entreprise, quelle qu'en soit la raison. » ; question « De combien voulez-vous réduire les départs ? » ; « réduire de 5 le nombre de départs de salariés sur les 12 prochains mois » ou « réduire de 5 % les départs de salariés… » ; délai d'exemple 12 mois (des départs se comptent sur l'année) |
| Réduire les absences dans l'équipe | « réduire les absences dans l'équipe de 5 % sur les 6 prochains mois » | « Les jours d'absence de vos salariés, hors congés. » ; « réduire de 5 % les jours d'absence de l'équipe sur les 6 prochains mois » |
| Recruter et intégrer de nouvelles personnes | « Combien de personnes ? » | « De l'annonce jusqu'au moment où la personne travaille seule. » ; « Combien de personnes voulez-vous recruter ? » |
| Clarifier qui fait quoi | « … en 3 mois » | « clarifier qui fait quoi, d'ici 3 mois » |
| Confier des tâches sans devoir les reprendre | Sans précision | « Les tâches confiées sont faites jusqu'au bout, sans que vous ayez à les refaire. » ; réussite « je n'ai plus à refaire ni à corriger les tâches que je confie » |
| Alléger la charge de travail de l'équipe | Sans précision | « Moins d'heures faites au-delà des horaires prévus. » |
| Mieux faire circuler l'information | Sans précision | « Dossiers clients, accès, consignes et décisions prises en réunion. » |
| Développer les compétences de l'équipe | Sans précision | « Former l'équipe aux savoir-faire qui manquent ou qu'une seule personne maîtrise. » |
| Pouvoir m'absenter sans que l'activité s'arrête | « … s'arrête en 6 mois » (ambigu) | « Vos clients sont servis et l'équipe avance pendant votre absence. » ; « …, d'ici 6 mois » |
| **Libérer du temps pour piloter l'entreprise** (nouveau, 4a-1) | Proposé : « Des heures rendues au développement, aux clients ou à l'équipe. » (jugé trop abstrait) | « Des heures que vous ne passez plus sur des tâches qu'une autre personne ou un outil pourrait faire. » ; « Combien d'heures par semaine voulez-vous libérer ? » ; « libérer 5 heures par semaine pour piloter l'entreprise d'ici 3 mois » ; réussite d'exemple « je bloque ces heures dans mon agenda chaque semaine pour piloter l'entreprise » |
| **Me faire aider dans mon travail** (nouveau, 4b-1) | Proposé : « Me faire aider » | « Par un salarié, un apprenti, un freelance ou un associé. » ; sans chiffre ; « me faire aider dans mon travail, d'ici 6 mois » ; réussite d'exemple « une personne prend en charge chaque semaine des tâches que je faisais seul » ; dirigeant seul seulement |

**Comm & Création de contenu · Améliorer ce que j'ai déjà (22)**

| Objectif | Avant | Après |
|---|---|---|
| Augmenter mon nombre d'abonnés | « augmenter mon nombre d'abonnés de 200 sur… » | « Sur vos réseaux sociaux. » ; « gagner 200 abonnés d'ici 6 mois » ou « augmenter de 20 % mon nombre d'abonnés d'ici 6 mois » |
| Augmenter la portée de mes publications | « augmenter la portée de mes publications de 20 % » | « augmenter de 20 % le nombre de personnes qui voient chaque publication d'ici 3 mois » |
| Augmenter les réactions à mes publications | « … de 20 % sur… » | « augmenter de 20 % les réactions à mes publications d'ici 3 mois » |
| Augmenter les visites de mon profil | « … de 300 sur… » (300 au total ou par mois ?) | « Les personnes qui ouvrent votre profil sur vos réseaux, chaque mois. » ; « obtenir 300 visites de plus par mois sur mon profil d'ici 3 mois » |
| Augmenter les clics vers mon site ou ma prise de rendez-vous | « … de 50 sur… » | « obtenir 50 clics de plus par mois vers mon site ou ma prise de rendez-vous d'ici 3 mois » |
| Augmenter les messages de clients potentiels | « … de 10 sur… » | « recevoir 10 messages de clients potentiels de plus par mois d'ici 3 mois » |
| Augmenter les demandes venues des réseaux et d'internet | Sans précision | « Demandes de devis, de rendez-vous ou commandes venues de vos réseaux, de votre site ou de votre fiche Google, chaque mois. » ; « recevoir 10 demandes de plus par mois venues des réseaux et d'internet d'ici 6 mois » |
| Améliorer mon taux de conversion | « … qui deviennent des demandes » ; « porter mon taux de conversion à 4 % sur les 3 prochains mois » | « Sur 100 visiteurs de votre site ou de vos profils, combien vous contactent ou achètent. » ; « porter mon taux de conversion à 4 % d'ici 3 mois » |
| Récupérer plus de contacts avec mon offre gratuite | « Combien de nouveaux contacts ? » ; réussite sur les contacts | « Les coordonnées laissées en échange d'un guide, d'un diagnostic ou d'un essai gratuit. » ; « Combien de nouveaux contacts voulez-vous récupérer ? » ; réussite « … des contacts qui deviennent clients » |
| Relancer les personnes intéressées | « Combien de clients en plus ? » | « Combien de clients de plus voulez-vous obtenir ? » (2a-1) |
| Augmenter les visites de mon site | « … de 500 sur… » | « obtenir 500 visites de plus par mois sur mon site d'ici 6 mois » |
| Mieux apparaître sur Google quand on cherche mon métier | Sans précision | « Dans les résultats de recherche, sans publicité. » |
| Augmenter les appels et itinéraires depuis ma fiche Google | « … de 20 sur… » | « obtenir 20 appels et itinéraires de plus par mois depuis ma fiche Google d'ici 3 mois » |
| Réduire le coût de chaque demande venue de mes annonces Google | « … de 5 € sur… » | « Votre budget d'annonces divisé par le nombre de demandes qu'elles vous apportent. » ; « réduire de 5 € le coût de chaque demande venue de mes annonces Google d'ici 3 mois » |
| Obtenir plus d'avis clients | « Combien de nouveaux avis ? » | « Sur votre fiche Google ou sur la plateforme d'avis de votre métier. » ; « Combien de nouveaux avis voulez-vous obtenir ? » |
| Améliorer ma note sur Google | Sans précision | « La note moyenne de vos avis, sur 5. » |
| Être recommandé par des partenaires | « Par combien de partenaires ? » | « Par combien de partenaires voulez-vous être recommandé ? » ; « être recommandé par 3 partenaires d'ici 6 mois » |
| Publier davantage les contenus qui m'apportent des demandes | Sans précision | « Repérer ce qui vous amène des demandes et des clients, et en faire plus. » |
| Rendre mes publications plus convaincantes | Sans précision | « Accroche, bénéfice pour le client, preuve et action à faire. » |
| Réduire le coût de mes demandes | Titre ambigu | « Réduire le coût de chaque demande » ; « réduire de 5 € le coût de chaque demande obtenue par ma communication d'ici 6 mois » |
| Réduire le temps passé sur ma communication | En % seulement | En % ou en heures par semaine : « passer 3 heures de moins par semaine sur ma communication d'ici 3 mois » |
| Écrire régulièrement à mes contacts | « … en 3 mois » | « …, d'ici 3 mois » |

**Comm & Création de contenu · Mettre en place ma présence en ligne (21)**

| Objectif | Avant | Après |
|---|---|---|
| Guider les visiteurs jusqu'à me contacter | Le parcours s'arrêtait au contact | **« Construire un parcours qui transforme mes visiteurs en clients »** — « Le chemin prévu de vos publications et de votre site jusqu'à l'achat : message, appel, rendez-vous ou commande, puis relance. » ; réussite « chaque publication mène à un moyen simple de me contacter ou d'acheter, et je sais combien de visiteurs deviennent clients » (2b) |
| Définir précisément à qui je m'adresse | Sans précision | « Le client que vous voulez attirer : qui il est et ce qu'il cherche. » |
| Rassembler mes preuves | « Avis, réalisations, chiffres. » | « Avis, photos de réalisations, chiffres qui montrent votre sérieux. » |
| Choisir le réseau adapté à mes clients | Sans précision | « Celui où vos clients passent du temps. » |
| Obtenir mes premiers avis clients | « Combien d'avis visez-vous ? » ; « … sur les 3 prochains mois » | « Combien de premiers avis visez-vous ? » ; « obtenir mes 5 premiers avis clients d'ici 3 mois » |
| Publier mes premiers contenus | « Combien de contenus ? » | « Combien de contenus voulez-vous publier ? » ; « publier mes 12 premiers contenus d'ici 3 mois » |
| Créer une offre gratuite pour récupérer des contacts | « Un guide, un diagnostic ou un essai. » | « …, en échange des coordonnées. » |
| Constituer mon fichier de contacts | « Combien de contacts ? » | « Les clients et futurs clients à qui vous pouvez écrire, avec leur accord. » ; « Combien de contacts voulez-vous réunir ? » ; « réunir 100 contacts dans mon fichier d'ici 6 mois » |
| Mettre en place le suivi de mes chiffres | Sans précision ; réussite sans les clients | « Vues, clics, demandes et clients venus de votre communication. » ; réussite « … mes demandes et mes clients » |
| Trouver qui s'occupera de ma communication | Sans précision | « Vous, un salarié, un freelance ou une agence. » |

Les autres objectifs de cette partie (promesse, identité visuelle, comptes, profil, site, fiche Google, sujets, calendrier,
régularité, photos et vidéos, positionnement) ne changent que par la forme de la phrase sans chiffre (« …, d'ici N mois »).

## 5. Tests exécutés (28 et 29 octobre)

Sur l'application construite, la base réelle et des comptes fictifs :

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit`, `npm run lint` | Sans erreur |
| `npm test` | 376 tests, 0 échec |
| `npm run donnees:controle` | Aucune erreur |
| `node scripts/verification/objectifs.mjs` | **68 contrôles, 68 conformes** |
| `node scripts/controle-boutons-pages.mjs` (quatre agents) | 154 vérifications, 0 échec |
| `node scripts/controle-autre.mjs` | 158 vérifications, 0 échec |
| `node scripts/audit-client.mjs` | 38 contrôles, 37 conformes ; seul écart R-01, déjà connu (compte rendu en conception) ; A-02 (clavier) conforme sur le nouvel écran |

**Ce que vérifie `objectifs.mjs`**, pour RH et pour Comm :

- l'écran : les deux choix et leurs aides, aucune présélection, ni « Autre » ni « Ajouter un autre objectif », même taille côte à
  côte sur ordinateur ;
- rien de choisi : le message, et le curseur sur les deux choix ;
- le mode « proposé » : en Comm, la partie demandée d'abord ; les propositions pertinentes ; la carte choisie et sa question ; la
  phrase finale tirée de la saisie ;
- le mode « personnel » : le champ ouvert directement, avec son aide et son exemple ; le curseur placé à la souris ;
- le changement de mode : chaque brouillon retrouvé ;
- une saisie vide ou faite d'espaces, refusée ;
- l'enregistrement : origine, texte intact, rien du mode inactif transmis ;
- la reprise : après actualisation, après reconnexion, et au retour à l'étape Objectif ;
- une modification abandonnée (« Garder l'objectif actuel »), puis le bouton Retour du navigateur ;
- une modification enregistrée, l'ancien objectif passant en historique ; le compte rendu.

**Cas particuliers** :

- le serveur refuse deux objectifs et impose le texte de la liste ;
- les phrases d'un nombre visé, d'un taux visé et d'une seule unité ;
- le clavier : Tab, Espace, flèches, Tab vers le contenu, retour aux propositions ;
- l'écart Comm (6C) : sous l'objectif, sous COM-10.07 et à l'étape Objectif ; aucun message quand réponse et partie concordent ;
- le dirigeant seul ;
- les téléphones de 360 et 390 px : choix empilés, pas de défilement horizontal, bouton visible, champ lisible.

**Corrigés en cours de route** :

- le premier contrôle du tableau de bord attendait une étiquette « Votre objectif » par agent. Chaque agent est testé sur un compte
  neuf : seul le dernier agent a un objectif sur le compte contrôlé. Le contrôle attend maintenant exactement une étiquette, et
  aucune liste « Vos N objectifs » ;
- sur ordinateur, la pastille « Choisi » faisait passer le titre de la carte choisie sur deux lignes : sa place est désormais
  réservée sur les deux cartes ;
- le message d'écart Comm dit « la partie « … » ».

**Série complète du 28 octobre** (`bash scripts/verification/tout.sh`, lancée avant ce travail) : tout à code 0, sauf R-01.

**Captures** (`docs/objectifs/captures/`) :

| Écran | Ordinateur | Téléphone |
|---|---|---|
| Les deux choix | `rh-ordinateur-1-deux-choix`, `com-ordinateur-1-deux-choix` | `rh-telephone-1-deux-choix` (360 px), `com-telephone-1-deux-choix` (390 px) |
| Mode « proposé » ouvert | `-2-mode-propose` | `-2-mode-propose` |
| Proposition choisie | `-2b-proposition-choisie` | `-2b-proposition-choisie` |
| Mode « personnel » ouvert | `-3-mode-personnel` | `-3-mode-personnel` |
| Écart Comm (6C) | `com-ordinateur-4-ecart-partie` | — |

## 6. Limites

- L'aperçu publié de l'application (« Mes agents — CAXE ») a été régénéré le 29 octobre avec le nouvel écran ; il applique le
  filtre selon la taille du compte de démonstration (4 personnes) et ne montre pas l'écart Comm (6C), faute de vraie base.
- Sur téléphone, l'étape « Questionnaire » de l'en-tête de l'agent se coupe en « Questionnair / e » à 360 px (défaut antérieur,
  non traité ici).

## Annexe : première relecture (28 octobre, matin)

**Recensement.** 52 objectifs, organisés comme dans `data/objectifs-agents.json` :

- RH & Organisation : 9 ;
- Comm & Création de contenu : 43, en deux parties de 22 et 21. « Communication » et « Création de contenu » forment un seul agent dans
  le projet.

Chacun a été relu sur six points : compréhension, utilité, cohérence avec l'agent, doublon, précision du résultat, transmission.

**Ce qui n'allait pas.**

1. **Phrases fausses une fois enregistrées.** Huit objectifs dont le chiffre est un nombre visé donnaient une phrase incorrecte, par
   exemple « recruter et intégrer de nouvelles personnes de 2 sur les 6 prochains mois » ou « obtenir plus d'avis clients de 15… ».
   Cette phrase est celle qui s'affiche et part en historique.
2. **Termes techniques ou vagues** : turnover, audience, engagement, « faire travailler mon fichier », « ce qui marche le mieux »,
   « déléguer davantage ».
3. **Pourcentage ambigu sur un taux.** « Augmenter mon taux de conversion de 5 % » ne disait pas s'il s'agit de 5 points ou de 5 %
   du taux actuel.
4. **Chiffres suggérés.** Chaque objectif chiffré affichait un chiffre en exemple (« Ex. : 20 »), qui pouvait se lire comme une cible
   conseillée.
5. **Titres trop longs** (11 à 12 mots) pour une carte.
6. **Unité libre pour tout objectif.** % / € / nombre étaient proposés même là où l'euro n'a pas de sens, par exemple pour les
   absences.
7. **Transmission.** Pour dix objectifs de « Mettre en place ma présence en ligne », le premier thème rattaché, qui sert
   d'indicateur, n'est jamais posé dans le parcours « mise en place ». Il était affiché comme « Indicateur suivi » sans pouvoir l'être.
   - Pour neuf d'entre eux, un thème posé dans ce parcours passe en premier, par exemple COM-56 « Démarrage » ou COM-58 « Le chemin
     prévu ».
   - Le dixième, « Mettre en place le suivi de mes chiffres », n'a aucun thème posé dans ce parcours : il garde COM-43.
   - Un objectif décrit (sans chiffre) affiche désormais « Thème lié » plutôt que « Indicateur suivi ».
8. **Périmètre.** « Construire un parcours qui transforme les visiteurs en clients » sortait du périmètre de l'agent Comm, qui
   s'arrête au contact.
9. **Profils non concernés.** Les objectifs d'équipe étaient proposés à un dirigeant seul.

**Aucun doublon strict.** Trois paires voisines restent distinctes et sont gardées :

- « Obtenir plus d'avis clients » et « Obtenir mes premiers avis clients » : deux parties différentes ;
- « Préparer un calendrier » et « Publier régulièrement » : un outil et une habitude ;
- « Réduire le coût de chaque demande venue de mes annonces Google » et « Réduire le coût de mes demandes » : un canal et l'ensemble.

**Avant et après (matin).** Les identifiants sont gardés : les objectifs déjà enregistrés restent reliés.

**RH & Organisation**

| Avant | Après | Mesure | Pourquoi |
|---|---|---|---|
| Baisser le turnover | Réduire les départs de salariés | Chiffre (% ou nombre) | « Turnover » est un mot technique et anglais. Le chiffre peut se donner en % ou en nombre de départs. |
| Réduire les absences | Réduire les absences dans l'équipe | Chiffre (%) | Précise de qui il s'agit (l'équipe, pas le dirigeant). |
| Recruter et intégrer de nouvelles personnes | Recruter et intégrer de nouvelles personnes | Nombre visé : « recruter et intégrer {n} nouvelles personnes » | La phrase enregistrée était fausse (« recruter et intégrer de nouvelles personnes de 2 sur… ») : elle devient « recruter et intégrer 2 nouvelles personnes ». |
| Clarifier les rôles et les responsabilités | Clarifier qui fait quoi — *Les missions et les responsabilités de chacun.* | Description | Plus court et concret ; la précision garde « missions et responsabilités ». |
| Déléguer davantage | Confier des tâches sans devoir les reprendre | Description | « Déléguer davantage » menait au conseil générique « déléguez » ; le titre dit le résultat recherché, déjà écrit dans l'exemple de réussite. |
| Alléger la charge de l'équipe | Alléger la charge de travail de l'équipe | Description | Précise qu'il s'agit de la charge de travail. |
| Mieux faire circuler l'information | Mieux faire circuler l'information | Description | Inchangé. |
| Développer les compétences de l'équipe | Développer les compétences de l'équipe | Description | Inchangé. |
| Pouvoir m'absenter sans que l'activité s'arrête | Pouvoir m'absenter sans que l'activité s'arrête | Description | Inchangé. |

**Comm & Création de contenu · Améliorer ce que j'ai déjà**

| Avant | Après | Mesure | Pourquoi |
|---|---|---|---|
| Augmenter mon audience | Augmenter mon nombre d'abonnés | Chiffre (% ou nombre) | « Audience » est vague : il s'agit des abonnés (thème COM-37). Le chiffre peut se donner en % ou en nombre. |
| Toucher plus de personnes avec chaque publication | Augmenter la portée de mes publications — *Le nombre de personnes qui voient chaque publication.* | Chiffre (%) | « Portée » expliquée en une ligne ; le titre se lit avec « de 20 % ». |
| Améliorer l'engagement sur mes publications | Augmenter les réactions à mes publications — *J'aime, commentaires, partages et enregistrements.* | Chiffre (%) | « Engagement » est un terme technique : « réactions », expliqué. |
| Augmenter les visites de mon profil | Augmenter les visites de mon profil | Chiffre (% ou nombre) | Le chiffre peut se donner en % ou en nombre. |
| Obtenir plus de clics vers mon site ou ma prise de rendez-vous | Augmenter les clics vers mon site ou ma prise de rendez-vous | Chiffre (% ou nombre) | Se lit avec « de N » (« augmenter les clics… de 15 % ») ; % ou nombre. |
| Recevoir plus de messages privés de clients potentiels | Augmenter les messages de clients potentiels — *Les messages privés reçus sur vos réseaux.* | Chiffre (% ou nombre) | Plus court ; la précision dit qu'il s'agit des messages privés. |
| Augmenter les demandes venues des réseaux et d'internet | Augmenter les demandes venues des réseaux et d'internet | Chiffre (% ou nombre) | Le chiffre peut se donner en % ou en nombre. |
| Augmenter mon taux de conversion | Améliorer mon taux de conversion — *La part des visites de vos profils ou de votre site qui deviennent des demandes.* | Nombre visé : « porter mon taux de conversion à {n} % » | « +5 % » sur un taux était ambigu (points ou pourcentage) : le chiffre devient le taux visé (« porter mon taux de conversion à 4 % »), et la précision dit ce qui est converti, d'après les thèmes rattachés (visites → demandes). |
| Récupérer plus de contacts grâce à une offre gratuite | Récupérer plus de contacts avec mon offre gratuite | Nombre visé : « récupérer {n} nouveaux contacts avec mon offre gratuite » | Phrase fausse avec un nombre (« … de 30 ») : « récupérer 30 nouveaux contacts avec mon offre gratuite ». |
| Transformer plus de personnes intéressées en clients en les relançant | Relancer les personnes intéressées — *Celles qui réagissent ou vous écrivent sans devenir clientes.* | Nombre visé : « obtenir {n} clients de plus en relançant les personnes intéressées » | Titre de 12 mots ; « de 10 % » ne disait pas de quoi. Le chiffre devient un nombre de clients en plus (« obtenir 3 clients de plus en relançant les personnes intéressées »). Changement d'unité : à valider. |
| Augmenter les visites de mon site internet | Augmenter les visites de mon site | Chiffre (% ou nombre) | Plus court ; % ou nombre. |
| Mieux apparaître sur Google quand on cherche mon métier | Mieux apparaître sur Google quand on cherche mon métier | Description | Inchangé. |
| Obtenir plus d'appels et d'itinéraires depuis ma fiche Google | Augmenter les appels et itinéraires depuis ma fiche Google | Chiffre (% ou nombre) | Se lit avec « de N » ; % ou nombre. |
| Réduire le coût de chaque demande venue de mes annonces Google | Réduire le coût de chaque demande venue de mes annonces Google | Chiffre (% ou €) | Le chiffre peut se donner en % ou en euros. |
| Obtenir plus d'avis clients | Obtenir plus d'avis clients | Nombre visé : « obtenir {n} nouveaux avis clients » | Phrase fausse avec un nombre : « obtenir 15 nouveaux avis clients ». |
| Améliorer ma note moyenne sur Google | Améliorer ma note sur Google | Description | Plus court. |
| Faire travailler mon fichier de contacts par e-mail ou SMS | Écrire régulièrement à mes contacts — *Par e-mail ou par SMS, à vos clients et à vos prospects.* | Description | « Faire travailler mon fichier » est du jargon ; le titre dit l'action, la précision le canal. |
| Me faire recommander par des partenaires et des relais | Être recommandé par des partenaires — *Partenaires, prescripteurs et relais qui parlent de vous.* | Nombre visé : « être recommandé par {n} partenaires » | Phrase fausse avec un nombre : « être recommandé par 3 partenaires ». |
| Publier davantage ce qui marche le mieux auprès de mes clients | Publier davantage les contenus qui m'apportent des demandes | Description | « Ce qui marche le mieux » était vague : le résultat recherché est la demande, mesurée par l'agent. |
| Rendre mes publications plus convaincantes | Rendre mes publications plus convaincantes | Description | Inchangé. |
| Réduire le coût de chaque demande obtenue par ma communication | Réduire le coût de mes demandes — *Ce que vous coûte chaque demande obtenue par votre communication, temps compris.* | Chiffre (% ou €) | Titre de 11 mots ; la précision reprend la règle de l'agent (coût par demande, temps compris). % ou euros. |
| Passer moins de temps sur ma communication pour le même résultat | Réduire le temps passé sur ma communication — *Pour un résultat au moins équivalent.* | Chiffre (%) | Plus court ; « pour le même résultat » passe en précision. |

**Comm & Création de contenu · Mettre en place ma présence en ligne**

| Avant | Après | Mesure | Pourquoi |
|---|---|---|---|
| Définir précisément à qui je m'adresse | Définir précisément à qui je m'adresse | Description | Inchangé. |
| Clarifier ce qui me distingue de mes concurrents | Clarifier ce qui me distingue de mes concurrents | Description | Inchangé. |
| Formuler une promesse claire pour mes clients | Formuler une promesse claire — *Le résultat concret que vous apportez à vos clients.* | Description | Plus court ; la précision dit ce qu'est une promesse. |
| Définir mon identité visuelle : logo, couleurs, ton | Définir mon identité visuelle et mon ton — *Logo, couleurs, manière de parler.* | Description | Le ton n'est pas visuel : le titre le dit. |
| Rassembler mes preuves : avis, réalisations, chiffres | Rassembler mes preuves — *Avis, réalisations, chiffres.* | Description | La liste passe en précision. |
| Choisir le réseau le plus adapté à mes clients | Choisir le réseau adapté à mes clients | Description | Le thème COM-11 n'est pas posé dans le parcours « mise en place » : COM-12 passe en premier (il sert d'indicateur). |
| Ouvrir et configurer mes comptes sur les réseaux | Ouvrir et configurer mes comptes sur les réseaux | Description | Thème lié posé dans le parcours « mise en place » en premier (COM-56 Démarrage). |
| Rendre mon profil clair dès la première visite | Rendre mon profil clair dès la première visite | Description | Idem (COM-56 avant COM-55, masqué en mise en place). |
| Créer un site internet simple qui présente mon offre | Créer un site internet simple — *Qui présente votre offre et permet de vous contacter.* | Description | Plus court ; la précision dit ce que le site doit permettre. |
| Créer et compléter ma fiche Google | Créer et compléter ma fiche Google | Description | Inchangé. |
| Obtenir mes premiers avis clients | Obtenir mes premiers avis clients | Nombre visé : « obtenir mes {n} premiers avis clients » | Phrase fausse avec un nombre : « obtenir mes 10 premiers avis clients » (au singulier : « mon premier avis client »). |
| Choisir les sujets dont je vais parler | Choisir les sujets dont je vais parler | Description | Exemple de réussite sans nombre imposé. |
| Préparer un calendrier de publication | Préparer un calendrier de publication | Description | Thème lié posé en mise en place en premier (COM-56). |
| Publier régulièrement sans y passer mes soirées | Publier régulièrement sans y passer trop de temps | Description | « Mes soirées » trop familier ; thème lié posé en mise en place en premier. |
| Publier mes premiers contenus | Publier mes premiers contenus | Nombre visé : « publier mes {n} premiers contenus » | Phrase fausse avec un nombre : « publier mes 12 premiers contenus » ; thème lié posé en mise en place. |
| Apprendre à faire des photos et des vidéos simples de mon activité | Savoir faire des photos et vidéos simples — *De votre activité, avec votre téléphone.* | Description | Titre de 12 mots raccourci ; thème lié posé en mise en place. |
| Construire un parcours qui transforme les visiteurs en clients | Guider les visiteurs jusqu'à me contacter — *De la publication au message, à l'appel ou au rendez-vous.* | Description | « Transformer les visiteurs en clients » dépassait le périmètre de l'agent Comm, qui s'arrête au contact (CLAUDE.md section 9 : son funnel s'arrête là où commence celui de l'Acquisition). Thème « Funnel 0 · Le chemin prévu » (COM-58) en premier. Changement de sens : à valider. |
| Créer une offre gratuite pour récupérer des contacts | Créer une offre gratuite pour récupérer des contacts — *Un guide, un diagnostic ou un essai.* | Description | Précision ajoutée. |
| Constituer mon fichier de contacts | Constituer mon fichier de contacts | Nombre visé : « réunir {n} contacts dans mon fichier » | Phrase fausse avec un nombre : « réunir 100 contacts dans mon fichier ». |
| Mettre en place le suivi de mes chiffres | Mettre en place le suivi de mes chiffres | Description | Inchangé. |
| Trouver qui s'occupera de ma communication | Trouver qui s'occupera de ma communication | Description | Thème lié posé en mise en place en premier (COM-56.03 « qui s'occuperait des publications »). |

**Exemples de réussite.** Ils restent affichés dans le champ « Comment saurez-vous que c'est atteint ? » (« Ex. : … »). Ceux qui
imposaient un nombre sans raison ont été réécrits, par exemple « la moitié de mes publications… » et « au moins dix preuves ». Les
exemples de délai (« Ex. : 3 ») restent : ce sont des durées, pas des résultats.


# Choix de l'objectif des agents RH et Comm (28 octobre 2026)

Ce document décrit le fonctionnement livré, la relecture des objectifs proposés (avant et après), les tests exécutés et ce qui reste à
décider. La liste des objectifs (`data/objectifs-agents.json`) reste un **brouillon à valider**.

## 1. Ce qui est livré

**L'écran.** Il s'ouvre sur « Quel objectif souhaitez-vous atteindre ? » et « Choisissez une proposition ou décrivez votre propre
objectif. ».

- **Un seul ensemble de cartes.** Les propositions viennent d'abord. La dernière carte, en pointillés, est « Définir mon propre
  objectif ». Un lien « Rien ne correspond ? Définir mon propre objectif » la rend visible dès le haut de la liste.
- **Un seul choix actif par objectif.** Ce sont des boutons radio : choisir une carte désélectionne l'autre.
- **État choisi visible sans la couleur** : coche dans le rond, mot « Choisi », bordure gauche épaisse.
- **Les champs utiles s'ouvrent dans la carte choisie** :
  - pour une proposition : son chiffre (avec le bon intitulé et, si besoin, l'unité), ou « Comment saurez-vous que c'est atteint ? » ;
    puis le délai en mois ;
  - pour l'objectif personnel : « Décrivez votre objectif », avec une aide et un exemple propres à l'agent, puis la réussite (ou un
    chiffre avec « J'ai un chiffre ») et le délai.
- **Comm.** La question « Où en êtes-vous ? » vient d'abord : « Améliorer ce que j'ai déjà » ou « Mettre en place ma présence en
  ligne », chacune avec une ligne d'explication. Les propositions de la partie choisie s'affichent ensuite. Tous les objectifs restent
  dans la même partie (décision du 27 octobre).
- **Plusieurs objectifs** (décision du 27 octobre). « + Ajouter un autre objectif » replie le premier en une ligne (« Objectif 1 :
  … », « Modifier », « Retirer ») et ouvre un second choix. Une proposition déjà prise y est indisponible (« Déjà parmi vos
  objectifs »).
- **Bouton toujours visible.** « Enregistrer mon objectif » reste en bas de l'écran pendant qu'on parcourt la liste, sur ordinateur
  comme sur téléphone.
- **Messages qui disent comment continuer** :
  - rien de choisi : « Choisissez une proposition ou décrivez votre propre objectif. » ;
  - Comm sans partie : « Choisissez d'abord où vous en êtes, puis une proposition ou votre propre objectif. » ;
  - texte vide ou fait d'espaces : « Décrivez votre objectif en quelques mots pour continuer. » ;
  - réussite, chiffre ou délai manquant : un message sous le champ concerné, qui reçoit le focus.
- **Ce qui est proposé dépend de la taille.** Une proposition dont tous les thèmes sont masqués pour la taille de l'entreprise n'est
  pas proposée. Par exemple, un dirigeant seul ne voit pas « Réduire les départs de salariés », « Réduire les absences dans l'équipe »
  ni « Alléger la charge de travail de l'équipe ». La règle de masquage existante est appliquée telle quelle. Un objectif déjà choisi
  reste toujours proposé.

**La sauvegarde.**

- **Seul le mode actif est transmis.** Le brouillon de l'autre mode reste dans la page : le texte personnel est retrouvé tel quel si
  le dirigeant revient à « Définir mon propre objectif ».
- **Une proposition prend toujours le texte de la liste.** Le serveur l'impose, quel que soit le texte reçu.
- **Un objectif personnel garde le texte du dirigeant**, aux espaces de début et de fin près. Il n'est jamais transformé en
  proposition, même s'il lui ressemble.
- **L'origine est enregistrée** (`origine` : `proposition`, `personnel` ou `libre` pour Acquisition et Finance). Les objectifs
  enregistrés avant le 28 octobre la déduisent de leur `choix`.
- **Le serveur refuse** :
  - un texte vide ou fait d'espaces ;
  - un objectif personnel qui reprend mot pour mot une proposition choisie dans le même envoi ;
  - une unité que la proposition ne prévoit pas ;
  - deux parties mélangées (Comm).
- **Un nouvel enregistrement remplace les objectifs en cours.** Ils passent en historique (« Remplacé ») : un seul jeu d'objectifs
  est actif à la fois.

**La restitution et la transmission.**

- L'objectif personnel s'affiche comme une proposition : sa phrase, sa réussite, son échéance, et la mention « Objectif personnel ».
- On le retrouve après actualisation, après déconnexion et reconnexion, et en revenant à l'étape Objectif, où le formulaire se rouvre
  avec le texte, la réussite et le délai.
- Le compte rendu (onglet Objectif) reprend les objectifs en cours.
- `objectifTransmis` (`src/lib/audit/objectifs-proposes.ts`) donne pour chaque objectif ce que les étapes suivantes reçoivent :
  origine, phrase, texte, proposition, mesure (chiffre ou réussite), délai, échéance, indicateur et thèmes liés.

**Reste à brancher** (aucune de ces étapes n'existe encore) :

- l'analyse de l'IA : `objectifTransmis` est prêt, aucun prompt n'est branché ;
- l'avancement déclaré aux points d'étape : il reste à 0 % ;
- le lien entre la partie choisie en Comm et le parcours du questionnaire. Ce parcours est décidé par la réponse à COM-10.07
  (« Publiez-vous… »), pas par la partie de l'objectif.

## 2. Relecture des objectifs proposés

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

**Avant et après.** Les identifiants sont gardés : les objectifs déjà enregistrés restent reliés.

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

## 3. Tests exécutés

**Dans l'application** (serveur construit, base réelle, comptes fictifs) :

- `node scripts/verification/objectifs.mjs` : **50 contrôles, 50 conformes**.
  - Pour RH et Comm, chaque fois :
    - écran et introduction ;
    - propositions et carte personnelle ;
    - rien de choisi ;
    - sélection (coche, « Choisi », champs) ;
    - objectif personnel (aide, exemple, focus) ;
    - passage d'un mode à l'autre, avec le brouillon gardé ;
    - texte fait d'espaces ;
    - enregistrement en base (origine, texte intact) ;
    - affichage, actualisation, déconnexion et reconnexion ;
    - retour à l'étape Objectif ;
    - modification (un seul actif, l'ancien en historique) ;
    - compte rendu.
  - Cas particuliers :
    - Comm sans partie choisie ;
    - phrase d'un nombre visé, au pluriel et au singulier ;
    - plusieurs objectifs ;
    - partie verrouillée ;
    - objectif personnel identique à une proposition, refusé ;
    - texte imposé par le serveur ;
    - unité ;
    - clavier (flèches, puis saisie dans le champ personnel) ;
    - dirigeant seul ;
    - téléphones de 360 et 390 px (pas de défilement horizontal, bouton visible, champ à la bonne taille).
  - Un contrôle a d'abord échoué : il supposait que la touche Fin fait passer à la dernière carte, ce que les boutons radio du
    navigateur ne font pas (seules les flèches les parcourent). Il a été remplacé par le vrai parcours au clavier : les flèches
    jusqu'à « Définir mon propre objectif », puis la saisie directe dans le champ.
- `node scripts/controle-boutons-pages.mjs --agents RH,COM` : **89 vérifications, 0 échec**. C'est le contrôle des écrans d'agent,
  adapté aux cartes. Il a trouvé un défaut, corrigé : en Comm, « Enregistrer » avant de choisir la partie affichait un message général
  sans dire quoi faire.
- `node scripts/controle-autre.mjs` : **168 vérifications, 0 échec**. « Définir mon propre objectif » y est exercé dans chaque partie,
  avec et sans chiffre, en relisant la base.
- `node scripts/audit-client.mjs` : **38 contrôles, 37 conformes**. Le contrôle A-02 (clavier) mesure maintenant le focus sur la
  carte. Le seul écart est R-01 : compte rendu sans priorités, déjà connu.

**Tests automatisés** : `npm test`, **373 tests, 0 échec**. `tests/objectifs-agent.test.mts` contrôle :

- le texte imposé pour une proposition ;
- le texte personnel gardé ;
- le refus d'un texte vide ou fait d'espaces ;
- le refus d'un objectif personnel identique à une proposition choisie ;
- le gabarit au singulier et au pluriel, sans test de vraisemblance ;
- les unités ;
- le filtre par taille ;
- la transmission, y compris pour les objectifs enregistrés avant ce changement.

**Examiné dans le code seulement** :

- l'aperçu de l'application (`scripts/apercu/entree.tsx`), mis à jour mais pas regénéré ;
- le thème clair (jetons de couleur, rien en dur), sans capture.

**Captures** (`docs/objectifs/captures/`) : sur ordinateur et sur téléphone, les propositions (`-1-propositions`), une sélection
(`-2-selection`) et la saisie d'un objectif personnel (`-3-personnel`), pour RH et pour Comm.

## 4. À décider par le propriétaire

1. **Un ou plusieurs objectifs.** La demande du 28 octobre parle d'un seul choix actif (proposé ou personnel). La décision du
   27 octobre permet plusieurs objectifs pour RH et Comm. Aujourd'hui, chaque objectif est soit une proposition, soit un objectif
   personnel, et « Ajouter un autre objectif » reste possible. Si un seul objectif par agent est voulu, il suffit de retirer ce bouton.
2. **Changements de sens à valider** :
   - « Relancer les personnes intéressées » se mesure en clients en plus, et non plus en % ;
   - « Guider les visiteurs jusqu'à me contacter » remplace « transformer les visiteurs en clients » (périmètre de l'agent Comm) ;
   - « Améliorer mon taux de conversion » demande le taux visé.
3. **Filtre selon la taille.** Il applique la règle de masquage des thèmes aux propositions. Le garder ou montrer tout à tous.
4. **Objectifs absents de la liste, proposés sans être ajoutés** :
   - « Libérer du temps pour piloter l'entreprise » (RH-05, temps du dirigeant) ;
   - pour un dirigeant seul, « Me faire aider : salarié, apprenti, freelance ou associé » (RH-41 à RH-45, la partie « S'entourer »
     qui ne lui est posée qu'à lui).
5. **La liste entière** : titres, précisions, exemples de réussite, thèmes rattachés. Et le plafond technique de 10 objectifs.
6. **Comm** : la partie choisie pour l'objectif doit-elle décider du parcours du questionnaire, aujourd'hui décidé par COM-10.07 ?

# CAXE — instructions projet

> **Le document « CAXE — Règles de fonctionnement » (version du 15 octobre 2026)
> fait foi.** Copie dans le dépôt : `docs/regles-de-fonctionnement.md`. En cas de
> contradiction entre ce document, ce fichier, le code existant ou tes habitudes,
> le document a raison. Ce fichier n'en est qu'un résumé de travail.

Lis ce fichier en entier avant toute modification. Si une demande contredit les
règles, signale-le avant d'exécuter.

---

## 1. Ce qu'est CAXE

Plateforme web d'auto-audit pour dirigeants de TPE/PME, par abonnement, avec
quatre agents IA : **Acquisition & Chiffre d'affaires**, **Finance &
Rentabilité**, **RH & Organisation**, **Comm & Création de contenu**.

Signature : « Un acte, un destin ». Le concurrent réel est le consultant ou le
coach externe : conseil de vraie qualité à prix accessible, perçu comme sérieux
et premium, jamais comme un gadget.

**Règle fondatrice : le moteur diagnostique, l'IA prescrit.**

**Marketing de CAXE (19 octobre)** : le dossier « Client idéal & stratégie de contenu organique » (octobre 2026) définit
le dirigeant à convaincre (2 à 30 salariés, 300 k€ à 5 M€ de CA, qui sait que son entreprise pourrait mieux fonctionner sans savoir
quoi traiter en premier) et la stratégie de contenu de CAXE. Il sert **uniquement à la promotion de CAXE** : ne jamais l'intégrer aux
fichiers de données, au moteur, aux questionnaires ni aux prompts des agents, qui concernent les clients et leurs entreprises. Sur la
page d'accueil, **la direction artistique et le contenu ne changent pas** : seuls des boutons de conversion ont été ajoutés
(`Commencer mon audit` dans l'en-tête, `Fixer mon objectif` après « Comment ça marche », quatre portes d'entrée dites avec les mots du
dirigeant dans `src/components/marketing/portes-entree.tsx`, `Voir les offres` à côté de `Créer un compte`). **Tous les boutons d'appel
mènent à la création du compte (`/inscription`) et portent un halo qui respire et un éclat qui traverse (classe `bouton-appel`, arrêtés
au survol et sous `prefers-reduced-motion`), sauf « Voir les offres ». Dans le héros, « Venez les essayer » est le seul bouton : il
clignote et mène à `/inscription` (le bouton « Créer un compte » du héros a été supprimé à la demande du propriétaire).** Idée gardée
pour plus tard, pas encore construite : une page « Audit Express » où le visiteur saisit ses propres chiffres (CA, prospects, rendez-vous,
clients) et voit son entonnoir étape par étape avant de créer un compte, sans jugement « bon » ou « mauvais » tant qu'aucune référence n'existe.

## 2. Les trois réflexes (à tout moment)

1. Si une demande revient à faire calculer ou juger quelque chose par l'IA,
   **signale-le avant d'exécuter**.
2. S'il manque un seuil, une question ou une donnée, **ne l'invente pas** : marque-le
   comme manquant et signale-le.
3. Si une décision engage le produit (pondération, champ d'inscription,
   périmètre d'un agent, tarif), **demande avant**.

## 3. Architecture : trois couches

| Couche | Qui | Rôle | Ne fait jamais |
|---|---|---|---|
| 1. Questionnaire | Écrit à l'avance, dans une banque de questions | Collecter des données fermées et chiffrées | Être généré par l'IA |
| 2. Moteur | Code déterministe, testé | Couleurs, écarts, impacts, priorités | Appeler l'IA |
| 3. IA | Modèle génératif | Rédiger l'analyse, **prescrire** les recommandations | Recalculer ou réécrire un chiffre |

- **L'IA ne produit aucune question, aucune couleur, aucun chiffre qui ne soit vérifié par le code dans une source citée** (voir « Effet d'une action » ci-dessous). Elle ne
  traite que les indicateurs signalés par le moteur (jamais un « vert » qu'elle
  jugerait problématique) et reste dans le périmètre de son agent : jamais de
  conseil juridique, fiscal, comptable, médical ni de droit du travail.
- Chaque indicateur porte une `reference_marche` et une `explication`.
  **Aucun champ « action »** : les recommandations sont générées par l'IA à
  partir de la situation complète (indicateurs faibles et forts avec leur écart
  chiffré, profil, objectif de l'agent, réponses libres, ce qui a déjà été
  tenté, historique).
- Dynamique permis : le choix, parmi des questions écrites, de celles d'un point
  d'étape ; la rédaction du rapport et des relances ; une légère adaptation du ton
  d'une question. Jamais la substance ni la structure.
- **Chiffre de marché** (décision du 15 octobre) : un chiffre de marché est **un extrait vérifié par le
  code dans une source citée**, jamais produit ni recalculé par l'IA. Un agent de recherche, séparé de l'IA
  qui rédige le rapport, le trouve ; le code le contrôle ; il est enregistré en base et réutilisé par tous
  les clients du même profil. Le moteur ne lit que ces références, il n'appelle jamais l'IA. Sans référence,
  le thème s'affiche avec les chiffres du client et sans comparaison au marché ; un rapport n'est jamais
  bloqué.
- **Effet d'une action (décision du 19 octobre)** : le rapport dit comment atteindre l'objectif et ce que chaque
  action peut rapporter, avec recul. Le taux d'effet d'une action **dépend du métier** (ce qui vaut pour un secteur
  ne vaut pas pour un autre). Un agent de recherche, séparé de l'IA qui rédige le rapport, le cherche **une seule
  fois par action et par métier** (jamais à chaque rapport : coût inutile), propose une fourchette prudente avec sa
  source (extrait, page, date) ; **le code relit la page et vérifie que le chiffre y figure**, sinon aucun chiffre
  n'est affiché et l'effet est décrit en mots. Le résultat est enregistré en base et réutilisé par tous les clients
  du même métier (même cascade que les chiffres de marché : métier, puis famille, puis national si permis ; mêmes
  plafonds de budget ; mise à jour périodique). Le **moteur** applique le taux aux volumes du client et calcule
  l'effet de l'ensemble en recalculant la chaîne : on n'additionne jamais les effets de plusieurs actions (6 % +
  4 % + 5 % n'est pas 15 %), et si le plan ne suffit pas pour l'objectif, le rapport le dit. Le potentiel est
  toujours présenté comme un potentiel, jamais comme une promesse. Un rapport n'est jamais bloqué : sans taux
  sourcé, « pas de chiffre sourcé » et l'effet en mots. Pas encore construit.
- Deux couches de données : réponses fermées et chiffrées → calcul ; réponses
  ouvertes (facultatives) → contexte pour l'IA, **jamais dans le calcul**.
- **Aucune question codée en dur.** Questions, seuils, croisements, lexique,
  déclencheurs, routage : tout vit dans des **fichiers de données**.
  **Ajouter un métier = déposer un fichier de données, sans toucher au moteur.**
  Si ce n'est pas possible, l'architecture est à revoir.

## 4. Parcours d'un dirigeant (6 étapes)

Compte (e-mail, mot de passe) → métier et activités → formule et agents → paiement → dossier d'entreprise
dans l'application → choix de l'agent et objectif → questionnaire assemblé → moteur (constat, priorité) →
rapport et plan par l'IA → suivi (**parcours décidé le 21 octobre**, voir sections 5 et 10). L'IA n'intervient
qu'aux deux dernières étapes, sur un constat déjà calculé.

## 5. Inscription et profil

- **Questions une à une, en deux temps (décision du 21 octobre).** Le compte naît avec l'e-mail et le mot de
  passe seulement. **Le métier et ses activités** se demandent ensuite, **avant la formule** (les agents proposés en
  dépendent : une profession réglementée n'a pas l'agent Comm). **Le reste du dossier** (CA, effectif, ancienneté,
  zone, ville) se demande **dans l'application, après le paiement**. Chaque question s'affiche déjà formulée avec les
  mots et l'unité du métier (lexique). Transition sobre, réduction des animations respectée.
- Champs : **métier précis**, **sous-variante** (conditionnelle), **CA mensuel**
  (déclaré, jamais estimé), **nombre de collaborateurs**, **ancienneté**, **type
  de zone** (urbaine dense / périurbaine / rurale), **ville**.
  **L'objectif n'est plus demandé à l'inscription.** Le nombre de ventes et les
  jours d'ouverture non plus : ce sont des données partagées posées par le
  premier agent qui en a besoin.
- **Sous-variante** : n'apparaît **qu'après le choix du métier**, et seulement si
  ce métier regroupe plusieurs activités (agence immobilière : transaction /
  gestion locative / syndic / conciergerie saisonnière ; paysagiste : création /
  entretien régulier ; agence de voyage : particuliers / entreprises ou groupes ;
  agence web, com ou marketing : projets ponctuels / contrats mensuels).
  **Cases à cocher, plusieurs choix possibles.** Une case → la variante ; plusieurs
  → le socle une fois plus le bloc de chaque spécialité, sans doublon.
- **Liste des métiers (15 octobre)** : recherche par synonymes ; métiers à plusieurs activités = cases à
  cocher plus **« Autre (précisez) »** (seule, elle applique l'activité par défaut du métier ; le texte est
  gardé sur le compte). **« Mon métier n'est pas dans la liste »** : le dirigeant décrit son activité et
  choisit la catégorie qui y ressemble le plus (jamais une profession réglementée). Stock : si le métier ne le
  tranche pas, une question oui / non à l'inscription. Agent Comm : plusieurs activités = règle la plus
  prudente ; « à trancher » = décision ouverte, l'agent reste proposé (13 métiers ou activités au 23 octobre : finance et assurance, formation CPF,
  caviste, pharmacie, bureau de tabac, négoce et gros de boissons, brasserie artisanale, café-bar : secteurs où la communication est encadrée,
  à traiter avec l'avocat). **Décisions du 23 octobre** : le photographe a l'agent Comm ; l'agence de communication et de marketing ne l'a pas (elle
  maîtrise sa propre communication). Catégorie **Fabrication** : questionnaire
  à créer, l'audit affiche « en préparation ». Ne rien trancher de ces points seul.
- **Routage invisible** : métier → **catégorie** (10, agriculture exclue) →
  **profil** (8 : Rendez-vous, Commerce, E-commerce, Restaurant, Artisan /
  chantier, B2B / cycle long, Abonnement, **Location** — hébergement et location de véhicules, ajouté le 20 octobre). Le dirigeant ne voit jamais la
  catégorie. Table complète dans le document, partie 3.
- **Lexique** par profil : une question, plusieurs formulations (demande,
  nouveau client, premier achat, capacité, client fidèle), une seule règle de
  notation.
- **Professions réglementées** : socle seulement, aucun module métier, **pas
  d'agent Comm** (3 agents au maximum). L'agent Acquisition ne leur recommande
  ni publicité payante, ni démarchage, ni apporteurs d'affaires rémunérés, et
  n'affiche pas le renvoi vers Comm. **L'audit Acquisition ne leur pose pas non plus** les
  questions correspondantes : pas de question sur la publicité payante (D04), et dans les canaux (D03)
  seuls restent bouche-à-oreille, fiche Google, site internet, passage, appels d'offres, réseau ou enseigne et autre
  (**décision du 21 octobre : au moindre risque, le canal est retiré** ; l'IA n'est pas assez précise pour être laissée
  juge en profession réglementée), pas de thèmes Prospection active ni Partenaires. Liste dans `data/routage.json` (`reglementees.acquisitionExclut`), appliquée à
  l'assemblage et refusée côté serveur.
- **Rapport des professions réglementées (décision du 21 octobre, à construire et à faire valider par l'avocat)** : deux zones nettes.
  **Zone interdite** : publicité sous toute forme, démarchage, prospection, apporteurs d'affaires, partenaires, emailing et SMS vers des
  inconnus, tout canal hors de la **liste fermée** transmise par le moteur (bouche-à-oreille, fiche Google, site internet, passage, appels
  d'offres, réseau ou enseigne). Si le sujet est touché, par l'analyse, par une réponse ou par un champ libre, l'IA n'écrit rien dessus et le
  rapport affiche un **message fixe**, écrit à l'avance, jamais généré, sous un intertitre identique. **Zone libre** : tout le reste du
  périmètre de l'agent, sans autocensure. Un doute classe le sujet en zone interdite. **Garde côté code** (l'IA seule ne suffit pas) : le code
  vérifie le rapport produit et remplace par le message fixe toute section qui contient un terme de la liste interdite ; la liste des termes
  est un filet, pas une garantie, et se valide avec l'avocat. **Le texte du message fixe est à rédiger par le propriétaire avec l'avocat.**
  La règle est écrite dans `docs/prompt-agent-acquisition.md` (bloc 4) ; le prompt n'est pas encore branché.

## 6. Audit d'un agent

- Le dirigeant choisit l'agent qu'il audite. **Première question : son objectif
  pour cet agent**, en **trois champs courts** : ce qu'il veut changer, de
  combien, en combien de temps (exemple affiché : « baisser le turnover de 5 %
  sur les 3 prochains mois »). Chiffre et délai sont utilisés directement. Ce
  qu'il veut changer est rattaché à un indicateur de l'agent quand c'est possible ;
  sinon l'objectif est gardé tel quel et l'avancement se mesure à ce qu'il
  déclare aux points d'étape. **Un objectif par agent**, conservé avec son
  historique.
  **Objectif sans chiffre (décision du propriétaire, 22 octobre : option 3, RH et Comm)** : pour ces deux
  agents, le dirigeant **choisit dans une liste d'objectifs écrite à l'avance** (ou « Autre (précisez) »), puis donne
  **un chiffre s'il en a un, ou décrit ce qu'il veut constater** (« Comment saurez-vous que c'est atteint ? »), plus le
  délai en mois. Pour la Comm, la liste suit les deux parcours : « Améliorer ce que j'ai déjà » (objectifs chiffrés,
  ex. taux de conversion) et « Mettre en place ma présence en ligne » (sans chiffre : ouvrir les comptes, identité
  visuelle, parcours de conversion, régularité). Liste dans `data/objectifs-agents.json` (**brouillon à valider par le
  propriétaire** : libellés, exemples, thèmes rattachés ; contrôlée par `npm run donnees:controle`) ; formulaire
  `objectif-choix.tsx` ; l'objectif enregistré garde `choix`, `reussite` et un chiffre facultatif. Le moteur ne juge
  pas le réalisme d'un objectif sans chiffre (rien à comparer) ; l'avancement se mesure à ce que le dirigeant déclare.
  Acquisition et Finance gardent les trois champs chiffrés.
- **Compte rendu (étape 4, décisions du propriétaire du 22 octobre : trois onglets, objectif / priorités / plan d'action)** :
  **branché sur le vrai moteur** pour ce qui existe. `src/lib/audit/constat-compte.ts` assemble le questionnaire du compte, charge les
  références de marché actives en base et appelle `constaterAgent` ; `compte-rendu.ts` classe les constats (thèmes notés du rouge au vert,
  avec repère de marché sourcé, analysés avec les seuls chiffres du dirigeant, à compléter, comptes des thèmes masqués et de contexte) ;
  `resultats.tsx` les affiche. Ouvert dès que le niveau est choisi (case « 4 Résultats » cliquable). **Rien n'est inventé** : tant que
  `data/seuils.json` est vide et que les règles de notation Pratique et Cohérence ne sont pas écrites, aucun thème n'est noté (« sans
  repère de marché ») ; le réalisme de l'objectif, la réponse de l'agent, l'ordre de priorité, l'impact et le plan d'action (IA, clé
  `ANTHROPIC_API_KEY` non branchée) disent « pas encore » au lieu d'un chiffre. Avancement : 0 % tant qu'aucun point d'étape n'existe. **Maquette à
  chiffres fictifs** gardée pour valider la forme finale : `resultats-maquette.tsx` et `src/lib/audit/resultats-exemple.ts`, visible
  seulement avec `RESULTATS_MAQUETTE=1` et `?exemple=1` (bannière « Exemple de présentation »). Libellés de réalisme de la maquette
  (Réaliste / Réaliste sous conditions / Pas réaliste en l'état) : propositions à valider ; pas de verdict pour un objectif sans chiffre.
  L'aperçu de l'application remplit un compte de test avec `scripts/reponses-demonstration.mts` (réponses neutres, jamais de vrais clients).
- **Relecture complète du 23 octobre (balayage de tous les secteurs)** : `node scripts/balayage-secteurs.mts` assemble et remplit le
  questionnaire de chaque métier, activité, taille, niveau et agent (229 scénarios, 7 704 questionnaires) et contrôle textes, lexique,
  tableaux, règles en attente, exclusions des professions réglementées et constat ; `node scripts/controle-parcours-secteurs.mjs` et
  `scripts/controle-complementaire.mjs` rejouent les parcours dans un navigateur (serveur lancé sur le port 3100). **À relancer après toute
  correction de la banque, du classeur ou des règles.** Trois corrections en sont issues : (1) la question qui décide du masquage de son
  propre thème (COM-10.07 pour COM-10) reste posée, sinon une cinquantaine de questions Comm n'arrivaient jamais ; (2) une question d'un autre
  agent dont dépendent des tableaux ou des conditions (types de clients ACQ-01.01, canaux ACQ-03.01) est posée en **préalable**
  (« Pour commencer », champ `prealables` de l'assemblage, `codesPrealables` pour l'autorisation d'écriture) par le premier agent qui en a
  besoin, avec sa réponse si elle existe ; (3) un tableau dont les lignes viennent d'un cadrage (D20 jours d'ouverture) fait poser ce cadrage.
  Les mots du lexique sont aussi remplacés dans l'aide et la question de repli. Un tableau à total imposé (19 questions) ne s'enregistre comme réponse que
  si le total est juste ; la saisie partielle est gardée en **brouillon sur le compte** (table `BrouillonReponse`, `PUT /api/audit/brouillon`, décision
  du propriétaire du 23 octobre) : elle suit le dirigeant d'un appareil à l'autre, le calcul l'ignore, et elle est supprimée dès que la réponse complète
  est enregistrée. Le nombre de questions
  annoncé au choix du niveau est un maximum (« jusqu'à N questions, selon vos réponses »).
- **Doublons retirés et réponses déduites (décisions du propriétaire, 27 octobre)** : une relecture des 519 questions posées a repéré des questions
  qui se recoupent ; **ne sont pas des doublons** (gardées) les questions faites exprès pour des statistiques ou des calculs : tendances (« il y a 6 / 12
  mois »), répartitions par canal ou type de client, contrôles de cohérence (ACQ-01.05 contre COM-02.01), et les paires qui alimentent deux
  calculs différents (ACQ-17.06 alimente la reconquête des clients inactifs XA17, COM-15.01 le fichier de contacts inexploité XC10). **Retirées**
  (mécanisme `data/retraits.json`, qui survit à l'import du classeur ; le contrôle refuse un retrait qui alimente un calcul, un croisement ou une règle ;
  **la liste est vide depuis le 27 octobre** : les lignes ont été supprimées du classeur) : RH-41.04 et RH-41.05 (couvertes par RH-42.01), ACQ-09.04
  (voisine d'ACQ-12.01) et ACQ-22.08 (fusionnée dans ACQ-22.07 ; les croisements XA34 et XA42, qui la lisaient, lisent ACQ-22.07). **Déduite** (`data/implications.json`, fonction
  `reponsesDeduites`) : COM-13.10 « Avez-vous un site internet ? » vaut « oui » et n'est pas posée quand « site internet » est coché en ACQ-03.01 ;
  une réponse déjà donnée l'emporte. Le classeur porte aussi la condition de COM-13.10 (« D03 · si « Site internet » n'est pas coché », opérateur
  `ne_contient_pas` de `regles-affichage.json`). **COM-03.01 / COM-04.01 (décision du propriétaire, 27 octobre : deux questions distinctes)** :
  COM-03.01 garde le résultat promis ; COM-04.01 ne demande plus que la preuve, le délai et l'effort demandé (3 champs). **Le texte reformulé de
  COM-04.01 est une proposition à faire valider.** Classeur corrigé : `CAXE_Themes_Chiffres_4_agents_11` (version du 27 octobre).
- **Assemblage en 5 couches** : (1) inscription, (2) socle de l'agent, (3) module
  catégorie, (4) module métier — 5 questions maximum —, (5) filtre taille
  (seul / 2 à 5 / 6 et plus). **Module métier (construit le 27 octobre)** : colonne « Métiers concernés » du classeur (onglet
  Acquisition, libellés de la liste des métiers séparés par « ; », une activité s'écrit « Métier / Activité ») → champ `metiers` de
  la donnée ; la donnée n'est posée qu'à ces métiers ou activités (`pourLeMetier` dans `assemblage.ts`, contexte `metier` calculé par
  `metierDuCompte` de `routage.ts` : « Autre » seul = activité par défaut). Le contrôle refuse un métier inconnu, une profession
  réglementée (aucun module métier) et plus de 5 questions par module. **Validé par le propriétaire (27 octobre)** : ACQ-25
  (VTC et taxi, coursier, livraison du dernier kilomètre), ACQ-27 (les 17 métiers de gros, de distribution et de négoce), ACQ-28
  (vente de véhicules, marchand de biens, promoteur immobilier ; ACQ-28.03 reprise et financement : véhicules seulement), ACQ-29
  (agence immobilière : transaction, location, immobilier d'entreprise). ACQ-26 (Fabrication) reste en attente avec la catégorie.
  Restent ouverts : transport de marchandises (ACQ-25), constructeur de maisons individuelles (ACQ-28), gestion locative (ACQ-29). **Questions déclencheuses** (D01 à D65) qui ouvrent
  ou masquent des blocs. Le questionnaire est assemblé selon le profil ; seul
  l'assemblage est automatique.
- Durée visée : **1 h à 1 h 15 par agent**. **Jamais à faire d'une traite** :
  sauvegarde continue, reprise possible à tout moment.
- **Quatre réponses pour un chiffre** : exact ; estimation ou fourchette (le
  moteur prend le milieu, marqué « estimé ») ; « je ne sais pas » (retiré du
  calcul, question de repli, complétable plus tard) ; « je ne suis pas cette
  donnée » (retiré du calcul, enregistré comme absence de suivi, conseil pour
  commencer à la suivre). **0, inconnu et non applicable sont distincts.**
  **Aucune question obligatoire.**
- Au-delà d'**un quart des données essentielles** « je ne suis pas cette donnée »,
  conseil général de pilotage ajouté, **sans remplacer** les autres.
- **Données partagées enregistrées sur le compte dès qu'elles sont posées, quel
  que soit l'agent**, jamais redemandées, modifiables par le dirigeant :
  mini-bloc « temps du dirigeant », nombre de ventes et jours d'ouverture,
  objectif de croissance du CA, masse salariale, budget marketing, abonnés,
  canaux. Même niveau (essentiel / approfondi) chez tous les agents qui les
  utilisent. Pas de double comptage.
- **Jamais deux périodes mélangées dans un calcul.** CA au mois ; ventes dans
  l'unité du métier, ramenées au mois par le moteur avec les jours d'ouverture
  (par jour × jours ouverts par semaine × 4,3). Le nombre de ventes compte les
  achats, pas les articles.
- **Pas d'écran de récapitulatif** ni de confirmation des chiffres avant le rapport.
- Règles de rédaction : pas de question rhétorique, pas de réponse glissée dans
  la question, langage simple, question conditionnelle en deux temps.

## 7. Moteur

**Étage 1 — le constat.** Chaque thème est noté vert / orange / rouge selon
**une seule** nature : **Marché** (chiffre face au secteur, référence sourcée),
**Pratique** (absente / partielle / en place), **Cohérence** (les réponses
tiennent ensemble), **Contexte** (non noté, sert à l'IA).

**Étage 2 — la priorité.** Impact **chiffré** quand le thème est sur une vraie
chaîne de calcul vers l'objectif (surtout Acquisition, une partie de Finance) ;
sinon impact **qualifié** (Bloquant / Frein / Secondaire) par règles fixes. **Le
moteur n'invente jamais un pourcentage.** Les impacts chiffrés sont calculés sur
les volumes du client, jamais sur une moyenne générique.

**Plusieurs leviers : on recalcule toute la chaîne, on n'additionne jamais les
gains.** Deux leviers d'étapes différentes se multiplient ; deux leviers sur la
même étape se partagent les mêmes clients. La capacité plafonne le gain
immédiat : quand elle bloque, deux chiffres (gain immédiat, gain une fois la
capacité augmentée).

**Seuils** : la moyenne du marché est **orange**, le vert est au-dessus ;
indicateur à deux sens : fourchette verte, orange à moins d'un point, rouge au-delà ;
noté seulement si le résultat dépend surtout de l'entreprise (sinon Contexte) ;
préférer l'acquisition maîtrisable au hasard ; seuils segmentés par zone et
taille ; **sans source, « à valider »** ; hypothèse extérieure sourcée ou valeur
basse annoncée ; indicateur croisé dépense / résultat plutôt qu'une dépense seule.

**Robustesse** : question sautée retirée du calcul (jamais zéro) ; **thème noté
seulement si au moins 50 % de réponses**, sinon « non évalué » (« je ne sais pas »
et « je ne suis pas cette donnée » comptent comme sans réponse) ; thème qui ne
s'applique pas à la taille **masqué**, pas « non évalué ».

**Croisements et scénarios** : calculs combinant plusieurs réponses, avec codes de
données, profils concernés, hypothèse éventuelle et phrase de rapport.

Le moteur est **couvert par des tests**.

## 8. Objectif, plan d'action, suivi

- Le chiffre principal est **l'avancement vers l'objectif** fixé pour chaque
  agent. Le vert / orange / rouge par thème reste, pour montrer les leviers.
  **Aucun score global sur 100.** Le moteur vérifie si l'objectif est réaliste ;
  le rapport le dit honnêtement.
- **Un bloquant change l'ordre du plan, jamais son contenu** : l'IA donne toutes
  ses recommandations.
- **Le plan suit le temps réellement disponible du dirigeant** (heures par jour
  travaillé). Les actions qui libèrent du temps passent en premier ; les autres
  sont programmées après (« à lancer une fois 6 h libérées »). Augmenter la
  capacité ne se résume jamais à « libérez du temps » : tâches à déléguer,
  automatiser ou supprimer, puis recrutement.
- **Tour « ce que vous avez déjà tenté »**, après le premier calcul, sur les 5 ou
  6 axes faibles seulement (rien / en place et ça marche / sans résultat / pas
  tenu dans la durée) ; ces réponses n'entrent jamais dans le calcul.
- **Effet attendu et avancement réel (décision du 19 octobre)** : l'IA ne choisit jamais un pourcentage ni un
  montant. L'effet potentiel d'une action vient d'un taux sourcé et vérifié par le code (section 3, « Effet
  d'une action ») appliqué par le moteur aux volumes du client ; sans taux sourcé, l'effet est écrit en mots.
  L'**avancement** vers l'objectif, lui, se calcule uniquement sur ce que le dirigeant **déclare** au point
  d'étape (exemple du propriétaire : il relance ses devis et signe 3 devis de plus → 3 % de l'objectif atteints,
  parce que c'est réellement arrivé). Le moteur classe les leviers par impact calculé sur les volumes du client.
  Six croisements portent une « part récupérable prudente, à sourcer » (XA17, XA19, XA24, XA35, XC33, XR15) :
  ils se brancheront sur ces taux sourcés ; tant qu'un taux n'est pas disponible, ils affichent le montant en
  jeu (les devis sans réponse × leur montant moyen) et jamais un gain.
- Suivi : point d'étape à l'**échéance propre de chaque action**, boucle
  d'ajustement, alertes, ré-audit trimestriel, classement sectoriel, historique.
  Gamification discrète. À construire plus tard, dans cet ordre.

## 9. Les quatre agents

Périmètres étanches ; chaque agent donne un **conseil complet avant tout renvoi** ;
un renvoi est un **aperçu** de l'agent manquant, avec ajout en un clic.

| Agent | Sa question | Contenu |
|---|---|---|
| Acquisition & CA | Quels leviers comblent l'écart à l'objectif ? | 23 thèmes en 5 étapes (+ 6 ajoutés le 27 octobre, dont 4 modules métier, en « Contexte » à valider) ; reste factuel sur la communication |
| Finance & Rentabilité | L'objectif est-il rentable et finançable ? | 48 thèmes dont un bloc Stock de 9 ; 13 scénarios ; jamais fiscalité ni comptabilité |
| RH & Organisation | L'organisation peut-elle porter l'objectif ? | 49 thèmes en 8 blocs ; verdict Oui / Sous conditions / Pas en l'état ; jamais droit du travail |
| Comm & Création de contenu | La présence en ligne génère-t-elle assez de contacts ? | 61 thèmes en 8 groupes (+ COM-62 référencement et COM-63 annonces Google, 27 octobre, en « Contexte » à valider) ; deux parcours (amélioration, mise en place) ; qualité notée sur une grille fixe de 6 critères ; pas proposé aux professions réglementées |

Agents nommés par leur fonction, **sans prénom ni personnage**.

## 10. Abonnement

Paliers mensuels **2 agents 59,99 € HT, 3 agents 79,99 € HT, 4 agents 99,99 € HT.
Pas d'offre à 1 agent.** (Le document de règles du 15 octobre indique 109,99 € pour
4 agents : c'est une erreur, le prix retenu est 99,99 €, confirmé par le
propriétaire du produit. À corriger dans le document.) Badge « Recommandé » sur le palier 3, formule suggérée à
l'inscription, essai d'un agent non souscrit, mais **aucun agent coché d'avance**.
L'accès aux agents est **un droit attaché au compte**, contrôlé à chaque entrée
d'agent (page comme API).
Le texte annuel compare des montants du même rythme : « Soit 50,99 € HT / mois, au
lieu de 59,99 € HT / mois en facturation mensuelle » (le prix principal est le
montant à l'année). Implémentation : `src/lib/abonnement.ts` (paliers, droits,
professions réglementées), `POST /api/abonnement`, modèles `Abonnement` et
`AgentAccess`. **Paiement (construit)** : Stripe Checkout en abonnement (`src/lib/paiement/` : `etat.ts` montants, mode, accès et
traduction des événements, `stripe.ts`, `abonnement-serveur.ts`), `POST /api/paiement/{session,webhook,portail,demonstration}`,
pages `/paiement`, `/paiement/succes`, `/paiement/demonstration`. `Abonnement.statut` : EN_ATTENTE_PAIEMENT, ACTIF, IMPAYE, RESILIE ;
**l'accès aux agents exige un abonnement en cours** (ouvert jusqu'à la fin de la période payée après un impayé ou une résiliation) :
`aAccesAgent`, `agentsActifs` et les routes `/api/audit/*` le vérifient. Le prix est toujours recalculé côté serveur. Sans clé Stripe :
mode **démonstration** (aucun paiement, dit clairement à l'écran) en développement, « indisponible » en production, jamais d'accès
offert par défaut. À fournir par le propriétaire : compte Stripe (clés, secret du webhook, portail client), TVA / Stripe Tax, conditions
générales de vente. **Facturation professionnelle** : au paiement et dans `/compte`, nom de l'entreprise et numéro de TVA intracommunautaire (facultatifs ; un numéro exige le nom), contrôlés par `src/lib/paiement/tva.ts` (forme par pays de l'UE, clé de contrôle française), enregistrés sur le compte (`User.raisonSociale`, `numeroTva`) et transmis à Stripe (client, type `eu_vat`) pour la facture ; Stripe collecte aussi l'adresse de facturation. Le contrôle ne vérifie pas l'existence du numéro au registre VIES. **Gestion depuis `/compte` (demande du propriétaire, 27 octobre)** : le dirigeant **change d'offre** à tout moment (nombre d'agents, agents choisis, mensuel ou annuel ; `PUT /api/abonnement/formule`, mêmes règles que la souscription, effet immédiat ; avec Stripe, `changerFormuleStripe` remplace le prix et le prorata est facturé ou crédité, un prélèvement refusé ne change rien ; en démonstration, base seulement), **se désabonne** (`PUT /api/abonnement/resiliation` : arrêt à la fin de la période payée, agents ouverts jusque-là, sans remboursement, reprise possible avant ; champ `Abonnement.resiliationProgrammee`, relu par `accesOuvert` qui ferme l'accès à la date même si Stripe n'a pas encore prévenu ; le webhook suit `cancel_at_period_end`) et **modifie Mon entreprise** (CA, effectif, mois de création, zone, ville : `PUT /api/compte/dossier`, réponses déjà données conservées). Pendant un arrêt programmé ou un impayé, le changement d'offre est refusé. **Le métier et les activités ne se changent pas ici** (décision produit à prendre : ils changent le questionnaire et les agents permis). **Confirmé par le propriétaire (27 octobre)** : arrêt en fin de période et non immédiat, sans remboursement ; changement d'offre immédiat avec prorata ; **le métier ne se change pas depuis le compte** (décision : non) ; suivi des résiliations faites dans l'espace Stripe ; pas de réabonnement tant que l'accès est ouvert. Non testé contre un vrai compte Stripe (aucune clé dans l'environnement) : les paramètres Stripe sont à essayer en mode test. Contrôle navigateur : `node scripts/controle-compte.mjs`. **Espace abonné** : groupe de routes
`src/app/(espace)/` (en-tête, `/tableau-de-bord` « Mes agents », `/audit/[slug]` avec parcours Objectif → Niveau et contexte →
Questionnaire → Résultats, `/compte`) ; l'objectif reste toujours demandé avant les questions. **Accueil de l'application « Mes agents » (refonte du
27 octobre, demande du propriétaire : continuité exacte avec le site public)** : en-tête construit sur celui du site (même largeur 1 320 px,
même logo, bascule, bouton bordé ; page ouverte en pastille bleutée), hero compact (badge « Votre conseil CAXE » ou « Abonnement actif »,
titre avec un mot accentué immobile `.accent-calme`), cartes d'agents en grille 2 × 2 (`src/components/espace/` : `CarteAgent`, `BadgeStatut`,
`IndicateurProgression`, `etatAudit`) : médaillon agrandi, promesse et trois domaines (`CONSEILS` dans `agent-presentation.ts`, domaines tirés
des blocs réels de `themes.json`), état d'audit tiré de `progressionAgents` sans règle nouvelle (Disponible → « Commencer mon audit » ; Audit en
cours → « Continuer mon audit » avec le pourcentage de questions traitées ; Analyse disponible → « Voir mon analyse », étape Résultats), bouton
principal bleu pour tous les agents ; la couleur de l'agent n'est qu'un accent (médaillon, halo, point, barre). Couleurs d'agents inchangées
(Finance et Comm restent « blanc » ; l'or est proscrit par la charte, le liseré doré vient des portraits). Pas de pastille « Recommandé » : aucune
donnée ne la fonde. Styles : section « Accueil de l'application » de `globals.css` (`.fond-espace`, `.carte-conseil`, `.medaillon-agent`,
`.statut-audit`, `.progression-audit-*`, `.nav-espace-lien`, `.bouton-secondaire`).
**Parcours (construit le 21 octobre ; décisions du propriétaire : paiement immédiat, e-mail et mot de passe seulement,
métier avant la formule)** : `/inscription` (deux champs, plus la confirmation et « Afficher » ; pas de connexion Google) →
`/inscription/metier` (`PUT /api/compte/metier` : métier, activités, stock ; une formule déjà choisie qui ne convient plus
au métier est retirée) → `/formule` (trois cartes côte à côte, mensuel ou annuel, palier 3 « Recommandé », puis choix des agents
sous les cartes, aucun coché d'avance, agents exclus selon le métier ; `POST /api/abonnement`) → `/paiement` (récapitulatif,
facturation professionnelle facultative, **case des conditions générales de vente obligatoire**, enregistrée avec sa date dans
`User.cgvAccepteesLe` ; la route de session la refuse sans elle) → Stripe ou `/paiement/demonstration` → `/paiement/succes`
(« Confirmation en cours », rafraîchie seule) → `/bienvenue` (« Accès CAXE activé », les cinq questions du dossier ;
`PUT /api/compte/dossier`) → `/tableau-de-bord`. **Écran de paiement (21 octobre)** : « Récapitulatif de l'achat » en lignes : abonnement HT, **TVA estimée (20 %, taux français, `TAUX_TVA_ESTIME_POURCENT` dans `offres.ts`)**, total dû ; la TVA affichée n'est qu'une estimation (le montant définitif vient de Stripe Tax, selon le pays et le numéro de TVA du client ; `STRIPE_TAX_AUTOMATIQUE=1` l'active) ; mensuel ou annuel modifiable sur place ; bouton secondaire « Modifier ma formule ». **À confirmer par le propriétaire** : l'affichage d'une TVA estimée. Le compte peut donc exister sans métier ni dossier (colonnes vides en base,
`src/lib/compte.ts`) : `exigerEspaceAbonne` ramène à l'étape qui manque (métier → formule → paiement → dossier), et la
connexion reprend le parcours là où il s'est arrêté. Une formule regardée sur `/offres` suit le parcours comme simple
préférence (`?agents=3&periode=annuel`, `src/lib/formule-url.ts`) ; la page `/offres` mène à `/inscription` pour un visiteur et à
`/formule` pour un compte connecté ; `/activation` redirige vers `/formule`. Le niveau du questionnaire se change depuis
l'audit ; une donnée partagée déjà posée pour un autre agent se modifie depuis n'importe lequel des agents ouverts.
**À fournir ou à construire** : le texte des conditions générales de vente (`/conditions-generales` n'a qu'une page d'attente,
à remplacer avant l'ouverture du paiement réel), la réinitialisation du mot de passe, la vérification de l'adresse e-mail et
les e-mails (rappel d'un dossier non terminé, reçu).
Pas encore construits : « formule suggérée à l'inscription » et « essai d'un agent
non souscrit » (le document ne les détaille pas). **Cookies, politique de confidentialité et mentions RGPD : rédigés par le
propriétaire du produit, à intégrer tels quels ; ne rien écrire à sa place.**

## 11. Données et pilote

Les questionnaires, seuils, croisements, lexique et déclencheurs sont construits
hors du code, métier par métier, puis déposés comme fichiers de données, validés
par un script de contrôle (code, nature, règle ; pas de doublon avec le socle ;
budget de questions ; au moins 2 questions par thème noté ; lexique complet).
Secteur pilote : agence immobilière indépendante (transaction), agent
Acquisition. Fichiers de travail : `CAXE_Themes_Chiffres_4_agents_8.xlsx`
(version du 20 octobre, « 11 » : 181 thèmes, données, croisements, scénarios, déclencheurs,
lexique des 4 agents) et `CAXE_Questionnaire_Grille_Pilote.xlsx` (**pas encore
dans le dépôt**; il utilise encore les types A / B / C : ne pas les reprendre
tels quels).

**Fichiers de données (dossier `data/`)** : `themes.json` (189 thèmes), `donnees-*.json`
(933 données, par agent), `croisements.json` (157), `scenarios.json` (13),
`diagnostic-comm.json` (14 problèmes), `declencheurs.json` (65), `lexique.json`,
`regles-affichage.json` (conditions d'affichage, masquages de thèmes et réponses attendues des
déclencheurs, **écrit à la main** d'après le classeur ; le contrôle échoue si une condition du classeur n'y a pas
de règle ; deux règles sont « à préciser » ; une règle `toujours` pour FIN-05.02), `routage.json` (11 catégories, 8 profils, 149 métiers et 54 activités tirés du document « CAXE — Liste des métiers » du 15 octobre, avec synonymes de recherche, stock oui / non / à demander et agent Comm oui / non / à trancher),
`inscription.json` (questions du dossier d'inscription, avec mots du lexique) et
`banque/questions.json` (557 questions écrites ; 5 autres en attente dans `banque/en-attente.json` : ACQ-26, Fabrication). Les huit premiers viennent du classeur par
`python3 scripts/importer-classeur.py <classeur.xlsx>` ; `routage.json` et `inscription.json` sont écrits
d'après le document de règles et la liste des métiers (`python3 scripts/ecrire-routage-metiers.py` réécrit `routage.json` ; les profils des professions réglementées ajoutées sont déduits et marqués `aConfirmer`). Schémas : `src/lib/donnees/schemas.ts` ; routage : `src/lib/routage.ts` ;
lexique : `src/lib/donnees/lexique.ts` (un mot du lexique s'écrit `{demande}`,
`{nouveau_client}` dans un gabarit ; les formes sont au singulier). Contrôle :
`npm run donnees:controle` (et `npm test`). **Le classeur reste l'outil d'écriture :
on le modifie, on relance l'import, on ne modifie pas les JSON à la main.**

**Décisions du 15 octobre** : prix du palier 4 = 99,99 € HT ; remise annuelle de
15 % conservée (pour engager à l'année) ; portraits illustrés des agents conservés
(l'interdiction de « personnage » vise les prénoms) ; objectif en trois champs.

**Audit d'un agent (étape 4, construit)** : `src/lib/audit/` : `reponse.ts` (les quatre
réponses, règle des 50 %, règle du quart), `objectif.ts` (objectif en trois champs, échéance,
rattachement à un indicateur), `affichage.ts` (règles d'affichage, effectif → taille),
`assemblage.ts` (assemblage par profil, taille, niveau, déclencheurs ; données partagées déjà posées),
`validation.ts` (contrôle serveur des réponses). Tables `ReponseAudit` (réponses du compte, tous agents
confondus) et `User.niveauAudit`. Routes `PUT /api/audit/reponses`, `POST /api/audit/objectif`,
`PUT /api/audit/niveau`. Écran `/audit/[slug]`. Le classeur ne distingue pas encore le socle, le module
catégorie et le module métier : ces trois couches sont assemblées ensemble (par profil). Les données
« importées » (connexions comptabilité, caisse, réseaux) ne sont pas posées : aucune connexion n'existe.
Tant que la banque est vide, l'écran affiche le libellé du classeur, marqué « question à rédiger ».

**Moteur (étape 5, construit)** : `src/lib/moteur/` : `notation.ts` (vert / orange / rouge : la moyenne
du marché est orange, deux sens avec tolérance d'un point, pratique absente / partielle / en place ; choix
du seuil le plus précis par zone et taille), `chaine.ts` (leviers multipliés, jamais additionnés ; deux
leviers sur la même étape = règle à préciser, aucun chiffre ; plafond de capacité à deux chiffres ; période
commune : par jour × jours ouverts × 4,3), `constat.ts` (par thème : masqué, non évalué, contexte, règle
manquante, noté ; seuil sans source = « à valider »). Les seuils vivent dans `data/seuils.json`, **vide** :
aucun seuil de marché n'est écrit dans le classeur ni dans le document, donc tous les thèmes notés sortent
« règle manquante ». Pas encore écrits : impacts chiffrés par thème (formules des croisements, en texte libre
dans le classeur), impact qualifié Bloquant / Frein / Secondaire (« règles fixes » non fournies), règle
d'agrégation quand un thème porte plusieurs indicateurs. Rapport des tests : `docs/rapport-tests-etape-5.md`.

**Réponses typées et banque de questions (construit)** : chaque question a une **spécification de
réponse** (`src/lib/donnees/reponse-spec.ts`) : nombre (unité, bornes), oui / non, choix, cases, liste libre,
texte, mois et année, plusieurs champs, tableau (lignes fixes, issues d'une question de cadrage, d'une liste,
ou libres ; total imposé). Elle vient de la banque (`question.reponse`) ou, à défaut, de ce que le format du
classeur permet de déduire sans ambiguïté (`proposerSpec` : 178 données sur 395) ; les 217 autres (« Choix » sans
liste, plusieurs champs, tableaux) **doivent être définies dans la banque**, sinon saisie libre (au 22 octobre, les questions de la banque portent toutes leur spécification). Le serveur
refuse toute réponse non conforme (`validerReponse`), le navigateur contrôle le même code
(`src/lib/audit/saisie.ts`). **La banque s'écrit dans Excel** : `python3 scripts/exporter-modele-banque.py`
produit `CAXE_Banque_Questions.xlsx` (une ligne par donnée posée, prérempli), `python3 scripts/importer-banque.py
<classeur>` le convertit en `data/banque/questions.json` (contrôle chaque ligne, n'écrit rien s'il reste une
erreur). Les croisements ne sont pas encore exécutables : leurs formules sont en texte libre dans le classeur ;
elles se brancheront sur les réponses typées une fois la banque écrite.

**Références de marché (chantier du 15 octobre, étapes a et b construites)** : seuls les **22 thèmes de nature
Marché** se comparent à un chiffre de marché (les 140 autres n'ont jamais de recherche). `data/catalogue-themes.json`
(écrit par `python3 scripts/ecrire-catalogue-themes.py`) : une fiche par thème, avec pour les thèmes de nature Marché les
indicateurs comparables (36, **validés par le propriétaire le 15 octobre** ; FIN-37, volume absolu, ne se compare pas ; un
indicateur en brouillon n'est jamais cherché). `data/parametres-references.json` : paramètres réglables (tolérance
±10 %, recoupement 20 %, âge des sources 3 / 5 ans, 4 recherches maximum par couple, **mise à jour tous les 3 mois par défaut,
réglable par catégorie de métier**, plafond mensuel de 20 € pour le pilote). Base : `ReferenceMarche` (versions, jamais
supprimées) et `RechercheReference` (journal, verrou, coût). Code : `src/lib/references/` (`types.ts` forme d'une référence,
`cascade.ts` choix de la plus précise : métier + activité + zone + taille, puis métier, puis famille = catégorie, puis
national seulement si l'indicateur l'autorise ; décision de lancer une recherche ; échéances, `contexte.ts` contexte d'un
compte, `depot.ts` lecture en base). Le constat (`moteur/constat.ts`) distingue `aucune_reference`, `reference_disponible`,
`sans_comparaison` et `regle_manquante` (pratique et cohérence : leur règle de notation n'est **pas écrite non plus**) ;
`moteur/affichage-constat.ts` ne montre jamais au client un mot technique. Règle provisoire à confirmer : pour un compte
à plusieurs activités, l'activité par défaut du métier sert de repère. **Étape b (agent de recherche et garde-fous)** : `references/recherche.ts` (demande : métier, indicateur et type de zone
seulement, jamais une donnée du client), `client-anthropic.ts` (API Claude, recherche web côté serveur, modèle réglable dans
`parametresReferences.agentRecherche`), `proposition.ts` (sortie JSON validée), `verification-page.ts` (le serveur relit la page
ciblée : https seulement, pas d'adresse interne, extrait et chiffre retrouvés), `pdf.ts`, `garde-fous.ts` (qualité de source,
exactitude, recoupement, confiance ; le niveau 1 n'est accordé que pour un domaine de `data/sources-reconnues.json`),
`orchestrer.ts` (un couple de bout en bout : plafonds de budget, verrou, journal), `depot-prisma.ts`. Lancer :
`node scripts/references-traiter.mts --indicateur ACQ-10.13 --metier electricien [--dry-run]` (clé `ANTHROPIC_API_KEY`
requise sans `--dry-run`). **Aucune recherche réelle n'a encore été lancée.** **Pas encore construits** : position du client
face au marché et gel par audit (c), mises à jour (d), file de revue et suivi (e).
La valeur du client pour un indicateur calculé n'est pas calculable tant que les formules des croisements sont en texte libre.

**Effets d'actions (19 octobre, partie code construite, aucune recherche réelle lancée)** : `data/catalogue-effets.json` (écrit par
`python3 scripts/ecrire-catalogue-effets.py`) liste six actions **en brouillon**, une par croisement à « part récupérable prudente »
(EFF-ACQ-01 relance des devis XA24, EFF-ACQ-02 complément XA19, EFF-ACQ-03 anciens clients XA17, EFF-ACQ-04 paniers abandonnés XA35,
EFF-COM-01 réseau existant XC33, EFF-RH-01 automatisation XR15) ; aucune ne part en recherche avant validation par le propriétaire. Un effet a la
forme d'un indicateur (période « effet », unité %, bornes 0 à 100) : la chaîne de `src/lib/references/` sert telle quelle (variante de
demande `genre: "effet"` dans `recherche.ts`, enregistrement dans `ReferenceMarche` sous le code EFF-…, même cascade métier puis famille,
jamais national, mêmes plafonds de budget). Lancer : `node scripts/references-traiter.mts --effet EFF-ACQ-01 --metier electricien
[--dry-run]`. `src/lib/effets/potentiel.ts` : le moteur applique le taux sourcé au montant en jeu du client (fourchette), ou, sans taux,
renvoie le seul montant en jeu ; jamais d'addition d'effets. **Pas encore construits** : la liste complète des actions (le catalogue est un
brouillon à valider ; l'IA du rapport choisit parmi ces actions pour obtenir un chiffre, toute autre action reste « sans chiffre
sourcé »), le calcul du montant en jeu (formules des croisements encore en texte libre), l'effet de l'ensemble par recalcul de la chaîne,
l'affichage dans le rapport, la mise à jour périodique. Clé requise : `ANTHROPIC_API_KEY` (variable de l'environnement, jamais dans le dépôt).

**Banque de questions des 4 agents et classeur « 11 » (20 et 21 octobre)** : `data/banque/questions.json` contient **515 questions écrites** (518 avant le retrait de 3 doublons) par le propriétaire
(page « Banque de questions » du 21 octobre, importée par `python3 scripts/importer-banque.py <fichier> --ecarter-inconnues`), rattachées à une donnée « Demandée » ou
« Partagée » du classeur. **47 questions sont mises de côté** dans `data/banque/en-attente.json` (donnée absente du classeur 11 : thèmes ACQ-24 à ACQ-30, COM-62 « Référencement (SEO) » et
COM-63 « Annonces Google (SEA) », plus ACQ-07.15, ACQ-11.38, ACQ-11.39, ACQ-13.12 à 13.14, COM-13.11) ; elles reviennent seules dès que le classeur des 4 agents les contient comme « Demandée » (liste dans
`docs/Ajouts_au_classeur_des_4_agents.xlsx`). **Ajout des données au classeur (validé le 27 octobre, fait)** : 42 des 47 questions sont insérées (classeur corrigé du 27 octobre, lignes marquées « Nouveau ») ; les 5 de ACQ-26 attendent la catégorie Fabrication. Le fichier d'ajouts ne donnait ni la nature, ni l'impact, ni l'étape des 8 thèmes nouveaux (ACQ-24, 25, 27, 28, 29, 30, COM-62, COM-63) : ils sont en **« Contexte »** (non notés, lus par l'IA), étapes « Piloter », « Votre métier » et « Présence et canaux », **à valider par le propriétaire**. Profils et conditions posés par défaut, à valider : ACQ-07.15 posée si « plateformes » est coché (profils de ACQ-07.02) ; ACQ-11.38 restaurant ; ACQ-11.39 e-commerce et restaurant ; COM-13.11 et COM-62 si le dirigeant a un site ; COM-63.02 à .08 si COM-63.01 = oui ; les autres, tous les profils.
La version Excel de la banque (`CAXE_Banque_Questions.xlsx`) est **régénérée à partir de la banque écrite** par `python3 scripts/exporter-modele-banque.py --avec-questions` (questions écrites plus celles en attente en fin de feuille ; réimportée, elle redonne exactement la banque). **La page HTML fait foi** en cas de doute. Le **classeur « 11 »** (`CAXE_Themes_Chiffres_4_agents_11.xlsx`, onglet « Modifications 20 oct. ») est
importé : 181 thèmes (19 nouveaux : FIN-46 à 48, RH-41 à 49, COM-55 à 61), 65 déclencheurs, 157 croisements, 891 données (895 avant la suppression de 4 doublons). **La nature et l'impact des 19 thèmes nouveaux sont des
propositions du classeur, à valider par le propriétaire.** Le lexique vient du classeur seul (`--reporter-lexique` n'est plus nécessaire) : colonne « Clé dans les questions » (champ `cle`
de `lexique.json` quand elle diffère de la clé dérivée du mot), colonne **Location** (8e profil) et 10 lexiques par métier (champ `metiers` de `lexique.json` ; **branchés et validés le 27 octobre** : voir plus bas). Le contrôle (`npm run donnees:controle`) compare la réponse de la banque au format du classeur (avertissement, la banque l'emporte).

**Règles d'affichage du classeur 11 (construit)** : une condition peut lire **la réponse à une donnée** (`ACQ-10.06`, `FIN-10.01#retours_par_mois`, `RH-32.01#demission.departs`),
avec l'opérateur `plus_de` et des blocs imbriqués `tous` / `un` ; `D30` (« avant la première création de contenu ») vaut toujours « non » pendant l'audit (les données COM-57
se posent à la première création de contenu, pas pendant l'audit). Une règle vaut vrai, faux ou **en attente** (réponse manquante : la question attend). **Déclencheurs dérivés** : D03, D17, D21, D22,
D23, D24 et D26 sont la réponse à une question de la banque (forme `reponse_donnee` : D03 → ACQ-03.01, D17 → ACQ-18.02, D21 → COM-10.07, D22 → COM-10.08, D23 → COM-13.10,
D24 → COM-15.12, D26 → COM-39.07) : on ne les pose plus au cadrage, la question se pose dans le questionnaire, et l'écran recalcule les questions à poser après sa réponse.
Les exclusions des professions réglementées s'appliquent aux options de la donnée (ACQ-03.01 : `publicite_en_ligne`, `publicite_locale`, `prospection`, `partenaires`) ; pour ces professions, tous les canaux à risque sont retirés (réseaux sociaux, publicité en ligne et locale, plateformes, annuaires, partenaires, prospection, emailing et SMS, salons et événements, réseaux d'affaires : décision du 21 octobre). **FIN-05.02** (budget marketing et communication par mois) **n'est plus demandée deux fois** (décision du propriétaire, onglet Modifications Y1 du 20 octobre, appliquée le 21) : le détail se demande dans l'Acquisition (ACQ-03.05, 07.01, 07.03, 07.04) et la Comm (COM-32.01, 32.02), la Finance n'a besoin que du total. Règle (décision du propriétaire, 22 octobre) : FIN-05.02 est **toujours posée, mais déjà remplie** quand le détail est connu : si ACQ-07.03, ACQ-07.04 et COM-32.02 ont un chiffre (« je ne sais pas » et « je ne suis pas cette donnée » n'en sont pas), le champ s'affiche avec le total de ACQ-03.05 + ACQ-07.01 + ACQ-07.03 + ACQ-07.04 + COM-32.02 (COM-32.01 reprend les mêmes lignes qu'ACQ : exclue pour ne pas compter deux fois), enregistré tel quel à l'affichage, avec la mention « Rempli d'après vos réponses précédentes » ; le dirigeant le corrige, sa réponse l'emporte. Sans détail complet, le champ est vide. Définition dans `data/prereponses.json`, calcul dans `src/lib/audit/prereponse.ts` (additionne des chiffres donnés, rien d'inventé), contrôlé par `npm run donnees:controle`. **Mise à jour (27 octobre)** : le total enregistré à l'affichage est marqué `ReponseAudit.preremplie` ; il se recalcule à la lecture si le détail change (`reponsesDuCompte`), et ne bouge plus dès que le dirigeant donne ou corrige un chiffre (le serveur revérifie qu'un chiffre « préparé » est bien le total calculé). FIN-05.02 n'a plus d'équivalent (`donneesPrerepondues`) : le détail Comm ne la rendait pas « déjà renseignée » à tort (elle ne s'affichait jamais pré-remplie dès que COM-32.02 était répondue), et le détail reste demandé. Contrôle : `node scripts/controle-prereponse.mjs`. À écrire aussi dans le classeur (colonne « Posée si » : toujours ; pré-remplie par la somme du détail). Deux autres règles sont « à préciser » : « Vente immédiate (commerce) » et « Sans travaux en cours ». Le texte libre accepte 8 000 caractères (COM-44.04).
**Profil location** : Camping, Gîte, Chambre d'hôtes et Location de véhicules sont routés vers ce seul profil (`profilsImposes` du métier dans `routage.json`, posé par
`scripts/ecrire-routage-metiers.py`) ; ACQ-11.31 à 11.37 ne sont posées qu'à lui. **Hôtel** (décision du propriétaire, 20 octobre) : cases à cocher comme les autres métiers à plusieurs activités,
« Hébergement (chambres) » (profil location, par défaut) et « Restaurant de l'hôtel » (profil restaurant, stock oui) ; les deux cochées donnent les deux profils (`profilsImposes` de l'activité).
**Calculs à écrire (absents du classeur, rien n'est inventé)** : ACQ-11.38 taux d'occupation, ACQ-11.39 prix moyen d'une unité vendue, ACQ-11.40 CA perdu par mois, un croisement
location en miroir de XA34, les couverts par mois (ACQ-11.07 × ACQ-11.09 × 4,33), les nombres par canal (ACQ-02.01 × ACQ-03.02 et ACQ-11.01 × ACQ-03.03), les calculs du funnel Comm
(COM-58.03, COM-61.03, COM-39.06) et les formules et croisements des 19 thèmes nouveaux.

**Vocabulaires par métier (validés par le propriétaire le 27 octobre, actifs)** : `data/vocabulaires-metiers.json` (écrit par `python3 scripts/ecrire-vocabulaires-metiers.py`, `valide: true`) dit quel métier ou activité utilise quel vocabulaire (hébergement, location de véhicules, immobilier, projets pour particuliers, vente de biens, négoce, fabrication, cabinet, courses, cuisine en livraison seule) : 47 métiers et 8 activités (les « à confirmer » sont confirmés). **Décisions sur les cas à trancher** : 11 gardent les mots de leur profil (`profilConserve` : syndic, conciergerie saisonnière, agence de voyage, livraison du dernier kilomètre, transport de marchandises, déménagement, autocariste, restauration rapide, pizzeria, recrutement et RH, consultant) ; les 11 professions de santé attendent un vocabulaire **« consultation » dont les mots sont à écrire par le propriétaire** dans le classeur (`aTrancher`), avec les mots du profil en attendant. Règles : un vocabulaire passe avant le profil ; un mot sans forme dans le vocabulaire garde celle du profil ; plusieurs activités cochées = vocabulaire seulement si elles s'accordent ; « Autre » seul = activité par défaut (`metierDuCompte`). Code : `src/lib/vocabulaire.ts` (`vocabulaireDuCompte`), `formuler(…, vocabulaire)` dans `src/lib/donnees/lexique.ts`, champ `vocabulaire` du contexte d'assemblage. Document de validation : `docs/CAXE-vocabulaires-par-metier.pdf` (`node scripts/pdf-vocabulaires.mjs`). Tests : `tests/vocabulaire.test.mts` (aucune question n'apparaît ni ne disparaît, aucun mot manquant). Une nouvelle attribution se décide avec le propriétaire.

**Aperçu interactif du questionnaire (27 octobre)** : la copie de l'application (artefact) ne montre plus une photo du questionnaire : le vrai code (cartes de questions, assemblage, règles d'affichage, validation des réponses, données) est empaqueté par `scripts/apercu/construire.mjs` (esbuild) et tourne dans le navigateur ; seul l'enregistrement est simulé (réponses gardées dans l'onglet, `sessionStorage`). Le calcul de ce que l'écran reçoit est partagé : `src/lib/audit/preparation.ts` sert la page de l'application et l'aperçu. Compte de démonstration : électricien (profil artisan), 4 personnes. À refaire à chaque changement du questionnaire : `APERCU=application SORTIE=<dossier> node scripts/capturer-site.mjs` (serveur lancé avec `RESULTATS_MAQUETTE=1`), puis publier.

**Contrôles des boutons (27 octobre)** : `node scripts/controle-boutons.mjs [--agents ACQ,FIN,RH,COM] [--apercu <dossier>]` exerce chaque question (chiffre exact, estimation, « je ne sais pas », « je ne suis pas cette donnée », « Effacer ma réponse », cases, choix, listes, tableaux, texte, mois, cartes partagées, mise à jour des questions suivantes, rechargement) sur l'application ou sur l'aperçu ; `node scripts/controle-boutons-pages.mjs` exerce les écrans d'un agent (objectif, niveau, étapes, changement d'objectif, résultats, tableau de bord, jour / nuit, déconnexion). Corrections qui en sont issues : « Enregistré » s'affiche aussi en quittant un champ ; un second clic sur « Je ne sais pas » rétablit la saisie valide au lieu de laisser l'écran et l'enregistrement en désaccord.

**Ordre de travail décidé** : les 4 agents d'abord (thèmes, données, croisements,
moteur), puis la **banque de questions** (rédaction finale de chaque question),
puis la connexion des deux. Tant que la banque n'existe pas, rien n'est inventé :
les questions sont marquées manquantes.

## 12. Charte et ton

```css
:root {
  --bg: #07111B;            /* navy */
  --panel: #0B1622;
  --text: #F4ECD8;          /* beige */
  --text-muted: rgba(244,236,216,0.58);
  --text-faint: rgba(244,236,216,0.34);
  --line: rgba(244,236,216,0.14);
  --blue-1: #5B9FEC; --blue-2: #1E4E96;
  --white-1: #FFFFFF; --white-2: #CDD3DA;
  --red-1: #F2686B;  --red-2: #B71C2B;
  --amber-1: #FFD166; --amber-2: #C77D22;
}
```

Titres en **Bricolage Grotesque** (700 à 800, `letter-spacing: 0.02em`), texte en
**Inter**. Accent tricolore bleu / blanc / rouge. **Les dégradés sont réservés
aux jauges et barres de progression**, pas aux formulaires. Rayons : 3 à 4 px
sur les petits éléments, 12 px sur les cartes. À proscrire : l'or #C9A961,
Cormorant Garamond, Playfair Display.

**Mode jour / nuit (demandé par le propriétaire le 21 octobre)** : le thème sombre ci-dessus est la direction artistique
d'origine et reste le thème par défaut ; un thème clair existe, choisi par le bouton soleil / lune présent dans tous les
en-têtes (`src/components/bascule-theme.tsx`). Le choix est gardé dans le navigateur (`localStorage`, clé `caxe-theme`,
`src/lib/theme.ts`) et rétabli avant l'affichage par un petit script du layout, sans éclair. Les couleurs sont des jetons
(`:root` pour le sombre, `:root[data-theme="clair"]` pour le clair, dans `globals.css`) : **ne jamais écrire une couleur en dur,
utiliser les jetons ou leurs canaux** (`rgb(var(--ink) / 0.2)`, `--blue-rgb`, `--red-rgb`, `--green-rgb`, `--amber-rgb`, `--ombre`).
Thème clair : fond `#F7F2E6`, cartes `#FFFDF8`, encre `#07111B` ; bleus, rouges, verts et ambre assombris pour rester lisibles ;
l'agent « blanc » prend l'encre. Le logo existe en deux encres (`Logo`, `public/logo-caxe*-sombre.png`). Les surfaces qui montrent
le produit ou une vidéo (aperçu de l'outil, lecteur vidéo) gardent le thème sombre dans les deux thèmes (`.surface-sombre`).

Ton : **vouvoiement, français de France, sobre et factuel, sans superlatif, sans
point d'exclamation ni émoji.** Le mot « fiable » est accepté (décision du 19 octobre, à propos du prompt de l'agent Acquisition). Un bouton dit ce qui va
se passer. Un écran vide est une invitation à agir. Une erreur explique et
corrige.

## 13. Qualité

Mobile d'abord ; focus clavier visible ; contrastes lisibles ;
`prefers-reduced-motion` respecté ; moteur couvert par des tests ; réponses
sauvegardées en continu (perdre des réponses est un échec produit).

## 14. Règles abandonnées — ne jamais les réintroduire

| Ancienne règle | Remplacée par |
|---|---|
| Score global sur 100 | Avancement vers l'objectif fixé pour chaque agent |
| Types de questions A / B / C | 4 natures de notation (Marché, Pratique, Cohérence, Contexte) |
| Un questionnaire complet par secteur | Banque unique de questions assemblée selon le profil |
| Actions pré-écrites par indicateur | Recommandations générées par l'IA |
| Point d'étape mensuel à date fixe | Point d'étape à l'échéance propre de chaque action |
| Forfait unique / offre à 1 agent | Paliers de 2 à 4 agents |
| Objectif demandé à l'inscription | Objectif demandé au début de chaque agent |
| Agents personnifiés | Noms fonctionnels |

## 15. Points encore ouverts (ne pas trancher seul)

Prompts des agents (décisions du 19 octobre) : le prompt Acquisition (`docs/prompt-agent-acquisition.md`) doit être
mis à jour pour la règle « effet d'une action » (étape « Filtrer et chiffrer » : l'agent ne pose plus d'hypothèse,
il reçoit le taux sourcé et le potentiel calculés par le moteur ; champ « Impact estimé » rempli par le moteur,
ou « pas de chiffre sourcé » ; exemple 1 ; question « 10 points ou +10 % » sans objet) ; les brouillons Finance, RH et Comm sont dans le document « Prompts — Finance, RH et Comm : parties
propres à l'agent (brouillons) » (Claude Docs) ; les couleurs vert / orange / rouge sont gardées pour la phase
d'essai (à supprimer sur demande) ; **la publicité des professions réglementées est le dernier point à trancher
avant la publication du site** (avocat spécialisé ; le propriétaire revient avec le retour de l'avocat : message fixe, liste des canaux, liste des termes interdits).

Seuils « à valider » (test sur 5 à 10 cas réels) ; mini-questionnaire anonyme RH
aux salariés ; connexion Meta pour l'agent Comm ; seuil d'heures par jour
travaillé qui fait passer « dépendance au dirigeant » en Bloquant ; publicité des
professions réglementées (à rouvrir avec un avocat spécialisé).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

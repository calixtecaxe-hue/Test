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

- **L'IA ne produit aucune question, aucune couleur, aucun chiffre.** Elle ne
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
- Deux couches de données : réponses fermées et chiffrées → calcul ; réponses
  ouvertes (facultatives) → contexte pour l'IA, **jamais dans le calcul**.
- **Aucune question codée en dur.** Questions, seuils, croisements, lexique,
  déclencheurs, routage : tout vit dans des **fichiers de données**.
  **Ajouter un métier = déposer un fichier de données, sans toucher au moteur.**
  Si ce n'est pas possible, l'architecture est à revoir.

## 4. Parcours d'un dirigeant (6 étapes)

Inscription → choix de l'agent et objectif → questionnaire assemblé → moteur
(constat, priorité) → rapport et plan par l'IA → suivi. L'IA n'intervient qu'aux
deux dernières étapes, sur un constat déjà calculé.

## 5. Inscription et profil

- **Questions une à une.** Le métier est demandé en premier ; chaque question
  suivante s'affiche déjà formulée avec les mots et l'unité de ce métier
  (lexique). Transition sobre, réduction des animations respectée.
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
  prudente ; « à trancher » = décision ouverte, l'agent reste proposé. Catégorie **Fabrication** : questionnaire
  à créer, l'audit affiche « en préparation ». Ne rien trancher de ces points seul.
- **Routage invisible** : métier → **catégorie** (10, agriculture exclue) →
  **profil** (7 : Rendez-vous, Commerce, E-commerce, Restaurant, Artisan /
  chantier, B2B / cycle long, Abonnement). Le dirigeant ne voit jamais la
  catégorie. Table complète dans le document, partie 3.
- **Lexique** par profil : une question, plusieurs formulations (demande,
  nouveau client, premier achat, capacité, client fidèle), une seule règle de
  notation.
- **Professions réglementées** : socle seulement, aucun module métier, **pas
  d'agent Comm** (3 agents au maximum). L'agent Acquisition ne leur recommande
  ni publicité payante, ni démarchage, ni apporteurs d'affaires rémunérés, et
  n'affiche pas le renvoi vers Comm. **L'audit Acquisition ne leur pose pas non plus** les
  questions correspondantes : pas de question sur la publicité payante (D04), pas de canaux
  « publicité », « prospection » ni « partenaires » (D03), pas de thèmes Prospection active ni
  Partenaires. Liste dans `data/routage.json` (`reglementees.acquisitionExclut`), appliquée à
  l'assemblage et refusée côté serveur.

## 6. Audit d'un agent

- Le dirigeant choisit l'agent qu'il audite. **Première question : son objectif
  pour cet agent**, en **trois champs courts** : ce qu'il veut changer, de
  combien, en combien de temps (exemple affiché : « baisser le turnover de 5 %
  sur les 3 prochains mois »). Chiffre et délai sont utilisés directement. Ce
  qu'il veut changer est rattaché à un indicateur de l'agent quand c'est possible ;
  sinon l'objectif est gardé tel quel et l'avancement se mesure à ce qu'il
  déclare aux points d'étape. **Un objectif par agent**, conservé avec son
  historique.
- **Assemblage en 5 couches** : (1) inscription, (2) socle de l'agent, (3) module
  catégorie, (4) module métier — 5 questions maximum —, (5) filtre taille
  (seul / 2 à 5 / 6 et plus). **Questions déclencheuses** (D01 à D27) qui ouvrent
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
- **Aucun gain projeté (décision du 19 octobre, option A)** : l'IA ne pose aucune hypothèse d'impact et
  n'annonce aucun montant à venir pour une action (« +4 devis, +5 600 € » est exclu). L'effet attendu est écrit
  en mots ; l'avancement vers l'objectif se calcule sur ce que le dirigeant **déclare** au point d'étape
  (exemple du propriétaire : il relance ses devis et signe 3 devis de plus → 3 % de l'objectif atteints, parce
  que c'est réellement arrivé). Le moteur continue de classer les leviers par impact calculé sur les volumes du
  client. Six croisements portent une « part récupérable prudente, à sourcer » (XA17, XA19, XA24, XA35, XC33,
  XR15) : à ne pas afficher tant que le propriétaire n'a pas tranché.
- Suivi : point d'étape à l'**échéance propre de chaque action**, boucle
  d'ajustement, alertes, ré-audit trimestriel, classement sectoriel, historique.
  Gamification discrète. À construire plus tard, dans cet ordre.

## 9. Les quatre agents

Périmètres étanches ; chaque agent donne un **conseil complet avant tout renvoi** ;
un renvoi est un **aperçu** de l'agent manquant, avec ajout en un clic.

| Agent | Sa question | Contenu |
|---|---|---|
| Acquisition & CA | Quels leviers comblent l'écart à l'objectif ? | 23 thèmes en 5 étapes ; reste factuel sur la communication |
| Finance & Rentabilité | L'objectif est-il rentable et finançable ? | 45 thèmes dont un bloc Stock de 9 ; 13 scénarios ; jamais fiscalité ni comptabilité |
| RH & Organisation | L'organisation peut-elle porter l'objectif ? | 40 thèmes en 8 blocs ; verdict Oui / Sous conditions / Pas en l'état ; jamais droit du travail |
| Comm & Création de contenu | La présence en ligne génère-t-elle assez de contacts ? | 54 thèmes en 8 groupes ; deux parcours (amélioration, mise en place) ; qualité notée sur une grille fixe de 6 critères ; pas proposé aux professions réglementées |

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
générales de vente. **Facturation professionnelle** : au paiement et dans `/compte`, nom de l'entreprise et numéro de TVA intracommunautaire (facultatifs ; un numéro exige le nom), contrôlés par `src/lib/paiement/tva.ts` (forme par pays de l'UE, clé de contrôle française), enregistrés sur le compte (`User.raisonSociale`, `numeroTva`) et transmis à Stripe (client, type `eu_vat`) pour la facture ; Stripe collecte aussi l'adresse de facturation. Le contrôle ne vérifie pas l'existence du numéro au registre VIES. Le changement de formule en cours d'abonnement n'est pas ouvert. **Espace abonné** : groupe de routes
`src/app/(espace)/` (en-tête, `/tableau-de-bord` « Mes agents », `/audit/[slug]` avec parcours Objectif → Niveau et cadrage →
Questionnaire → Résultats, `/compte`) ; l'objectif reste toujours demandé avant les questions.
**Parcours** : la formule choisie avant l'inscription voyage dans l'adresse
(`/inscription?agents=3&periode=annuel&choix=…`, `src/lib/formule-url.ts`) et est enregistrée avec le compte à la
création (`POST /api/inscription`, revérifiée comme `/api/abonnement` ; si elle ne convient pas au métier, le compte
est créé sans formule et le dirigeant est renvoyé vers `/activation`). Le niveau du questionnaire se change depuis
l'audit ; une donnée partagée déjà posée pour un autre agent se modifie depuis n'importe lequel des agents ouverts.
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
(version du 14 octobre : 162 thèmes, données, croisements, scénarios, déclencheurs,
lexique des 4 agents) et `CAXE_Questionnaire_Grille_Pilote.xlsx` (**pas encore
dans le dépôt**; il utilise encore les types A / B / C : ne pas les reprendre
tels quels).

**Fichiers de données (dossier `data/`)** : `themes.json` (162 thèmes), `donnees-*.json`
(792 données, par agent), `croisements.json` (157), `scenarios.json` (13),
`diagnostic-comm.json` (14 problèmes), `declencheurs.json` (27), `lexique.json`,
`regles-affichage.json` (conditions d'affichage, masquages de thèmes et réponses attendues des
déclencheurs, **écrit à la main** d'après le classeur ; le contrôle échoue si une condition du classeur n'y a pas
de règle ; trois règles sont « à préciser »), `routage.json` (11 catégories, 7 profils, 149 métiers et 52 activités tirés du document « CAXE — Liste des métiers » du 15 octobre, avec synonymes de recherche, stock oui / non / à demander et agent Comm oui / non / à trancher),
`inscription.json` (questions du dossier d'inscription, avec mots du lexique) et
`banque/questions.json` (vide). Les huit premiers viennent du classeur par
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
liste, plusieurs champs, tableaux) **doivent être définies dans la banque**, sinon saisie libre. Le serveur
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

**Banque de questions de l'agent Acquisition (19 octobre)** : `data/banque/questions.json` contient **37 questions écrites** par le propriétaire (classeur `CAXE_Banque_Questions_3.xlsx`, importé par `python3 scripts/importer-banque.py <classeur> --ecarter-inconnues`). Les 7 questions du profil location (ACQ-11.31 à 11.37) sont dans `data/banque/en-attente.json` : leurs données n'existent pas encore dans le classeur des 4 agents. L'import reporte aussi l'onglet Lexique du classeur dans `data/lexique.json` pour les 7 profils (mots `demandes`, `unites_vendues`, `unites_a_louer`, `jours_ouverture`, `hors_location` ; clé explicite `cle` quand elle ne se déduit pas du libellé) ; le contrôle refuse un mot de lexique inconnu dans une question. **Note « Modifications du 19 octobre » du classeur, pas encore reportée** (elle demande le classeur des 4 agents mis à jour, que je n'ai pas) : lexique par métier (10 lexiques propres à un métier, onglet Routage), profil « location », bloc Stock ouvert à tous les profils, questions devis ouvertes à tous, 17 canaux (D03), données ACQ-11.31 à 11.40 et croisement du profil location, doublons supprimés (ACQ-17.01 calculée).

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
mis à jour pour l'option A (étape « Filtrer et chiffrer », champ « Impact estimé » devenu « Effet attendu »,
exemple 1) ; les brouillons Finance, RH et Comm sont dans le document « Prompts — Finance, RH et Comm : parties
propres à l'agent (brouillons) » (Claude Docs) ; les couleurs vert / orange / rouge sont gardées pour la phase
d'essai (à supprimer sur demande) ; **la publicité des professions réglementées est le dernier point à trancher
avant la publication du site** (avocat spécialisé).

Seuils « à valider » (test sur 5 à 10 cas réels) ; mini-questionnaire anonyme RH
aux salariés ; connexion Meta pour l'agent Comm ; seuil d'heures par jour
travaillé qui fait passer « dépendance au dirigeant » en Bloquant ; publicité des
professions réglementées (à rouvrir avec un avocat spécialisé).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

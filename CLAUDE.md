# CAXE — instructions projet

> **Le document « CAXE — Règles de fonctionnement » (version du 15 octobre 2026) fait foi.** Copie dans le dépôt :
> `docs/regles-de-fonctionnement.md`. En cas de contradiction entre ce document, ce fichier, le code existant ou tes habitudes,
> le document a raison. Ce fichier n'en est qu'un résumé de travail, complété par les décisions prises depuis par le propriétaire
> du produit, chacune avec sa date.

Lis ce fichier en entier avant toute modification. Si une demande contredit les règles, signale-le avant d'exécuter.

**Deux fichiers, deux rôles.**

- **Ce fichier** : ce qu'est CAXE, ses règles, les décisions du propriétaire et ce qui reste à décider (section 15).
- **`docs/etat-technique.md`** : ce qui est construit, dans quels fichiers, avec quelles commandes et quels contrôles. Il est chargé
  avec celui-ci : @docs/etat-technique.md
- **`docs/strategie-lancement.md`** : la stratégie de lancement du propriétaire (promotion seulement), résumée en section 1.

Quand une décision change, mets à jour ce fichier. Quand le code change, mets à jour `docs/etat-technique.md`.

---

## 1. CAXE en bref

Plateforme web d'auto-audit pour dirigeants de TPE/PME, par abonnement, avec quatre agents IA : **Acquisition & Chiffre
d'affaires**, **Finance & Rentabilité**, **RH & Organisation**, **Comm & Création de contenu**.

- Signature : « Un acte, un destin ».
- Concurrent réel : le consultant ou le coach externe. CAXE apporte un conseil de vraie qualité à prix accessible, perçu comme
  sérieux et premium, jamais comme un gadget.
- **Règle fondatrice : le moteur diagnostique, l'IA prescrit.**

### Promotion et lancement

**Deux documents, pour la promotion seulement** : le dossier V2 « Client idéal, contenus & visuels organiques » (20 octobre) et la
« Stratégie de lancement organique » (règles fixées le 23 octobre ; copie : `docs/strategie-lancement.md`). Ils servent **uniquement à
la promotion de CAXE** (règle du 19 octobre) : ne jamais les intégrer aux fichiers de données, au moteur, aux questionnaires ni aux
prompts des agents, qui concernent les clients et leurs entreprises.

**Le dirigeant à convaincre (dossier V2)** :

- fondateur ou gérant qui décide seul : 2 à 30 salariés, 300 k€ à 5 M€ de CA, 2 à 15 ans d'activité ;
- à l'aise avec les outils, idéalement déjà utilisateur d'IA ; pas de DAF, DRH ni directeur commercial ;
- il sent que ça bloque, mais ne sait pas où agir en premier ;
- son vrai concurrent pour CAXE : le consultant ou le coach cher, ou de qualité inégale, pas l'absence d'outil ;
- à ne pas viser en premier : activité tout juste lancée, micro-activité occasionnelle, PME déjà très structurée, dirigeant opposé à
  l'IA.

**Le lancement (règles du 23 octobre)** :

- 0 € de publicité ; un seul réseau, Meta (Instagram et Facebook, groupes Facebook au nom de la Page CAXE) ; marque seule (ni visage
  ni voix du fondateur) ; ni prospection écrite ni démarchage téléphonique ; pas de partenariats au lancement.
- **Achat direct** : ni version gratuite, ni essai, ni mini-diagnostic, ni capture d'e-mail. Des vidéos qui trient (chaque vidéo vise
  un métier, en rotation), une **page de vente dédiée**, puis l'abonnement.
- Objectif de départ : 50 abonnés à J+60, refixé à J+21 sur les vrais chiffres.
- Décisions validées : D1 (tous les métiers, une vidéo = un métier), D2 (Meta), D4 (achat direct), D5 (partenariats plus tard, avec
  des créateurs de la niche). Six restent à valider (section 15).

**Ce que le lancement demande au produit : à faire, rien n'est encore construit.**

1. **Page de vente** dédiée, distincte de la page d'accueil. **Priorité n° 1**, prête à J-14 pour être testée sur 5 dirigeants.
   Contenu : vidéo de 60 à 90 secondes (motion design, vrais écrans, voix de marque) ; pour qui c'est fait et pour qui ça ne l'est pas ;
   exemple chiffré **marqué fictif** (objectif, leviers classés avec leur impact en euros, plan, suivi) ; les 4 agents, une ligne
   chacun ; prix et offre fondateur avec un **compteur réel** ; objections en questions-réponses ; un seul bouton, vers l'inscription
   avec la formule 3 agents déjà sélectionnée (le palier seulement : aucun agent n'est coché d'avance).
2. **Vidéo d'accueil retouchée** : fin « Commencer mon audit » et offre fondateur au lieu de « Recevoir un accès prioritaire », mention
   « exemple fictif » sur les gains affichés, prix à la fin.
3. **Page d'accueil (trois changements validés par le propriétaire le 28 octobre)** : un bouton vers la page de vente ; « Venez les
   essayer » remplacé, puisqu'il n'y a pas d'essai gratuit (texte fixé par le propriétaire au moment de créer la page de vente) ;
   « Nous faisons régulièrement le point » remplacé par « CAXE fait le point ».
4. **Résiliation affichée clairement** sur les offres et au paiement (D10).
5. **Offre fondateur** (D3) et, à partir de J+30, **parrainage** : un mois offert au parrain et au filleul pour chaque nouvel abonnement
   payé.
6. Avant l'ouverture : paiement réel branché, conditions générales de vente, mentions légales et politique de confidentialité en ligne.
7. Pixel Meta et bannière de consentement aux cookies (D9) ; liens de suivi par surface (UTM).
8. À partir de J+30 (D8) : une page par semaine sur caxe.fr pour Google, tirée d'un carrousel, qui finit sur la page de vente.

**Règles de fond des contenus de promotion** (elles valent aussi pour la page de vente et la vidéo) :

- jamais de « score sur 100 » : des leviers chiffrés et l'avancement vers l'objectif ;
- tout cas inventé porte « exemple fictif », avec les mêmes chiffres d'un format à l'autre ;
- **pas de durée d'audit annoncée** tant qu'elle n'est pas mesurée : « à votre rythme, sauvegarde continue » ;
- toujours distinguer « obtenir un diagnostic » de « gagner des clients » ;
- agents sans prénom, représentés par leurs bustes comme sur le site ;
- ni « fiable » ni superlatifs (dans la promotion seulement : le produit et l'IA peuvent employer « fiable ») ; charte du site, pas
  d'or ;
- les professions réglementées et les agences de communication restent hors des messages sur l'agent Comm.

### Page d'accueil (état actuel)

**La direction artistique ne change pas. Le contenu non plus, sauf les trois changements validés le 28 octobre** (point 3 ci-dessus,
pas encore faits). Seuls des boutons de conversion ont été ajoutés :

- « Commencer mon audit » dans l'en-tête ;
- « Fixer mon objectif » après « Comment ça marche » ;
- quatre portes d'entrée dites avec les mots du dirigeant ;
- « Voir les offres » à côté de « Créer un compte ».

Tous les boutons d'appel mènent à la création du compte (`/inscription`) et portent un halo qui respire et un éclat qui traverse,
arrêtés au survol et sous `prefers-reduced-motion`. Seule exception : « Voir les offres ». Dans le héros, « Venez les essayer » est le
seul bouton : il clignote et mène à `/inscription` (le bouton « Créer un compte » du héros a été supprimé à la demande du propriétaire).
Son texte sera remplacé (point 3 ci-dessus).

L'idée d'une page « Audit Express » (le visiteur saisit ses chiffres avant de créer un compte) est **abandonnée** (28 octobre,
section 14).

## 2. Les trois réflexes (à tout moment)

1. Si une demande revient à faire calculer ou juger quelque chose par l'IA, **signale-le avant d'exécuter**.
2. S'il manque un seuil, une question ou une donnée, **ne l'invente pas** : marque-le comme manquant et signale-le.
3. Si une décision engage le produit (pondération, champ d'inscription, périmètre d'un agent, tarif), **demande avant**.

## 3. Architecture : trois couches

| Couche | Qui | Rôle | Ne fait jamais |
|---|---|---|---|
| 1. Questionnaire | Écrit à l'avance, dans une banque de questions | Collecter des données fermées et chiffrées | Être généré par l'IA |
| 2. Moteur | Code déterministe, testé | Couleurs, écarts, impacts, priorités | Appeler l'IA |
| 3. IA | Modèle génératif | Rédiger l'analyse, **prescrire** les recommandations | Recalculer ou réécrire un chiffre |

- **L'IA ne produit aucune question, aucune couleur, aucun chiffre qui ne soit vérifié par le code dans une source citée.** Elle ne
  traite que les indicateurs signalés par le moteur (jamais un « vert » qu'elle jugerait problématique) et reste dans le périmètre de
  son agent : jamais de conseil juridique, fiscal, comptable, médical ni de droit du travail.
- Chaque indicateur porte une `reference_marche` et une `explication`. **Aucun champ « action »** : les recommandations sont générées
  par l'IA à partir de la situation complète (indicateurs faibles et forts avec leur écart chiffré, profil, objectif de l'agent,
  réponses libres, ce qui a déjà été tenté, historique).
- Dynamique permis : choisir, parmi des questions écrites, celles d'un point d'étape ; rédiger le rapport et les relances ; adapter
  légèrement le ton d'une question. Jamais la substance ni la structure.
- Deux couches de données : réponses fermées et chiffrées → calcul ; réponses ouvertes (facultatives) → contexte pour l'IA,
  **jamais dans le calcul**.
- **Aucune question codée en dur.** Questions, seuils, croisements, lexique, déclencheurs, routage : tout vit dans des **fichiers de
  données**. **Ajouter un métier = déposer un fichier de données, sans toucher au moteur.** Si ce n'est pas possible, l'architecture
  est à revoir.

### Chiffre de marché (décision du 15 octobre)

- Un chiffre de marché est **un extrait vérifié par le code dans une source citée**, jamais produit ni recalculé par l'IA.
- Un agent de recherche, séparé de l'IA qui rédige le rapport, le trouve. Le code le contrôle. Il est enregistré en base et réutilisé
  par tous les clients du même profil.
- Le moteur ne lit que ces références ; il n'appelle jamais l'IA.
- Sans référence, le thème s'affiche avec les chiffres du client et sans comparaison au marché. **Un rapport n'est jamais bloqué.**
- Seuls les **22 thèmes de nature Marché** se comparent à un chiffre de marché, par **36 indicateurs comparables validés par le
  propriétaire le 15 octobre** (FIN-37, volume absolu, ne se compare pas). Les autres thèmes n'ont jamais de recherche. Un indicateur
  en brouillon n'est jamais cherché.
- Choix de la référence, de la plus précise à la plus large : métier + activité + zone + taille, puis métier, puis famille
  (catégorie), puis national seulement si l'indicateur l'autorise.
- **Aucune recherche réelle n'a encore été lancée.**

### Effet d'une action (décision du 19 octobre)

- Le rapport dit comment atteindre l'objectif et ce que chaque action peut rapporter, avec recul.
- Le taux d'effet d'une action **dépend du métier** : ce qui vaut pour un secteur ne vaut pas pour un autre.
- Un agent de recherche, séparé de l'IA qui rédige le rapport, le cherche **une seule fois par action et par métier** (jamais à
  chaque rapport : coût inutile). Il propose une fourchette prudente avec sa source (extrait, page, date).
- **Le code relit la page et vérifie que le chiffre y figure.** Sinon, aucun chiffre n'est affiché et l'effet est décrit en mots.
- Le résultat est enregistré en base et réutilisé par tous les clients du même métier : même cascade que les chiffres de marché
  (métier, puis famille, puis national si permis), mêmes plafonds de budget, mise à jour périodique.
- Le **moteur** applique le taux aux volumes du client et calcule l'effet de l'ensemble en recalculant la chaîne. On n'additionne
  jamais les effets de plusieurs actions (6 % + 4 % + 5 % n'est pas 15 %). Si le plan ne suffit pas pour l'objectif, le rapport le dit.
- Le potentiel est toujours présenté comme un potentiel, jamais comme une promesse.
- Sans taux sourcé : « pas de chiffre sourcé » et l'effet en mots. Un rapport n'est jamais bloqué.
- L'IA du rapport choisit parmi les actions du catalogue pour obtenir un chiffre ; toute autre action reste « sans chiffre sourcé ».
- État : la chaîne de recherche et le calcul du potentiel sont construits ; le catalogue des actions est un brouillon ; l'effet de
  l'ensemble et l'affichage dans le rapport ne sont pas construits ; aucune recherche réelle n'a été lancée.

## 4. Parcours d'un dirigeant (décidé le 21 octobre)

Compte (e-mail, mot de passe) → métier et activités → formule et agents → paiement → dossier d'entreprise dans l'application →
choix de l'agent et objectif → questionnaire assemblé → moteur (constat, priorité) → rapport et plan par l'IA → suivi.

- L'IA n'intervient qu'aux deux dernières étapes, sur un constat déjà calculé.
- Décisions du propriétaire : paiement immédiat ; e-mail et mot de passe seulement à la création du compte ; métier avant la
  formule (les agents proposés en dépendent).
- La connexion reprend le parcours là où il s'est arrêté (métier, puis formule, puis paiement, puis dossier).
- Dans un agent : Objectif → Niveau et contexte → Questionnaire → Résultats. **L'objectif est toujours demandé avant les questions.**
- **Pas d'écran de récapitulatif** ni de confirmation des chiffres avant le rapport.

## 5. Inscription, métier et profil

### Questions de l'inscription

- **Questions une à une, en deux temps (21 octobre).** Le compte naît avec l'e-mail et le mot de passe seulement (avec confirmation
  et « Afficher » ; pas de connexion Google). **Le métier et ses activités** se demandent ensuite, **avant la formule**. **Le reste du
  dossier** (CA, effectif, ancienneté, zone, ville) se demande **dans l'application, après le paiement**.
- Chaque question s'affiche déjà formulée avec les mots et l'unité du métier (lexique). Transition sobre, réduction des animations
  respectée.
- Champs : **métier précis**, **activités** (conditionnelles), **CA mensuel** (déclaré, jamais estimé), **nombre de collaborateurs**,
  **ancienneté**, **type de zone** (urbaine dense / périurbaine / rurale), **ville**.
- **L'objectif n'est plus demandé à l'inscription.** Le nombre de ventes et les jours d'ouverture non plus : ce sont des données
  partagées, posées par le premier agent qui en a besoin.
- Montants du dossier (27 octobre) : « 60k » = 60 000, « 1.250,75 » = 1 250,75 ; un chiffre d'affaires négatif est refusé avec une
  explication. Le seuil d'un montant à faire confirmer reste à décider.

### Métiers et activités

- **Liste des métiers** (document « CAXE — Liste des métiers » du 15 octobre) : 149 métiers, dont 16 à plusieurs activités (54
  activités en tout). Recherche par synonymes, **renforcée le 27 octobre** : accents, tirets et majuscules ignorés ; mots de la même
  famille rapprochés (« coiffeuse » → Coiffeur, « boulangerie » → Boulanger-pâtissier, « garagiste » → Garage et mécanicien) ; mot en
  cours de frappe ; nom des activités ; plusieurs mots. Les abréviations et autres noms d'un métier servent à la recherche seulement,
  jamais au routage ; **leur liste est à compléter par le propriétaire**.
- **Activités (sous-variantes)** : elles n'apparaissent **qu'après le choix du métier**, et seulement s'il regroupe plusieurs
  activités (agence immobilière : transaction / gestion locative / syndic / conciergerie saisonnière ; paysagiste : création /
  entretien régulier ; agence de voyage : particuliers / entreprises ou groupes ; agence web, com ou marketing : projets ponctuels /
  contrats mensuels…).
  - **Cases à cocher, plusieurs choix possibles.** Une case → la variante ; plusieurs → le socle une fois, plus le bloc de chaque
    spécialité, sans doublon.
  - **« Autre (précisez) »** : seule, elle applique l'activité par défaut du métier ; le texte est gardé sur le compte.
  - **Hôtel (20 octobre)** : « Hébergement (chambres) » (profil Location, par défaut) et « Restaurant de l'hôtel » (profil Restaurant,
    stock oui) ; les deux cochées donnent les deux profils.
- **« Mon métier n'est pas dans la liste »** : le dirigeant décrit son activité et choisit la catégorie qui y ressemble le plus
  (jamais une profession réglementée).
- **Stock** : si le métier ne le tranche pas, une question oui / non à l'inscription.
- **Le métier et les activités ne se changent pas depuis le compte** (décision du 27 octobre : ils changent le questionnaire et les
  agents permis).

### Routage, lexique et vocabulaires

- **Routage invisible** : métier → **catégorie** → **profil**. Le dirigeant ne voit jamais la catégorie. Table complète : document de
  règles, partie 3.
  - **11 catégories**, dont **Fabrication** (questionnaire à créer : l'audit affiche « en préparation »). L'agriculture est supprimée
    du produit.
  - **8 profils** : Rendez-vous, Commerce, E-commerce, Restaurant, Artisan / chantier, B2B / cycle long, Abonnement, **Location**
    (hébergement et location de véhicules, ajouté le 20 octobre). Camping, Gîte, Chambre d'hôtes et Location de véhicules vont à ce
    seul profil.
- **Lexique par profil** : une question, plusieurs formulations (demande, nouveau client, premier achat, capacité, client fidèle), une
  seule règle de notation.
- **Vocabulaires par métier (validés le 27 octobre, actifs)** : 10 vocabulaires (hébergement, location de véhicules, immobilier,
  projets pour particuliers, vente de biens, négoce, fabrication, cabinet, courses, cuisine en livraison seule) attribués à 47 métiers
  et 8 activités.
  - Un vocabulaire passe avant le profil ; un mot sans forme dans le vocabulaire garde celle du profil.
  - Plusieurs activités cochées : vocabulaire seulement si elles s'accordent. « Autre » seul : activité par défaut.
  - 11 métiers gardent les mots de leur profil : syndic, conciergerie saisonnière, agence de voyage, livraison du dernier kilomètre,
    transport de marchandises, déménagement, autocariste, restauration rapide, pizzeria, recrutement et RH, consultant.
  - Les 11 professions de santé attendent un vocabulaire « consultation », **dont les mots sont à écrire par le propriétaire** ; elles
    gardent les mots du profil en attendant.
  - Une nouvelle attribution se décide avec le propriétaire.

### Agent Comm selon le métier

- Chaque métier ou activité a l'agent Comm : oui, non, ou **à trancher**. Plusieurs activités : la règle la plus prudente.
- « À trancher » = décision ouverte, l'agent reste proposé. **13 métiers ou activités** : finance et assurance (et ses 4 activités),
  formation financée par le CPF, caviste, pharmacie, bureau de tabac, négoce et gros de boissons, brasserie artisanale, café-bar.
  Secteurs où la communication est encadrée, à traiter avec l'avocat.
- **Décisions du 23 octobre** : le photographe a l'agent Comm ; l'agence de communication et de marketing ne l'a pas (elle maîtrise sa
  propre communication).

### Professions réglementées

- Socle seulement, aucun module métier, **pas d'agent Comm** (3 agents au maximum).
- L'agent Acquisition ne leur recommande ni publicité payante, ni démarchage, ni apporteurs d'affaires rémunérés, et n'affiche pas le
  renvoi vers Comm.
- **L'audit Acquisition ne leur pose pas les questions correspondantes** (appliqué à l'assemblage et refusé côté serveur) :
  - pas de question sur la publicité payante (D04) ;
  - dans les canaux (ACQ-03.01), seuls restent bouche-à-oreille, fiche Google, site internet, passage, appels d'offres, réseau ou
    enseigne, et autre. **Décision du 21 octobre : au moindre risque, le canal est retiré** (réseaux sociaux, publicité en ligne et
    locale, plateformes, annuaires, partenaires, prospection, emailing et SMS, salons et événements, réseaux d'affaires). L'IA n'est
    pas assez précise pour être laissée juge en profession réglementée ;
  - pas de thèmes Prospection active ni Partenaires.
- **Rapport des professions réglementées (décision du 21 octobre ; à construire et à faire valider par l'avocat)** : deux zones nettes.
  - **Zone interdite** : publicité sous toute forme, démarchage, prospection, apporteurs d'affaires, partenaires, emailing et SMS vers
    des inconnus, tout canal hors de la **liste fermée** transmise par le moteur (bouche-à-oreille, fiche Google, site internet,
    passage, appels d'offres, réseau ou enseigne). Si le sujet est touché (par l'analyse, une réponse ou un champ libre), l'IA n'écrit
    rien dessus et le rapport affiche un **message fixe**, écrit à l'avance, jamais généré, sous un intertitre identique.
  - **Zone libre** : tout le reste du périmètre de l'agent, sans autocensure.
  - Un doute classe le sujet en zone interdite.
  - **Garde côté code** (l'IA seule ne suffit pas) : le code vérifie le rapport produit et remplace par le message fixe toute section
    qui contient un terme de la liste interdite. Cette liste est un filet, pas une garantie, et se valide avec l'avocat.
  - **Le texte du message fixe est à rédiger par le propriétaire avec l'avocat.** La règle est écrite dans
    `docs/prompt-agent-acquisition.md` (bloc 4) ; le prompt n'est pas encore branché.

## 6. Audit d'un agent

### L'objectif, première question

- Le dirigeant choisit l'agent qu'il audite. **Première question : son objectif pour cet agent.**
- **Acquisition et Finance : trois champs courts** : ce qu'il veut changer, de combien, en combien de temps (exemple affiché :
  « baisser le turnover de 5 % sur les 3 prochains mois »). Chiffre et délai sont utilisés directement. Ce qu'il veut changer est
  rattaché à un indicateur de l'agent quand c'est possible ; sinon, l'objectif est gardé tel quel et l'avancement se mesure à ce qu'il
  déclare aux points d'étape. **Un objectif par agent**, conservé avec son historique.
- **RH et Comm : un objectif par agent, proposé ou personnel (décisions du 22 et du 28 octobre ; option 1B du 28 octobre, qui
  remplace la possibilité de plusieurs objectifs du 27 octobre)**. L'objectif est complet : son chiffre ou sa description, son délai,
  son avancement. Détail, avant / après et tests : `docs/objectifs/objectifs-rh-comm.md` ; décisions : `docs/objectifs/CAXE-decisions-objectifs.pdf`.
  - **D'abord deux choix de même importance, sans présélection (28 octobre)** : « Choisir un objectif proposé » (« Parcourez les
    suggestions adaptées à cet agent. ») et « Écrire mon propre objectif » (« Décrivez le résultat que vous souhaitez obtenir. »).
    Côte à côte sur ordinateur, l'un sous l'autre sur téléphone. L'objectif personnel n'est jamais caché en fin de liste ni présenté
    comme « Autre ».
  - Le premier ouvre les propositions, puis les champs de celle qui est choisie ; le second ouvre directement « Votre objectif », avec
    une aide et un exemple propres à l'agent.
  - **Un seul mode actif.** Le brouillon de l'autre mode est gardé dans la page, jamais transmis. L'état choisi se voit sans la couleur
    (coche, mot « Choisi », bordure épaisse). Au clavier, les flèches passent d'un choix à l'autre.
  - Ensuite, **un chiffre s'il en a un, ou ce qu'il veut constater** (« Comment saurez-vous que c'est atteint ? »), plus le délai en
    mois. **Aucun chiffre n'est suggéré** ; un objectif qui ne s'y prête pas n'a pas de chiffre imposé.
  - **Chaque objectif chiffré a sa question et sa phrase finale écrites à l'avance (28 octobre)**, pour chaque unité proposée : le
    chiffre vient de la saisie (« Combien d'heures par semaine voulez-vous libérer ? » → « libérer 5 heures par semaine pour piloter
    l'entreprise d'ici 3 mois »). Sans chiffre : « clarifier qui fait quoi, d'ici 3 mois », avec la réussite à part.
  - **Une proposition prend toujours le texte de la liste ; un objectif personnel garde le texte du dirigeant**, même s'il ressemble à
    une proposition. L'origine est enregistrée (proposition, personnel) et transmise aux étapes suivantes.
  - Comm, objectif proposé : **« Où en êtes-vous ? »** d'abord (« Améliorer ce que j'ai déjà », 22 objectifs, ou « Mettre en place ma
    présence en ligne », 21 objectifs), puis les propositions de cette partie.
  - **Comm : la partie de l'objectif et le parcours du questionnaire restent séparés (option 6C du 28 octobre).** Le parcours suit la
    réponse à COM-10.07 (« Publiez-vous… ? »). Quand elle correspond à l'autre partie, un message l'explique sous l'objectif et sous la
    question ; rien n'est bloqué ni changé. La correspondance réponse → partie est écrite dans `data/objectifs-agents.json`
    (« parcours »), d'après les règles d'affichage existantes.
  - Une proposition dont tous les thèmes sont masqués pour la taille de l'entreprise n'est pas proposée : un dirigeant seul ne voit
    pas les trois objectifs d'équipe ; « Me faire aider dans mon travail » n'est proposé qu'à lui. **Filtre gardé en attendant le choix
    du propriétaire (point 3A, explication demandée le 28 octobre).**
  - **54 objectifs** : les 52 de la liste du 27 octobre (identifiants et intentions gardés, textes clarifiés le 28 octobre) et deux
    ajoutés le 28 octobre (4a-1 « Libérer du temps pour piloter l'entreprise », 4b-1 « Me faire aider dans mon travail »). **Textes à
    relire par le propriétaire** (`docs/objectifs/CAXE-objectifs-proposes.pdf`).
- Le moteur ne juge pas le réalisme d'un objectif sans chiffre (rien à comparer) ; l'avancement se mesure à ce que le dirigeant déclare.

### Assemblage du questionnaire

- **Assemblage en 5 couches** : (1) inscription, (2) socle de l'agent, (3) module catégorie, (4) module métier (5 questions au
  maximum), (5) filtre taille (seul / 2 à 5 / 6 et plus). Seul l'assemblage est automatique. Le classeur ne distingue pas encore le
  socle du module catégorie : ils sont assemblés ensemble, par profil.
- **Module métier (27 octobre)** : une question du module n'est posée qu'aux métiers ou activités listés dans la colonne « Métiers
  concernés » du classeur. Le contrôle refuse un métier inconnu, une profession réglementée et plus de 5 questions par module.
  - **Validés par le propriétaire** : ACQ-25 (VTC et taxi, coursier, livraison du dernier kilomètre), ACQ-27 (les 17 métiers de gros,
    de distribution et de négoce), ACQ-28 (vente de véhicules, marchand de biens, promoteur immobilier ; ACQ-28.03, reprise et
    financement : véhicules seulement), ACQ-29 (agence immobilière : transaction, location, immobilier d'entreprise).
  - En attente : ACQ-26 (Fabrication), avec la catégorie.
  - Restent ouverts : transport de marchandises (ACQ-25), constructeur de maisons individuelles (ACQ-28), gestion locative (ACQ-29).
- **Questions déclencheuses** (D01 à D65) : elles ouvrent ou masquent des blocs.
  - Une déclencheuse qui est la réponse à une question de la banque se pose dans le questionnaire, pas au cadrage : D03, D17, D20 à
    D26. D27 lit RH-08.01 et D13 lit RH-28.01 (28 octobre : c'étaient deux questions posées deux fois).
  - D30 (« avant la première création de contenu ») vaut toujours « non » pendant l'audit : les questions COM-57 se posent à la
    première création de contenu.
- **Préalables** : une question d'un autre agent dont dépendent des tableaux ou des conditions (types de clients ACQ-01.01, canaux
  ACQ-03.01) est posée en « Pour commencer » par le premier agent qui en a besoin, avec sa réponse si elle existe. Un tableau dont les
  lignes viennent d'un cadrage fait poser ce cadrage. La question qui décide du masquage de son propre thème reste posée (COM-10.07).
- Le nombre de questions annoncé au choix du niveau est un maximum (« jusqu'à N questions, selon vos réponses »).
- Le niveau (essentiel / approfondi) se change depuis l'étape « Niveau et contexte ». La ligne « Niveau du questionnaire… Passer en
  essentiel » en tête du questionnaire a été retirée à la demande du propriétaire (27 octobre), comme la note « Aperçu : … » de la
  copie de l'application.
- En haut du questionnaire, avant les questions de cadrage : l'en-tête « Votre questionnaire » (« Aucune question n'est
  obligatoire… »), sans compteur (27 octobre).

### Durée et reprise

- Durée visée : **1 h à 1 h 15 par agent**. **Jamais à faire d'une traite** : sauvegarde continue, reprise possible à tout moment.
- Sans réseau, la réponse attend dans la page et repart seule au retour du réseau (27 octobre). Perdre des réponses est un échec
  produit.

### Les réponses

- **Quatre réponses pour un chiffre** :
  - exact ;
  - estimation ou fourchette : le moteur prend le milieu, marqué « estimé » ;
  - « je ne sais pas » : retiré du calcul, question de repli, complétable plus tard ;
  - « je ne suis pas cette donnée » : retiré du calcul, enregistré comme absence de suivi, conseil pour commencer à la suivre.
- **0, inconnu et non applicable sont distincts.** **Aucune question obligatoire.**
- Au-delà d'**un quart des données essentielles** en « je ne suis pas cette donnée », un conseil général de pilotage est ajouté, **sans
  remplacer** les autres.
- **Réponses actives (28 octobre).** Une réponse devenue inapplicable (question fermée par une autre, thème masqué, taille, case d'un
  canal décoché, sous-question de cadrage qui n'est plus posée comme D12 « déjà en service ? » après « non ») reste en base mais ne
  compte plus : ni dans les conditions, ni dans le calcul, ni dans l'avancement, ni dans le total pré-rempli. Elle revient si le
  dirigeant revient à son premier choix.
- Une question de cadrage répondue peut être effacée (« Effacer ma réponse »), comme les autres. Un second clic sur « Je ne sais
  pas » ou « Je ne suis pas cette donnée » l'annule.
- **Option « aucun » exclusive (27 octobre)** : une option « Aucun… », « Aucune… » ou « Rien… » se coche seule. Ajoutée à COM-10.03
  (« Aucun »), COM-56.02 (« Rien de particulier »), RH-03.03 (« Aucune demande de ce type ») et RH-09.02 (« Aucune urgence de ce
  type ») : **libellés à valider**. Pas ajoutée là où « aucun » n'a pas de sens ou quand la question n'est posée qu'à qui a la chose
  (canaux, jours d'ouverture, réseaux où vous publiez, moyens de recrutement, demandes d'avis, ton, langues, contenus voulus, forme
  d'aide qui a « Pas encore décidé »).
- **Bornes (28 octobre)** : tout nombre a un minimum et toute part en % a des bornes. Seuls le résultat de l'année (FIN-05.04) et la
  trésorerie (FIN-11.01) peuvent être négatifs.
- Un message d'erreur nomme la ligne d'un tableau comme l'écran, jamais par un identifiant technique.
- **Listes (« Ajouter un élément », 28 octobre)** : chaque élément a un bouton « Retirer », pour enlever un élément ajouté par
  erreur. Le dernier champ n'est pas retiré, il est vidé. Les tableaux dont les lignes viennent de la liste perdent la ligne.

### Données partagées et périodes

- **Données partagées enregistrées sur le compte dès qu'elles sont posées, quel que soit l'agent**, jamais redemandées, modifiables
  par le dirigeant depuis n'importe lequel des agents ouverts : mini-bloc « temps du dirigeant », nombre de ventes et jours
  d'ouverture, objectif de croissance du CA, masse salariale, budget marketing, abonnés, canaux. Même niveau (essentiel / approfondi)
  chez tous les agents qui les utilisent. Pas de double comptage.
- **Ce qui est une donnée partagée (audit final du 29 octobre, `data/partages.json`).** La colonne « Données utilisées » du classeur
  mêle la même question chez un autre agent et des données qui servent seulement à la calculer. Trois cas :
  - **jumelles** : même texte, même réponse ; une réponse vaut pour toutes (une jumelle de ma jumelle est ma jumelle) ;
  - **correspondances partie à partie** : un champ, une colonne ou une ligne de tableau d'une question est la réponse d'une autre
    (COM-32.01 et ACQ-07.01, 07.03, 07.04 ; COM-12.01 et ACQ-03.02 à 03.04 ; FIN-34.02, COM-43.01 et ACQ-20.02 ; RH-16.01, FIN-10.01
    et FIN-10.03). Entièrement connue ailleurs, la question n'est pas reposée ; connue en partie, elle s'affiche avec les valeurs
    reprises, à vérifier et compléter, sans rien enregistrer à la place du dirigeant ;
  - **pas des partages** : six liens où une donnée sert au calcul de l'autre (capacité et heures, couverts et ventes, demandes et
    visites du site, avis Google et plateforme) ; les deux questions sont posées. Demandes (ACQ-02.01) et visites du site (COM-13.01)
    restent la même donnée pour une boutique en ligne, où ACQ-02.01 se lit « visiteurs de votre site ».

  Le contrôle des données refuse un lien du classeur entre deux questions différentes qui n'est pas décrit dans ce fichier.
- **Jamais deux périodes mélangées dans un calcul.** CA au mois ; ventes dans l'unité du métier, ramenées au mois par le moteur avec
  les jours d'ouverture (par jour × jours ouverts par semaine × 4,3). Le nombre de ventes compte les achats, pas les articles.

### Historique et évolutions (28 octobre)

Vérification et règles détaillées : `docs/verification/historique.md`.

- **Chaque question dit sa période**, et l'écran écrit les mois exacts sous la question (« Période : juillet à septembre 2025, les
  mêmes mois un an plus tôt. »). Mois complets seulement : le mois en cours n'est jamais compris. La période vient de la colonne
  « Période » du classeur, dans un vocabulaire que le code lit et que le contrôle des données vérifie.
- **Périodes comparables seulement** :
  - 3 derniers mois face aux mêmes 3 mois un an plus tôt (ou 6 mois plus tôt) ;
  - 12 derniers mois face aux 12 mois précédents ;
  - dernier mois face au même mois un an plus tôt ;
  - aujourd'hui face à il y a 12 mois.

  Jamais un mois face à une année, une année incomplète face à une année complète, ni deux définitions ou deux périmètres
  différents.
- **Entreprise jeune** : aucune question sur des mois antérieurs à la création. Une question sur le passé est masquée tant que
  l'entreprise n'a pas l'âge de la période demandée (par exemple 15 mois pour « les mêmes 3 mois, un an plus tôt »). « Les 12 derniers
  mois » devient « depuis la création ». Un tableau mois par mois ne montre que les mois écoulés depuis la création.
- **Ajouts du 28 octobre**, chacun justifié par une analyse prévue (`historique.md`, section 4) :
  - le chiffre d'affaires des 12 mois précédents (ACQ-23.03) passe au niveau essentiel et est partagé avec la Finance (FIN-14.03) ;
  - ventes des 12 mois précédents (ACQ-23.12) ;
  - changement de périmètre sur 24 mois (ACQ-23.13 = FIN-14.04) ;
  - effectif il y a 12 mois (FIN-07.17).

  **Aucune question historique n'est ajoutée par principe.**
- **Une évolution compare l'entreprise à elle-même.** Elle se distingue de l'avancement vers l'objectif et du repère de marché, et
  n'est jamais remplacée par l'un d'eux.
  - Écart dans l'unité, et en % ; en points pour un taux. Pas de % quand la valeur passée vaut 0, et l'écran le dit.
  - Une fourchette compte pour son milieu, marquée « estimée ». Une case vide, « je ne sais pas » ou une réponse inapplicable ne
    valent jamais zéro : l'évolution est « pas encore possible », avec ce qui manque.
  - Si le périmètre a changé entre les deux périodes : « non comparable », sans pourcentage.
  - Les deux réponses doivent avoir été données le même mois. Une réponse plus ancienne est signalée sous la question, et un tableau
    mois par mois replace chaque montant en face de son vrai mois.
  - **Aucun jugement ni couleur** sur une évolution : aucune règle ne la fixe (section 15).
- Les évolutions calculées sont décrites dans `data/evolutions.json`, écrit à la main d'après le classeur. Chaque donnée
  « Évolution… » du classeur y est calculée, ou listée avec la raison pour laquelle elle ne l'est pas.

### Tableaux

- **Lignes réglables (27 octobre)** :
  - tableau à **lignes numérotées** (« Offre 1, 2, 3 », « Client 1… 5 ») : jusqu'à **10 lignes par groupe**, et jusqu'à **une** au
    minimum ;
  - tableau à lignes **libres** : jusqu'au maximum de la banque ;
  - tableau qui **reprend les lignes d'un autre** (« chacune de ces offres », « vos 5 plus gros clients ») : il les **suit** (noms
    repris, ligne retirée à l'origine retirée aussi) ; sans réponse à l'origine, il garde ses propres lignes ;
  - tableau dont les lignes viennent d'une autre réponse (canaux, jours, types de clients, réseaux) : les lignes se règlent **dans
    cette question**, montrée dans la carte du tableau tant qu'il n'a pas de lignes ;
  - tableau à **catégories fixes** (tranches, mois, délais, postes) : il garde ses lignes ; une ligne qui ne concerne pas le
    dirigeant reste vide.
- **Tableau à total imposé** (19 tableaux ; un total peut porter sur plusieurs colonnes, comme COM-12.01) : il ne s'enregistre comme
  réponse que si le total est juste. La saisie partielle est gardée en **brouillon sur le compte** (23 octobre) : elle suit le
  dirigeant d'un appareil à l'autre, le calcul l'ignore, elle est supprimée dès que la réponse complète est enregistrée.
- **Répartition à refaire (28 octobre)** : une répartition dont une ligne est ajoutée ou retirée ne compte pas tant que le total n'est
  pas de nouveau juste. Un message le dit ; **rien n'est redistribué**.
- Dans un tableau ou un groupe de champs, un oui / non se répond par deux boutons (second clic = effacer).

### Doublons, réponses déduites et pré-remplies

- **Ne sont pas des doublons (27 octobre)** : les questions faites exprès pour des statistiques ou des calculs (tendances « il y a 6 /
  12 mois », répartitions par canal ou type de client, contrôles de cohérence comme ACQ-01.05 contre COM-02.01, paires qui alimentent
  deux calculs comme ACQ-17.06 pour XA17 et COM-15.01 pour XC10).
- **Retirées du classeur (27 octobre)** : RH-41.04 et RH-41.05 (couvertes par RH-42.01), ACQ-09.04 (voisine d'ACQ-12.01), ACQ-22.08
  (fusionnée dans ACQ-22.07, que lisent désormais XA34 et XA42), ACQ-24.01 (redemandait l'objectif de l'agent Acquisition).
  ACQ-24.02 (heures et budget disponibles) est gardée.
- **COM-03.01 et COM-04.01 sont deux questions distinctes (27 octobre)** : COM-03.01 garde le résultat promis ; COM-04.01 ne demande
  plus que la preuve, le délai et l'effort demandé. **Le texte reformulé de COM-04.01 est une proposition à valider.**
- **Réponse déduite** : COM-13.10 « Avez-vous un site internet ? » vaut « oui » et n'est pas posée quand « Site internet » est coché
  dans les canaux (ACQ-03.01). Depuis les réponses actives, un « non » donné avant de cocher le canal ne compte plus : le canal coché
  l'emporte (**à confirmer**, section 15).
- **Budget marketing de la Finance (FIN-05.02)** : posé une seule fois en total (décision du 20 octobre, appliquée le 21) ; le détail
  se demande dans l'Acquisition (ACQ-03.05, 07.01, 07.03, 07.04) et la Comm (COM-32.01, 32.02). **Règle du 22 octobre** :
  - FIN-05.02 est toujours posée, mais **déjà remplie** quand le détail est connu, c'est-à-dire quand ACQ-07.03, ACQ-07.04 et
    COM-32.02 ont un chiffre (« je ne sais pas » et « je ne suis pas cette donnée » n'en sont pas) ;
  - le total = ACQ-03.05 + ACQ-07.01 + ACQ-07.03 + ACQ-07.04 + COM-32.02 (COM-32.01 reprend les mêmes lignes qu'ACQ : exclue pour ne
    pas compter deux fois), avec la mention « Rempli d'après vos réponses précédentes » ;
  - le total suit le détail tant que le dirigeant ne l'a pas corrigé ; sa réponse l'emporte ;
  - sans détail complet, le champ est vide ; le détail reste demandé.
  - À écrire aussi dans le classeur (colonne « Posée si » : toujours ; pré-remplie par la somme du détail).

### Compte rendu (étape « Résultats », décisions du 22 octobre)

- Trois onglets : objectif, priorités, plan d'action. Ouvert dès que le niveau est choisi (étape « 4 Résultats » cliquable). Branché
  sur le vrai moteur pour ce qui existe. **Le compte rendu est en conception par le propriétaire.**
- **Rien n'est inventé** : tant que les seuils de marché sont vides et que les règles de notation Pratique et Cohérence ne sont pas
  écrites, aucun thème n'est noté (« sans repère de marché »). Le réalisme de l'objectif, la réponse de l'agent, l'ordre de priorité,
  l'impact et le plan d'action (IA non branchée) disent « pas encore » au lieu d'un chiffre. Avancement : 0 % tant qu'aucun point
  d'étape n'existe.
- Une **maquette à chiffres fictifs** sert à valider la forme finale (bannière « Exemple de présentation »). Ses libellés de réalisme
  (Réaliste / Réaliste sous conditions / Pas réaliste en l'état) sont des **propositions à valider** ; pas de verdict pour un objectif
  sans chiffre.

### Rédaction des questions

- Pas de question rhétorique, pas de réponse glissée dans la question, langage simple, question conditionnelle en deux temps.
- **Les textes qui annoncent un nombre** (« vos 3 offres principales », « vos 5 plus gros clients », « vos 2 concurrents ») alors que
  les lignes sont réglables **sont à revoir par le propriétaire.**

## 7. Moteur

**Étage 1, le constat.** Chaque thème est noté vert / orange / rouge selon **une seule** nature :

- **Marché** : chiffre face au secteur, référence sourcée ;
- **Pratique** : absente / partielle / en place ;
- **Cohérence** : les réponses tiennent ensemble ;
- **Contexte** : non noté, sert à l'IA.

**Étage 2, la priorité.** Impact **chiffré** quand le thème est sur une vraie chaîne de calcul vers l'objectif (surtout
Acquisition, une partie de Finance) ; sinon impact **qualifié** (Bloquant / Frein / Secondaire) par règles fixes. **Le moteur
n'invente jamais un pourcentage.** Les impacts chiffrés sont calculés sur les volumes du client, jamais sur une moyenne générique.

**Plusieurs leviers : on recalcule toute la chaîne, on n'additionne jamais les gains.** Deux leviers d'étapes différentes se
multiplient ; deux leviers sur la même étape se partagent les mêmes clients. La capacité plafonne le gain immédiat : quand elle
bloque, deux chiffres (gain immédiat, gain une fois la capacité augmentée).

**Seuils.**

- La moyenne du marché est **orange**, le vert est au-dessus.
- Indicateur à deux sens : fourchette verte, orange à moins d'un point, rouge au-delà.
- Noté seulement si le résultat dépend surtout de l'entreprise (sinon Contexte). Préférer l'acquisition maîtrisable au hasard.
- Seuils segmentés par zone et taille. **Sans source, « à valider ».** Hypothèse extérieure sourcée ou valeur basse annoncée.
- Indicateur croisé dépense / résultat plutôt qu'une dépense seule.

**Robustesse.**

- Question sautée retirée du calcul (jamais zéro).
- **Thème noté seulement si au moins 50 % de réponses**, sinon « non évalué » (« je ne sais pas » et « je ne suis pas cette donnée »
  comptent comme sans réponse).
- Thème qui ne s'applique pas à la taille : **masqué**, pas « non évalué ».

**Croisements et scénarios** : calculs combinant plusieurs réponses, avec codes de données, profils concernés, hypothèse éventuelle et
phrase de rapport.

Le moteur est **couvert par des tests**.

**Pas encore écrits (rien n'est inventé)** : les seuils de marché (`data/seuils.json` est vide : aucun seuil n'est écrit dans le
classeur ni dans le document), les règles de notation Pratique et Cohérence, les impacts chiffrés par thème (les formules des
croisements sont en texte libre dans le classeur), les « règles fixes » de l'impact qualifié, la règle d'agrégation quand un thème
porte plusieurs indicateurs, et la règle de deux leviers sur la même étape.

## 8. Objectif, plan d'action, suivi

- Le chiffre principal est **l'avancement vers l'objectif** fixé pour chaque agent. Le vert / orange / rouge par thème reste, pour
  montrer les leviers. **Aucun score global sur 100.** Le moteur vérifie si l'objectif est réaliste ; le rapport le dit honnêtement.
- **Un bloquant change l'ordre du plan, jamais son contenu** : l'IA donne toutes ses recommandations.
- **Le plan suit le temps réellement disponible du dirigeant** (heures par jour travaillé). Les actions qui libèrent du temps passent
  en premier ; les autres sont programmées après (« à lancer une fois 6 h libérées »). Augmenter la capacité ne se résume jamais à
  « libérez du temps » : tâches à déléguer, automatiser ou supprimer, puis recrutement.
- **Tour « ce que vous avez déjà tenté »**, après le premier calcul, sur les 5 ou 6 axes faibles seulement (rien / en place et ça
  marche / sans résultat / pas tenu dans la durée). Ces réponses n'entrent jamais dans le calcul.
- **Effet attendu et avancement réel (19 octobre)** : l'IA ne choisit jamais un pourcentage ni un montant. L'effet potentiel d'une
  action vient d'un taux sourcé et vérifié par le code (section 3), appliqué par le moteur aux volumes du client ; sans taux sourcé,
  l'effet est écrit en mots. L'**avancement** se calcule uniquement sur ce que le dirigeant **déclare** au point d'étape (exemple du
  propriétaire : il relance ses devis et signe 3 devis de plus → 3 % de l'objectif atteints, parce que c'est réellement arrivé). Le
  moteur classe les leviers par impact calculé sur les volumes du client.
- Six croisements portent une « part récupérable prudente, à sourcer » (XA17, XA19, XA24, XA35, XC33, XR15). Tant qu'un taux sourcé
  n'est pas disponible, ils affichent le montant en jeu (par exemple les devis sans réponse × leur montant moyen), jamais un gain.
- Suivi, à construire plus tard, dans cet ordre : point d'étape à l'**échéance propre de chaque action**, boucle d'ajustement,
  alertes, ré-audit trimestriel, classement sectoriel, historique. Gamification discrète.

## 9. Les quatre agents

Périmètres étanches ; chaque agent donne un **conseil complet avant tout renvoi** ; un renvoi est un **aperçu** de l'agent manquant,
avec ajout en un clic. Agents nommés par leur fonction, **sans prénom ni personnage**. Les portraits illustrés sont conservés
(décision du 15 octobre : l'interdiction de « personnage » vise les prénoms).

| Agent | Sa question | Contenu (189 thèmes au total) |
|---|---|---|
| Acquisition & CA | Quels leviers comblent l'écart à l'objectif ? | 29 thèmes : 23 en 5 étapes, plus 6 ajoutés le 27 octobre (dont 4 modules métier) en « Contexte », à valider. Reste factuel sur la communication |
| Finance & Rentabilité | L'objectif est-il rentable et finançable ? | 48 thèmes, dont un bloc Stock de 9 ; 13 scénarios. Jamais fiscalité ni comptabilité |
| RH & Organisation | L'organisation peut-elle porter l'objectif ? | 49 thèmes en 8 blocs ; verdict Oui / Sous conditions / Pas en l'état. Jamais droit du travail |
| Comm & Création de contenu | La présence en ligne génère-t-elle assez de contacts ? (document de règles ; périmètre clarifié le 28 octobre, ci-dessous) | 63 thèmes : 61 en 8 groupes, plus COM-62 (référencement) et COM-63 (annonces Google) du 27 octobre, en « Contexte », à valider. Deux parcours (amélioration, mise en place) ; qualité notée sur une grille fixe de 6 critères. Pas proposé aux professions réglementées |

### Périmètre de l'agent Comm et coordination avec l'Acquisition (décision du propriétaire du 28 octobre)

- **L'agent Comm conseille sur l'acquisition de clients obtenue grâce à la communication**, notamment : les canaux et les contenus ;
  le funnel et le parcours de conversion liés à la communication ; les dispositifs à mettre en place ; l'amélioration des actions et
  des supports existants. Il ne se réduit pas à la visibilité ni à la prise de contact : un objectif d'acquisition ou de funnel est
  pertinent quand il repose sur des leviers de communication.
- **L'agent Acquisition travaille sur les processus internes d'acquisition** de son périmètre : réactivité, rendez-vous, devis et
  relances commerciales, transformation, prix, panier, fidélisation, pilotage commercial.
- Cette clarification remplace la phrase du document de règles « son funnel […] s'arrête là où commence celui de l'agent
  Acquisition, au moment où quelqu'un devient un contact identifié » (correction du document : section 15, « À fournir »). Les
  données du classeur la suivaient déjà (demandes et clients venus de la communication COM-22.02, contacts devenus clients COM-21.06,
  personnes intéressées relancées devenues clientes COM-61.02).
- **Coordination** :
  - une donnée commune aux deux agents est posée une seule fois (données partagées, section 6) ; les paires gardées exprès pour un
    calcul ou un contrôle de cohérence ne sont pas des doublons (relecture du 27 octobre) ;
  - quand un sujet touche les deux agents, chacun parle de ses leviers : relancer les personnes qui ont réagi ou écrit sans demander
    de devis (COM-61) relève de la Comm ; relancer un devis envoyé (ACQ-10) relève de l'Acquisition ;
  - les deux rapports lisent les mêmes chiffres calculés par le moteur, sans les recalculer ; un agent ne recommande rien sur les
    leviers de l'autre et y renvoie (aperçu de l'agent manquant, comme aujourd'hui).
  - **À écrire dans les prompts des agents** quand ils seront branchés (section 15, point 10) ; aucune règle de prompt n'est branchée
    aujourd'hui.

## 10. Abonnement et compte

### Offres

- Paliers mensuels : **2 agents 59,99 € HT, 3 agents 79,99 € HT, 4 agents 99,99 € HT. Pas d'offre à 1 agent.** Le document de règles
  indique 109,99 € pour 4 agents : c'est une erreur, le prix retenu est 99,99 € (confirmé par le propriétaire). À corriger dans le
  document.
- Remise annuelle de 15 % conservée, pour engager à l'année (15 octobre). Le texte annuel compare des montants du même rythme :
  « Soit 50,99 € HT / mois, au lieu de 59,99 € HT / mois en facturation mensuelle » (le prix principal est le montant à l'année).
- Badge « Recommandé » sur le palier 3. **Aucun agent coché d'avance.** Agents exclus selon le métier.
- Pas encore construits : la « formule suggérée à l'inscription » et l'« essai d'un agent non souscrit » (le document ne les détaille
  pas).

### Accès et paiement

- L'accès aux agents est **un droit attaché au compte**, contrôlé à chaque entrée d'agent (page comme API). Il **exige un abonnement
  en cours**, ouvert jusqu'à la fin de la période payée après un impayé ou une résiliation.
- Le prix est toujours recalculé côté serveur.
- Paiement par Stripe. **Sans clé Stripe** : mode démonstration (aucun paiement, dit clairement à l'écran) hors production,
  « indisponible » en production, **jamais d'accès offert par défaut**. Rien n'a été essayé contre un vrai compte Stripe.
- Écran de paiement (21 octobre) : abonnement HT, **TVA estimée à 20 %** (taux français ; le montant définitif vient de Stripe Tax,
  selon le pays et le numéro de TVA du client ; **affichage à confirmer**), total dû ; mensuel ou annuel modifiable sur place ;
  « Modifier ma formule ».
- **Case des conditions générales de vente obligatoire**, enregistrée avec sa date.
- Facturation professionnelle (facultative) : nom de l'entreprise et numéro de TVA intracommunautaire ; un numéro exige le nom. La
  forme du numéro est contrôlée (pays de l'UE, clé de contrôle française), pas son existence au registre VIES.

### Gérer son abonnement depuis « Mon compte » (27 octobre, confirmé par le propriétaire)

- **Changer d'offre** à tout moment (nombre d'agents, agents choisis, mensuel ou annuel) : mêmes règles qu'à la souscription, effet
  immédiat, prorata facturé ou crédité ; un prélèvement refusé ne change rien.
- **Se désabonner** : arrêt à la fin de la période payée, agents ouverts jusque-là, sans remboursement, reprise possible avant.
- Pendant un arrêt programmé ou un impayé, le changement d'offre est refusé. Pas de réabonnement tant que l'accès est ouvert. Les
  résiliations faites dans l'espace Stripe sont suivies.
- **Modifier Mon entreprise** (CA, effectif, mois de création, zone, ville) ; les réponses déjà données sont conservées.
- Le métier ne se change pas ici (section 5).

### Mot de passe et e-mails

- **Mot de passe oublié (27 octobre)** : même réponse qu'un compte existe ou non ; trois demandes par compte et par heure au plus ;
  lien valable une heure et une seule fois ; nouveau mot de passe avec la même règle qu'à l'inscription ; connexion directe ; les
  autres demandes annulées et **les sessions ouvertes avant fermées**.
- Un mot de passe n'est jamais gardé en clair (empreinte bcrypt) : personne ne peut le lire, on ne peut que le remplacer.
- E-mails par SMTP. Sans SMTP : mode démonstration hors production (rien ne part), **aucun envoi en production**.
- À construire : vérification de l'adresse e-mail, autres e-mails (rappel d'un dossier non terminé, reçu).

### Textes juridiques

- **Conditions générales de vente : rédigées par le propriétaire avec un avocat.** La page actuelle est une page d'attente, à remplacer
  avant l'ouverture du paiement réel.
- **Cookies, politique de confidentialité et mentions RGPD : rédigés par le propriétaire, à intégrer tels quels ; ne rien écrire à sa
  place.**

### Espace abonné

- « Mes agents » (refonte du 27 octobre) : **continuité exacte avec le site public** (même en-tête, même logo, même largeur). Cartes
  d'agents en grille 2 × 2 : promesse, trois domaines, état de l'audit (Disponible → « Commencer mon audit » ; Audit en cours →
  « Continuer mon audit » avec le pourcentage de questions traitées ; Analyse disponible → « Voir mon analyse »). Bouton principal
  bleu pour tous ; la couleur de l'agent n'est qu'un accent.
- Couleurs d'agents inchangées (Finance et Comm restent « blanc » ; l'or est proscrit, le liseré doré vient des portraits). Pas de
  pastille « Recommandé » sur les agents : aucune donnée ne la fonde.

## 11. Données

- Tout le contenu vit dans `data/` (détail des fichiers et des chiffres : `docs/etat-technique.md`). Au 28 octobre : 189 thèmes,
  937 données, 157 croisements, 13 scénarios, 65 déclencheurs, 16 évolutions, 561 questions écrites dans la banque et 5 en attente
  (ACQ-26, catégorie Fabrication).
- **Le classeur reste l'outil d'écriture : on le modifie, on relance l'import, on ne modifie pas les JSON à la main.** Exceptions,
  écrites à la main d'après le classeur ou le document : les règles d'affichage (`regles-affichage.json`) et les tableaux liés
  (`tableaux-lies.json`) ; le routage et l'inscription sont écrits par script d'après le document de règles et la liste des métiers.
- Les fichiers de données sont validés par un script de contrôle (code, nature, règle ; pas de doublon avec le socle ; budget de
  questions ; au moins 2 questions par thème noté ; lexique complet ; bornes ; conditions du classeur toutes couvertes).
- **Banque de questions** : la page HTML « Banque de questions » du propriétaire fait foi en cas de doute. Une version Excel
  (`CAXE_Banque_Questions.xlsx`) est régénérée à partir de la banque écrite et redonne exactement la banque quand on la réimporte.
- Classeur des thèmes : dernière version **`docs/CAXE_Themes_Chiffres_4_agents_12.xlsx`** (version 11 corrigée le 27 octobre, puis
  périodes et historique le 28 octobre, onglet « Modifications 28 oct. »). **C'est la base des prochaines modifications** : réimporter
  une version plus ancienne effacerait les corrections du 28 octobre.
- Secteur pilote : agence immobilière indépendante (transaction), agent Acquisition. Le fichier `CAXE_Questionnaire_Grille_Pilote.xlsx`
  n'est **pas dans le dépôt** ; il utilise encore les types A / B / C : ne pas les reprendre tels quels.
- **Ordre de travail décidé** : les 4 agents d'abord (thèmes, données, croisements, moteur), puis la **banque de questions** (rédaction
  finale de chaque question), puis la connexion des deux. La banque est écrite ; une donnée sans question écrite reste marquée
  « question à rédiger », rien n'est inventé.
- **Calculs à écrire (absents du classeur, rien n'est inventé)** : ACQ-11.38 taux d'occupation, ACQ-11.39 prix moyen d'une unité
  vendue, ACQ-11.40 CA perdu par mois, un croisement location en miroir de XA34, les couverts par mois (ACQ-11.07 × ACQ-11.09 × 4,33),
  les nombres par canal (ACQ-02.01 × ACQ-03.02 et ACQ-11.01 × ACQ-03.03), les calculs du funnel Comm (COM-58.03, COM-61.03, COM-39.06),
  et les formules et croisements des 19 thèmes ajoutés par le classeur 11.

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

- Titres en **Bricolage Grotesque** (700 à 800, `letter-spacing: 0.02em`), texte en **Inter**. Accent tricolore bleu / blanc / rouge.
- **Les dégradés sont réservés aux jauges et barres de progression**, pas aux formulaires.
- Rayons : 3 à 4 px sur les petits éléments, 12 px sur les cartes.
- À proscrire : l'or #C9A961, Cormorant Garamond, Playfair Display.
- **Mode jour / nuit (21 octobre)** : le thème sombre ci-dessus est la direction artistique d'origine et reste le thème par défaut. Un
  thème clair existe, choisi par le bouton soleil / lune présent dans tous les en-têtes, gardé dans le navigateur et rétabli sans
  éclair. Thème clair : fond `#F7F2E6`, cartes `#FFFDF8`, encre `#07111B` ; bleus, rouges, verts et ambre assombris pour rester
  lisibles ; l'agent « blanc » prend l'encre. Les surfaces qui montrent le produit ou une vidéo gardent le thème sombre dans les deux
  thèmes.
- **Ne jamais écrire une couleur en dur** : utiliser les jetons ou leurs canaux (détail : `docs/etat-technique.md`).

**Ton** : **vouvoiement, français de France, sobre et factuel, sans superlatif, sans point d'exclamation ni émoji.** Le mot « fiable »
est accepté dans le produit, **y compris dans ce que l'IA écrit** : compte rendu, rapport, plan (19 octobre, confirmé le 28 octobre).
Seuls les contenus de promotion ne l'emploient pas (stratégie du 23 octobre). Un bouton dit ce qui va se passer. Un écran vide est une
invitation à agir. Une erreur explique et corrige. La confirmation d'une réponse s'écrit « Réponse enregistrée », avec une coche.

## 13. Qualité

Mobile d'abord (l'en-tête tient à 360 et 320 px) ; focus clavier visible ; contrastes lisibles ; `prefers-reduced-motion` respecté ;
moteur couvert par des tests ; réponses sauvegardées en continu (perdre des réponses est un échec produit). Après toute correction de
la banque, du classeur ou des règles, relancer les contrôles (`docs/etat-technique.md`).

## 14. Règles abandonnées : ne jamais les réintroduire

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
| Page « Audit Express » : le visiteur saisit ses chiffres avant de créer un compte (abandonnée le 28 octobre) | Achat direct depuis la page de vente (décision D4 du lancement) |

## 15. Ce qui reste au propriétaire (ne rien trancher seul)

### À décider

1. **Publicité des professions réglementées** : dernier point à trancher avant la publication du site, avec un avocat spécialisé. Le
   propriétaire revient avec le retour de l'avocat : message fixe, liste des canaux, liste des termes interdits.
2. **Agent Comm « à trancher »** pour 13 métiers ou activités (section 5), avec l'avocat.
3. **Catégorie Fabrication** : questionnaire à créer (dont ACQ-26).
4. **Modules métier ouverts** : transport de marchandises (ACQ-25), constructeur de maisons individuelles (ACQ-28), gestion
   locative (ACQ-29).
5. **Deux masquages « à préciser »** : « Vente immédiate (commerce) » et « Sans travaux en cours ». Le classeur ne dit pas quelle
   réponse les déclenche : ces thèmes ne sont jamais masqués.
6. **Questions de la vérification du 28 octobre** (`docs/verification/rapport.md`, section 5) :
   - ACQ-22.05 : créneaux proposés ou créneaux libres ;
   - FIN-17.02 : répartition des paiements par nombre de factures ou par montant ;
   - COM-13.10 : le canal « Site internet » coché l'emporte-t-il sur un « non » donné avant ;
   - COM-22.04 : répartition entre réseaux mesurée sur les demandes ;
   - FIN-05.02 sans l'agent Comm : jamais pré-rempli aujourd'hui ; garder la règle ou pré-remplir sans la partie Comm ;
   - 24 reformulations et choix ajoutés à relire.
7. **Seuils** : seuil d'un montant du dossier à faire confirmer ; seuil d'heures par jour travaillé qui fait passer « dépendance au
   dirigeant » en Bloquant.
8. **Compte rendu et parcours** (décisions listées par l'audit client du 27 octobre) : compte rendu avant les repères de marché,
   repère de progression, chemin court pour le dirigeant pressé.
9. **Repère de marché d'un compte à plusieurs activités** : règle provisoire (l'activité par défaut du métier sert de repère), à
   confirmer.
10. **Prompts des agents (19 octobre)** :
    - le prompt Acquisition (`docs/prompt-agent-acquisition.md`) doit être mis à jour pour l'effet d'une action : à l'étape
      « Filtrer et chiffrer », l'agent ne pose plus d'hypothèse, il reçoit le taux sourcé et le potentiel calculés par le moteur ; le
      champ « Impact estimé » est rempli par le moteur, ou « pas de chiffre sourcé » ; l'exemple 1 est à revoir ; la question
      « 10 points ou +10 % » est sans objet ;
    - les brouillons Finance, RH et Comm sont dans le document « Prompts — Finance, RH et Comm : parties propres à l'agent
      (brouillons) » (Claude Docs) ;
    - les couleurs vert / orange / rouge sont gardées pour la phase d'essai (à supprimer sur demande).
11. **À construire plus tard** : mini-questionnaire anonyme RH aux salariés ; connexion Meta pour l'agent Comm.
12. **Lancement** (`docs/strategie-lancement.md`, recommandation de la stratégie entre parenthèses) :
    - D3 offre fondateur (palier 3 agents au prix du palier 2, 50 places, jusqu'à J+30 ; autres choix : -30 % à vie, ou pas d'offre) ;
    - D6 date d'ouverture (J0), avec une page de vente prête à J-14 ;
    - D7 message au réseau personnel (une fois, à J0 ; ou aucun) ;
    - D8 pages pour Google (une par semaine à partir de J+30 ; ou après J+60) ;
    - D9 pixel Meta (dès l'ouverture, avec bannière de consentement ; ou plus tard, avec le budget) ;
    - D10 résiliation (abonnement mensuel sans engagement, résiliable en un clic ; ou engagement de 3 mois).
13. **Historique et évolutions (28 octobre)** (`docs/verification/historique.md`, section 7) :
    - charges fixes au niveau essentiel : FIN-05.03 (il y a 12 mois) y est posée, mais le total actuel a besoin des abonnements
      (FIN-09.01, niveau approfondi). Trois choix : poser FIN-09.01 en essentiel, demander un seul total des abonnements, ou passer
      FIN-05.03 en approfondi ;
    - ACQ-23.03 au niveau essentiel (12 montants de plus) ou un seul total annuel au niveau essentiel, le détail restant en
      approfondi ;
    - COM-32.07 pour un compte sans l'agent Acquisition : poser ACQ-07.05 à l'agent Comm ou non ;
    - comparaisons par ligne (audience par réseau COM-37.02, chiffre d'affaires par gros client ACQ-16.07) : à construire ou non ;
    - FIN-05.04 « si un premier exercice est clos » : demander la date de clôture ou non ;
    - ACQ-17.02 (clients de l'année d'avant revenus) : posée dès 12 mois, ou masquée jusqu'à 24 mois ;
    - estimation par case dans un tableau (aujourd'hui, un chiffre d'affaires mois par mois compte comme exact) ;
    - deux réponses données à un mois d'écart : tolérer ou non (aujourd'hui, l'évolution attend une mise à jour) ;
    - couleur d'une évolution : aucune règle, donc aucune couleur.
14. **Audit d'utilité de la banque (28 octobre)** (`docs/audit-utilite/rapport.md`, section 8 ; la banque n'a pas été modifiée) :
    - FIN-48.01 (banquier) : remplacer par une question sur le besoin de financement, posée seulement si un besoin est établi
      (recommandé), retirer, ou garder ;
    - règle commune des pratiques « notées directement » : une pratique absente n'est un défaut que si le problème qu'elle traite est
      constaté ;
    - grilles de qualité Comm « appliquées par l'IA » (COM-01.02, COM-20.01, COM-44.05, COM-49 à 54) : qui les applique ;
    - 20 retraits, 4 fusions, 20 conditions et 7 textes à préciser proposés, question par question ;
    - 13 questions posées mais absentes des entrées du calcul qui en a besoin (dont FIN-09.10 pour les charges fixes, FIN-46 pour
      XF03 et XF38) ;
    - 5 questions RH hors périmètre (droit du travail, rémunération, financement de la formation) ;
    - COM-24.01 redemande l'objectif de l'agent Comm ; D07 (stock) redemande ce que le compte connaît.
15. **Audit final des questions (29 octobre)** (`docs/audit-final/rapport.md` ; anomalies dans `docs/audit-final/anomalies.json` ;
    la banque n'a pas été modifiée) :
    - A-05 : convention des montants, aucun ne dit HT ou TTC (recommandé : tout en HT, montants réellement payés pour une entreprise
      sans TVA) ;
    - A-06 : réserver « Je ne suis pas cette donnée » aux questions chiffrées (affiché aujourd'hui sur toutes) ;
    - A-07 : RH-28.10 (meilleures recrues) posée seulement si un recrutement a eu lieu ;
    - A-08 : dirigeant seul, deux blocs voisins (RH-28 à 31 et RH-41 à 44) : ne pas lui poser RH-28.01, ou alléger le bloc ;
    - A-09 : COM-44.01 (avis Google) posée seulement si « Fiche Google » est cochée, comme ACQ-06.01 ;
    - A-10 : textes « vous et votre équipe » au dirigeant seul (6 questions) : une forme selon la taille ;
    - A-11 : tranches de RH-28.03 à rendre contiguës ;
    - A-14 : écrire les calculs qui éviteraient une question (capacité depuis RH-07, heures depuis RH-06.02 ou RH-05.01, ventes d'un
      restaurant depuis les couverts et les services), puis les proposer en réponse pré-remplie ;
    - A-22 : faire lire au pré-remplissage de FIN-05.02 les dépenses connues par COM-32.01, ou garder la règle du 22 octobre.

### À valider (propositions déjà en place)

- Nature et impact des 19 thèmes ajoutés par le classeur 11 (FIN-46 à 48, RH-41 à 49, COM-55 à 61).
- Les 8 thèmes ajoutés le 27 octobre (ACQ-24, 25, 27, 28, 29, 30, COM-62, COM-63) : en « Contexte » (non notés, lus par l'IA), étapes
  « Piloter », « Votre métier » et « Présence et canaux ». Le fichier d'ajouts ne donnait ni leur nature, ni leur impact, ni leur
  étape.
- Profils et conditions posés par défaut pour les questions ajoutées : ACQ-07.15 posée si « plateformes » est coché (profils de
  ACQ-07.02) ; ACQ-11.38 restaurant ; ACQ-11.39 e-commerce et restaurant ; COM-13.11 et COM-62 si le dirigeant a un site ;
  COM-63.02 à .08 si COM-63.01 = oui ; les autres, tous les profils.
- Objectifs RH et Comm : décisions du 28 octobre appliquées (1B, 2a-1, périmètre Comm clarifié pour 2b, 2c-1, 4a-1, 4b-1, plafond
  d'un objectif, 6C ; `docs/objectifs/CAXE-decisions-objectifs.pdf`). Restent :
  - **point 3A** (filtre des propositions selon la taille) : explication demandée par le propriétaire, filtre gardé en attendant ;
  - les textes des 54 objectifs (`docs/objectifs/CAXE-objectifs-proposes.pdf`), dont la nouvelle définition du taux de conversion
    (« Sur 100 visiteurs de votre site ou de vos profils, combien vous contactent ou achètent. ») ;
  - la règle de l'écart entre la partie Comm et COM-10.07 (6C) : une partie « Améliorer » avec « Rarement ou plus du tout » ou « Non,
    jamais », une partie « Mettre en place » avec « Oui, au moins une fois par mois » ; d'après les règles d'affichage existantes.
- Limite de vraisemblance d'un objectif en % : ramené à une année, il ne peut multiplier ou diviser l'indicateur par plus de 4
  (`data/objectif-limites.json`, valeur de travail qu'aucune source ne fixe).
- Profils déduits de 13 métiers ou activités ajoutés à la liste (marqués `aConfirmer` dans `routage.json`) : commissaire de justice,
  commissaire aux comptes, géomètre-expert, dentiste, infirmier libéral, sage-femme, orthophoniste, vétérinaire, psychologue,
  ostéopathe, naturopathe, sophrologue, et l'activité « Conseil juridique » du consultant.
- Libellés de réalisme de la maquette du compte rendu.
- Libellés des options « aucun » (COM-10.03, COM-56.02, RH-03.03, RH-09.02).
- Texte reformulé de COM-04.01.
- Textes qui annoncent un nombre de lignes.
- Catalogue des effets d'actions : 6 actions en brouillon, une par croisement à « part récupérable prudente » ; aucune ne part en
  recherche avant validation.
- Affichage d'une TVA estimée au paiement.
- Seuils « à valider » : test sur 5 à 10 cas réels.
- Questions ajoutées le 28 octobre :
  - textes de ACQ-23.12, ACQ-23.13 = FIN-14.04 (choix du périmètre) et FIN-07.17 ;
  - 23 textes et aides reformulés pour la période (liste : `docs/verification/historique.md`, section 3) ;
  - présentation du bloc « Ce qui a changé, d'après vos chiffres » du compte rendu.

### À fournir

- Compte Stripe (clés, secret du webhook, portail client), TVA / Stripe Tax.
- Fournisseur d'e-mails et ses accès SMTP, adresse qui envoie (domaine du site), adresse publique du site.
- Conditions générales de vente (avec l'avocat) ; textes cookies, confidentialité et RGPD.
- Abréviations et autres noms des métiers pour la recherche.
- Mots du vocabulaire « consultation » des professions de santé.
- Clé `ANTHROPIC_API_KEY` (variable de l'environnement, jamais dans le dépôt).
- Correction du document de règles : prix du palier 4 à 99,99 € ; agent Comm (partie 2), la phrase « son funnel […] s'arrête […] au
  moment où quelqu'un devient un contact identifié » à remplacer par la clarification du 28 octobre (section 9), et sa question
  (« … assez de contacts ? ») à revoir si le propriétaire le souhaite.
- Texte qui remplace « Venez les essayer » sur la page d'accueil : le propriétaire le fixera au moment de créer la page de vente, avec
  les trois changements de l'accueil (ne pas le redemander d'ici là).
- `CAXE_Questionnaire_Grille_Pilote.xlsx`, s'il doit vivre dans le dépôt.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

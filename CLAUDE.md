# CAXE — instructions projet

Ce fichier est le contexte permanent du projet. Lis-le en entier avant toute
modification. Si une demande contredit ce fichier, signale-le avant d'exécuter.

---

## 0. Décision produit du 8 octobre : plus de score global sur 100

- **Il n'y a plus de score global sur 100.** Il posait de trop gros problèmes.
  Aucun chiffre sur 100 n'apparaît sur le site.
- **Objectif chiffré saisi à l'inscription** par le dirigeant (par exemple
  +15 % de CA sur 12 mois).
- Le diagnostic lui montre les **leviers qui le séparent de cet objectif,
  classés par impact**.
- **Le chiffre principal est l'avancement vers l'objectif** (par exemple
  « +6 % atteints sur +15 % »).
- **Le vert / orange / rouge est conservé par thème.**
- **Le détail du calcul arrivera plus tard. D'ici là, ne pas modifier le moteur
  de scoring ni le modèle de données.** Pour l'instant, cette décision ne
  touche que les textes et les visuels du site.

Là où les sections 1, 7 et 9 parlent de score global ou de score sur 100, cette
décision prime pour l'affichage. Le principe de la section 2 est inchangé :
l'IA ne calcule rien et ne juge rien.

---

## 1. Ce qu'est CAXE

CAXE est une plateforme web d'auto-audit d'entreprise par abonnement.

Un dirigeant de PME s'inscrit, fixe un objectif chiffré, répond à un
questionnaire conçu pour son métier, et reçoit les leviers qui le séparent de
cet objectif, classés par impact, accompagnés d'un plan d'action concret (voir
la section 0). Il revient
ensuite au rythme de ses actions : **la fréquence de retour n'est pas fixe, elle
dépend de la nature de chaque action.** Une action rapide déclenche un retour
sous quelques jours, une action longue ou qui demande d'être testée déclenche un
retour sous une ou plusieurs semaines. Le produit ne fonctionne donc pas par
rendez-vous mensuel, mais par échéance propre à chaque action.

Signature de marque : **« Un acte, un destin »**
Accroche de campagne : « L'auto-audit d'entreprise, enfin accessible à tous les dirigeants. »

**Le concurrent réel n'est pas « aucun outil »**, c'est le consultant ou le coach
externe, souvent cher et de qualité inégale. CAXE doit donner accès à du conseil
stratégique de vraie qualité à un prix accessible. Le produit doit être perçu
comme sérieux et premium, jamais comme un gadget.

**Modèle tarifaire : abonnement mensuel par paliers, selon le nombre d'agents
souscrits.** Un agent coûte un prix, deux agents un autre, et ainsi de suite. Le
dirigeant choisit les agents qui l'intéressent plutôt que de payer un forfait
unique. Les montants ne sont pas figés.

**Conséquence sur l'architecture, à prévoir dès le départ :** l'accès aux agents
est un droit attaché au compte. Un dirigeant abonné au seul agent Acquisition ne
doit voir ni ouvrir les trois autres. Prévois une table des agents souscrits par
compte et un contrôle d'accès à chaque entrée d'agent, même si un seul agent
existe aujourd'hui. Rétrofitter ça plus tard serait coûteux.

---

## 2. Le principe le plus important — ne jamais le casser

C'est la règle qui distingue CAXE d'un chatbot généraliste. Toute l'architecture
en découle.

**Le diagnostic se déroule en trois couches strictement séparées :**

1. **Questionnaire pré-écrit et figé.** Les questions sont rédigées à l'avance,
   métier par métier, et stockées comme données. Une IA ne génère JAMAIS de
   question au moment où l'utilisateur répond.

2. **Moteur de scoring déterministe, écrit en code.** Il compare les réponses à
   des seuils fixes et produit un statut rouge, orange ou vert par indicateur,
   puis des scores agrégés. Aucune IA n'intervient ici. Deux dirigeants qui
   répondent la même chose obtiennent exactement le même score.

3. **Rédaction du compte rendu par IA générative, et uniquement la rédaction.**
   L'IA reçoit des scores déjà calculés et les met en forme dans un texte lisible
   et personnalisé. Elle ne calcule rien, ne juge rien, n'invente aucun chiffre.

**Pourquoi c'est non négociable :** si les questions ou les calculs varient, le
benchmark sectoriel, le suivi dans le temps et la comparaison entre agences
s'effondrent. C'est exactement le reproche fait aux IA généralistes, et c'est ce
que CAXE existe pour éviter.

**Concrètement, ne propose jamais :** de faire noter les réponses par un modèle,
de générer les questions à la volée, de laisser l'IA choisir les seuils.

---

## 3. Les quatre agents

Trois agents de diagnostic et un agent génératif. Chaque périmètre est étanche,
pour qu'aucun agent n'empiète sur un autre.

| Agent | Nature | Ce qu'il couvre | Ce qu'il ne fait jamais |
|---|---|---|---|
| **Acquisition & Chiffre d'affaires** | diagnostic | Génération de contacts, conversion, chiffre d'affaires, honoraires | Jugement de qualité créative d'un contenu |
| **Finance & Rentabilité** | diagnostic | Santé opérationnelle via ratios déclarés : marge, trésorerie, structure de coûts | Fiscalité, comptabilité, conformité — c'est le métier de l'expert-comptable |
| **RH & Organisation** | diagnostic | Signaux organisationnels : turnover, charge, clarté des rôles | Droit du travail, contrats, médiation de conflit |
| **Comm & Création de contenu** | génératif | Analyse des publications existantes et indicateurs chiffrés de performance ; génère des propositions de contenu | — |

**Le juridique, le fiscal et le médical sont explicitement hors périmètre de
tout agent.**

**Pont entre l'agent 1 et l'agent 4 :** l'agent Acquisition reste purement
factuel sur la communication (fréquence de publication, canaux actifs). Quand il
détecte un signal faible, le rapport affiche un bouton « Voir des propositions de
contenu » qui déclenche l'agent 4 **à la demande**, jamais automatiquement. Le
rapport doit rester épuré.

Deux agents ont été envisagés puis écartés : Croissance & Stratégie (trop de
chevauchement) et Digital & Outils (trop transversal).

**Priorité actuelle : seul l'agent Acquisition & CA est à construire.** Les
autres viendront après. Mais l'architecture doit prévoir plusieurs agents dès le
départ.

---

## 4. Le premier métier : agence immobilière indépendante

Le secteur pilote est l'agence immobilière indépendante, activité transaction
(vente et achat de biens). C'est le seul métier à construire pour l'instant.

Le questionnaire compte environ 86 questions réparties en 17 parties, couvrant
symétriquement le tunnel vendeur et le tunnel acheteur.

**Ce questionnaire et sa grille de seuils arriveront sous forme de données,
fournis séparément.** Ne les invente pas. Si on te demande de construire une
partie du produit avant de les avoir reçus, utilise un jeu de données réduit
clairement marqué comme provisoire.

---

## 5. Le routage métier

Sept catégories de modèle économique déterminent la structure du questionnaire.
Le dirigeant choisit son métier précis à l'inscription (« électricien »,
« boulanger »), et le système le rattache en coulisse à sa catégorie. Le
dirigeant ne voit jamais la notion de catégorie.

1. Commerce avec stock physique
2. Services à l'affaire ou au chantier
3. Services récurrents ou par abonnement
4. Transactions à forte valeur et cycle long — *c'est ici que tombe l'immobilier*
5. Transport et logistique
6. Professions libérales réglementées
7. Services sur rendez-vous non réglementés

*(La restauration est pressentie comme huitième catégorie.)*

**Trois métiers demandent une sous-question à l'inscription** pour choisir la
bonne variante de questionnaire :

- Agences immobilières : transaction / gestion locative / syndic / conciergerie saisonnière
- Paysagistes : création / entretien / les deux
- Agences de voyage : clientèle individuelle / groupes B2B

---

## 6. Les champs d'inscription

Collectés une seule fois. Ils ne sont pas dans le questionnaire, et ils servent à
choisir les bons seuils de comparaison.

| Champ | Usage |
|---|---|
| Métier précis | Détermine la catégorie et le questionnaire |
| Sous-variante | Pour les trois métiers concernés |
| Chiffre d'affaires mensuel | Base des indicateurs exprimés en pourcentage du CA |
| Nombre de collaborateurs | Segmente les seuils de productivité |
| Ancienneté de l'entreprise | Une agence de 2 ans n'a pas le portefeuille d'une agence de 15 ans |
| Type de zone | Urbaine dense / périurbaine / rurale — segmente les seuils de volume |
| Ville | Compare certains indicateurs au marché local réel |

---

## 7. Comment fonctionne le scoring

Ces règles sont génériques : elles doivent marcher pour n'importe quel métier,
pas seulement l'immobilier.

### Trois types de questions

- **Type A** — indicateur noté. Produit un statut rouge, orange ou vert.
- **Type B** — volume brut ou dénominateur. Sert à calculer un ratio ailleurs,
  n'a pas de seuil propre.
- **Type C** — informatif. Nourrit le texte du rapport, jamais le score.

### Règles de conception

**Une question n'est notée que si le résultat dépend principalement de
l'entreprise.** Si le résultat dépend surtout du client ou du marché, elle reste
en type C. Exemple : qu'une première visite débouche sur une seconde dépend
d'abord du coup de cœur de l'acheteur, pas du travail de l'agence.

**Pour un seuil appuyé sur une donnée de marché, la moyenne du marché se place en
ORANGE, pas en vert.** Le vert est réservé à une performance nettement au-dessus.
Objectif : le plan d'action a toujours quelque chose à proposer, même à une
entreprise dans la norme.

**Indicateur à deux sens.** Certains indicateurs sont mauvais des deux côtés,
trop bas comme trop haut. Pour ceux-là, la fourchette de marché est notée VERT,
orange juste à côté, rouge au-delà. Exemple : un taux d'honoraires trop bas perd
de la marge, trop haut perd des mandats.

**Privilégier ce que l'entreprise pilote.** Quand le sens de notation est
ambigu, récompenser l'acquisition maîtrisée plutôt que celle qui dépend du
hasard. Exemple : une forte part de mandats venant du bouche-à-oreille est notée
ROUGE, parce qu'elle signale une dépendance à la chance.

### Trois cas par question

Le moteur doit gérer les trois, sans exception :

1. **Chiffre exact** — calcul normal.
2. **Estimation ou fourchette** (« environ 15 », « entre 10 et 20 ») — le moteur
   prend la médiane. Une note en tête de questionnaire encourage explicitement
   l'estimation.
3. **Question passée sans réponse** — l'indicateur est **exclu du calcul**. Jamais
   compté zéro, ce qui fausserait le score.

**Aucune question n'est obligatoire.** Le dirigeant peut toujours passer.

### Deux couches de données

- Les réponses fermées et chiffrées alimentent le score.
- Les réponses libres facultatives (« selon vous, pourquoi ? ») n'entrent **jamais**
  dans le score, mais sont transmises à l'IA de rédaction pour personnaliser le
  compte rendu.

### Seuils segmentés

Certains seuils ne peuvent pas être universels. Le moteur choisit la bonne table
selon le profil d'inscription. Exemple pour le volume de contacts vendeurs
mensuels : zone urbaine rouge sous 8, orange de 8 à 20, vert au-delà ; zone
rurale rouge sous 3, orange de 3 à 8, vert au-delà.

Pour un indicateur comparé au marché local, la référence est la valeur de la
ville déclarée, pas une moyenne nationale.

### Agrégation

> Décision du 8 octobre (section 0) : le score global sur 100 n'est plus
> affiché. Le calcul ci-dessous reste celui du moteur actuel, à ne pas modifier
> tant que le nouveau détail de calcul n'est pas fourni.

Chaque indicateur vaut 0 si rouge, 50 si orange, 100 si vert. Le score d'une
partie est la moyenne de ses indicateurs notés. Le score global est la moyenne
des indicateurs notés.

**Point ouvert, à ne pas trancher seul :** tous les indicateurs pèsent
actuellement pareil. Une pondération est envisagée. Demande avant d'en ajouter
une.

---

## 8. Modèle de données attendu

Le questionnaire et ses seuils doivent être **des données, pas du code**. Il doit
être possible d'ajouter un métier entier sans toucher au moteur.

```jsonc
// Un questionnaire
{
  "metier": "agence-immobiliere",
  "variante": "transaction",
  "version": 1,                  // versionné : un client garde la version sur laquelle il a répondu
  "parties": [
    {
      "titre": "Génération de contacts vendeurs",
      "intro": "Un contact vendeur : toute personne ayant manifesté…",
      "questions": [
        {
          "id": "q1",
          "libelle": "Combien de nouveaux contacts vendeurs recevez-vous par mois ?",
          "aide": "",               // texte secondaire optionnel
          "type": "nombre",         // nombre | pourcentage | liste | oui-non | texte
          "unite": "par mois",
          "groupe": null,           // identifiant de groupe pour les répartitions en %
          "options": []             // pour type "liste"
        }
      ]
    }
  ]
}
```

```jsonc
// Un indicateur de la grille de scoring
{
  "id": "presence-rdv-vendeur",
  "partie": 2,
  "nom": "Rendez-vous vendeurs honorés",
  "type": "A",                          // A noté | B dénominateur | C informatif
  "source": { "question": "q11" },      // ou une formule dérivée, voir plus bas
  "regle": "plus-haut-mieux",           // plus-haut-mieux | plus-bas-mieux | fourchette
                                        // | correspondance | concentration | alignement
  "seuils": { "bas": 75, "haut": 90 },  // <75 rouge, 75-90 orange, >90 vert
  "segmentation": null,                 // "zone" | "taille-equipe" | "ville" | "tranche-prix"
  "sourcé": true,                       // seuil appuyé sur une donnée de marché publiée
  "reference": "Moyenne de marché 70 à 85 %",
  "explication": "Le marché se situe entre 70 et 85 %.",
  "action": "Confirmer chaque rendez-vous la veille par message."
}
```

**Règles de calcul à implémenter :**

| Règle | Comportement |
|---|---|
| `plus-haut-mieux` | rouge sous `bas`, orange entre `bas` et `haut`, vert au-dessus |
| `plus-bas-mieux` | rouge au-dessus de `haut`, orange entre, vert en dessous de `bas` |
| `fourchette` | vert dans la fourchette, orange à moins de `tolerance` à côté, rouge au-delà |
| `correspondance` | table qui associe chaque réponse d'une liste à une couleur |
| `concentration` | sur un groupe de pourcentages : calcule la part du plus gros et la note |
| `alignement` | croise une répartition de budget avec le canal déclaré le plus rentable : plus grosse part = vert, part intermédiaire = orange, plus petite part = rouge |
| dérivé | l'indicateur vient d'un calcul entre plusieurs questions, pas d'une seule |

Les indicateurs dérivés doivent pouvoir exprimer un ratio entre deux questions,
un ratio rapporté au nombre de collaborateurs, ou un croisement à deux entrées.

---

## 9. Ce qui est à construire, dans l'ordre

### Maintenant

1. **Inscription et compte** — les sept champs de profil, authentification,
   persistance.
2. **Questionnaire** — découpé partie par partie, pas une page unique de 86
   questions. Barre de progression, réponses sauvegardées au fur et à mesure,
   possibilité de reprendre plus tard, possibilité de passer toute question.
   Pour les répartitions en pourcentage, afficher un total en direct qui alerte
   si on s'éloigne de 100.
3. **Moteur de scoring** — en code, testable unitairement. Il doit être possible
   de lui donner un jeu de réponses et de vérifier le résultat attendu.
4. **Rapport** — objectif du dirigeant, avancement vers cet objectif, leviers
   classés par impact (section 0), indicateurs classés en rouge, orange et vert
   par thème, indicateurs calculés. Le texte de restitution sera rédigé par
   appel à un modèle, à partir des scores déjà calculés.
5. **Plan d'action** — les actions issues des indicateurs faibles, avec un statut
   modifiable par le dirigeant (à faire, en cours, fait).

### Plus tard, ne pas construire maintenant

- Point d'étape de 5 ou 6 questions ciblées sur les actions en cours, déclenché
  à l'échéance propre de chaque action et non à date fixe. Chaque action porte
  donc son propre délai de retour, défini avec elle.
- Relances automatiques quand une action stagne, et boucle d'ajustement : si le
  dirigeant signale qu'une action testée n'a pas fonctionné, la recommandation
  suivante en tient compte.
- Ré-audit complet trimestriel montrant la progression
- Classement sectoriel, une fois qu'il y aura assez d'utilisateurs par métier
- Couche ludique discrète : jauges par agent, paliers, série de connexions,
  classement, actions présentées comme des objectifs. **Sobre et professionnel :
  pas d'avatar, pas de son, pas d'animation tape-à-l'œil.**

---

## 10. Comment arrivent les questionnaires

C'est le point de coordination à respecter.

Les questionnaires et leurs grilles de seuils sont construits en dehors du code,
métier par métier, avec recherche de données de marché réelles pour caler chaque
seuil. Ils sont ensuite validés, puis transmis pour intégration.

**Ce que ça implique pour l'architecture :** intégrer un nouveau métier doit
consister à déposer un fichier de données et rien d'autre. Si intégrer un métier
demande de modifier le moteur, l'architecture est à revoir.

Chaque questionnaire est **versionné**. Quand une question ou un seuil évolue, on
passe à la version suivante ; les nouveaux répondants reçoivent la nouvelle
version, et les anciens gardent la leur pour que leur historique reste
comparable.

---

## 11. Charte graphique

À appliquer telle quelle. Elle vient des supports de communication déjà publiés.

```css
:root {
  /* Fonds et texte */
  --bg:         #07111B;                 /* navy, fond principal */
  --panel:      #0B1622;                 /* fond de carte */
  --text:       #F4ECD8;                 /* beige, texte principal */
  --text-muted: rgba(244,236,216,0.58);
  --text-faint: rgba(244,236,216,0.34);
  --line:       rgba(244,236,216,0.14);

  /* Accent tricolore */
  --blue-1:  #5B9FEC;  --blue-2:  #1E4E96;
  --white-1: #FFFFFF;  --white-2: #CDD3DA;
  --red-1:   #F2686B;  --red-2:   #B71C2B;

  /* Secondaires */
  --amber-1: #FFD166;  --amber-2: #C77D22;
  --neutral-1: rgba(244,236,216,0.5);
  --neutral-2: rgba(244,236,216,0.18);

  --titre: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  --corps: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}
```

Import des polices :

```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

**Typographie.** Bricolage Grotesque pour les titres et les grands chiffres, en
poids 700 à 800, `letter-spacing: 0.02em`. Inter pour tout le reste, en 400, 500
et 600.

**Les trois usages du dégradé :**

```css
/* Accent de texte */
background: linear-gradient(100deg, var(--blue-1), var(--white-1) 60%, var(--red-1));
-webkit-background-clip: text; background-clip: text; color: transparent;

/* Barres de score et icônes */
background: linear-gradient(90deg, var(--blue-1), var(--blue-2));

/* Halo derrière un grand chiffre */
background: radial-gradient(circle at 50% 45%, var(--blue-1) 0%, transparent 65%);

/* Bordure dégradée */
background: linear-gradient(var(--bg), var(--bg)),
            linear-gradient(100deg, var(--blue-1), var(--white-1), var(--red-1));
background-origin: border-box;
background-clip: padding-box, border-box;
border: 1px solid transparent;
```

**Une couleur par agent :** Acquisition & CA en bleu, Finance & Rentabilité en
blanc, RH & Organisation en rouge, Comm & Création en blanc.

**Rayons :** 3 à 4 px sur les petits éléments, 12 px sur les cartes, 50 % sur les
pastilles.

**Réserve importante.** Cette charte a été conçue pour des supports de
communication, où les dégradés servent à attirer l'œil. Dans une application
utilisée longuement, ils fatiguent. **Réserve les dégradés au score et aux barres
de progression. Les écrans de saisie restent sobres :** navy, beige, filets fins.

**Direction générale :** minimalisme stratégique premium. Ni startup, ni agence.
Beaucoup de blanc tournant, hiérarchie par le poids typographique et l'espace
plutôt que par la couleur.

**À proscrire :** l'accent doré #C9A961 (abandonné), les polices Cormorant
Garamond et Playfair Display (jugées trop identifiables comme générées),
les cartes arrondies identiques partout avec la même ombre grise.

---

## 12. Ton et écriture de l'interface

Le ton est **sobre et factuel, sans superlatif marketing**. Le dirigeant est un
professionnel, pas une cible publicitaire.

- Phrases courtes, voix active, sentence case. Pas de capitales sur les libellés.
- Un bouton dit ce qui va se passer : « Voir mon résultat », pas « Valider ».
- Le même mot désigne la même chose partout dans le produit.
- Pas de superlatifs, pas de point d'exclamation, pas d'émoji.
- Une erreur explique ce qui s'est passé et comment le corriger. Elle ne
  s'excuse pas et ne reste pas vague.
- Un écran vide est une invitation à agir, pas une illustration triste.

**Un mot à ne pas utiliser : « fiable ».** Le revendiquer sous-entend que le
reste ne l'est pas. La fiabilité se démontre par la méthode, elle ne s'affirme
pas.

Vouvoiement du dirigeant. Français de France.

---

## 13. Qualité attendue

- Responsive jusqu'au mobile. Beaucoup de dirigeants répondront au téléphone.
- Focus clavier visible, contrastes lisibles, `prefers-reduced-motion` respecté.
- Le moteur de scoring est couvert par des tests. C'est la pièce où une erreur
  silencieuse fait le plus de dégâts.
- Les réponses du dirigeant sont sauvegardées en continu. Perdre 86 réponses est
  un échec produit, pas un incident technique.

---

## 14. En cas de doute

Trois réflexes :

1. **Si une demande revient à faire calculer ou juger quelque chose par l'IA**,
   signale-le avant d'exécuter. C'est la ligne à ne pas franchir.
2. **Si un seuil ou une question manque**, ne l'invente pas. Marque-le comme
   manquant et signale-le.
3. **Si une décision engage le produit** (pondération des scores, ajout d'un
   champ d'inscription, changement de périmètre d'un agent), demande avant.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

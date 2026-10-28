# CAXE — état technique

Complément de `CLAUDE.md` : ce qui est construit, dans quels fichiers, avec quelles commandes et quels contrôles. Les règles et les
décisions sont dans `CLAUDE.md` ; ce fichier dit **comment** elles sont appliquées. À mettre à jour quand le code change.
Chiffres au 28 octobre 2026.

---

## 1. Pile et lancement

- Next.js 16 (`node_modules/next/dist/docs/` : lire le guide utile avant d'écrire du code), Prisma 6 et PostgreSQL, Auth.js 5.
- Scripts npm : `dev`, `build`, `start`, `lint`, `test`, `donnees:controle`.
- Serveur de test (utilisé par tous les contrôles navigateur, port 3100) :

  ```
  npx next build
  AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration EMAIL_MODE=demonstration RESULTATS_MAQUETTE=1 npx next start -p 3100
  ```

- Variables d'environnement (jamais dans le dépôt) :

  | Variable | Rôle |
  |---|---|
  | `DATABASE_URL` | Base PostgreSQL |
  | `STRIPE_SECRET_KEY`, secret du webhook | Paiement réel ; sans clé, mode démonstration hors production |
  | `PAIEMENT_MODE=demonstration` | Force le mode démonstration (serveur de test) |
  | `STRIPE_TAX_AUTOMATIQUE=1` | Active Stripe Tax |
  | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_EXPEDITEUR` | Envoi des e-mails |
  | `EMAIL_MODE=demonstration` | Force le mode démonstration des e-mails (serveur de test) |
  | `NEXT_PUBLIC_SITE_URL` | Adresse des liens envoyés par e-mail (à régler sur l'adresse publique) |
  | `RESULTATS_MAQUETTE=1` | Rend visible la maquette du compte rendu (`?exemple=1`) |
  | `ANTHROPIC_API_KEY` | Agent de recherche des références et des effets |

## 2. Données (`data/`)

| Fichier | Contenu (28 octobre) | Écrit par |
|---|---|---|
| `themes.json` | 189 thèmes : Acquisition 29, Finance 48, RH 49, Comm 63. Natures : Pratique 90, Cohérence 58, Marché 22, Contexte 19 | `python3 scripts/importer-classeur.py <classeur.xlsx>` |
| `donnees-*.json` | 932 données : Acquisition 321, Finance 236, RH 172, Comm 203 | idem |
| `croisements.json` | 157 croisements (formules en texte libre) | idem |
| `scenarios.json` | 13 scénarios | idem |
| `diagnostic-comm.json` | 14 problèmes | idem |
| `declencheurs.json` | 65 déclencheurs (D01 à D65) | idem |
| `lexique.json` | Formes de chaque mot pour les 8 profils (dont Location) et 10 lexiques par métier (champ `metiers`) ; champ `cle` quand la clé du classeur diffère du mot | idem |
| `banque/questions.json` | 556 questions écrites, chacune avec sa spécification de réponse | `python3 scripts/importer-banque.py <classeur>` |
| `banque/en-attente.json` | 5 questions en attente (ACQ-26, Fabrication) | idem |
| `regles-affichage.json` | 79 conditions, 16 masquages, réponses attendues de 23 déclencheurs | **à la main**, d'après le classeur |
| `tableaux-lies.json` | 15 liens entre tableaux | **à la main**, d'après le texte des questions |
| `routage.json` | 11 catégories, 8 profils, 149 métiers, 54 activités, synonymes, mots de recherche, stock, agent Comm, professions réglementées | `python3 scripts/ecrire-routage-metiers.py` |
| `inscription.json` | Questions du dossier d'inscription, avec mots du lexique | d'après le document de règles |
| `vocabulaires-metiers.json` | 10 vocabulaires, 47 métiers, 8 activités, 11 `profilConserve`, 11 `aTrancher` ; `valide: true` | `python3 scripts/ecrire-vocabulaires-metiers.py` |
| `objectifs-agents.json` | Objectifs RH et Comm (brouillon `aValider`) | à la main |
| `prereponses.json` | 1 règle (FIN-05.02) | à la main |
| `implications.json` | 1 réponse déduite (COM-13.10) | à la main |
| `retraits.json` | Vide depuis le 27 octobre (mécanisme gardé) | à la main |
| `seuils.json` | **Vide** (voir `seuils.README.md`) | — |
| `catalogue-themes.json` | 189 fiches ; 36 indicateurs comparables pour les 22 thèmes Marché | `python3 scripts/ecrire-catalogue-themes.py` |
| `catalogue-effets.json` | 6 actions en brouillon | `python3 scripts/ecrire-catalogue-effets.py` |
| `parametres-references.json` | Paramètres des recherches (voir section 9) | à la main |
| `sources-reconnues.json` | Domaines de niveau 1 (9) et domaines exclus (10) | à la main |
| `objectif-limites.json` | Vraisemblance d'un objectif en % : ramené à une année, il ne peut multiplier ou diviser l'indicateur par plus de 4 (valeur de travail, `aValider`) | à la main |

- Schémas : `src/lib/donnees/schemas.ts`. Routage : `src/lib/routage.ts`. Lexique : `src/lib/donnees/lexique.ts` (un mot du lexique
  s'écrit `{demande}`, `{nouveau_client}` dans un gabarit ; les formes sont au singulier).
- Contrôle : `npm run donnees:controle` (et `npm test`). Il compare aussi la réponse de la banque au format du classeur (avertissement,
  la banque l'emporte), refuse une condition du classeur sans règle dans `regles-affichage.json`, un nombre sans minimum, une part en %
  sans bornes, un retrait qui alimente un calcul, un croisement ou une règle.
- **Banque en Excel** : `python3 scripts/exporter-modele-banque.py --avec-questions` régénère `CAXE_Banque_Questions.xlsx` (questions
  écrites, puis celles en attente en fin de feuille) ; `python3 scripts/importer-banque.py <classeur> [--ecarter-inconnues]` le
  reconvertit et n'écrit rien s'il reste une erreur. L'aller-retour redonne exactement la banque.
- `routage.json` : `profilsImposes` d'un métier ou d'une activité (profil Location ; Hôtel), `motsRecherche` (écrits par
  `MOTS_RECHERCHE` dans `scripts/ecrire-routage-metiers.py`), `reglementees.acquisitionExclut` (D04, options de D03 / ACQ-03.01),
  `aConfirmer` sur les profils déduits.
- Une donnée sans question écrite affiche le libellé du classeur, marqué « question à rédiger ». Une donnée sans spécification de
  réponse prend celle que `proposerSpec` déduit sans ambiguïté du format du classeur ; à défaut, saisie libre (au 22 octobre, toutes
  les questions de la banque portent leur spécification).
- Les données « importées » (connexions comptabilité, caisse, réseaux) ne sont pas posées : aucune connexion n'existe.

## 3. Inscription, compte et parcours

| Étape | Page | Route |
|---|---|---|
| Compte (e-mail, mot de passe, confirmation, « Afficher ») | `/inscription` | — |
| Métier, activités, stock | `/inscription/metier` | `PUT /api/compte/metier` (une formule déjà choisie qui ne convient plus au métier est retirée) |
| Formule (trois cartes côte à côte, mensuel ou annuel, choix des agents sous les cartes) | `/formule` | `POST /api/abonnement` |
| Paiement (récapitulatif, facturation professionnelle, case CGV) | `/paiement` | `POST /api/paiement/session` (refusée sans la case) |
| Stripe ou démonstration | `/paiement/demonstration` | `POST /api/paiement/demonstration` |
| Confirmation (« Confirmation en cours », rafraîchie seule) | `/paiement/succes` | `POST /api/paiement/webhook` |
| Dossier (« Accès CAXE activé », cinq questions) | `/bienvenue` | `PUT /api/compte/dossier` |
| Mes agents | `/tableau-de-bord` | — |

- Un compte peut exister sans métier ni dossier (colonnes vides en base, `src/lib/compte.ts`). `exigerEspaceAbonne` ramène à l'étape
  qui manque (métier → formule → paiement → dossier).
- Une formule regardée sur `/offres` suit le parcours comme simple préférence (`?agents=3&periode=annuel`, `src/lib/formule-url.ts`).
  `/offres` mène à `/inscription` pour un visiteur, à `/formule` pour un compte connecté. `/activation` redirige vers `/formule`.
- CGV acceptées : `User.cgvAccepteesLe`. Page `/conditions-generales` : page d'attente.
- Recherche du métier : `src/lib/recherche-metier.ts`, tests `tests/recherche-metier.test.mts`.
- Lecture des montants du dossier : `src/lib/saisie-nombre.ts` (« 60k » = 60 000 ; « 1.250,75 » = 1 250,75 ; un point suivi de trois
  chiffres sépare les milliers ; signe moins gardé ; chiffre d'affaires négatif refusé avec une explication).
- Page 404 en français : `src/app/not-found.tsx` (« Page introuvable », liens vers « Mes agents » et l'accueil).
- Page d'accueil : portes d'entrée `src/components/marketing/portes-entree.tsx` ; animation des boutons d'appel : classe `bouton-appel`.

## 4. Abonnement et paiement

- Paliers, droits, professions réglementées : `src/lib/abonnement.ts`. Modèles `Abonnement` et `AgentAccess`.
- Paiement : `src/lib/paiement/` (`etat.ts` montants, mode, accès et traduction des événements ; `stripe.ts` ; `abonnement-serveur.ts` ;
  `tva.ts` contrôle de forme du numéro de TVA). Stripe Checkout en abonnement. Routes `POST /api/paiement/{session,webhook,portail,demonstration}`.
- `Abonnement.statut` : `EN_ATTENTE_PAIEMENT`, `ACTIF`, `IMPAYE`, `RESILIE`. L'accès est vérifié par `aAccesAgent`, `agentsActifs` et
  les routes `/api/audit/*`.
- Écran de paiement : bloc « Récapitulatif de l'achat » (abonnement HT, TVA estimée, total dû). TVA estimée :
  `TAUX_TVA_ESTIME_POURCENT` dans `offres.ts`.
- Facturation professionnelle : `User.raisonSociale`, `User.numeroTva`, transmis à Stripe (client, type `eu_vat`) ; Stripe collecte
  aussi l'adresse de facturation.
- Gestion depuis `/compte` :
  - changer d'offre : `PUT /api/abonnement/formule` ; avec Stripe, `changerFormuleStripe` remplace le prix (prorata) ; en
    démonstration, base seulement ;
  - se désabonner : `PUT /api/abonnement/resiliation` ; champ `Abonnement.resiliationProgrammee`, relu par `accesOuvert`, qui ferme
    l'accès à la date même si Stripe n'a pas encore prévenu ; le webhook suit `cancel_at_period_end` ;
  - Mon entreprise : `PUT /api/compte/dossier`.
- Contrôle navigateur : `node scripts/controle-compte.mjs`.
- **Non essayé contre un vrai compte Stripe** (aucune clé dans l'environnement) : les paramètres Stripe sont à essayer en mode test.

## 5. Mot de passe et e-mails

- Lien « Mot de passe oublié ? » sous le mot de passe de `/connexion` → `/mot-de-passe-oublie` (`POST /api/mot-de-passe/demande` ;
  l'e-mail part après la réponse) → `/nouveau-mot-de-passe?jeton=…` → `POST /api/mot-de-passe/nouveau`.
- Table `ReinitialisationMotDePasse` : seule l'empreinte SHA-256 du jeton est gardée. Sessions ouvertes avant fermées par
  `User.motDePasseModifieLe`, relu à chaque lecture de session dans `src/auth.ts`. Adresses et empreintes bcrypt dans la table `User`.
- Code : `src/lib/mot-de-passe/reinitialisation.ts`, tests `tests/mot-de-passe.test.mts`.
- E-mails : `src/lib/email/` (SMTP). Sans SMTP, hors production : message écrit dans `.emails-demonstration/`, rien ne part.

## 6. Espace abonné et « Mes agents »

- Groupe de routes `src/app/(espace)/` : en-tête, `/tableau-de-bord` (« Mes agents »), `/audit/[slug]` (Objectif → Niveau et contexte
  → Questionnaire → Résultats), `/compte`.
- En-tête construit sur celui du site : largeur 1 320 px, même logo, bascule jour / nuit, bouton bordé, page ouverte en pastille
  bleutée. Hero compact (badge « Votre conseil CAXE » ou « Abonnement actif », titre avec un mot accentué immobile `.accent-calme`).
- Cartes : `src/components/espace/` (`CarteAgent`, `BadgeStatut`, `IndicateurProgression`, `etatAudit`). Promesse et domaines :
  `CONSEILS` dans `agent-presentation.ts`, domaines tirés des blocs réels de `themes.json`. État d'audit tiré de `progressionAgents`,
  sans règle nouvelle.
- Styles : section « Accueil de l'application » de `globals.css` (`.fond-espace`, `.carte-conseil`, `.medaillon-agent`,
  `.statut-audit`, `.progression-audit-*`, `.nav-espace-lien`, `.bouton-secondaire`).

## 7. Audit d'un agent

### Fichiers, tables, routes

- `src/lib/audit/` : `reponse.ts` (les quatre réponses, règle des 50 %, règle du quart), `objectif.ts` (objectif en trois champs,
  échéance, rattachement à un indicateur), `objectifs-agent.ts` (`controlerObjectifs`, `MAX_OBJECTIFS` = 10), `affichage.ts` (règles
  d'affichage, effectif → taille, sous-questions de cadrage), `assemblage.ts` (assemblage par profil, taille, niveau, déclencheurs,
  module métier `pourLeMetier`), `validation.ts` (contrôle serveur des réponses), `saisie.ts` (même contrôle dans le navigateur),
  `lignes.ts` (`idsDesLignes`, `groupesNumerotes`), `reponses-actives.ts`, `contexte-compte.ts`, `prereponse.ts`, `preparation.ts`
  (ce que l'écran reçoit, partagé avec l'aperçu), `constat-compte.ts`, `compte-rendu.ts`, `progression.ts`.
- Tables : `ReponseAudit` (réponses du compte, tous agents confondus ; champ `preremplie`), `BrouillonReponse`, `Objectif` (plusieurs
  lignes `ACTIF` pour RH et Comm ; champ `partie` dans la structure), `User.niveauAudit`.
- Routes : `PUT /api/audit/reponses`, `POST /api/audit/objectif` (accepte `objectifs`, un tableau, et remplace ensemble les objectifs
  actifs), `PUT /api/audit/niveau`, `PUT /api/audit/brouillon`.
- Écran : `src/app/(espace)/audit/[slug]/` (`questionnaire.tsx`, `question-carte.tsx`, `objectif-choix.tsx` avec `MenuDeroulant`,
  `resultats.tsx`, `resultats-maquette.tsx`). « Changer mes objectifs » reprend ceux en cours dans le formulaire. Un objectif
  enregistré garde `choix`, `reussite` et un chiffre facultatif.

### Assemblage

- Module métier : colonne « Métiers concernés » du classeur (onglet Acquisition, libellés séparés par « ; », une activité s'écrit
  « Métier / Activité ») → champ `metiers` de la donnée ; contexte `metier` calculé par `metierDuCompte` (`routage.ts`).
- Préalables : champ `prealables` de l'assemblage ; `codesPrealables` pour l'autorisation d'écriture.
- Exclusions des professions réglementées : appliquées aux options de la donnée (ACQ-03.01 : `publicite_en_ligne`,
  `publicite_locale`, `prospection`, `partenaires` et les autres canaux à risque) et à D04, refusées côté serveur.
- Profil Location : ACQ-11.31 à 11.37 ne sont posées qu'à lui.
- Les mots du lexique sont remplacés aussi dans l'aide et la question de repli.

### Règles d'affichage (`regles-affichage.json`)

- Une condition peut lire un déclencheur ou **la réponse à une donnée** (`ACQ-10.06`, `FIN-10.01#retours_par_mois`,
  `RH-32.01#demission.departs`), avec les opérateurs `plus_de`, `ne_contient_pas`… et des blocs imbriqués `tous` / `un`.
- Une règle vaut vrai, faux ou **en attente** (réponse manquante : la question attend).
- Déclencheurs dérivés (forme `reponse_donnee`) : D03 → ACQ-03.01, D17 → ACQ-18.02, D20 → ACQ-22.01 (jours d'ouverture), D21 →
  COM-10.07, D22 → COM-10.08, D23 → COM-13.10, D24 → COM-15.12, D25 → COM-21.01 (« si offre d'appel » = tout sauf « Non, rien »),
  D26 → COM-39.07, D27 → RH-08.01, D13 → RH-28.01. L'écran recalcule les questions à poser après leur réponse. (D20 et D25 corrigés le
  27 octobre : ils étaient encore posés en cadrage et les tableaux par jour ne suivaient pas les jours cochés.)
- `D30` vaut toujours « non » pendant l'audit. Une règle `toujours` pour FIN-05.02. Deux masquages « à préciser ».
- Condition de COM-13.10 : « D03 · si « Site internet » n'est pas coché » (`ne_contient_pas`).

### Réponses

- Spécification de réponse (`src/lib/donnees/reponse-spec.ts`) : nombre (unité, bornes), oui / non, choix, cases, liste libre, texte,
  mois et année, plusieurs champs, tableau (lignes fixes, issues d'une question de cadrage, d'une liste, ou libres ; total imposé, sur
  une ou plusieurs colonnes avec `total.colonnes` ; dans le classeur, « A ; B = 100 »). Le serveur refuse toute réponse non conforme
  (`validerReponse`).
- `lireNombre` (`src/lib/audit/nombre.ts`) accepte le symbole final (« 50 % », « 1 200 € »). Texte libre : 8 000 caractères (COM-44.04).
- Option exclusive : `optionsExclusives` (écran et serveur).
- Renvoi après coupure réseau : `src/app/(espace)/audit/[slug]/enregistrer.ts`. La réponse est gardée dans la page avec le message « Pas de connexion… », repart
  seule au retour du réseau et à intervalles, dans l'ordre ; le navigateur prévient si l'on ferme la page avant l'envoi.
- Confirmation : « Réponse enregistrée » avec une coche (`.etat-enregistre`, `role="status"`), affichée aussi en quittant un champ.
- Oui / non dans un tableau : `.choix-cellule` ; menu natif restant aux couleurs du site : `.champ-select`.
- Réponses actives : `reponses-actives.ts` (point fixe ; `sousQuestionOuverte`), lecture `INAPPLICABLE` dans `affichage.ts`, contexte
  d'un compte dans `contexte-compte.ts`. Branchées dans l'assemblage, le compte rendu, l'avancement et le total pré-rempli.

### Tableaux

- Lignes numérotées reconnues d'après la banque (`groupesNumerotes`). Identifiants stables (retirer `offre_2` garde `offre_3`) ; une
  ligne ajoutée prend un numéro neuf (« Ajouter « Offre 4 » », « Retirer »). Lignes affichées au retour : celles qui ont au moins une
  valeur, ou celles de la banque sans réponse.
- Tableaux liés : `data/tableaux-lies.json`, noms repris de la question d'origine, renvoi « Aller à cette question ».
- Tableau dont les lignes viennent d'une liste ou de cases posées sur la page (catégories de clients ACQ-01.01 pour COM-02.01,
  COM-09.03, ACQ-01.02… ; canaux ; réseaux) : la question source est montrée dans la carte (`renvoiLignes.question`, carte
  `imbriquee`) tant qu'il n'a pas de lignes ; le tableau s'affiche dès la réponse ; la question reste ouverte jusqu'à « Terminer ». Une
  carte reprend une réponse changée ailleurs sur la page.
- Brouillon : `BrouillonReponse`, `PUT /api/audit/brouillon`, supprimé dès la réponse complète.

### Réponses déduites, retraits, pré-réponse

- Déduite : `data/implications.json`, fonction `reponsesDeduites`.
- Retraits : `data/retraits.json` (survit à l'import du classeur).
- Pré-réponse FIN-05.02 : `data/prereponses.json`, calcul `src/lib/audit/prereponse.ts` (additionne des chiffres donnés, rien
  d'inventé). Le total enregistré à l'affichage est marqué `ReponseAudit.preremplie` ; il se recalcule à la lecture si le détail change
  (`reponsesDuCompte`) et ne bouge plus dès que le dirigeant donne ou corrige un chiffre (le serveur revérifie qu'un chiffre
  « préparé » est bien le total calculé). FIN-05.02 n'a plus d'équivalent dans `donneesPrerepondues`. Contrôle :
  `node scripts/controle-prereponse.mjs`.

### Compte rendu

- `constat-compte.ts` assemble le questionnaire du compte, charge les références de marché actives en base et appelle
  `constaterAgent` ; `compte-rendu.ts` classe les constats (thèmes notés du rouge au vert avec repère de marché sourcé, analysés avec
  les seuls chiffres du dirigeant, à compléter, comptes des thèmes masqués et de contexte) ; `resultats.tsx` les affiche.
- Maquette : `resultats-maquette.tsx` et `src/lib/audit/resultats-exemple.ts`, visible seulement avec `RESULTATS_MAQUETTE=1` et
  `?exemple=1`. Un compte de test se remplit avec `scripts/reponses-demonstration.mts` (réponses neutres, jamais de vrais clients).

## 8. Moteur (`src/lib/moteur/`)

- `notation.ts` : vert / orange / rouge (moyenne du marché orange, deux sens avec tolérance d'un point, pratique absente / partielle /
  en place ; seuil le plus précis par zone et taille).
- `chaine.ts` : leviers multipliés, jamais additionnés ; deux leviers sur la même étape = règle à préciser, aucun chiffre ; plafond de
  capacité à deux chiffres ; période commune (par jour × jours ouverts × 4,3).
- `constat.ts` : par thème, masqué, non évalué, contexte, règle manquante, noté ; seuil sans source = « à valider ». Distingue
  `aucune_reference`, `reference_disponible`, `sans_comparaison` et `regle_manquante`.
- `affichage-constat.ts` : ne montre jamais au client un mot technique.
- Seuils : `data/seuils.json`, vide ; tous les thèmes notés sortent « règle manquante ». Rapport des tests : `docs/rapport-tests-etape-5.md`.
- La valeur du client pour un indicateur calculé n'est pas calculable tant que les formules des croisements sont en texte libre.

## 9. Références de marché et effets d'actions

- Paramètres (`data/parametres-references.json`) : tolérance ±10 %, recoupement 20 %, âge des sources 3 / 5 ans, 4 recherches au
  maximum par couple, mise à jour tous les 3 mois par défaut (réglable par catégorie de métier), plafond mensuel de 20 € pour le pilote,
  modèle de l'agent de recherche (`agentRecherche`).
- Tables : `ReferenceMarche` (versions, jamais supprimées) et `RechercheReference` (journal, verrou, coût).
- `src/lib/references/` :
  - étape a : `types.ts` (forme d'une référence), `cascade.ts` (choix de la plus précise, décision de lancer une recherche,
    échéances), `contexte.ts` (contexte d'un compte), `depot.ts` (lecture en base) ;
  - étape b : `recherche.ts` (demande : métier, indicateur et type de zone seulement, jamais une donnée du client), `client-anthropic.ts`
    (API Claude, recherche web côté serveur), `proposition.ts` (sortie JSON validée), `verification-page.ts` (le serveur relit la page :
    https seulement, pas d'adresse interne, extrait et chiffre retrouvés), `pdf.ts`, `garde-fous.ts` (qualité de source, exactitude,
    recoupement, confiance ; niveau 1 seulement pour un domaine de `sources-reconnues.json`), `orchestrer.ts` (un couple de bout en
    bout : plafonds, verrou, journal), `depot-prisma.ts`.
- Lancer : `node scripts/references-traiter.mts --indicateur ACQ-10.13 --metier electricien [--dry-run]` (clé requise sans `--dry-run`).
- Pas encore construits : position du client face au marché et gel par audit (c), mises à jour (d), file de revue et suivi (e).
- Effets d'actions : `data/catalogue-effets.json`, six actions en brouillon (EFF-ACQ-01 relance des devis XA24, EFF-ACQ-02 complément
  XA19, EFF-ACQ-03 anciens clients XA17, EFF-ACQ-04 paniers abandonnés XA35, EFF-COM-01 réseau existant XC33, EFF-RH-01 automatisation
  XR15). Un effet a la forme d'un indicateur (période « effet », unité %, bornes 0 à 100) : même chaîne (`genre: "effet"` dans
  `recherche.ts`), enregistré dans `ReferenceMarche` sous le code EFF-…, cascade métier puis famille, jamais national.
  Lancer : `node scripts/references-traiter.mts --effet EFF-ACQ-01 --metier electricien [--dry-run]`.
  `src/lib/effets/potentiel.ts` applique le taux sourcé au montant en jeu (fourchette) ou renvoie le seul montant en jeu ; jamais
  d'addition d'effets. Pas encore construits : liste complète des actions, calcul du montant en jeu, effet de l'ensemble, affichage
  dans le rapport, mise à jour périodique.

## 10. Lexique et vocabulaires

- `src/lib/vocabulaire.ts` (`vocabulaireDuCompte`), `formuler(…, vocabulaire)` dans `src/lib/donnees/lexique.ts`, champ `vocabulaire`
  du contexte d'assemblage. Tests : `tests/vocabulaire.test.mts` (aucune question n'apparaît ni ne disparaît, aucun mot manquant).
- Document de validation : `docs/CAXE-vocabulaires-par-metier.pdf` (`node scripts/pdf-vocabulaires.mjs`).

## 11. Thème jour / nuit

- Bouton : `src/components/bascule-theme.tsx`. Choix gardé dans `localStorage` (clé `caxe-theme`, `src/lib/theme.ts`), rétabli avant
  l'affichage par un petit script du layout.
- Jetons dans `globals.css` : `:root` (sombre), `:root[data-theme="clair"]` (clair). Canaux : `rgb(var(--ink) / 0.2)`, `--blue-rgb`,
  `--red-rgb`, `--green-rgb`, `--amber-rgb`, `--ombre`.
- Logo en deux encres : `Logo`, `public/logo-caxe*-sombre.png`. Surfaces toujours sombres : `.surface-sombre`.

## 12. Aperçu interactif du questionnaire

- Le vrai code (cartes, assemblage, règles d'affichage, validation, données) est empaqueté par `scripts/apercu/construire.mjs`
  (esbuild) et tourne dans le navigateur ; seul l'enregistrement est simulé (réponses gardées dans l'onglet, `sessionStorage`).
- Compte de démonstration : électricien (profil artisan), 4 personnes.
- À refaire à chaque changement du questionnaire : `APERCU=application SORTIE=<dossier> node scripts/capturer-site.mjs` (serveur lancé
  avec `RESULTATS_MAQUETTE=1`), puis publier.

## 13. Contrôles

**À relancer après toute correction de la banque, du classeur ou des règles.** Tout d'un coup : `bash scripts/verification/tout.sh`
(environ 2 h ; `rapide` : sans les contrôles navigateur longs). Synthèse : `docs/verification/resultats/synthese.txt`.

| Commande | Ce qu'elle contrôle |
|---|---|
| `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run donnees:controle` | Code, 356 tests unitaires, données |
| `node scripts/balayage-secteurs.mts` | Assemble et remplit le questionnaire de chaque métier, activité, taille, niveau et agent (229 scénarios, 7 704 questionnaires) : textes, lexique, tableaux, règles en attente, exclusions des professions réglementées, constat |
| `node scripts/controle-parcours-secteurs.mjs`, `node scripts/controle-complementaire.mjs` | Parcours par secteur dans un navigateur |
| `node scripts/controle-boutons.mjs [--agents ACQ,FIN,RH,COM] [--apercu <dossier>]` | Chaque question : chiffre exact, estimation, « je ne sais pas », « je ne suis pas cette donnée », « Effacer ma réponse », cases, choix, listes, tableaux, texte, mois, cartes partagées, mise à jour des questions suivantes, rechargement ; sur l'application ou l'aperçu |
| `node scripts/controle-boutons-pages.mjs` | Écrans d'un agent : objectif, niveau, étapes, changement d'objectif, résultats, tableau de bord, jour / nuit, déconnexion |
| `node scripts/controle-autre.mjs` | Chaque « Autre » : activités des 16 métiers à plusieurs activités, objectifs RH et Comm, options « Autre » des questions ; relit la base |
| `node scripts/controle-compte.mjs` | Page « Mon compte » |
| `node scripts/controle-prereponse.mjs` | Total pré-rempli de FIN-05.02 |
| `node scripts/audit-client.mjs [--sortie dossier]` | Parcours d'un dirigeant (inscription, recherche du métier, dossier, objectif, questionnaire, coupure réseau, reprise sur téléphone, droits, mobile 360 px, clavier, connexion, mot de passe oublié, page 404). Identifiants du rapport « Audit client de CAXE (27 octobre 2026) » (Claude Docs) ; « ÉCART » et code 1 tant qu'un défaut reste |
| `scripts/verification/*` | Vérification du questionnaire (inventaire, dépendances, canaux, résultats, séparation, départs de page, changements rapides, captures) : voir `docs/verification/rapport.md`, section 7 |

**Derniers résultats (exécution complète du 27 au 28 octobre)** : tous les contrôles réussis, sauf `audit-client` (38 contrôles, un
écart : R-01, compte rendu sans priorités ni plan, normal tant que le compte rendu est en conception) et `boutons-com` (un échec de
l'outil de test sur COM-12.01, corrigé ; relance en cours). Détail : `docs/verification/rapport.md`, section 1.

## 14. Historique utile

- **Banque** : 515 questions écrites le 21 octobre (page « Banque de questions », importée avec `--ecarter-inconnues`), chacune
  rattachée à une donnée « Demandée » ou « Partagée » du classeur ; 47 mises de côté faute de donnée dans le classeur 11 (thèmes ACQ-24
  à ACQ-30, COM-62 « Référencement (SEO) » et COM-63 « Annonces Google (SEA) », plus ACQ-07.15, ACQ-11.38, ACQ-11.39, ACQ-13.12 à
  13.14, COM-13.11) ; une question en attente revient seule dès que le classeur contient sa donnée comme « Demandée ». Le 27 octobre, 42 d'entre elles ont été insérées au classeur (41 après la suppression
  d'ACQ-24.01 ; liste dans `docs/Ajouts_au_classeur_des_4_agents.xlsx`, lignes marquées « Nouveau ») ; les 5 d'ACQ-26 attendent la
  catégorie Fabrication. Aujourd'hui : 556 questions et 5 en attente.
- **Classeur « 11 »** (onglet « Modifications 20 oct. ») : importé le 20 octobre ; 181 thèmes (19 nouveaux : FIN-46 à 48, RH-41 à 49,
  COM-55 à 61), 891 données. Le 27 octobre : 8 thèmes et 41 données de plus (189 thèmes, 932 données).
- **Relecture du 23 octobre** (balayage de tous les secteurs) : trois corrections — la question qui décide du masquage de son propre
  thème reste posée (COM-10.07, sinon une cinquantaine de questions Comm n'arrivaient jamais) ; les préalables ; un tableau dont les
  lignes viennent d'un cadrage (D20) fait poser ce cadrage.
- **Relecture du 27 octobre** : 519 questions relues, doublons retirés (voir `CLAUDE.md`, section 6).
- **Audit client du 27 octobre** : corrigés M-01 (recherche du métier), D-01 (lecture des montants), Q-02 (renvoi après coupure
  réseau), A-01 (en-tête à 360 et 320 px : marges, écarts et logo resserrés), L-01 et L-04 à L-10 (mot de passe oublié) ; puis Q-03
  et L-03 pendant la vérification du 28 octobre.
- **Contrôles des boutons (27 octobre)** : corrections issues — « Enregistré » s'affiche aussi en quittant un champ ; un second clic
  sur « Je ne sais pas » rétablit la saisie valide au lieu de laisser l'écran et l'enregistrement en désaccord.
- **Vérification du questionnaire (27 et 28 octobre)** : `docs/verification/rapport.md` (chiffres, 7 corrections majeures et
  8 mineures, problèmes restants, décisions, limites, commandes), inventaire des 561 questions et matrice des dépendances
  (`inventaire-questions.csv`, `matrice-dependances.csv`), 29 constats de relecture (`docs/verification/relecture-questions.json`,
  appliqués par `scripts/verification/appliquer-relecture.py`).

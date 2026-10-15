# Rapport de tests — étape 5 (moteur) et campagne complète

Date : 15 octobre 2026. Branche `claude/caxe-project-context-gntrhm`.

## Ce qui a été testé

| Famille | Ce qui a été fait | Résultat |
|---|---|---|
| Tests automatiques | 110 tests (`npm test`) : réponses, objectif, assemblage, moteur, routage, données, inscription | 110 réussis |
| Balayage exhaustif | 9 profils × 4 agents × 3 tailles × 2 niveaux × 3 jeux de déclencheurs × 3 anciennetés (1 944 combinaisons) : une dizaine d'invariants | réussi après correction de 2 anomalies |
| Contrôle des données | `npm run donnees:controle`, analyse de chaque donnée, croisement et thème | 0 erreur, 81 avertissements |
| Base de données | 4 migrations appliquées sur PostgreSQL, écart schéma / migrations nul | réussi |
| Navigateur (bureau et téléphone 375 px) | parcours offres → inscription → tableau de bord → audit, 8 pages sans débordement, aucun lien cassé, aucune erreur de console | réussi |
| Sécurité | accès sans connexion, accès à un agent non souscrit, écriture en base d'un agent fermé, corps de 3 Mo, clé `__proto__`, HTML saisi, 20 écritures simultanées, 24 cas limites d'inscription | corrections dans « Problèmes trouvés et corrigés », points ouverts dans « Problèmes ouverts » |
| Accessibilité | libellés, ids, titres, focus clavier, zones tactiles ≥ 40 px, contraste | 2 points corrigés, 1 point ouvert |
| Dépendances | `npm audit` | Next.js corrigé, 4 avis restent (outils de build) |

## Problèmes trouvés et corrigés

| # | Problème | Gravité | Correction |
|---|---|---|---|
| 1 | Une réponse tapée puis la page quittée dans la demi-seconde n'était pas enregistrée (constaté en base) | Haute | Envoi immédiat à la perte du focus, à la fermeture de l'onglet et au changement de page |
| 2 | « 1.000 » (mille) était enregistré comme 1, sans avertissement | Haute | Lecture des nombres à la française (1 250, 12,5, 1.000, 1.234,56), message si illisible, « Valeur retenue » affichée |
| 3 | Après « Changer d'objectif », le formulaire restait ouvert : l'objectif était enregistré mais invisible | Moyenne | Le formulaire se referme |
| 4 | Inscription : erreur serveur 500 avec un CA ≥ 10 milliards ou un effectif de 10^12 | Haute | Bornes (CA ≤ 1 Md€ par mois, effectif ≤ 100 000) |
| 5 | Mot de passe de plus de 72 octets : la fin était ignorée par bcrypt sans le dire | Moyenne | Refus au-delà de 72 octets |
| 6 | Date du 30 février acceptée ; ville de 100 000 caractères acceptée ; email non borné | Basse | Date réelle exigée, ville ≤ 120, email ≤ 254 |
| 7 | COM-10.03, 10.04, 10.05 ne pouvaient jamais être posées (le thème était masqué pour qui ne publie pas, alors que ces questions s'adressent à lui) | Moyenne | Une donnée dont la condition propre est vraie reste posée |
| 8 | 12 données « si plus de N mois d'existence » étaient posées aux entreprises trop jeunes | Moyenne | Règle d'ancienneté appliquée (D01) |
| 9 | Aucun en-tête de sécurité | Moyenne | X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| 10 | Next.js 16.3.6 : 6 avis de gravité haute (cache, divulgation, SSRF) | Haute | Passage à 16.3.8 |
| 11 | Page d'audit sans titre de niveau 1 | Basse | Titre ajouté |
| 12 | « Enregistré » affiché alors qu'un nombre illisible venait d'effacer la réponse | Basse | Message d'explication, réponse existante conservée |

## Problèmes ouverts (décision ou travail à prévoir)

### Produit et parcours

1. **La formule choisie avant l'inscription est perdue.** Un visiteur choisit son offre et ses agents, mais l'écran dit « votre choix n'est pas enregistré » ; après l'inscription le compte affiche « Aucune formule choisie ». Il doit revenir aux offres. À décider : inscrire d'abord, ou garder le choix dans l'adresse jusqu'à l'inscription.
2. **Le niveau (essentiel / approfondi) ne peut pas être changé.** Le texte promet « Vous pourrez le modifier plus tard », aucun écran ne le permet. Même chose pour les données partagées déjà posées par un autre agent : « modifiables par le dirigeant » dans le document, pas d'écran.
3. **Professions réglementées : l'audit Acquisition pose encore des questions sur la publicité payante et les canaux Publicité, Prospection, Partenaires.** Le document interdit de les recommander, pas de les demander. Point lié à celui déjà ouvert avec un avocat.
4. **Valeurs absurdes d'objectif acceptées** (par exemple +10^308 %). Aucun plafond de vraisemblance.

### Sécurité

5. **Aucune limitation des tentatives de connexion** (force brute possible).
6. **Pas de politique de contenu (CSP).** Elle demande de traiter les scripts intégrés de Next.js avec un nonce.
7. **L'inscription révèle qu'un email existe** (réponse 409 explicite).
8. **Mot de passe de 10 espaces accepté.**
9. **4 avis `npm audit` restent** (prisma / deepmerge-ts, source-map-js) : outils de build, non exposés en production. Le correctif proposé par npm est un retour à une ancienne version de Prisma, non appliqué.

### Accessibilité et charte

10. **`--text-faint` (0,34) a un contraste de 2,77:1** ; la norme demande 4,5:1. Il sert aux étiquettes, aides et mentions (dont « Aucun paiement n'est pris »). Avec 0,50 le contraste est de 4,66:1. J'ai seulement remplacé ce jeton par `--text-muted` sur l'écran d'audit ; la charte est à vous.
11. **Le contour en dégradé au focus des champs de formulaire** va contre « dégradés réservés aux jauges ». À trancher.

### Données (classeur)

12. **71 thèmes notés ont moins de 2 données collectées** alors que le document exige au moins 2 questions par thème noté.
13. **28 thèmes notés (22 Comm, 6 Finance) n'ont aucune question posée au dirigeant** : leurs données sont calculées ou importées. Ils ne pourront jamais être évalués tels quels. Exemples : COM-49 à COM-54 (qualité des contenus), FIN-31, FIN-32, FIN-38.
14. **23 croisements sur 157 reposent sur des données « importées »** (statistiques des réseaux, avis, trafic) : 17 des 33 croisements Comm, 5 d'Acquisition, 1 de Finance. Aucune connexion n'existe et aucune saisie de repli n'est prévue.
15. **3 règles d'affichage non décidables** : « Vente immédiate (commerce) », « Sans travaux en cours », « une ligne par messagerie utilisée ». La question reste affichée.
16. **Volume de questions** : pour un artisan de 2 à 5 personnes, 244 questions (essentiel) ou 339 (approfondi) pour les 4 agents. Par agent, le maximum observé sur tous les profils et toutes les tailles est de 86 questions en essentiel et 117 en approfondi (Acquisition), pour une durée visée de 1 h à 1 h 15.
17. **66 % des données posées (259 sur 395) n'ont pas un format à une seule valeur** (choix, tranches, cases, tableaux). L'écran les saisit en texte libre ; les saisies adaptées viendront avec la banque de questions.

### Moteur

18. **`data/seuils.json` est vide** : aucun seuil de marché n'existe dans le classeur ni dans le document. Les 158 thèmes notés sortent « règle manquante ».
19. **Non construit, faute de règle écrite** : impacts chiffrés (formules des croisements en texte libre), impact qualifié Bloquant / Frein / Secondaire (« règles fixes » non fournies), combinaison de deux leviers sur la même étape, agrégation quand un thème porte plusieurs indicateurs notés.
20. **La banque de questions est vide** : l'écran d'audit affiche le libellé du classeur, marqué « question à rédiger ».

## Non testable dans cet environnement

- Paiement (non branché).
- Envoi d'emails, connexion Meta, connexions comptabilité et caisse (n'existent pas).
- Polices Google dans l'aperçu publié (bloquées par le réseau du bac à sable ; sans effet sur le site réel).
- Lecteur d'écran réel, Safari, Firefox, téléphones physiques.

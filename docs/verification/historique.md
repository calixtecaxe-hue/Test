# Historique et évolutions : vérification et corrections (28 octobre 2026)

Question posée par le propriétaire : pour une entreprise d'au moins trois ans, CAXE recueille-t-il les données qui permettent de
comprendre les douze derniers mois et de comparer les indicateurs pertinents à une période antérieure ?

## Réponse

**Avant les corrections : partiellement.**

- **Ce qui existait.** Le classeur prévoit 13 évolutions (données « Évolution… »). Pour 12 d'entre elles, une question sur le passé
  existait. Pour la treizième, le montant moyen d'une vente (ACQ-15.07), il manquait les ventes de l'année précédente. Une entreprise
  de trois ans pouvait recevoir toutes ces questions au niveau approfondi, selon ses réponses (publicité, site, stock, impayés).
- **Ce qui manquait.**
  - **Le chiffre d'affaires de l'année précédente** (ACQ-23.03) n'était posé qu'au niveau approfondi, et seulement par l'agent
    Acquisition. Au niveau essentiel, et pour un compte sans l'agent Acquisition, l'évolution du chiffre d'affaires sur un an ne
    pouvait pas être établie. La Finance s'en sert pourtant pour l'« effet ciseau » (XF07), l'évolution de la masse salariale
    (FIN-07.15) et celle du stock (FIN-37.06).
  - **Les ventes de l'année précédente** n'étaient demandées nulle part : l'évolution du montant moyen d'une vente (ACQ-15.07)
    n'était pas calculable.
  - **L'effectif d'il y a un an et les changements de périmètre** (ouverture, rachat, arrêt d'une activité) n'étaient demandés nulle
    part. Une hausse de la masse salariale ou du chiffre d'affaires ne pouvait donc pas être lue correctement.
- **Des périodes qui ne se comparaient pas.**
  - « En moyenne sur les 3 derniers mois » face à « il y a un an, à la même période » (ACQ-02.03, ACQ-11.02, FIN-06.03), sans dire
    quels mois.
  - La moyenne des 3 derniers mois (FIN-07.01) face à « il y a 12 mois » (FIN-07.02).
  - Un taux de marge passé calculé sur un seul mois, 11 mois avant le dernier (FIN-04.02), face à une marge actuelle calculée sur
    une autre base.
  - Un budget de communication actuel sans la publicité (COM-32.04) face à un budget passé avec la publicité (ACQ-07.05 + COM-32.03).
- **Aucune évolution n'était calculée.** Toutes les formules étaient en texte libre dans le classeur, et le compte rendu n'en
  montrait aucune. CAXE n'affichait donc pas de fausse conclusion. Mais les phrases prévues (« Vos charges ont augmenté de X % en
  un an, votre CA de Y % ») auraient reposé sur ces données incomplètes ou incomparables.
- **Les entreprises plus jeunes recevaient des questions sur des mois antérieurs à leur création.**
  - La règle « depuis la création si moins de N mois » du classeur, écrite pour 61 données (et 4 « depuis l'ouverture du compte ou
    de la fiche »), n'était pas appliquée.
  - « L'année d'avant » (ACQ-16.03) était posée dès la création.
  - « Plus ou moins que l'année d'avant » (ACQ-03.06) était posée avant 24 mois.
  - « Par rapport à il y a 12 mois » (FIN-10.05) était posée avant 12 mois.
  - Les visites du site « il y a 6 mois » (COM-13.06) n'étaient jamais masquées : leur condition n'était pas lisible par le code.
  - Plusieurs masquages étaient trop courts : ACQ-02.02 dès 6 mois pour des mois situés jusqu'à 9 mois en arrière ; ACQ-02.03,
    ACQ-11.02, FIN-06.03 et FIN-07.02 dès 12 mois pour des mois situés jusqu'à 15 mois en arrière.

**Après les corrections**, une entreprise de trois ans fournit, dès le niveau essentiel, toutes les données des évolutions prévues
sur un an. Six restent au niveau approfondi : montant moyen d'une vente, budget marketing et communication, trafic du site, stock,
impayés et charges fixes. Pour les charges fixes, la valeur d'il y a 12 mois (FIN-05.03) est posée au niveau essentiel, alors que
le total actuel a besoin du détail des abonnements (FIN-09.01), posé seulement au niveau approfondi : c'est une décision à prendre
(section 7). Chaque évolution est calculée sur deux périodes de même longueur, décalées d'un an (ou de 6 mois). Les mois sont écrits
à l'écran, et le compte rendu dit précisément ce qui manque quand une comparaison ne peut pas être faite.

---

## 1. Les analyses d'évolution, avant et après

Le classeur prévoit 13 données calculées « Évolution… ». Trois autres données comparent aussi au passé : FIN-04.02 (étape de la
marge), COM-37.02 (audience) et ACQ-16.07 (gros clients). Chacune est reprise ci-dessous : question de la valeur récente et sa
période, question de la valeur passée et sa période, condition selon l'ancienneté, calcul, ce qui n'allait pas, ce qui est fait.

| Évolution | Valeur récente | Valeur passée | Ancienneté exigée (avant → après) | Ce qui n'allait pas | Après |
|---|---|---|---|---|---|
| Demandes par mois, 12 mois (ACQ-02.06) | ACQ-02.01, moyenne des 3 derniers mois | ACQ-02.03 « il y a un an, à la même période » → **les mêmes 3 mois, un an plus tôt** | 12 → **15 mois** | Mois non précisés ; masquage trop court | Calculée ; mois écrits ; périmètre vérifié |
| Demandes par mois, 6 mois (ACQ-02.06) | ACQ-02.01 | ACQ-02.02 « il y a 6 mois » → **3 mois, six mois plus tôt** | 6 → **9 mois** | Idem | Calculée |
| Nouveaux clients par mois (ACQ-11.18) | ACQ-11.01, 3 derniers mois | ACQ-11.02 → **mêmes 3 mois, un an plus tôt** | 12 → **15 mois** | Idem | Calculée |
| Chiffre d'affaires sur 12 mois (ACQ-23.10) | ACQ-23.01, 12 derniers mois (partagée FIN-14.01, RH-11.01) | ACQ-23.03, mêmes 12 mois un an plus tôt | 24 → **13 mois** (mois antérieurs à la création non posés) | Niveau approfondi, Acquisition seulement : absente au niveau essentiel et pour la Finance | **Niveau essentiel, partagée avec la Finance (FIN-14.03)** ; lignes nommées par leur mois ; calculée sur 12 + 12 mois complets, et pour le dernier mois face au même mois un an plus tôt |
| Montant moyen d'une vente (ACQ-15.07) | CA ÷ ventes des 12 derniers mois (ACQ-23.01, ACQ-23.04) | CA ÷ ventes des 12 mois précédents (ACQ-23.03, **ACQ-23.12 nouvelle**) | — → 24 mois | Comparait le panier actuel à un seul mois, 11 mois plus tôt ; ventes de l'année précédente jamais demandées | Calculée (niveau approfondi) |
| Revenu des abonnements (ACQ-17.27) | ACQ-17.10, aujourd'hui | ACQ-17.12, il y a 6 et 12 mois | Règle « colonne 6 mois si plus de 6 mois ; 12 si plus de 12 » non appliquée → **appliquée ligne par ligne** | Lignes posées avant la création | Calculée à 6 et 12 mois ; lignes nommées par leur mois |
| Budget marketing (ACQ-07.14) | ACQ-07.06 = ACQ-03.05 + 07.01 + 07.03 + 07.04, aujourd'hui | ACQ-07.05, il y a 12 mois, même périmètre | 12 mois | Mois comparé non précisé | Calculée (posée si publicité ou agence, niveau approfondi) |
| Budget marketing et communication (COM-32.07) | COM-32.04 (sans la publicité) → **ACQ-07.06 + COM-32.02** | ACQ-07.05 (avec la publicité) + COM-32.03 | 12 mois | **Deux définitions différentes** | Même périmètre des deux côtés |
| Visites du site (COM-13.09) | ACQ-06.07, 3 derniers mois | COM-13.06 « il y a 6 mois » → **3 mois, six mois plus tôt** | Condition non lisible par le code (jamais masquée) → **9 mois** | Posée à une entreprise de 2 mois | Calculée |
| Taux de marge (FIN-04.03, FIN-04.02) | CA des 3 derniers mois (FIN-14.01) et charges variables (FIN-06.01 + FIN-08.01 + FIN-08.02) | CA des mêmes 3 mois un an plus tôt (FIN-14.03) et FIN-06.03 | 12 → **15 mois** | CA d'un seul mois, 11 mois avant le dernier, face à des charges d'une autre période | Calculée, **en points** |
| Charges fixes (FIN-05.10) | FIN-05.08 = FIN-05.01 + abonnements (FIN-09.01) + masse salariale + marketing | FIN-05.03, il y a 12 mois | 12 mois | L'aide du passé comptait les crédits, le total actuel non | Aide alignée sur les mêmes postes ; calculée au niveau approfondi seulement (abonnements FIN-09.01) |
| Masse salariale (FIN-07.15) | FIN-07.01, 3 derniers mois | FIN-07.02 « il y a 12 mois » → **mêmes 3 mois, un an plus tôt** | 12 → **15 mois** | Un mois face à une moyenne de 3 ; évolution du CA lue sur un seul mois ; effectif d'il y a un an inconnu | Calculée ; **effectif d'il y a 12 mois (FIN-07.17, nouvelle)** affiché à côté ; CA par ACQ-23.10 |
| Valeur du stock (FIN-37.06) | FIN-37.01, aujourd'hui | FIN-37.02, il y a 12 mois | 12 mois | Évolution du CA lue sur un seul mois | Calculée ; CA par ACQ-23.10 |
| Factures abandonnées (FIN-18.12) | FIN-18.05, 12 derniers mois | FIN-18.06, 12 mois précédents | 24 mois | Valeur passée nulle non traitée (division par zéro) | Calculée ; pourcentage non calculé si le passé vaut 0, et dit |
| Audience par réseau (COM-37.02) | COM-17.01, aujourd'hui | COM-37.01, il y a 6 mois (ou à l'ouverture du compte) | — | Se lit réseau par réseau, avec l'âge de chaque compte | **Pas encore calculée** : raison écrite dans `data/evolutions.json` |
| Gros clients (ACQ-16.07) | ACQ-16.01, 12 derniers mois | ACQ-16.03, 12 mois précédents | Dès la création → **24 mois** | Posée à une entreprise d'un an | Masquage corrigé ; comparaison par client **pas encore présentée** |

**Questions où le dirigeant donne lui-même le sens de l'évolution** (plus, autant, moins). Le sens vient de sa déclaration, jamais
d'un calcul ; ces réponses restent lues par l'IA.

| Question | Avant | Après |
|---|---|---|
| ACQ-03.06 canaux, « que l'année d'avant » | Posée avant 24 mois | « que sur les 12 mois précédents », masquée avant 24 mois |
| FIN-10.05 coûts des reprises, « par rapport à il y a 12 mois » | Posée avant 12 mois | « qu'il y a 12 mois », masquée avant 12 mois, mois écrit |
| FIN-17.04 délais de paiement, FIN-40.02 pertes de stock, RH-05.05 heures du dirigeant | Mois non précisé | « qu'il y a 12 mois », mois écrit |

## 2. Lacunes constatées

1. Aucune évolution n'était calculée par le code, alors que 13 sont décrites dans le classeur et que leurs phrases de rapport
   annoncent des conclusions.
2. Le chiffre d'affaires de l'année précédente manquait au niveau essentiel et pour la Finance.
3. Les ventes de l'année précédente, l'effectif d'il y a un an et les changements de périmètre n'étaient demandés nulle part.
4. Plusieurs paires de questions ne portaient pas sur des périodes comparables : longueurs différentes, mois non dits, décalage de
   11 mois au lieu de 12, définitions différentes.
5. Les règles de période du classeur selon l'ancienneté n'étaient appliquées que dans un cas : « si plus de N mois d'existence
   (sinon masquée) », 15 données. Ignorées :
   - 61 données « depuis la création si moins de N mois » ;
   - 4 « depuis l'ouverture du compte ou de la fiche » ;
   - 6 formulations particulières : colonnes 6 et 12 mois d'ACQ-17.12, site et outil de mesure de COM-13.06, réseaux de COM-37.01,
     premier exercice clos de FIN-05.04, investissements de FIN-25.01, durées plus courtes que l'ancienneté de FIN-39.01.
6. Quatre questions sur le passé étaient posées à des entreprises trop jeunes (ACQ-16.03, ACQ-03.06, FIN-10.05, COM-13.06), et
   cinq avec un masquage trop court (ACQ-02.02, ACQ-02.03, ACQ-11.02, FIN-06.03, FIN-07.02).
7. Rien ne disait sur quels mois exacts répondre : « il y a un an, à la même période », « par rapport à il y a 12 mois ».
8. Une réponse donnée un mois, puis relue le mois suivant, changeait de sens en silence, surtout pour les tableaux mois par mois.

## 3. Ce qui a été corrigé

### Périodes

- **Une période précise par question**, écrite dans la colonne « Période » du classeur 12, avec un vocabulaire que le code lit :
  « 3 derniers mois », « Mêmes 3 mois, un an plus tôt », « 12 mois précédents », « 3 mois, 6 mois plus tôt », « Il y a 12 mois »,
  « Aujourd'hui », plus les options « depuis la création si plus récente » et « masquée avant N mois d'existence ». Les anciennes
  formulations restent comprises.
- **Les mois exacts s'écrivent sous la question.** Par exemple, le 28 octobre 2026 : « Période : juillet à septembre 2025, les mêmes
  mois un an plus tôt. »
- **Mois complets seulement** : le mois en cours n'est jamais compris.
- **Tableaux mois par mois** : chaque ligne porte le nom de son mois (« Septembre 2026 »). Les mois antérieurs à la création ne
  sont pas posés.
- **Entreprise plus jeune** : « les 12 derniers mois » devient « depuis la création de votre entreprise (mai 2026) jusqu'à
  septembre 2026, soit 5 mois ». Une question qui demanderait des mois antérieurs à la création est masquée. Le contrôle des
  données refuse désormais un masquage plus court que la période demandée.
- **Réponse donnée un mois antérieur.**
  - La question le dit : « Votre réponse, donnée en septembre 2026, porte sur juin à août 2026. Mettez-la à jour… »
  - Dans un tableau mois par mois, chaque montant est replacé en face de son vrai mois.
  - Une évolution n'est calculée que si ses réponses ont été données le même mois.

### Calculs

- `data/evolutions.json` (écrit d'après le classeur) et `src/lib/moteur/evolution.ts` calculent 16 évolutions, qui couvrent
  les 13 données « Évolution… » (trois d'entre elles donnent deux comparaisons : 6 et 12 mois, ou 12 mois et dernier mois).
  FIN-04.02 est calculée avec FIN-04.03. COM-37.02 et ACQ-16.07 sont listées avec la raison pour laquelle elles ne sont pas encore
  calculées.
- **Écart dans l'unité, et écart en %** ; **en points** pour un taux. Le pourcentage n'est pas calculé, et l'écran le dit, quand la
  valeur de départ est nulle.
- **Une fourchette compte pour son milieu**, marquée « estimée ». « Je ne sais pas », « je ne suis pas cette donnée », une question
  sautée ou une case vide ne valent jamais zéro.
- **Aucun jugement.** Le moteur n'écrit ni « bien », ni « mal », ni une couleur. Aucun seuil n'existe pour cela.
- **Périmètre changé entre les deux périodes** : « non comparable », les deux chiffres affichés, sans pourcentage.
- **Masse salariale** : l'effectif d'il y a 12 mois et l'effectif actuel sont affichés à côté.
- **Distinction des trois comparaisons.**
  - Ces évolutions comparent l'entreprise à elle-même.
  - L'avancement vers l'objectif reste à part (onglet Objectif).
  - Le repère de marché reste à part (thèmes « Avec un repère de marché »).
  - L'absence de repère de marché n'empêche pas l'évolution, et un repère de marché ne remplace jamais une donnée passée manquante.

### Compte rendu

- Onglet « Priorités », bloc **« Ce qui a changé, d'après vos chiffres »** : chaque évolution établie ou non comparable, puis la
  liste des comparaisons pas encore possibles avec ce qui manque. Par exemple : « Votre entreprise a 14 mois : la question… porte
  sur des mois antérieurs à sa création. Il faut au moins 15 mois d'existence. »

### Questions reformulées (banque)

ACQ-02.02, ACQ-02.03, ACQ-11.02, ACQ-03.06, ACQ-16.03, ACQ-23.01 (aide), ACQ-23.03, COM-13.06, FIN-05.03 (aide), FIN-06.01 (aide),
FIN-06.03, FIN-07.02, FIN-10.05, FIN-14.01 (aide), FIN-17.04, FIN-18.06, FIN-37.02 (aide), FIN-40.02, RH-05.05, RH-11.01 (aide),
ACQ-07.05 (aide), COM-32.02 (aide), COM-32.03 (aide).

Selon la question, l'aide dit désormais :

- que les mois exacts sont indiqués sous la question, ou sur chaque ligne d'un tableau (21 des 23) ;
- qu'un ordre de grandeur ou une fourchette suffit (6) ;
- que 0 se distingue d'une case laissée vide (8). Par exemple : « 0 pour un mois sans chiffre d'affaires ; laissez vide un mois que
  vous ne connaissez pas : il ne compte pas pour zéro ».

## 4. Questions ajoutées ou adaptées

| Question | Analyse qu'elle permet | Pourquoi les données existantes ne suffisaient pas | Formulation | Résultat qui l'exploite |
|---|---|---|---|---|
| ACQ-23.03 passée au niveau **essentiel**, partagée avec la Finance (**FIN-14.03**) | Chiffre d'affaires sur 12 mois face aux 12 mois précédents ; dernier mois face au même mois un an plus tôt ; taux de marge des mêmes 3 mois | Seule source du chiffre d'affaires de l'année précédente, posée seulement au niveau approfondi et par l'Acquisition | « Pour chacun de ces mois, un an plus tôt, quel était votre chiffre d'affaires ? », une ligne par mois nommé | « Chiffre d'affaires sur 12 mois », « du dernier mois complet » (Acquisition et Finance), « Taux de marge » (Finance) |
| **ACQ-23.12** ventes des 12 mois précédents (approfondi) | Évolution du montant moyen d'une vente | Le nombre de ventes de l'année précédente n'était demandé nulle part | « Sur les 12 mois précédents, combien de {ventes} avez-vous réalisées au total ? » + mois écrits, fourchette acceptée | « Montant moyen d'une vente sur 12 mois » |
| **ACQ-23.13** changement de périmètre, partagée avec la Finance (**FIN-14.04**) | Savoir si deux périodes portent sur la même activité | Aucune donnée sur l'ouverture, la fermeture, le rachat ou l'arrêt d'une activité | « Sur les 24 derniers mois, le périmètre de votre activité a-t-il changé ? » : nature (dont « Aucun changement ») et mois du changement le plus récent | Toute évolution d'activité : « non comparable » si le changement tombe entre les deux périodes |
| **FIN-07.17** effectif il y a 12 mois | Lire une hausse de la masse salariale avec l'évolution de l'équipe | Le dossier ne donne que l'effectif actuel | « Il y a 12 mois, combien de personnes travaillaient dans votre entreprise, vous compris ? » (même définition que le dossier) | Précision affichée sous « Masse salariale » |

Aucune question historique n'a été ajoutée par principe : seulement là où une analyse prévue en avait besoin.

## 5. Périodes désormais utilisées

| Besoin | Période | Exemple au 28 octobre 2026 |
|---|---|---|
| Activité récente, moyenne par mois | 3 derniers mois complets | juillet à septembre 2026 |
| Évolution sur un an d'une moyenne par mois | Mêmes 3 mois, un an plus tôt | juillet à septembre 2025 |
| Évolution sur 6 mois | 3 mois, six mois plus tôt | janvier à mars 2026 |
| Activité des douze derniers mois | 12 derniers mois complets | octobre 2025 à septembre 2026 |
| Évolution annuelle | 12 mois précédents | octobre 2024 à septembre 2025 |
| Un mois face au même mois | Dernier mois complet / même mois un an plus tôt | septembre 2026 / septembre 2025 |
| Niveau actuel face à il y a un an (stock, budget, charges) | Aujourd'hui / il y a 12 mois | octobre 2026 / octobre 2025 |

Ce qui n'est jamais comparé :

- un mois à une année ;
- une année incomplète à une année complète (un mois manquant ou antérieur à la création rend l'évolution « non établie ») ;
- deux définitions différentes : le contrôle des données vérifie les périodes de chaque côté ;
- deux périmètres différents (« non comparable »).

## 6. Tests réellement exécutés

**Exécuté dans le navigateur**, application construite, base réelle, comptes fictifs : `node scripts/verification/historique.mjs`,
**32 contrôles, 32 conformes**.

- Entreprise de 37 mois au niveau essentiel : questions passées posées, mois écrits (H-01 à H-05).
- Juste avant et après trois ans (35, 36, 37 mois) : mêmes questions, car aucune règle ne change à trois ans (H-07).
- Seuils réels :
  - 8 et 9 mois ;
  - 12 et 13 mois ;
  - 14 et 15 mois ;
  - 23 et 24 mois (H-06, H-08).
- Entreprise de 5 mois : aucune question antérieure à la création ; tableau limité à 5 mois ; période « depuis la création »
  (H-09 à H-11).
- Évolutions dans le compte rendu :
  - baisse, progression, absence de variation, valeur passée nulle (H-12 à H-16) ;
  - « je ne sais pas », réponse effacée puis redonnée (H-17, H-18) ;
  - données partielles : un mois manquant, nommé (H-19) ;
  - deux années complètes (H-20) ;
  - même évolution dans la Finance sans rien redemander (H-21, H-22) ;
  - périmètre changé (H-23) ;
  - réponses de mois différents, signalées puis mises à jour (H-24 à H-26), y compris dans la carte « déjà renseignée » d'un autre
    agent (H-32) ;
  - tableau mois par mois relu le mois suivant (H-27).
- Profil modifié : 14 mois, puis 4 ans. La réponse inapplicable reste en base, ne compte plus, puis compte de nouveau (H-28, H-29).
- Reprise sur un autre appareil, téléphone 390 px (H-30, H-31).

Sauf mention contraire, les réponses sont saisies à l'écran. Les deux tableaux de 12 chiffres d'affaires sont envoyés à la route
d'enregistrement de l'application (la même que l'écran). Le mois d'une réponse est vieilli directement en base pour simuler une
réponse du mois précédent.

**Vérifié par le code testé** : `tests/historique.test.mts`, 10 tests (366 au total, tous réussis).

- périodes et mois écrits ;
- lignes du tableau ;
- masquage selon l'ancienneté ;
- écarts en % et en points ;
- valeur passée nulle ;
- estimation ;
- réponses manquantes ;
- mois non alignés ;
- périmètre ;
- effectif ;
- réponse devenue inapplicable ;
- contrôle des données (un décalage faux ou un masquage trop court est refusé).

**Contrôle des données** : `npm run donnees:controle`, aucune erreur.

- chaque période du classeur est lisible ;
- chaque question sur le passé est masquée assez longtemps ;
- les 16 évolutions comparent deux périodes de même longueur avec le bon décalage ;
- chaque donnée « Évolution… » du classeur est calculée ou listée avec sa raison.

**Simulé** : balayage de tous les métiers, activités, tailles, niveaux et agents (`node scripts/balayage-secteurs.mts`), aucune
erreur.

**Série complète** relancée après les corrections : résultat dans `docs/verification/resultats/synthese.txt`.

## 7. Décisions qui restent au propriétaire

1. **Charges fixes au niveau essentiel** : FIN-05.03 (il y a 12 mois) est posée au niveau essentiel, mais le total actuel (FIN-05.08)
   a besoin des abonnements et contrats (FIN-09.01), posés au niveau approfondi. Au niveau essentiel, l'évolution dit donc qu'elle
   n'est pas encore possible. Trois choix :
   - poser FIN-09.01 au niveau essentiel ;
   - demander au niveau essentiel un seul total des abonnements ;
   - passer FIN-05.03 au niveau approfondi.
2. **ACQ-23.03 au niveau essentiel** : 12 montants de plus pour une entreprise de plus de 13 mois. Autre choix possible : un seul
   total annuel au niveau essentiel, le détail mois par mois restant au niveau approfondi.
3. **Textes des nouvelles questions** : ACQ-23.12, ACQ-23.13 et FIN-14.04 (choix proposés pour le périmètre), FIN-07.17. Et
   présentation du bloc « Ce qui a changé, d'après vos chiffres ».
4. **Comptes sans l'agent Acquisition** : l'évolution du budget de communication (COM-32.07) a besoin du budget d'il y a 12 mois
   (ACQ-07.05), posé par l'Acquisition. Le classeur le dit « partagé avec Comm », mais aucune ligne Comm ne le pose. Faut-il le
   poser à l'agent Comm ?
5. **Audience par réseau (COM-37.02) et chiffre d'affaires par gros client (ACQ-16.07)** : comparaisons par ligne, à construire
   ou non.
6. **FIN-05.04, « si un premier exercice est clos »** : CAXE ne connaît pas la date de clôture. La question reste posée, avec une
   note. Faut-il demander la date de clôture ?
7. **ACQ-17.02**, part des clients de l'année d'avant revenus : posée dès 12 mois, alors que « l'année d'avant » est incomplète
   avant 24 mois. Faut-il la garder ainsi ou la masquer jusqu'à 24 mois ?
8. **Estimation dans un tableau** : une case de tableau ne peut pas être marquée « estimée ». Le chiffre d'affaires mois par mois
   est donc compté comme exact.
9. **Réponses de mois différents** : une évolution attend que ses deux réponses aient été données le même mois. Faut-il tolérer un
   mois d'écart ?
10. **Couleur d'une évolution** : aucune règle ne dit quand une évolution est rouge, orange ou verte, donc aucune couleur n'est
   affichée (option B du 28 octobre).
11. **Classeur** : la version corrigée est `docs/CAXE_Themes_Chiffres_4_agents_12.xlsx`, avec l'onglet « Modifications 28 oct. »
    (59 changements). C'est elle qu'il faut modifier ensuite. Réimporter une version plus ancienne effacerait ces corrections,
    mais le contrôle des données le signalerait.

## 8. Fichiers

| Fichier | Contenu |
|---|---|
| `docs/CAXE_Themes_Chiffres_4_agents_12.xlsx` | Classeur corrigé, onglet « Modifications 28 oct. » |
| `CAXE_Banque_Questions.xlsx`, `data/banque/questions.json` | Banque reformulée, 5 questions ajoutées (`scripts/verification/appliquer-historique.py`) |
| `data/evolutions.json` | Les 16 évolutions calculées, et les 3 données non calculées avec leur raison |
| `src/lib/audit/periodes.ts` | Lecture des périodes, mois écrits, lignes de tableau, masquage |
| `src/lib/moteur/evolution.ts` | Calcul des évolutions et contrôle de leur alignement |
| `tests/historique.test.mts` | Tests automatisés |
| `scripts/verification/historique.mjs`, `resultats/historique.json` | Contrôle dans le navigateur et son résultat |

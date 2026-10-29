# Audit de l'utilité de la banque de questions (28 octobre 2026)

La banque n'a pas été modifiée. Ce rapport propose ; le propriétaire arbitre les retraits, les remplacements et les changements de
sens. Les textes et réponses proposés sont des propositions à valider.

## 1. Synthèse

**Examinées : 566 questions** (561 de la banque et 5 en attente, ACQ-26), **plus 17 questions de cadrage**. Les 4 déclencheurs
qui lisent une question de la banque (D13, D20, D25, D27) sont évalués avec cette question. Chaque question a été lue (texte,
réponses, conditions, profils, niveau) et confrontée à tout ce qui la lit : calculs, croisements, scénarios, diagnostic Comm,
indicateurs de marché, règles d'affichage, tableaux liés, réponses déduites ou pré-remplies, évolutions.

**Non vérifiées sur le fond : 20.** Les 5 questions ACQ-26 (catégorie Fabrication à créer) et les 15 questions du brief de création
COM-57 (posées seulement à la première création de contenu, fonction non construite) ont été lues, mais leur usage ne peut pas être
confronté à un traitement qui existe.

**Résultat.**

- **428 questions sont justifiées telles quelles** : une autre réponse change légitimement un calcul, un diagnostic, une priorité,
  une recommandation ou le parcours.
- **81 sont à conserver, mais leur exploitation est à développer** : la question est utile, rien ne la lit encore (calcul à écrire,
  lien manquant dans le classeur, règle de lecture).
- **52 questions de la banque sont à modifier**, et 3 questions de cadrage :
  - 20 à retirer ;
  - 4 à fusionner avec une autre ;
  - 20 à rendre conditionnelles ;
  - 7 à préciser ;
  - 1 à remplacer (FIN-48.01).
- **69 questions conservées n'ont aucun usage écrit dans le classeur** (colonne « Utilisée dans » vide, aucun calcul ni règle) :
  - 58 sont classées « exploitation à développer », dont les 15 du brief COM-57 ;
  - 11 sont justifiées ici par leur rôle de contexte pour l'IA.

  Pour toutes, l'usage reste à écrire dans le classeur.

**Ce qu'il faut retenir.**

1. **Rien de ce que prévoit le classeur n'est encore calculé.** Les formules des croisements sont en texte libre, les règles de
   notation Pratique ne sont pas écrites et l'IA n'est pas branchée. Aujourd'hui, seuls le parcours (conditions, masquages, lignes
   des tableaux), les réponses déduites, le total pré-rempli de FIN-05.02 et les 16 évolutions sont exécutés par le code.
   - 36 questions sont « notées directement » sans règle ;
   - 90 sont « lues par l'IA » sans IA.

   L'utilité d'une question se juge donc ici sur l'usage prévu.
2. **Treize questions sont posées mais pas lues par le calcul qui en a besoin.** C'est le gain le plus net, sans rien demander de
   plus au dirigeant. Exemples :
   - le total des abonnements FIN-09.10 manque aux charges fixes FIN-05.08 ; c'est l'écart du niveau essentiel signalé le
     28 octobre ;
   - la rémunération du dirigeant (FIN-46.01, 46.03) manque aux croisements XF03 et XF38 ;
   - le taux de remise fournisseur FIN-20.08 manque à XF26 ;
   - les heures perdues à cause du matériel (RH-15.03) manquent à XR29 ;
   - l'absence possible du dirigeant (RH-05.10) manque à XR23, qui lit à la place une question sur les autres personnes clés.

   Liste complète : section 6.
3. **Vingt questions sont posées à des dirigeants pour qui elles n'ont pas d'objet.**
   - Cinq questions RH sont posées au dirigeant seul alors qu'elles portent sur une équipe.
   - Des pratiques sont demandées sans que le problème qu'elles traitent existe : rappel des rendez-vous sans absences, relance des
     paniers sans paniers abandonnés, relance des impayés sans impayés.

   Une réponse « jamais » y deviendrait un défaut sans raison.
4. **Six questions sortent du périmètre des agents ou font juger l'IA.**
   - Hors périmètre : heures supplémentaires « ni payées ni récupérées » (RH-06.06), financements de la formation (RH-25.02),
     rémunération variable (RH-48.02), types de contrat (RH-46.02), délai de prévenance du planning (RH-47.02).
   - Jugement de l'IA : taux d'intérêt jugé sans repère (FIN-22.02).
   - En Comm, plusieurs calculs du classeur sont « appliqués par l'IA » (grille du positionnement, grille des publications, thèmes
     des avis). Cela contredit la règle selon laquelle l'IA ne produit aucune couleur (section 6).
5. **FIN-48.01 (banquier)** mesure une habitude, pas un besoin. La recommandation est de la remplacer par une question sur le besoin
   de financement, posée seulement quand ce besoin est établi par des réponses existantes (section 4).

**Classement par bénéfice pour le client** (détail en section 7).

- **Compréhension** : 9 textes à préciser. En tête, le tableau de 42 cases des publications (COM-39.01), la phrase de positionnement
  qui pose trois questions (COM-01.01), les choix « Offre 1 / 2 / 3 » qui n'affichent pas le nom des offres (ACQ-13.12) et la
  question de découvert « sur la période » sans période (D11).
- **Pertinence** : 21 questions à ne poser qu'à qui elles concernent.
- **Réduction de l'effort** :
  - 24 questions à retirer ou fusionner, presque toutes au niveau approfondi : environ 55 cases de moins pour qui va jusqu'au bout ;
  - au niveau essentiel, le gain vient surtout des 12 questions rendues conditionnelles et de la réduction de COM-39.01 de 42 à
    24 cases.

## 2. Méthode

**Sources.**

- Banque écrite : `data/banque/questions.json` et `en-attente.json`. C'est la conversion de la page « Banque de questions », qui
  fait foi ; la page HTML n'a pas été relue à nouveau pour cet audit.
- Classeur importé : `data/donnees-*.json`, colonnes « Sert à » et « Utilisée dans », entrées des données calculées.
- Croisements, scénarios, diagnostic Comm, règles d'affichage, évolutions, pré-réponses, réponses déduites, tableaux liés.
- Catalogue des indicateurs comparables, catalogue des effets d'actions.

**Outils** (lecture seule, aucun fichier de `data/` modifié) :

- `node scripts/verification/utilite-extraire.mjs` écrit `docs/audit-utilite/usages.json` : tout ce qui lit chaque question.
- Les évaluations sont écrites à la main, une par question, dans `docs/audit-utilite/evaluations/*.txt`.
- `node scripts/verification/utilite-rapport.mjs` les assemble avec les utilisations :
  - il écrit `questions.csv` et `evaluations.json` ;
  - il met à jour les blocs générés de ce rapport ;
  - il refuse une question sans évaluation et une évaluation mal formée.

**Le test appliqué à chaque question** : « À situation identique, si cette réponse change, qu'est-ce qui change légitimement dans le
diagnostic, la priorité ou la recommandation ? »

**Ce qui est distingué.**

- **Usage exécuté** : vérifié dans le code et couvert par les contrôles existants.
- **Usage prévu** : écrit dans le classeur, pas encore calculé.
- **Vérification dans le code** : faite pour cet audit, et dite comme telle (D07).
- **Jugement de l'auditeur** : la justification et le problème de chaque évaluation.
- Aucun parcours n'a été exécuté dans un navigateur pour cet audit. Aucun montant, délai, seuil ni gain n'a été inventé : quand il
  en manque un, l'évaluation le dit (champ « donnée ou règle manquante »).

**Catégories.**

| Catégorie | Sens |
|---|---|
| Justifiée | Une autre réponse change légitimement le calcul, le diagnostic, la priorité, la recommandation ou le parcours |
| Utile, exploitation à développer | L'information sert, mais rien ne la lit encore : calcul, lien ou règle à écrire |
| Utile sous conditions | Utile pour une partie des dirigeants seulement ; posée aux autres, elle n'a pas d'objet |
| Mal formulée | Le texte, les réponses ou le niveau gênent la compréhension ou la lecture |
| Utilité à justifier | Ni usage écrit ni usage évident ; au propriétaire de dire à quoi elle sert |
| Peu utile | Une autre réponse ne change rien, ou l'information est déjà demandée ailleurs |

## 3. Chiffres

<!-- debut:chiffres -->
| | Acquisition | Finance | RH | Comm | Total |
|---|---:|---:|---:|---:|---:|
| Questions examinées (banque et en attente) | 189 | 117 | 128 | 132 | 566 |
| dont en attente (ACQ-26, Fabrication) | 5 | 0 | 0 | 0 | 5 |
| **Justifiées telles quelles** | 142 | 101 | 94 | 91 | 428 |
| Conservées, exploitation à développer | 24 | 8 | 17 | 32 | 81 |
| Utilité à justifier (conservées ou non) | 1 | 2 | 4 | 2 | 9 |
| Utiles sous conditions | 7 | 3 | 8 | 3 | 21 |
| Mal formulées | 2 | 1 | 2 | 2 | 7 |
| Peu utiles | 8 | 3 | 3 | 2 | 16 |
| Conservées sans aucun usage écrit dans le classeur | 14 | 7 | 18 | 30 | 69 |

| Recommandation | Acquisition | Finance | RH | Comm | Total |
|---|---:|---:|---:|---:|---:|
| Conserver | 166 | 109 | 111 | 123 | 509 |
| Préciser | 2 | 1 | 2 | 2 | 7 |
| Rendre conditionnelle | 7 | 2 | 8 | 3 | 20 |
| Fusionner | 1 | 0 | 2 | 1 | 4 |
| Retirer | 8 | 4 | 5 | 3 | 20 |
| Remplacer | 0 | 1 | 0 | 0 | 1 |
| En attente | 5 | 0 | 0 | 0 | 5 |

Questions de cadrage examinées à part : 17 (conserver 14, préciser 2, rendre conditionnelle 1).
<!-- fin:chiffres -->

Une question peut relever de plusieurs catégories (par exemple utile sous conditions et à exploiter) : les lignes de catégories ne
s'additionnent pas.

## 4. Cas de référence : FIN-48.01

**La question** : « Quand avez-vous fait le point sur votre activité avec votre banquier pour la dernière fois ? ».

- Réponses : Dans les 6 derniers mois / Il y a 7 à 12 mois / Il y a plus d'un an / Jamais.
- Posée au niveau essentiel, à tous les profils, sans condition.
- Thème FIN-48 « Relation avec la banque », nature Pratique, impact qualifié ; c'est sa seule question.

**Usage** : aucun.

- Ni « Sert à » ni « Utilisée dans » dans le classeur.
- Aucun calcul, croisement, scénario ni règle ne la lit.
- La règle de notation Pratique n'est pas écrite.

**Le test.** À situation identique, passer de « Dans les 6 derniers mois » à « Jamais » ne change rien de légitime tant que
l'entreprise n'a besoin d'aucun financement. Une entreprise sans découvert, sans investissement à financer et sans tension de
trésorerie n'a aucune raison d'être pénalisée pour « jamais ».

Quand un besoin existe, ce qui compte est que la banque en soit informée à temps, pas la date du dernier rendez-vous. La question
mesure une habitude ; le conseil qu'elle provoque (« Allez voir votre banquier ») n'a ni problème, ni montant, ni échéance.

**Ce que la banque sait déjà du financement.**

| Besoin | Questions existantes | Ce qu'elles donnent |
|---|---|---|
| Découvert | D11, FIN-24.01 à 24.05, FIN-11.03 | Jours par mois, montants, agios, cause, mois concernés, marge sous le découvert autorisé ; découvert accidentel ou structurel (XF28) |
| Crédits en cours | D10, FIN-22.01 | Mensualités, capital restant, fin ; poids de la dette (XF27) |
| Investissement | D12, FIN-23.01, FIN-25.01, FIN-27.01 | Coût, mode de financement (trésorerie, prêt, leasing…), gain attendu ; effet sur la trésorerie (XF30) |
| Trésorerie à venir | FIN-11.01, 11.02, FIN-13.01, 13.02 | Trésorerie des 3 prochains mois et mois de tension (FIN-13.03, 13.04, XF18) |
| Objectif | FIN-17.02, FIN-19.01, FIN-20.02… | Trésorerie à avancer pour atteindre l'objectif (FIN-32.01, XF32) ; croissance finançable sans emprunt (XF33) |

Le besoin de financement se déduit donc des réponses existantes. FIN-48.01 n'en apporte aucun élément.

**Les options.**

1. **Conserver telle quelle** : déconseillé. Aucun usage, « jamais » devient un défaut, et le conseil reste général.
2. **Reformuler** sans condition (« Votre banquier connaît-il votre objectif ? ») : meilleur sens, mais toujours posée à qui n'a
   aucun besoin.
3. **Rendre conditionnelle**, texte inchangé : ne plus la poser sans besoin. La date du dernier rendez-vous reste une mesure
   indirecte.
4. **Remplacer et rendre conditionnelle** : recommandé (proposition, à valider).
   - Texte : « Votre banque connaît-elle ce besoin de financement ? ».
   - Réponses : Oui, la demande est en cours / Oui, elle a été refusée / Non, pas encore / Je ne compte pas passer par une banque.
   - Posée si D11 = oui (découvert sur les 12 derniers mois), ou si le financement principal de l'investissement (FIN-23.01) est
     « Prêt » ou « Leasing ».
   - Plus tard, quand les calculs existeront : si la trésorerie à avancer pour l'objectif dépasse la trésorerie disponible au-delà de
     la sécurité (XF33).
   - Chaque réponse donne alors un conseil précis :
     - le **problème** : découvert structurel de N jours par mois, ou investissement de N € financé à N % par emprunt ;
     - l'**action** : présenter ce besoin chiffré à la banque, ou chercher un autre financement si la banque a refusé ;
     - la **raison** : agios, mois de tension ;
     - l'**échéance** : avant le mois de tension calculé ;
     - le **suivi** : jours de découvert au point d'étape.
   - « Je ne compte pas passer par une banque » n'est pas un défaut.
   - Le rapport ne recommande aucun produit bancaire.
5. **Retirer** : acceptable. Le besoin se lit déjà dans les réponses existantes, et le plan peut proposer de préparer la demande sans
   savoir quand le dirigeant a vu son banquier. Le thème FIN-48 n'aurait plus de question : le supprimer, ou le passer en Contexte.

**Ce qui manque pour l'option 4.**

- Le gabarit de texte qui nomme le besoin détecté (découvert ou investissement).
- La lecture de chaque réponse.
- La condition sur un champ de FIN-23.01 (la forme `FIN-23.01#financement` existe déjà).

## 5. Conseils génériques : ce que les réponses permettent de préciser

Un conseil est précis quand il dit :

- le problème constaté ;
- l'action ;
- la raison chiffrée ;
- la priorité ou l'échéance ;
- comment le suivre.

Pour chaque conseil général cité dans la demande, ce que la banque fournit déjà, et ce qui manque.

| Conseil général | Questions qui risquent de le produire | Problème | Action | Raison | Priorité, échéance | Suivi | Ce qui manque |
|---|---|---|---|---|---|---|---|
| « Allez voir votre banquier » | FIN-48.01 | non | non | non | non | non | Le besoin de financement : voir section 4 |
| « Communiquez davantage » | COM-05.01, COM-27.02, COM-58.01, COM-61.01 (pratiques notées seules) | oui | oui | en partie | en partie | oui | L'étape du parcours qui bloque est mesurée (portée, réactions, visites du profil, clics, messages, demandes : COM-17 à COM-23, XC01). Manquent les calculs du parcours (COM-58.03, COM-61.03, COM-39.06, à écrire) et une règle qui place l'action sur l'étape la plus faible |
| « Organisez-vous mieux » | RH-01.01, RH-15.01, RH-18.01, RH-47.01 | oui | en partie | oui | en partie | oui | Les problèmes sont mesurés (urgences et leurs causes RH-09, interruptions RH-10, sollicitations RH-03, changements de planning RH-47.03). Manque une règle : une pratique absente n'est retenue que si le problème qu'elle traite est constaté |
| « Déléguez certaines tâches » | RH-05.03, RH-08.04 | oui | en partie | oui | oui | oui | Au niveau essentiel, seules les heures délégables sont connues (tranches). Le nom des tâches est demandé en approfondi (RH-17.01, RH-04.04, RH-42.01 pour le dirigeant seul). Au niveau essentiel, le plan doit dire qu'il manque le nom des tâches au lieu d'en inventer |
| « Suivez votre trésorerie » | FIN-13.06, FIN-34.01 à 34.05, FIN-35.01 | oui | oui | oui | oui | oui | CAXE calcule lui-même la trésorerie des 3 prochains mois et le mois de tension (FIN-13.03, 13.04). Le conseil doit nommer ce mois et son montant. Manquent l'exécution de ces calculs et le branchement de FIN-13.06 sur XF46 |

D'autres conseils généraux sont signalés question par question (champ « conseil générique à risque ») :

- « Écrivez des fiches de poste », « Équipez-vous d'un logiciel de suivi », « Proposez une garantie » ;
- « Créez un programme de fidélité », « Mesurez la satisfaction », « Fixez-vous des objectifs », « Formez votre équipe » ;
- « Renégociez vos crédits », « Proposez le prélèvement automatique ».

La règle proposée est commune :

- une pratique absente ne devient un défaut que si le problème qu'elle traite est constaté par une réponse chiffrée ;
- sinon, elle n'est ni notée ni conseillée.

## 6. Points à signaler

**Liens manquants dans le classeur** (la question est posée, le calcul qui en a besoin ne la lit pas) :

| Question | À ajouter aux entrées de | Pourquoi |
|---|---|---|
| FIN-09.10 (total des abonnements) | FIN-05.08 (charges fixes) | Au niveau essentiel, le détail FIN-09.01 n'est pas posé : les charges fixes sont incomplètes. C'est la solution « un seul total des abonnements » de la section 15 ; en approfondi, pré-remplir par la somme du détail |
| FIN-46.01, FIN-46.02, FIN-46.03 | XF03, XF38 | « Seuil en vous rémunérant » et « ce que l'entreprise peut verser au dirigeant » ignorent la rémunération du dirigeant |
| FIN-20.08 (taux de remise fournisseur) | XF26 | XF26 compare la remise au coût du découvert mais ne lit que la question oui / non |
| FIN-13.06 (plan de trésorerie) | XF46 | Seule question de pilotage absente du niveau de pilotage financier |
| RH-15.03 (heures perdues) | XR29 | XR29 multiplie des heures perdues qu'il ne lit pas |
| RH-05.10 (absence possible du dirigeant) | XR23, à la place de RH-38.01 | RH-38.01 porte sur les autres personnes clés |
| RH-07.02 (réserve en période de pic) | XR30 | Dit si les mois forts passent sans renfort |
| ACQ-18.07 (gain du parrain) | ACQ-18.05 | Le coût d'un client recommandé est ce gain |
| ACQ-07.15 (retour direct après une plateforme) | XA39 | Le coût réel d'une plateforme dépend de ce retour |
| COM-09.08 (preuve par offre) | COM-09.07 | « Offres sans preuve » ne lit que la question par catégorie de clients |
| COM-22.04 (demandes par réseau) | COM-22.02 | « Réparties par réseau quand c'est connu » : c'est cette question |

**L'IA ne juge rien sans repère (réflexe 1).**

- FIN-22.02 (taux d'intérêt) n'a de sens que si l'IA juge le taux : aucun repère sourcé n'existe.
- En Comm, le classeur fait appliquer des grilles par l'IA :
  - positionnement (COM-01.02) ;
  - appel à l'action (COM-20.01) ;
  - thèmes des avis (COM-44.05) ;
  - grille des publications (COM-49 à COM-54, à partir de COM-39.02).

  Le document de règles décide d'une « grille fixe de 6 critères ». Qui l'applique reste à trancher : si c'est l'IA, elle produit
  une couleur, ce que la règle fondatrice interdit.
- COM-03.01 (promesse, texte libre) est « notée directement » : seule l'IA pourrait la noter.

**Périmètre des agents** (jamais de droit du travail, ni de conseil juridique ou fiscal) :

- RH-06.06 (heures supplémentaires « ni payées ni récupérées ») ;
- RH-25.02 (financements de la formation) ;
- RH-48.02 (rémunération liée aux objectifs) ;
- RH-46.02 (types de contrat) ;
- RH-47.02 (délai de prévenance du planning).

Plusieurs questions gardées demandent au rapport de rester sur le terrain de l'organisation : RH-19.03 (entretiens), RH-32.01
(motifs juridiques de départ), RH-34.03 (absences longues), COM-05.01 (garanties), COM-15.05 (accord des contacts).

**Questions déjà demandées ailleurs.**

- COM-24.01 redemande l'objectif de l'agent Comm, comme ACQ-24.01 retirée le 27 octobre.
- D07 (stock) est reposée dans la Finance alors que le stock est connu par le métier ou demandé à l'inscription. Vérification dans
  le code : aucune reprise de cette réponse (`src/lib/audit/contexte-compte.ts`, `src/app/api/compte/metier/route.ts`).
- D04 (publicité payante) se déduit des canaux payants cochés.
- COM-63.01 (publicité Google) se déduit de D04 = non.

**Règles qui demandent un mécanisme nouveau.**

- Comparer deux réponses : ACQ-02.05.
- Lire la somme d'un tableau : FIN-18.04.
- Tirer les choix d'une colonne d'une autre réponse : ACQ-13.12.

**Thèmes « notés directement » sans repère possible.** Dans trois thèmes de nature Marché, des questions sont notées directement
alors qu'elles ne sont pas parmi les 36 indicateurs comparables : ACQ-09.05, ACQ-10.07, ACQ-13.05. Aucun seuil sourcé ne pourra les
noter : elles relèvent du contexte ou d'une règle Pratique.

## 7. Classement par bénéfice pour le client

Dans chaque tableau, les questions les plus coûteuses viennent en premier : nombre de cases, niveau essentiel, part des profils
concernés.

<!-- debut:classement -->
**Compréhension : textes à préciser** (9)

| Code | Recommandation | Raison |
|---|---|---|
| COM-39.01 | Préciser | Quarante-deux cases au niveau essentiel (six publications × sept colonnes) : effort disproportionné. Le classement des publications (COM-39.06) lit d'abord les clics et les contacts, puis la portée ; réactions, visites du profil et nouveaux abonnés y sont secondaires. |
| COM-01.01 | Préciser | Une seule phrase pour trois questions (quoi, pour qui, différence). Le classeur la fait noter par « une grille fixe de 3 critères appliquée par l'IA » (COM-01.02) : c'est l'IA qui juge et produit une couleur, ce que la règle fondatrice interdit (réflexe 1). |
| ACQ-01.07 | Préciser | Texte libre posé au niveau essentiel, alors que le chiffre qui lui donne un sens (ACQ-01.08, part du CA dans cette zone) n'est posé qu'en approfondi : au niveau essentiel, XA31 reçoit un nom de zone sans chiffre. |
| ACQ-13.12 | Préciser | Les choix sont « Offre 1 / Offre 2 / Offre 3 / Une autre offre », alors que les offres d'ACQ-13.01 portent un nom et peuvent aller jusqu'à dix lignes : le dirigeant ne voit pas le nom de ses offres et ne peut pas choisir la quatrième. |
| FIN-46.02 | Préciser | Aucun usage écrit. Selon la forme de l'entreprise, les cotisations du dirigeant sont déjà comptées dans les salaires (FIN-07.01) ou payées à part : la question peut faire compter deux fois la même somme. |
| D07 | Préciser | Vérification dans le code : la réponse sur le stock donnée à l'inscription (métier dont le stock est « à demander ») ou fixée par le métier n'est pas reprise ; D07 est reposée dans la Finance. |
| D11 | Préciser | « Sur la période » ne dit pas de quelle période il s'agit ; les questions qu'elle ouvre portent sur les 12 derniers mois (FIN-24.01, 24.03). |
| RH-38.01 | Préciser | Le thème s'appelle « Absence du dirigeant » et la dépendance totale au dirigeant (XR23) lit cette question comme « absence possible du dirigeant », mais elle porte sur les personnes clés désignées en RH-37.01, hors dirigeant. |
| RH-21.01 | Préciser | « Notée directement », mais le sens de la note n'est pas évident : répondre « dans l'heure » peut signifier des interruptions permanentes (RH-10) et des sollicitations évitables (RH-03), répondre « le lendemain » peut bloquer l'équipe. |

**Pertinence : questions posées sans objet à une partie des dirigeants** (21)

| Code | Recommandation | Raison |
|---|---|---|
| COM-62.03 | Rendre conditionnelle | Même problème que COM-62.02 ; tableau libre de cinq lignes. |
| COM-62.02 | Rendre conditionnelle | Posée à tout dirigeant qui a un site, y compris quand COM-62.01 dit qu'il n'a pas l'outil qui donne ces chiffres. |
| RH-37.01 | Rendre conditionnelle | Le thème n'est pas masqué pour un dirigeant seul, alors que la question exclut le dirigeant (« En dehors de vous ») : pour lui, le tableau reste vide. |
| ACQ-13.05 | Rendre conditionnelle | Posée à tous les profils, alors que le commerce, la restauration et l'e-commerce affichent des prix fixes par nature : la réponse y est presque toujours « Oui » et n'apprend rien. |
| FIN-11.03 | Rendre conditionnelle | Posée à tous au niveau essentiel, mais lue seulement par la marge restante sous le découvert autorisé (FIN-24.08), calculée pour qui a été à découvert (D11). |
| FIN-18.04 | Rendre conditionnelle | Posée même à qui n'a aucune facture en retard ; « Aucune relance » ne doit pas devenir un défaut dans ce cas. |
| COM-63.01 | Rendre conditionnelle | Posée à tous, alors que D04 (publicité payante ou agence) dit déjà si l'entreprise fait de la publicité payante : si D04 = non, la réponse est forcément « non ». |
| RH-15.01 | Rendre conditionnelle | « Notée directement », posée aussi au dirigeant seul (planning partagé, messagerie d'équipe). Un outil absent n'est pas un défaut en soi dans une petite équipe. |
| ACQ-11.39 | Rendre conditionnelle | Posée à tous les restaurants, y compris à ceux qui ne livrent pas ; lue par l'IA sans lecture écrite. |
| ACQ-13.13 | Rendre conditionnelle | Posée même à qui n'a jamais augmenté ses prix ; la question n'a alors pas d'objet. |
| D04 | Rendre conditionnelle | Les canaux payants cochés dans ACQ-03.01 (publicité en ligne, publicité locale, plateformes…) disent déjà, pour la plupart des dirigeants, s'ils font de la publicité payante : la question est alors redemandée. |
| ACQ-02.05 | Rendre conditionnelle | Posée même quand toutes les demandes correspondent à l'offre (ACQ-02.04 égale ACQ-02.01) ; la question n'a alors pas d'objet. |
| ACQ-09.06 | Rendre conditionnelle | Posée même à qui n'a aucune absence sans prévenir. « Jamais » ne doit pas devenir un défaut quand il n'y a pas d'absences : la pratique n'a d'intérêt qu'en présence du problème. |
| ACQ-11.16 | Rendre conditionnelle | Posée même quand aucun panier n'est abandonné ; « Non » ne doit pas devenir un défaut dans ce cas. |
| RH-01.01 | Rendre conditionnelle | « Notée directement » : des missions non écrites deviennent un défaut même dans une équipe de trois personnes où chacun sait quoi faire. |
| RH-02.01 | Rendre conditionnelle | Le thème n'est pas masqué pour un dirigeant seul : « Aucune » y devient un défaut alors qu'il n'a personne à qui confier une décision. |
| RH-14.01 | Rendre conditionnelle | Posée au dirigeant seul (« un espace que tout le monde peut consulter »), alors que sa situation est couverte par RH-45.02 (informations notées pour qu'une autre personne puisse s'en servir). |
| ACQ-17.15 | Rendre conditionnelle | Posée à tout abonnement, y compris à qui n'a qu'une formule : la réponse « 0 » ressemble alors à un défaut alors que la montée de formule est impossible. |
| RH-10.04 | Rendre conditionnelle | Le thème n'est pas masqué pour un dirigeant seul, mais la question porte sur « un membre de votre équipe ». |
| RH-32.06 | Rendre conditionnelle | Aucun usage écrit ; posée même quand personne n'est parti (aucune condition), alors que RH-32.03 et 32.04 attendent un départ. |
| RH-36.01 | Rendre conditionnelle | Contexte lu par l'IA, posé à toute équipe de 6 personnes ou plus. « Rien de particulier » pousse un conseil général de reconnaissance, sans lien avec un problème. |

**Réduction de l'effort : questions à retirer ou à fusionner, de la plus coûteuse à la moins coûteuse** (24)

| Code | Recommandation | Raison |
|---|---|---|
| COM-17.02 | Retirer | Lue par l'IA seulement. La croissance nette de l'audience est déjà calculée (COM-37.02, à partir de COM-37.01) ; sans repère, l'IA ne peut pas dire qu'un nombre de désabonnements est élevé. |
| FIN-22.02 | Retirer | Lue par l'IA seulement. Pour en tirer quelque chose, l'IA devrait juger qu'un taux est élevé : aucun repère de taux n'est parmi les 36 indicateurs comparables, et l'IA ne juge rien sans repère sourcé (réflexe 1). |
| COM-13.11 | Retirer | Lue par l'IA, mais l'IA du rapport ne consulte aucune page et aucun outil n'analyse le site : l'adresse ne sert à rien aujourd'hui. |
| FIN-37.03 | Retirer | Lue par l'IA seulement. Sans les ventes par catégorie, la répartition du stock ne donne ni rotation ni stock dormant par catégorie ; tableau libre de cinq lignes. |
| ACQ-06.13 | Retirer | Aucun usage écrit ; tableau libre de cinq lignes, à relever dans les statistiques de la fiche Google, au niveau approfondi. |
| ACQ-01.04 | Retirer | Ne sert qu'au panier moyen par catégorie (ACQ-01.13), qu'aucun croisement, scénario ni phrase de rapport ne lit. La valeur d'un client par catégorie (ACQ-01.12, XA32) se calcule déjà sans elle, et la fréquence d'achat globale est demandée en ACQ-17. |
| ACQ-20.05 | Retirer | Aucun usage écrit. CAXE fait déjà fixer un objectif chiffré au début de chaque agent et en suit l'avancement ; la fréquence de lecture des chiffres est demandée en ACQ-20.02. |
| COM-24.01 | Fusionner | Redemande l'objectif de l'agent : depuis le 22 octobre, le dirigeant choisit ses objectifs Comm au début de l'agent. ACQ-24.01 a été retirée le 27 octobre pour la même raison. |
| ACQ-15.14 | Retirer | Aucun usage écrit. La part du chiffre d'affaires de chaque offre est déjà demandée en ACQ-13.02, dont les lignes sont réglables jusqu'à dix : l'offre haut de gamme peut y figurer. |
| ACQ-18.06 | Retirer | Aucun usage écrit. Les avis (ACQ-06.01, thèmes COM-44 à COM-46) et les résiliations (ACQ-17.13) mesurent déjà la satisfaction de façon chiffrée. |
| FIN-09.03 | Retirer | Marquée « notée directement », sans règle. Le tableau FIN-09.01 (utilisation, renouvellement) et FIN-09.02 désignent déjà les contrats à renégocier. |
| COM-13.05 | Retirer | Lue par l'IA seulement ; liste libre de pages, sans chiffre. Les demandes par type (COM-13.03) et l'origine des visites (COM-13.04) disent déjà où le site travaille. |
| RH-46.02 | Retirer | Aucun usage écrit ; tableau de six lignes. Les types de contrat (CDD, intérim, apprentis…) touchent au droit du travail, hors du périmètre de l'agent : l'IA ne peut pas en tirer un conseil sans en sortir. |
| ACQ-15.11 | Retirer | Aucun usage écrit ; aucun calcul ni seuil ne peut lire le montant à partir duquel le paiement est proposé. |
| ACQ-15.13 | Retirer | Aucun usage écrit ; le montant moyen d'une commande payée en plusieurs fois n'entre dans aucun calcul. |
| FIN-16.02 | Retirer | Ne sert qu'au montant moyen d'une facture (FIN-16.06), qu'aucun croisement ni phrase ne lit ; les factures oubliées ont leur propre montant (FIN-16.04). |
| ACQ-11.05 | Fusionner | Doublon partiel de ACQ-09.05 (rendez-vous nécessaires pour signer), plus difficile à compter (appels, e-mails et rendez-vous mêlés). |
| RH-16.03 | Retirer | Lue par l'IA seulement. La gravité des reprises est déjà mesurée par leur durée (RH-16.01, temps moyen d'une reprise ; FIN-10.03, heures par reprise). |
| ACQ-11.36 | Retirer | Aucun usage écrit ; aucun des calculs Location à écrire ne la nomme. |
| RH-06.06 | Retirer | Lue par l'IA, sans lecture écrite. La réponse « Ni l'un ni l'autre » porte sur le respect du droit du travail (paiement ou récupération des heures supplémentaires) : l'agent RH ne peut rien en dire sans sortir de son périmètre. |
| RH-47.02 | Fusionner | Aucun usage écrit. Le délai de prévenance du planning est encadré par le droit du travail pour certains contrats : l'IA ne peut pas en juger. |
| RH-48.02 | Retirer | Aucun usage écrit. Une rémunération liée aux objectifs relève de la politique de rémunération et du droit du travail : l'agent ne peut pas en faire un conseil. |
| RH-25.02 | Retirer | Aucun usage écrit. Les financements de la formation (opérateurs de compétences) relèvent de la réglementation de la formation professionnelle, proche du droit du travail ; la réponse « Je ne connais pas ce financement » pousse l'IA à expliquer un dispositif réglementé. |
| RH-45.03 | Fusionner | Aucun usage écrit. Le relais par un confrère, un sous-traitant ou un freelance est déjà une réponse de RH-45.01. |
<!-- fin:classement -->

## 8. Arbitrages

**Arbitrages d'ensemble.**

1. **FIN-48.01** : remplacer et rendre conditionnelle (recommandé), retirer, ou garder (section 4).
2. **Règle commune des pratiques** : une pratique absente n'est un défaut que si le problème qu'elle traite est constaté. Elle
   concerne les 36 questions « notées directement » et les règles Pratique à écrire.
3. **Grilles appliquées par l'IA en Comm** : qui applique la grille de 6 critères, et ce que l'IA peut produire (section 6).
4. **Liste des retraits et des fusions** (24) et **des conditions** (20) : à valider question par question (section 9).
5. **Les 13 liens manquants** à écrire dans le classeur (section 6). C'est un travail sur le classeur, qui ne change pas ce que
   voit le dirigeant.
6. **Questions hors périmètre** (RH-06.06, RH-25.02, RH-46.02, RH-47.02, RH-48.02) : retrait ou fusion, ou avis de l'avocat sur ce
   que le rapport peut en dire.
7. **COM-24.01** : donner une finalité à chaque objectif Comm et retirer la question.
8. **Mécanismes nouveaux** pour trois conditions : comparaison de deux réponses, somme d'un tableau, choix tirés d'une réponse.

**Arbitrages question par question** (repris des évaluations) :

<!-- debut:arbitrages -->
- **ACQ-01.04** : Garder seulement si le propriétaire veut afficher le panier moyen par catégorie ; il faudrait alors écrire ce que le rapport en tire.
- **ACQ-01.07** : Mettre ACQ-01.07 et ACQ-01.08 au même niveau (les deux en essentiel, ou les deux en approfondi).
- **ACQ-06.13** : Retirer, ou la déplacer en contexte du thème COM-62 si le propriétaire veut un conseil de mots-clés.
- **ACQ-09.05** : Garder celle-ci et retirer ACQ-11.05 ; écrire qu'elle est lue par l'IA, pas notée.
- **ACQ-11.36** : Écrire le calcul qui la lit, ou la retirer.
- **FIN-09.10** : Choisir cette solution parmi les trois de la section 15 (point 13).
- **FIN-11.03** : Ou la garder pour tous et l'ajouter au calcul de la résilience (imprévu absorbable, FIN-15.02, XF19), où elle dirait ce que le découvert autorisé permet d'absorber.
- **FIN-16.02** : La garder seulement si elle sert à juger la charge de facturation à la main (FIN-16.03), avec une règle écrite.
- **FIN-22.02** : Retirer, ou ajouter un repère de taux sourcé (indicateur comparable) et le calcul du coût des intérêts.
- **FIN-48.01** : Choisir entre : remplacer et rendre conditionnelle (recommandé), retirer (le besoin se déduit déjà des réponses existantes et suffit à un conseil précis), ou garder telle quelle (déconseillé). Le thème FIN-48 n'aurait plus de question en cas de retrait.
- **RH-46.02** : La garder seulement si un usage hors droit du travail est écrit (par exemple : part de l'équipe en contrat court comme facteur d'instabilité, lu avec les départs RH-32).
- **RH-01.01** : Passer RH-01.02 au niveau essentiel, pour que la condition soit décidable à ce niveau.
- **RH-06.06** : Retirer ; ou la garder avec l'avis de l'avocat sur ce que le rapport peut dire de « Ni l'un ni l'autre ».
- **RH-25.02** : Retirer, ou faire valider par l'avocat ce que le rapport peut dire de ces financements.
- **COM-39.01** : Réduire les colonnes, ou passer le tableau complet en approfondi.
- **COM-13.11** : La garder seulement si une analyse du site est prévue (outil à construire).
<!-- fin:arbitrages -->

## 9. Liste complète des questions à revoir

Chaque fiche donne :

- le texte exact, les réponses, quand et à qui la question est posée ;
- l'usage prévu et exécuté ;
- la recommandation, le problème et la justification ;
- le conseil générique à risque ;
- les propositions (texte, réponses, condition) et ce qui manque.

Les questions justifiées telles quelles ne sont pas reprises ici. Leur justification est dans le tableau complet
(`docs/audit-utilite/questions.csv`, une ligne par question, avec les mêmes colonnes).

<!-- debut:liste -->
### Questions à modifier (recommandation autre que « conserver ») (55)

<details><summary><strong>Acquisition</strong> : 18 questions</summary>

#### ACQ-01.07 · Acquisition · ACQ-01 Cible

- **Texte** : « Dans quelle zone faites-vous le plus de chiffre d'affaires ? »
- **Réponses** : texte
- **Posée** : essentiel ; profils rdv, commerce, restaurant, chantier, b2b, abonnement, location
- **Usage** : prévu croisements XA31 (Zone la plus rentable) ; exécuté aucun.
- **Recommandation** : Préciser (Mal formulée)
- **Problème** : Texte libre posé au niveau essentiel, alors que le chiffre qui lui donne un sens (ACQ-01.08, part du CA dans cette zone) n'est posé qu'en approfondi : au niveau essentiel, XA31 reçoit un nom de zone sans chiffre. Une réponse libre n'entre jamais dans un calcul (règle des deux couches) : elle ne fait que nommer la zone.
- **Justification** : Nomme la zone où se fait le plus de chiffre d'affaires ; utile seulement accompagnée de sa part (ACQ-01.08).
- **Arbitrage** : Mettre ACQ-01.07 et ACQ-01.08 au même niveau (les deux en essentiel, ou les deux en approfondi).

#### ACQ-13.12 · Acquisition · ACQ-13 Prix et honoraires

- **Texte** : « Pour chaque catégorie de clients, laquelle de vos offres principales choisit-elle le plus ? »
- **Réponses** : tableau · Offre choisie le plus [Offre 1 / Offre 2 / Offre 3 / Une autre offre] · lignes : (donnee ACQ-01.01)
- **Posée** : approfondi ; tous les profils
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Préciser (Mal formulée)
- **Problème** : Les choix sont « Offre 1 / Offre 2 / Offre 3 / Une autre offre », alors que les offres d'ACQ-13.01 portent un nom et peuvent aller jusqu'à dix lignes : le dirigeant ne voit pas le nom de ses offres et ne peut pas choisir la quatrième.
- **Justification** : Offre préférée de chaque catégorie de clients, lue par l'IA : relie la cible (XA32) à l'offre à mettre en avant.
- **Texte proposé (proposition, à valider)** : Pour chaque catégorie de clients, quelle offre choisit-elle le plus ?
- **Réponses proposées (proposition, à valider)** : Les noms des offres données en ACQ-13.01, plus « Une autre offre ».
- **Donnée ou règle manquante** : Choix tirés d'une autre réponse : mécanisme existant pour les lignes d'un tableau, à étendre aux options d'une colonne.

#### ACQ-02.05 · Acquisition · ACQ-02 Volume de contacts

- **Texte** : « Quand une demande ne correspond pas à ce que vous faites, quelle en est la raison la plus fréquente ? »
- **Réponses** : choix · Hors de votre zone / Budget trop faible / Hors de votre offre / Simple curiosité / Délai impossible à tenir
- **Posée** : approfondi ; profils rdv, chantier, b2b, abonnement
- **Usage** : prévu diagnostic Comm DC04 (Mauvais ciblage) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée même quand toutes les demandes correspondent à l'offre (ACQ-02.04 égale ACQ-02.01) ; la question n'a alors pas d'objet.
- **Justification** : Raison principale des demandes hors cible (diagnostic DC04 « mauvais ciblage ») : hors zone, budget, offre ou curiosité appellent des actions différentes (zone de diffusion, affichage des prix, description de l'offre).
- **Condition proposée** : Posée si ACQ-02.04 est inférieure à ACQ-02.01.
- **Donnée ou règle manquante** : Les règles d'affichage ne comparent une réponse qu'à une valeur fixe ; comparer deux réponses demande un opérateur nouveau.

#### ACQ-09.06 · Acquisition · ACQ-09 Rendez-vous

- **Texte** : « Envoyez-vous un rappel à vos clients la veille de leur rendez-vous ? »
- **Réponses** : choix · Toujours / Parfois / Jamais
- **Posée** : approfondi ; profils rdv, chantier, b2b ; si D05 · si activité sur rendez-vous
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée même à qui n'a aucune absence sans prévenir. « Jamais » ne doit pas devenir un défaut quand il n'y a pas d'absences : la pratique n'a d'intérêt qu'en présence du problème.
- **Justification** : Rappel la veille (toujours, parfois, jamais) : quand les absences existent, désigne une action précise et mesurable (rappel systématique), suivie par le taux d'absence (ACQ-09.10).
- **Condition proposée** : Posée si ACQ-09.02, champ « Absents sans prévenir », est supérieur à 0.

#### ACQ-11.16 · Acquisition · ACQ-11 Transformation

- **Texte** : « Relancez-vous automatiquement les clients qui abandonnent leur panier ? »
- **Réponses** : oui_non
- **Posée** : essentiel ; profils ecommerce
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée même quand aucun panier n'est abandonné ; « Non » ne doit pas devenir un défaut dans ce cas.
- **Justification** : Relance automatique des paniers abandonnés : action précise et chiffrable (XA35, EFF-ACQ-04) quand des paniers sont abandonnés.
- **Condition proposée** : Posée si ACQ-11.15 n'est pas égale à 0 (posée aussi si le dirigeant ne connaît pas ce nombre).

#### ACQ-11.39 · Acquisition · ACQ-11 Transformation

- **Texte** : « Combien paient vos clients pour la livraison, et à partir de quel montant est-elle offerte ? »
- **Réponses** : composite · Prix de la livraison standard / Offerte à partir de
- **Posée** : essentiel ; profils ecommerce, restaurant
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions + Utile, exploitation à développer)
- **Problème** : Posée à tous les restaurants, y compris à ceux qui ne livrent pas ; lue par l'IA sans lecture écrite.
- **Justification** : Prix de la livraison et seuil de gratuité : comparé au panier moyen (ACQ-15.06), dit si le seuil pousse les clients à commander plus.
- **Condition proposée** : E-commerce : toujours. Restaurant : posée si « Plateformes » est coché dans ACQ-03.01 ou si ACQ-11.13 (vente à emporter et livraison) est supérieure à 0.
- **Donnée ou règle manquante** : Croisement seuil de livraison et panier moyen à écrire.

#### ACQ-13.05 · Acquisition · ACQ-13 Prix et honoraires

- **Texte** : « Avez-vous une grille de prix écrite, que vous appliquez à chaque client ? »
- **Réponses** : choix · Oui, pour toutes mes offres / Pour une partie / Non, je fixe le prix au cas par cas
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée à tous les profils, alors que le commerce, la restauration et l'e-commerce affichent des prix fixes par nature : la réponse y est presque toujours « Oui » et n'apprend rien. Marquée « notée directement » dans un thème Marché, sans règle de notation.
- **Justification** : Grille de prix écrite : pour qui fait des devis, un prix fixé au cas par cas explique des écarts de marge et des remises ; l'action (écrire une grille) est précise.
- **Condition proposée** : Posée si D06 = oui (devis ou propositions commerciales).
- **Donnée ou règle manquante** : Règle de notation Pratique à écrire.

#### ACQ-13.13 · Acquisition · ACQ-13 Prix et honoraires

- **Texte** : « Après votre dernière hausse de prix, quelle part de vos clients est partie à cause du prix ? »
- **Réponses** : choix · Aucun, à ma connaissance / Moins de 5 % / 5 à 15 % / Plus de 15 %
- **Posée** : approfondi ; tous les profils
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée même à qui n'a jamais augmenté ses prix ; la question n'a alors pas d'objet.
- **Justification** : Clients perdus après la dernière hausse, lue par l'IA : mesure la sensibilité au prix, ce qui rend la hausse de prix (XA21) prudente ou au contraire possible ; évite un conseil général « augmentez vos prix ».
- **Condition proposée** : Posée si la date de ACQ-13.04 est renseignée.
- **Donnée ou règle manquante** : Écrire sa lecture par XA21.

#### ACQ-17.15 · Acquisition · ACQ-17 Clients récurrents

- **Texte** : « En moyenne sur les 3 derniers mois, combien de clients passent chaque mois à une formule plus complète ? »
- **Réponses** : nombre · nombre
- **Posée** : approfondi ; profils abonnement
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée à tout abonnement, y compris à qui n'a qu'une formule : la réponse « 0 » ressemble alors à un défaut alors que la montée de formule est impossible.
- **Justification** : Passages à une formule plus complète, lue par l'IA : mesure la montée en gamme quand plusieurs formules existent.
- **Condition proposée** : Posée si l'entreprise propose plusieurs formules.
- **Donnée ou règle manquante** : Aucune réponse actuelle ne dit si l'abonnement a plusieurs formules (ACQ-13.01 liste les offres, pas les formules) : une question de cadrage ou une option serait à ajouter.

#### ACQ-11.05 · Acquisition · ACQ-11 Transformation

- **Texte** : « En moyenne, combien d'échanges faut-il avant qu'un client signe : appels, emails et rendez-vous compris ? »
- **Réponses** : nombre · nombre
- **Posée** : approfondi ; profils chantier, b2b
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Fusionner (Peu utile)
- **Problème** : Doublon partiel de ACQ-09.05 (rendez-vous nécessaires pour signer), plus difficile à compter (appels, e-mails et rendez-vous mêlés). Lue par l'IA seulement.
- **Justification** : À situation identique, elle n'apporte que ce que ACQ-09.05 dit déjà : une vente qui demande beaucoup d'échanges.
- **Doublon ou fusion** : ACQ-09.05.

#### ACQ-01.04 · Acquisition · ACQ-01 Cible

- **Texte** : « Dans chaque catégorie, combien de fois par an un même client fait-il appel à vous, en moyenne ? »
- **Réponses** : tableau · Fois par an · lignes : (donnee ACQ-01.01)
- **Posée** : approfondi ; tous les profils
- **Usage** : prévu calculs ACQ-01.13 ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Ne sert qu'au panier moyen par catégorie (ACQ-01.13), qu'aucun croisement, scénario ni phrase de rapport ne lit. La valeur d'un client par catégorie (ACQ-01.12, XA32) se calcule déjà sans elle, et la fréquence d'achat globale est demandée en ACQ-17.
- **Justification** : À situation identique, une autre fréquence ne change ni le type de client prioritaire (XA32) ni aucun levier chiffré : seul un calcul affiché, sans lecteur, varie. Quatre cases à remplir (approfondi).
- **Arbitrage** : Garder seulement si le propriétaire veut afficher le panier moyen par catégorie ; il faudrait alors écrire ce que le rapport en tire.

#### ACQ-06.13 · Acquisition · ACQ-06 Présence en ligne

- **Texte** : « Sur les 3 derniers mois, quels mots les gens ont-ils tapés sur Google pour trouver votre fiche ? »
- **Réponses** : tableau · Nombre de recherches · lignes : (libre)
- **Posée** : approfondi ; profils rdv, commerce, restaurant, chantier, b2b, abonnement, location ; si D03 · si « fiche Google » est cochée
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Aucun usage écrit ; tableau libre de cinq lignes, à relever dans les statistiques de la fiche Google, au niveau approfondi. Les mots tapés relèvent du référencement, traité par la Comm (COM-62, référencement), et l'IA ne peut rien en conclure sans repère.
- **Justification** : À situation identique, une autre liste de mots ne change aucun calcul ni aucune priorité ; au mieux un exemple dans le texte du rapport.
- **Arbitrage** : Retirer, ou la déplacer en contexte du thème COM-62 si le propriétaire veut un conseil de mots-clés.

#### ACQ-11.36 · Acquisition · ACQ-11 Transformation

- **Texte** : « En moyenne, combien de {jours_ouverture} dure une réservation ? »
- **Réponses** : nombre · nombre
- **Posée** : approfondi ; profils location
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Utilité à justifier)
- **Problème** : Aucun usage écrit ; aucun des calculs Location à écrire ne la nomme.
- **Justification** : Durée moyenne d'une réservation : permettrait de passer des unités vendues au nombre de réservations, et donc au montant moyen d'une réservation ; utile seulement si ce calcul est écrit.
- **Arbitrage** : Écrire le calcul qui la lit, ou la retirer.

#### ACQ-15.11 · Acquisition · ACQ-15 Panier moyen

- **Texte** : « À partir de quel montant le proposez-vous ? »
- **Réponses** : nombre · euros
- **Posée** : approfondi ; profils commerce, ecommerce, chantier, b2b ; si D33 · si paiement en plusieurs fois proposé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Aucun usage écrit ; aucun calcul ni seuil ne peut lire le montant à partir duquel le paiement est proposé.
- **Justification** : À situation identique, un autre seuil ne change ni le diagnostic ni la recommandation.

#### ACQ-15.13 · Acquisition · ACQ-15 Panier moyen

- **Texte** : « Sur les 3 derniers mois, quel a été en moyenne le montant d'une commande ou d'une facture payée en plusieurs fois ? »
- **Réponses** : nombre · euros
- **Posée** : approfondi ; profils commerce, ecommerce, chantier, b2b ; si D33 · si paiement en plusieurs fois proposé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Aucun usage écrit ; le montant moyen d'une commande payée en plusieurs fois n'entre dans aucun calcul.
- **Justification** : À situation identique, une autre valeur ne change aucune priorité.

#### ACQ-15.14 · Acquisition · ACQ-15 Panier moyen

- **Texte** : « Sur les 3 derniers mois, quelle part de votre chiffre d'affaires vient de cette offre haut de gamme ? »
- **Réponses** : nombre · pourcent
- **Posée** : approfondi ; tous les profils ; si D34 · si offre haut de gamme
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Aucun usage écrit. La part du chiffre d'affaires de chaque offre est déjà demandée en ACQ-13.02, dont les lignes sont réglables jusqu'à dix : l'offre haut de gamme peut y figurer.
- **Justification** : À situation identique, elle ne fait que répéter ACQ-13.02 pour une offre.
- **Doublon ou fusion** : ACQ-13.02 (part du chiffre d'affaires par offre).

#### ACQ-18.06 · Acquisition · ACQ-18 Recommandation

- **Texte** : « Mesurez-vous la satisfaction de vos clients ? »
- **Réponses** : choix · À chaque client / De temps en temps / Jamais
- **Posée** : approfondi ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Aucun usage écrit. Les avis (ACQ-06.01, thèmes COM-44 à COM-46) et les résiliations (ACQ-17.13) mesurent déjà la satisfaction de façon chiffrée.
- **Justification** : À situation identique, « jamais » ne change ni un calcul ni une priorité ; la réponse ne dit pas quel problème la mesure résoudrait.
- **Conseil générique à risque** : « Mesurez la satisfaction de vos clients » : conseil général, sans problème identifié ; « jamais » deviendrait un défaut sans raison.

#### ACQ-20.05 · Acquisition · ACQ-20 Suivi commercial

- **Texte** : « Vous fixez-vous chaque mois un objectif chiffré : nombre de clients ou chiffre d'affaires ? »
- **Réponses** : choix · Oui, et je le suis chaque semaine / Oui, mais je le suis peu / Non
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Aucun usage écrit. CAXE fait déjà fixer un objectif chiffré au début de chaque agent et en suit l'avancement ; la fréquence de lecture des chiffres est demandée en ACQ-20.02.
- **Justification** : À situation identique, « non » ne change ni un calcul ni la priorité : l'objectif existe déjà dans CAXE.
- **Conseil générique à risque** : « Fixez-vous des objectifs mensuels » : conseil général, que le parcours CAXE remplace.

</details>

<details><summary><strong>Finance</strong> : 8 questions</summary>

#### FIN-46.02 · Finance · FIN-46 Rémunération du dirigeant

- **Texte** : « Combien l'entreprise paie-t-elle chaque mois pour vos cotisations sociales personnelles ? »
- **Réponses** : nombre · euros
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Préciser (Mal formulée + Utile, exploitation à développer)
- **Problème** : Aucun usage écrit. Selon la forme de l'entreprise, les cotisations du dirigeant sont déjà comptées dans les salaires (FIN-07.01) ou payées à part : la question peut faire compter deux fois la même somme.
- **Justification** : Cotisations personnelles du dirigeant : avec FIN-46.01, coût réel de sa rémunération pour l'entreprise (XF03, XF38).
- **Texte proposé (proposition, à valider)** : En plus des salaires déjà indiqués, combien l'entreprise paie-t-elle chaque mois pour vos cotisations sociales personnelles ?
- **Donnée ou règle manquante** : Ajouter aux entrées de XF03 et XF38 ; lecture selon la forme (FIN-47.01) à valider, sans conseil fiscal ni social.

#### FIN-11.03 · Finance · FIN-11 Trésorerie disponible

- **Texte** : « Quel est le montant de votre découvert autorisé et de vos autres crédits disponibles ? »
- **Réponses** : nombre · euros
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu calculs FIN-24.08 ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée à tous au niveau essentiel, mais lue seulement par la marge restante sous le découvert autorisé (FIN-24.08), calculée pour qui a été à découvert (D11). Pour les autres, la réponse ne change rien.
- **Justification** : Découvert autorisé et crédits disponibles : avec un découvert réel, dit la marge qui reste avant le refus de paiement.
- **Condition proposée** : Posée si D11 = oui.
- **Arbitrage** : Ou la garder pour tous et l'ajouter au calcul de la résilience (imprévu absorbable, FIN-15.02, XF19), où elle dirait ce que le découvert autorisé permet d'absorber.

#### FIN-18.04 · Finance · FIN-18 Impayés

- **Texte** : « Comment relancez-vous un client qui paie en retard ? »
- **Réponses** : composite · Jours avant la première relance / Méthode [Toujours, par écrit / Au cas par cas / Aucune relance]
- **Posée** : essentiel ; profils rdv, chantier, b2b, abonnement ; si D09 · si paiement après facture
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée même à qui n'a aucune facture en retard ; « Aucune relance » ne doit pas devenir un défaut dans ce cas.
- **Justification** : Délai et méthode de relance : quand des factures sont en retard, désigne une action précise (relance écrite systématique, à J+N).
- **Condition proposée** : Posée si FIN-18.01 contient au moins un montant supérieur à 0.
- **Donnée ou règle manquante** : Les règles d'affichage ne lisent pas encore la somme d'un tableau ; opérateur à ajouter. Règle de notation Pratique à écrire.

#### FIN-09.03 · Finance · FIN-09 Dépenses récurrentes

- **Texte** : « Sur les 12 derniers mois, combien de contrats avez-vous renégociés ou remis en concurrence ? »
- **Réponses** : nombre · nombre
- **Posée** : approfondi ; tous les profils
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Marquée « notée directement », sans règle. Le tableau FIN-09.01 (utilisation, renouvellement) et FIN-09.02 désignent déjà les contrats à renégocier.
- **Justification** : À situation identique, le nombre de renégociations passées ne change ni les contrats désignés ni la priorité ; « 0 » deviendrait un défaut même quand les contrats sont justes.

#### FIN-16.02 · Finance · FIN-16 Délai de facturation

- **Texte** : « En moyenne sur les 3 derniers mois, combien de factures émettez-vous par mois ? »
- **Réponses** : nombre · nombre
- **Posée** : approfondi ; profils chantier, b2b, abonnement ; si D09 · si paiement après facture
- **Usage** : prévu calculs FIN-16.06 ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Ne sert qu'au montant moyen d'une facture (FIN-16.06), qu'aucun croisement ni phrase ne lit ; les factures oubliées ont leur propre montant (FIN-16.04).
- **Justification** : À situation identique, un autre nombre de factures ne change aucune priorité.
- **Arbitrage** : La garder seulement si elle sert à juger la charge de facturation à la main (FIN-16.03), avec une règle écrite.

#### FIN-22.02 · Finance · FIN-22 Poids des remboursements

- **Texte** : « Quel est le taux d'intérêt de chacun de ces crédits ? »
- **Réponses** : tableau · Taux d'intérêt · lignes : Crédit 1 / Crédit 2 / Crédit 3 / Crédit 4 / Crédit 5 / Crédit 6
- **Posée** : approfondi ; tous les profils ; si D10 · si crédit ou leasing en cours
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté lignes de tableaux liés.
- **Recommandation** : Retirer (Utilité à justifier)
- **Problème** : Lue par l'IA seulement. Pour en tirer quelque chose, l'IA devrait juger qu'un taux est élevé : aucun repère de taux n'est parmi les 36 indicateurs comparables, et l'IA ne juge rien sans repère sourcé (réflexe 1).
- **Justification** : À situation identique, un autre taux ne change aucun calcul : seul un jugement de l'IA, interdit, pourrait en sortir.
- **Conseil générique à risque** : « Renégociez vos crédits », sans repère pour dire qu'un taux est trop haut.
- **Arbitrage** : Retirer, ou ajouter un repère de taux sourcé (indicateur comparable) et le calcul du coût des intérêts.

#### FIN-37.03 · Finance · FIN-37 Valeur du stock

- **Texte** : « Comment se répartit votre stock entre vos grandes catégories de produits ? »
- **Réponses** : tableau · Part du stock · lignes : (libre)
- **Posée** : approfondi ; tous les profils ; si D07 · si stock
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Lue par l'IA seulement. Sans les ventes par catégorie, la répartition du stock ne donne ni rotation ni stock dormant par catégorie ; tableau libre de cinq lignes.
- **Justification** : À situation identique, une autre répartition ne change aucun calcul ; l'IA ne pourrait que la répéter.

#### FIN-48.01 · Finance · FIN-48 Relation avec la banque

- **Texte** : « Quand avez-vous fait le point sur votre activité avec votre banquier pour la dernière fois ? »
- **Réponses** : choix · Dans les 6 derniers mois / Il y a 7 à 12 mois / Il y a plus d'un an / Jamais
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Remplacer (Utilité à justifier + Utile sous conditions)
- **Problème** : Posée à tous, au niveau essentiel, sans aucun usage : ni calcul, ni croisement, ni règle de notation écrite. Elle mesure une habitude (la date du dernier rendez-vous), pas un besoin. « Jamais » deviendrait un défaut pour une entreprise qui n'a besoin d'aucun financement.
- **Justification** : À situation identique, si la réponse passe de « Dans les 6 derniers mois » à « Jamais », rien ne change légitimement tant qu'aucun besoin de financement n'existe. Quand un besoin existe (découvert, investissement financé par prêt ou leasing), ce qui compte est que la banque en soit informée, pas la date du dernier rendez-vous.
- **Conseil générique à risque** : « Allez voir votre banquier » : sans besoin, sans montant, sans motif ni échéance. Les réponses existantes permettent d'éviter ce conseil (découvert : FIN-24.01 à 24.05, D11 ; investissement : D12, FIN-23.01, FIN-25.01 ; crédits : D10, FIN-22.01 ; trésorerie à venir : FIN-13.03, 13.04 ; trésorerie à avancer pour l'objectif : FIN-32.01, XF32, XF33).
- **Texte proposé (proposition, à valider)** : Votre banque connaît-elle ce besoin de financement ?
- **Réponses proposées (proposition, à valider)** : Oui, la demande est en cours / Oui, elle a été refusée / Non, pas encore / Je ne compte pas passer par une banque
- **Condition proposée** : Posée si D11 = oui (découvert, voir la reformulation de D11), ou si FIN-23.01, financement principal, vaut « Prêt » ou « Leasing ». Plus tard, quand les calculs seront écrits : si la trésorerie à avancer pour l'objectif dépasse la trésorerie disponible au-delà de la sécurité (XF33).
- **Donnée ou règle manquante** : Le texte de la question doit nommer le besoin détecté (découvert ou investissement) : gabarit à écrire. La lecture de chaque réponse (problème, action, raison, échéance, suivi) est à écrire, sans conseil de produit bancaire.
- **Arbitrage** : Choisir entre : remplacer et rendre conditionnelle (recommandé), retirer (le besoin se déduit déjà des réponses existantes et suffit à un conseil précis), ou garder telle quelle (déconseillé). Le thème FIN-48 n'aurait plus de question en cas de retrait.

</details>

<details><summary><strong>RH</strong> : 17 questions</summary>

#### RH-21.01 · RH · RH-21 Disponibilité du responsable

- **Texte** : « Quand votre équipe a besoin de vous, en combien de temps obtient-elle une réponse ? »
- **Réponses** : choix · Dans l'heure / Plus tard dans la journée / Le lendemain ou après
- **Posée** : essentiel ; profils 
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Préciser (Mal formulée + Utile, exploitation à développer)
- **Problème** : « Notée directement », mais le sens de la note n'est pas évident : répondre « dans l'heure » peut signifier des interruptions permanentes (RH-10) et des sollicitations évitables (RH-03), répondre « le lendemain » peut bloquer l'équipe. Indicateur à deux sens, sans règle.
- **Justification** : Délai de réponse du responsable : lu avec les sollicitations et les interruptions, il dit si le dirigeant est un goulot ou au contraire trop interrompu.
- **Donnée ou règle manquante** : Ne pas la noter seule ; écrire sa lecture avec RH-03.01, RH-10.01 et RH-08 (goulot).

#### RH-38.01 · RH · RH-38 Absence du dirigeant

- **Texte** : « Combien de temps chacune de ces personnes pourrait-elle s'absenter sans que vos clients subissent de retard ? »
- **Réponses** : tableau · Absence possible [Moins d'1 jour / 1 à 2 jours / 3 à 6 jours / 1 à 2 semaines / Plus de 2 semaines] · lignes : Personne 1 / Personne 2 / Personne 3
- **Posée** : essentiel ; profils  ; si D57 · s'il y a une personne clé
- **Usage** : prévu calculs RH-38.03, RH-38.04 ; croisements XR23 (Dépendance totale au dirigeant), XR22 (Résilience opérationnelle) ; exécuté lignes de tableaux liés.
- **Recommandation** : Préciser (Mal formulée)
- **Problème** : Le thème s'appelle « Absence du dirigeant » et la dépendance totale au dirigeant (XR23) lit cette question comme « absence possible du dirigeant », mais elle porte sur les personnes clés désignées en RH-37.01, hors dirigeant. L'absence possible du dirigeant est demandée ailleurs (RH-05.10), sans usage.
- **Justification** : Absence possible de chaque personne clé : fonction la plus fragile (RH-38.03), CA exposé (RH-38.04), résilience (XR22).
- **Donnée ou règle manquante** : Dans le classeur, renommer le thème (« Absence des personnes clés ») et remplacer RH-38.01 par RH-05.10 dans les entrées de XR23.

#### RH-01.01 · RH · RH-01 Clarté des missions

- **Texte** : « Les missions de chaque personne sont-elles écrites, dans une fiche de poste ou une simple liste ? »
- **Réponses** : choix · Pour tous / Pour une partie / Pour personne
- **Posée** : essentiel ; profils 
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : « Notée directement » : des missions non écrites deviennent un défaut même dans une équipe de trois personnes où chacun sait quoi faire. Le problème que la pratique doit résoudre est mesuré par RH-01.02 (tâches sans responsable), posée seulement en approfondi.
- **Justification** : Missions écrites : utile quand des tâches n'ont pas de responsable ; désigne alors une action précise (écrire qui fait quoi pour ces tâches).
- **Conseil générique à risque** : « Écrivez des fiches de poste » ou « Organisez-vous mieux », sans problème constaté.
- **Condition proposée** : Posée si RH-01.02 n'est pas « Aucune ».
- **Arbitrage** : Passer RH-01.02 au niveau essentiel, pour que la condition soit décidable à ce niveau.

#### RH-02.01 · RH · RH-02 Répartition des responsabilités

- **Texte** : « Quelles décisions courantes confiez-vous à quelqu'un d'autre que vous ? »
- **Réponses** : cases · Devis et prix / Achats / Planning / Réclamations des clients / Recrutement / Aucune
- **Posée** : essentiel ; profils 
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Le thème n'est pas masqué pour un dirigeant seul : « Aucune » y devient un défaut alors qu'il n'a personne à qui confier une décision.
- **Justification** : Décisions confiées : pour une équipe, montre quelles décisions remontent toutes au dirigeant ; lue avec les sollicitations (RH-03), elle désigne la décision à confier en premier.
- **Condition proposée** : Posée si D02 n'est pas « Seul » (condition « D02 · si au moins un salarié », existante).
- **Donnée ou règle manquante** : Règle de notation Pratique à écrire.

#### RH-10.04 · RH · RH-10 Interruptions

- **Texte** : « Sur une journée habituelle, combien de fois un membre de votre équipe est-il interrompu, en moyenne ? »
- **Réponses** : choix · 0 à 2 / 3 à 5 / 6 à 10 / 11 à 20 / Plus de 20
- **Posée** : approfondi ; profils 
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Le thème n'est pas masqué pour un dirigeant seul, mais la question porte sur « un membre de votre équipe ».
- **Justification** : Interruptions d'un membre de l'équipe, lue par l'IA : montre si le problème touche toute l'équipe ou le seul dirigeant.
- **Condition proposée** : Posée si D02 n'est pas « Seul » (condition existante « D02 · si au moins un salarié »).

#### RH-14.01 · RH · RH-14 Accès à l'information

- **Texte** : « Les informations utiles, comme les dossiers clients, les accès et les tarifs, sont-elles rangées dans un espace que tout le monde peut consulter ? »
- **Réponses** : choix · Oui, tout y est / En partie / Non, chacun garde les siennes
- **Posée** : essentiel ; profils 
- **Usage** : prévu croisements XR25 (Temps perdu à chercher l'information) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée au dirigeant seul (« un espace que tout le monde peut consulter »), alors que sa situation est couverte par RH-45.02 (informations notées pour qu'une autre personne puisse s'en servir).
- **Justification** : Informations rangées dans un espace commun : temps perdu à chercher (XR25).
- **Condition proposée** : Posée si D02 n'est pas « Seul ».

#### RH-15.01 · RH · RH-15 Outils

- **Texte** : « Quels outils servent à organiser le travail, et qui s'en sert ? »
- **Réponses** : tableau · Utilisation [Toute l'équipe / Une partie de l'équipe / Seulement vous / Personne] · lignes : Planning partagé / Gestion des tâches / Logiciel métier / Messagerie d'équipe
- **Posée** : essentiel ; profils 
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions + Utile, exploitation à développer)
- **Problème** : « Notée directement », posée aussi au dirigeant seul (planning partagé, messagerie d'équipe). Un outil absent n'est pas un défaut en soi dans une petite équipe.
- **Justification** : Outils d'organisation et qui s'en sert : explique des urgences, des recherches d'information ou des changements de planning quand ils existent.
- **Conseil générique à risque** : « Équipez-vous d'un outil de gestion des tâches », sans problème constaté.
- **Condition proposée** : Posée si D02 n'est pas « Seul ».
- **Donnée ou règle manquante** : Lecture avec RH-09.02, RH-14.02 et RH-47.03 à écrire.

#### RH-32.06 · RH · RH-32 Mouvements d'équipe

- **Texte** : « Quand quelqu'un quitte l'entreprise, ce qu'il sait faire est-il transmis avant son départ ? »
- **Réponses** : choix · Toujours / Parfois / Jamais
- **Posée** : approfondi ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions + Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; posée même quand personne n'est parti (aucune condition), alors que RH-32.03 et 32.04 attendent un départ.
- **Justification** : Transmission avant un départ : un savoir-faire perdu au départ est un risque concret, proche du savoir-faire non écrit (XR24).
- **Condition proposée** : Posée s'il y a eu des départs (condition existante « D54 · s'il y a eu des départs »).
- **Donnée ou règle manquante** : Ajouter à la lecture de XR24.

#### RH-36.01 · RH · RH-36 Reconnaissance

- **Texte** : « Comment reconnaissez-vous le travail bien fait ? »
- **Réponses** : cases · Remerciement / Prime / Évolution / Nouvelles responsabilités / Rien de particulier
- **Posée** : approfondi ; profils 
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Contexte lu par l'IA, posé à toute équipe de 6 personnes ou plus. « Rien de particulier » pousse un conseil général de reconnaissance, sans lien avec un problème.
- **Justification** : Formes de reconnaissance : utile pour expliquer des départs dont la cause est le management ou le manque d'évolution.
- **Conseil générique à risque** : « Reconnaissez le travail bien fait ».
- **Condition proposée** : Posée s'il y a eu des départs (D54).

#### RH-37.01 · RH · RH-37 Dépendance aux personnes clés

- **Texte** : « En dehors de vous, quelles personnes bloquent l'activité quand elles sont absentes ? »
- **Réponses** : tableau · Poste / Ce qu'elle seule sait faire / Seule à détenir des accès ou des informations / Des clients ne passent que par elle / Remplaçant possible / Procédure écrite · lignes : Personne 1 / Personne 2 / Personne 3
- **Posée** : essentiel ; profils 
- **Usage** : prévu calculs RH-37.03, RH-37.04, RH-38.03 ; croisements XR24 (Savoir-faire non écrit), XR21 (Dépendance à une personne clé), XR22 (Résilience opérationnelle) ; exécuté ouvre ou ferme 3 questions ; lignes de tableaux liés.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Le thème n'est pas masqué pour un dirigeant seul, alors que la question exclut le dirigeant (« En dehors de vous ») : pour lui, le tableau reste vide.
- **Justification** : Personnes clés, ce qu'elles seules savent faire, remplaçant, procédure : personnes critiques sans remplaçant (RH-37.03), savoir-faire non écrit (XR24), résilience (XR22) ; ouvre RH-37.02 et RH-38.
- **Condition proposée** : Posée si D02 n'est pas « Seul ».

#### RH-45.03 · RH · RH-45 Relais quand on est seul

- **Texte** : « Faites-vous partie d'un réseau de professionnels avec qui vous échangez du travail ou des conseils ? »
- **Réponses** : choix · Oui, régulièrement / Parfois / Non
- **Posée** : approfondi ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Fusionner (Peu utile)
- **Problème** : Aucun usage écrit. Le relais par un confrère, un sous-traitant ou un freelance est déjà une réponse de RH-45.01.
- **Justification** : À situation identique, elle n'ajoute que l'appartenance à un réseau, sans dire si ce réseau peut reprendre des clients.
- **Conseil générique à risque** : « Rejoignez un réseau de professionnels ».
- **Doublon ou fusion** : RH-45.01.

#### RH-47.02 · RH · RH-47 Planning de l'équipe

- **Texte** : « Combien de temps à l'avance l'équipe connaît-elle son planning ? »
- **Réponses** : choix · Moins de 2 jours / 2 à 6 jours / 1 à 2 semaines / Plus de 2 semaines
- **Posée** : approfondi ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Fusionner (Peu utile)
- **Problème** : Aucun usage écrit. Le délai de prévenance du planning est encadré par le droit du travail pour certains contrats : l'IA ne peut pas en juger. Le problème opérationnel est mesuré par RH-47.03 (changements de dernière minute).
- **Justification** : À situation identique, elle n'ajoute rien à RH-47.03 pour le diagnostic ou le plan.
- **Doublon ou fusion** : RH-47.03.

#### RH-06.06 · RH · RH-06 Volume de travail

- **Texte** : « Les heures supplémentaires sont-elles payées ou récupérées ? »
- **Réponses** : choix · Payées / Récupérées / Ni l'un ni l'autre
- **Posée** : approfondi ; profils  ; si D46 · s'il y a des heures supplémentaires
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Retirer (Utilité à justifier)
- **Problème** : Lue par l'IA, sans lecture écrite. La réponse « Ni l'un ni l'autre » porte sur le respect du droit du travail (paiement ou récupération des heures supplémentaires) : l'agent RH ne peut rien en dire sans sortir de son périmètre.
- **Justification** : À situation identique, « payées » ou « récupérées » ne change ni la surcharge mesurée ni le choix entre heures supplémentaires et recrutement (XR28, qui lit le coût, déjà demandé en RH-06.03).
- **Arbitrage** : Retirer ; ou la garder avec l'avis de l'avocat sur ce que le rapport peut dire de « Ni l'un ni l'autre ».

#### RH-16.03 · RH · RH-16 Erreurs et reprises

- **Texte** : « Parmi ces reprises, combien sont de simples corrections et combien sont à refaire entièrement ? »
- **Réponses** : composite · Corrections mineures / Reprises complètes
- **Posée** : approfondi ; profils  ; si D49 · si vous avez des reprises
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Lue par l'IA seulement. La gravité des reprises est déjà mesurée par leur durée (RH-16.01, temps moyen d'une reprise ; FIN-10.03, heures par reprise).
- **Justification** : À situation identique, la part de reprises complètes ne change ni le temps perdu ni l'action.

#### RH-25.02 · RH · RH-25 Apprentissage

- **Texte** : « Utilisez-vous les financements de formation de votre opérateur de compétences (OPCO) ? »
- **Réponses** : choix · Oui, chaque année / Oui, une fois / Non / Je ne connais pas ce financement
- **Posée** : approfondi ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Utilité à justifier)
- **Problème** : Aucun usage écrit. Les financements de la formation (opérateurs de compétences) relèvent de la réglementation de la formation professionnelle, proche du droit du travail ; la réponse « Je ne connais pas ce financement » pousse l'IA à expliquer un dispositif réglementé.
- **Justification** : À situation identique, la réponse ne change ni le manque de compétence ni sa priorité.
- **Arbitrage** : Retirer, ou faire valider par l'avocat ce que le rapport peut dire de ces financements.

#### RH-46.02 · RH · RH-46 Composition de l'équipe

- **Texte** : « Aujourd'hui, combien de personnes avez-vous par type de contrat ? »
- **Réponses** : tableau · Personnes · lignes : CDI / CDD / Apprentis et alternants / Stagiaires / Intérimaires / Freelances réguliers
- **Posée** : approfondi ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Utilité à justifier)
- **Problème** : Aucun usage écrit ; tableau de six lignes. Les types de contrat (CDD, intérim, apprentis…) touchent au droit du travail, hors du périmètre de l'agent : l'IA ne peut pas en tirer un conseil sans en sortir.
- **Justification** : À situation identique, une autre répartition des contrats ne change aucun calcul ; seul un commentaire sur les contrats, interdit, pourrait en sortir.
- **Arbitrage** : La garder seulement si un usage hors droit du travail est écrit (par exemple : part de l'équipe en contrat court comme facteur d'instabilité, lu avec les départs RH-32).

#### RH-48.02 · RH · RH-48 Objectifs individuels

- **Texte** : « Une partie de la rémunération de l'équipe dépend-elle de ces objectifs ? »
- **Réponses** : choix · Pour tous / Pour certains postes / Non
- **Posée** : approfondi ; profils  ; si D51 · si des objectifs existent
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Retirer (Utilité à justifier)
- **Problème** : Aucun usage écrit. Une rémunération liée aux objectifs relève de la politique de rémunération et du droit du travail : l'agent ne peut pas en faire un conseil.
- **Justification** : À situation identique, la réponse ne change aucun calcul ; seul un conseil sur la rémunération, hors périmètre, pourrait en sortir.

</details>

<details><summary><strong>Comm</strong> : 9 questions</summary>

#### COM-01.01 · Comm · COM-01 Positionnement

- **Texte** : « En une phrase, que faites-vous, pour qui, et qu'est-ce qui vous rend différent ? »
- **Réponses** : texte
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu calculs COM-01.02 ; exécuté aucun.
- **Recommandation** : Préciser (Mal formulée)
- **Problème** : Une seule phrase pour trois questions (quoi, pour qui, différence). Le classeur la fait noter par « une grille fixe de 3 critères appliquée par l'IA » (COM-01.02) : c'est l'IA qui juge et produit une couleur, ce que la règle fondatrice interdit (réflexe 1). La cible est déjà demandée en COM-02.01 et la raison du choix des clients en ACQ-13.14.
- **Justification** : Positionnement dit par le dirigeant : sert de matière à la création de contenu et au conseil de message ; sa présence ou son absence se contrôle sans jugement si les trois parties sont séparées.
- **Texte proposé (proposition, à valider)** : Que faites-vous, pour qui, et qu'est-ce qui vous rend différent ? (trois champs courts : ce que vous faites / pour qui / ce qui vous rend différent)
- **Donnée ou règle manquante** : Notation à remplacer par une règle de code (les trois champs remplis) ou par la nature Contexte ; décision du propriétaire.

#### COM-39.01 · Comm · COM-39 Contenus les plus performants

- **Texte** : « Pour vos 3 meilleures et vos 3 moins bonnes publications des 3 derniers mois, quels ont été les résultats ? »
- **Réponses** : tableau · Réseau / Personnes touchées / Réactions / Visites du profil / Nouveaux abonnés / Clics / Messages ou demandes · lignes : Meilleure 1 / Meilleure 2 / Meilleure 3 / Moins bonne 1 / Moins bonne 2 / Moins bonne 3
- **Posée** : essentiel ; tous les profils ; si D26 · saisie si les statistiques ne sont pas connectées
- **Usage** : prévu calculs COM-34.03, COM-39.04, COM-39.05, COM-39.06, COM-40.01, COM-41.01 ; croisements XC15 (Contenu réutilisable), XC03 (Formats qui prennent du temps sans résultat), XC05 (Performance par format et par sujet), XC04 (Ce qui marche et ce qui est publié) ; diagnostic Comm DC01 (Manque de contenu), DC11 (Temps mal alloué) ; exécuté lignes de tableaux liés.
- **Recommandation** : Préciser (Mal formulée)
- **Problème** : Quarante-deux cases au niveau essentiel (six publications × sept colonnes) : effort disproportionné. Le classement des publications (COM-39.06) lit d'abord les clics et les contacts, puis la portée ; réactions, visites du profil et nouveaux abonnés y sont secondaires.
- **Justification** : Résultats des meilleures et des moins bonnes publications : ce qui marche (COM-39.05, 39.06), contenus réutilisables, diagnostics « manque de contenu » et « temps mal alloué ».
- **Réponses proposées (proposition, à valider)** : Proposition : garder quatre colonnes (Réseau, Personnes touchées, Clics, Messages ou demandes), soit 24 cases ; les trois autres en approfondi.
- **Arbitrage** : Réduire les colonnes, ou passer le tableau complet en approfondi.

#### COM-62.02 · Comm · COM-62 Référencement du site (SEO)

- **Texte** : « Sur les 3 derniers mois, combien de fois votre site est-il apparu dans les résultats de Google, et combien de clics a-t-il reçus ? »
- **Réponses** : composite · Apparitions / Clics / Position moyenne
- **Posée** : essentiel ; tous les profils ; si D23 · si site
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée à tout dirigeant qui a un site, y compris quand COM-62.01 dit qu'il n'a pas l'outil qui donne ces chiffres.
- **Justification** : Apparitions, clics et position moyenne dans Google, lue par l'IA : visibilité réelle du site dans la recherche.
- **Condition proposée** : Posée si COM-62.01 = oui.

#### COM-62.03 · Comm · COM-62 Référencement du site (SEO)

- **Texte** : « Sur les 3 derniers mois, quelles recherches Google vous ont amené le plus de visites sur votre site ? »
- **Réponses** : tableau · Clics / Position moyenne · lignes : (libre)
- **Posée** : approfondi ; tous les profils ; si D23 · si site
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Même problème que COM-62.02 ; tableau libre de cinq lignes.
- **Justification** : Recherches qui amènent le plus de visites, lue par l'IA : mots sur lesquels le site est déjà trouvé.
- **Condition proposée** : Posée si COM-62.01 = oui.

#### COM-63.01 · Comm · COM-63 Annonces Google (SEA)

- **Texte** : « Faites-vous de la publicité sur Google, avec Google Ads ? »
- **Réponses** : oui_non
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté ouvre ou ferme 7 questions.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Posée à tous, alors que D04 (publicité payante ou agence) dit déjà si l'entreprise fait de la publicité payante : si D04 = non, la réponse est forcément « non ».
- **Justification** : Publicité Google ou non : ouvre sept questions.
- **Condition proposée** : Posée si D04 = oui ; si D04 = non, réponse déduite « non » (mécanisme existant des réponses déduites).

#### COM-24.01 · Comm · COM-24 Objectif

- **Texte** : « Quel est l'objectif principal de votre communication ? »
- **Réponses** : choix · Trouver des clients / Vous faire connaître / Faire revenir vos clients / Recruter / Lancer une nouvelle offre
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu calculs COM-24.02 ; croisements XC28 (Objectif et dispositif) ; exécuté aucun.
- **Recommandation** : Fusionner (Peu utile)
- **Problème** : Redemande l'objectif de l'agent : depuis le 22 octobre, le dirigeant choisit ses objectifs Comm au début de l'agent. ACQ-24.01 a été retirée le 27 octobre pour la même raison.
- **Justification** : Sa seule utilité est le contrôle « objectif et dispositif » (COM-24.02, XC28), qui pourrait lire la finalité des objectifs choisis.
- **Doublon ou fusion** : Objectifs de l'agent Comm (`data/objectifs-agents.json`).
- **Donnée ou règle manquante** : Donner à chaque objectif Comm sa finalité (trouver des clients, se faire connaître, faire revenir, recruter, lancer une offre) et faire lire cette finalité par COM-24.02 ; ne poser COM-24.01 que pour un objectif personnel, ou plus du tout.

#### COM-13.05 · Comm · COM-13 Site web

- **Texte** : « Quelles pages de votre site sont les plus visitées ? »
- **Réponses** : liste
- **Posée** : approfondi ; tous les profils ; si D23 · si outil de mesure du site
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Retirer (Utilité à justifier)
- **Problème** : Lue par l'IA seulement ; liste libre de pages, sans chiffre. Les demandes par type (COM-13.03) et l'origine des visites (COM-13.04) disent déjà où le site travaille.
- **Justification** : À situation identique, une autre liste de pages ne change ni le diagnostic ni la priorité ; au mieux un exemple dans le texte du rapport.

#### COM-13.11 · Comm · COM-13 Site web

- **Texte** : « Quelle est l'adresse de votre site ? »
- **Réponses** : texte
- **Posée** : essentiel ; tous les profils ; si D23 · si site
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Retirer (Utilité à justifier)
- **Problème** : Lue par l'IA, mais l'IA du rapport ne consulte aucune page et aucun outil n'analyse le site : l'adresse ne sert à rien aujourd'hui.
- **Justification** : À situation identique, l'adresse ne change aucun calcul ni aucune priorité.
- **Arbitrage** : La garder seulement si une analyse du site est prévue (outil à construire).

#### COM-17.02 · Comm · COM-17 Funnel 1 · Être vu : portée

- **Texte** : « En moyenne sur les 3 derniers mois, combien de nouveaux abonnés et de désabonnements avez-vous par mois sur chaque réseau ? »
- **Réponses** : tableau · Nouveaux abonnés / Désabonnements · lignes : (declencheur D22)
- **Posée** : approfondi ; tous les profils ; si D22 · une ligne par réseau utilisé
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Retirer (Peu utile)
- **Problème** : Lue par l'IA seulement. La croissance nette de l'audience est déjà calculée (COM-37.02, à partir de COM-37.01) ; sans repère, l'IA ne peut pas dire qu'un nombre de désabonnements est élevé.
- **Justification** : À situation identique, les flux bruts d'abonnés ne changent ni la croissance mesurée ni la priorité.

</details>

<details><summary><strong>Cadrage</strong> : 3 questions</summary>

#### D07 · Cadrage

- **Texte** : « Avez-vous du stock ? »
- **Réponses** : Oui · non
- **Posée** : tous les profils ; si posée : Écran F20
- **Usage** : prévu Bloc Stock complet (FIN-37 à FIN-45) et délai de livraison fournisseur ; exécuté ouvre ou ferme 18 questions ; masque 9 thèmes.
- **Recommandation** : Préciser (Mal formulée)
- **Problème** : Vérification dans le code : la réponse sur le stock donnée à l'inscription (métier dont le stock est « à demander ») ou fixée par le métier n'est pas reprise ; D07 est reposée dans la Finance. Le dirigeant peut répondre deux fois à la même question.
- **Justification** : Stock : ouvre 18 questions et masque le bloc Stock (FIN-37 à 45) sinon.
- **Donnée ou règle manquante** : Pré-remplir D07 par la réponse du compte (métier « stock oui » ou réponse de l'inscription), comme une réponse déduite.

#### D11 · Cadrage

- **Texte** : « Avez-vous été à découvert sur la période ? »
- **Réponses** : Oui · non
- **Posée** : tous les profils ; si posée : Écran F17
- **Usage** : prévu Jours, montants, agios et causes du découvert ; exécuté ouvre ou ferme 5 questions.
- **Recommandation** : Préciser (Mal formulée)
- **Problème** : « Sur la période » ne dit pas de quelle période il s'agit ; les questions qu'elle ouvre portent sur les 12 derniers mois (FIN-24.01, 24.03).
- **Justification** : Découvert : ouvre 5 questions (jours, montants, agios, cause, mois) ; sert aussi de condition proposée pour FIN-11.03 et FIN-48.01.
- **Texte proposé (proposition, à valider)** : Avez-vous été à découvert au cours des 12 derniers mois ?

#### D04 · Cadrage

- **Texte** : « Faites-vous de la publicité payante ou travaillez-vous avec une agence marketing ? »
- **Réponses** : Oui · non
- **Posée** : tous les profils ; si posée : Écran A04
- **Usage** : prévu Dépenses par canal payant, agence, évolution du budget ; exécuté ouvre ou ferme 3 questions.
- **Recommandation** : Rendre conditionnelle (Utile sous conditions)
- **Problème** : Les canaux payants cochés dans ACQ-03.01 (publicité en ligne, publicité locale, plateformes…) disent déjà, pour la plupart des dirigeants, s'ils font de la publicité payante : la question est alors redemandée.
- **Justification** : Publicité payante ou agence : ouvre le coût par canal payant, le coût de l'agence et le budget d'il y a 12 mois (règle exécutée).
- **Condition proposée** : Réponse déduite « oui » quand un canal payant est coché dans ACQ-03.01 (mécanisme existant des réponses déduites) ; posée sinon, pour l'agence seule.

</details>

### Questions conservées dont l'exploitation est à développer, l'utilité à justifier ou l'usage à écrire (93)

<details><summary><strong>Acquisition</strong> : 24 questions</summary>

#### ACQ-06.12 · Acquisition · ACQ-06 Présence en ligne

- **Texte** : « Depuis votre fiche Google, que peut faire un client sans passer par votre site ? »
- **Réponses** : cases · Vous appeler / Prendre rendez-vous ou réserver en ligne / Voir vos services et vos prix / Voir vos produits ou votre menu / Rien de tout cela
- **Posée** : approfondi ; profils rdv, commerce, restaurant, chantier, b2b, abonnement, location ; si D03 · si « fiche Google » est cochée
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun calcul, croisement ni règle ne la lit, et le classeur ne dit pas à quoi elle sert.
- **Justification** : Ce que le client peut faire depuis la fiche (appeler, réserver, voir les prix) : une fiche sans réservation ni prix appelle une action précise et peu coûteuse (compléter la fiche). La réponse « Rien de tout cela » est un constat direct.
- **Donnée ou règle manquante** : Écrire son usage : critère de la notation Pratique du thème ACQ-06, ou lecture par l'IA, à confirmer avec la grille de la fiche Google côté Comm (COM-14). Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-07.15 · Acquisition · ACQ-07 Budget et coût d'acquisition

- **Texte** : « Parmi les clients venus par une plateforme, quelle part revient ensuite vous voir sans passer par elle ? »
- **Réponses** : nombre · pourcent
- **Posée** : approfondi ; profils rdv, commerce, ecommerce, restaurant, location ; si D03 · si « plateformes » est coché
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Lue par l'IA, sans lecture écrite.
- **Justification** : Clients venus par une plateforme qui reviennent en direct : si la part est forte, la commission ne se paie qu'une fois et la plateforme est un canal d'acquisition rentable ; si elle est faible, la dépendance à la plateforme coûte à chaque achat.
- **Donnée ou règle manquante** : Ajouter cette part au coût des plateformes (XA39).

#### ACQ-09.05 · Acquisition · ACQ-09 Rendez-vous

- **Texte** : « En moyenne, combien de rendez-vous faut-il pour signer un nouveau client ? »
- **Réponses** : nombre · nombre
- **Posée** : essentiel ; profils chantier, b2b ; si D05 · si activité sur rendez-vous
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Marquée « notée directement », mais elle n'est pas parmi les 36 indicateurs comparables au marché : aucun seuil ne pourra la noter. Proche de ACQ-11.05 (échanges avant signature).
- **Justification** : Rendez-vous nécessaires pour signer : un nombre élevé signale une vente lourde (qualification, offre peu claire) ; lu comme contexte par l'IA.
- **Doublon ou fusion** : ACQ-11.05 (même information, plus difficile à compter).
- **Arbitrage** : Garder celle-ci et retirer ACQ-11.05 ; écrire qu'elle est lue par l'IA, pas notée.

#### ACQ-10.07 · Acquisition · ACQ-10 Devis et relances

- **Texte** : « Combien de jours attendez-vous avant de relancer un client qui n'a pas répondu ? »
- **Réponses** : nombre · jours
- **Posée** : essentiel ; tous les profils ; si D36 · si vous relancez vos devis
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : « Notée directement », mais aucun seuil n'est écrit et l'indicateur n'est pas comparable au marché.
- **Justification** : Délai avant relance : une relance tardive est un levier précis (relancer plus tôt) ; posée seulement à qui relance.
- **Donnée ou règle manquante** : Règle de notation (Pratique) ou lecture par l'IA à écrire ; aucun seuil sourcé.

#### ACQ-11.31 · Acquisition · ACQ-11 Transformation

- **Texte** : « Sur les 12 derniers mois, quel est le total de vos {unites_vendues} ? »
- **Réponses** : nombre · nombre
- **Posée** : essentiel ; profils location
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit : les calculs du profil Location (taux d'occupation, prix moyen d'une unité, chiffre d'affaires perdu, croisement en miroir de XA34) sont dans la liste des calculs à écrire (CLAUDE.md, section 11).
- **Justification** : Unités vendues sur 12 mois (nuitées, jours de location) : numérateur du taux d'occupation, l'indicateur central d'un hébergement.
- **Donnée ou règle manquante** : Formule du taux d'occupation et croisement location à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-11.32 · Acquisition · ACQ-11 Transformation

- **Texte** : « Combien de {unites_a_louer} avez-vous à louer ? »
- **Réponses** : nombre · nombre
- **Posée** : essentiel ; profils location
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit (calculs Location à écrire).
- **Justification** : Unités à louer : dénominateur du taux d'occupation.
- **Donnée ou règle manquante** : Formule du taux d'occupation à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-11.33 · Acquisition · ACQ-11 Transformation

- **Texte** : « Sur les 12 derniers mois, combien de {jours_ouverture} votre établissement a-t-il été ouvert ? »
- **Réponses** : nombre · nombre
- **Posée** : essentiel ; profils location
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit (calculs Location à écrire).
- **Justification** : Jours d'ouverture sur 12 mois : capacité ouverte, dénominateur du taux d'occupation pour une activité saisonnière.
- **Donnée ou règle manquante** : Formule du taux d'occupation à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-11.34 · Acquisition · ACQ-11 Transformation

- **Texte** : « Sur les 12 derniers mois, combien de {demandes} avez-vous dû refuser faute de disponibilité ? »
- **Réponses** : nombre · nombre
- **Posée** : essentiel ; profils location
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit (calculs Location à écrire).
- **Justification** : Demandes refusées faute de disponibilité : signale une capacité saturée et le chiffre d'affaires perdu.
- **Donnée ou règle manquante** : Formule du chiffre d'affaires perdu (ACQ-11.40, à écrire). Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-11.35 · Acquisition · ACQ-11 Transformation

- **Texte** : « Sur les 12 derniers mois, combien de réservations ont été annulées trop tard pour être relouées, ou non honorées ? »
- **Réponses** : nombre · nombre
- **Posée** : essentiel ; profils location
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit (calculs Location à écrire).
- **Justification** : Réservations annulées trop tard ou non honorées : perte comparable aux absences des rendez-vous ; oriente vers les conditions d'annulation ou d'acompte.
- **Donnée ou règle manquante** : Formule du chiffre d'affaires perdu à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-11.37 · Acquisition · ACQ-11 Transformation

- **Texte** : « Sur les 12 derniers mois, quelle part de votre chiffre d'affaires vient de ce que vous vendez en plus : {hors_location} ? »
- **Réponses** : nombre · pourcent
- **Posée** : approfondi ; profils location
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit (calculs Location à écrire).
- **Justification** : Part du chiffre d'affaires hors location : sépare le chiffre d'affaires de la location pour le prix moyen d'une unité vendue ; sans elle, le prix moyen est surestimé.
- **Donnée ou règle manquante** : Formule du prix moyen d'une unité vendue à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-11.38 · Acquisition · ACQ-11 Transformation

- **Texte** : « Sur les 3 derniers mois, quelle part de votre chiffre d'affaires est venue des boissons ? »
- **Réponses** : nombre · pourcent
- **Posée** : essentiel ; profils restaurant
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Posée au niveau essentiel, lue par l'IA sans lecture écrite ni repère : l'IA ne peut que répéter le chiffre.
- **Justification** : Part du chiffre d'affaires venant des boissons (restaurant) : la boisson pèse sur la marge d'un restaurant ; une part faible désigne un levier de ticket moyen.
- **Conseil générique à risque** : « Développez la vente de boissons », sans repère pour dire si la part est faible.
- **Donnée ou règle manquante** : Aucun repère n'est écrit ; à défaut, la passer en approfondi.

#### ACQ-13.11 · Acquisition · ACQ-13 Prix et honoraires

- **Texte** : « Comment fixez-vous vos prix ? »
- **Réponses** : choix · À partir de vos coûts et d'une marge / En regardant les prix des concurrents / Selon ce que le client peut payer / À l'expérience, sans calcul
- **Posée** : approfondi ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Ajoutée le 27 octobre ; aucun usage écrit. Recoupe en partie FIN-03.01 (coût de revient connu ou non).
- **Justification** : Méthode de fixation des prix : un prix fixé « à l'expérience, sans calcul » ou sur les concurrents rend une hausse de prix (XA21) et l'analyse des offres vendues à perte (XF35) plus probables à proposer ; un prix calculé sur les coûts la rend moins nécessaire.
- **Donnée ou règle manquante** : Écrire sa lecture : avec XA21 et XF35, lue par l'IA. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-15.04 · Acquisition · ACQ-15 Panier moyen

- **Texte** : « Avez-vous une offre haut de gamme, plus complète ou plus chère que votre offre principale ? »
- **Réponses** : oui_non
- **Posée** : approfondi ; tous les profils
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté ouvre ou ferme 1 question.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Lue par l'IA, sans lecture écrite.
- **Justification** : Offre haut de gamme : ouvre ACQ-15.14 ; l'absence d'offre plus complète est un levier de panier moyen.
- **Conseil générique à risque** : « Créez une offre haut de gamme », sans savoir si les clients la demandent. À lire avec ACQ-13.14 (raison du choix) et ACQ-11.04 (affaires perdues sur le prix) pour éviter ce conseil quand le prix est la raison du choix.

#### ACQ-15.09 · Acquisition · ACQ-15 Panier moyen

- **Texte** : « Proposez-vous le paiement en plusieurs fois à vos clients ? »
- **Réponses** : oui_non
- **Posée** : approfondi ; profils commerce, ecommerce, chantier, b2b
- **Usage** : prévu aucun ; exécuté ouvre ou ferme 4 questions.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Ajoutée le 27 octobre ; aucun usage écrit, mais elle ouvre quatre questions.
- **Justification** : Paiement en plusieurs fois proposé ou non : levier de panier et de transformation sur les gros montants, et charge de trésorerie si l'entreprise le porte elle-même.
- **Donnée ou règle manquante** : Écrire sa lecture : avec ACQ-11.04 (affaires perdues sur le prix) et le panier moyen ; trésorerie avancée (FIN-19) si l'entreprise gère l'échéancier.

#### ACQ-15.10 · Acquisition · ACQ-15 Panier moyen

- **Texte** : « Qui gère ce paiement en plusieurs fois ? »
- **Réponses** : choix · Un organisme : Alma, Oney, Klarna… / Vous, avec un échéancier / Les deux
- **Posée** : approfondi ; profils commerce, ecommerce, chantier, b2b ; si D33 · si paiement en plusieurs fois proposé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Qui porte le paiement en plusieurs fois : si c'est l'entreprise, elle avance la trésorerie à ses clients, ce qui relève des délais clients de la Finance.
- **Donnée ou règle manquante** : Relier à la trésorerie avancée aux clients (FIN-19) ; sans cette lecture, la retirer. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-15.12 · Acquisition · ACQ-15 Panier moyen

- **Texte** : « Sur les 3 derniers mois, quelle part de votre chiffre d'affaires a été payée en plusieurs fois ? »
- **Réponses** : nombre · pourcent
- **Posée** : approfondi ; profils commerce, ecommerce, chantier, b2b ; si D33 · si paiement en plusieurs fois proposé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Part du chiffre d'affaires payée en plusieurs fois : mesure le poids de la pratique, et donc la trésorerie avancée quand l'entreprise la porte.
- **Donnée ou règle manquante** : Relier à la trésorerie avancée aux clients (FIN-19) ; sans cette lecture, la retirer. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-17.28 · Acquisition · ACQ-17 Clients récurrents

- **Texte** : « Avez-vous un programme de fidélité : carte, points ou remise après plusieurs visites ou achats ? »
- **Réponses** : oui_non
- **Posée** : approfondi ; profils rdv, commerce, ecommerce, restaurant, location
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Programme de fidélité (oui / non) : levier de retour des clients pour le commerce, la restauration et les prestations sur rendez-vous.
- **Conseil générique à risque** : « Créez un programme de fidélité », même quand les clients reviennent déjà. À lire seulement avec le taux de retour (ACQ-17.02) et la part du chiffre d'affaires des anciens clients (ACQ-17.04).
- **Donnée ou règle manquante** : Écrire sa lecture avec ACQ-17.02 et XA16. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-17.29 · Acquisition · ACQ-17 Clients récurrents

- **Texte** : « Proposez-vous un contrat d'entretien ou de suivi après vos travaux ? »
- **Réponses** : oui_non
- **Posée** : approfondi ; profils chantier
- **Usage** : prévu aucun ; exécuté ouvre ou ferme 1 question.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; posée à tous les artisans, alors que le contrat d'entretien n'existe que dans certains métiers (chauffage, climatisation, entretien d'espaces verts…).
- **Justification** : Contrat d'entretien proposé : source de revenu récurrent pour un artisan ; ouvre ACQ-17.30.
- **Condition proposée** : Posée aux métiers où un contrat d'entretien existe.
- **Donnée ou règle manquante** : Liste des métiers concernés à fournir par le propriétaire (le mécanisme « Métiers concernés » existe pour les modules métier).

#### ACQ-17.30 · Acquisition · ACQ-17 Clients récurrents

- **Texte** : « Aujourd'hui, combien de clients ont un contrat d'entretien avec vous ? »
- **Réponses** : nombre · nombre
- **Posée** : approfondi ; profils chantier ; si D39 · si contrat d'entretien proposé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Clients sous contrat d'entretien : mesure le revenu récurrent d'un artisan et la base de clients à qui proposer des travaux.
- **Donnée ou règle manquante** : Relier au revenu récurrent ou à la fidélisation (XA16) ; sans lecture, la retirer avec ACQ-17.29. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-18.07 · Acquisition · ACQ-18 Recommandation

- **Texte** : « Que gagne la personne qui vous recommande un nouveau client ? »
- **Réponses** : nombre · euros
- **Posée** : approfondi ; tous les profils ; si D17 · si programme de parrainage
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit, alors que le coût d'un client recommandé (ACQ-18.05) a besoin de ce que gagne le parrain : c'est son coût.
- **Justification** : Gain du parrain : permet de comparer le coût d'un client recommandé à celui d'un client venu par un canal payant.
- **Donnée ou règle manquante** : Ajouter ACQ-18.07 aux entrées de ACQ-18.05. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-20.01 · Acquisition · ACQ-20 Suivi commercial

- **Texte** : « Avec quel outil suivez-vous vos contacts et vos affaires en cours ? »
- **Réponses** : choix · Aucun / Un cahier ou des notes / Un tableur / Un logiciel de suivi des clients / Le logiciel de votre métier
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : « Notée directement », sans règle ; un cahier peut suffire à une petite entreprise : la réponse seule ne prouve pas un défaut.
- **Justification** : Outil de suivi des contacts : explique des devis non relancés ou des demandes sans réponse quand ces problèmes existent.
- **Conseil générique à risque** : « Équipez-vous d'un logiciel de suivi des clients ». À n'utiliser que si un problème de suivi est constaté (devis sans réponse ACQ-10.12, relances ACQ-10.06, demandes sans réponse ACQ-08.08).
- **Donnée ou règle manquante** : Règle de lecture : avec ACQ-10.06 et ACQ-08.08, pas seule.

#### ACQ-20.06 · Acquisition · ACQ-20 Suivi commercial

- **Texte** : « Notez-vous d'où vient chaque nouveau client ? »
- **Réponses** : choix · Toujours / Parfois / Jamais
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Origine notée pour chaque client : dit si les répartitions par canal (ACQ-03.02 à 03.04) sont mesurées ou estimées. « Jamais » rend les calculs par canal (XA10 à XA13) incertains et fait de « noter l'origine » une action préalable, précise et peu coûteuse.
- **Donnée ou règle manquante** : Règle à écrire : lire les répartitions par canal comme estimées et placer l'action en tête du plan quand un levier par canal en dépend. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### ACQ-25.01 · Acquisition · ACQ-25 Métier · Transport de personnes et coursiers

- **Texte** : « Sur une semaine habituelle, combien de courses faites-vous, combien d'heures êtes-vous disponible, et combien d'heures roulez-vous avec un client ou un colis ? »
- **Réponses** : composite · Courses / Heures disponibles / Heures avec un client ou un colis
- **Posée** : essentiel ; tous les profils ; 3 métiers ou activités
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Contexte lu par l'IA, sans calcul écrit.
- **Justification** : Courses, heures disponibles et heures avec un client : donne la part du temps réellement productif, l'indicateur central d'un chauffeur ou d'un coursier.
- **Donnée ou règle manquante** : Calcul de la part des heures productives à écrire.

#### ACQ-25.02 · Acquisition · ACQ-25 Métier · Transport de personnes et coursiers

- **Texte** : « Sur une semaine habituelle, combien de kilomètres faites-vous au total, et combien avec un client ou un colis ? »
- **Réponses** : composite · Kilomètres au total / Dont avec un client ou un colis
- **Posée** : essentiel ; tous les profils ; 3 métiers ou activités
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Contexte lu par l'IA, sans calcul écrit.
- **Justification** : Kilomètres au total et avec un client : part des kilomètres à vide, levier direct de rentabilité.
- **Donnée ou règle manquante** : Calcul de la part des kilomètres à vide à écrire.

</details>

<details><summary><strong>Finance</strong> : 8 questions</summary>

#### FIN-09.10 · Finance · FIN-09 Dépenses récurrentes

- **Texte** : « Combien vous coûtent au total vos abonnements et contrats chaque mois ? »
- **Réponses** : nombre · euros
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Posée au niveau essentiel, aucun usage écrit. Or les charges fixes totales (FIN-05.08) attendent le coût des abonnements, demandé en détail seulement en approfondi (FIN-09.01) : au niveau essentiel, les charges fixes sont incomplètes (écart signalé le 28 octobre, section 15).
- **Justification** : Total des abonnements et contrats : c'est le « seul total des abonnements » que la section 15 propose comme solution ; la question existe déjà.
- **Donnée ou règle manquante** : Ajouter FIN-09.10 aux entrées de FIN-05.08 quand FIN-09.01 n'est pas répondu ; en approfondi, la pré-remplir par la somme de FIN-09.01 (même mécanisme que FIN-05.02) pour ne pas demander deux fois. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).
- **Arbitrage** : Choisir cette solution parmi les trois de la section 15 (point 13).

#### FIN-13.06 · Finance · FIN-13 Échéances à venir

- **Texte** : « Prévoyez-vous vos rentrées et vos sorties d'argent des prochains mois, dans un plan de trésorerie ? »
- **Réponses** : choix · Oui, sur 12 mois / Oui, sur 3 à 6 mois / Seulement de tête / Non
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; elle n'est même pas parmi les entrées du niveau de pilotage financier (XF46), qui lit pourtant les autres questions de pilotage.
- **Justification** : Plan de trésorerie tenu ou non : lu avec les mois de tension à venir (FIN-13.04), il dit si la tension était prévue ou subie.
- **Conseil générique à risque** : « Faites un plan de trésorerie » ou « Suivez votre trésorerie ». CAXE calcule lui-même la trésorerie des 3 prochains mois (FIN-13.03) : le conseil doit nommer le mois de tension et son montant, pas demander de suivre la trésorerie en général.
- **Donnée ou règle manquante** : Ajouter FIN-13.06 aux entrées de XF46 et la lire avec FIN-13.04. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### FIN-16.03 · Finance · FIN-16 Délai de facturation

- **Texte** : « Comment faites-vous vos factures ? »
- **Réponses** : choix · À la main (traitement de texte, tableur, papier) / Avec un logiciel / Automatiquement à la fin de la prestation
- **Posée** : approfondi ; profils chantier, b2b, abonnement ; si D09 · si paiement après facture
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : « Notée directement », sans règle : une facturation à la main n'est un défaut que si elle cause des retards ou des oublis.
- **Justification** : Façon de facturer : avec un retard de facturation (FIN-16.01) ou des factures oubliées (FIN-16.04), désigne une cause et une action précises.
- **Conseil générique à risque** : « Passez à un logiciel de facturation » sans retard ni oubli constaté.
- **Donnée ou règle manquante** : Règle de lecture : seulement avec FIN-16.01 et FIN-16.04.

#### FIN-17.10 · Finance · FIN-17 Délai de paiement

- **Texte** : « Comment vos clients vous paient-ils le plus souvent ? »
- **Réponses** : choix · Virement / Chèque / Carte bancaire / Prélèvement automatique / Espèces / Plateforme de paiement en ligne
- **Posée** : approfondi ; tous les profils ; si D09 · si paiement après facture
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Moyen de paiement le plus courant : quand les délais réels dépassent le délai prévu (FIN-17.07), un paiement par chèque ou virement à l'initiative du client désigne une action précise (prélèvement, paiement en ligne).
- **Conseil générique à risque** : « Proposez le prélèvement automatique » sans retard constaté.
- **Donnée ou règle manquante** : Lire avec FIN-17.07 et XF22 ; sans cette lecture, la retirer. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### FIN-20.08 · Finance · FIN-20 Paiements fournisseurs

- **Texte** : « De combien est cette remise ? »
- **Réponses** : nombre · pourcent
- **Posée** : approfondi ; tous les profils ; si D43 · si remise pour paiement rapide
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit, alors que XF26 compare « la remise proposée par le fournisseur » au coût du découvert : ses entrées citent la question oui / non (FIN-20.03), pas le taux.
- **Justification** : Taux de la remise : seul chiffre qui permet de dire si payer plus vite rapporte plus que le découvert ne coûte.
- **Donnée ou règle manquante** : Ajouter FIN-20.08 aux entrées de XF26. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### FIN-46.01 · Finance · FIN-46 Rémunération du dirigeant

- **Texte** : « Sur les 12 derniers mois, quelle somme avez-vous retirée de l'entreprise pour vous payer ? »
- **Réponses** : nombre · euros
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit, alors que deux croisements en ont besoin : « Seuil en vous rémunérant » (XF03) et « Ce que l'entreprise peut verser au dirigeant » (XF38, « rémunération actuelle comparée à la marge disponible ») ; leurs entrées ne la citent pas.
- **Justification** : Somme retirée sur 12 mois : sans elle, le seuil de rentabilité ignore la rémunération du dirigeant et XF38 ne peut pas comparer ce qu'il se verse à ce que l'entreprise peut lui verser.
- **Donnée ou règle manquante** : Ajouter FIN-46.01 aux entrées de XF03 et XF38. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### FIN-46.03 · Finance · FIN-46 Rémunération du dirigeant

- **Texte** : « Combien voudriez-vous vous verser par mois pour que votre activité vous convienne ? »
- **Réponses** : nombre · euros
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Rémunération souhaitée : donne le seuil de rentabilité « en vous rémunérant » (XF03) au niveau que le dirigeant vise ; un autre montant change le chiffre d'affaires nécessaire.
- **Donnée ou règle manquante** : Ajouter FIN-46.03 aux entrées de XF03. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### FIN-47.02 · Finance · FIN-47 Cadre de l'activité

- **Texte** : « Avez-vous un compte bancaire réservé à votre activité ? »
- **Réponses** : oui_non
- **Posée** : essentiel ; tous les profils ; si D31 · si micro-entreprise ou entreprise individuelle
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Compte réservé à l'activité : sans compte séparé, la trésorerie (FIN-11.01) et les flux (FIN-12.01) mêlent argent personnel et professionnel ; les calculs de trésorerie sont alors moins sûrs.
- **Donnée ou règle manquante** : Règle à écrire : marquer les calculs de trésorerie comme moins sûrs quand la réponse est « non ». Ne jamais en tirer un conseil juridique. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

</details>

<details><summary><strong>RH</strong> : 25 questions</summary>

#### RH-05.10 · RH · RH-05 Temps du dirigeant

- **Texte** : « Combien de temps pourriez-vous vous absenter sans que vos clients subissent de retard ? »
- **Réponses** : choix · Moins d'1 jour / 1 à 2 jours / 3 à 6 jours / 1 à 2 semaines / Plus de 2 semaines
- **Posée** : essentiel ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit. Or la dépendance totale au dirigeant (XR23) annonce « absence possible du dirigeant » et lit à la place RH-38.01, qui porte sur les autres personnes clés (« En dehors de vous »).
- **Justification** : Durée d'absence possible du dirigeant sans retard pour les clients : la mesure directe de sa dépendance ; « Moins d'1 jour » change la priorité du plan (relais, consignes écrites).
- **Donnée ou règle manquante** : Brancher RH-05.10 sur XR23 à la place de RH-38.01 (voir RH-38.01). Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-05.11 · RH · RH-05 Temps du dirigeant

- **Texte** : « Sur les 12 derniers mois, combien de semaines de congés avez-vous prises ? »
- **Réponses** : nombre · semaines
- **Posée** : essentiel ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Semaines de congés du dirigeant : avec RH-05.01 et RH-05.10, montre une charge que les heures hebdomadaires ne montrent pas (aucun congé possible).
- **Donnée ou règle manquante** : Écrire sa lecture : avec XR05 (temps de développement) et XR23 (dépendance au dirigeant). Aucun seuil n'est écrit ; ne pas en inventer. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-07.02 · RH · RH-07 Capacité disponible

- **Texte** : « Pendant un pic d'activité de quelques semaines, combien d'heures en plus par semaine l'équipe peut-elle absorber, heures supplémentaires comprises ? »
- **Réponses** : nombre · heures
- **Posée** : approfondi ; profils 
- **Usage** : prévu lue par l'IA (IA non branchée) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Lue par l'IA, sans lecture écrite.
- **Justification** : Heures absorbables pendant un pic : dit si les mois forts (RH-11) se passent sans renfort ; une faible réserve rend le renfort prioritaire.
- **Donnée ou règle manquante** : Ajouter RH-07.02 aux entrées de XR30 (mois forts sans renfort).

#### RH-15.03 · RH · RH-15 Outils

- **Texte** : « Sur une semaine habituelle, combien d'heures ce matériel fait-il perdre ? »
- **Réponses** : nombre · heures
- **Posée** : approfondi ; profils  ; si D47 · si du matériel ralentit le travail
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit, alors que XR29 calcule « heures perdues à cause du matériel × coût d'une heure » : ses entrées citent la question oui / non (RH-15.02), pas les heures.
- **Justification** : Heures perdues par semaine : seul chiffre qui permet de valoriser le matériel qui ralentit.
- **Donnée ou règle manquante** : Ajouter RH-15.03 aux entrées de XR29. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-24.01 · RH · RH-24 Besoins de développement

- **Texte** : « Avez-vous identifié les besoins de formation de chacun ? »
- **Réponses** : choix · Oui, pour chacun / Pour certains / Non
- **Posée** : essentiel ; profils 
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : « Notée directement », sans règle ; « Non » deviendrait un défaut même sans manque de compétence.
- **Justification** : Besoins de formation identifiés (équipes de 6 ou plus) : utile quand des compétences manquent (RH-23.01) ou que des reprises viennent d'un manque de formation (RH-16.02).
- **Conseil générique à risque** : « Identifiez les besoins de formation de chacun ».
- **Donnée ou règle manquante** : Lecture avec RH-23.01 et RH-16.02 à écrire.

#### RH-25.01 · RH · RH-25 Apprentissage

- **Texte** : « Sur les 12 derniers mois, combien de jours de formation l'équipe a-t-elle suivis, et la transmission entre collègues est-elle organisée ? »
- **Réponses** : composite · Jours de formation / Transmission organisée entre collègues
- **Posée** : essentiel ; profils 
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté ouvre ou ferme 1 question.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : « Notée directement » ; aucun repère ne dit combien de jours de formation sont attendus, et zéro n'est pas un défaut en soi.
- **Justification** : Jours de formation et transmission entre collègues : utile avec les compétences qui manquent (RH-23.01) et la polyvalence (RH-27.01) ; ouvre RH-26.01.
- **Conseil générique à risque** : « Formez votre équipe ».
- **Donnée ou règle manquante** : Aucun seuil sourcé ; lecture avec RH-23.01 et RH-27.01 à écrire.

#### RH-28.09 · RH · RH-28 Besoin

- **Texte** : « Par quels moyens recrutez-vous ? »
- **Réponses** : cases · Bouche-à-oreille et cooptation / France Travail / Sites d'emploi / Réseaux sociaux / Écoles et alternance / Agence d'intérim ou cabinet / Candidatures spontanées
- **Posée** : approfondi ; profils  ; si D13 · si recrutement fait ou prévu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Moyens de recrutement utilisés : lus avec le nombre de candidatures (RH-28.04), ils disent si le manque de candidats vient de canaux trop peu nombreux.
- **Donnée ou règle manquante** : Lecture avec RH-28.04 à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-28.10 · RH · RH-28 Besoin

- **Texte** : « Lequel de ces moyens vous a apporté vos meilleures recrues ? »
- **Réponses** : choix · Bouche-à-oreille et cooptation / France Travail / Sites d'emploi / Réseaux sociaux / Écoles et alternance / Agence d'intérim ou cabinet / Candidatures spontanées / Aucun pour l'instant
- **Posée** : approfondi ; profils  ; si D13 · si recrutement fait ou prévu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Moyen qui a apporté les meilleures recrues : désigne où concentrer l'effort de recrutement.
- **Donnée ou règle manquante** : Lecture avec RH-28.09 et RH-28.04 à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-35.01 · RH · RH-35 Retours sur les conditions de travail

- **Texte** : « Comment recueillez-vous l'avis de l'équipe sur ses conditions de travail ? »
- **Réponses** : choix · Par un questionnaire / En entretien / Jamais
- **Posée** : essentiel ; profils 
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : « Notée directement », sans règle.
- **Justification** : Recueil de l'avis de l'équipe (6 personnes ou plus) : utile quand départs ou absences sont élevés ; « Jamais » désigne alors une action précise.
- **Conseil générique à risque** : « Recueillez l'avis de votre équipe » sans départ ni absence constatés.
- **Donnée ou règle manquante** : Lecture avec RH-32 et RH-34 à écrire. Le mini-questionnaire anonyme aux salariés (section 15) répondra mieux à ce besoin.

#### RH-39.01 · RH · RH-39 Changements d'organisation

- **Texte** : « Comment vos derniers changements d'organisation ont-ils été menés : nouvel outil, nouveaux rôles, nouveaux horaires ? »
- **Réponses** : choix · Préparés avec l'équipe / Annoncés / Imposés / Aucun changement récent
- **Posée** : essentiel ; profils 
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : « Notée directement », sans règle.
- **Justification** : Façon de mener les changements (équipes de 6 ou plus) : le plan d'action est lui-même un changement ; la réponse dit comment le présenter à l'équipe.
- **Conseil générique à risque** : « Associez l'équipe aux changements ».
- **Donnée ou règle manquante** : Lue par l'IA pour la mise en œuvre du plan, pas notée seule.

#### RH-41.02 · RH · RH-41 Projet d'équipe

- **Texte** : « Quelle forme d'aide envisagez-vous ? »
- **Réponses** : cases · Un salarié / Un apprenti ou un alternant / Un stagiaire / Un freelance ou un sous-traitant régulier / Un assistant à distance / Un associé / Pas encore décidé
- **Posée** : essentiel ; profils  ; si D28 · si vous voulez être aidé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Forme d'aide envisagée, lue par l'IA : un salarié, un apprenti ou un freelance changent le coût, le délai et ce qui est à préparer. Aucun conseil sur le contrat lui-même.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-41.03 · RH · RH-41 Projet d'équipe

- **Texte** : « Pour quelle raison principale voulez-vous être aidé ? »
- **Réponses** : choix · Libérer du temps / Répondre à plus de demandes / Apporter une compétence qui vous manque / Pouvoir vous absenter sans perdre de clients / Lancer une nouvelle activité / Ne plus travailler seul
- **Posée** : essentiel ; profils  ; si D28 · si vous voulez être aidé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Raison principale d'être aidé, lue par l'IA : libérer du temps, répondre à plus de demandes ou pouvoir s'absenter orientent vers des tâches à confier différentes.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-42.01 · RH · RH-42 Tâches à confier

- **Texte** : « Quelles tâches lui confieriez-vous en premier, et combien de temps vous prennent-elles ? »
- **Réponses** : tableau · Heures par semaine / S'apprend en moins d'un mois / Méthode écrite · lignes : (libre)
- **Posée** : essentiel ; profils  ; si D28 · si vous voulez être aidé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Tâches à confier, heures, apprentissage rapide, méthode écrite : donne les heures libérables et la première tâche à confier (celle qui s'apprend vite et a une méthode).
- **Donnée ou règle manquante** : Calcul des heures libérables à écrire, sur le modèle de XR04 (heures du dirigeant récupérables). Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-42.02 · RH · RH-42 Tâches à confier

- **Texte** : « Quelles tâches ne pourriez-vous confier à personne aujourd'hui, et pourquoi ? »
- **Réponses** : texte
- **Posée** : approfondi ; profils  ; si D28 · si vous voulez être aidé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Tâches impossibles à confier et pourquoi (texte libre, contexte pour l'IA) : borne ce que le plan peut proposer.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-43.01 · RH · RH-43 Moyens pour une première aide

- **Texte** : « Combien pourriez-vous consacrer chaque mois à cette aide, tout compris ? »
- **Réponses** : nombre · euros
- **Posée** : essentiel ; profils  ; si D28 · si vous voulez être aidé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Budget mensuel pour une aide : comparé à la valeur des clients perdus faute de temps (RH-43.02 × panier moyen), dit si l'aide se paie par le chiffre d'affaires récupéré.
- **Conseil générique à risque** : « Embauchez un apprenti » ou un montant de salaire inventé : aucun coût d'une forme d'aide n'est sourcé ; l'IA ne doit pas en avancer.
- **Donnée ou règle manquante** : Croisement budget et chiffre d'affaires perdu à écrire (nature Cohérence du thème RH-43). Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-43.03 · RH · RH-43 Moyens pour une première aide

- **Texte** : « Que faudrait-il prévoir en plus pour accueillir cette personne ? »
- **Réponses** : cases · Un véhicule / De l'outillage ou une machine / Un ordinateur et des logiciels / Un poste de travail ou un bureau / Rien de plus
- **Posée** : approfondi ; profils  ; si D28 · si vous voulez être aidé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Ce qu'il faudrait prévoir en plus (véhicule, outillage, poste), lue par l'IA : signale un coût d'accueil qui change la forme d'aide la plus adaptée.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-44.01 · RH · RH-44 Freins

- **Texte** : « Qu'est-ce qui vous retient le plus de vous faire aider aujourd'hui ? »
- **Réponses** : cases · Le coût / Les démarches administratives / La peur de mal choisir / Le temps pour former / La difficulté à trouver quelqu'un / La peur de perdre en qualité / Un travail pas assez régulier / Rien de particulier
- **Posée** : essentiel ; profils  ; si D28 · si vous voulez être aidé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Ce qui retient de se faire aider, lue par l'IA : le coût, les démarches, la peur de mal choisir ou le temps de formation appellent des réponses différentes. Les démarches ne donnent lieu à aucun conseil juridique.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-44.03 · RH · RH-44 Freins

- **Texte** : « Qu'est-ce qui n'a pas fonctionné ? »
- **Réponses** : choix · Mauvais choix de la personne / Pas assez de travail à lui confier / Trop de temps pour la former / Coût trop élevé / Qualité insuffisante / Mauvaise entente
- **Posée** : essentiel ; profils  ; si D29 · si l'expérience s'est mal passée
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Ce qui n'a pas fonctionné, lue par l'IA : évite de reproposer la même forme d'aide sans traiter la cause.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-45.01 · RH · RH-45 Relais quand on est seul

- **Texte** : « Si vous ne pouviez pas travailler pendant 2 semaines, qui pourrait s'occuper de vos clients ? »
- **Réponses** : choix · Personne / Un proche / Un confrère ou un sous-traitant de confiance / Un freelance que vous connaissez
- **Posée** : essentiel ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Qui s'occuperait des clients pendant deux semaines : « Personne » est un risque concret pour un dirigeant seul et appelle une action précise (un relais nommé).
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-45.02 · RH · RH-45 Relais quand on est seul

- **Texte** : « Vos clients, vos accès et vos informations clés sont-ils notés quelque part, pour qu'une autre personne puisse s'en servir ? »
- **Réponses** : choix · Oui, tout est noté / En partie / Non, tout est dans ma tête
- **Posée** : essentiel ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Clients, accès et informations clés notés : condition pour qu'un relais puisse agir ; « tout est dans ma tête » désigne une action précise.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-47.01 · RH · RH-47 Planning de l'équipe

- **Texte** : « Qui fait le planning de l'équipe, et combien d'heures cela prend-il sur une semaine habituelle ? »
- **Réponses** : composite · Qui le fait [Vous / Un responsable / Chacun s'organise / Il n'y a pas de planning] / Heures par semaine
- **Posée** : essentiel ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; thème Pratique sans règle.
- **Justification** : Qui fait le planning et en combien d'heures : si c'est le dirigeant, ce temps entre dans ses heures récupérables ; « Il n'y a pas de planning » explique des urgences (RH-09) quand elles existent.
- **Donnée ou règle manquante** : Relier aux heures récupérables du dirigeant (XR04) et lire avec les causes d'urgence (RH-09.02). Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-47.03 · RH · RH-47 Planning de l'équipe

- **Texte** : « Sur une semaine habituelle, combien de fois le planning change-t-il au dernier moment ? »
- **Réponses** : choix · 0 / 1 ou 2 / 3 à 5 / Plus de 5
- **Posée** : approfondi ; profils 
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Changements de planning au dernier moment : cause directe d'urgences et d'interruptions ; désigne une action précise quand ils sont fréquents.
- **Donnée ou règle manquante** : Lire avec RH-09 (urgences, cause « Manque de planification ») et XR13. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### RH-48.01 · RH · RH-48 Objectifs individuels

- **Texte** : « Chaque personne a-t-elle des objectifs clairs, écrits et revus avec vous ? »
- **Réponses** : choix · Pour tous / Pour une partie / Pour personne
- **Posée** : essentiel ; profils 
- **Usage** : prévu aucun ; exécuté ouvre ou ferme 1 question.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; thème Pratique sans règle ; posée dès deux personnes.
- **Justification** : Objectifs individuels clairs : explique des délégations ratées ou des reprises quand elles existent ; ouvre RH-48.02.
- **Conseil générique à risque** : « Fixez des objectifs individuels » dans une équipe de deux ou trois personnes, sans problème constaté.
- **Donnée ou règle manquante** : Lecture avec RH-04 et RH-16 à écrire.

#### RH-49.01 · RH · RH-49 Encadrement

- **Texte** : « Combien de responsables encadrent une partie de l'équipe, et combien de personnes chacun suit-il au plus ? »
- **Réponses** : composite · Responsables, vous non compris / Personnes suivies par un responsable, au plus
- **Posée** : essentiel ; profils 
- **Usage** : prévu aucun ; exécuté ouvre ou ferme 1 question.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; ouvre RH-49.02.
- **Justification** : Responsables et nombre de personnes suivies par chacun (équipes de 6 ou plus) : un responsable qui suit beaucoup de personnes est un goulot possible.
- **Donnée ou règle manquante** : Aucun seuil n'est écrit ; à lire avec RH-08 (goulot) sans en inventer.

#### RH-49.02 · RH · RH-49 Encadrement

- **Texte** : « Ces responsables ont-ils été formés pour encadrer ? »
- **Réponses** : choix · Tous / Certains / Aucun
- **Posée** : approfondi ; profils  ; si D52 · s'il y a des responsables
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Responsables formés à l'encadrement : lu avec les départs (RH-32.03, cause « Management ») ou les reprises, désigne une action précise.
- **Conseil générique à risque** : « Formez vos responsables » sans problème constaté.
- **Donnée ou règle manquante** : Lecture avec RH-32.03 à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

</details>

<details><summary><strong>Comm</strong> : 35 questions</summary>

#### COM-03.01 · Comm · COM-03 Promesse

- **Texte** : « Quel résultat concret promettez-vous à vos clients ? »
- **Réponses** : texte
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Texte libre « notée directement » : seule l'IA pourrait juger qu'une promesse est concrète, ce qui revient à lui faire produire une couleur.
- **Justification** : Résultat promis aux clients : matière de la communication et du conseil de message ; distinct de COM-04.01 (décision du 27 octobre).
- **Donnée ou règle manquante** : À lire comme contexte (création de contenu, conseil), pas à noter ; ou à noter par une règle de code sur une réponse fermée.

#### COM-05.01 · Comm · COM-05 Garantie

- **Texte** : « Proposez-vous une garantie à vos clients ? »
- **Réponses** : choix · Aucune / Satisfait ou remboursé / Délai garanti / Essai gratuit / Prix ferme garanti / Autre
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu notée directement (règle Pratique non écrite) ; exécuté ouvre ou ferme 1 question.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : « Notée directement » : « Aucune » garantie deviendrait un défaut, alors que toutes les activités ne s'y prêtent pas.
- **Justification** : Garantie proposée : lue avec les affaires perdues face à un concurrent ou sur le prix (ACQ-11.04) ou l'hésitation des clients, désigne un argument à ajouter ; ouvre COM-05.02.
- **Conseil générique à risque** : « Proposez une garantie satisfait ou remboursé », sans hésitation constatée ; une garantie engage juridiquement l'entreprise, le rapport ne doit pas en proposer la forme.
- **Donnée ou règle manquante** : Lecture avec ACQ-11.04 à écrire.

#### COM-05.02 · Comm · COM-05 Garantie

- **Texte** : « En quelques mots, que garantissez-vous exactement ? »
- **Réponses** : texte
- **Posée** : essentiel ; tous les profils ; si D56 · si garantie proposée
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Ce qui est garanti exactement (texte libre) : matière pour les contenus qui présentent la garantie.
- **Donnée ou règle manquante** : Déclarer l'usage : création de contenu et contexte de l'IA. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-09.08 · Comm · COM-09 Preuve et expertise

- **Texte** : « Pour chacune de vos offres principales, avez-vous au moins une preuve à montrer ? »
- **Réponses** : tableau · Au moins une preuve · lignes : Offre 1 / Offre 2 / Offre 3
- **Posée** : approfondi ; tous les profils
- **Usage** : prévu aucun ; exécuté lignes de tableaux liés.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit, alors que « Offres et types de clients sans aucune preuve » (COM-09.07) annonce les offres et ne lit que la question par catégorie (COM-09.03).
- **Justification** : Preuve par offre : désigne l'offre qui n'a rien à montrer.
- **Donnée ou règle manquante** : Ajouter COM-09.08 aux entrées de COM-09.07.

#### COM-22.04 · Comm · COM-22 Funnel 6 · Devenir un contact : demandes venues des réseaux

- **Texte** : « Sur les 12 derniers mois, parmi les demandes qui vous sont venues des réseaux sociaux, quelle part est venue de chaque réseau ? »
- **Réponses** : tableau · Part · lignes : (declencheur D22)
- **Posée** : essentiel ; tous les profils ; si D03 · si « Réseaux sociaux » est coché
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit, alors que les demandes venant de la communication sont « réparties par réseau quand c'est connu » (COM-22.02) et que XC02 compare la part de chaque réseau dans les demandes. Sens « mesurée sur les demandes » à trancher (section 15).
- **Justification** : Part des demandes venues de chaque réseau : seul chiffre qui dit quel réseau apporte des demandes.
- **Donnée ou règle manquante** : Ajouter COM-22.04 aux entrées de COM-22.02. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-27.02 · Comm · COM-27 Funnel 0 · Publications par étape

- **Texte** : « Sur les 3 derniers mois, à quoi ont servi vos publications ? »
- **Réponses** : tableau · Part des publications · lignes : Vous faire connaître : conseils, coulisses, actualité, humour / Montrer que votre travail est bon : avis, réalisations, avant-après, cas clients / Donner envie d'agir : offre, promotion, invitation à vous contacter
- **Posée** : essentiel ; tous les profils ; si D21 · si vous publiez déjà
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : À quoi ont servi les publications (se faire connaître, prouver, vendre) : un mélange sans publication qui vend explique une audience sans demandes (XC07).
- **Donnée ou règle manquante** : Lecture avec XC07 et la part des publications avec un appel à l'action (COM-20.01) à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-43.03 · Comm · COM-43 Suivi des chiffres

- **Texte** : « Comment savez-vous quels clients viennent de vos publications ? »
- **Réponses** : cases · Liens suivis / Codes promo réservés aux réseaux / Numéro ou formulaire réservé aux réseaux / Aucun moyen
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Moyen de savoir quels clients viennent des publications : « Aucun moyen » rend les demandes attribuées aux réseaux (COM-22.02) estimées, et fait du suivi une action préalable précise.
- **Donnée ou règle manquante** : Lire avec COM-22.02 ; proche de ACQ-20.06 (origine notée pour chaque client) côté Acquisition. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-45.02 · Comm · COM-45 Sollicitation d'avis

- **Texte** : « Comment demandez-vous cet avis ? »
- **Réponses** : cases · À l'oral / Par un lien envoyé / Par un QR code / Par un message automatique
- **Posée** : essentiel ; tous les profils ; si D62 · si vous demandez des avis
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Façon de demander un avis (oral, lien, QR code, message automatique) : une demande seulement orale explique peu d'avis malgré des demandes ; désigne l'outil à ajouter.
- **Donnée ou règle manquante** : Ajouter à la lecture de XC24. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-55.01 · Comm · COM-55 Funnel 3 · Visiter le profil : ce qu'il contient

- **Texte** : « Sur chaque réseau, que contient votre profil ? »
- **Réponses** : tableau · Description claire : quoi, pour qui, où / Lien vers votre site ou votre prise de rendez-vous / Bouton de contact / Publications épinglées qui présentent votre offre · lignes : (declencheur D22)
- **Posée** : essentiel ; tous les profils ; si D21 · si vous publiez déjà
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; seize cases au niveau essentiel.
- **Justification** : Contenu du profil sur chaque réseau (description, lien, bouton, publications épinglées) : désigne l'élément à ajouter, action précise et rapide.
- **Donnée ou règle manquante** : Règle de notation Pratique à écrire (thème COM-55). Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-56.01 · Comm · COM-56 Démarrage

- **Texte** : « Avez-vous déjà ouvert des comptes, même sans les utiliser ? »
- **Réponses** : cases · Instagram / Facebook / LinkedIn / TikTok / YouTube / Pinterest / Aucun
- **Posée** : essentiel ; tous les profils ; si D21 · si vous ne publiez pas encore
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Comptes déjà ouverts (thème Contexte, lu par l'IA) : reprendre un compte existant ou en ouvrir un change le plan de démarrage.
- **Donnée ou règle manquante** : Écrire « Lue par l'IA » dans le classeur (colonne « Utilisée dans » vide).

#### COM-56.02 · Comm · COM-56 Démarrage

- **Texte** : « Qu'est-ce qui vous a empêché de publier jusqu'ici ? »
- **Réponses** : cases · Le manque de temps / Le manque d'idées / Ne pas savoir quoi montrer / Ne pas aimer se montrer / Ne pas savoir s'y prendre / Douter que cela amène des clients / Rien de particulier
- **Posée** : essentiel ; tous les profils ; si D21 · si vous ne publiez pas encore
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Ce qui a empêché de publier (thème Contexte) : manque de temps, d'idées, peur de se montrer ou doute sur l'effet appellent des plans de démarrage différents. Libellé « Rien de particulier » à valider (section 15).
- **Donnée ou règle manquante** : Écrire « Lue par l'IA » dans le classeur.

#### COM-56.03 · Comm · COM-56 Démarrage

- **Texte** : « Qui s'occuperait de vos publications ? »
- **Réponses** : choix · Vous / Un salarié / Un prestataire / Pas encore décidé
- **Posée** : essentiel ; tous les profils ; si D21 · si vous ne publiez pas encore
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Justifiée)
- **Justification** : Qui s'occuperait des publications (thème Contexte) : le plan diffère si c'est le dirigeant ou un prestataire.
- **Donnée ou règle manquante** : Écrire « Lue par l'IA » dans le classeur.

#### COM-56.04 · Comm · COM-56 Démarrage

- **Texte** : « Combien pourriez-vous dépenser par mois pour lancer votre communication ? »
- **Réponses** : nombre · euros
- **Posée** : essentiel ; tous les profils ; si D21 · si vous ne publiez pas encore
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Budget mensuel pour lancer la communication (thème Contexte) : borne ce que le plan peut proposer.
- **Conseil générique à risque** : Un coût de prestataire avancé par l'IA : aucun coût n'est sourcé, le plan doit rester dans le budget donné sans chiffrer ce qu'il ne connaît pas.
- **Donnée ou règle manquante** : Écrire « Lue par l'IA » dans le classeur.

#### COM-57.01 · Comm · COM-57 Brief de création

- **Texte** : « Comment décririez-vous votre client idéal, en deux ou trois phrases ? »
- **Réponses** : texte
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Hors audit : posée à la première création de contenu, fonction pas encore construite.
- **Justification** : Client idéal en deux ou trois phrases : oriente le contenu produit ; complète COM-02.01 (cible) par les mots du dirigeant.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.02 · Comm · COM-57 Brief de création

- **Texte** : « Dans vos contenus, tutoyez-vous ou vouvoyez-vous vos clients ? »
- **Réponses** : choix · Tutoiement / Vouvoiement / Selon le réseau
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Tutoiement ou vouvoiement : règle de rédaction des contenus produits.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.03 · Comm · COM-57 Brief de création

- **Texte** : « Quel ton voulez-vous donner à vos contenus ? »
- **Réponses** : cases · Chaleureux et proche / Expert et pédagogue / Direct et concret / Haut de gamme / Drôle et léger / Engagé pour une cause
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Ton voulu : règle de rédaction.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.04 · Comm · COM-57 Brief de création

- **Texte** : « Quels mots voulez-vous employer dans vos contenus, et lesquels voulez-vous éviter ? »
- **Réponses** : composite · À employer / À éviter
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Mots à employer et à éviter : règle de rédaction.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.05 · Comm · COM-57 Brief de création

- **Texte** : « Êtes-vous prêt à apparaître en photo ou en vidéo dans vos contenus ? »
- **Réponses** : choix · Oui, face caméra / En photo seulement / Non, je préfère montrer mon travail sans me montrer
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Apparaître ou non en photo ou vidéo : change les formats proposés.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.06 · Comm · COM-57 Brief de création

- **Texte** : « Avez-vous un logo et une charte graphique, et quelles sont vos couleurs ? »
- **Réponses** : composite · Logo / Charte graphique / Vos couleurs
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Logo, charte et couleurs : règle graphique des visuels.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.07 · Comm · COM-57 Brief de création

- **Texte** : « Quels contenus voulez-vous recevoir ? »
- **Réponses** : cases · Publications pour vos réseaux / Scripts de vidéos courtes / Visuels et carrousels / Articles pour votre site / Emails ou newsletter / Réponses à vos avis / Publications pour votre fiche Google
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Contenus voulus : ce que la création produit.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.08 · Comm · COM-57 Brief de création

- **Texte** : « Voulez-vous valider chaque contenu avant qu'il soit publié ? »
- **Réponses** : choix · Oui, chaque contenu / Je valide le calendrier du mois, le reste part tout seul / Non, publication automatique
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Validation avant publication : règle de fonctionnement de la création.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.10 · Comm · COM-57 Brief de création

- **Texte** : « Quelle offre voulez-vous mettre en avant en priorité dans vos contenus ? »
- **Réponses** : texte
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Offre à mettre en avant : sujet prioritaire des contenus.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.11 · Comm · COM-57 Brief de création

- **Texte** : « Quelles questions vos clients vous posent-ils le plus souvent ? »
- **Réponses** : liste
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Questions fréquentes des clients : sujets de contenus.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.12 · Comm · COM-57 Brief de création

- **Texte** : « Quelles hésitations entendez-vous le plus souvent avant qu'un client se décide ? »
- **Réponses** : liste
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Hésitations avant achat : sujets de contenus qui lèvent les objections.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.13 · Comm · COM-57 Brief de création

- **Texte** : « Quelles dates comptent pour votre activité dans l'année ? »
- **Réponses** : liste
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Dates qui comptent dans l'année : calendrier des contenus.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.14 · Comm · COM-57 Brief de création

- **Texte** : « Votre métier impose-t-il des règles pour communiquer, par exemple sur l'alcool, la santé, les prix ou les promotions ? »
- **Réponses** : texte
- **Posée** : essentiel ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Règles de communication imposées par le métier : garde-fou des contenus produits ; CAXE ne les établit pas lui-même (aucun conseil juridique).
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.15 · Comm · COM-57 Brief de création

- **Texte** : « Quels comptes ou quelles publications aimez-vous, dans votre métier ou ailleurs ? »
- **Réponses** : texte
- **Posée** : approfondi ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Comptes ou publications appréciés : références de style.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-57.16 · Comm · COM-57 Brief de création

- **Texte** : « Dans quelles langues voulez-vous publier ? »
- **Réponses** : cases · Français / Anglais / Espagnol / Allemand / Italien / Autre
- **Posée** : approfondi ; tous les profils ; si D30 · avant la première création de contenu
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Justification** : Hors audit. Langues de publication : règle de rédaction.
- **Donnée ou règle manquante** : Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-58.01 · Comm · COM-58 Funnel 0 · Le chemin prévu

- **Texte** : « Quand quelqu'un vous découvre sur les réseaux et veut aller plus loin, que doit-il faire ? »
- **Réponses** : composite · Action [Vous écrire en message privé / Vous appeler / Prendre rendez-vous ou réserver en ligne / Demander un devis / Acheter en ligne / Venir sur place / Laisser ses coordonnées contre une offre gratuite / Rien de prévu pour l'instant] / Lien ou numéro où l'envoyer
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; les calculs du funnel Comm sont dans la liste des calculs à écrire (CLAUDE.md, section 11).
- **Justification** : Ce que doit faire quelqu'un qui veut aller plus loin : « Rien de prévu pour l'instant » désigne l'étape manquante, action précise.
- **Donnée ou règle manquante** : Règle de notation Pratique ou calcul du funnel (COM-58.03, à écrire). Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-58.02 · Comm · COM-58 Funnel 0 · Le chemin prévu

- **Texte** : « Aujourd'hui, par quels moyens peut-on vous contacter, réserver ou acheter en ligne ? »
- **Réponses** : cases · Formulaire sur votre site / Prise de rendez-vous ou réservation en ligne / Demande de devis en ligne / Boutique en ligne / WhatsApp ou messages privés / Numéro qui s'appelle en un clic depuis votre profil ou votre site / Aucun de ces moyens
- **Posée** : essentiel ; tous les profils
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Moyens de contact, de réservation ou d'achat en ligne : « Aucun de ces moyens » est un frein direct entre l'audience et la demande.
- **Donnée ou règle manquante** : Même calcul du funnel à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-59.01 · Comm · COM-59 Funnel 3 · Visiter le profil

- **Texte** : « En moyenne sur les 3 derniers mois, combien de personnes visitent votre profil par mois sur chaque réseau ? »
- **Réponses** : tableau · Visites du profil par mois · lignes : (declencheur D22)
- **Posée** : essentiel ; tous les profils ; si D22 · une ligne par réseau utilisé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit (calculs du funnel à écrire).
- **Justification** : Visites du profil par réseau : l'étape entre la réaction et le clic ; sépare un contenu qui n'intéresse pas d'un profil qui ne convainc pas.
- **Donnée ou règle manquante** : Calcul du passage portée → visites du profil → clics à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-60.01 · Comm · COM-60 Funnel 5 · Arriver au bon endroit

- **Texte** : « Quand quelqu'un clique sur le lien de votre profil, sur quelle page arrive-t-il ? »
- **Réponses** : choix · Une page faite pour votre offre principale / La page d'accueil de votre site / Une page de prise de rendez-vous ou de réservation / Une page qui regroupe plusieurs liens / Votre boutique en ligne / Votre fiche Google / Il n'y a pas de lien sur mon profil
- **Posée** : essentiel ; tous les profils ; si D21 · si vous publiez déjà
- **Usage** : prévu aucun ; exécuté ouvre ou ferme 1 question.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; ouvre COM-60.02.
- **Justification** : Page d'arrivée du lien du profil : « Il n'y a pas de lien » ou la page d'accueil désignent une action précise (une page pour l'offre).
- **Donnée ou règle manquante** : Règle de notation Pratique à écrire.

#### COM-60.02 · Comm · COM-60 Funnel 5 · Arriver au bon endroit

- **Texte** : « Sur cette page, que voit-on tout de suite, sans faire défiler ? »
- **Réponses** : cases · Ce que vous proposez, en une phrase / Une preuve : note, avis ou photos de réalisations / Un seul bouton pour passer à l'action / Un formulaire court, 3 champs au plus / Un prix ou un prix de départ / Aucun de ces éléments
- **Posée** : essentiel ; tous les profils ; si D64 · si le profil mène vers une page
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Ce qu'on voit sans faire défiler sur cette page : désigne l'élément qui manque (offre en une phrase, preuve, bouton unique).
- **Donnée ou règle manquante** : Règle de notation Pratique à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

#### COM-61.01 · Comm · COM-61 Funnel 7 · Relancer les intéressés

- **Texte** : « Que faites-vous des personnes qui réagissent à vos publications ou vous écrivent, sans devenir clientes ? »
- **Réponses** : cases · Je leur écris en message privé / Je les ajoute à mon fichier de contacts / Je leur montre une publicité qui les cible / Je les relance plus tard avec une offre / Rien de particulier
- **Posée** : essentiel ; tous les profils ; si D21 · si vous publiez déjà
- **Usage** : prévu aucun ; exécuté ouvre ou ferme 1 question.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit ; ouvre COM-61.02.
- **Justification** : Ce qui est fait des personnes intéressées qui n'achètent pas : « Rien de particulier » désigne une étape manquante (relance), liée à l'objectif proposé « Relancer les personnes intéressées ».
- **Donnée ou règle manquante** : Calcul COM-61.03 à écrire (liste des calculs à écrire).

#### COM-61.02 · Comm · COM-61 Funnel 7 · Relancer les intéressés

- **Texte** : « En moyenne sur les 3 derniers mois, combien de ces personnes contactez-vous vous-même par mois, et combien deviennent clientes ? »
- **Réponses** : composite · Personnes contactées par mois / Devenues clientes par mois
- **Posée** : approfondi ; tous les profils ; si D65 · si vous leur écrivez en message privé
- **Usage** : prévu aucun ; exécuté aucun.
- **Recommandation** : Conserver (Utile, exploitation à développer)
- **Problème** : Aucun usage écrit.
- **Justification** : Personnes relancées et devenues clientes : mesure l'effet de la relance.
- **Donnée ou règle manquante** : Calcul COM-61.03 à écrire. Usage à écrire dans le classeur (colonne « Utilisée dans » vide).

</details>

<details><summary><strong>Cadrage</strong> : 1 question</summary>

#### D16 · Cadrage

- **Texte** : « Votre activité est-elle 100 % en ligne ? »
- **Réponses** : Oui · non
- **Posée** : tous les profils ; si posée : Inscription (métier)
- **Usage** : prévu Masque zone, fiche Google, jours fermés, boutique ; exécuté aucun.
- **Recommandation** : Conserver (Utilité à justifier)
- **Problème** : Non posée (vient du métier). L'effet annoncé (masquer zone, fiche Google, jours fermés, boutique) n'a aucune règle dans `regles-affichage.json` ; il est en pratique porté par les profils des questions (e-commerce).
- **Justification** : Activité 100 % en ligne : utile seulement si un métier hors profil e-commerce peut être entièrement en ligne.
- **Donnée ou règle manquante** : Confirmer que le profil e-commerce suffit, ou écrire la règle.

</details>
<!-- fin:liste -->

## 10. Limites

- **Lecture, pas exécution.** L'audit lit les données et le code ; il n'a rejoué aucun parcours. Les règles dites « exécutées »
  le sont dans le code et couvertes par les contrôles existants (dernière série complète : 27 et 28 octobre).
- **Usage prévu, pas encore réel.** Un usage prévu par le classeur n'est pas encore un usage réel : tant que les calculs ne sont
  pas écrits, une question « justifiée » par un croisement ne change encore rien au compte rendu.
- **Évaluations et propositions.** Les justifications sont celles de l'auditeur. Les textes proposés ne sont pas relus par le
  propriétaire.
- **Source utilisée.** La page HTML « Banque de questions », qui fait foi, n'a pas été relue : l'audit s'appuie sur sa conversion
  dans `data/banque/`.

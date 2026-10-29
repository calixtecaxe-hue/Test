# Résultats, rapport et plan d'action

Conception et état au 29 octobre 2026 (décisions du propriétaire du 29 octobre). Règles : `CLAUDE.md`, sections 4, 6 et 8 ;
fichiers et commandes : `docs/etat-technique.md`, section 7.

**Ce qui est réel et ce qui est simulé.** Les écrans, les calculs, la base, les contrôles du code et les routes sont construits et
vérifiés dans un navigateur. **Aucun appel réel à l'IA n'a été fait** : l'environnement n'a pas de clé d'API. Tous les rapports
montrés dans ce document et dans les captures sont produits par le **mode simulation** (texte de test sans IA, annoncé comme tel à
l'écran). Le code de l'appel réel est écrit et vérifié par le typage, pas exécuté. Section 6 : ce qu'il faut pour l'ouvrir.

## 1. Le parcours

Dans chaque agent : Objectif → (juste dessous) « Qu'avez-vous déjà essayé pour atteindre cet objectif ? » → Niveau et contexte →
Questionnaire → Résultats. L'étape Résultats a trois onglets, chacun avec son rôle :

| Onglet | Rôle | Ce qu'il ne fait jamais |
|---|---|---|
| Résultats | Les faits : écart à l'objectif, chiffres en jeu, évolutions, comparaison au marché quand elle existe, ce qui manque | Score, couleur, classement, conseil |
| Rapport | L'interprétation et la stratégie, rédigées par l'IA à partir du dossier préparé par le code | Recalculer ou inventer un chiffre, un repère, un seuil ou une règle |
| Plan d'action | Les actions concrètes, dans l'ordre, avec leur suivi | Promettre un gain, chiffrer un effet |

L'onglet ouvert est dans l'adresse (`?etape=4&onglet=resultats|rapport|plan`) : il se retrouve au rechargement.

### « Ce que vous avez déjà essayé »

Question légère, juste sous l'objectif, dans les quatre agents : une zone de texte (aide : « Vous pouvez préciser ce que vous avez
fait, ce que cela a donné et les difficultés rencontrées. »), ou la case « Je n'ai encore rien essayé. », et deux précisions
facultatives repliées (résultat, durée).

- Une question sans réponse n'est **jamais** lue comme « rien essayé » : trois états distincts (`sans_reponse`, `rien_essaye`,
  `essaye`) jusque dans le dossier de l'IA, et le contrôle du rapport refuse toute phrase qui dirait « rien essayé » quand la
  question est sans réponse.
- La réponse appartient à **un objectif précis**. Quand l'objectif change, l'ancienne réponse reste sur l'ancien objectif (historique)
  et elle est **proposée** sous le nouveau ; elle n'est copiée qu'à la demande du dirigeant, avec son origine. Aucune reprise
  silencieuse.
- Sauvegarde continue (texte à la pause ou en quittant le champ), reprise à l'actualisation, attente et renvoi seul sans réseau.

## 2. « Résultats » : ce qui se calcule aujourd'hui

Reprise des cinq points annoncés pour cet écran, avec ce qui est calculable aujourd'hui, la formule, ce qui manque et ce qui reste à
développer.

**1. L'objectif et l'écart.**
- Calculable : la **situation de départ** (la mesure qui suit l'objectif), la **cible** et l'**écart à combler**, quand ils se
  calculent sans hypothèse :
  - objectif proposé dont la phrase mesure exactement la même chose qu'une mesure (5 propositions : `com-audience`,
    `com-visites-profil`, `com-visites-site`, `com-temps` en % ou en nombre ; `rh-turnover` en % seulement). Un % donne
    départ × (1 ± %), un nombre donne départ ± nombre ;
  - objectif écrit librement : en % seulement, sur une mesure qui n'est pas un taux, quand le sens (hausse ou baisse) se lit dans
    les mots. Exemple : « augmenter mon chiffre d'affaires de 10 % », avec un chiffre d'affaires de 240 000 € sur 12 mois, donne une
    cible de 264 000 € et un écart de +24 000 €.
- Non calculable, et l'écran dit pourquoi :
  - un montant ou un nombre sans période (« +20 000 € » : par mois ou sur l'année ?) ;
  - un % sur un taux (« +5 % » d'un taux : 5 points, ou 5 % de ce taux ?) ;
  - un objectif sans chiffre (RH, Comm) : aucun pourcentage fabriqué, la réussite décrite par le dirigeant est montrée ;
  - un objectif qu'aucune question ne mesure, ou une mesure sans réponse.
- Avancement : « Aucun point d'étape pour l'instant » ; il se calculera sur ce que le dirigeant déclare.
- À développer : le **réalisme** de l'objectif (il demande des repères de marché et des règles non écrits).

**2. Les chiffres en jeu.**
- Calculable : les mesures du dirigeant de la liste ci-dessous, avec unité, mois exacts, « estimé » pour une fourchette, et les
  questions d'où elles viennent. Celles des thèmes de l'objectif sont montrées d'abord.
- Une mesure n'est montrée que si toutes ses questions obligatoires sont posées au compte. Une mesure sans réponse est listée
  dans « Ce qui manque », jamais à zéro.
- Non calculables aujourd'hui :
  - les **montants en jeu** des croisements (formules en texte libre dans le classeur) ;
  - le **classement des leviers** par effet sur l'objectif (étage 2 du moteur) ;
  - le coût d'une demande : le classeur divise un budget d'aujourd'hui par des demandes des 3 derniers mois (deux périodes), écarté.

**3. Les évolutions.**
- Calculable : les 16 évolutions de `data/evolutions.json`, quand les deux périodes ont leurs réponses, données le même mois, et
  que le périmètre n'a pas changé. Sinon, la raison est dite.

**4. Le marché.**
- Calculable seulement avec un repère **vérifié par le code et enregistré** pour le même indicateur (recherche du 15 octobre),
  affiché à côté de la valeur du dirigeant pour cet indicateur, avec sa source et sa confiance.
- **Aucune recherche réelle n'a été lancée** : aujourd'hui, l'écran dit pour tous les comptes que la comparaison n'est pas
  disponible.

**5. Ce qui manque.**
- Les mesures non calculables et leur raison.
- La couverture par thème : au moins la moitié des réponses, ou à compléter (règle des 50 %).
- Ce qui n'est calculé pour aucun métier.

Le contrôle des données refuse une mesure qui lit une donnée hors de sa propre donnée et des entrées de sa formule dans le classeur,
une colonne ou un champ inconnu, des mois qui ne s'accordent pas, et un objectif proposé suivi par deux mesures.

<!-- MESURES -->
33 mesures, écrites à la main dans `data/mesures.json`. « Formule du classeur » : la donnée calculée dont la mesure applique la formule ; sinon, la mesure lit directement la réponse.

| Agent(s) | Mesure | Unité | Calcul | Questions lues | Formule du classeur | Objectifs proposés suivis | Rattache un objectif écrit avec |
|---|---|---|---|---|---|---|---|
| Acquisition, Finance | Chiffre d'affaires des 12 derniers mois | € | somme de 12 mois | ACQ-23.01 | — | — | chiffre + affaires ; ca |
| Acquisition, Finance | Chiffre d'affaires du dernier mois complet | € | le mois dernier | ACQ-23.01 | — | — | — |
| Acquisition | Montant moyen d'une vente sur 12 mois | € | rapport de deux chiffres | ACQ-23.01, ACQ-23.04 | ACQ-23.09 : CA du mois ÷ ventes du mois | — | panier + moyen ; montant + moyen ; ticket + moyen |
| Acquisition | Demandes reçues par mois | nombre | réponse | ACQ-02.01 | — | — | demandes |
| Acquisition | Nouveaux clients par mois | nombre | réponse | ACQ-11.01 | — | — | nouveaux + clients |
| Acquisition | Part des demandes qui deviennent clientes | % | taux (a ÷ b × 100) | ACQ-11.01, ACQ-02.01 | ACQ-11.19 : Nouveaux clients ÷ demandes reçues | — | transformation ; conversion |
| Acquisition | Devis envoyés par mois | nombre | réponse (nombre par mois) | ACQ-10.01 | — | — | devis + envoyes |
| Acquisition | Devis acceptés par mois | nombre | réponse (nombre par mois) | ACQ-10.03 | — | — | devis + acceptes ; devis + signes |
| Acquisition | Part des devis acceptés | % | taux (a ÷ b × 100) | ACQ-10.03, ACQ-10.01 | ACQ-10.13 : Devis acceptés ÷ devis envoyés | — | taux + devis ; acceptation ; signature |
| Acquisition | Revenu des abonnements et contrats, par mois | € | réponse (total paye par mois) | ACQ-17.10 | — | — | recurrent |
| Acquisition | Budget marketing par mois | € | somme de 4 montants | ACQ-03.05, ACQ-07.01, ACQ-07.03, ACQ-07.04 | ACQ-07.06 : Dépenses par canal + agence + contenu + outils. Les commissions, proportionnelles aux vent | — | budget + marketing |
| Acquisition, Comm | Visites de votre site par mois | nombre | réponse | ACQ-06.07 | — | com-visites-site (pourcent, unites) | visites + site |
| Acquisition, Comm | Avis sur votre fiche Google | nombre | réponse (avis au total) | ACQ-06.01 | — | — | avis |
| Acquisition, Comm | Note de votre fiche Google | nombre | réponse (note sur 5) | ACQ-06.01 | — | — | note |
| Comm | Abonnés sur vos réseaux | nombre | somme d'une colonne | COM-17.01 | — | com-audience (pourcent, unites) | abonnes |
| Comm | Personnes touchées par vos publications, par mois | nombre | somme d'une colonne | COM-17.01 | — | — | portee ; personnes + touchees |
| Comm | Visites de vos profils par mois | nombre | somme d'une colonne | COM-59.01 | — | com-visites-profil (pourcent, unites) | visites + profil |
| Comm | Clics depuis vos publications, par mois | nombre | somme d'une colonne | COM-19.01 | — | — | clics |
| Comm | Messages privés reçus par mois | nombre | somme d'une colonne (lignes renseignées) | COM-23.01 | — | — | messages |
| Comm | Demandes commerciales reçues en message, par mois | nombre | somme d'une colonne (lignes renseignées) | COM-23.01 | — | — | — |
| Comm | Heures de communication par semaine | heures | somme d'une colonne (lignes renseignées) | COM-31.01 | — | com-temps (pourcent, unites) | temps + communication ; heures + communication |
| Comm | Contacts dans votre fichier | nombre | somme d'une colonne (lignes renseignées) | COM-15.01 | — | — | fichier ; contacts |
| Comm | Budget marketing et communication par mois | € | somme de 4 montants | ACQ-07.01, ACQ-07.03, ACQ-07.04, COM-32.02 | COM-32.04 : Postes partagés + autres postes | — | budget |
| Finance | Taux de marge sur coûts variables, sur 3 mois | % | taux de marge | FIN-14.01, FIN-06.01, FIN-08.01, FIN-08.02 | FIN-04.03 : Taux de marge des 3 derniers mois (CA de FIN-14.01, charges variables FIN-06.05) − taux de | — | marge |
| Finance | Charges fixes par mois | € | somme de 4 montants | FIN-05.01, FIN-09.01, FIN-07.01, FIN-05.02 | FIN-05.08 : Postes du tableau + abonnements et contrats + masse salariale + budget marketing et commun | — | charges + fixes |
| Finance | Masse salariale par mois, charges patronales comprises | € | réponse | FIN-07.01 | — | — | masse + salariale ; salaires |
| Finance | Trésorerie disponible | € | réponse | FIN-11.01 | — | — | tresorerie |
| Finance | Valeur du stock, au prix d'achat | € | réponse | FIN-37.01 | — | — | stock |
| Finance | Factures abandonnées faute de paiement, sur 12 mois | € | réponse (montant) | FIN-18.05 | — | — | impayes |
| RH | Départs de salariés sur 12 mois | nombre | somme d'une colonne (lignes renseignées) | RH-32.01 | — | rh-turnover (pourcent) | departs ; turnover |
| RH | Jours d'absence de l'équipe sur 12 mois, hors congés | jours | réponse | RH-34.01 | — | — | absences ; absenteisme |
| Acquisition, Finance, RH, Comm | Vos heures de travail par semaine | heures | réponse (heures) | RH-05.01 | — | — | — |
| Acquisition, Finance, RH, Comm | Vos jours de travail par semaine | jours | réponse (jours) | RH-05.01 | — | — | — |

16 évolutions (`data/evolutions.json`) :

| Évolution | Agent(s) | Écart | Unité |
|---|---|---|---|
| Demandes reçues, en moyenne par mois | Acquisition | 6 mois | nombre |
| Demandes reçues, en moyenne par mois | Acquisition | 12 mois | nombre |
| Nouveaux clients, en moyenne par mois | Acquisition | 12 mois | nombre |
| Chiffre d'affaires sur 12 mois | Acquisition, Finance | 12 mois | € |
| Chiffre d'affaires du dernier mois complet | Acquisition, Finance | 12 mois | € |
| Montant moyen d'une vente sur 12 mois | Acquisition | 12 mois | € |
| Revenu des abonnements et contrats, par mois | Acquisition | 6 mois | € |
| Revenu des abonnements et contrats, par mois | Acquisition | 12 mois | € |
| Budget marketing par mois (publicité, plateformes, agence, contenu, outils) | Acquisition | 12 mois | € |
| Budget marketing et communication par mois | Comm | 12 mois | € |
| Visites du site, en moyenne par mois | Comm | 6 mois | nombre |
| Taux de marge sur coûts variables, sur 3 mois | Finance | 12 mois | points |
| Charges fixes par mois | Finance | 12 mois | € |
| Masse salariale par mois, charges patronales comprises | Finance | 12 mois | € |
| Valeur du stock, au prix d'achat | Finance | 12 mois | € |
| Factures abandonnées faute de paiement, sur 12 mois | Finance | 12 mois | € |

Non calculées (raison écrite dans `data/evolutions.json`) : COM-37.02 (La croissance de l'audience se lit réseau par réseau, avec la date d'ouverture de chaque compte (un compte de moins de 6 mois donne ses abonnés à l'ouverture) : ce calcul par réseau n'est pas encore construit.) ; ACQ-16.07 (Chiffre d'affaires de chacun des 5 plus gros clients comparé à l'année précédente : une comparaison par client, avec des clients nouveaux (0 l'année d'avant), que l'écran ne présente pas encore.) ; FIN-04.02 (Étape du calcul de FIN-04.03 (taux de marge des mêmes 3 mois, un an plus tôt) : calculée avec lui.)
<!-- /MESURES -->

## 3. « Rapport » : l'interprétation et la stratégie

**Le dossier** (`src/lib/rapport/dossier.ts`) est préparé par le code, à partir de ce que montre l'onglet Résultats. Chaque élément y
porte un identifiant que le rapport cite :

- **O** : l'objectif, avec départ, cible et écart ou leurs limites ;
- **F1…** : les faits chiffrés, déjà mis en forme (unité, mois, « estimé ») ;
- **E1…** : les évolutions ;
- **M1…** : les repères de marché ;
- **L1…** : les réponses libres ;
- **T** : ce que le dirigeant a déjà essayé ;
- **C1…** : les thèmes notés par le moteur (aucun aujourd'hui).

Il contient aussi :
- le profil : métier, modèles économiques, type de zone, effectif, ancienneté, agents souscrits, accès à l'agent Comm, profession
  réglementée, canaux autorisés ;
- ce qui manque, le bilan des données non suivies (règle du quart) et les actions des plans précédents avec leur état.

**Aucune donnée personnelle** : ni nom, ni e-mail, ni raison sociale, ni numéro de TVA, ni ville.

**Les consignes** (`src/lib/rapport/prompt.ts`) reprennent le prompt Acquisition du propriétaire (`docs/prompt-agent-acquisition.md`) et
les brouillons Finance, RH et Comm (Claude Docs), mis à jour :

- option A du 19 octobre : effet décrit en mots, aucun chiffre projeté ;
- périmètre Comm du 28 octobre ;
- ce que le dirigeant a déjà essayé, et le ton demandé : ne jamais dénigrer, dire ce qui a pu manquer d'après les réponses, puis ce
  qui change ;
- structure du 29 octobre.

Pour chaque point clé, le rapport donne :
- les **faits établis**, avec leurs références ;
- l'**interprétation**, présentée comme une lecture ;
- les **hypothèses à vérifier**, et comment les vérifier ;
- le **choix recommandé** et sa **justification**.

Les points sont regroupés : ce qui compte le plus, ce qui freine, ce qui fonctionne, les pistes à vérifier. Viennent ensuite ce que le
dirigeant a déjà essayé, les contradictions entre réponses, ce qui manque, les renvois vers les autres agents et le suivi des données.

**Règle appliquée tant que le moteur ne signale aucun levier** (seuils et règles de notation non écrits) : un point n'est un « frein »
que s'il est établi par les faits du dossier ou par ce que dit le dirigeant ; sinon, c'est une piste à vérifier. Le rapport ne force
jamais un diagnostic négatif. **Point à valider** (`CLAUDE.md`, section 15).

**Les contrôles du code** (`src/lib/rapport/garde-fous.ts`), avant tout affichage. Ils sont des filets, pas des garanties.

- **Chiffres** : tout montant, tout % et toute durée en heures, ainsi que tout nombre au-delà de 12, doit figurer dans le dossier.
  Dans les étapes d'une action, seules les durées de travail proposées sont libres ; un montant ou un % ne s'y invente jamais,
  même pour un budget.
- **Références** : chacune doit exister dans le dossier. Une action sans fait cité est refusée comme conseil générique, et un frein
  doit s'appuyer sur un fait.
- **Plan** :
  - l'intitulé commence par un verbe à l'infinitif, en 12 mots au plus ;
  - 1 à 6 actions, 2 à 4 étapes chacune ;
  - les échéances sont bornées et les dépendances suivent l'ordre du plan ;
  - au moins une action est à lancer maintenant, et une action « maintenant » ne dépend pas d'une action qui peut attendre.
- **Ce que le dirigeant a déjà essayé** :
  - pas de « rien essayé » déduit d'une absence de réponse ;
  - une partie « essais » seulement quand il a répondu ;
  - une action qui reprend un essai dit ce qui change.
- **Ton** : ni « ! », ni émoji, ni tutoiement, ni formule creuse, ni superlatif, ni code technique. Les mots du dirigeant cités
  entre guillemets ne sont pas contrôlés comme un texte rédigé.
- **Renvois** : jamais vers l'agent lui-même, ni vers l'agent Comm sans accès.
- **Professions réglementées** : une section qui touche la zone interdite est retirée. Le message fixe et son intertitre restent à
  écrire avec l'avocat ; la liste des termes est une première version à valider.

Un rapport refusé est redemandé une fois, avec la liste précise des défauts. Au-delà, la rédaction échoue avec un message clair et
« Relancer la rédaction » ; rien de non contrôlé n'est montré.

**Sécurité** : le dossier est passé comme donnée, entre balises, chevrons échappés ; les consignes disent que les textes du
dirigeant ne sont jamais des consignes. Les consignes ne contiennent aucune donnée d'un client (identiques pour tous les comptes d'un
agent, mises en cache).

## 4. « Plan d'action »

Chaque action donne :
- l'intitulé (un verbe), le résultat recherché et pourquoi elle est prioritaire ;
- 2 à 4 étapes, les moyens, les prérequis, les dépendances et le temps nécessaire ;
- l'échéance (une date pour les actions à lancer maintenant) et le point d'étape ;
- l'indicateur de suivi et l'effet attendu, en mots.

Le plan est groupé en « À lancer maintenant » et « Peut attendre ». Le dirigeant indique où il en est de chaque action (à faire, en
cours, faite, abandonnée) ; c'est enregistré tout de suite, repris à l'actualisation, et transmis au rapport suivant. **L'état des
actions est distinct de l'avancement de l'objectif**, qui se mesure à ce que le dirigeant déclare aux points d'étape.

## 5. États de l'écran

| État | Ce que voit le dirigeant |
|---|---|
| Pas encore rédigé | Ce que le rapport apporte, bouton « Rédiger mon rapport » (Plan : « Rédiger mon rapport et mon plan ») |
| Aucune donnée | « Répondez d'abord à quelques questions » ; le serveur refuse (409) : pas de conseil générique |
| En cours | « Rédaction en cours », barre animée (immobile si les animations sont réduites) ; la rédaction continue si la page est quittée ; l'ancien rapport n'est pas montré pendant ce temps |
| Échec | Message clair, « Relancer la rédaction » ; détail technique gardé en base seulement |
| Prêt | Le rapport (bandeau « Simulation » en mode simulation) ; « D'après : … » sous chaque fait |
| Périmé | « Vos réponses, votre objectif ou ce que vous avez déjà essayé ont changé depuis ce rapport » ; onglets « · à mettre à jour » ; « Mettre à jour le rapport ». Cocher une action ne périme pas le rapport |
| Nouvel objectif | Aucun rapport tant qu'il n'est pas rédigé pour lui |
| Indisponible | Production sans clé : « La rédaction des rapports n'est pas encore ouverte » |

Une rédaction restée « en cours » au-delà de 10 minutes (serveur arrêté) est présentée comme un échec et peut être relancée.

## 6. Configuration pour l'IA réelle

- **Clé** : `ANTHROPIC_API_KEY` dans l'environnement du serveur (jamais dans le dépôt). Avec elle, le mode est « ia ». `RAPPORT_MODE=ia`
  exige la clé ; `RAPPORT_MODE=simulation` force la simulation.
- **Modèle et paramètres** : `data/rapport.json` ; le modèle est `claude-opus-5-5`.
  - Appel : effort `high`, réflexion adaptative, 32 000 jetons de sortie au plus, en flux.
  - Sortie : au format du schéma du rapport (`src/lib/rapport/schema.ts`).
  - Consignes : mises en cache.
  - Repli côté serveur : `fallbacks: "default"`, bêta `server-side-fallback-2026-07-01`. Si les filtres de sécurité refusent la
    demande, l'API la reprend sur un autre modèle.
  - Essais : 2 au plus, durée maximale de 10 minutes.
- **Coût** : non mesuré, faute d'appel réel. Ordre de grandeur estimé d'après la taille des textes :
  - consignes d'environ 14 000 caractères et dossier d'exemple d'environ 8 000 caractères, soit 6 000 à 8 000 jetons en entrée ;
  - sortie et réflexion de 10 000 à 20 000 jetons ;
  - soit environ 0,25 à 0,45 $ par essai au tarif de `claude-opus-5-5`, et jusqu'à deux essais.
  - À mesurer sur les premiers essais réels.
- **Données transmises à Anthropic** : le dossier (chiffres et textes libres de l'entreprise, sans identité). La politique de
  confidentialité, rédigée par le propriétaire, doit le mentionner (`CLAUDE.md`, section 10).
- **Premiers essais à faire avec la clé**, avant l'ouverture :
  - un compte par agent ;
  - les cas « objectif proposé », « personnel avec et sans chiffre », « rien essayé », « essayé sans résultat », « sans réponse » ;
  - des données partielles et contradictoires ;
  - une profession réglementée ;
  - lire chaque rapport et relever les refus des contrôles (`Rapport.journal`).

## 7. Ce qui reste à définir ou à brancher

| Sujet | État | Qui |
|---|---|---|
| Appel réel à l'IA | Code écrit, jamais exécuté (pas de clé) | Clé à fournir, essais à juger |
| Règle « frein établi par les faits » tant que le moteur ne signale rien | Appliquée, à valider | Propriétaire |
| Consignes de l'IA (`prompt.ts`) | Écrites d'après les documents du propriétaire, à relire | Propriétaire |
| Message fixe et intertitre des professions réglementées ; liste des termes interdits | Vides ; première liste à valider | Propriétaire et avocat |
| Verdict RH (Oui, Sous conditions, Pas en l'état) | Règle non écrite : jamais formulé | Propriétaire |
| Classement des leviers, impacts chiffrés, réalisme | Seuils et règles non écrits | Propriétaire |
| Montants en jeu des croisements | Formules en texte libre | Propriétaire (classeur) |
| Repères de marché | Aucune recherche lancée | Clé, budget |
| Points d'étape, avancement déclaré | Non construits | — |
| Propositions de contenu de l'agent Comm (bouton « Voir des propositions de contenu ») | Non construites ; format à valider | Propriétaire |
| Mesures et objectifs suivis (`data/mesures.json`) | Écrits d'après le classeur et les phrases des objectifs | À relire |
| Maquette du compte rendu (`?exemple=1`) | Garde la présentation du 22 octobre | À mettre à jour ou retirer |
| Coût par rapport | Estimé, non mesuré | Premiers essais |

## 8. Tests et résultats

Exécutés le 29 octobre 2026, base de test et comptes fictifs.

- **Tests unitaires** : 412 au total (`npm test`), tous réussis, dont :
  - `tests/resultats.test.mts` (9) : mesures, rattachement, départ, cible et écart, cas sans cible, RH et Comm, marché ;
  - `tests/rapport.test.mts` (12) : dossier, empreinte, consignes, contrôles, nouvel essai, échec, refus, réponse coupée ou mal
    formée, mode, simulation ;
  - `tests/tentatives.test.mts` (5).
- **Navigateur** :
  - `scripts/verification/tentatives.mjs` : 26 contrôles, 26 conformes ;
  - `scripts/verification/rapport.mjs` : 29 contrôles, 29 conformes. Il couvre :
    - les objectifs proposé, libre et personnel sans chiffre ;
    - « déjà essayé » sans réponse, rempli puis modifié ;
    - le changement d'objectif ;
    - les données complètes, partielles et absentes ;
    - l'absence de repère de marché ;
    - les réponses modifiées après la rédaction ;
    - l'échec provoqué et la relance, la page quittée pendant la rédaction ;
    - le téléphone 360 px, le clavier et les droits.
- **Données contradictoires** : la consigne et le format existent (partie « contradictions »), et les tests unitaires vérifient
  qu'une contradiction citée passe les contrôles. Leur repérage dépend de l'IA : **non vérifié sans appel réel**.
- La série complète (`scripts/verification/tout.sh`) intègre ces deux contrôles ; résultats dans `docs/verification/resultats/synthese.txt`.

## 9. Exemple complet

Profil fictif identifié, de l'objectif au plan, avec captures réelles (ordinateur et téléphone), dossier transmis et rapport obtenu
(simulation) : `docs/rapport/exemple-complet.md`.

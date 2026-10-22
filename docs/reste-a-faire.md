# CAXE — ce qui reste à mettre en place (22 octobre)

Hors partie juridique (CGV, cookies, confidentialité, RGPD, message fixe des professions réglementées, liste des termes
interdits) et hors nom de domaine. « Vous » = le propriétaire du produit ; « Claude » = le code et les fichiers de données.

Chiffres relevés dans les fichiers du dépôt : 181 thèmes (22 de nature Marché, 90 Pratique, 58 Cohérence, 11 Contexte),
157 croisements, 518 questions écrites (toutes avec leur type de réponse), 47 questions en attente, 36 indicateurs de
marché à comparer, 0 seuil écrit.

---

## 1. Logique du moteur

### 1.1 Notation des thèmes (le constat vert / orange / rouge)
- [ ] **Seuils de marché** : `data/seuils.json` est vide. 22 thèmes de nature Marché (36 indicateurs) attendent un chiffre sourcé.
  Voie 1 : vous les fournissez avec leur source. Voie 2 : Claude lance la recherche automatique (clé `ANTHROPIC_API_KEY` requise).
- [ ] **Règles des 90 thèmes Pratique** : à définir pour chacun, ce qui vaut « absente », « partielle », « en place » (réponses à combiner).
- [ ] **Règles des 58 thèmes Cohérence** : à définir pour chacun, quelles réponses doivent tenir ensemble et à partir de quand c'est incohérent.
- [ ] **Agrégation** : quand un thème porte plusieurs indicateurs notés, quelle note retenir.
- [ ] **Les 19 thèmes nouveaux** (FIN-46 à 48, RH-41 à 49, COM-55 à 61) : nature et impact proposés par le classeur, à valider.

### 1.2 Calcul des croisements (157)
- [ ] **Formules exécutables** : aujourd'hui en texte libre dans le classeur (43 Acquisition, 50 Finance, 31 RH, 33 Comm).
- [ ] **Calculs absents du classeur** : taux d'occupation (ACQ-11.38), prix moyen d'une unité vendue (ACQ-11.39), CA perdu par mois
  (ACQ-11.40), un croisement location en miroir de XA34, couverts par mois, nombres par canal, funnel Comm (COM-58.03, COM-61.03, COM-39.06).
- [ ] **13 scénarios Finance** : à rendre exécutables.
- [ ] **Hypothèses extérieures** : six croisements à « part récupérable prudente, à sourcer » (XA17, XA19, XA24, XA35, XC33, XR15).

### 1.3 Priorité et impact (étage 2)
- [ ] **Impact chiffré** par thème sur les volumes du client, sur la chaîne de calcul vers l'objectif.
- [ ] **Impact qualifié** (Bloquant / Frein / Secondaire) : « règles fixes » à écrire.
- [ ] **Deux leviers sur la même étape** : règle de partage des clients à préciser.
- [ ] **Seuil d'heures par jour travaillé** qui fait passer « dépendance au dirigeant » en Bloquant.
- [ ] **Recalcul de toute la chaîne** avec les leviers retenus, deux chiffres si la capacité plafonne.

### 1.4 Objectif et réalisme
- [ ] **Réalisme d'un objectif chiffré** calculé par le moteur (aujourd'hui « pas encore évalué »).
- [ ] **Libellés du verdict** (Réaliste / Réaliste sous conditions / Pas réaliste en l'état) à valider.
- [ ] **Objectifs RH et Comm** (`data/objectifs-agents.json`) : libellés, exemples et thèmes rattachés à relire.

### 1.5 Règles d'affichage
- [ ] Deux règles « à préciser » : « Vente immédiate (commerce) » et « Sans travaux en cours ».
- [ ] FIN-05.02 : mettre à jour le total si le détail change après coup.
- [ ] 10 lexiques par métier : à brancher au moteur.

---

## 2. Questions et classeur

### 2.1 Votre relecture des questions (les 4 agents)
- [ ] Reprise des 518 textes de la banque, agent par agent.
- [ ] Types de réponse : les 518 questions en ont un ; à revoir si une question change de format.
- [ ] Questions à plusieurs réponses ou tableaux : vérifier que les lignes et colonnes correspondent à ce que le calcul attend.

### 2.2 Cohérence classeur / banque
- [ ] 47 questions en attente : donnée absente du classeur (ACQ-24 à 30, SEO, SEA, ACQ-07.15, 11.38, 11.39, 13.12 à 13.14, COM-13.11).
- [ ] ACQ-22.08 : à supprimer du classeur (question fusionnée dans ACQ-22.07).
- [ ] Version Excel de la banque en retard sur la page HTML : à régénérer.
- [ ] Tranches qui se chevauchent (« 3 à 6 h » puis « 6 à 10 h »).

### 2.3 Couverture
- [ ] Catégorie Fabrication : questionnaire à créer (8 métiers).
- [ ] 16 métiers ou activités avec l'agent Comm « à trancher ».
- [ ] 13 métiers réglementés ajoutés : profil déduit à confirmer.
- [ ] Durée visée 1 h à 1 h 15 par agent : à mesurer sur des cas réels.

> Méthode : le classeur reste l'outil d'écriture. On corrige, on relance l'import, puis `npm run donnees:controle` montre ce que ça casse.

---

## 3. IA (rapport et plan)

### 3.1 Branchement
- [ ] Clé `ANTHROPIC_API_KEY` (vous la fournissez).
- [ ] Prompts des 4 agents : Acquisition à mettre à jour (règle « effet d'une action »), Finance / RH / Comm à finaliser puis brancher.

### 3.2 Contenu produit
- [ ] Réponse de l'agent à sa question (onglet Objectif).
- [ ] Lecture de chaque priorité (onglet Priorités).
- [ ] Plan d'action : actions classées selon le temps du dirigeant, actions qui libèrent du temps en premier, point d'étape de chacune.
- [ ] Tour « ce que vous avez déjà tenté » sur les 5 ou 6 axes faibles.
- [ ] Garde côté code : vérifier le texte produit, aucun chiffre non sourcé, aucun conseil juridique, fiscal, comptable, médical.

### 3.3 Effets d'actions
- [ ] Valider les six actions du catalogue (brouillon), puis lancer la recherche des taux, une fois par action et par métier.
- [ ] Liste complète des actions.
- [ ] Affichage du potentiel dans le rapport (« potentiel », jamais « promesse »).

### 3.4 Références de marché
- [ ] Position du client face au marché, avec gel à chaque audit.
- [ ] Mises à jour périodiques (tous les 3 mois par défaut).
- [ ] File de revue et suivi des recherches, suivi du budget (20 € par mois pour le pilote).

---

## 4. Suivi dans le temps

### 4.1 Dans l'ordre prévu
- [ ] Point d'étape à l'échéance propre de chaque action.
- [ ] Avancement déclaré vers l'objectif (aujourd'hui 0 %).
- [ ] Boucle d'ajustement : autre approche si l'action n'a pas marché.
- [ ] Alertes quand une action stagne.
- [ ] Ré-audit trimestriel.
- [ ] Classement sectoriel.
- [ ] Historique accumulé.
- [ ] Gamification discrète.

---

## 5. Parcours, compte et paiement

### 5.1 Compte
- [ ] Réinitialisation du mot de passe.
- [ ] Vérification de l'adresse e-mail.
- [ ] E-mails : rappel d'un dossier non terminé, reçu.

### 5.2 Abonnement
- [ ] Formule suggérée à l'inscription ; essai d'un agent non souscrit ; changement de formule en cours d'abonnement.
- [ ] Renvoi entre agents (aperçu de l'agent manquant, ajout en un clic).

### 5.3 Paiement
- [ ] Décision Managed Payments : Stripe gère la TVA, ou CAXE facture.
- [ ] Autoriser `checkout.stripe.com` et `js.stripe.com`, puis tester un paiement complet par carte.
- [ ] Secret du webhook, portail client, TVA estimée affichée (à confirmer), Stripe Tax.

### 5.4 Autres
- [ ] Page « Audit Express » (idée gardée).
- [ ] Connexion Meta pour l'agent Comm ; connexions comptabilité, caisse, réseaux ; mini-questionnaire anonyme RH aux salariés.

---

## 6. Mise en ligne et qualité

### 6.1 Production
- [ ] Hébergement, variables d'environnement, base de données, sauvegardes.
- [ ] Surveillance des erreurs et des coûts.

### 6.2 Validation
- [ ] Test sur 5 à 10 cas réels pour valider les seuils.
- [ ] Test sur mobile, accessibilité.

### 6.3 Contenu public
- [ ] Libellé de la démo d'accueil « En combien de mois » à harmoniser (page d'accueil protégée).

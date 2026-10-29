# Évaluations de l'audit d'utilité (28 octobre 2026)

Une évaluation par question, écrite à la main après lecture du texte, des réponses et de tout ce qui lit la question
(`docs/audit-utilite/usages.json`, produit par `node scripts/verification/utilite-extraire.mjs`). Le rapport et le tableau complet
sont régénérés par `node scripts/verification/utilite-rapport.mjs`, qui refuse une question de la banque sans évaluation.

Format : une ligne d'en-tête par question, puis des champs indentés.

    CODE | recommandation | catégorie[+catégorie]
      j: justification : ce qui change légitimement si la réponse change (diagnostic, priorité, recommandation, parcours)
      p: problème constaté
      g: conseil générique que la question risque de produire, et ce qui manque pour l'éviter
      prof: profils pour lesquels la question est pertinente (quand ils diffèrent des profils actuels)
      t: texte proposé (proposition, à valider)
      r: réponses proposées (proposition, à valider)
      c: condition proposée, à partir de réponses existantes
      f: doublon ou fusion
      m: donnée ou règle manquante (rien n'est inventé)
      d: arbitrage du propriétaire

Recommandations : conserver, preciser, conditionnelle, fusionner, retirer, remplacer.
Catégories : justifiee, exploitation (utile, exploitation à développer), conditions (utile sous conditions), formulation (mal
formulée), a_justifier (utilité à justifier), peu_utile.

Rien de ce qui est écrit ici ne modifie la banque : ce sont des propositions à arbitrer.

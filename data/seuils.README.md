# Seuils de notation

`seuils.json` est vide : aucun seuil de marché n'est écrit dans le classeur ni dans le
document de règles, et CAXE n'en invente pas. Tant qu'il est vide, tous les thèmes notés
sortent « règle manquante » du moteur.

Une entrée (voir `seuilDonnee` dans `src/lib/donnees/schemas.ts`) :

```json
{
  "theme": "ACQ-11",
  "donnee": "ACQ-11.01",
  "notation": { "type": "marche_haut", "moyenne": 0.0, "rougeSous": 0.0 },
  "source": "Référence sourcée (sinon null : le seuil est « à valider »)",
  "zones": ["URBAINE_DENSE"],
  "tailles": ["seul"]
}
```

Types de notation : `marche_haut` (vert au-dessus de la moyenne, orange à la moyenne),
`marche_bas`, `fourchette` (orange à moins d'un point), `pratique` (absente, partielle, en place).
Les valeurs ci-dessus sont des exemples de forme, pas des seuils.

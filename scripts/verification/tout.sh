#!/bin/bash
# Relance tous les contrôles de la vérification du questionnaire et range les résultats dans docs/verification/resultats.
#
# Prérequis : base Postgres démarrée, application construite (npx next build) et lancée sur le port 3100 :
#   AUTH_TRUST_HOST=true PAIEMENT_MODE=demonstration EMAIL_MODE=demonstration RAPPORT_MODE=simulation RESULTATS_MAQUETTE=1 npx next start -p 3100
# (le contrôle « rapport » lance en plus son propre serveur sur le port 3101.)
#
#   bash scripts/verification/tout.sh            # tout (environ deux heures, dont une pour controle-boutons)
#   bash scripts/verification/tout.sh rapide     # sans les contrôles navigateur longs (boutons, secteurs)
#   SAUTER="canaux dependances" bash scripts/verification/tout.sh   # reprise : ces contrôles gardent leur ligne de synthèse
#
# Chaque contrôle écrit son journal dans resultats/journaux/<nom>.log ; la synthèse (code de sortie et dernière ligne de chaque
# contrôle) est dans resultats/synthese.txt. Un code différent de 0 signale un écart ou un échec : lire le journal.
cd "$(dirname "$0")/../.." || exit 1
R=docs/verification/resultats
J=$R/journaux
mkdir -p "$J"
SYNTHESE=$R/synthese.txt
if [ -n "$SAUTER" ] && [ -f "$SYNTHESE" ]; then
  # Reprise : on garde les lignes des contrôles sautés, on rejoue les autres.
  grep -E "^($(echo $SAUTER | tr ' ' '|')) " "$SYNTHESE" > "$SYNTHESE.garde"
  { echo "Vérification du questionnaire : contrôles lancés le $(date -u +%Y-%m-%dT%H:%MZ) (reprise ; repris de l'exécution précédente : $SAUTER)"; cat "$SYNTHESE.garde"; } > "$SYNTHESE"
  rm -f "$SYNTHESE.garde"
else
  echo "Vérification du questionnaire : contrôles lancés le $(date -u +%Y-%m-%dT%H:%MZ)" > "$SYNTHESE"
fi

lancer() {
  local nom=$1; shift
  if [[ " $SAUTER " == *" $nom "* ]]; then echo "→ $nom (repris)"; return; fi
  echo "→ $nom"
  "$@" > "$J/$nom.log" 2>&1
  local code=$?
  # Dernière ligne utile du journal (sans les avertissements de Node).
  local fin
  fin=$(grep -v "MODULE_TYPELESS\|Reparsing as ES\|add \"type\": \"module\"\|trace-warnings\|^\s*$" "$J/$nom.log" | tail -1 | cut -c1-220)
  printf '%-28s code %s  %s\n' "$nom" "$code" "$fin" >> "$SYNTHESE"
}

# 1. Code et données
lancer typescript npx tsc --noEmit
lancer lint npm run -s lint
lancer tests-unitaires npm test
lancer controle-donnees npm run -s donnees:controle
lancer balayage-secteurs node scripts/balayage-secteurs.mts
lancer inventaire node scripts/verification/inventaire.mts
lancer plan-dependances node scripts/verification/plan-dependances.mts
lancer plan-branches node scripts/verification/plan-branches.mts

# 2. Navigateur : questionnaire et dépendances
lancer canaux node scripts/verification/canaux.mjs --sortie $R
lancer dependances node scripts/verification/dependances.mjs --sortie $R
lancer branches node scripts/verification/branches.mjs --sortie $R
lancer resultats node scripts/verification/resultats.mjs --sortie $R
lancer separation node scripts/verification/separation.mjs --sortie $R
lancer retours node scripts/verification/retours.mjs --sortie $R
lancer rapides node scripts/verification/rapides.mjs --sortie $R
lancer historique node scripts/verification/historique.mjs --sortie $R
lancer objectifs node scripts/verification/objectifs.mjs --sortie $R
lancer listes node scripts/verification/listes.mjs --sortie $R
lancer partages node scripts/verification/partages.mjs --sortie $R
lancer tentatives node scripts/verification/tentatives.mjs --sortie $R
lancer rapport node scripts/verification/rapport.mjs --sortie $R
lancer prereponse node scripts/controle-prereponse.mjs
lancer autre node scripts/controle-autre.mjs
lancer compte node scripts/controle-compte.mjs
lancer audit-client node scripts/audit-client.mjs --sortie $R/audit-client
lancer boutons-pages node scripts/controle-boutons-pages.mjs
lancer complementaire node scripts/controle-complementaire.mjs --sortie $R/complementaire
lancer captures node scripts/verification/captures.mjs

if [ "$1" != "rapide" ]; then
  lancer parcours-secteurs node scripts/controle-parcours-secteurs.mjs --sortie $R/parcours-secteurs
  lancer boutons-acq node scripts/controle-boutons.mjs --agents ACQ
  lancer boutons-fin node scripts/controle-boutons.mjs --agents FIN
  lancer boutons-rh node scripts/controle-boutons.mjs --agents RH
  lancer boutons-com node scripts/controle-boutons.mjs --agents COM
fi
node scripts/verification/chiffres.mjs > "$J/chiffres.log" 2>&1
echo "fin $(date -u +%H:%MZ)" >> "$SYNTHESE"
cat "$SYNTHESE"

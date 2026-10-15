-- Inscription progressive : activités multiples (sous-variantes), catégorie et
-- profils d'entreprise issus du routage (data/routage.json).

-- AlterTable : colonnes ajoutées, la catégorie d'abord facultative le temps du rattrapage.
ALTER TABLE "User" ADD COLUMN "categorie" TEXT,
ADD COLUMN "profils" TEXT[],
ADD COLUMN "sousVariantes" TEXT[];

-- Rattrapage des comptes existants : seule l'agence immobilière était proposée.
-- Gestion locative, syndic et conciergerie saisonnière relèvent du profil
-- Abonnement ; la transaction (et l'absence de précision) du profil B2B / cycle long.
UPDATE "User"
SET "sousVariantes" = CASE WHEN "sousVariante" IS NULL THEN ARRAY[]::TEXT[] ELSE ARRAY["sousVariante"] END,
    "categorie" = 'transaction-cycle-long',
    "profils" = CASE
      WHEN "sousVariante" IN ('gestion-locative', 'syndic', 'conciergerie-saisonniere') THEN ARRAY['abonnement']::TEXT[]
      ELSE ARRAY['b2b']::TEXT[]
    END
WHERE "metierPrecis" = 'agence-immobiliere';

-- Échoue volontairement s'il existait un compte d'un autre métier : le rattacher à la main.
ALTER TABLE "User" ALTER COLUMN "categorie" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "sousVariante";

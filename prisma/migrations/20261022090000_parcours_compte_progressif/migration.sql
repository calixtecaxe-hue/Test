-- Parcours du 21 octobre : le compte naît avec son e-mail et son mot de passe ; le métier et le dossier
-- d'entreprise se complètent ensuite. Les colonnes concernées deviennent facultatives.
ALTER TABLE "User" ALTER COLUMN "metierPrecis" DROP NOT NULL,
ALTER COLUMN "categorie" DROP NOT NULL,
ALTER COLUMN "profils" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "sousVariantes" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "chiffreAffairesMensuel" DROP NOT NULL,
ALTER COLUMN "nombreCollaborateurs" DROP NOT NULL,
ALTER COLUMN "dateCreationEntreprise" DROP NOT NULL,
ALTER COLUMN "typeZone" DROP NOT NULL,
ALTER COLUMN "ville" DROP NOT NULL;

-- Acceptation des conditions générales de vente, au paiement.
ALTER TABLE "User" ADD COLUMN "cgvAccepteesLe" TIMESTAMP(3);

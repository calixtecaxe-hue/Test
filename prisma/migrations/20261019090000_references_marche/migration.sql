-- CreateEnum
CREATE TYPE "NiveauReference" AS ENUM ('METIER', 'FAMILLE', 'NATIONAL');

-- CreateEnum
CREATE TYPE "StatutReference" AS ENUM ('ACTIF', 'A_REVOIR', 'VALIDE_FONDATEUR', 'REJETE', 'AUCUNE_REFERENCE');

-- CreateTable
CREATE TABLE "ReferenceMarche" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "indicateurId" TEXT NOT NULL,
    "niveau" "NiveauReference" NOT NULL,
    "metier" TEXT NOT NULL DEFAULT '',
    "famille" TEXT NOT NULL DEFAULT '',
    "sousVariante" TEXT NOT NULL DEFAULT '',
    "zone" TEXT NOT NULL DEFAULT 'toutes',
    "trancheTaille" TEXT NOT NULL DEFAULT 'toutes',
    "valeurCentrale" DOUBLE PRECISION,
    "borneBasse" DOUBLE PRECISION,
    "borneHaute" DOUBLE PRECISION,
    "statistique" TEXT,
    "unite" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "source" JSONB,
    "secondeSource" JSONB,
    "confiance" TEXT,
    "statut" "StatutReference" NOT NULL,
    "dateExpiration" DATE,
    "version" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT false,
    "nbUtilisations" INTEGER NOT NULL DEFAULT 0,
    "motif" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceMarche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RechercheReference" (
    "id" TEXT NOT NULL,
    "indicateurId" TEXT NOT NULL,
    "metier" TEXT NOT NULL,
    "debutLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finLe" TIMESTAMP(3),
    "etat" TEXT NOT NULL,
    "journal" JSONB,
    "referenceId" TEXT,
    "coutCentimes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RechercheReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferenceMarche_indicateurId_actif_idx" ON "ReferenceMarche"("indicateurId", "actif");

-- CreateIndex
CREATE INDEX "ReferenceMarche_statut_idx" ON "ReferenceMarche"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceMarche_indicateurId_niveau_metier_famille_sousVari_key" ON "ReferenceMarche"("indicateurId", "niveau", "metier", "famille", "sousVariante", "zone", "trancheTaille", "version");

-- CreateIndex
CREATE INDEX "RechercheReference_indicateurId_metier_etat_idx" ON "RechercheReference"("indicateurId", "metier", "etat");

-- CreateIndex
CREATE INDEX "RechercheReference_debutLe_idx" ON "RechercheReference"("debutLe");

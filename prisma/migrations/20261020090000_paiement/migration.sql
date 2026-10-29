-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('EN_ATTENTE_PAIEMENT', 'ACTIF', 'IMPAYE', 'RESILIE');

-- AlterTable
ALTER TABLE "Abonnement" ADD COLUMN     "activeLe" TIMESTAMP(3),
ADD COLUMN     "finPeriodeLe" TIMESTAMP(3),
ADD COLUMN     "fournisseur" TEXT,
ADD COLUMN     "statut" "StatutAbonnement" NOT NULL DEFAULT 'EN_ATTENTE_PAIEMENT',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "EvenementPaiement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementPaiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_stripeSubscriptionId_key" ON "Abonnement"("stripeSubscriptionId");


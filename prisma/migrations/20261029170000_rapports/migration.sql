-- Rapport et plan d'action rédigés par l'IA (29 octobre 2026), suivi des actions du plan. Ajout de tables seulement.
-- CreateEnum
CREATE TYPE "StatutRapport" AS ENUM ('EN_COURS', 'PRET', 'ECHEC');

-- CreateEnum
CREATE TYPE "StatutAction" AS ENUM ('A_FAIRE', 'EN_COURS', 'FAITE', 'ABANDONNEE');

-- CreateTable
CREATE TABLE "Rapport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agent" "AgentCode" NOT NULL,
    "objectifId" TEXT NOT NULL,
    "statut" "StatutRapport" NOT NULL DEFAULT 'EN_COURS',
    "empreinte" TEXT NOT NULL,
    "dossier" JSONB NOT NULL,
    "contenu" JSONB,
    "mode" TEXT NOT NULL,
    "modele" TEXT,
    "erreur" TEXT,
    "detailErreur" TEXT,
    "journal" JSONB,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termineLe" TIMESTAMP(3),

    CONSTRAINT "Rapport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
    "rapportId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "statut" "StatutAction" NOT NULL DEFAULT 'A_FAIRE',
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rapport_userId_agent_creeLe_idx" ON "Rapport"("userId", "agent", "creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "ActionPlan_rapportId_cle_key" ON "ActionPlan"("rapportId", "cle");

-- AddForeignKey
ALTER TABLE "Rapport" ADD CONSTRAINT "Rapport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rapport" ADD CONSTRAINT "Rapport_objectifId_fkey" FOREIGN KEY ("objectifId") REFERENCES "Objectif"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_rapportId_fkey" FOREIGN KEY ("rapportId") REFERENCES "Rapport"("id") ON DELETE CASCADE ON UPDATE CASCADE;


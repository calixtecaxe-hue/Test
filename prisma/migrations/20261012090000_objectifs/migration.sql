-- CreateEnum
CREATE TYPE "StatutObjectif" AS ENUM ('ACTIF', 'ATTEINT', 'ABANDONNE', 'REMPLACE');

-- CreateTable
CREATE TABLE "Objectif" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agent" "AgentCode" NOT NULL,
    "texteBrut" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "echeance" DATE NOT NULL,
    "statut" "StatutObjectif" NOT NULL DEFAULT 'ACTIF',
    "progression" DECIMAL(6,2),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clotureLe" TIMESTAMP(3),

    CONSTRAINT "Objectif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Objectif_userId_agent_creeLe_idx" ON "Objectif"("userId", "agent", "creeLe");

-- AddForeignKey
ALTER TABLE "Objectif" ADD CONSTRAINT "Objectif_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Un seul objectif actif par compte et par agent (index partiel, non exprimable
-- dans schema.prisma). Les objectifs remplacés restent en historique.
CREATE UNIQUE INDEX "Objectif_userId_agent_actif_key" ON "Objectif"("userId", "agent") WHERE "statut" = 'ACTIF';

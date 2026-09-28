-- CreateEnum
CREATE TYPE "TypeZone" AS ENUM ('URBAINE_DENSE', 'PERIURBAINE', 'RURALE');

-- CreateEnum
CREATE TYPE "AgentCode" AS ENUM ('ACQUISITION_CA', 'FINANCE_RENTABILITE', 'RH_ORGANISATION', 'COMM_CREATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metierPrecis" TEXT NOT NULL,
    "sousVariante" TEXT,
    "chiffreAffairesMensuel" DECIMAL(12,2) NOT NULL,
    "nombreCollaborateurs" INTEGER NOT NULL,
    "dateCreationEntreprise" TIMESTAMP(3) NOT NULL,
    "typeZone" "TypeZone" NOT NULL,
    "ville" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agent" "AgentCode" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "souscritLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_metierPrecis_idx" ON "User"("metierPrecis");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAccess_userId_agent_key" ON "AgentAccess"("userId", "agent");

-- AddForeignKey
ALTER TABLE "AgentAccess" ADD CONSTRAINT "AgentAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "NiveauAudit" AS ENUM ('ESSENTIEL', 'APPROFONDI');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "niveauAudit" "NiveauAudit";

-- CreateTable
CREATE TABLE "ReponseAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "reponse" JSONB NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReponseAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReponseAudit_userId_cle_key" ON "ReponseAudit"("userId", "cle");

-- AddForeignKey
ALTER TABLE "ReponseAudit" ADD CONSTRAINT "ReponseAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "motDePasseModifieLe" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ReinitialisationMotDePasse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseeLe" TIMESTAMP(3),
    "creeeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReinitialisationMotDePasse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReinitialisationMotDePasse_empreinte_key" ON "ReinitialisationMotDePasse"("empreinte");

-- CreateIndex
CREATE INDEX "ReinitialisationMotDePasse_userId_creeeLe_idx" ON "ReinitialisationMotDePasse"("userId", "creeeLe");

-- AddForeignKey
ALTER TABLE "ReinitialisationMotDePasse" ADD CONSTRAINT "ReinitialisationMotDePasse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

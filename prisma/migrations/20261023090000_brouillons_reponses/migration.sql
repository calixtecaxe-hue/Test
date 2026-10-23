-- CreateTable
CREATE TABLE "BrouillonReponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "saisie" JSONB NOT NULL,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrouillonReponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrouillonReponse_userId_cle_key" ON "BrouillonReponse"("userId", "cle");

-- AddForeignKey
ALTER TABLE "BrouillonReponse" ADD CONSTRAINT "BrouillonReponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

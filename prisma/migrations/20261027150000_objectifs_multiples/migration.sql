-- RH et Comm : plusieurs objectifs actifs à la fois (décision du propriétaire, 27 octobre). L'Acquisition et la Finance
-- gardent un seul objectif actif par compte, toujours garanti par la base (index partiel, non exprimable dans schema.prisma).
DROP INDEX "Objectif_userId_agent_actif_key";
CREATE UNIQUE INDEX "Objectif_userId_agent_actif_key" ON "Objectif"("userId", "agent") WHERE "statut" = 'ACTIF' AND "agent" IN ('ACQUISITION_CA', 'FINANCE_RENTABILITE');

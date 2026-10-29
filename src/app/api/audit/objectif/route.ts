import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENSEMBLE } from "@/lib/audit/donnees-audit";
import { agentsActifs } from "@/lib/audit/compte";
import { enregistrerObjectif } from "@/lib/audit/objectif";
import { controlerObjectifs } from "@/lib/audit/objectifs-agent";
import { codeAgent } from "@/lib/donnees/schemas";

// Un objectif : `objectif`, ou `objectifs` (un tableau, gardé pour l'écran des agents RH et Comm ; un seul objectif par
// agent depuis la décision du 28 octobre, option 1B, contrôlée par controlerObjectifs).
const corps = z.object({ agent: codeAgent, objectif: z.unknown().optional(), objectifs: z.array(z.unknown()).max(50).optional() });

// Enregistre l'objectif d'un agent : ce que le dirigeant veut changer, de combien (ou ce qu'il veut constater), en combien
// de temps. Le nouvel objectif remplace les objectifs actifs du même agent, qui restent en historique ; les objectifs des
// autres agents ne sont pas touchés. L'objectif garde son origine (proposition de la liste, objectif écrit par le
// dirigeant, ou trois champs libres) : c'est ce que reprennent le compte rendu et, quand elle sera branchée, l'analyse.
// Ce que le dirigeant avait déjà essayé reste attaché à l'objectif remplacé : il lui est proposé sous le nouvel objectif, jamais
// repris sans son accord (PUT /api/audit/tentatives avec reprisDe).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const { agent } = parsed.data;

  if (!(await agentsActifs(userId)).includes(agent)) {
    return NextResponse.json({ erreur: "Cet agent n'est pas inclus dans votre formule." }, { status: 403 });
  }

  const saisies = parsed.data.objectifs ?? (parsed.data.objectif !== undefined ? [parsed.data.objectif] : []);
  // Un objectif choisi dans la liste de l'agent doit exister pour cet agent ; un seul objectif par agent.
  const liste = ENSEMBLE.objectifsAgents.agents[agent]?.objectifs ?? null;
  const controle = controlerObjectifs(saisies, liste, ENSEMBLE.limitesObjectif.facteurAnnuelMax);
  if (!controle.ok) return NextResponse.json({ erreur: controle.erreur, champ: controle.champ, rang: controle.rang }, { status: 400 });

  const maintenant = new Date();
  const themes = ENSEMBLE.themes.filter((t) => t.agent === agent);
  const enregistres = controle.objectifs.map((o) => ({ phrase: o.phrase, objectif: enregistrerObjectif(o.saisie, themes, maintenant, o.choisi?.themes, o.origine) }));
  const crees = await prisma.$transaction(async (tx) => {
    await tx.objectif.updateMany({ where: { userId, agent, statut: "ACTIF" }, data: { statut: "REMPLACE", clotureLe: maintenant } });
    const ids: string[] = [];
    // Même instant de création, dans l'ordre choisi : l'ordre d'affichage suit l'identifiant.
    for (const e of enregistres) {
      const c = await tx.objectif.create({
        data: {
          userId,
          agent,
          texteBrut: e.phrase,
          structure: e.objectif as unknown as Prisma.InputJsonValue,
          echeance: new Date(e.objectif.echeance),
          creeLe: maintenant,
        },
        select: { id: true },
      });
      ids.push(c.id);
    }
    return ids;
  });
  return NextResponse.json({
    ok: true,
    id: crees[0],
    ids: crees,
    phrase: enregistres[0].phrase,
    indicateur: enregistres[0].objectif.indicateur,
    echeance: enregistres[0].objectif.echeance,
  });
}

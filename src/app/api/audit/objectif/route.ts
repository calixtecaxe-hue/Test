import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENSEMBLE } from "@/lib/audit/donnees-audit";
import { agentsActifs } from "@/lib/audit/compte";
import { enregistrerObjectif, objectifSaisieSchema, phraseObjectif, verifierVraisemblance } from "@/lib/audit/objectif";
import { codeAgent } from "@/lib/donnees/schemas";

const corps = z.object({ agent: codeAgent, objectif: z.unknown() });

// Enregistre l'objectif d'un agent : ce que le dirigeant veut changer, de combien, en
// combien de temps. Un nouvel objectif remplace l'objectif actif du même agent, qui
// reste en historique ; les objectifs des autres agents ne sont pas touchés.
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

  const saisie = objectifSaisieSchema.safeParse(parsed.data.objectif);
  if (!saisie.success) {
    const premier = saisie.error.issues[0];
    return NextResponse.json({ erreur: premier?.message ?? "Objectif invalide.", champ: premier?.path[0] }, { status: 400 });
  }

  // Un objectif choisi dans la liste de l'agent doit exister pour cet agent.
  const liste = ENSEMBLE.objectifsAgents.agents[agent]?.objectifs ?? [];
  const choisi = saisie.data.choix ? liste.find((o) => o.id === saisie.data.choix) : undefined;
  if (saisie.data.choix && !choisi) return NextResponse.json({ erreur: "Cet objectif n'est pas proposé pour cet agent.", champ: "choix" }, { status: 400 });

  const vraisemblance = verifierVraisemblance(saisie.data, ENSEMBLE.limitesObjectif.facteurAnnuelMax);
  if (!vraisemblance.ok) return NextResponse.json({ erreur: vraisemblance.message, champ: vraisemblance.champ }, { status: 400 });

  const maintenant = new Date();
  const objectif = enregistrerObjectif(saisie.data, ENSEMBLE.themes.filter((t) => t.agent === agent), maintenant, choisi?.themes);
  const cree = await prisma.$transaction(async (tx) => {
    await tx.objectif.updateMany({ where: { userId, agent, statut: "ACTIF" }, data: { statut: "REMPLACE", clotureLe: maintenant } });
    return tx.objectif.create({
      data: {
        userId,
        agent,
        texteBrut: phraseObjectif(saisie.data),
        structure: objectif as unknown as Prisma.InputJsonValue,
        echeance: new Date(objectif.echeance),
        creeLe: maintenant,
      },
      select: { id: true },
    });
  });
  return NextResponse.json({ ok: true, id: cree.id, phrase: phraseObjectif(saisie.data), indicateur: objectif.indicateur, echeance: objectif.echeance });
}

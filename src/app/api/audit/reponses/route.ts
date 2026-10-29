import { compteRoutable } from "@/lib/compte";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENSEMBLE } from "@/lib/audit/donnees-audit";
import { validerReponse } from "@/lib/audit/validation";
import { reponsesDuCompte } from "@/lib/audit/compte";
import { exclusionsAcquisition } from "@/lib/routage";
import { peutEcrireDonnee } from "@/lib/audit/acces-donnee";
import { prereponseDe } from "@/lib/audit/prereponse";
import { formulationDuCompte, reponsesActivesDuCompte } from "@/lib/audit/contexte-compte";

const corps = z.object({
  cle: z.string().min(1).max(40),
  // null : le dirigeant efface sa réponse.
  reponse: z.unknown(),
  // Chiffre proposé par CAXE d'après le détail déjà donné, enregistré tel quel à l'affichage.
  preremplie: z.boolean().optional(),
});

// Enregistre une réponse dès qu'elle est donnée (sauvegarde continue). Le code et la
// forme de la réponse sont revérifiés ici ; l'accès à l'agent de la donnée est un
// droit du compte, contrôlé à chaque appel.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const { cle, reponse } = parsed.data;

  if (reponse === null) {
    // Effacer une réponse efface aussi son brouillon éventuel.
    await prisma.$transaction([prisma.reponseAudit.deleteMany({ where: { userId, cle } }), prisma.brouillonReponse.deleteMany({ where: { userId, cle } })]);
    return NextResponse.json({ ok: true });
  }

  const compte = await prisma.user.findUnique({ where: { id: userId }, select: { categorie: true, metierPrecis: true, sousVariantes: true, profils: true, nombreCollaborateurs: true, dateCreationEntreprise: true } });
  const reponsesActuelles = await reponsesDuCompte(userId, compte ?? undefined);
  const verdict = validerReponse(ENSEMBLE, cle, reponse, reponsesActuelles, (compte && compteRoutable(compte)) ? exclusionsAcquisition(ENSEMBLE.routage, compteRoutable(compte)!) : null);
  if (!verdict.ok) return NextResponse.json({ erreur: verdict.message }, { status: 400 });
  if (!(await peutEcrireDonnee(userId, cle, verdict.agent ?? null, compte ? formulationDuCompte(compte) : null))) return NextResponse.json({ erreur: "Cet agent n'est pas inclus dans votre formule." }, { status: 403 });

  // « Préremplie » n'est accepté que si le chiffre envoyé est bien celui que le détail du compte donne : le serveur
  // le recalcule, il ne croit pas le navigateur.
  const propose = parsed.data.preremplie === true && compte ? prereponseDe(ENSEMBLE.prereponses, cle, reponsesActivesDuCompte(compte, reponsesActuelles)) : null;
  const rep = verdict.reponse as { genre?: string; valeur?: number };
  const preremplie = propose !== null && rep.genre === "exact" && rep.valeur === propose.total;

  // La réponse complète remplace le brouillon de ce tableau.
  await prisma.$transaction([
    prisma.reponseAudit.upsert({
      where: { userId_cle: { userId, cle } },
      update: { reponse: verdict.reponse as Prisma.InputJsonValue, preremplie },
      create: { userId, cle, reponse: verdict.reponse as Prisma.InputJsonValue, preremplie },
    }),
    prisma.brouillonReponse.deleteMany({ where: { userId, cle } }),
  ]);
  return NextResponse.json({ ok: true });
}

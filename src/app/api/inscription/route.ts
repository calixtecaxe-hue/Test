import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inscriptionSchema } from "@/lib/validation/inscription";
import { ROUTAGE } from "@/lib/routage-donnees";
import { METIER_ABSENT, router } from "@/lib/routage";
import { z } from "zod";
import { contrainteDuCompte, TOUS_LES_AGENTS, validerChoix } from "@/lib/abonnement";

// Formule choisie avant l'inscription : gardée jusqu'à la création du compte, puis vérifiée ici
// comme pour POST /api/abonnement (jamais fiée au navigateur).
const formuleSchema = z.object({ nombreAgents: z.coerce.number().int(), periode: z.string(), agents: z.array(z.string()).max(8) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = inscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erreur: "Formulaire invalide.", champs: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  // Le routage est recalculé ici, jamais lu dans la requête.
  const routage = router(ROUTAGE, data.metierPrecis, data.sousVariantes, { autre: data.autre, categorieAbsente: data.categorieAbsente });
  if (!routage.ok) {
    return NextResponse.json({ erreur: "Formulaire invalide.", champs: { [routage.erreur.champ]: [routage.erreur.message] } }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(data.motDePasse, 12);

  // Formule choisie avant l'inscription : enregistrée avec le compte si elle est valable pour ce métier.
  const formuleBrute = formuleSchema.safeParse((body as { formule?: unknown } | null)?.formule);
  const verdict = formuleBrute.success ? validerChoix(formuleBrute.data as Parameters<typeof validerChoix>[0], { agentsExclus: routage.routage.agentsExclus, nombreMaxAgents: routage.routage.nombreMaxAgents }) : null;
  const periode = formuleBrute.success && formuleBrute.data.periode === "annuel" ? "ANNUEL" : "MENSUEL";

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        metierPrecis: data.metierPrecis,
        sousVariantes: routage.routage.sousVariantes,
        categorie: routage.routage.categorie.id,
        profils: routage.routage.profils,
        autreActiviteTexte: data.autre ? data.autreTexte ?? null : null,
        metierAbsentTexte: data.metierPrecis === METIER_ABSENT ? data.metierAbsentTexte ?? null : null,
        vendProduits: routage.routage.stock === "a_demander" ? data.vendProduits ?? null : null,
        chiffreAffairesMensuel: new Prisma.Decimal(data.chiffreAffairesMensuel),
        nombreCollaborateurs: data.nombreCollaborateurs,
        dateCreationEntreprise: new Date(data.dateCreationEntreprise),
        typeZone: data.typeZone,
        ville: data.ville,
        ...(verdict?.ok && formuleBrute.success
          ? {
              abonnement: { create: { nombreAgents: formuleBrute.data.nombreAgents, periode } },
              agentAccess: { create: TOUS_LES_AGENTS.map((agent) => ({ agent, actif: verdict.agents.includes(agent) })) },
            }
          : {}),
      },
      select: { id: true, email: true },
    });

    const formule = !formuleBrute.success ? "aucune" : verdict?.ok ? "enregistree" : "non_appliquee";
    return NextResponse.json({ id: user.id, email: user.email, formule, ...(verdict && !verdict.ok ? { messageFormule: verdict.erreur.message } : {}) }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { erreur: "Un compte existe déjà avec cette adresse email." },
        { status: 409 }
      );
    }
    throw error;
  }
}

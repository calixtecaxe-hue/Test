import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inscriptionSchema } from "@/lib/validation/inscription";
import { ROUTAGE } from "@/lib/routage-donnees";
import { router } from "@/lib/routage";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = inscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erreur: "Formulaire invalide.", champs: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  // Le routage est recalculé ici, jamais lu dans la requête.
  const routage = router(ROUTAGE, data.metierPrecis, data.sousVariantes);
  if (!routage.ok) {
    return NextResponse.json({ erreur: "Formulaire invalide.", champs: { [routage.erreur.champ]: [routage.erreur.message] } }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(data.motDePasse, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        metierPrecis: data.metierPrecis,
        sousVariantes: routage.routage.sousVariantes,
        categorie: routage.routage.categorie.id,
        profils: routage.routage.profils,
        chiffreAffairesMensuel: new Prisma.Decimal(data.chiffreAffairesMensuel),
        nombreCollaborateurs: data.nombreCollaborateurs,
        dateCreationEntreprise: new Date(data.dateCreationEntreprise),
        typeZone: data.typeZone,
        ville: data.ville,
      },
      select: { id: true, email: true },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
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

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inscriptionSchema } from "@/lib/validation/inscription";

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
  const passwordHash = await bcrypt.hash(data.motDePasse, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        metierPrecis: data.metierPrecis,
        sousVariante: data.sousVariante ?? null,
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

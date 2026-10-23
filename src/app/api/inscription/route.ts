import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { schemaIdentifiants } from "@/lib/validation/inscription";

// Première étape du parcours : le compte naît avec son adresse e-mail et son mot de passe, rien d'autre.
// Le métier est demandé ensuite (PUT /api/compte/metier), avant le choix de la formule ; le dossier
// d'entreprise l'est après le paiement (PUT /api/compte/dossier).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schemaIdentifiants.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erreur: "Formulaire invalide.", champs: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.motDePasse, 12);
  try {
    const user = await prisma.user.create({ data: { email: parsed.data.email, passwordHash }, select: { id: true, email: true } });
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ erreur: "Un compte existe déjà avec cette adresse email.", champs: { email: ["Un compte existe déjà avec cette adresse email."] } }, { status: 409 });
    }
    throw error;
  }
}

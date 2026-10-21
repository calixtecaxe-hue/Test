import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aSonMetier } from "@/lib/compte";
import { abonnementOuvert } from "@/lib/paiement/abonnement-serveur";
import { schemaDossier } from "@/lib/validation/inscription";

// Dossier d'entreprise (chiffre d'affaires, effectif, ancienneté, zone, ville) : complété dans l'application,
// après le paiement. Il sert à choisir les questions, les mots et les seuils adaptés à l'entreprise.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const utilisateur = await prisma.user.findUnique({ where: { id: userId } });
  if (!utilisateur || !aSonMetier(utilisateur)) return NextResponse.json({ erreur: "Indiquez d'abord votre métier." }, { status: 409 });
  if (!(await abonnementOuvert(userId))) return NextResponse.json({ erreur: "Votre abonnement n'est pas en cours." }, { status: 403 });

  const parsed = schemaDossier.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erreur: "Formulaire invalide.", champs: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  await prisma.user.update({
    where: { id: userId },
    data: {
      chiffreAffairesMensuel: d.chiffreAffairesMensuel,
      nombreCollaborateurs: d.nombreCollaborateurs,
      dateCreationEntreprise: new Date(d.dateCreationEntreprise),
      typeZone: d.typeZone,
      ville: d.ville,
    },
  });
  return NextResponse.json({ ok: true });
}

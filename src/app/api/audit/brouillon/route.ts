import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENSEMBLE } from "@/lib/audit/donnees-audit";
import { specDeLaDonnee } from "@/lib/audit/validation";
import { peutEcrireDonnee } from "@/lib/audit/acces-donnee";

const corps = z.object({
  cle: z.string().min(1).max(40),
  // « ligne.colonne » → texte tapé. null ou vide : le brouillon est supprimé.
  saisie: z.record(z.string().max(100), z.string().max(200)).nullable(),
});

// Brouillon d'un tableau à total imposé (« 100 % ») : la saisie partielle suit le dirigeant d'un appareil à l'autre, mais elle
// n'est jamais une réponse : le calcul l'ignore. Elle est supprimée quand la réponse complète est enregistrée.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const parsed = corps.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const { cle, saisie } = parsed.data;

  const donnee = ENSEMBLE.donnees.find((d) => d.code === cle);
  const { spec } = specDeLaDonnee(ENSEMBLE, cle);
  if (!donnee || spec?.type !== "tableau" || !spec.total) return NextResponse.json({ erreur: "Cette question n'a pas de brouillon." }, { status: 400 });
  const agent = ENSEMBLE.themes.find((t) => t.code === donnee.theme)?.agent ?? null;
  if (!(await peutEcrireDonnee(userId, cle, agent))) return NextResponse.json({ erreur: "Cet agent n'est pas inclus dans votre formule." }, { status: 403 });

  const valeurs = saisie ? Object.entries(saisie).filter(([, v]) => v.trim() !== "") : [];
  if (valeurs.length === 0) {
    await prisma.brouillonReponse.deleteMany({ where: { userId, cle } });
    return NextResponse.json({ ok: true });
  }
  if (valeurs.length > 400) return NextResponse.json({ erreur: "Trop de valeurs." }, { status: 400 });
  const contenu = Object.fromEntries(valeurs) as Prisma.InputJsonValue;
  await prisma.brouillonReponse.upsert({
    where: { userId_cle: { userId, cle } },
    update: { saisie: contenu },
    create: { userId, cle, saisie: contenu },
  });
  return NextResponse.json({ ok: true });
}

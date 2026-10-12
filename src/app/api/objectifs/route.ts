import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aAccesAgent } from "@/lib/acces-agent";
import { CODES_AGENT, objectifRequeteSchema } from "@/lib/objectif/requete";
import { enregistrerObjectif } from "@/lib/objectif/service";

// Historique des objectifs du compte, du plus récent au plus ancien. Filtrable
// par agent : ?agent=ACQUISITION_CA.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  }
  const agent = new URL(request.url).searchParams.get("agent");
  if (agent && !(CODES_AGENT as readonly string[]).includes(agent)) {
    return NextResponse.json({ erreur: "Agent non reconnu." }, { status: 400 });
  }

  const objectifs = await prisma.objectif.findMany({
    where: {
      userId: session.user.id,
      ...(agent ? { agent: agent as (typeof CODES_AGENT)[number] } : {}),
    },
    orderBy: { creeLe: "desc" },
  });
  return NextResponse.json({ objectifs });
}

// Enregistre l'objectif d'un audit, après interprétation côté serveur.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  }

  const parsed = objectifRequeteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: parsed.error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 }
    );
  }

  const { agent, texte } = parsed.data;
  if (!(await aAccesAgent(session.user.id, agent))) {
    return NextResponse.json({ erreur: "Cet agent n'est pas inclus dans votre formule." }, { status: 403 });
  }

  const resultat = await enregistrerObjectif(session.user.id, agent, texte);
  if (!resultat.ok) {
    return NextResponse.json(resultat.interpretation, { status: 422 });
  }
  return NextResponse.json(
    { id: resultat.id, objectif: resultat.interpretation.objectif },
    { status: 201 }
  );
}

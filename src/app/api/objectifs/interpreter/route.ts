import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { aAccesAgent } from "@/lib/acces-agent";
import { interpreterObjectif } from "@/lib/objectif/interpreter";
import { objectifRequeteSchema } from "@/lib/objectif/requete";

// Lit l'objectif écrit par le dirigeant et rend ce qui a été compris, ou la
// précision à demander. Rien n'est enregistré ici.
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

  return NextResponse.json(interpreterObjectif(texte, agent));
}

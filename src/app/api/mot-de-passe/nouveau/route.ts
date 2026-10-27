import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { MESSAGE_LIEN, empreinteDe, etatDemande, jetonBienForme } from "@/lib/mot-de-passe/reinitialisation";
import { schemaMotDePasse } from "@/lib/validation/inscription";

// Nouveau mot de passe choisi depuis le lien reçu par e-mail. Le lien sert une fois : la demande est
// marquée utilisée dans la même transaction que le changement, et les autres demandes du compte sont
// annulées. La date du changement ferme les sessions ouvertes avant (src/auth.ts).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const jeton = body?.jeton;
  if (!jetonBienForme(jeton)) {
    return NextResponse.json({ erreur: MESSAGE_LIEN.inconnue, lien: "inconnue" }, { status: 400 });
  }
  const motDePasse = schemaMotDePasse.safeParse(body?.motDePasse);
  if (!motDePasse.success) {
    const message = motDePasse.error.issues[0]?.message ?? "Mot de passe invalide.";
    return NextResponse.json({ erreur: message, champs: { motDePasse: [message] } }, { status: 400 });
  }

  const maintenant = new Date();
  const demande = await prisma.reinitialisationMotDePasse.findUnique({ where: { empreinte: empreinteDe(jeton) }, include: { user: { select: { id: true, email: true } } } });
  const etat = etatDemande(demande, maintenant);
  if (etat !== "valide" || !demande) {
    return NextResponse.json({ erreur: MESSAGE_LIEN[etat === "valide" ? "inconnue" : etat], lien: etat }, { status: 410 });
  }

  const passwordHash = await bcrypt.hash(motDePasse.data, 12);
  const change = await prisma.$transaction(async (tx) => {
    // Condition dans la mise à jour elle-même : deux envois simultanés du même lien n'en font qu'un.
    const pris = await tx.reinitialisationMotDePasse.updateMany({ where: { id: demande.id, utiliseeLe: null, expireLe: { gt: maintenant } }, data: { utiliseeLe: maintenant } });
    if (pris.count !== 1) return false;
    await tx.reinitialisationMotDePasse.updateMany({ where: { userId: demande.userId, utiliseeLe: null }, data: { utiliseeLe: maintenant } });
    await tx.user.update({ where: { id: demande.userId }, data: { passwordHash, motDePasseModifieLe: maintenant } });
    return true;
  });
  if (!change) {
    return NextResponse.json({ erreur: MESSAGE_LIEN.utilisee, lien: "utilisee" }, { status: 410 });
  }
  return NextResponse.json({ email: demande.user.email });
}

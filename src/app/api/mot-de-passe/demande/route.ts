import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { envoyerCourriel } from "@/lib/email/envoi";
import { adresseSite } from "@/lib/adresse-site";
import { DUREE_VALIDITE_MS, MAX_DEMANDES_PAR_HEURE, courrielReinitialisation, nouveauJeton } from "@/lib/mot-de-passe/reinitialisation";
import { schemaEmail } from "@/lib/validation/inscription";

// « Mot de passe oublié » : le dirigeant donne son adresse, un lien lui est envoyé. La réponse est
// la même qu'un compte existe ou non (on ne révèle pas quelles adresses ont un compte), et l'e-mail
// part après la réponse, pour que sa durée ne le révèle pas non plus.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = schemaEmail.safeParse(body?.email);
  if (!email.success) {
    return NextResponse.json({ erreur: "Adresse email invalide.", champs: { email: ["Adresse email invalide."] } }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true, email: true } });
  if (user) {
    const depuis = new Date(Date.now() - 60 * 60 * 1000);
    const recentes = await prisma.reinitialisationMotDePasse.count({ where: { userId: user.id, creeeLe: { gt: depuis } } });
    if (recentes < MAX_DEMANDES_PAR_HEURE) {
      const { jeton, empreinte } = nouveauJeton();
      await prisma.reinitialisationMotDePasse.create({ data: { userId: user.id, empreinte, expireLe: new Date(Date.now() + DUREE_VALIDITE_MS) } });
      const lien = `${adresseSite()}/nouveau-mot-de-passe?jeton=${jeton}`;
      after(async () => {
        try {
          await envoyerCourriel({ a: user.email, ...courrielReinitialisation(lien) });
        } catch (erreur) {
          console.error("Envoi du lien de réinitialisation impossible :", erreur);
        }
      });
    }
  }
  return NextResponse.json({ ok: true });
}

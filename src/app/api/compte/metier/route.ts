import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROUTAGE } from "@/lib/routage-donnees";
import { METIER_ABSENT, router } from "@/lib/routage";
import { accesOuvert } from "@/lib/paiement/etat";
import { contrainteDuCompte, TOUS_LES_AGENTS, validerChoix } from "@/lib/abonnement";
import { metierSchema } from "@/lib/validation/inscription";

// Deuxième étape du parcours : le métier et les activités cochées, avant le choix de la formule. Le
// routage (catégorie, profils) est recalculé ici, jamais lu dans la requête. Une formule déjà choisie
// qui ne convient plus au nouveau métier (agent Comm pour une profession réglementée) est retirée :
// le dirigeant la refait à l'étape suivante.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  const userId = session.user.id;

  const parsed = metierSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erreur: "Formulaire invalide.", champs: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const data = parsed.data;
  const routage = router(ROUTAGE, data.metierPrecis, data.sousVariantes, { autre: data.autre, categorieAbsente: data.categorieAbsente });
  if (!routage.ok) {
    return NextResponse.json({ erreur: "Formulaire invalide.", champs: { [routage.erreur.champ]: [routage.erreur.message] } }, { status: 400 });
  }

  const existant = await prisma.abonnement.findUnique({ where: { userId }, select: { statut: true, finPeriodeLe: true, nombreAgents: true, periode: true } });
  if (existant && accesOuvert(existant, new Date())) {
    return NextResponse.json({ erreur: "Votre abonnement est en cours : le métier ne se change pas ici." }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      metierPrecis: data.metierPrecis,
      sousVariantes: routage.routage.sousVariantes,
      categorie: routage.routage.categorie.id,
      profils: routage.routage.profils,
      autreActiviteTexte: data.autre ? data.autreTexte ?? null : null,
      metierAbsentTexte: data.metierPrecis === METIER_ABSENT ? data.metierAbsentTexte ?? null : null,
      vendProduits: routage.routage.stock === "a_demander" ? data.vendProduits ?? null : null,
    },
  });

  // Formule déjà choisie : encore valable pour ce métier ? Sinon on la retire, le dirigeant la refait.
  let formule: "aucune" | "conservee" | "retiree" = "aucune";
  if (existant) {
    const acces = await prisma.agentAccess.findMany({ where: { userId, actif: true }, select: { agent: true } });
    const verdict = validerChoix(
      { nombreAgents: existant.nombreAgents, periode: existant.periode === "ANNUEL" ? "annuel" : "mensuel", agents: acces.map((a) => a.agent) },
      contrainteDuCompte(ROUTAGE, { metierPrecis: data.metierPrecis, categorie: routage.routage.categorie.id, sousVariantes: routage.routage.sousVariantes }),
    );
    if (verdict.ok) formule = "conservee";
    else {
      formule = "retiree";
      await prisma.$transaction([
        prisma.abonnement.delete({ where: { userId } }),
        ...TOUS_LES_AGENTS.map((agent) => prisma.agentAccess.updateMany({ where: { userId, agent }, data: { actif: false } })),
      ]);
    }
  }
  return NextResponse.json({ ok: true, formule });
}

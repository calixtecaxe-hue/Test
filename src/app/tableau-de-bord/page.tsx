import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMetier, getSousVariante } from "@/lib/metiers";
import { DeconnexionBouton } from "./deconnexion-bouton";

const libellesZone: Record<string, string> = {
  URBAINE_DENSE: "Urbaine dense",
  PERIURBAINE: "Périurbaine",
  RURALE: "Rurale",
};

function formaterAnciennete(dateCreation: Date): string {
  const jours = Math.floor(
    (Date.now() - dateCreation.getTime()) / (1000 * 60 * 60 * 24)
  );
  const annees = Math.floor(jours / 365.25);
  if (annees < 1) return "moins d'un an";
  return `${annees} an${annees > 1 ? "s" : ""}`;
}

export default async function TableauDeBord() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const utilisateur = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!utilisateur) {
    redirect("/connexion");
  }

  const metier = getMetier(utilisateur.metierPrecis);
  const sousVariante = getSousVariante(
    utilisateur.metierPrecis,
    utilisateur.sousVariante
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Votre compte</h1>
        <DeconnexionBouton />
      </div>

      <p className="mt-2 text-[var(--text-muted)]">{utilisateur.email}</p>

      <div className="mt-10 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--text-faint)]">Métier</dt>
            <dd className="mt-1">
              {metier?.libelle ?? utilisateur.metierPrecis}
              {sousVariante ? ` — ${sousVariante.libelle}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-faint)]">Ville</dt>
            <dd className="mt-1">{utilisateur.ville}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-faint)]">Type de zone</dt>
            <dd className="mt-1">{libellesZone[utilisateur.typeZone]}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-faint)]">Ancienneté</dt>
            <dd className="mt-1">
              {formaterAnciennete(utilisateur.dateCreationEntreprise)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-faint)]">
              Chiffre d&apos;affaires mensuel
            </dt>
            <dd className="mt-1">
              {Number(utilisateur.chiffreAffairesMensuel).toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-faint)]">Collaborateurs</dt>
            <dd className="mt-1">{utilisateur.nombreCollaborateurs}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-8 text-sm text-[var(--text-muted)]">
        Le questionnaire n&apos;est pas encore disponible depuis cet écran.
      </p>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMetier, getSousVariantes } from "@/lib/metiers";
import { AGENTS } from "@/lib/agents";
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

  const acces = await prisma.agentAccess.findMany({
    where: { userId: utilisateur.id, actif: true },
    select: { agent: true },
  });
  const agentsSouscrits = AGENTS.filter((a) => acces.some((x) => x.agent === a.code));
  const abonnement = await prisma.abonnement.findUnique({ where: { userId: utilisateur.id } });
  const objectifsActifs = await prisma.objectif.findMany({
    where: { userId: utilisateur.id, statut: "ACTIF" },
    select: { agent: true },
  });

  const metier = getMetier(utilisateur.metierPrecis);
  const sousVariantes = getSousVariantes(
    utilisateur.metierPrecis,
    utilisateur.sousVariantes
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
              {utilisateur.metierPrecis === "absent" ? utilisateur.metierAbsentTexte ?? "Autre métier" : metier?.libelle ?? utilisateur.metierPrecis}
              {sousVariantes.length > 0 || utilisateur.autreActiviteTexte
                ? ` — ${[...sousVariantes.map((v) => v.libelle), ...(utilisateur.autreActiviteTexte ? [utilisateur.autreActiviteTexte] : [])].join(", ")}`
                : ""}
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

      <section className="mt-10" aria-labelledby="formule">
        <h2 id="formule" className="text-base">
          Votre formule
        </h2>
        {abonnement ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {abonnement.nombreAgents} agents, facturation{" "}
            {abonnement.periode === "ANNUEL" ? "annuelle" : "mensuelle"}.{" "}
            <Link
              href={`/activation?agents=${abonnement.nombreAgents}&periode=${abonnement.periode === "ANNUEL" ? "annuel" : "mensuel"}`}
              className="text-[var(--blue-1)] hover:underline"
            >
              Modifier mes agents
            </Link>
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Aucune formule choisie pour le moment.{" "}
            <Link href="/offres" className="text-[var(--blue-1)] hover:underline">
              Voir les offres
            </Link>
          </p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="audits">
        <h2 id="audits" className="text-base">
          Lancer un audit
        </h2>
        {agentsSouscrits.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {agentsSouscrits.map((a) => (
              <li key={a.code}>
                <Link
                  href={`/audit/${a.slug}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] px-4 py-3 transition hover:border-[var(--blue-1)]"
                >
                  <span>{a.nom}</span>
                  <span className="text-sm text-[var(--blue-1)]">
                    {objectifsActifs.some((o) => o.agent === a.code) ? "Reprendre mon audit" : "Définir mon objectif"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Aucun agent n&apos;est inclus dans votre formule pour le moment.{" "}
            <Link href="/offres" className="text-[var(--blue-1)] hover:underline">
              Voir les offres
            </Link>
          </p>
        )}
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Chaque audit commence par votre objectif. Vos réponses sont enregistrées au fur et à mesure : vous pouvez reprendre un audit à tout moment.
        </p>
      </section>
    </main>
  );
}

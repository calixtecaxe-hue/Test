import type { Metadata } from "next";
import Link from "next/link";
import { exigerEspaceAbonne } from "@/lib/paiement/abonnement-serveur";
import { prisma } from "@/lib/prisma";
import { getMetier, getSousVariantes } from "@/lib/metiers";
import { AGENTS } from "@/lib/agents";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { formaterEuros, prixMensuelEquivalentAnnuelCentimesHT, OFFRES } from "@/lib/offres";
import { modePaiement, montantCentimesHT } from "@/lib/paiement/etat";
import { ROUTAGE } from "@/lib/routage-donnees";
import { contrainteDuCompte } from "@/lib/abonnement";
import { compteRoutable } from "@/lib/compte";
import { PROFILS } from "@/lib/donnees/constantes";
import type { ProfilId } from "@/lib/donnees/schemas";
import { GererFacturation } from "./gerer-facturation";
import { ChangerFormule } from "./changer-formule";
import { Resiliation } from "./resiliation";
import { EntrepriseFormulaire } from "./entreprise-formulaire";
import { FacturationFormulaire } from "./facturation-formulaire";

export const metadata: Metadata = { title: "Mon compte — CAXE" };

const STATUTS: Record<string, string> = { ACTIF: "Actif", IMPAYE: "Paiement à régulariser", RESILIE: "Résilié", EN_ATTENTE_PAIEMENT: "En attente de paiement" };

const date = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function ComptePage() {
  const { userId, utilisateur, abonnement } = await exigerEspaceAbonne("/compte");
  const acces = await prisma.agentAccess.findMany({ where: { userId, actif: true }, select: { agent: true } });
  const agents = AGENTS.filter((a) => acces.some((x) => x.agent === a.code));
  const annuel = abonnement.periode === "ANNUEL";
  const montant = montantCentimesHT(abonnement.nombreAgents, annuel ? "annuel" : "mensuel");
  const offre = OFFRES.find((o) => o.nombreAgents === abonnement.nombreAgents);
  const mode = modePaiement(process.env);
  const metier = getMetier(utilisateur.metierPrecis);
  const activites = [...getSousVariantes(utilisateur.metierPrecis, utilisateur.sousVariantes).map((v) => v.libelle), ...(utilisateur.autreActiviteTexte ? [utilisateur.autreActiviteTexte] : [])];
  const routable = compteRoutable(utilisateur);
  const contrainte = routable ? contrainteDuCompte(ROUTAGE, routable) : { agentsExclus: [], nombreMaxAgents: null };
  const profils = utilisateur.profils.filter((p): p is ProfilId => (PROFILS as readonly string[]).includes(p));
  const arretProgramme = abonnement.statut === "ACTIF" && abonnement.resiliationProgrammee;
  const libelleMetier = utilisateur.metierPrecis === "absent" ? (utilisateur.metierAbsentTexte ?? "Autre métier") : (metier?.libelle ?? utilisateur.metierPrecis);

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-10 px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{utilisateur.email}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Mon compte</h1>
      </header>

      {abonnement.statut === "IMPAYE" ? (
        <p role="alert" className="rounded-xl border border-[rgb(var(--red-rgb)/0.55)] px-5 py-4 text-sm">
          Votre dernier paiement n&apos;a pas abouti. Mettez à jour votre moyen de paiement pour garder l&apos;accès à vos agents.
        </p>
      ) : null}
      {(abonnement.statut === "RESILIE" || arretProgramme) && abonnement.finPeriodeLe ? (
        <p role="status" className="rounded-xl border border-[rgb(var(--amber-rgb)/0.5)] px-5 py-4 text-sm">
          {arretProgramme ? "Votre abonnement s'arrête" : "Votre abonnement est arrêté"}. Vos agents restent ouverts jusqu&apos;au {date(abonnement.finPeriodeLe)}.
        </p>
      ) : null}

      <section aria-labelledby="abo" className="grid gap-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-[1fr_auto] md:items-start">
        <div className="flex flex-col gap-4">
          <h2 id="abo" className="text-xl">
            Mon abonnement
          </h2>
          <dl className="grid gap-x-10 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Formule</dt>
              <dd className="mt-1">{abonnement.nombreAgents} agents, facturation {annuel ? "annuelle" : "mensuelle"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Montant</dt>
              <dd className="mt-1">
                {montant !== null ? `${formaterEuros(montant)} HT ${annuel ? "par an" : "par mois"}` : "—"}
                {annuel && offre ? <span className="text-[var(--text-muted)]"> (soit {formaterEuros(prixMensuelEquivalentAnnuelCentimesHT(offre.prixMensuelCentimesHT))} HT par mois)</span> : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Statut</dt>
              <dd className="mt-1">{arretProgramme ? "Actif, arrêt programmé" : STATUTS[abonnement.statut]}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{abonnement.finPeriodeLe ? (arretProgramme || abonnement.statut === "RESILIE" ? "Accès jusqu'au" : "Période payée jusqu'au") : "Actif depuis le"}</dt>
              <dd className="mt-1">{abonnement.finPeriodeLe ? date(abonnement.finPeriodeLe) : abonnement.activeLe ? date(abonnement.activeLe) : "—"}</dd>
            </div>
          </dl>
          {abonnement.statut === "ACTIF" && !arretProgramme ? (
            <ChangerFormule
              agentsExclus={contrainte.agentsExclus}
              nombreMax={contrainte.nombreMaxAgents}
              actuel={{ nombreAgents: abonnement.nombreAgents, periode: annuel ? "annuel" : "mensuel", agents: agents.map((a) => a.code) }}
              paiementReel={abonnement.fournisseur === "stripe"}
            />
          ) : (
            <p className="max-w-[60ch] text-sm text-[var(--text-muted)]">
              {arretProgramme ? "Reprenez votre abonnement pour pouvoir changer d'offre." : abonnement.statut === "IMPAYE" ? "Régularisez votre paiement pour pouvoir changer d'offre." : "Vous pourrez vous réabonner à la fin de votre accès."}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-6 md:max-w-[34ch]">
          {abonnement.statut === "ACTIF" || abonnement.statut === "IMPAYE" ? (
            <Resiliation programmee={abonnement.resiliationProgrammee} finPeriode={abonnement.finPeriodeLe ? date(abonnement.finPeriodeLe) : null} />
          ) : null}
          {abonnement.stripeCustomerId ? <GererFacturation /> : null}
          {abonnement.fournisseur === "demonstration" || (mode === "demonstration" && !abonnement.stripeCustomerId) ? (
            <p className="max-w-[28ch] text-xs text-[var(--text-muted)]">Mode démonstration : aucun paiement réel n&apos;a été pris pour ce compte.</p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="facturation" className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <h2 id="facturation" className="text-xl">
          Facturation professionnelle
        </h2>
        <p className="mt-2 mb-5 max-w-[60ch] text-sm text-[var(--text-muted)]">Le nom de l&apos;entreprise et son numéro de TVA figurent sur vos factures. Facultatif.</p>
        <FacturationFormulaire initial={{ raisonSociale: utilisateur.raisonSociale ?? "", numeroTva: utilisateur.numeroTva ?? "" }} />
      </section>

      <section aria-labelledby="agents-inclus">
        <h2 id="agents-inclus" className="text-xl">
          Mes agents
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {agents.map((a) => (
            <li key={a.code}>
              <Link href={`/audit/${a.slug}`} className="flex items-center gap-4 rounded-xl border border-[var(--line)] px-4 py-3 transition hover:border-[var(--blue-1)]">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--line)]">
                  <AgentAvatar code={a.code} />
                </span>
                <span className="text-sm">{a.nom}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="profil" className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <h2 id="profil" className="text-xl">
          Mon entreprise
        </h2>
        <dl className="mt-4 text-sm">
          <dt className="text-xs text-[var(--text-muted)]">Métier</dt>
          <dd className="mt-1">
            {libelleMetier}
            {activites.length > 0 ? ` — ${activites.join(", ")}` : ""}
          </dd>
        </dl>
        <p className="mt-2 mb-6 max-w-[64ch] text-sm text-[var(--text-muted)]">
          Mettez ces informations à jour quand votre situation change : un recrutement, un chiffre d&apos;affaires qui évolue, un déménagement. Vos réponses déjà données sont conservées ; les questions et les comparaisons s&apos;adaptent.
        </p>
        <EntrepriseFormulaire
          profils={profils}
          initial={{
            chiffreAffairesMensuel: String(utilisateur.chiffreAffairesMensuel),
            nombreCollaborateurs: String(utilisateur.nombreCollaborateurs),
            dateCreation: utilisateur.dateCreationEntreprise.toISOString().slice(0, 10),
            typeZone: utilisateur.typeZone,
            ville: utilisateur.ville,
          }}
        />
      </section>
    </main>
  );
}

import Link from "next/link";
import type { Agent } from "@/lib/agents";
import type { VueResultats } from "@/lib/resultats/resultats";
import type { EtatRapport } from "@/lib/rapport/rapport-compte";
import { ResultatsFactuels } from "./resultats-factuels";
import { RapportPlan } from "./rapport-plan";

export type Onglet = "resultats" | "rapport" | "plan";

const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: "resultats", libelle: "Résultats" },
  { id: "rapport", libelle: "Rapport" },
  { id: "plan", libelle: "Plan d'action" },
];

// Étape 4 d'un agent, en trois onglets distincts (décision du 29 octobre) : « Résultats » présente les faits, sans score, couleur,
// classement ni conseil ; « Rapport » apporte l'interprétation et la stratégie ; « Plan d'action » les transforme en actions.
// L'onglet ouvert est dans l'adresse (?onglet=) : il se retrouve au rechargement et se partage.
export function Resultats({ agent, onglet, vue, etat, base }: { agent: Agent; onglet: Onglet; vue: VueResultats; etat: EtatRapport; base: string }) {
  const lien = (o: Onglet) => `${base}?etape=4&onglet=${o}`;
  const statut = etat.rapport?.statut;
  return (
    <section aria-labelledby="resultats" className="res audit-entree mt-8" style={{ "--d": "300ms" } as React.CSSProperties}>
      <h2 id="resultats" className="text-2xl">
        Vos résultats, votre rapport et votre plan
      </h2>
      <nav className="res-barre res-onglets" aria-label="Résultats, rapport et plan d'action">
        {ONGLETS.map((o) => (
          <Link key={o.id} href={lien(o.id)} aria-current={onglet === o.id ? "page" : undefined} className={onglet === o.id ? "actif" : undefined} data-onglet={o.id}>
            {o.libelle}
            {o.id !== "resultats" && statut === "EN_COURS" ? <span className="sr-only"> (rédaction en cours)</span> : null}
            {o.id !== "resultats" && statut === "PRET" && etat.rapport?.perime ? <span className="res-onglet-note"> · à mettre à jour</span> : null}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {onglet === "resultats" ? <ResultatsFactuels vue={vue} questionnaire={base} /> : <RapportPlan agent={agent.code} onglet={onglet} etat={etat} liens={{ rapport: lien("rapport"), plan: lien("plan") }} />}
      </div>
    </section>
  );
}

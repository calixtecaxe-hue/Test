"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Champ, classeChamp } from "@/components/champ";
import { ChampDate } from "@/components/champ-date";
import { ChampNombre } from "@/components/champ-nombre";
import { erreurChiffreAffaires } from "@/lib/saisie-nombre";
import { ChoixCases } from "@/components/choix-cases";
import { libelleQuestion } from "@/lib/donnees/lexique";
import type { ProfilId } from "@/lib/donnees/schemas";
import { INSCRIPTION_CLIENT, LEXIQUE_CLIENT } from "@/lib/routage-client";

const QUESTIONS = Object.fromEntries(INSCRIPTION_CLIENT.questions.map((q) => [q.id, q]));
const ZONES = [
  { valeur: "URBAINE_DENSE", libelle: "Urbaine dense" },
  { valeur: "PERIURBAINE", libelle: "Périurbaine" },
  { valeur: "RURALE", libelle: "Rurale" },
];

export type ValeursEntreprise = { chiffreAffairesMensuel: string; nombreCollaborateurs: string; dateCreation: string; typeZone: string; ville: string };

// Les informations de l'entreprise, modifiables à tout moment : un recrutement, un chiffre d'affaires qui bouge,
// un déménagement. Les questions et les comparaisons s'adaptent ; les réponses déjà données sont conservées.
// Le métier ne se change pas ici.
export function EntrepriseFormulaire({ initial, profils }: { initial: ValeursEntreprise; profils: ProfilId[] }) {
  const route = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const [zone, setZone] = useState(initial.typeZone);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [etat, setEtat] = useState<"repos" | "envoi" | "ok">("repos");
  const [message, setMessage] = useState<string | null>(null);

  const lire = (nom: string) => formulaire.current?.querySelector<HTMLInputElement>(`input[name="${nom}"]`)?.value ?? "";
  const titre = (id: string) => libelleQuestion(QUESTIONS[id], profils, LEXIQUE_CLIENT);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const corps = {
      chiffreAffairesMensuel: lire("chiffreAffairesMensuel"),
      nombreCollaborateurs: lire("nombreCollaborateurs"),
      dateCreationEntreprise: lire("dateCreationEntreprise"),
      typeZone: zone,
      ville: lire("ville").trim(),
    };
    const manques: Record<string, string> = {};
    const erreurCa = erreurChiffreAffaires(corps.chiffreAffairesMensuel);
    if (erreurCa) manques.chiffreAffairesMensuel = erreurCa;
    if (corps.nombreCollaborateurs === "" || Number(corps.nombreCollaborateurs) < 1) manques.nombreCollaborateurs = "Indiquez au moins une personne : vous.";
    if (corps.dateCreationEntreprise === "") manques.dateCreationEntreprise = "Indiquez un mois passé, au format mm/aaaa.";
    if (!corps.typeZone) manques.typeZone = "Choisissez le type de zone.";
    if (corps.ville === "") manques.ville = "Indiquez la ville.";
    setErreurs(manques);
    if (Object.keys(manques).length > 0) return;

    setEtat("envoi");
    setMessage(null);
    try {
      const r = await fetch("/api/compte/dossier", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
      const d = (await r.json().catch(() => ({}))) as { erreur?: string; champs?: Record<string, string[]> };
      if (r.ok) {
        setEtat("ok");
        setMessage("Enregistré. Vos prochaines questions et comparaisons tiennent compte de ces informations ; vos réponses déjà données sont conservées.");
        route.refresh();
        return;
      }
      if (d.champs) setErreurs(Object.fromEntries(Object.entries(d.champs).map(([c, m]) => [c, m[0]])));
      setMessage(d.erreur ?? "L'enregistrement a échoué.");
    } catch {
      setMessage("Connexion impossible. Réessayez dans un instant.");
    }
    setEtat("repos");
  }

  const change = () => setEtat("repos");

  return (
    <form ref={formulaire} onSubmit={enregistrer} onChange={change} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ label={titre("chiffreAffairesMensuel")} htmlFor="compte-ca" erreur={erreurs.chiffreAffairesMensuel} aide="En euros par mois, estimation acceptée.">
          <ChampNombre id="compte-ca" name="chiffreAffairesMensuel" decimales valeurInitiale={initial.chiffreAffairesMensuel} />
        </Champ>
        <Champ label={titre("nombreCollaborateurs")} htmlFor="compte-effectif" erreur={erreurs.nombreCollaborateurs} aide="Vous y compris. Mettez à jour ce nombre à chaque recrutement ou départ.">
          <ChampNombre id="compte-effectif" name="nombreCollaborateurs" valeurInitiale={initial.nombreCollaborateurs} />
        </Champ>
        <Champ label="Mois de création de l'entreprise" htmlFor="compte-creation" erreur={erreurs.dateCreationEntreprise}>
          <ChampDate id="compte-creation" name="dateCreationEntreprise" precision="mois" valeurInitiale={initial.dateCreation} />
        </Champ>
        <Champ label="Ville" htmlFor="compte-ville" erreur={erreurs.ville}>
          <input id="compte-ville" name="ville" type="text" autoComplete="address-level2" defaultValue={initial.ville} className={classeChamp} />
        </Champ>
      </div>
      <div>
        <p className="champ-etiquette mb-2">Type de zone</p>
        <ChoixCases nom="typeZone" type="radio" legende={titre("typeZone")} options={ZONES} valeurs={zone ? [zone] : []} onChange={(z) => { setZone(z[0] ?? ""); change(); }} />
        {erreurs.typeZone ? <p className="mt-2 text-xs text-[var(--red-1)]">{erreurs.typeZone}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={etat === "envoi"} className="rounded-[4px] border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)] disabled:opacity-60">
          {etat === "envoi" ? "Enregistrement…" : "Enregistrer les informations de mon entreprise"}
        </button>
        {message ? (
          <p role="status" className={`max-w-[60ch] text-sm ${etat === "ok" ? "text-[var(--green-1)]" : "text-[var(--red-1)]"}`}>
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

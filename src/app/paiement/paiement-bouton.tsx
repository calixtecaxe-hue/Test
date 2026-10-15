"use client";

import { useState } from "react";
import { erreursDeFacturation, FacturationChamps, type ErreursFacturation, type ValeursFacturation } from "@/components/facturation-champs";

// Facturation professionnelle (facultative) puis démarrage du paiement : le serveur renvoie l'adresse où
// continuer (page du fournisseur, ou écran de démonstration). Aucun montant ne part du navigateur.
export function PaiementBouton({ libelle, desactive, initial }: { libelle: string; desactive: boolean; initial: ValeursFacturation }) {
  const [valeurs, setValeurs] = useState<ValeursFacturation>(initial);
  const [erreursChamps, setErreursChamps] = useState<ErreursFacturation>({});
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function payer() {
    const e = erreursDeFacturation(valeurs);
    setErreursChamps(e);
    if (e.raisonSociale || e.numeroTva) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch("/api/paiement/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raisonSociale: valeurs.raisonSociale, numeroTva: valeurs.numeroTva }),
      });
      const d = (await r.json()) as { url?: string; erreur?: string; champ?: keyof ErreursFacturation };
      if (r.ok && d.url) {
        window.location.href = d.url;
        return;
      }
      if (d.champ && d.erreur) setErreursChamps({ [d.champ]: d.erreur });
      else setErreur(d.erreur ?? "Le paiement n'a pas pu démarrer.");
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau et réessayez.");
    }
    setEnCours(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3 border-t border-[var(--line)] pt-5">
        <legend className="sr-only">Facturation professionnelle</legend>
        <h3 className="text-base">Vous achetez pour votre entreprise ?</h3>
        <p className="text-sm text-[var(--text-muted)]">Facultatif. Le nom de l&apos;entreprise et son numéro de TVA figureront sur votre facture.</p>
        <FacturationChamps valeurs={valeurs} erreurs={erreursChamps} onChange={setValeurs} idPrefixe="paiement" />
      </fieldset>
      <div className="flex flex-col gap-3">
        <button
          onClick={payer}
          disabled={desactive || enCours}
          className="bouton-eclat w-full rounded-[4px] bg-[var(--blue-1)] px-6 py-3.5 text-base font-semibold text-[var(--bg)] disabled:opacity-50"
        >
          {enCours ? "Ouverture du paiement…" : libelle}
        </button>
        {erreur ? (
          <p role="alert" className="text-sm text-[var(--red-1)]">
            {erreur}
          </p>
        ) : null}
      </div>
    </div>
  );
}

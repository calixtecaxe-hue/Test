"use client";

import { useState } from "react";
import Link from "next/link";
import { erreursDeFacturation, FacturationChamps, type ErreursFacturation, type ValeursFacturation } from "@/components/facturation-champs";

// Facturation professionnelle (facultative) puis démarrage du paiement : le serveur renvoie l'adresse où
// continuer (page du fournisseur, ou écran de démonstration). Aucun montant ne part du navigateur.
export function PaiementBouton({ libelle, desactive, initial, retour }: { libelle: string; desactive: boolean; initial: ValeursFacturation; retour: string }) {
  const [valeurs, setValeurs] = useState<ValeursFacturation>(initial);
  const [erreursChamps, setErreursChamps] = useState<ErreursFacturation>({});
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Les conditions générales de vente s'acceptent avant de payer : rien n'est coché d'avance.
  const [cgv, setCgv] = useState(false);

  async function payer() {
    if (!cgv) {
      setErreur("Acceptez les conditions générales de vente pour continuer.");
      return;
    }
    const e = erreursDeFacturation(valeurs);
    setErreursChamps(e);
    if (e.raisonSociale || e.numeroTva) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch("/api/paiement/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raisonSociale: valeurs.raisonSociale, numeroTva: valeurs.numeroTva, cgv }),
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
        <label className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
          <input type="checkbox" checked={cgv} onChange={(e) => setCgv(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--blue-1)]" />
          <span>
            J&apos;accepte les{" "}
            <Link href="/conditions-generales" target="_blank" className="text-[var(--blue-1)] hover:underline">
              conditions générales de vente
            </Link>
            .
          </span>
        </label>
        <button
          onClick={payer}
          disabled={desactive || enCours || !cgv}
          className="bouton-eclat w-full rounded-[4px] bg-[var(--blue-1)] px-6 py-3.5 text-base font-semibold text-[var(--bg)] disabled:opacity-50"
        >
          {enCours ? "Ouverture du paiement…" : libelle}
        </button>
        <Link
          href={retour}
          className="w-full rounded-[4px] border border-[var(--line)] px-6 py-3 text-center text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
        >
          Modifier ma formule
        </Link>
        {erreur ? (
          <p role="alert" className="text-sm text-[var(--red-1)]">
            {erreur}
          </p>
        ) : null}
      </div>
    </div>
  );
}

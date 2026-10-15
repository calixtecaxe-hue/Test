"use client";

import { useState } from "react";
import { erreursDeFacturation, FacturationChamps, type ErreursFacturation, type ValeursFacturation } from "@/components/facturation-champs";

// Nom de l'entreprise et numéro de TVA du compte, modifiables. Repris sur les prochaines factures.
export function FacturationFormulaire({ initial }: { initial: ValeursFacturation }) {
  const [valeurs, setValeurs] = useState(initial);
  const [erreurs, setErreurs] = useState<ErreursFacturation>({});
  const [etat, setEtat] = useState<"repos" | "envoi" | "ok">("repos");
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const err = erreursDeFacturation(valeurs);
    setErreurs(err);
    if (err.raisonSociale || err.numeroTva) return;
    setEtat("envoi");
    setMessage(null);
    try {
      const r = await fetch("/api/compte/facturation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valeurs) });
      const d = (await r.json()) as { erreur?: string; champ?: keyof ErreursFacturation; message?: string };
      if (r.ok) {
        setEtat("ok");
        setMessage(d.message ?? "Enregistré. Ces informations figureront sur vos prochaines factures.");
        return;
      }
      if (d.champ && d.erreur) setErreurs({ [d.champ]: d.erreur });
      else setMessage(d.erreur ?? "L'enregistrement a échoué.");
    } catch {
      setMessage("Connexion impossible. Réessayez dans un instant.");
    }
    setEtat("repos");
  }

  return (
    <form onSubmit={enregistrer} className="flex max-w-md flex-col gap-4" noValidate>
      <FacturationChamps valeurs={valeurs} erreurs={erreurs} onChange={(v) => { setValeurs(v); setEtat("repos"); }} idPrefixe="compte" />
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={etat === "envoi"} className="rounded-[4px] border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)] disabled:opacity-60">
          {etat === "envoi" ? "Enregistrement…" : "Enregistrer ma facturation"}
        </button>
        {message ? (
          <p role="status" className={`text-sm ${etat === "ok" ? "text-[#7BD0A0]" : "text-[var(--red-1)]"}`}>
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

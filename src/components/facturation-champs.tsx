"use client";

import { Champ, classeChamp } from "@/components/champ";
import { verifierFacturation } from "@/lib/paiement/tva";

export type ValeursFacturation = { raisonSociale: string; numeroTva: string };
export type ErreursFacturation = { raisonSociale?: string; numeroTva?: string };

// Contrôle les deux champs et renvoie les messages à afficher (vide si tout est correct ou laissé vide).
export function erreursDeFacturation(v: ValeursFacturation): ErreursFacturation {
  const r = verifierFacturation(v);
  return r.ok ? {} : { [r.champ]: r.message };
}

// Facturation professionnelle : facultative. Le nom de l'entreprise et son numéro de TVA
// intracommunautaire figurent sur la facture.
export function FacturationChamps({ valeurs, erreurs, onChange, idPrefixe }: { valeurs: ValeursFacturation; erreurs: ErreursFacturation; onChange: (v: ValeursFacturation) => void; idPrefixe: string }) {
  return (
    <div className="grid gap-4">
      <Champ label="Nom de l'entreprise" htmlFor={`${idPrefixe}-nom`} erreur={erreurs.raisonSociale}>
        <input
          id={`${idPrefixe}-nom`}
          type="text"
          autoComplete="organization"
          maxLength={120}
          value={valeurs.raisonSociale}
          onChange={(e) => onChange({ ...valeurs, raisonSociale: e.target.value })}
          aria-invalid={erreurs.raisonSociale ? true : undefined}
          className={classeChamp}
        />
      </Champ>
      <Champ label="Numéro de TVA intracommunautaire" htmlFor={`${idPrefixe}-tva`} aide="Par exemple FR 64 443 061 841. Laissez vide si vous n'en avez pas." erreur={erreurs.numeroTva}>
        <input
          id={`${idPrefixe}-tva`}
          type="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          value={valeurs.numeroTva}
          onChange={(e) => onChange({ ...valeurs, numeroTva: e.target.value })}
          aria-invalid={erreurs.numeroTva ? true : undefined}
          className={classeChamp}
        />
      </Champ>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoixCases } from "@/components/choix-cases";
import { phraseObjectif, type UniteAmpleur } from "@/lib/audit/objectif";

const UNITES = [
  { valeur: "pourcent", libelle: "En pourcentage (%)" },
  { valeur: "euros", libelle: "En euros (€)" },
  { valeur: "unites", libelle: "En nombre" },
];

function lireNombre(texte: string): number | null {
  const t = texte.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Objectif de l'agent en trois champs : ce que le dirigeant veut changer, de combien,
// en combien de temps. Première étape de l'audit.
export function ObjectifFormulaire({ agent, annulable, onAnnuler }: { agent: string; annulable?: boolean; onAnnuler?: () => void }) {
  const router = useRouter();
  const id = useId();
  const [quoi, setQuoi] = useState("");
  const [combien, setCombien] = useState("");
  const [unite, setUnite] = useState<UniteAmpleur>("pourcent");
  const [delai, setDelai] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  const valeur = lireNombre(combien);
  const mois = lireNombre(delai);
  const apercu =
    quoi.trim().length >= 3 && valeur !== null && valeur > 0 && mois !== null && Number.isInteger(mois) && mois >= 1
      ? phraseObjectif({ quoi, ampleur: { valeur, unite }, delaiMois: mois })
      : null;

  function effacerErreur(champ: string) {
    setErreurs((x) => (champ in x ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== champ)) : x));
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const manques: Record<string, string> = {};
    if (quoi.trim().length < 3) manques.quoi = "Dites ce que vous voulez changer, par exemple « baisser le turnover ».";
    if (valeur === null || valeur <= 0) manques.ampleur = "Indiquez de combien, avec un nombre supérieur à zéro.";
    if (mois === null || !Number.isInteger(mois) || mois < 1) manques.delaiMois = "Indiquez en combien de mois, avec un nombre entier.";
    setErreurs(manques);
    if (Object.keys(manques).length > 0) return;

    setEnvoi(true);
    const r = await fetch("/api/audit/objectif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, objectif: { quoi, ampleur: { valeur, unite }, delaiMois: mois } }),
    }).catch(() => null);
    if (r?.ok) {
      router.refresh();
      return;
    }
    const corps = (await r?.json().catch(() => null)) as { erreur?: string; champ?: string } | null;
    setErreurs({ [corps?.champ ?? "general"]: corps?.erreur ?? "Votre objectif n'a pas pu être enregistré. Réessayez." });
    setEnvoi(false);
  }

  const classeChamp = "champ-saisie";
  return (
    <form onSubmit={envoyer} noValidate className="mt-8 flex flex-col gap-6">
      <div className="champ-groupe">
        <label htmlFor={`${id}-quoi`} className="champ-etiquette">
          Ce que vous voulez changer
        </label>
        <input
          id={`${id}-quoi`}
          type="text"
          value={quoi}
          onChange={(e) => { setQuoi(e.target.value); effacerErreur("quoi"); }}
          placeholder="Ex. : baisser le turnover"
          maxLength={160}
          className={classeChamp}
          aria-invalid={erreurs.quoi ? true : undefined}
        />
        {erreurs.quoi ? <p className="text-xs text-[var(--red-1)]">{erreurs.quoi}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="champ-groupe">
          <label htmlFor={`${id}-combien`} className="champ-etiquette">
            De combien
          </label>
          <input
            id={`${id}-combien`}
            type="text"
            inputMode="decimal"
            value={combien}
            onChange={(e) => { setCombien(e.target.value); effacerErreur("ampleur"); }}
            placeholder="Ex. : 5"
            className={classeChamp}
            aria-invalid={erreurs.ampleur ? true : undefined}
          />
          {erreurs.ampleur ? <p className="text-xs text-[var(--red-1)]">{erreurs.ampleur}</p> : null}
        </div>
        <div className="champ-groupe">
          <label htmlFor={`${id}-delai`} className="champ-etiquette">
            En combien de mois
          </label>
          <input
            id={`${id}-delai`}
            type="text"
            inputMode="numeric"
            value={delai}
            onChange={(e) => { setDelai(e.target.value); effacerErreur("delaiMois"); }}
            placeholder="Ex. : 3"
            className={classeChamp}
            aria-invalid={erreurs.delaiMois ? true : undefined}
          />
          {erreurs.delaiMois ? <p className="text-xs text-[var(--red-1)]">{erreurs.delaiMois}</p> : null}
        </div>
      </div>

      <div className="champ-groupe">
        <span className="champ-etiquette">Unité du chiffre</span>
        <ChoixCases nom="unite" type="radio" legende="Unité du chiffre" options={UNITES} valeurs={[unite]} onChange={(v) => setUnite(v[0] as UniteAmpleur)} />
      </div>

      <p className="min-h-[1.5rem] text-sm text-[var(--text-muted)]" aria-live="polite">
        {apercu ? (
          <>
            Votre objectif : <span className="text-[var(--text)]">{apercu}</span>
          </>
        ) : (
          <>Exemple : baisser le turnover de 5&nbsp;% sur les 3 prochains mois.</>
        )}
      </p>

      {erreurs.general ? <p className="text-sm text-[var(--red-1)]">{erreurs.general}</p> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-[4px] bg-[var(--blue-1)] px-5 py-2.5 font-medium text-[var(--bg)] transition hover:bg-[var(--blue-2)] hover:text-[var(--text)] disabled:opacity-60"
        >
          {envoi ? "Enregistrement…" : "Enregistrer mon objectif"}
        </button>
        {annulable ? (
          <button type="button" onClick={onAnnuler} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Garder l&apos;objectif actuel
          </button>
        ) : null}
      </div>
    </form>
  );
}

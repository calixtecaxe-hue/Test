"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoixCases } from "@/components/choix-cases";
import { DELAI_MAX_MOIS, phraseObjectif, verifierVraisemblance, type UniteAmpleur } from "@/lib/audit/objectif";
import { lireNombre } from "@/lib/audit/nombre";
import type { ObjectifAgent } from "@/lib/donnees/schemas";

const UNITES = [
  { valeur: "pourcent", libelle: "En pourcentage (%)" },
  { valeur: "euros", libelle: "En euros (€)" },
  { valeur: "unites", libelle: "En nombre" },
];
const AUTRE = "autre";

const enMinuscule = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

// Objectif d'un agent dont l'objectif n'a pas forcément de chiffre (RH, Comm) : le dirigeant choisit dans une
// liste écrite à l'avance (ou « Autre »), puis donne un chiffre s'il en a un, ou décrit ce qu'il veut constater.
export function ObjectifChoix({
  agent,
  propositions,
  facteurAnnuelMax,
  annulable,
  onAnnuler,
  onEnregistre,
}: {
  agent: string;
  propositions: { intro?: string; objectifs: ObjectifAgent[] };
  facteurAnnuelMax: number;
  annulable?: boolean;
  onAnnuler?: () => void;
  onEnregistre?: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [choixId, setChoixId] = useState("");
  const [autreQuoi, setAutreQuoi] = useState("");
  const [combien, setCombien] = useState("");
  const [unite, setUnite] = useState<UniteAmpleur>("pourcent");
  const [sansChiffre, setSansChiffre] = useState(false);
  const [reussite, setReussite] = useState("");
  const [delai, setDelai] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  const detailRef = useRef<HTMLDivElement>(null);
  // Une fois l'objectif choisi, la page descend vers les champs à remplir.
  useEffect(() => {
    if (choixId) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [choixId]);

  const option = propositions.objectifs.find((o) => o.id === choixId);
  const estAutre = choixId === AUTRE;
  const quoi = option ? enMinuscule(option.libelle) : autreQuoi.trim();
  const avecChiffre = !sansChiffre;
  const groupes = [...new Set(propositions.objectifs.map((o) => o.groupe ?? ""))];

  const valeur = lireNombre(combien);
  const mois = lireNombre(delai);
  const delaiValide = mois !== null && Number.isInteger(mois) && mois >= 1 && mois <= DELAI_MAX_MOIS;
  const apercu =
    quoi.length >= 3 && delaiValide && (avecChiffre ? valeur !== null && valeur > 0 : reussite.trim().length >= 3)
      ? phraseObjectif({ quoi, ampleur: avecChiffre && valeur ? { valeur, unite } : undefined, reussite: avecChiffre ? undefined : reussite.trim(), delaiMois: mois as number })
      : null;

  function effacer(champ: string) {
    setErreurs((x) => (champ in x ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== champ)) : x));
  }

  function choisir(valeurChoisie: string) {
    setChoixId(valeurChoisie);
    setErreurs({});
    const o = propositions.objectifs.find((x) => x.id === valeurChoisie);
    if (o) {
      setUnite(o.unite ?? "pourcent");
      setSansChiffre(o.mesure === "phrase");
    } else {
      setSansChiffre(false);
    }
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const manques: Record<string, string> = {};
    if (!choixId) manques.choix = "Choisissez ce que vous voulez améliorer.";
    if (estAutre && quoi.length < 3) manques.quoi = "Dites ce que vous voulez améliorer, en quelques mots.";
    if (avecChiffre && (valeur === null || valeur <= 0)) manques.ampleur = "Indiquez de combien, avec un nombre supérieur à zéro.";
    if (!avecChiffre && reussite.trim().length < 3) manques.reussite = "Décrivez ce que vous voulez constater quand ce sera atteint.";
    if (mois === null || !Number.isInteger(mois) || mois < 1) manques.delaiMois = "Indiquez en combien de temps, exprimé en mois, avec un nombre entier.";
    else if (mois > DELAI_MAX_MOIS) manques.delaiMois = `Le délai ne dépasse pas ${DELAI_MAX_MOIS} mois (10 ans).`;
    if (Object.keys(manques).length === 0 && avecChiffre && valeur !== null && mois !== null) {
      const v = verifierVraisemblance({ quoi, ampleur: { valeur, unite }, delaiMois: mois }, facteurAnnuelMax);
      if (!v.ok) manques[v.champ] = v.message;
    }
    setErreurs(manques);
    if (Object.keys(manques).length > 0) return;

    setEnvoi(true);
    const objectif = {
      quoi,
      ...(avecChiffre && valeur !== null ? { ampleur: { valeur, unite } } : { reussite: reussite.trim() }),
      delaiMois: mois,
      ...(option ? { choix: option.id } : {}),
    };
    const r = await fetch("/api/audit/objectif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, objectif }),
    }).catch(() => null);
    if (r?.ok) {
      onEnregistre?.();
      router.refresh();
      return;
    }
    const corps = (await r?.json().catch(() => null)) as { erreur?: string; champ?: string } | null;
    setErreurs({ [corps?.champ ?? "general"]: corps?.erreur ?? "Votre objectif n'a pas pu être enregistré. Réessayez." });
    setEnvoi(false);
  }

  const lien = "audit-lien w-fit text-sm text-[var(--agent)] hover:underline";
  return (
    <form onSubmit={envoyer} noValidate className="mt-8 flex flex-col gap-8" data-objectif-choix>
      <div className="champ-groupe">
        <span className="champ-etiquette">Ce que vous voulez améliorer</span>
        {propositions.intro ? <p className="text-sm text-[var(--text-muted)]">{propositions.intro}</p> : null}
        <div className="mt-3 flex flex-col gap-6">
          {groupes.map((g) => (
            <div key={g || "tous"}>
              {g ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{g}</p> : null}
              <ChoixCases
                nom={`${id}-choix`}
                type="radio"
                legende={g || "Objectifs proposés"}
                options={propositions.objectifs.filter((o) => (o.groupe ?? "") === g).map((o) => ({ valeur: o.id, libelle: o.libelle }))}
                valeurs={[choixId]}
                onChange={(v) => choisir(v[0])}
              />
            </div>
          ))}
          <ChoixCases nom={`${id}-choix`} type="radio" legende="Un autre objectif" options={[{ valeur: AUTRE, libelle: "Autre (précisez)" }]} valeurs={[choixId]} onChange={(v) => choisir(v[0])} />
        </div>
        {erreurs.choix ? <p className="text-xs text-[var(--red-1)]">{erreurs.choix}</p> : null}
      </div>

      {choixId ? (
        <div ref={detailRef} className="audit-entree flex flex-col gap-6" data-detail>
          {estAutre ? (
            <div className="champ-groupe">
              <label htmlFor={`${id}-quoi`} className="champ-etiquette">Votre objectif</label>
              <input
                id={`${id}-quoi`}
                type="text"
                value={autreQuoi}
                onChange={(e) => { setAutreQuoi(e.target.value); effacer("quoi"); }}
                placeholder="Ex. : mieux faire connaître mon entreprise"
                maxLength={160}
                className="champ-saisie"
                aria-invalid={erreurs.quoi ? true : undefined}
              />
              {erreurs.quoi ? <p className="text-xs text-[var(--red-1)]">{erreurs.quoi}</p> : null}
            </div>
          ) : null}

          {avecChiffre ? (
            <>
              <div className="champ-groupe">
                <label htmlFor={`${id}-combien`} className="champ-etiquette">De combien</label>
                <input
                  id={`${id}-combien`}
                  type="text"
                  inputMode="decimal"
                  value={combien}
                  onChange={(e) => { setCombien(e.target.value); effacer("ampleur"); }}
                  placeholder={option?.exemple.valeur ? `Ex. : ${option.exemple.valeur}` : "Ex. : 10"}
                  className="champ-saisie"
                  aria-invalid={erreurs.ampleur ? true : undefined}
                />
                {erreurs.ampleur ? <p className="text-xs text-[var(--red-1)]">{erreurs.ampleur}</p> : null}
              </div>
              <div className="champ-groupe">
                <span className="champ-etiquette">Unité du chiffre</span>
                <ChoixCases nom={`${id}-unite`} type="radio" legende="Unité du chiffre" options={UNITES} valeurs={[unite]} onChange={(v) => setUnite(v[0] as UniteAmpleur)} />
              </div>
              <button type="button" onClick={() => { setSansChiffre(true); effacer("ampleur"); }} className={lien} data-sans-chiffre>
                Je n&apos;ai pas de chiffre : je décris ce que je veux constater
              </button>
            </>
          ) : (
            <>
              <div className="champ-groupe">
                <label htmlFor={`${id}-reussite`} className="champ-etiquette">Comment saurez-vous que c&apos;est atteint ?</label>
                <input
                  id={`${id}-reussite`}
                  type="text"
                  value={reussite}
                  onChange={(e) => { setReussite(e.target.value); effacer("reussite"); }}
                  placeholder={option?.exemple.reussite ? `Ex. : ${option.exemple.reussite}` : "Ex. : je reçois plus de demandes sans y passer plus de temps"}
                  maxLength={200}
                  className="champ-saisie"
                  aria-invalid={erreurs.reussite ? true : undefined}
                />
                {erreurs.reussite ? <p className="text-xs text-[var(--red-1)]">{erreurs.reussite}</p> : null}
              </div>
              {estAutre || option?.mesure === "chiffre" ? (
                <button type="button" onClick={() => { setSansChiffre(false); effacer("reussite"); }} className={lien} data-avec-chiffre>
                  J&apos;ai un chiffre : je le renseigne
                </button>
              ) : null}
            </>
          )}

          <div className="champ-groupe">
            <label htmlFor={`${id}-delai`} className="champ-etiquette">
              En combien de temps <span className="font-normal text-[var(--text-muted)]">(temps exprimé en mois)</span>
            </label>
            <input
              id={`${id}-delai`}
              type="text"
              inputMode="numeric"
              value={delai}
              onChange={(e) => { setDelai(e.target.value); effacer("delaiMois"); }}
              placeholder={option ? `Ex. : ${option.exemple.delaiMois}` : "Ex. : 3"}
              className="champ-saisie sm:max-w-[16rem]"
              aria-invalid={erreurs.delaiMois ? true : undefined}
            />
            {erreurs.delaiMois ? <p className="text-xs text-[var(--red-1)]">{erreurs.delaiMois}</p> : null}
          </div>

          <p className="min-h-[1.5rem] text-sm text-[var(--text-muted)]" aria-live="polite">
            {apercu ? (
              <>
                Votre objectif : <span className="text-[var(--text)]">{apercu}</span>
                {!avecChiffre ? <> Réussite : <span className="text-[var(--text)]">{reussite.trim()}</span></> : null}
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {erreurs.general ? <p className="text-sm text-[var(--red-1)]">{erreurs.general}</p> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={envoi || !choixId} className="audit-bouton bouton-eclat rounded-[4px] px-5 py-2.5 transition disabled:opacity-60">
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

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoixCases } from "@/components/choix-cases";
import { MenuDeroulant } from "@/components/menu-deroulant";
import { DELAI_MAX_MOIS, phraseObjectif, verifierVraisemblance, type ObjectifSaisie, type UniteAmpleur } from "@/lib/audit/objectif";
import { MAX_OBJECTIFS } from "@/lib/audit/objectifs-agent";
import { lireNombre } from "@/lib/audit/nombre";
import type { ObjectifAgent } from "@/lib/donnees/schemas";

const UNITES = [
  { valeur: "pourcent", libelle: "En pourcentage (%)" },
  { valeur: "euros", libelle: "En euros (€)" },
  { valeur: "unites", libelle: "En nombre" },
];
// « Autre (précisez) » termine chaque partie de la liste (« Améliorer ce que j'ai déjà », « Mettre en place… ») : autre-0, autre-1…
const AUTRE = "autre-";

const enMinuscule = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

// Un objectif en cours de saisie : pris dans la liste (`choix`) ou écrit par le dirigeant (« Autre », `choix` null).
type Entree = {
  cle: string;
  choix: string | null;
  partie: string;
  autreQuoi: string;
  combien: string;
  unite: UniteAmpleur;
  sansChiffre: boolean;
  reussite: string;
  delai: string;
};

// Objectifs d'un agent dont l'objectif n'a pas forcément de chiffre (RH, Comm) : le dirigeant en choisit un ou plusieurs
// dans une liste écrite à l'avance (ou « Autre »), chacun avec un chiffre s'il en a un, ou ce qu'il veut constater, et son
// délai (décision du 27 octobre). Quand la liste a des parties (Comm), tous les objectifs viennent de la même partie.
export function ObjectifChoix({
  agent,
  propositions,
  facteurAnnuelMax,
  annulable,
  onAnnuler,
  onEnregistre,
  initiaux,
}: {
  agent: string;
  propositions: { intro?: string; objectifs: ObjectifAgent[] };
  facteurAnnuelMax: number;
  annulable?: boolean;
  onAnnuler?: () => void;
  onEnregistre?: () => void;
  // Objectifs en cours, repris pour être modifiés.
  initiaux?: ObjectifSaisie[];
}) {
  const router = useRouter();
  const id = useId();
  const groupes = [...new Set(propositions.objectifs.map((o) => o.groupe ?? ""))];
  const objectifsDu = (g: string) => propositions.objectifs.filter((o) => (o.groupe ?? "") === g);
  const enParties = groupes.some((g) => g !== "");
  // « Autre » dans une partie nommée dont la plupart des objectifs se décrivent sans chiffre : on commence par la description.
  const autreSansChiffre = (g: string) => g !== "" && objectifsDu(g).filter((o) => o.mesure === "phrase").length * 2 > objectifsDu(g).length;
  const compteur = useRef(0);
  const nouvelleCle = () => `o${++compteur.current}`;

  const [entrees, setEntrees] = useState<Entree[]>(() =>
    (initiaux ?? []).map((s, k) => {
      const o = s.choix ? propositions.objectifs.find((x) => x.id === s.choix) : undefined;
      return {
        cle: `i${k}`,
        choix: o?.id ?? null,
        partie: o?.groupe ?? s.partie ?? groupes[0] ?? "",
        autreQuoi: o ? "" : s.quoi,
        combien: s.ampleur ? String(s.ampleur.valeur).replace(".", ",") : "",
        unite: s.ampleur?.unite ?? o?.unite ?? "pourcent",
        sansChiffre: !s.ampleur,
        reussite: s.reussite ?? "",
        delai: String(s.delaiMois),
      };
    }),
  );
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [derniere, setDerniere] = useState<string | null>(null);

  // Un objectif ajouté : la page descend vers ses champs.
  useEffect(() => {
    if (derniere) document.getElementById(`${id}-${derniere}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [derniere, id]);

  const partieChoisie = enParties && entrees.length > 0 ? entrees[0].partie : null;
  const complet = entrees.length >= MAX_OBJECTIFS;

  function ajouter(valeur: string, partie: string) {
    if (complet) return;
    const o = propositions.objectifs.find((x) => x.id === valeur);
    const cle = nouvelleCle();
    setEntrees((l) => [
      ...l,
      {
        cle,
        choix: o?.id ?? null,
        partie,
        autreQuoi: "",
        combien: "",
        unite: o?.unite ?? "pourcent",
        sansChiffre: o ? o.mesure === "phrase" : autreSansChiffre(partie),
        reussite: "",
        delai: "",
      },
    ]);
    setErreurs((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== "choix" && k !== "general")));
    setDerniere(cle);
  }
  function retirer(cle: string) {
    setEntrees((l) => l.filter((e) => e.cle !== cle));
    setErreurs((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith(`${cle}.`))));
  }
  function maj(cle: string, champ: Partial<Entree>, erreur?: string) {
    setEntrees((l) => l.map((e) => (e.cle === cle ? { ...e, ...champ } : e)));
    if (erreur) setErreurs((x) => (`${cle}.${erreur}` in x ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== `${cle}.${erreur}`)) : x));
  }

  const optionDe = (e: Entree) => (e.choix ? propositions.objectifs.find((o) => o.id === e.choix) : undefined);
  const quoiDe = (e: Entree) => {
    const o = optionDe(e);
    return o ? enMinuscule(o.libelle) : e.autreQuoi.trim();
  };
  // La saisie d'un objectif, telle qu'elle part (ou null si un champ manque).
  function saisieDe(e: Entree): ObjectifSaisie | null {
    const quoi = quoiDe(e);
    const valeur = lireNombre(e.combien);
    const mois = lireNombre(e.delai);
    if (quoi.length < 3 || mois === null || !Number.isInteger(mois) || mois < 1 || mois > DELAI_MAX_MOIS) return null;
    if (!e.sansChiffre && (valeur === null || valeur <= 0)) return null;
    if (e.sansChiffre && e.reussite.trim().length < 3) return null;
    return {
      quoi,
      ...(!e.sansChiffre && valeur !== null ? { ampleur: { valeur, unite: e.unite } } : { reussite: e.reussite.trim() }),
      delaiMois: mois,
      ...(e.choix ? { choix: e.choix } : {}),
      ...(e.partie ? { partie: e.partie } : {}),
    };
  }

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault();
    const manques: Record<string, string> = {};
    if (entrees.length === 0) manques.choix = "Choisissez ce que vous voulez améliorer.";
    for (const e of entrees) {
      const valeur = lireNombre(e.combien);
      const mois = lireNombre(e.delai);
      if (!e.choix && e.autreQuoi.trim().length < 3) manques[`${e.cle}.quoi`] = "Dites ce que vous voulez améliorer, en quelques mots.";
      if (!e.sansChiffre && (valeur === null || valeur <= 0)) manques[`${e.cle}.ampleur`] = "Indiquez de combien, avec un nombre supérieur à zéro.";
      if (e.sansChiffre && e.reussite.trim().length < 3) manques[`${e.cle}.reussite`] = "Décrivez ce que vous voulez constater quand ce sera atteint.";
      if (mois === null || !Number.isInteger(mois) || mois < 1) manques[`${e.cle}.delaiMois`] = "Indiquez en combien de temps, exprimé en mois, avec un nombre entier.";
      else if (mois > DELAI_MAX_MOIS) manques[`${e.cle}.delaiMois`] = `Le délai ne dépasse pas ${DELAI_MAX_MOIS} mois (10 ans).`;
      const s = saisieDe(e);
      if (s && !Object.keys(manques).some((k) => k.startsWith(`${e.cle}.`))) {
        const v = verifierVraisemblance(s, facteurAnnuelMax);
        if (!v.ok) manques[`${e.cle}.${v.champ}`] = v.message;
      }
    }
    setErreurs(manques);
    if (Object.keys(manques).length > 0) {
      const premiere = entrees.find((e) => Object.keys(manques).some((k) => k.startsWith(`${e.cle}.`)));
      if (premiere) document.getElementById(`${id}-${premiere.cle}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    setEnvoi(true);
    const objectifs = entrees.map(saisieDe);
    const r = await fetch("/api/audit/objectif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, objectifs }),
    }).catch(() => null);
    if (r?.ok) {
      onEnregistre?.();
      router.refresh();
      return;
    }
    const corps = (await r?.json().catch(() => null)) as { erreur?: string; champ?: string; rang?: number } | null;
    const visee = corps?.rang !== undefined ? entrees[corps.rang] : undefined;
    const cle = visee && corps?.champ && corps.champ !== "choix" ? `${visee.cle}.${corps.champ}` : corps?.champ === "choix" ? "choix" : "general";
    setErreurs({ [cle]: corps?.erreur ?? "Vos objectifs n'ont pas pu être enregistrés. Réessayez." });
    setEnvoi(false);
  }

  const lien = "audit-lien w-fit text-sm text-[var(--agent)] hover:underline";
  const plusieurs = entrees.length > 1;
  return (
    <form onSubmit={envoyer} noValidate className="mt-8 flex flex-col gap-8" data-objectif-choix>
      <div className="champ-groupe">
        <span className="champ-etiquette">Ce que vous voulez améliorer</span>
        {propositions.intro ? <p className="text-sm text-[var(--text-muted)]">{propositions.intro}</p> : null}
        <p className="text-sm text-[var(--text-muted)]">
          Vous pouvez choisir plusieurs objectifs{enParties ? ", dans une seule partie de la liste" : ""} : chacun a son chiffre ou sa description, et son délai.
        </p>
        <div className="mt-3 flex flex-col gap-6">
          {/* Une partie = un menu déroulant de ses objectifs, puis « Autre (précisez) » toujours visible. */}
          {groupes.map((g, i) => {
            const menu = `${id}-menu-${i}`;
            const fermee = partieChoisie !== null && g !== partieChoisie;
            const restants = objectifsDu(g).filter((o) => !entrees.some((e) => e.choix === o.id));
            const autres = entrees.filter((e) => !e.choix && e.partie === g);
            const dejaDansLaPartie = entrees.some((e) => e.partie === g);
            return (
              <div key={g || "tous"} className="flex flex-col gap-3" data-partie={g || undefined} data-fermee={fermee ? "oui" : undefined}>
                {g ? <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{g}</p> : null}
                {fermee ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Vos objectifs sont dans « {partieChoisie} ». Pour en choisir ici, retirez d&apos;abord ceux de cette partie.
                  </p>
                ) : (
                  <>
                    {restants.length > 0 && !complet ? (
                      <>
                        <label htmlFor={menu} className="sr-only">{g ? `Objectifs proposés : ${g}` : "Objectifs proposés"}</label>
                        <MenuDeroulant
                          id={menu}
                          name={`${id}-objectif-${i}`}
                          options={[{ valeur: "", libelle: dejaDansLaPartie ? "Ajouter un autre objectif" : "Choisissez un objectif" }, ...restants.map((o) => ({ valeur: o.id, libelle: o.libelle }))]}
                          valeur=""
                          onChange={(v) => { if (v) ajouter(v, g); }}
                        />
                      </>
                    ) : null}
                    <ChoixCases
                      nom={`${id}-autre-${i}`}
                      type="checkbox"
                      legende={g ? `Un autre objectif : ${g}` : "Un autre objectif"}
                      options={[{ valeur: `${AUTRE}${i}`, libelle: "Autre (précisez)" }]}
                      valeurs={autres.length > 0 ? [`${AUTRE}${i}`] : []}
                      onChange={(v) => {
                        if (v.length > 0) ajouter(`${AUTRE}${i}`, g);
                        else autres.forEach((e) => retirer(e.cle));
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        {complet ? <p className="text-xs text-[var(--text-muted)]">{MAX_OBJECTIFS} objectifs au plus.</p> : null}
        {erreurs.choix ? <p className="text-xs text-[var(--red-1)]">{erreurs.choix}</p> : null}
      </div>

      {entrees.length > 0 ? (
        <div className="flex flex-col gap-4" aria-label={plusieurs ? "Vos objectifs" : "Votre objectif"} role="group">
          {entrees.map((e, rang) => {
            const o = optionDe(e);
            const p = `${id}-${e.cle}`;
            const err = (c: string) => erreurs[`${e.cle}.${c}`];
            const s = saisieDe(e);
            return (
              <div key={e.cle} id={p} className="objectif-entree audit-entree flex flex-col gap-5" data-detail data-objectif={e.choix ?? "autre"}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-base text-[var(--text)]">
                    {plusieurs ? <span className="text-[var(--text-muted)]">Objectif {rang + 1} · </span> : null}
                    {o ? o.libelle : "Autre (précisez)"}
                  </p>
                  <button type="button" onClick={() => retirer(e.cle)} className="ligne-retirer" aria-label={`Retirer l'objectif « ${o ? o.libelle : e.autreQuoi.trim() || "Autre"} »`}>
                    Retirer cet objectif
                  </button>
                </div>
                {!o ? (
                  <div className="champ-groupe">
                    <label htmlFor={`${p}-quoi`} className="champ-etiquette">Votre objectif</label>
                    <input
                      id={`${p}-quoi`}
                      type="text"
                      value={e.autreQuoi}
                      onChange={(x) => maj(e.cle, { autreQuoi: x.target.value }, "quoi")}
                      placeholder={autreSansChiffre(e.partie) ? "Ex. : créer ma page professionnelle" : "Ex. : mieux faire connaître mon entreprise"}
                      maxLength={160}
                      className="champ-saisie"
                      aria-invalid={err("quoi") ? true : undefined}
                    />
                    {err("quoi") ? <p className="text-xs text-[var(--red-1)]">{err("quoi")}</p> : null}
                  </div>
                ) : null}

                {!e.sansChiffre ? (
                  <>
                    <div className="champ-groupe">
                      <label htmlFor={`${p}-combien`} className="champ-etiquette">De combien</label>
                      <input
                        id={`${p}-combien`}
                        type="text"
                        inputMode="decimal"
                        value={e.combien}
                        onChange={(x) => maj(e.cle, { combien: x.target.value }, "ampleur")}
                        placeholder={o?.exemple.valeur ? `Ex. : ${o.exemple.valeur}` : "Ex. : 10"}
                        className="champ-saisie"
                        aria-invalid={err("ampleur") ? true : undefined}
                      />
                      {err("ampleur") ? <p className="text-xs text-[var(--red-1)]">{err("ampleur")}</p> : null}
                    </div>
                    <div className="champ-groupe">
                      <span className="champ-etiquette">Unité du chiffre</span>
                      <ChoixCases nom={`${p}-unite`} type="radio" legende="Unité du chiffre" options={UNITES} valeurs={[e.unite]} onChange={(v) => maj(e.cle, { unite: v[0] as UniteAmpleur })} />
                    </div>
                    <button type="button" onClick={() => maj(e.cle, { sansChiffre: true }, "ampleur")} className={lien} data-sans-chiffre>
                      Je n&apos;ai pas de chiffre : je décris ce que je veux constater
                    </button>
                  </>
                ) : (
                  <>
                    <div className="champ-groupe">
                      <label htmlFor={`${p}-reussite`} className="champ-etiquette">Comment saurez-vous que c&apos;est atteint ?</label>
                      <input
                        id={`${p}-reussite`}
                        type="text"
                        value={e.reussite}
                        onChange={(x) => maj(e.cle, { reussite: x.target.value }, "reussite")}
                        placeholder={o?.exemple.reussite ? `Ex. : ${o.exemple.reussite}` : "Ex. : je reçois plus de demandes sans y passer plus de temps"}
                        maxLength={200}
                        className="champ-saisie"
                        aria-invalid={err("reussite") ? true : undefined}
                      />
                      {err("reussite") ? <p className="text-xs text-[var(--red-1)]">{err("reussite")}</p> : null}
                    </div>
                    {!o || o.mesure === "chiffre" ? (
                      <button type="button" onClick={() => maj(e.cle, { sansChiffre: false }, "reussite")} className={lien} data-avec-chiffre>
                        J&apos;ai un chiffre : je le renseigne
                      </button>
                    ) : null}
                  </>
                )}

                <div className="champ-groupe">
                  <label htmlFor={`${p}-delai`} className="champ-etiquette">
                    En combien de temps <span className="font-normal text-[var(--text-muted)]">(temps exprimé en mois)</span>
                  </label>
                  <input
                    id={`${p}-delai`}
                    type="text"
                    inputMode="numeric"
                    value={e.delai}
                    onChange={(x) => maj(e.cle, { delai: x.target.value }, "delaiMois")}
                    placeholder={o ? `Ex. : ${o.exemple.delaiMois}` : "Ex. : 3"}
                    className="champ-saisie sm:max-w-[16rem]"
                    aria-invalid={err("delaiMois") ? true : undefined}
                  />
                  {err("delaiMois") ? <p className="text-xs text-[var(--red-1)]">{err("delaiMois")}</p> : null}
                </div>

                <p className="min-h-[1.5rem] text-sm text-[var(--text-muted)]" aria-live="polite">
                  {s ? (
                    <>
                      {plusieurs ? `Objectif ${rang + 1}` : "Votre objectif"} : <span className="text-[var(--text)]">{phraseObjectif(s)}</span>
                      {s.reussite ? <> Réussite : <span className="text-[var(--text)]">{s.reussite}</span></> : null}
                    </>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {erreurs.general ? <p className="text-sm text-[var(--red-1)]">{erreurs.general}</p> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={envoi || entrees.length === 0} className="audit-bouton bouton-eclat rounded-[4px] px-5 py-2.5 transition disabled:opacity-60">
          {envoi ? "Enregistrement…" : plusieurs ? "Enregistrer mes objectifs" : "Enregistrer mon objectif"}
        </button>
        {annulable ? (
          <button type="button" onClick={onAnnuler} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            {initiaux && initiaux.length > 1 ? "Garder mes objectifs actuels" : "Garder l'objectif actuel"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

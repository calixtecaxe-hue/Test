"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoixCases } from "@/components/choix-cases";
import { DELAI_MAX_MOIS, FORMULATION_MAX, verifierVraisemblance, type Ampleur, type ObjectifSaisie, type UniteAmpleur } from "@/lib/audit/objectif";
import { chiffreEtranger, ecartDeParcours, formulationProposee, phraseDe, quoiDeProposition, unitesDe, type ObjectifInitial, type SuiviParcours } from "@/lib/audit/objectifs-agent";
import { lireNombre } from "@/lib/audit/nombre";
import type { ObjectifAgent, ObjectifPersonnel } from "@/lib/donnees/schemas";

const LIBELLES_UNITE: Record<UniteAmpleur, string> = { pourcent: "En pourcentage (%)", euros: "En euros (€)", unites: "En nombre" };
const PRECISION_UNITE: Record<UniteAmpleur, string> = { pourcent: "en %", euros: "en euros", unites: "en nombre" };

export type Propositions = { parties?: { nom: string; detail?: string }[]; personnel: ObjectifPersonnel; objectifs: ObjectifAgent[] };

type Mode = "personnel" | "composition";
// Objectif écrit : un chiffre (et son unité) ou ce que le dirigeant veut constater, et le délai.
type Precision = { combien: string; unite: UniteAmpleur; sansChiffre: boolean; reussite: string; delai: string };
// Chiffre facultatif d'une proposition retenue.
type Chiffre = { combien: string; unite: UniteAmpleur };

const VIDE: Precision = { combien: "", unite: "pourcent", sansChiffre: true, reussite: "", delai: "" };
const enTexte = (n: number) => String(n).replace(".", ",");
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

// Les deux façons de définir l'objectif, de même importance (demande du propriétaire du 29 octobre, textes imposés).
const MODES: { mode: Mode; titre: string; aide: string }[] = [
  { mode: "personnel", titre: "Écrire mon objectif", aide: "Décrivez librement le résultat que vous souhaitez obtenir." },
  { mode: "composition", titre: "Composer mon objectif à partir des propositions", aide: "Sélectionnez les améliorations qui correspondent à votre besoin." },
];

const Coche = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

// Objectif d'un agent dont l'objectif n'a pas forcément de chiffre (RH, Comm). Un objectif par agent (décision du 28 octobre,
// option 1B). Le dirigeant voit d'abord deux choix de même importance, sans présélection (demande du 29 octobre) :
//   - « Écrire mon objectif » ouvre le champ de rédaction, avec une aide et un exemple de l'agent ;
//   - « Composer mon objectif à partir des propositions » ouvre les propositions (en Comm, après « Où en êtes-vous ? »), à
//     sélectionner en une ou plusieurs ; le récapitulatif en dessous permet d'en retirer ou d'en ajouter, de donner un chiffre
//     facultatif à chacune, le délai, puis de relire et de modifier la formulation proposée avant de valider.
// Un seul mode est actif ; le brouillon de l'autre reste dans la page et n'est jamais transmis ni remplacé en silence.
export function ObjectifChoix({
  agent,
  propositions,
  facteurAnnuelMax,
  maxComposition,
  annulable,
  onAnnuler,
  onEnregistre,
  initial,
  suivi,
  publication,
}: {
  agent: string;
  propositions: Propositions;
  facteurAnnuelMax: number;
  // Nombre de propositions retenues au plus (data/objectifs-agents.json, « composition.max »).
  maxComposition: number;
  annulable?: boolean;
  onAnnuler?: () => void;
  onEnregistre?: () => void;
  // Objectif en cours, repris pour être modifié.
  initial?: ObjectifInitial | null;
  // Comm : question qui donne le parcours du questionnaire, et la réponse déjà donnée (avertissement 6C).
  suivi?: SuiviParcours | null;
  publication?: string | null;
}) {
  const router = useRouter();
  const id = useId();
  const parties = propositions.parties ?? [];
  const enParties = parties.length > 0;
  const parId = useMemo(() => new Map(propositions.objectifs.map((o) => [o.id, o])), [propositions]);
  const initialCompose = initial?.mode === "composition" ? initial.composition.filter((c) => parId.has(c.choix)) : [];
  const partieInitiale = enParties ? (parId.get(initialCompose[0]?.choix ?? "")?.groupe ?? initial?.partie ?? null) : null;
  const cle = (p: string | null) => p ?? "";

  const [mode, setMode] = useState<Mode | null>(initial?.mode ?? null);
  // Brouillon de l'objectif écrit.
  const [personnel, setPersonnel] = useState<Precision & { texte: string }>(() =>
    initial?.mode === "personnel"
      ? { combien: initial.ampleur ? enTexte(initial.ampleur.valeur) : "", unite: initial.ampleur?.unite ?? "pourcent", sansChiffre: !initial.ampleur, reussite: initial.reussite ?? "", delai: String(initial.delaiMois), texte: initial.quoi }
      : { ...VIDE, texte: "" },
  );
  // Brouillon de la composition : propositions retenues par partie (Comm), chiffre de chaque proposition ouverte, délai,
  // réussite, formulation modifiée. Tout est gardé quand le dirigeant change de mode ou de partie.
  const [partie, setPartie] = useState<string | null>(partieInitiale);
  const [selections, setSelections] = useState<Record<string, string[]>>(() => (initialCompose.length > 0 ? { [cle(partieInitiale)]: initialCompose.map((c) => c.choix) } : {}));
  const [chiffres, setChiffres] = useState<Record<string, Chiffre>>(() =>
    Object.fromEntries(initialCompose.map((c) => [c.choix, { combien: c.ampleur ? enTexte(c.ampleur.valeur) : "", unite: c.ampleur?.unite ?? unitesDe(parId.get(c.choix)!)[0] ?? "pourcent" }])),
  );
  const [delai, setDelai] = useState(initial?.mode === "composition" ? String(initial.delaiMois) : "");
  const [reussite, setReussite] = useState(initial?.mode === "composition" ? (initial.reussite ?? "") : "");
  // Formulation modifiée par le dirigeant, et la formulation proposée qu'il avait sous les yeux en l'écrivant (null : la
  // formulation proposée est suivie telle quelle).
  const [formulation, setFormulation] = useState<{ texte: string; base: string } | null>(() => {
    if (initial?.mode !== "composition" || !initial.formulation?.modifiee || initialCompose.length === 0) return null;
    const base = formulationProposee(initialCompose.map((c) => ({ choisi: parId.get(c.choix)!, ...(c.ampleur ? { ampleur: c.ampleur } : {}) })), initial.delaiMois);
    return { texte: initial.formulation.finale, base };
  });
  // Proposition refusée (plafond atteint, ou recouvrement avec une proposition déjà retenue) : le message s'affiche sur sa carte.
  const [refus, setRefus] = useState<{ id: string; message: string } | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  // Un choix fait à la souris ouvre son contenu et y place le curseur ; au clavier, les flèches parcourent les choix sans
  // que le curseur saute ailleurs (Tab mène ensuite au contenu ouvert).
  const parPointeur = useRef(false);
  const [focus, setFocus] = useState<{ cible: string; fois: number } | null>(null);
  const viser = (cible: string) => setFocus((f) => ({ cible, fois: (f?.fois ?? 0) + 1 }));
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(focus.cible);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  }, [focus]);

  const effacer = (...cles: string[]) => setErreurs((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !cles.includes(k) && k !== "general")));

  function choisirMode(m: Mode) {
    const souris = parPointeur.current;
    parPointeur.current = false;
    setMode(m);
    setErreurs({});
    if (souris) viser(m === "personnel" ? `${id}-texte` : enParties && !partie ? `${id}-partie-legende` : `${id}-choix-legende`);
  }
  function changerPartie(nom: string) {
    if (nom === partie) return;
    setPartie(nom);
    setRefus(null);
    effacer("partie", "choix");
  }

  // --- Composition ---------------------------------------------------------------------------------------------------
  const visibles = propositions.objectifs.filter((o) => !enParties || (o.groupe ?? "") === partie);
  const selection = selections[cle(partie)] ?? [];
  // Dans l'ordre de la liste : aucune proposition n'est présentée comme principale.
  const retenues = visibles.filter((o) => selection.includes(o.id));
  const chiffreDe = (o: ObjectifAgent): { ampleur?: Ampleur; invalide: boolean } => {
    const c = chiffres[o.id];
    if (o.mesure !== "chiffre" || !c || c.combien.trim() === "") return { invalide: false };
    const v = lireNombre(c.combien);
    if (v === null || v <= 0) return { invalide: true };
    return { ampleur: { valeur: v, unite: o.gabarit ? unitesDe(o)[0] : c.unite }, invalide: false };
  };
  const lues = retenues.map((o) => ({ choisi: o, ...chiffreDe(o) }));
  const mois = lireNombre(delai);
  const delaiValide = mois !== null && Number.isInteger(mois) && mois >= 1 && mois <= DELAI_MAX_MOIS;
  const proposee = retenues.length > 0 && delaiValide && lues.every((l) => !l.invalide) ? formulationProposee(lues.map((l) => ({ choisi: l.choisi, ...(l.ampleur ? { ampleur: l.ampleur } : {}) })), mois!) : null;
  const aRevoir = formulation !== null && proposee !== null && formulation.base !== proposee;
  const avecChiffre = lues.some((l) => l.ampleur);

  function basculer(o: ObjectifAgent) {
    const k = cle(partie);
    const actuelle = selections[k] ?? [];
    if (actuelle.includes(o.id)) {
      setSelections((s) => ({ ...s, [k]: actuelle.filter((x) => x !== o.id) }));
      setRefus(null);
      effacer("choix", `ampleur-${o.id}`);
      return;
    }
    if (actuelle.length >= maxComposition) {
      setRefus({ id: o.id, message: `Vous avez retenu ${maxComposition} propositions, le maximum pour un objectif : retirez-en une pour retenir celle-ci.` });
      return;
    }
    const autre = actuelle.map((x) => parId.get(x)).find((x) => x && ((o.exclut ?? []).includes(x.id) || (x.exclut ?? []).includes(o.id)));
    if (autre) {
      setRefus({ id: o.id, message: `Cette proposition recouvre « ${autre.libelle} », que vous avez déjà retenue : gardez l'une ou l'autre.` });
      return;
    }
    setSelections((s) => ({ ...s, [k]: [...actuelle, o.id] }));
    setChiffres((c) => (c[o.id] ? c : { ...c, [o.id]: { combien: "", unite: unitesDe(o)[0] ?? "pourcent" } }));
    setRefus(null);
    effacer("choix");
  }
  function retirer(o: ObjectifAgent) {
    basculer(o);
    viser(`${id}-recap-titre`);
  }
  function majChiffre(oid: string, champ: Partial<Chiffre>) {
    setChiffres((c) => ({ ...c, [oid]: { ...c[oid], ...champ } }));
    effacer(`ampleur-${oid}`, "formulation");
  }
  function majFormulation(texte: string) {
    // Revenue mot pour mot à la formulation proposée : la formulation proposée est de nouveau suivie.
    if (proposee !== null && texte.trim() === proposee) setFormulation(null);
    else setFormulation((f) => ({ texte, base: proposee ?? f?.base ?? "" }));
    effacer("formulation");
  }

  // --- Objectif écrit --------------------------------------------------------------------------------------------------
  function majPersonnel(champ: Partial<Precision & { texte: string }>, erreur: string) {
    setPersonnel((p) => ({ ...p, ...champ }));
    effacer(erreur);
  }
  function saisiePersonnelle(): ObjectifSaisie | null {
    const p = personnel;
    const quoi = p.texte.trim();
    const valeur = lireNombre(p.combien);
    const m = lireNombre(p.delai);
    if (quoi.length < 3 || m === null || !Number.isInteger(m) || m < 1 || m > DELAI_MAX_MOIS) return null;
    if (!p.sansChiffre && (valeur === null || valeur <= 0)) return null;
    if (p.sansChiffre && p.reussite.trim().length < 3) return null;
    return { quoi, ...(!p.sansChiffre && valeur !== null ? { ampleur: { valeur, unite: p.unite } } : { reussite: p.reussite.trim() }), delaiMois: m };
  }

  // --- Contrôle et envoi -----------------------------------------------------------------------------------------------
  function verifier(): Record<string, string> {
    if (!mode) return { mode: "Choisissez d'écrire votre objectif, ou de le composer à partir des propositions." };
    const manques: Record<string, string> = {};
    if (mode === "personnel") {
      const p = personnel;
      const valeur = lireNombre(p.combien);
      const m = lireNombre(p.delai);
      if (p.texte.trim().length < 3) manques.texte = "Décrivez votre objectif en quelques mots pour continuer.";
      if (!p.sansChiffre && (valeur === null || valeur <= 0)) manques.ampleur = "Indiquez un nombre supérieur à zéro, ou choisissez « Je n'ai pas de chiffre ».";
      if (p.sansChiffre && p.reussite.trim().length < 3) manques.reussite = "Décrivez ce que vous voulez constater quand ce sera atteint.";
      if (m === null || !Number.isInteger(m) || m < 1) manques.delaiMois = "Indiquez en combien de mois, avec un nombre entier.";
      else if (m > DELAI_MAX_MOIS) manques.delaiMois = `Le délai ne dépasse pas ${DELAI_MAX_MOIS} mois (10 ans).`;
      const s = saisiePersonnelle();
      if (s && Object.keys(manques).length === 0) {
        const v = verifierVraisemblance(s, facteurAnnuelMax);
        if (!v.ok) manques[v.champ] = v.message;
      }
      return manques;
    }
    if (enParties && !partie) return { partie: "Choisissez d'abord où vous en êtes : les propositions s'afficheront ensuite." };
    if (retenues.length === 0) return { choix: "Sélectionnez au moins une proposition, ou choisissez « Écrire mon objectif »." };
    for (const l of lues) if (l.invalide) manques[`ampleur-${l.choisi.id}`] = "Indiquez un nombre supérieur à zéro, ou laissez ce champ vide.";
    if (mois === null || !Number.isInteger(mois) || mois < 1) manques.delai = "Indiquez en combien de mois, avec un nombre entier.";
    else if (mois > DELAI_MAX_MOIS) manques.delai = `Le délai ne dépasse pas ${DELAI_MAX_MOIS} mois (10 ans).`;
    if (!avecChiffre && reussite.trim().length < 3) manques.reussite = "Aucune de vos propositions n'a de chiffre : décrivez ce que vous voulez constater quand ce sera atteint.";
    else if (reussite.trim().length > 0 && reussite.trim().length < 3) manques.reussite = "Décrivez en quelques mots ce que vous voulez constater, ou laissez ce champ vide.";
    if (Object.keys(manques).length === 0) {
      for (const l of lues) {
        if (!l.ampleur || l.choisi.gabarit) continue;
        const v = verifierVraisemblance({ quoi: quoiDeProposition(l.choisi), ampleur: l.ampleur, delaiMois: mois! }, facteurAnnuelMax);
        if (!v.ok) manques[v.champ === "ampleur" ? `ampleur-${l.choisi.id}` : "delai"] = retenues.length > 1 ? `« ${l.choisi.libelle} » : ${v.message}` : v.message;
      }
    }
    if (formulation && proposee !== null) {
      const t = formulation.texte.trim();
      if (aRevoir) manques.formulation = "Vos propositions ont changé depuis que vous avez modifié la formulation : relisez-la, puis gardez-la ou reprenez la formulation proposée.";
      else if (t.length < 3) manques.formulation = "Écrivez la formulation de votre objectif, ou reprenez celle qui vous est proposée.";
      else if (t.length > FORMULATION_MAX) manques.formulation = `La formulation ne dépasse pas ${FORMULATION_MAX} caractères.`;
      else {
        const etranger = chiffreEtranger(t, proposee);
        if (etranger) manques.formulation = `Le chiffre « ${etranger} » de votre formulation ne vient ni de vos propositions ni de votre délai : corrigez-le dans la proposition concernée, ou retirez-le de la formulation.`;
      }
    }
    return manques;
  }

  function corps(): unknown {
    if (mode === "personnel") return { mode: "personnel", ...saisiePersonnelle() };
    return {
      mode: "composition",
      composition: lues.map((l) => ({ choix: l.choisi.id, ...(l.ampleur ? { ampleur: l.ampleur } : {}) })),
      ...(formulation ? { formulation: formulation.texte.trim() } : {}),
      ...(reussite.trim() ? { reussite: reussite.trim() } : {}),
      ...(partie ? { partie } : {}),
      delaiMois: mois,
    };
  }

  const cibleDe = (champ: string) => {
    if (champ === "mode" || champ === "partie" || champ === "choix") return `${id}-${champ}-legende`;
    if (mode === "composition") return champ === "delai" || champ === "reussite" ? `${id}-c-${champ}` : `${id}-${champ}`;
    return `${id}-${champ}`;
  };

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault();
    const manques = verifier();
    const premier = Object.keys(manques)[0];
    if (premier) {
      setErreurs({ ...manques, general: "Complétez ce qui est signalé pour continuer." });
      viser(cibleDe(premier));
      return;
    }
    setEnvoi(true);
    const r = await fetch("/api/audit/objectif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, objectifs: [corps()] }),
    }).catch(() => null);
    if (r?.ok) {
      onEnregistre?.();
      router.refresh();
      return;
    }
    const recu = (await r?.json().catch(() => null)) as { erreur?: string; champ?: string; composante?: string } | null;
    let champ: string | null = null;
    if (mode === "personnel") champ = recu?.champ === "quoi" ? "texte" : recu?.champ && ["ampleur", "reussite", "delaiMois", "texte"].includes(recu.champ) ? recu.champ : null;
    else if (recu?.champ === "ampleur" && recu.composante) champ = `ampleur-${recu.composante}`;
    else if (recu?.champ === "delaiMois") champ = "delai";
    else if (recu?.champ && ["choix", "reussite", "formulation"].includes(recu.champ)) champ = recu.champ;
    setErreurs({ [champ ?? "general"]: recu?.erreur ?? "Votre objectif n'a pas pu être enregistré. Réessayez.", ...(champ ? { general: "Complétez ce qui est signalé pour continuer." } : {}) });
    if (champ) viser(cibleDe(champ));
    setEnvoi(false);
  }

  const lien = "audit-lien w-fit text-left text-sm text-[var(--agent)] hover:underline";
  const erreur = (k: string) => (erreurs[k] ? <p className="text-sm text-[var(--red-1)]" id={`${id}-${k}-erreur`}>{erreurs[k]}</p> : null);
  const decrit = (k: string, aide?: string) => [aide, erreurs[k] ? `${id}-${k}-erreur` : undefined].filter(Boolean).join(" ") || undefined;
  const ecart = mode === "composition" ? ecartDeParcours(suivi ?? null, partie, publication) : null;

  const champDelai = (valeur: string, onChange: (v: string) => void, k: string, cible: string, exemple: number) => (
    <div className="champ-groupe">
      <label htmlFor={cible} className="champ-etiquette">
        En combien de temps ? <span className="font-normal text-[var(--text-muted)]">(en mois)</span>
      </label>
      <input id={cible} type="text" inputMode="numeric" value={valeur} onChange={(x) => onChange(x.target.value)} placeholder={`Ex. : ${exemple}`} className="champ-saisie sm:max-w-[16rem]" aria-invalid={erreurs[k] ? true : undefined} aria-describedby={decrit(k)} />
      {erreur(k)}
    </div>
  );

  // Objectif écrit : le texte, le chiffre et son unité ou ce que le dirigeant veut constater, puis le délai ; la phrase qui sera
  // enregistrée s'affiche au fur et à mesure.
  function rendrePersonnel() {
    const p = personnel;
    const s = saisiePersonnelle();
    const unites: UniteAmpleur[] = ["pourcent", "euros", "unites"];
    return (
      <div className="objectif-champs objectif-champs-perso" data-detail data-objectif="personnel">
        <div className="champ-groupe">
          <label htmlFor={`${id}-texte`} className="champ-etiquette">Votre objectif</label>
          <p id={`${id}-texte-aide`} className="text-sm text-[var(--text-muted)]">
            {propositions.personnel.aide} Exemple : {propositions.personnel.exemple}.
          </p>
          <input id={`${id}-texte`} type="text" value={p.texte} onChange={(x) => majPersonnel({ texte: x.target.value }, "texte")} maxLength={160} className="champ-saisie" aria-describedby={decrit("texte", `${id}-texte-aide`)} aria-invalid={erreurs.texte ? true : undefined} />
          {erreur("texte")}
        </div>

        {!p.sansChiffre ? (
          <>
            <div className="champ-groupe">
              <label htmlFor={`${id}-ampleur`} className="champ-etiquette">De combien ?</label>
              <input id={`${id}-ampleur`} type="text" inputMode="decimal" value={p.combien} onChange={(x) => majPersonnel({ combien: x.target.value }, "ampleur")} className="champ-saisie sm:max-w-[16rem]" aria-invalid={erreurs.ampleur ? true : undefined} aria-describedby={decrit("ampleur")} />
              {erreur("ampleur")}
            </div>
            <div className="champ-groupe">
              <span className="champ-etiquette">Unité du chiffre</span>
              <ChoixCases nom={`${id}-unite`} type="radio" legende="Unité du chiffre" options={unites.map((u) => ({ valeur: u, libelle: LIBELLES_UNITE[u] }))} valeurs={[p.unite]} onChange={(v) => majPersonnel({ unite: v[0] as UniteAmpleur }, "ampleur")} />
            </div>
            <button type="button" onClick={() => majPersonnel({ sansChiffre: true }, "ampleur")} className={lien} data-sans-chiffre>
              Je n&apos;ai pas de chiffre : je décris ce que je veux constater
            </button>
          </>
        ) : (
          <>
            <div className="champ-groupe">
              <label htmlFor={`${id}-reussite`} className="champ-etiquette">Comment saurez-vous que c&apos;est atteint ?</label>
              <input id={`${id}-reussite`} type="text" value={p.reussite} onChange={(x) => majPersonnel({ reussite: x.target.value }, "reussite")} placeholder={`Ex. : ${propositions.personnel.exempleReussite}`} maxLength={200} className="champ-saisie" aria-invalid={erreurs.reussite ? true : undefined} aria-describedby={decrit("reussite")} />
              {erreur("reussite")}
            </div>
            <button type="button" onClick={() => majPersonnel({ sansChiffre: false }, "reussite")} className={lien} data-avec-chiffre>
              J&apos;ai un chiffre : je le renseigne
            </button>
          </>
        )}

        {champDelai(p.delai, (v) => majPersonnel({ delai: v }, "delaiMois"), "delaiMois", `${id}-delaiMois`, 6)}

        <p className="min-h-[1.5rem] text-sm text-[var(--text-muted)]" aria-live="polite" data-apercu>
          {s ? (
            <>
              Votre objectif : <span className="text-[var(--text)]">{phraseDe(s, undefined)}</span>
              {s.reussite ? <> · Réussite : <span className="text-[var(--text)]">{s.reussite}</span></> : null}
            </>
          ) : null}
        </p>
      </div>
    );
  }

  // Une carte à cocher : titre, précision, et l'état retenu écrit (coche, « Retenue », bordure épaisse).
  function carteProposition(o: ObjectifAgent) {
    const retenue = selection.includes(o.id);
    const recouvre = retenue ? undefined : retenues.find((x) => (o.exclut ?? []).includes(x.id) || (x.exclut ?? []).includes(o.id));
    return (
      <li key={o.id} className={`objectif-carte objectif-carte-case${retenue ? " choisie" : ""}`} data-carte={o.id}>
        <label className="objectif-carte-tete">
          <input type="checkbox" name={`${id}-choix`} value={o.id} checked={retenue} onChange={() => basculer(o)} className="case-entree" aria-describedby={refus?.id === o.id ? `${id}-refus` : undefined} />
          <span className="objectif-marque" aria-hidden="true">{retenue ? <Coche /> : null}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="objectif-titre">{o.libelle}</span>
            {o.detail ? <span className="text-sm text-[var(--text-muted)]">{o.detail}</span> : null}
            {recouvre ? <span className="text-sm text-[var(--text-muted)]" data-recouvre>Recouvre « {recouvre.libelle} », déjà retenue.</span> : null}
          </span>
          {retenue ? <span className="objectif-pastille">Retenue</span> : null}
        </label>
        {refus?.id === o.id ? (
          <p id={`${id}-refus`} className="objectif-refus" role="status" data-refus>
            {refus.message}
          </p>
        ) : null}
      </li>
    );
  }

  // Le récapitulatif de l'objectif composé : les propositions retenues (à retirer, avec leur chiffre facultatif), le délai, ce
  // que le dirigeant veut constater, puis la formulation proposée, modifiable.
  function rendreRecapitulatif() {
    const exempleDelai = retenues.length > 0 ? Math.max(...retenues.map((o) => o.exemple.delaiMois)) : 6;
    return (
      <section className="objectif-recap" aria-labelledby={`${id}-recap-titre`} data-recapitulatif>
        <h3 id={`${id}-recap-titre`} tabIndex={-1} className="objectif-recap-titre">
          Votre objectif
        </h3>
        {retenues.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]" data-recap-vide>
            Aucune proposition retenue pour l&apos;instant. Sélectionnez ci-dessus celles qui correspondent à votre besoin : une seule peut suffire.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              {retenues.length === 1 ? "Composé d'une proposition." : `Composé de ${retenues.length} propositions, sans ordre d'importance.`} Vous pouvez en retirer ou en ajouter, puis relire la formulation.
            </p>
            <ul className="objectif-recap-liste">
              {retenues.map((o) => {
                const c = chiffres[o.id] ?? { combien: "", unite: unitesDe(o)[0] ?? "pourcent" };
                const unites = unitesDe(o);
                const k = `ampleur-${o.id}`;
                return (
                  <li key={o.id} data-retenue={o.id}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="objectif-titre">{o.libelle}</p>
                      <button type="button" onClick={() => retirer(o)} className="ligne-retirer shrink-0 whitespace-nowrap" aria-label={`Retirer « ${o.libelle} »`} data-retirer>
                        Retirer
                      </button>
                    </div>
                    {o.mesure === "chiffre" ? (
                      <div className="mt-3 flex flex-col gap-3">
                        <div className="champ-groupe">
                          <label htmlFor={`${id}-${k}`} className="champ-etiquette">
                            {o.question ?? (unites.length === 1 ? `De combien, ${PRECISION_UNITE[unites[0]]} ?` : "De combien ?")}
                          </label>
                          <p id={`${id}-${k}-aide`} className="text-sm text-[var(--text-muted)]">Facultatif : laissez vide si vous n&apos;avez pas de chiffre.</p>
                          <input id={`${id}-${k}`} type="text" inputMode="decimal" value={c.combien} onChange={(x) => majChiffre(o.id, { combien: x.target.value })} className="champ-saisie sm:max-w-[16rem]" aria-invalid={erreurs[k] ? true : undefined} aria-describedby={decrit(k, `${id}-${k}-aide`)} />
                          {erreur(k)}
                        </div>
                        {!o.gabarit && unites.length > 1 && c.combien.trim() !== "" ? (
                          <div className="champ-groupe">
                            <span className="champ-etiquette">Unité du chiffre</span>
                            <ChoixCases nom={`${id}-unite-${o.id}`} type="radio" legende={`Unité du chiffre : ${o.libelle}`} options={unites.map((u) => ({ valeur: u, libelle: o.libellesUnites?.[u] ? majuscule(o.libellesUnites[u]!) : LIBELLES_UNITE[u] }))} valeurs={[c.unite]} onChange={(v) => majChiffre(o.id, { unite: v[0] as UniteAmpleur })} />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">Sans chiffre : son avancement se mesurera à ce que vous déclarerez aux points d&apos;étape.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <button type="button" onClick={() => viser(`${id}-choix-legende`)} className={lien} data-ajouter>
          {retenues.length === 0 ? "Voir les propositions" : "Ajouter une proposition"}
        </button>

        {retenues.length > 0 ? (
          <>
            {champDelai(
              delai,
              (v) => {
                setDelai(v);
                effacer("delai", "formulation");
              },
              "delai",
              `${id}-c-delai`,
              exempleDelai,
            )}
            <div className="champ-groupe">
              <label htmlFor={`${id}-c-reussite`} className="champ-etiquette">
                Comment saurez-vous que c&apos;est atteint ? {avecChiffre ? <span className="font-normal text-[var(--text-muted)]">(facultatif)</span> : null}
              </label>
              <input
                id={`${id}-c-reussite`}
                type="text"
                value={reussite}
                onChange={(x) => {
                  setReussite(x.target.value);
                  effacer("reussite");
                }}
                placeholder={`Ex. : ${retenues[0].exemple.reussite ?? propositions.personnel.exempleReussite}`}
                maxLength={200}
                className="champ-saisie"
                aria-invalid={erreurs.reussite ? true : undefined}
                aria-describedby={decrit("reussite")}
              />
              {erreur("reussite")}
            </div>
            <div className="champ-groupe" data-formulation>
              <label htmlFor={`${id}-formulation`} className="champ-etiquette">Formulation de votre objectif</label>
              <p id={`${id}-formulation-aide`} className="text-sm text-[var(--text-muted)]">
                {formulation ? "Vous avez modifié cette formulation : elle sera enregistrée telle que vous l'avez écrite." : "Rédigée à partir de vos seules propositions et de votre délai. Vous pouvez la modifier."}
              </p>
              {proposee !== null || formulation ? (
                <textarea
                  id={`${id}-formulation`}
                  value={formulation ? formulation.texte : (proposee ?? "")}
                  onChange={(x) => majFormulation(x.target.value)}
                  rows={3}
                  maxLength={FORMULATION_MAX}
                  className="champ-saisie"
                  aria-invalid={erreurs.formulation ? true : undefined}
                  aria-describedby={decrit("formulation", `${id}-formulation-aide`)}
                  data-modifiee={formulation ? "oui" : "non"}
                />
              ) : (
                <p className="text-sm text-[var(--text-muted)]" data-formulation-attente>
                  La formulation s&apos;affiche dès que le délai est indiqué{lues.some((l) => l.invalide) ? " et que vos chiffres sont corrects" : ""}.
                </p>
              )}
              {aRevoir ? (
                <div className="note-ecart flex flex-col gap-2" role="status" data-formulation-a-revoir>
                  <p>Vos propositions ont changé depuis que vous avez modifié la formulation. Relisez-la.</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <button type="button" className={lien} onClick={() => { setFormulation((f) => (f ? { ...f, base: proposee! } : f)); effacer("formulation"); }} data-garder-formulation>
                      Garder ma formulation
                    </button>
                    <button type="button" className={lien} onClick={() => { setFormulation(null); effacer("formulation"); }} data-reprendre-formulation>
                      Reprendre la formulation proposée
                    </button>
                  </div>
                </div>
              ) : formulation && proposee !== null ? (
                <button type="button" className={lien} onClick={() => { setFormulation(null); effacer("formulation"); }} data-reprendre-formulation>
                  Reprendre la formulation proposée
                </button>
              ) : null}
              {erreur("formulation")}
            </div>
          </>
        ) : null}
      </section>
    );
  }

  return (
    <form onSubmit={envoyer} noValidate className="mt-6 flex flex-col gap-6" data-objectif-choix>
      <fieldset className="flex flex-col gap-3" data-modes aria-describedby={erreurs.mode ? `${id}-mode-erreur` : undefined}>
        <legend id={`${id}-mode-legende`} tabIndex={-1} className="sr-only">Comment voulez-vous définir votre objectif ?</legend>
        <ul className="objectif-modes">
          {MODES.map((m) => (
            <li key={m.mode} className={`objectif-mode${mode === m.mode ? " choisi" : ""}`} data-mode={m.mode}>
              <label className="objectif-mode-tete" onPointerDown={() => (parPointeur.current = true)}>
                <input type="radio" name={`${id}-mode`} value={m.mode} checked={mode === m.mode} onChange={() => choisirMode(m.mode)} className="case-entree" />
                <span className="objectif-marque" aria-hidden="true">{mode === m.mode ? <Coche /> : null}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="objectif-mode-titre">{m.titre}</span>
                  <span className="text-sm text-[var(--text-muted)]">{m.aide}</span>
                </span>
                {mode === m.mode ? <span className="objectif-pastille">Choisi</span> : null}
              </label>
            </li>
          ))}
        </ul>
        {erreur("mode")}
      </fieldset>

      {mode === "composition" ? (
        <div className="flex flex-col gap-6" data-mode-contenu="composition">
          {enParties ? (
            <fieldset className="flex flex-col gap-3" data-parties aria-describedby={erreurs.partie ? `${id}-partie-erreur` : undefined}>
              <legend id={`${id}-partie-legende`} tabIndex={-1} className="champ-etiquette mb-2">Où en êtes-vous ?</legend>
              <ul className="objectif-cartes objectif-parties">
                {parties.map((pt) => {
                  const choisie = partie === pt.nom;
                  return (
                    <li key={pt.nom} className={`objectif-carte${choisie ? " choisie" : ""}`} data-partie={pt.nom}>
                      <label className="objectif-carte-tete">
                        <input type="radio" name={`${id}-partie`} value={pt.nom} checked={choisie} onChange={() => changerPartie(pt.nom)} className="case-entree" />
                        <span className="objectif-marque" aria-hidden="true">{choisie ? <Coche /> : null}</span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="objectif-titre">{pt.nom}</span>
                          {pt.detail ? <span className="text-sm text-[var(--text-muted)]">{pt.detail}</span> : null}
                        </span>
                        {choisie ? <span className="objectif-pastille">Choisi</span> : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
              {erreur("partie")}
              {ecart ? <p className="note-ecart" role="note" data-ecart-partie>{ecart}</p> : null}
            </fieldset>
          ) : null}
          {!enParties || partie ? (
            <>
              <fieldset className="flex flex-col gap-3" data-propositions aria-describedby={[`${id}-choix-aide`, erreurs.choix ? `${id}-choix-erreur` : ""].filter(Boolean).join(" ")}>
                <legend id={`${id}-choix-legende`} tabIndex={-1} className="champ-etiquette mb-1">Les propositions</legend>
                <p id={`${id}-choix-aide`} className="text-sm text-[var(--text-muted)]">
                  Cochez une ou plusieurs propositions (jusqu&apos;à {maxComposition}). Elles forment ensemble un seul objectif.
                </p>
                <ul className="objectif-cartes">{visibles.map(carteProposition)}</ul>
                {erreur("choix")}
              </fieldset>
              {rendreRecapitulatif()}
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Choisissez d&apos;abord où vous en êtes : les propositions s&apos;afficheront ensuite.</p>
          )}
        </div>
      ) : mode === "personnel" ? (
        <div className="objectif-entree" data-mode-contenu="personnel">
          {rendrePersonnel()}
        </div>
      ) : null}

      <div className="objectif-actions">
        {erreurs.general ? <p className="w-full text-sm text-[var(--red-1)]" role="alert">{erreurs.general}</p> : null}
        {mode === "composition" ? (
          <p className="w-full text-sm text-[var(--text-muted)] sm:w-auto" aria-live="polite" data-compte>
            {retenues.length === 0 ? "Aucune proposition retenue" : `${pluriel(retenues.length, "proposition")} ${retenues.length > 1 ? "retenues" : "retenue"}`}
          </p>
        ) : null}
        <button type="submit" disabled={envoi} className="audit-bouton bouton-eclat rounded-[4px] px-5 py-2.5 transition disabled:opacity-60">
          {envoi ? "Enregistrement…" : "Valider mon objectif"}
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

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { classeChamp } from "@/components/champ";

// Date au format français (jj/mm/aaaa) avec un calendrier aux couleurs du site,
// à la place du sélecteur natif du navigateur, qui ne se stylise pas. Le champ
// caché envoie la date au format aaaa-mm-jj, comme le faisait <input type="date">.
// Une date de création d'entreprise ne peut pas être dans le futur.

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const JOURS = ["lu", "ma", "me", "je", "ve", "sa", "di"];
const ANNEE_MINIMALE = 1900;

type Jour = { a: number; m: number; j: number }; // m de 0 à 11
type Vue = "jours" | "mois" | "annees";

const cle = (d: Jour) => d.a * 10000 + d.m * 100 + d.j;
const deux = (n: number) => String(n).padStart(2, "0");
const enTexte = (d: Jour) => `${deux(d.j)}/${deux(d.m + 1)}/${d.a}`;
const enIso = (d: Jour) => `${d.a}-${deux(d.m + 1)}-${deux(d.j)}`;

function aujourdhui(): Jour {
  const n = new Date();
  return { a: n.getFullYear(), m: n.getMonth(), j: n.getDate() };
}

function ajouterJours(d: Jour, n: number): Jour {
  const x = new Date(d.a, d.m, d.j + n);
  return { a: x.getFullYear(), m: x.getMonth(), j: x.getDate() };
}

function ajouterMois(d: Jour, n: number): Jour {
  const x = new Date(d.a, d.m + n, 1);
  const dernier = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  return {
    a: x.getFullYear(),
    m: x.getMonth(),
    j: Math.min(d.j, dernier),
  };
}

function analyser(texte: string): Jour | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texte);
  if (!m) return null;
  const j = Number(m[1]);
  const mois = Number(m[2]) - 1;
  const a = Number(m[3]);
  const x = new Date(a, mois, j);
  if (x.getFullYear() !== a || x.getMonth() !== mois || x.getDate() !== j) {
    return null;
  }
  return a >= ANNEE_MINIMALE ? { a, m: mois, j } : null;
}

// Insère les « / » pendant la frappe : 15032020 devient 15/03/2020.
function masquer(saisie: string): string {
  const c = saisie.replace(/\D/g, "").slice(0, 8);
  if (c.length <= 2) return c;
  if (c.length <= 4) return `${c.slice(0, 2)}/${c.slice(2)}`;
  return `${c.slice(0, 2)}/${c.slice(2, 4)}/${c.slice(4)}`;
}

// 42 cases, la semaine commençant le lundi.
function casesDuMois(a: number, m: number): Jour[] {
  const decalage = (new Date(a, m, 1).getDay() + 6) % 7;
  const debut: Jour = { a, m, j: 1 };
  return Array.from({ length: 42 }, (_, i) =>
    ajouterJours(debut, i - decalage),
  );
}

function Chevron({ sens }: { sens: "gauche" | "droite" | "bas" }) {
  const chemin =
    sens === "gauche"
      ? "m15 6-6 6 6 6"
      : sens === "droite"
        ? "m9 6 6 6-6 6"
        : "m6 9 6 6 6-6";
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={chemin} />
    </svg>
  );
}

export function ChampDate({
  id,
  name,
  required,
}: {
  id: string;
  name: string;
  required?: boolean;
}) {
  const aujour = aujourdhui();
  const [texte, setTexte] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [vue, setVue] = useState<Vue>("jours");
  const [affiche, setAffiche] = useState({ a: aujour.a, m: aujour.m });
  const [focus, setFocus] = useState<Jour>(aujour);
  const racine = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const focaliser = useRef(false);
  const idDialogue = useId();

  const analyse = analyser(texte);
  const choisi = analyse && cle(analyse) <= cle(aujour) ? analyse : null;

  useEffect(() => {
    champ.current?.setCustomValidity(
      texte && !choisi
        ? "Indiquez une date valide, passée, au format jj/mm/aaaa."
        : "",
    );
  }, [texte, choisi]);

  useEffect(() => {
    if (!ouvert) return;
    function dehors(event: MouseEvent) {
      if (!racine.current?.contains(event.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert || vue !== "jours" || !focaliser.current) return;
    focaliser.current = false;
    racine.current
      ?.querySelector<HTMLButtonElement>(`[data-jour="${cle(focus)}"]`)
      ?.focus();
  }, [ouvert, vue, focus, affiche]);

  function ouvrir() {
    const depart = choisi ?? aujour;
    setAffiche({ a: depart.a, m: depart.m });
    setFocus(depart);
    setVue("jours");
    focaliser.current = true;
    setOuvert(true);
  }

  function fermer(rendreLeFocus: boolean) {
    setOuvert(false);
    if (rendreLeFocus) champ.current?.focus();
  }

  function surTexte(event: React.ChangeEvent<HTMLInputElement>) {
    const valeur = masquer(event.target.value);
    setTexte(valeur);
    const d = analyser(valeur);
    if (d) setAffiche({ a: d.a, m: d.m });
  }

  function prendre(d: Jour) {
    if (cle(d) > cle(aujour)) return;
    setTexte(enTexte(d));
    fermer(true);
  }

  function deplacer(nouveau: Jour) {
    const borne = cle(nouveau) > cle(aujour) ? aujour : nouveau;
    setFocus(borne);
    setAffiche({ a: borne.a, m: borne.m });
    focaliser.current = true;
  }

  function surTouche(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      fermer(true);
      return;
    }
    if (vue !== "jours") return;
    const pas: Record<string, () => Jour> = {
      ArrowLeft: () => ajouterJours(focus, -1),
      ArrowRight: () => ajouterJours(focus, 1),
      ArrowUp: () => ajouterJours(focus, -7),
      ArrowDown: () => ajouterJours(focus, 7),
      PageUp: () => ajouterMois(focus, -1),
      PageDown: () => ajouterMois(focus, 1),
    };
    const suite = pas[event.key];
    if (suite) {
      event.preventDefault();
      deplacer(suite());
    }
  }

  const moisSuivantPossible =
    affiche.a * 12 + affiche.m < aujour.a * 12 + aujour.m;
  const debutAnnees = Math.floor(affiche.a / 12) * 12;

  function precedent() {
    if (vue === "jours") {
      const x = new Date(affiche.a, affiche.m - 1, 1);
      setAffiche({ a: x.getFullYear(), m: x.getMonth() });
    } else if (vue === "mois") {
      setAffiche({ a: affiche.a - 1, m: affiche.m });
    } else {
      setAffiche({ a: affiche.a - 12, m: affiche.m });
    }
  }

  function suivant() {
    if (vue === "jours") {
      const x = new Date(affiche.a, affiche.m + 1, 1);
      setAffiche({ a: x.getFullYear(), m: x.getMonth() });
    } else if (vue === "mois") {
      setAffiche({ a: affiche.a + 1, m: affiche.m });
    } else {
      setAffiche({ a: affiche.a + 12, m: affiche.m });
    }
  }

  const suivantPossible =
    vue === "jours"
      ? moisSuivantPossible
      : vue === "mois"
        ? affiche.a < aujour.a
        : debutAnnees + 12 <= aujour.a;
  const precedentPossible =
    vue === "jours"
      ? affiche.a * 12 + affiche.m > ANNEE_MINIMALE * 12
      : vue === "mois"
        ? affiche.a > ANNEE_MINIMALE
        : debutAnnees > ANNEE_MINIMALE;

  return (
    <div ref={racine} className="date-champ" onKeyDown={surTouche}>
      <input type="hidden" name={name} value={choisi ? enIso(choisi) : ""} />
      <input
        ref={champ}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="jj/mm/aaaa"
        maxLength={10}
        required={required}
        value={texte}
        onChange={surTexte}
        className={`${classeChamp} date-saisie`}
      />
      <button
        type="button"
        className="date-bouton"
        aria-label="Ouvrir le calendrier"
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-controls={idDialogue}
        onClick={() => (ouvert ? fermer(false) : ouvrir())}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>

      {ouvert ? (
        <div
          id={idDialogue}
          role="dialog"
          aria-label="Choisir une date"
          className="cal"
        >
          <div className="cal-tete">
            <button
              type="button"
              className="cal-titre"
              onClick={() =>
                setVue(
                  vue === "jours"
                    ? "mois"
                    : vue === "mois"
                      ? "annees"
                      : "jours",
                )
              }
            >
              {vue === "jours"
                ? `${MOIS[affiche.m]} ${affiche.a}`
                : vue === "mois"
                  ? affiche.a
                  : `${debutAnnees} – ${debutAnnees + 11}`}
              <Chevron sens="bas" />
            </button>
            <div className="cal-fleches">
              <button
                type="button"
                className="cal-nav"
                aria-label="Précédent"
                disabled={!precedentPossible}
                onClick={precedent}
              >
                <Chevron sens="gauche" />
              </button>
              <button
                type="button"
                className="cal-nav"
                aria-label="Suivant"
                disabled={!suivantPossible}
                onClick={suivant}
              >
                <Chevron sens="droite" />
              </button>
            </div>
          </div>

          {vue === "jours" ? (
            <>
              <div className="cal-semaine" aria-hidden="true">
                {JOURS.map((j) => (
                  <span key={j}>{j}</span>
                ))}
              </div>
              <div className="cal-grille">
                {casesDuMois(affiche.a, affiche.m).map((d) => {
                  const autreMois = d.m !== affiche.m;
                  const futur = cle(d) > cle(aujour);
                  const estChoisi = choisi !== null && cle(d) === cle(choisi);
                  return (
                    <button
                      key={cle(d)}
                      type="button"
                      data-jour={cle(d)}
                      tabIndex={cle(d) === cle(focus) ? 0 : -1}
                      disabled={futur}
                      aria-label={`${d.j} ${MOIS[d.m]} ${d.a}`}
                      aria-pressed={estChoisi}
                      aria-current={cle(d) === cle(aujour) ? "date" : undefined}
                      className={`cal-jour${autreMois ? " hors" : ""}${
                        cle(d) === cle(aujour) ? " aujourdhui" : ""
                      }${estChoisi ? " choisi" : ""}`}
                      onClick={() => prendre(d)}
                    >
                      {d.j}
                    </button>
                  );
                })}
              </div>
            </>
          ) : vue === "mois" ? (
            <div className="cal-liste">
              {MOIS.map((nom, i) => (
                <button
                  key={nom}
                  type="button"
                  disabled={affiche.a * 12 + i > aujour.a * 12 + aujour.m}
                  className={`cal-case${
                    choisi && choisi.a === affiche.a && choisi.m === i
                      ? " choisi"
                      : ""
                  }`}
                  onClick={() => {
                    setAffiche({ a: affiche.a, m: i });
                    setFocus({ a: affiche.a, m: i, j: 1 });
                    setVue("jours");
                  }}
                >
                  {nom.slice(0, 4)}
                  {nom.length > 4 ? "." : ""}
                </button>
              ))}
            </div>
          ) : (
            <div className="cal-liste">
              {Array.from({ length: 12 }, (_, i) => debutAnnees + i).map(
                (a) => (
                  <button
                    key={a}
                    type="button"
                    disabled={a > aujour.a || a < ANNEE_MINIMALE}
                    className={`cal-case${choisi && choisi.a === a ? " choisi" : ""}`}
                    onClick={() => {
                      setAffiche({ a, m: affiche.m });
                      setVue("mois");
                    }}
                  >
                    {a}
                  </button>
                ),
              )}
            </div>
          )}

          <div className="cal-pied">
            <button
              type="button"
              onClick={() => {
                setTexte("");
                fermer(true);
              }}
            >
              Effacer
            </button>
            <button type="button" onClick={() => prendre(aujour)}>
              Aujourd&apos;hui
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

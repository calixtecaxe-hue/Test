"use client";

import { useEffect, useId, useRef, useState } from "react";

export type OptionMenu = { valeur: string; libelle: string };

// Menu déroulant aux couleurs du site, à la place du <select> natif dont la
// liste ne se stylise pas. La valeur part dans le formulaire par un champ
// caché ; le clavier suit le motif « combobox » (flèches, Entrée, Échap).
export function MenuDeroulant({
  id,
  name,
  options,
  valeur,
  valeurInitiale,
  onChange,
}: {
  id: string;
  name: string;
  options: OptionMenu[];
  valeur?: string;
  valeurInitiale?: string;
  onChange?: (valeur: string) => void;
}) {
  const [interne, setInterne] = useState(
    valeurInitiale ?? options[0]?.valeur ?? "",
  );
  const courant = valeur ?? interne;
  const indexCourant = Math.max(
    0,
    options.findIndex((o) => o.valeur === courant),
  );
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(indexCourant);
  const racine = useRef<HTMLDivElement>(null);
  const idListe = useId();

  useEffect(() => {
    if (!ouvert) return;
    function dehors(event: MouseEvent) {
      if (!racine.current?.contains(event.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    racine.current
      ?.querySelector(`[data-index="${actif}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [ouvert, actif]);

  function ouvrir() {
    setActif(indexCourant);
    setOuvert(true);
  }

  function choisir(index: number) {
    const option = options[index];
    if (!option) return;
    setInterne(option.valeur);
    onChange?.(option.valeur);
    setOuvert(false);
  }

  function surTouche(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!ouvert) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        ouvrir();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActif((a) => Math.min(a + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActif((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActif(0);
        break;
      case "End":
        event.preventDefault();
        setActif(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choisir(actif);
        break;
      case "Escape":
        event.preventDefault();
        setOuvert(false);
        break;
      case "Tab":
        setOuvert(false);
        break;
    }
  }

  return (
    <div ref={racine} className="menu-champ">
      <input type="hidden" name={name} value={courant} />
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-controls={idListe}
        aria-activedescendant={ouvert ? `${idListe}-${actif}` : undefined}
        className="champ-saisie menu-declencheur"
        onClick={() => (ouvert ? setOuvert(false) : ouvrir())}
        onKeyDown={surTouche}
      >
        <span>{options[indexCourant]?.libelle}</span>
        <svg
          viewBox="0 0 24 24"
          className="menu-chevron"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {ouvert ? (
        <ul id={idListe} role="listbox" className="menu-liste">
          {options.map((option, index) => (
            <li
              key={option.valeur}
              id={`${idListe}-${index}`}
              role="option"
              aria-selected={option.valeur === courant}
              data-index={index}
              data-actif={index === actif}
              className="menu-option"
              onMouseEnter={() => setActif(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choisir(index)}
            >
              <span>{option.libelle}</span>
              {option.valeur === courant ? (
                <svg
                  viewBox="0 0 24 24"
                  className="menu-coche"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

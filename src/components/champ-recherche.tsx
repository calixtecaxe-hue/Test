"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { OptionMenu } from "@/components/menu-deroulant";

// Liste de choix avec recherche : la liste des métiers est affichée sous le
// champ, on tape quelques lettres pour la réduire. Motif « combobox » (flèches,
// Entrée). La valeur choisie part dans le formulaire par un champ caché ; tant
// qu'aucun choix n'est fait, il reste vide.

const normaliser = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function ChampRecherche({
  id,
  name,
  options,
  valeur,
  onChange,
  placeholder,
}: {
  id: string;
  name: string;
  options: (OptionMenu & { mots?: string[] })[];
  valeur: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
}) {
  const choisie = options.find((o) => o.valeur === valeur);
  const [texte, setTexte] = useState(choisie?.libelle ?? "");
  const [actif, setActif] = useState(0);
  const racine = useRef<HTMLDivElement>(null);
  const idListe = useId();

  // La liste est toujours visible, sous le champ : le dirigeant voit les métiers
  // proposés avant même de taper, et la liste se réduit pendant qu'il tape.
  const recherche = normaliser(texte.trim());
  const filtrees =
    choisie && texte === choisie.libelle
      ? options
      : options.filter((o) => normaliser(o.libelle).includes(recherche) || (o.mots ?? []).some((m) => normaliser(m).includes(recherche)));

  useEffect(() => {
    racine.current?.querySelector(`[data-index="${actif}"]`)?.scrollIntoView({ block: "nearest" });
  }, [actif]);

  function choisir(option: OptionMenu) {
    setTexte(option.libelle);
    onChange(option.valeur);
  }

  function surSaisie(event: React.ChangeEvent<HTMLInputElement>) {
    setTexte(event.target.value);
    setActif(0);
    if (valeur) onChange("");
  }

  function surTouche(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const pas = event.key === "ArrowDown" ? 1 : -1;
      setActif((a) => Math.min(Math.max(a + pas, 0), filtrees.length - 1));
    } else if (event.key === "Enter" && filtrees[actif] && filtrees[actif].valeur !== valeur) {
      // Choisit l'option en surbrillance ; une seconde fois, Entrée envoie l'étape.
      event.preventDefault();
      choisir(filtrees[actif]);
    }
  }

  return (
    <div ref={racine} className="recherche-champ">
      <input type="hidden" name={name} value={valeur} />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls={idListe}
        aria-activedescendant={filtrees[actif] ? `${idListe}-${actif}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={texte}
        onChange={surSaisie}
        onKeyDown={surTouche}
        className="champ-saisie"
      />
      <ul id={idListe} role="listbox" aria-label="Métiers" className="recherche-liste">
        {filtrees.length === 0 ? (
          <li role="option" aria-selected="false" aria-disabled="true" className="menu-option">
            <span>Aucun métier ne correspond. Essayez un autre mot.</span>
          </li>
        ) : (
          filtrees.map((option, index) => (
            <li
              key={option.valeur}
              id={`${idListe}-${index}`}
              role="option"
              aria-selected={option.valeur === valeur}
              data-index={index}
              data-actif={index === actif}
              className="menu-option"
              onMouseEnter={() => setActif(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choisir(option)}
            >
              <span>
                {option.libelle}
                {recherche && !normaliser(option.libelle).includes(recherche) ? (
                  <span className="ml-2 text-xs text-[var(--text-muted)]">{(option.mots ?? []).find((m) => normaliser(m).includes(recherche))}</span>
                ) : null}
              </span>
              {option.valeur === valeur ? (
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
          ))
        )}
      </ul>
    </div>
  );
}

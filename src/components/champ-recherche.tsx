"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { OptionMenu } from "@/components/menu-deroulant";

// Liste de choix avec recherche : on tape quelques lettres, la liste se réduit.
// Utile quand il y a plus de métiers qu'un menu déroulant ne peut afficher.
// Motif « combobox » (flèches, Entrée, Échap). La valeur choisie part dans le
// formulaire par un champ caché ; tant qu'aucun choix n'est fait, il reste vide.

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
  options: OptionMenu[];
  valeur: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
}) {
  const choisie = options.find((o) => o.valeur === valeur);
  const [texte, setTexte] = useState(choisie?.libelle ?? "");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const racine = useRef<HTMLDivElement>(null);
  const idListe = useId();

  const recherche = normaliser(texte.trim());
  const filtrees =
    choisie && texte === choisie.libelle
      ? options
      : options.filter((o) => normaliser(o.libelle).includes(recherche));

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
    racine.current?.querySelector(`[data-index="${actif}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ouvert, actif]);

  function choisir(option: OptionMenu) {
    setTexte(option.libelle);
    onChange(option.valeur);
    setOuvert(false);
  }

  function surSaisie(event: React.ChangeEvent<HTMLInputElement>) {
    setTexte(event.target.value);
    setActif(0);
    setOuvert(true);
    if (valeur) onChange("");
  }

  function surTouche(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!ouvert) {
        setOuvert(true);
        return;
      }
      const pas = event.key === "ArrowDown" ? 1 : -1;
      setActif((a) => Math.min(Math.max(a + pas, 0), filtrees.length - 1));
    } else if (event.key === "Enter" && ouvert && filtrees[actif]) {
      // Choisit l'option, sans envoyer l'étape tant que la liste est ouverte.
      event.preventDefault();
      choisir(filtrees[actif]);
    } else if (event.key === "Escape" && ouvert) {
      event.preventDefault();
      setOuvert(false);
    }
  }

  return (
    <div ref={racine} className="menu-champ">
      <input type="hidden" name={name} value={valeur} />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={ouvert}
        aria-controls={idListe}
        aria-activedescendant={ouvert && filtrees[actif] ? `${idListe}-${actif}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={texte}
        onChange={surSaisie}
        onClick={() => setOuvert(true)}
        onKeyDown={surTouche}
        className="champ-saisie"
      />
      {ouvert ? (
        <ul id={idListe} role="listbox" className="menu-liste">
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
                <span>{option.libelle}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import type { OptionMenu } from "@/components/menu-deroulant";

// Cases à cocher (plusieurs choix) ou boutons radio (un seul choix), aux
// couleurs du site. Chaque option est une rangée entière cliquable, lisible au
// pouce sur mobile.
export function ChoixCases({
  nom,
  type,
  options,
  valeurs,
  onChange,
  legende,
}: {
  nom: string;
  type: "checkbox" | "radio";
  options: OptionMenu[];
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  legende: string;
}) {
  function basculer(valeur: string) {
    if (type === "radio") onChange([valeur]);
    else onChange(valeurs.includes(valeur) ? valeurs.filter((v) => v !== valeur) : [...valeurs, valeur]);
  }

  return (
    <fieldset className="cases-groupe">
      <legend className="sr-only">{legende}</legend>
      {options.map((o) => {
        const coche = valeurs.includes(o.valeur);
        return (
          <label key={o.valeur} className={`case-option${coche ? " choisie" : ""}`}>
            <input
              type={type}
              name={nom}
              value={o.valeur}
              checked={coche}
              onChange={() => basculer(o.valeur)}
              className="case-entree"
            />
            <span className={`case-marque ${type}`} aria-hidden="true">
              {coche ? (
                type === "checkbox" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                ) : (
                  <span className="case-point" />
                )
              ) : null}
            </span>
            <span>{o.libelle}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

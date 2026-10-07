"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { classeChamp } from "@/components/champ";

// Séparateur de milliers : espace fine insécable, usage français.
const SEPARATEUR = " ";

// Met en forme ce que tape le dirigeant (« 100000 » devient « 100 000 ») et
// renvoie la valeur brute que le formulaire envoie (« 100000 »).
function formater(saisie: string, decimales: boolean) {
  const propre = saisie.replace(decimales ? /[^\d,.]/g : /\D/g, "");
  let entier = propre;
  let fraction: string | null = null;
  if (decimales) {
    const i = propre.search(/[,.]/);
    if (i >= 0) {
      entier = propre.slice(0, i);
      fraction = propre
        .slice(i + 1)
        .replace(/[,.]/g, "")
        .slice(0, 2);
    }
  }
  entier = entier.replace(/^0+(?=\d)/, "");
  if (entier === "" && fraction !== null) entier = "0";
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATEUR);
  return {
    affichage: groupe + (fraction !== null ? `,${fraction}` : ""),
    brut: entier + (fraction ? `.${fraction}` : ""),
  };
}

// Champ numérique qui sépare les milliers au fil de la saisie. Le champ
// visible n'a pas de nom : seul le champ caché, en valeur brute, part dans le
// formulaire.
export function ChampNombre({
  id,
  name,
  decimales = false,
  required,
}: {
  id: string;
  name: string;
  decimales?: boolean;
  required?: boolean;
}) {
  const [valeur, setValeur] = useState({ affichage: "", brut: "" });
  const champ = useRef<HTMLInputElement>(null);
  const curseur = useRef<number | null>(null);

  // Remet le curseur à la même place parmi les chiffres après la mise en forme.
  useLayoutEffect(() => {
    if (curseur.current === null || !champ.current) return;
    const cible = curseur.current;
    curseur.current = null;
    let vus = 0;
    let position = 0;
    const texte = champ.current.value;
    while (position < texte.length && vus < cible) {
      if (/[\d,]/.test(texte[position])) vus += 1;
      position += 1;
    }
    champ.current.setSelectionRange(position, position);
  }, [valeur]);

  function surSaisie(event: React.ChangeEvent<HTMLInputElement>) {
    let saisie = event.target.value;
    let position = event.target.selectionStart ?? saisie.length;

    // Effacer un séparateur efface le chiffre voisin, sinon la mise en forme
    // le remettrait aussitôt et le champ semblerait bloqué.
    const retire = valeur.affichage.length - saisie.length === 1;
    const sansSeparateur = (t: string) => t.split(SEPARATEUR).join("");
    if (retire && sansSeparateur(saisie) === sansSeparateur(valeur.affichage)) {
      const type = (event.nativeEvent as InputEvent).inputType;
      if (type === "deleteContentForward") {
        saisie = saisie.slice(0, position) + saisie.slice(position + 1);
      } else {
        saisie = saisie.slice(0, position - 1) + saisie.slice(position);
        position -= 1;
      }
    }

    curseur.current = saisie
      .slice(0, position)
      .replace(/\./g, ",")
      .replace(/[^\d,]/g, "").length;
    setValeur(formater(saisie, decimales));
  }

  return (
    <>
      <input type="hidden" name={name} value={valeur.brut} />
      <input
        ref={champ}
        id={id}
        type="text"
        inputMode={decimales ? "decimal" : "numeric"}
        autoComplete="off"
        required={required}
        value={valeur.affichage}
        onChange={surSaisie}
        className={classeChamp}
      />
    </>
  );
}

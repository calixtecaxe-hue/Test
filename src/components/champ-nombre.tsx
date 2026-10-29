"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { classeChamp } from "@/components/champ";
import { SEPARATEUR, finaliserSaisie, formaterSaisie } from "@/lib/saisie-nombre";

// Champ numérique qui sépare les milliers au fil de la saisie (règles de lecture
// dans src/lib/saisie-nombre.ts : « 60k », « 1.250,75 », signe moins gardé). Le
// champ visible n'a pas de nom : seul le champ caché, en valeur brute, part dans
// le formulaire.
export function ChampNombre({
  id,
  name,
  decimales = false,
  required,
  valeurInitiale,
}: {
  id: string;
  name: string;
  decimales?: boolean;
  required?: boolean;
  // Valeur brute à l'ouverture (« 100000 »), pour revenir sur une réponse déjà donnée.
  valeurInitiale?: string;
}) {
  const [valeur, setValeur] = useState(() =>
    valeurInitiale ? finaliserSaisie(formaterSaisie(valeurInitiale, decimales)) : { affichage: "", brut: "", multiplie: false },
  );
  const champ = useRef<HTMLInputElement>(null);
  // Place du curseur parmi les chiffres : combien le précèdent, et s'il suit le signe ou le séparateur décimal.
  const curseur = useRef<{ chiffres: number; signe: boolean; separateur: boolean } | null>(null);

  // Remet le curseur à la même place parmi les chiffres après la mise en forme.
  useLayoutEffect(() => {
    if (curseur.current === null || !champ.current) return;
    const cible = curseur.current;
    curseur.current = null;
    const texte = champ.current.value;
    let vus = 0;
    let position = cible.signe && texte.startsWith("-") ? 1 : 0;
    while (position < texte.length && vus < cible.chiffres) {
      if (/\d/.test(texte[position])) vus += 1;
      position += 1;
    }
    if (cible.separateur && /[,.]/.test(texte[position] ?? "")) position += 1;
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

    const suivante = formaterSaisie(saisie, decimales);
    const avant = saisie.slice(0, position);
    // « 60k » réécrit en « 60 000 » : le curseur va à la fin.
    curseur.current = suivante.multiplie
      ? { chiffres: Infinity, signe: true, separateur: false }
      : { chiffres: (avant.match(/\d/g) ?? []).length, signe: avant.includes("-"), separateur: /[,.]$/.test(avant) };
    setValeur(suivante);
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
        onBlur={() => setValeur((v) => finaliserSaisie(v))}
        className={classeChamp}
      />
    </>
  );
}

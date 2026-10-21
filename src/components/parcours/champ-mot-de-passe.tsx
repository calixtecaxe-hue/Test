"use client";

import { useState } from "react";
import { Champ, classeChamp } from "@/components/champ";

// Mot de passe avec un bouton « Afficher » : on vérifie ce qu'on tape sans le répéter à l'aveugle.
export function ChampMotDePasse({
  label,
  id,
  nom,
  aide,
  erreur,
  autoComplete,
  placeholder,
}: {
  label: string;
  id: string;
  nom: string;
  aide?: string;
  erreur?: string;
  autoComplete: "new-password" | "current-password";
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Champ label={label} htmlFor={id} aide={aide} erreur={erreur}>
      <div className="relative">
        <input
          id={id}
          name={nom}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={erreur ? true : undefined}
          className={`${classeChamp} pr-24`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute inset-y-0 right-3 my-auto h-8 rounded-[3px] px-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          {visible ? "Masquer" : "Afficher"}
        </button>
      </div>
    </Champ>
  );
}

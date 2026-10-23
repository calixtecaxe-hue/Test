"use client";

import { signOut } from "next-auth/react";

// Les saisies de tableau gardées en brouillon sur cet appareil (voir question-carte.tsx) ne survivent pas à la déconnexion :
// un autre compte ne doit pas retrouver les chiffres du précédent.
function effacerBrouillons() {
  try {
    for (const cle of Object.keys(window.localStorage)) if (cle.startsWith("caxe-brouillon:")) window.localStorage.removeItem(cle);
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}

export function DeconnexionBouton() {
  return (
    <button
      onClick={() => {
        effacerBrouillons();
        void signOut({ callbackUrl: "/" });
      }}
      className="rounded-[4px] border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
    >
      Se déconnecter
    </button>
  );
}

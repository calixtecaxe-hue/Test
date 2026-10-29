"use client";

import { signOut } from "next-auth/react";

export function DeconnexionBouton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="whitespace-nowrap rounded-[4px] border border-[var(--line)] px-2 py-2 text-xs font-medium min-[360px]:px-3 min-[360px]:text-sm sm:px-4 text-[var(--text)] transition hover:border-[var(--blue-1)]"
    >
      Se déconnecter
    </button>
  );
}

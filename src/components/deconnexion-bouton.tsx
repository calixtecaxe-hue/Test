"use client";

import { signOut } from "next-auth/react";

export function DeconnexionBouton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-[4px] border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--blue-1)]"
    >
      Se déconnecter
    </button>
  );
}

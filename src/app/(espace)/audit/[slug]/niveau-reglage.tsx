"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Niveau des questionnaires de tous les agents : modifiable à tout moment. Les réponses déjà
// données sont conservées ; passer en essentiel masque les questions de détail, passer en
// approfondi les ajoute.
export function NiveauReglage({ niveau, essentielles, total }: { niveau: "ESSENTIEL" | "APPROFONDI"; essentielles: number; total: number }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const approfondi = niveau === "APPROFONDI";

  async function changer() {
    setEnvoi(true);
    setErreur(null);
    const r = await fetch("/api/audit/niveau", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niveau: approfondi ? "ESSENTIEL" : "APPROFONDI" }),
    }).catch(() => null);
    if (r?.ok) router.refresh();
    else setErreur("Le changement n'a pas pu être enregistré. Réessayez.");
    setEnvoi(false);
  }

  return (
    <p className="mt-4 text-sm text-[var(--text-muted)]" data-niveau-reglage>
      Niveau du questionnaire : <span className="text-[var(--text)]">{approfondi ? "approfondi" : "essentiel"}</span> (jusqu&apos;à {approfondi ? total : essentielles} questions, selon vos réponses).{" "}
      <button type="button" onClick={changer} disabled={envoi} className="audit-lien text-[var(--blue-1)] hover:underline disabled:opacity-60">
        {envoi ? "Enregistrement…" : approfondi ? "Passer en essentiel" : `Passer en approfondi (jusqu'à ${total} questions)`}
      </button>
      {erreur ? <span className="ml-2 text-[var(--red-1)]">{erreur}</span> : null}
    </p>
  );
}

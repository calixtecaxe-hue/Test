"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Relit le paiement toutes les trois secondes, une vingtaine de fois : dès qu'il est confirmé, la page redirige vers l'étape suivante.
export function ActualisationAuto({ sessionId }: { sessionId: string }) {
  const route = useRouter();
  useEffect(() => {
    let essais = 0;
    const minuteur = setInterval(() => {
      essais += 1;
      if (essais > 20) {
        clearInterval(minuteur);
        return;
      }
      route.refresh();
    }, 3000);
    return () => clearInterval(minuteur);
  }, [route, sessionId]);
  return null;
}

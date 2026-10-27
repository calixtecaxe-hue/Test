// Remplace « next/navigation » dans l'aperçu (pas de serveur Next) : « refresh » recalcule les questions à poser, « push » change de page.
const ecouteurs = new Set<() => void>();
export const surRafraichir = (f: () => void) => { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; };
export function useRouter() {
  return {
    refresh: () => ecouteurs.forEach((f) => f()),
    push: (url: string) => { window.location.href = url; },
    replace: (url: string) => { window.location.replace(url); },
    back: () => window.history.back(),
    prefetch: () => {},
  };
}

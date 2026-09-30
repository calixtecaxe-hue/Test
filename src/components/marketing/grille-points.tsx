// Fond en grille de points, dense d'un côté puis qui s'estompe — animation
// purement CSS (pas de DOM par point), gelée par la règle
// prefers-reduced-motion globale en bas de globals.css.
export function GrillePoints() {
  return <div className="grille-points" aria-hidden="true" />;
}

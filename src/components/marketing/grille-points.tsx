// Fond en grille de points, dense d'un côté puis qui s'estompe — animation
// purement CSS (pas de DOM par point), gelée par la règle
// prefers-reduced-motion globale en bas de globals.css.
// "gauche" : dense vers le texte du hero à deux colonnes de l'accueil.
// "centre" : dense sous un titre centré, pour les autres heros du site.
export function GrillePoints({
  position,
}: {
  position: "gauche" | "centre";
}) {
  return (
    <div
      className={`grille-points grille-points-${position}`}
      aria-hidden="true"
    />
  );
}

import type { Statut } from "./etat-audit";

// Pastille d'état d'un audit : un point de couleur et un libellé court, dans le style des badges du site (.badge-dispo).
export function BadgeStatut({ statut, libelle }: { statut: Statut; libelle: string }) {
  return (
    <span className="statut-audit" data-statut={statut}>
      {libelle}
    </span>
  );
}

// Avancement d'un questionnaire : le pourcentage, le nombre de questions traitées, et une barre fine dans la couleur
// de l'agent (le dégradé reste réservé aux jauges et barres de progression, CLAUDE.md section 12).
export function IndicateurProgression({ pourcent, traitees, questions, libelle }: { pourcent: number; traitees: number; questions: number; libelle: string }) {
  return (
    <div className="progression-audit">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-[var(--text-muted)]">
          {traitees} question{traitees > 1 ? "s" : ""} sur {questions}
        </span>
        <span className="progression-audit-valeur">{pourcent}&nbsp;%</span>
      </div>
      <div
        className="progression-audit-piste"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pourcent}
        aria-label={libelle}
      >
        <div style={{ width: `${pourcent}%` }} />
      </div>
    </div>
  );
}

// Le style des champs vit dans globals.css (.champ-saisie, .menu-*).
export const classeChamp = "champ-saisie";

export function Champ({
  label,
  htmlFor,
  erreur,
  aide,
  children,
}: {
  label: string;
  htmlFor: string;
  erreur?: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="champ-groupe">
      <label htmlFor={htmlFor} className="champ-etiquette">
        {label}
      </label>
      {children}
      {aide ? <p className="champ-aide">{aide}</p> : null}
      {erreur ? <p className="text-xs text-[var(--red-1)]">{erreur}</p> : null}
    </div>
  );
}

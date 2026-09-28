export const classeChamp =
  "w-full rounded-[4px] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--blue-1)] focus:ring-2 focus:ring-[var(--blue-1)]/40";

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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--text)]">
        {label}
      </label>
      {aide ? <p className="text-xs text-[var(--text-muted)]">{aide}</p> : null}
      {children}
      {erreur ? <p className="text-xs text-[var(--red-1)]">{erreur}</p> : null}
    </div>
  );
}

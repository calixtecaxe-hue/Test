import type { Agent } from "@/lib/agents";

// Marques abstraites minimalistes, une par agent — pas une banque d'icônes
// générique (trait fin, aucun remplissage sauf les points), pour rester
// dans la direction « minimalisme stratégique premium » de la charte.
export function AgentIcone({
  code,
  className,
}: {
  code: Agent["code"];
  className?: string;
}) {
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (code) {
    case "ACQUISITION_CA":
      return (
        <svg {...props}>
          <path d="M4 17 10 11 14 14 20 6" />
          <circle cx="20" cy="6" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "FINANCE_RENTABILITE":
      return (
        <svg {...props}>
          <path d="M4 7h12M4 13h16M4 7v6" />
        </svg>
      );
    case "RH_ORGANISATION":
      return (
        <svg {...props}>
          <path d="M12 5 5 17M12 5 19 17M5 17h14" strokeWidth={1.3} />
          <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="5" cy="17" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="19" cy="17" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "COMM_CREATION":
      return (
        <svg {...props}>
          <path d="M9 15a6 6 0 0 1 8-8" />
          <path d="M9 15a10 10 0 0 1 12-12" />
          <circle cx="9" cy="15" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

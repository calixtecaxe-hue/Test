import type { Agent } from "@/lib/agents";
import { AGENTS } from "@/lib/agents";

// Portrait illustré de chaque agent. L'image remplit son conteneur, qui fixe
// la taille et la forme (voir .avatar-agent dans globals.css).
export function AgentAvatar({ code }: { code: Agent["code"] }) {
  const agent = AGENTS.find((a) => a.code === code);
  if (!agent) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- médaillon de 224 px déjà dimensionné, rendu dans un cadre de 26 à 112 px
    <img
      src={`/agents/${agent.slug}.webp`}
      alt=""
      width={96}
      height={96}
      className="avatar-agent"
      aria-hidden="true"
    />
  );
}

// Médaillon de l'agent (buste de marbre dans un cercle doré) pour l'en-tête de
// sa page.
export function AgentPortrait({ code }: { code: Agent["code"] }) {
  const agent = AGENTS.find((a) => a.code === code);
  if (!agent) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- médaillon WebP de 800 px, affiché à 380 px au plus
    <img
      src={`/agents/${agent.slug}-medaillon.webp`}
      alt=""
      width={800}
      height={800}
      className="agent-portrait-img"
      aria-hidden="true"
    />
  );
}

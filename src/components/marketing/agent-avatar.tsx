import type { Agent } from "@/lib/agents";
import { AGENTS } from "@/lib/agents";

// Portrait illustré de chaque agent. L'image remplit son conteneur, qui fixe
// la taille et la forme (voir .avatar-agent dans globals.css).
export function AgentAvatar({ code }: { code: Agent["code"] }) {
  const agent = AGENTS.find((a) => a.code === code);
  if (!agent) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- portrait de 320 px déjà dimensionné, rendu dans un cadre de 26 à 96 px
    <img
      src={`/agents/${agent.slug}.jpg`}
      alt=""
      width={96}
      height={96}
      className="avatar-agent"
      aria-hidden="true"
    />
  );
}

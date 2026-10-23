import { redirect } from "next/navigation";

// Ancienne adresse du choix des agents : la formule se choisit désormais sur /formule, une fois le métier connu.
export default async function ActivationPage({ searchParams }: { searchParams: Promise<{ agents?: string; periode?: string }> }) {
  const { agents, periode } = await searchParams;
  const q = new URLSearchParams();
  if (agents) q.set("agents", agents);
  if (periode) q.set("periode", periode);
  redirect(q.size > 0 ? `/formule?${q.toString()}` : "/formule");
}

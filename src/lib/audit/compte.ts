import type { AgentCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { abonnementOuvert } from "@/lib/paiement/abonnement-serveur";
import { reponseSchema, type Reponses } from "./reponse";
import { ENSEMBLE } from "./donnees-audit";
import { prereponseDe } from "./prereponse";

// Toutes les réponses du compte, tous agents confondus (données partagées). Un chiffre proposé par CAXE et gardé tel
// quel (budget marketing de la Finance) se met à jour quand le détail dont il vient a changé ; un chiffre que le
// dirigeant a lui-même donné ou corrigé n'est jamais touché.
export async function reponsesDuCompte(userId: string): Promise<Reponses> {
  const lignes = await prisma.reponseAudit.findMany({ where: { userId }, select: { cle: true, reponse: true, preremplie: true } });
  const reponses: Reponses = {};
  for (const l of lignes) {
    const analyse = reponseSchema.safeParse(l.reponse);
    if (analyse.success) reponses[l.cle] = analyse.data;
  }
  for (const l of lignes) {
    if (!l.preremplie) continue;
    const propose = prereponseDe(ENSEMBLE.prereponses, l.cle, reponses);
    const actuelle = reponses[l.cle];
    if (!propose || (actuelle?.genre === "exact" && actuelle.valeur === propose.total)) continue;
    const nouvelle = { genre: "exact" as const, valeur: propose.total };
    reponses[l.cle] = nouvelle;
    await prisma.reponseAudit.updateMany({ where: { userId, cle: l.cle, preremplie: true }, data: { reponse: nouvelle } });
  }
  return reponses;
}

// Données dont le chiffre vient du détail déjà donné (et non d'une saisie du dirigeant), avec la phrase qui le dit.
export async function reponsesPreremplies(userId: string): Promise<Map<string, string>> {
  const lignes = await prisma.reponseAudit.findMany({ where: { userId, preremplie: true }, select: { cle: true } });
  const detail = new Map(ENSEMBLE.prereponses.regles.map((r) => [r.donnee, r.detail]));
  return new Map(lignes.filter((l) => detail.has(l.cle)).map((l) => [l.cle, detail.get(l.cle)!]));
}

// Agents ouverts : ceux de la formule, tant que l'abonnement est en cours (payé).
export async function agentsActifs(userId: string): Promise<AgentCode[]> {
  if (!(await abonnementOuvert(userId))) return [];
  const acces = await prisma.agentAccess.findMany({ where: { userId, actif: true }, select: { agent: true } });
  return acces.map((a) => a.agent);
}


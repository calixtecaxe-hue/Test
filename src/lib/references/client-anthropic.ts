// Appel réel à l'API Claude pour la recherche de références (serveur uniquement : la clé d'API reste
// dans l'environnement). Outil de recherche web côté serveur d'Anthropic ; la relecture des pages
// citées est faite ensuite par notre code (verification-page.ts), jamais par le modèle.

import Anthropic from "@anthropic-ai/sdk";
import type { ParametresReferences, SourcesReconnues } from "../donnees/schemas.ts";
import { construireDemande, type ClientRecherche, type DemandeRecherche, type ReponseAgent } from "./recherche.ts";

export function clientAnthropic(params: ParametresReferences, sources: SourcesReconnues, sdk: Anthropic = new Anthropic()): ClientRecherche {
  const a = params.agentRecherche;
  return {
    async chercher(demande: DemandeRecherche): Promise<ReponseAgent> {
      const { systeme, utilisateur, domainesBloques } = construireDemande(demande, params, sources);
      const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: utilisateur }];
      const usage = { entree: 0, sortie: 0, recherchesWeb: 0 };
      const pagesVues: string[] = [];
      let texte = "";
      let refus = false;

      for (let tour = 0; tour <= a.reprisesMax; tour++) {
        const flux = sdk.beta.messages.stream({
          model: a.modele,
          max_tokens: a.maxTokens,
          thinking: { type: "adaptive" },
          output_config: { effort: a.effort },
          system: systeme,
          messages,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: a.recherchesWebMax, blocked_domains: domainesBloques }],
          // Repli côté serveur si les classificateurs de sécurité refusent la demande.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
        const reponse = await flux.finalMessage();
        usage.entree += reponse.usage.input_tokens;
        usage.sortie += reponse.usage.output_tokens;
        usage.recherchesWeb += reponse.usage.server_tool_use?.web_search_requests ?? 0;
        for (const bloc of reponse.content) {
          if (bloc.type === "web_search_tool_result" && Array.isArray(bloc.content)) {
            for (const r of bloc.content) if (r.type === "web_search_result") pagesVues.push(r.url);
          }
        }
        if (reponse.stop_reason === "refusal") {
          refus = true;
          break;
        }
        const textes = reponse.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
        if (textes.length > 0) texte = textes[textes.length - 1].text;
        if (reponse.stop_reason !== "pause_turn") break;
        // L'agent a mis son tour en pause (outil serveur long) : on le relance avec ce qu'il a produit.
        messages.push({ role: "assistant", content: reponse.content });
      }
      return { texte, usage, pagesVues, refus };
    },
  };
}

// Appel réel à l'API Claude pour rédiger un rapport (serveur uniquement : la clé reste dans l'environnement, jamais dans le
// dépôt). Sortie structurée au format du schéma du rapport ; la lecture et les contrôles sont faits ensuite par rediger.ts, qui
// peut redemander une correction : la réponse est donc lue ici sans être validée, et rendue telle quelle (blocs de réflexion
// compris) pour le tour suivant.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ParametresRapport } from "../donnees/schemas";
import { rapportSchema } from "./schema";
import type { Redacteur } from "./rediger";

// Schéma JSON envoyé à l'API, converti une fois depuis le schéma zod.
const FORMAT = betaZodOutputFormat(rapportSchema);

export function redacteurClaude(p: ParametresRapport, sdk: Anthropic = new Anthropic()): Redacteur {
  return async ({ systeme, messages }) => {
    const flux = sdk.beta.messages.stream({
      model: p.generation.modele,
      max_tokens: p.generation.maxTokens,
      thinking: { type: "adaptive" },
      output_config: { effort: p.generation.effort, format: { type: "json_schema", schema: FORMAT.schema } },
      // Consignes identiques pour tous les comptes d'un même agent : mises en cache.
      system: [{ type: "text", text: systeme, cache_control: { type: "ephemeral" } }],
      messages: messages.map((m): Anthropic.Beta.BetaMessageParam =>
        m.role === "user" ? { role: "user", content: m.contenu } : { role: "assistant", content: m.contenu as Anthropic.Beta.BetaContentBlockParam[] }
      ),
      // Repli côté serveur si les classificateurs de sécurité refusent la demande.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    const r = await flux.finalMessage();
    const textes = r.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
    let sortie: unknown = null;
    try {
      sortie = textes.length > 0 ? JSON.parse(textes[textes.length - 1].text) : null;
    } catch {
      sortie = null;
    }
    return {
      sortie,
      contenu: r.content,
      refus: r.stop_reason === "refusal",
      tronque: r.stop_reason === "max_tokens",
      modele: r.model,
      usage: { entree: r.usage.input_tokens + (r.usage.cache_read_input_tokens ?? 0) + (r.usage.cache_creation_input_tokens ?? 0), sortie: r.usage.output_tokens },
    };
  };
}

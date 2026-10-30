import Anthropic from "@anthropic-ai/sdk";

/**
 * Thin boundary around the Anthropic SDK so the agents can be tested with a
 * scripted fake client (see agent tests) and so the provider configuration
 * lives in one place. Server-only: the API key never reaches the browser.
 */

export const AI_MODEL = process.env.AI_MODEL || "claude-opus-5-5";

export type Effort = "low" | "medium" | "high";

export interface CreateMessageParams {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools: Anthropic.Beta.BetaTool[];
  effort: Effort;
  /** Set to "none" to force a final text answer (used when a loop limit is hit). */
  toolChoice?: "auto" | "none";
}

export interface LlmClient {
  createMessage(
    params: CreateMessageParams,
  ): Promise<Anthropic.Beta.BetaMessage>;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY manquante");
  }
}

export function createAnthropicClient(): LlmClient {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new AiNotConfiguredError();

  const client = new Anthropic({
    apiKey,
    // One agent step should never hang the whole conversation turn.
    timeout: 90_000,
    maxRetries: 2,
  });

  return {
    createMessage(params) {
      return client.beta.messages.create({
        model: AI_MODEL,
        max_tokens: 16000,
        system: params.system,
        messages: params.messages,
        tools: params.tools,
        tool_choice: { type: params.toolChoice ?? "auto" },
        output_config: { effort: params.effort },
        // Caches the stable prefix (tools + system prompt) across the many
        // calls of one turn and across turns.
        cache_control: { type: "ephemeral" },
        // If a request is declined by a safety classifier, let the API retry
        // it on another model instead of failing the turn.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
    },
  };
}

/** User-facing French message for a failure of the AI provider. */
export function describeAiError(error: unknown): string {
  if (error instanceof AiNotConfiguredError) {
    return "L'assistant IA n'est pas configuré : la variable ANTHROPIC_API_KEY est absente côté serveur.";
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return "La clé API Anthropic est refusée (invalide ou révoquée). Vérifie ANTHROPIC_API_KEY.";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "La clé API Anthropic n'a pas accès à ce modèle. Vérifie ton compte ou la variable AI_MODEL.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Trop de demandes envoyées au service IA pour le moment. Réessaie dans une minute.";
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return "Le service IA a mis trop de temps à répondre. Réessaie dans un instant.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Impossible de joindre le service IA (problème réseau). Réessaie dans un instant.";
  }
  if (error instanceof Anthropic.BadRequestError) {
    return "Le service IA a refusé la requête (requête invalide). Si ça se répète, signale-le.";
  }
  if (error instanceof Anthropic.InternalServerError) {
    return "Le service IA est momentanément indisponible ou surchargé. Réessaie dans quelques minutes.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Erreur du service IA (${error.status ?? "inconnue"}). Réessaie dans un instant.`;
  }
  return "Une erreur inattendue est survenue pendant le traitement de ta demande.";
}

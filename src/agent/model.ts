/**
 * Model resolution.
 *
 * OpenRouter is OpenAI-compatible, so it goes through the AI SDK's
 * openai-compatible provider rather than needing its own SDK.
 *
 * The OpenRouter model catalogue could not be verified from the environment
 * this was built in (egress blocks openrouter.ai), so the model id is
 * env-driven with a documented default and the failure is made loud rather
 * than silent — an unverifiable external dependency should announce its own
 * problem instead of surfacing as a chat that never replies.
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5";

export type ModelSource = "openrouter" | "anthropic" | "unconfigured";

export interface ModelConfig {
  source: ModelSource;
  /** The model id in whichever provider's namespace is active. */
  modelId: string;
  /** Safe to show in a health response — never the key itself. */
  detail: string;
}

export function resolveModelConfig(env = process.env): ModelConfig {
  const openrouterKey = env.OPENROUTER_API_KEY?.trim();
  const anthropicKey = env.ANTHROPIC_API_KEY?.trim();

  if (openrouterKey) {
    return {
      source: "openrouter",
      modelId: env.DECOMP_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
      detail: "OPENROUTER_API_KEY present",
    };
  }

  if (anthropicKey) {
    return {
      source: "anthropic",
      // CopilotKit's own provider/model string form.
      modelId: env.DECOMP_MODEL?.trim() || "anthropic/claude-opus-5",
      detail: "ANTHROPIC_API_KEY present",
    };
  }

  return {
    source: "unconfigured",
    modelId: env.DECOMP_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
    detail: "no OPENROUTER_API_KEY or ANTHROPIC_API_KEY set",
  };
}

/**
 * The value handed to BuiltInAgent's `model`.
 *
 * OpenRouter needs a constructed LanguageModel because it is a custom base
 * URL; the Anthropic path can use CopilotKit's own "provider/model" string and
 * let it read the key from the environment.
 */
export function resolveModel(env = process.env): LanguageModel | string {
  const config = resolveModelConfig(env);

  if (config.source === "openrouter") {
    const openrouter = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY!,
      headers: {
        // OpenRouter attributes traffic by these; harmless if unset upstream.
        "HTTP-Referer": env.PUBLIC_URL ?? "https://decomp.local",
        "X-Title": "Decomp — FDE pair designer",
      },
    });
    return openrouter(config.modelId);
  }

  // String form: CopilotKit resolves the provider and reads the key from env.
  return config.modelId;
}

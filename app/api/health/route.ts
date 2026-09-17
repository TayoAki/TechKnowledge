/**
 * Config health.
 *
 * Reports whether a model provider is configured without ever echoing a key.
 * Exists because the two things most likely to be wrong after a deploy — a
 * missing key and a model id the provider rejects — are otherwise invisible
 * until a chat silently fails to answer.
 */

import { resolveModelConfig } from "@/agent/model";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = resolveModelConfig();

  return Response.json(
    {
      ok: config.source !== "unconfigured",
      model: { source: config.source, id: config.modelId, detail: config.detail },
      hint:
        config.source === "unconfigured"
          ? "Set OPENROUTER_API_KEY (or ANTHROPIC_API_KEY). The board, clock and coverage meter work without one; only the pair partner needs it."
          : undefined,
    },
    { status: config.source === "unconfigured" ? 503 : 200 },
  );
}

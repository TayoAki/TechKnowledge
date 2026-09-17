/**
 * The CopilotKit runtime endpoint.
 *
 * A catch-all route because the runtime defaults to `multi-route` mode, which
 * wants a separate route per operation. The Hono app it returns exposes a
 * standard `fetch`, which is exactly what the App Router wants.
 */

import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotHonoHandler,
} from "@copilotkit/runtime/v2";
import { PAIR_SYSTEM_PROMPT } from "@/agent/prompts";
import { resolveModel } from "@/agent/model";

const BASE_PATH = "/api/copilotkit";

/**
 * The reviewer model. Judgment calls — is the reframe real, does the cut line
 * actually ship, does the design match the scale read — run here.
 *
 * Resolved from the environment: OpenRouter when a key is present, otherwise
 * Anthropic direct. See src/agent/model.ts and GET /api/health.
 */
const MODEL = resolveModel();

const copilotRuntime = new CopilotRuntime({
  agents: {
    // The co-creating pair partner. It draws scaffolds and challenges content;
    // it does not fill the board in.
    default: new BuiltInAgent({
      model: MODEL,
      prompt: PAIR_SYSTEM_PROMPT,
      // Enough steps to place a ghost box and explain it in one turn.
      maxSteps: 8,
    }),
  },
});

const app = createCopilotHonoHandler({ runtime: copilotRuntime, basePath: BASE_PATH });

const handler = (req: Request) => app.fetch(req);

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;

// The agent streams SSE; the Node runtime keeps that simple.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

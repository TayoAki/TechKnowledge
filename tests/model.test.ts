import { describe, expect, it } from "vitest";
import { DEFAULT_OPENROUTER_MODEL, resolveModelConfig } from "@/agent/model";

describe("model resolution", () => {
  it("prefers OpenRouter when its key is present", () => {
    const c = resolveModelConfig({ OPENROUTER_API_KEY: "sk-or-x" } as never);
    expect(c.source).toBe("openrouter");
    expect(c.modelId).toBe(DEFAULT_OPENROUTER_MODEL);
  });

  it("falls back to Anthropic when only that key is present", () => {
    const c = resolveModelConfig({ ANTHROPIC_API_KEY: "sk-ant-x" } as never);
    expect(c.source).toBe("anthropic");
  });

  it("prefers OpenRouter when both keys are present", () => {
    const c = resolveModelConfig({
      OPENROUTER_API_KEY: "sk-or-x",
      ANTHROPIC_API_KEY: "sk-ant-x",
    } as never);
    expect(c.source).toBe("openrouter");
  });

  it("reports unconfigured rather than guessing", () => {
    const c = resolveModelConfig({} as never);
    expect(c.source).toBe("unconfigured");
    expect(c.detail).toMatch(/no OPENROUTER_API_KEY/);
  });

  it("treats a whitespace-only key as absent", () => {
    const c = resolveModelConfig({ OPENROUTER_API_KEY: "   " } as never);
    expect(c.source).toBe("unconfigured");
  });

  it("honours a model override", () => {
    const c = resolveModelConfig({
      OPENROUTER_API_KEY: "sk-or-x",
      DECOMP_MODEL: "anthropic/claude-opus-4.1",
    } as never);
    expect(c.modelId).toBe("anthropic/claude-opus-4.1");
  });

  it("never leaks the key in the reportable detail", () => {
    const c = resolveModelConfig({ OPENROUTER_API_KEY: "sk-or-v1-secret" } as never);
    expect(JSON.stringify(c)).not.toContain("secret");
  });
});

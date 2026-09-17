import { describe, expect, it } from "vitest";
import { CINEMA_BRIEF } from "@/domain/fixtures";
import { DecompositionBriefSchema } from "@/domain/brief";
import { validateBrief } from "@/domain/validators";
import { createClock } from "@/domain/clock";
import { assessCoverage } from "@/domain/coverage";

describe("the golden reference is a real, valid brief", () => {
  it("parses against the schema", () => {
    const r = DecompositionBriefSchema.safeParse(CINEMA_BRIEF);
    if (!r.success) {
      throw new Error(
        "fixture failed schema:\n" +
          r.error.issues
            .map((i) => `  ${i.path.join(".")}: ${i.message}`)
            .join("\n"),
      );
    }
    expect(r.success).toBe(true);
  });

  it("passes every hard invariant", () => {
    const report = validateBrief(
      CINEMA_BRIEF,
      createClock("full_60"),
      CINEMA_BRIEF.coverage as never,
    );
    const hard = report.issues.filter((i) => i.severity === "hard");
    if (hard.length > 0) {
      throw new Error(
        "fixture has hard issues:\n" +
          hard.map((i) => `  [${i.code}] ${i.message}`).join("\n"),
      );
    }
    expect(report.ok).toBe(true);
    expect(report.regenerate).toEqual([]);
  });

  it("meets the coverage bar: breadth in both, depth in one", () => {
    const v = assessCoverage(CINEMA_BRIEF.coverage as never);
    expect(v.meetsBar).toBe(true);
    expect(v.depthTrack).toBe("data_engineering");
  });

  it("names UX as the honest gap rather than faking coverage", () => {
    const report = validateBrief(CINEMA_BRIEF, null, CINEMA_BRIEF.coverage as never);
    const soft = report.issues.filter((i) => i.severity === "soft");
    // The delivery mechanism is an email, so there is genuinely no interface
    // to reason about. The board should say so, not imply coverage.
    expect(soft.map((i) => i.code)).toContain("coverage_skipped_ux");
  });
});

describe("structural properties the schema alone cannot express", () => {
  it("the cut line is a strict subset of the components", () => {
    const ids = CINEMA_BRIEF.architecture.components.map((c) => c.id);
    const cut = CINEMA_BRIEF.product.mvpCutLine;
    expect(cut.length).toBeLessThan(ids.length);
    for (const id of cut) expect(ids).toContain(id);
  });

  it("everything deferred by component sits outside the cut line", () => {
    const cut = new Set(CINEMA_BRIEF.product.mvpCutLine);
    for (const d of CINEMA_BRIEF.product.deferred) {
      if (d.componentId) expect(cut.has(d.componentId)).toBe(false);
    }
  });

  it("every component satisfies a declared requirement", () => {
    const reqs = new Set(CINEMA_BRIEF.architecture.requirements.map((r) => r.id));
    for (const c of CINEMA_BRIEF.architecture.components) {
      expect(reqs.has(c.satisfiesRequirement), `${c.name} -> ${c.satisfiesRequirement}`).toBe(true);
    }
  });

  it("reaches the application layer", () => {
    const layers = CINEMA_BRIEF.architecture.components.map((c) => c.layer);
    expect(layers).toContain("application");
  });

  it("caps requirements at two of each kind", () => {
    const r = CINEMA_BRIEF.architecture.requirements;
    expect(r.filter((x) => x.kind === "functional").length).toBeLessThanOrEqual(2);
    expect(r.filter((x) => x.kind === "non_functional").length).toBeLessThanOrEqual(2);
  });

  it("guardrails every primary metric", () => {
    for (const m of CINEMA_BRIEF.decomposition.metrics) {
      if (m.kind === "primary") expect(m.guardrail, m.name).not.toBeNull();
    }
  });

  it("sequences next MVPs so nothing precedes what unblocks it", () => {
    const next = CINEMA_BRIEF.product.nextMvps;
    const seen = new Set<string>();
    for (const n of next) {
      // Anything it depends on must already have been added, or be external.
      const dependsOnAnEarlierAdd = next.some((o) => o.adds === n.unblockedBy);
      if (dependsOnAnEarlierAdd) expect(seen.has(n.unblockedBy)).toBe(true);
      seen.add(n.adds);
    }
  });

  it("solution options optimise for materially different things", () => {
    const axes = CINEMA_BRIEF.decomposition.solution.options.map((o) =>
      o.optimizesFor.toLowerCase(),
    );
    expect(new Set(axes).size).toBe(axes.length);
  });

  it("recommends exactly one option, and it is the selected one", () => {
    const opts = CINEMA_BRIEF.decomposition.solution.options;
    const rec = opts.filter((o) => o.recommended);
    expect(rec).toHaveLength(1);
    expect(CINEMA_BRIEF.decomposition.solution.selectedId).toBe(rec[0].id);
  });

  it("reaches for at least one resource the prompt never offered", () => {
    const asks = CINEMA_BRIEF.decomposition.solution.options.filter(
      (o) => o.requiresUnlistedResource,
    );
    expect(asks.length).toBeGreaterThan(0);
  });

  it("states the grain as 'one row per ...'", () => {
    expect(CINEMA_BRIEF.decomposition.grainStatement).toMatch(/one row per/i);
  });

  it("includes an exogenous entity and a schema-change risk", () => {
    const e = CINEMA_BRIEF.decomposition.entities;
    expect(e.some((x) => x.role === "exogenous")).toBe(true);
    expect(e.some((x) => x.schemaChangeRisk !== null)).toBe(true);
  });

  it("owns every data-quality check", () => {
    for (const q of CINEMA_BRIEF.architecture.governance.dataQuality) {
      expect(q.owner.trim().length, q.check).toBeGreaterThan(0);
    }
  });

  it("does not cost the whole week as negligible", () => {
    const b = CINEMA_BRIEF.product.bottlenecks;
    expect(b).toHaveLength(3);
    expect(new Set(b.map((x) => x.kind)).size).toBe(3);
    expect(b.every((x) => x.costOfWindow === "negligible")).toBe(false);
  });

  it("demonstrates depth in the track it claims", () => {
    const claimed = CINEMA_BRIEF.coverage.find((c) => c.isDepthTrack)?.track;
    expect(CINEMA_BRIEF.deepDive?.track).toBe(claimed);
  });
});

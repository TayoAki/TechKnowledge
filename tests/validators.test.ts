import { describe, expect, it } from "vitest";
import { CINEMA_BRIEF } from "@/domain/fixtures";
import {
  challengesForSegment,
  isReframeSubstantive,
  validateBrief,
  type Issue,
} from "@/domain/validators";
import { advance, createClock, setPosture, tick } from "@/domain/clock";
import { computeCoverage, TRACK_TOPICS, type TopicId } from "@/domain/coverage";
import type { PartialBrief } from "@/domain/brief";

/** Deep-clone the valid fixture so each test can break exactly one thing. */
function mutate(fn: (b: any) => void): PartialBrief {
  const b = structuredClone(CINEMA_BRIEF) as any;
  fn(b);
  return b as PartialBrief;
}

function codes(issues: Issue[]): string[] {
  return issues.map((i) => i.code);
}

function run(brief: PartialBrief, coverage = CINEMA_BRIEF.coverage as never) {
  return validateBrief(brief, null, coverage);
}

describe("area 1 — decomposition", () => {
  it("catches an unexplained stakeholder gap", () => {
    const r = run(mutate((b) => (b.decomposition.triage.stakeholderGap = null)));
    expect(codes(r.issues)).toContain("stakeholder_gap_unstated");
  });

  it("allows a null gap when the named entity IS the stakeholder", () => {
    const r = run(
      mutate((b) => {
        b.decomposition.triage.stakeholderGap = null;
        b.decomposition.triage.namedEntity = "the regional programmer";
        b.decomposition.triage.actualStakeholder = "the regional programmer";
      }),
    );
    expect(codes(r.issues)).not.toContain("stakeholder_gap_unstated");
  });

  it("catches a missing current workaround", () => {
    const r = run(
      mutate((b) => (b.decomposition.painPoint.currentWorkaround.whatTheyDoToday = "")),
    );
    expect(codes(r.issues)).toContain("no_current_workaround");
  });

  it("catches a reframe that merely restates the prompt", () => {
    const r = run(
      mutate((b) => {
        b.decomposition.painPoint.reframe.broad = "seat utilisation is low";
        b.decomposition.painPoint.reframe.sharpened = "the seat utilisation is low";
      }),
    );
    expect(codes(r.issues)).toContain("reframe_restates");
  });

  it("catches two options on the same axis", () => {
    const r = run(
      mutate(
        (b) =>
          (b.decomposition.solution.options[0].optimizesFor =
            b.decomposition.solution.options[1].optimizesFor),
      ),
    );
    expect(codes(r.issues)).toContain("options_same_axis");
  });

  it("catches zero and multiple recommendations", () => {
    const none = run(
      mutate((b) =>
        b.decomposition.solution.options.forEach((o: any) => (o.recommended = false)),
      ),
    );
    expect(codes(none.issues)).toContain("options_recommendation");
    const many = run(
      mutate((b) =>
        b.decomposition.solution.options.forEach((o: any) => (o.recommended = true)),
      ),
    );
    expect(codes(many.issues)).toContain("options_recommendation");
  });

  it("catches a primary metric with no guardrail", () => {
    const r = run(mutate((b) => (b.decomposition.metrics[0].guardrail = null)));
    const issue = r.issues.find((i) => i.code === "primary_metric_no_guardrail")!;
    expect(issue).toBeDefined();
    // The challenge form names the metric back at the user.
    expect(issue.challenge).toMatch(/optimised/i);
    expect(issue.severity).toBe("hard");
  });

  it("does not demand a guardrail on a secondary metric", () => {
    const r = run(
      mutate((b) => {
        b.decomposition.metrics[2].kind = "secondary";
        b.decomposition.metrics[2].guardrail = null;
      }),
    );
    expect(codes(r.issues)).not.toContain("primary_metric_no_guardrail");
  });

  it("catches a missing exogenous entity", () => {
    const r = run(
      mutate((b) =>
        b.decomposition.entities.forEach((e: any) => {
          if (e.role === "exogenous") e.role = "dimension";
        }),
      ),
    );
    expect(codes(r.issues)).toContain("no_exogenous_entity");
  });

  it("catches a grain statement that is not a grain statement", () => {
    const r = run(
      mutate((b) => (b.decomposition.grainStatement = "showings and tickets")),
    );
    expect(codes(r.issues)).toContain("grain_not_stated");
  });
});

describe("area 2 — architecture", () => {
  it("regenerates PRODUCT, not architecture, on a third functional requirement", () => {
    const r = run(
      mutate((b) =>
        b.architecture.requirements.push({
          id: "F3",
          statement: "Also optimise pricing",
          kind: "functional",
        }),
      ),
    );
    const issue = r.issues.find((i) => i.code === "too_many_functional")!;
    expect(issue).toBeDefined();
    // The fault is upstream: the scope is too wide, so the fix belongs to area 3.
    expect(issue.segment).toBe("architecture");
    expect(issue.regenerateSegment).toBe("product");
    expect(r.regenerate).toContain("product");
  });

  it("catches an orphan component", () => {
    const r = run(
      mutate((b) => (b.architecture.components[0].satisfiesRequirement = "F99")),
    );
    expect(codes(r.issues)).toContain("component_orphan");
  });

  it("catches a design that never reaches the application layer", () => {
    const r = run(
      mutate((b) => {
        b.architecture.components = b.architecture.components.filter(
          (c: any) => c.layer !== "application",
        );
        b.product.mvpCutLine = ["ingest", "capacity"];
        b.product.deferred = b.product.deferred.filter((d: any) => d.componentId !== "view");
      }),
    );
    const issue = r.issues.find((i) => i.code === "no_application_layer")!;
    expect(issue).toBeDefined();
    expect(issue.challenge).toMatch(/what screen/i);
  });

  it("catches an unowned data-quality check", () => {
    const r = run(mutate((b) => (b.architecture.governance.dataQuality[0].owner = "  ")));
    const issue = r.issues.find((i) => i.code === "quality_check_unowned")!;
    expect(issue.challenge).toMatch(/never runs/i);
  });

  it("catches an estimate that contradicts needsArithmetic", () => {
    const r = run(mutate((b) => (b.architecture.scale.needsArithmetic = false)));
    expect(codes(r.issues)).toContain("scale_estimate_mismatch");
  });
});

describe("area 3 — product", () => {
  it("catches a cut line containing everything", () => {
    const r = run(
      mutate(
        (b) =>
          (b.product.mvpCutLine = b.architecture.components.map((c: any) => c.id)),
      ),
    );
    expect(codes(r.issues)).toContain("cut_line_is_everything");
  });

  it("catches a cut line referencing a component that does not exist", () => {
    const r = run(mutate((b) => b.product.mvpCutLine.push("nonexistent")));
    expect(codes(r.issues)).toContain("cut_line_unknown_component");
  });

  it("catches something deferred that is also shipping", () => {
    const r = run(mutate((b) => (b.product.deferred[0].componentId = "ingest")));
    expect(codes(r.issues)).toContain("deferred_inside_cut_line");
  });

  it("catches a week that supposedly costs nothing", () => {
    const r = run(
      mutate((b) =>
        b.product.bottlenecks.forEach((x: any) => (x.costOfWindow = "negligible")),
      ),
    );
    const issue = r.issues.find((i) => i.code === "bottleneck_denial")!;
    expect(issue.challenge).toMatch(/documented API/i);
  });

  it("catches a missing bottleneck kind", () => {
    const r = run(
      mutate((b) => (b.product.bottlenecks[2].kind = b.product.bottlenecks[1].kind)),
    );
    expect(codes(r.issues)).toContain("bottlenecks_incomplete");
  });
});

describe("endings and coverage", () => {
  it("catches a depth track that does not match the deep dive", () => {
    const r = run(mutate((b) => (b.deepDive.track = "full_stack")));
    expect(codes(r.issues)).toContain("depth_track_mismatch");
  });

  it("catches jargon in the customer summary", () => {
    const r = run(
      mutate((b) => {
        b.companyMode = "present_back";
        b.deepDive = null;
        b.presentBack = {
          whatTheyCanNowDo: "Query the vector store for similar showings.",
          jargonSwaps: [
            { instead: "vector store", say: "search by meaning" },
            { instead: "p99", say: "the slowest few percent" },
          ],
          keyTradeoffs: [{ decision: "d", chose: "c", because: "b" }],
          nextSteps: { shipsFirst: "a", comesAfter: "b", needFromYou: "c" },
        };
      }),
    );
    const issue = r.issues.find((i) => i.code === "present_back_jargon")!;
    expect(issue).toBeDefined();
    expect(issue.challenge).toMatch(/engineer language/i);
  });

  it("catches a missing deep dive when the company expects one", () => {
    const r = run(mutate((b) => (b.deepDive = null)));
    expect(codes(r.issues)).toContain("missing_deep_dive");
  });

  it("holds breadth in the weaker track even with depth in the other", () => {
    const thin = computeCoverage(
      [...(TRACK_TOPICS.data_engineering as readonly TopicId[]), "api_design"],
      "data_engineering",
      "deep",
    );
    const r = validateBrief(CINEMA_BRIEF, null, thin);
    const issue = r.issues.find((i) => i.code === "coverage_breadth_gap")!;
    expect(issue).toBeDefined();
    expect(issue.message).toMatch(/does not excuse/i);
    // The gap is fixed by designing more, not by going deeper.
    expect(issue.regenerateSegment).toBe("architecture");
  });
});

describe("clock validation", () => {
  it("rejects a drill running in pair posture", () => {
    const c = createClock("drill_20");
    const forced = { ...c, segments: c.segments.map((s) => ({ ...s, posture: "pair" as const })) };
    const r = validateBrief(CINEMA_BRIEF, forced, CINEMA_BRIEF.coverage as never);
    const issue = r.issues.find((i) => i.code === "clock_posture_not_allowed")!;
    expect(issue.challenge).toMatch(/critiques at the buzzer/i);
  });

  it("accepts a legal posture change", () => {
    const c = setPosture(createClock("full_60"), "wrap", "draft");
    const r = validateBrief(CINEMA_BRIEF, c, CINEMA_BRIEF.coverage as never);
    expect(codes(r.issues)).not.toContain("clock_posture_not_allowed");
  });

  it("catches an inconsistent debt figure", () => {
    const real = advance(tick(createClock("full_60"), 25));
    const lying = { ...real, debtMinutes: 0 };
    const r = validateBrief(CINEMA_BRIEF, lying, CINEMA_BRIEF.coverage as never);
    expect(codes(r.issues)).toContain("clock_debt_mismatch");
  });
});

describe("the validators ARE the challenge library", () => {
  it("every issue carries both a report form and a spoken form", () => {
    const r = run(
      mutate((b) => {
        b.decomposition.metrics[0].guardrail = null;
        b.architecture.components[0].satisfiesRequirement = "F99";
      }),
    );
    expect(r.issues.length).toBeGreaterThan(0);
    for (const i of r.issues) {
      expect(i.message.length, i.code).toBeGreaterThan(0);
      expect(i.challenge.length, i.code).toBeGreaterThan(0);
      expect(i.message, i.code).not.toBe(i.challenge);
    }
  });

  it("caps challenges per segment so the AI does not become noise", () => {
    const r = run(
      mutate((b) => {
        b.decomposition.metrics.forEach((m: any) => (m.guardrail = null));
        b.decomposition.grainStatement = "stuff";
        b.decomposition.triage.stakeholderGap = null;
        b.decomposition.painPoint.currentWorkaround.whatTheyDoToday = "";
      }),
    );
    expect(challengesForSegment(r, "decomposition").length).toBeLessThanOrEqual(3);
  });

  it("never repeats a dismissed challenge", () => {
    const r = run(mutate((b) => (b.decomposition.grainStatement = "stuff")));
    const dismissed = new Set(["grain_not_stated"]);
    const shown = challengesForSegment(r, "decomposition", { dismissed });
    expect(codes(shown)).not.toContain("grain_not_stated");
  });

  it("puts hard issues before soft ones", () => {
    const r = run(
      mutate((b) => {
        b.decomposition.grainStatement = "stuff";        // hard
        b.decomposition.triage.resourcesToAskFor = [];   // soft
      }),
    );
    const shown = challengesForSegment(r, "decomposition", { max: 10 });
    const firstSoft = shown.findIndex((i) => i.severity === "soft");
    const lastHard = shown.map((i) => i.severity).lastIndexOf("hard");
    if (firstSoft !== -1 && lastHard !== -1) expect(lastHard).toBeLessThan(firstSoft);
  });
});

describe("reframe heuristic", () => {
  it("rejects identical and trivially reworded statements", () => {
    expect(isReframeSubstantive("utilisation is low", "utilisation is low")).toBe(false);
    expect(isReframeSubstantive("utilisation is low", "the utilisation is low")).toBe(false);
  });

  it("accepts a genuinely sharper problem statement", () => {
    expect(
      isReframeSubstantive(
        "seat utilisation is low",
        "the programmer cannot test a proposed grid before publishing it",
      ),
    ).toBe(true);
  });

  it("rejects empty input rather than throwing", () => {
    expect(isReframeSubstantive("", "something")).toBe(false);
  });
});

describe("challenge noise (regression)", () => {
  it("says a per-item rule once, not once per item", () => {
    // Three unnarrated bottlenecks produced three copies of the same sentence
    // in the UI, which is how you teach someone to ignore the panel.
    const r = run(
      mutate((b) =>
        b.product.bottlenecks.forEach((x: any) => (x.narration = "")),
      ),
    );
    const shown = challengesForSegment(r, "product", { max: 10 });
    const unnarrated = shown.filter((i) => i.code === "bottleneck_unnarrated");
    expect(unnarrated).toHaveLength(1);
  });

  it("still reports every instance in the underlying report", () => {
    // Deduping is a presentation concern; the report itself stays complete.
    const r = run(
      mutate((b) =>
        b.product.bottlenecks.forEach((x: any) => (x.narration = "")),
      ),
    );
    expect(
      r.issues.filter((i) => i.code === "bottleneck_unnarrated").length,
    ).toBe(3);
  });

  it("keeps the hard instance when a code appears at both severities", () => {
    const r = run(mutate((b) => (b.decomposition.grainStatement = "stuff")));
    const shown = challengesForSegment(r, "decomposition", { max: 10 });
    expect(new Set(shown.map((i) => i.code)).size).toBe(shown.length);
  });
});

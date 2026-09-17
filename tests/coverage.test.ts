import { describe, expect, it } from "vitest";
import {
  assessCoverage,
  BREADTH_THRESHOLD,
  computeCoverage,
  coverageSummaryForAgent,
  MOST_SKIPPED,
  TRACKS,
  TRACK_TOPICS,
  trackForTopic,
  type TopicId,
} from "@/domain/coverage";

const ALL_DE = TRACK_TOPICS.data_engineering as readonly TopicId[];
const ALL_FS = TRACK_TOPICS.full_stack as readonly TopicId[];

describe("topic bookkeeping", () => {
  it("every topic maps to exactly one track", () => {
    for (const track of TRACKS) {
      for (const t of TRACK_TOPICS[track] as readonly TopicId[]) {
        expect(trackForTopic(t)).toBe(track);
      }
    }
  });

  it("touched and missed always partition the track's topics", () => {
    const cov = computeCoverage(["pipelines", "ux"], "full_stack", "built the view");
    for (const c of cov) {
      const union = [...c.topicsTouched, ...c.topicsMissed].sort();
      const expected = [...(TRACK_TOPICS[c.track] as readonly TopicId[])].sort();
      expect(union).toEqual(expected);
    }
  });
});

describe("breadth is computed, not asserted", () => {
  it("meets breadth at the threshold", () => {
    const cov = computeCoverage(ALL_DE.slice(0, BREADTH_THRESHOLD), "data_engineering", "x");
    expect(cov.find((c) => c.track === "data_engineering")!.breadthMet).toBe(true);
  });

  it("falls short one topic below the threshold", () => {
    const cov = computeCoverage(ALL_DE.slice(0, BREADTH_THRESHOLD - 1), "data_engineering", "x");
    expect(cov.find((c) => c.track === "data_engineering")!.breadthMet).toBe(false);
  });
});

describe("the bar: breadth in both, depth in one", () => {
  it("passes when both are broad and exactly one is deep", () => {
    const v = assessCoverage(
      computeCoverage([...ALL_DE, ...ALL_FS], "data_engineering", "schema evolution depth"),
    );
    expect(v.meetsBar).toBe(true);
    expect(v.depthTrack).toBe("data_engineering");
    expect(v.problems).toEqual([]);
  });

  it("depth in one does NOT excuse absence in the other", () => {
    const v = assessCoverage(computeCoverage(ALL_DE, "data_engineering", "deep"));
    expect(v.meetsBar).toBe(false);
    expect(v.breadthGaps.map((g) => g.track)).toEqual(["full_stack"]);
    expect(v.problems.join(" ")).toMatch(/does not excuse/i);
  });

  it("fails with no depth track claimed", () => {
    const v = assessCoverage(computeCoverage([...ALL_DE, ...ALL_FS], null));
    expect(v.meetsBar).toBe(false);
    expect(v.problems.join(" ")).toMatch(/depth in at least one/i);
  });

  it("fails when depth is claimed without evidence", () => {
    const v = assessCoverage(
      computeCoverage([...ALL_DE, ...ALL_FS], "full_stack", null),
    );
    expect(v.meetsBar).toBe(false);
    expect(v.problems.join(" ")).toMatch(/no evidence/i);
  });

  it("only the claimed track carries depth evidence", () => {
    const cov = computeCoverage([...ALL_DE, ...ALL_FS], "full_stack", "built the API");
    expect(cov.find((c) => c.track === "full_stack")!.depthEvidence).toBe("built the API");
    expect(cov.find((c) => c.track === "data_engineering")!.depthEvidence).toBeNull();
  });
});

describe("the two most-skipped topics", () => {
  it("are schema evolution and UX", () => {
    expect([...MOST_SKIPPED].sort()).toEqual(["schema_evolution", "ux"]);
  });

  it("are surfaced to the agent when missing", () => {
    const summary = coverageSummaryForAgent(
      computeCoverage(["pipelines", "data_quality", "application_architecture"], null),
    );
    const de = summary.find((s) => s.track === "data_engineering")!;
    const fs = summary.find((s) => s.track === "full_stack")!;
    expect(de.mostSkippedStillMissing).toContain("schema_evolution");
    expect(fs.mostSkippedStillMissing).toContain("ux");
  });

  it("drop off the agent's list once covered", () => {
    const summary = coverageSummaryForAgent(
      computeCoverage([...ALL_DE, ...ALL_FS], "data_engineering", "x"),
    );
    for (const s of summary) expect(s.mostSkippedStillMissing).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  activeSegment,
  advance,
  createClock,
  effectiveBudget,
  goBackTo,
  isOverrunning,
  setPosture,
  tick,
  clockSummaryForAgent,
} from "@/domain/clock";
import { PRESET_SPECS, PRESETS, SEGMENTS } from "@/domain/segments";

describe("preset allocations", () => {
  it("every timed preset's budgets sum to its total", () => {
    for (const preset of PRESETS) {
      const spec = PRESET_SPECS[preset];
      if (spec.totalMinutes === null) continue;
      const sum = SEGMENTS.reduce((n, s) => n + spec.budgets[s], 0);
      expect(sum, `${preset} budgets`).toBe(spec.totalMinutes);
    }
  });

  it("full_60 gives decomposition the largest block", () => {
    const b = PRESET_SPECS.full_60.budgets;
    const maxArea = Math.max(b.decomposition, b.architecture, b.product);
    expect(b.decomposition).toBe(maxArea);
  });

  it("drill_20 permits only blank posture", () => {
    expect(PRESET_SPECS.drill_20.allowedPostures).toEqual(["blank"]);
  });
});

describe("spending down", () => {
  it("starts with the first segment active and nothing spent", () => {
    const c = createClock("full_60");
    expect(activeSegment(c)?.segment).toBe("decomposition");
    expect(c.minutesRemaining).toBe(60);
    expect(c.debtMinutes).toBe(0);
  });

  it("tick reduces the total remaining, not just the segment", () => {
    const c = tick(createClock("full_60"), 5);
    expect(c.minutesRemaining).toBe(55);
    expect(activeSegment(c)?.elapsedMinutes).toBe(5);
  });

  it("records overrun without correcting it", () => {
    const c = tick(createClock("full_60"), 25); // budget is 18
    const seg = c.segments.find((s) => s.segment === "decomposition")!;
    expect(seg.overranBy).toBe(7);
    expect(seg.budgetMinutes).toBe(18); // plan is never mutated
  });

  it("a running segment's overrun is not yet debt", () => {
    const c = tick(createClock("full_60"), 25);
    expect(c.debtMinutes).toBe(0);
  });

  it("debt lands only once the segment is finished", () => {
    const c = advance(tick(createClock("full_60"), 25));
    expect(c.debtMinutes).toBe(7);
  });
});

describe("borrowing", () => {
  it("overrun shrinks the remaining segments proportionally", () => {
    const c = advance(tick(createClock("full_60"), 25)); // 7 min of debt
    // open budgets: arch 15 + product 10 + depth 15 + wrap 2 = 42
    expect(effectiveBudget(c, "architecture")).toBeCloseTo(15 - 7 * (15 / 42), 1);
    expect(effectiveBudget(c, "product")).toBeCloseTo(10 - 7 * (10 / 42), 1);
    // a big block absorbs more of the overrun than a small one
    const archLoss = 15 - effectiveBudget(c, "architecture");
    const wrapLoss = 2 - effectiveBudget(c, "wrap");
    expect(archLoss).toBeGreaterThan(wrapLoss);
  });

  it("borrowed minutes sum to roughly the debt", () => {
    const c = advance(tick(createClock("full_60"), 25));
    const open = c.segments.filter((s) => s.status !== "done");
    const borrowed = open.reduce(
      (n, s) => n + (s.budgetMinutes - effectiveBudget(c, s.segment)),
      0,
    );
    expect(borrowed).toBeCloseTo(7, 0);
  });

  it("never shrinks a segment below one minute", () => {
    // Burn the whole hour in segment one, then close it.
    const c = advance(tick(createClock("full_60"), 70));
    for (const s of c.segments.filter((x) => x.status !== "done")) {
      expect(effectiveBudget(c, s.segment)).toBeGreaterThanOrEqual(1);
    }
  });

  it("a finished segment keeps its planned budget", () => {
    const c = advance(tick(createClock("full_60"), 25));
    expect(effectiveBudget(c, "decomposition")).toBe(18);
  });

  it("with no debt, effective equals planned", () => {
    const c = advance(tick(createClock("full_60"), 10));
    expect(effectiveBudget(c, "architecture")).toBe(15);
  });

  it("overrunning is judged against the shrunken budget", () => {
    let c = advance(tick(createClock("full_60"), 25)); // 7 debt, arch now ~12.5
    c = tick(c, 13);
    expect(isOverrunning(c, "architecture")).toBe(true);
  });
});

describe("navigation", () => {
  it("advance closes the active segment and opens the next", () => {
    const c = advance(createClock("full_60"));
    expect(c.segments[0].status).toBe("done");
    expect(activeSegment(c)?.segment).toBe("architecture");
  });

  it("going back reopens an earlier segment and keeps elapsed time", () => {
    let c = tick(createClock("full_60"), 12);
    c = advance(c);
    c = tick(c, 6);
    c = goBackTo(c, "decomposition");
    expect(activeSegment(c)?.segment).toBe("decomposition");
    // The clock keeps running — revisiting has an honest cost.
    expect(c.minutesRemaining).toBe(42);
  });

  it("advancing past the last segment is terminal, not an error", () => {
    let c = createClock("full_60");
    for (let i = 0; i < 10; i++) c = advance(c);
    expect(c.segments.every((s) => s.status === "done")).toBe(true);
    expect(() => advance(c)).not.toThrow();
  });

  it("tick on a finished session is a no-op", () => {
    let c = createClock("full_60");
    for (let i = 0; i < 6; i++) c = advance(c);
    expect(tick(c, 5).minutesRemaining).toBe(c.minutesRemaining);
  });
});

describe("posture", () => {
  it("rejects a posture the preset does not allow", () => {
    const c = createClock("drill_20");
    expect(() => setPosture(c, "decomposition", "pair")).toThrow(/not available/);
  });

  it("allows an permitted posture", () => {
    const c = setPosture(createClock("full_60"), "wrap", "draft");
    expect(c.segments.find((s) => s.segment === "wrap")?.posture).toBe("draft");
  });
});

describe("agent summary", () => {
  it("reports the shrunken budget, not the planned one", () => {
    const c = advance(tick(createClock("full_60"), 25));
    const s = clockSummaryForAgent(c);
    expect(s.activeSegment).toBe("architecture");
    expect(s.debtMinutes).toBe(7);
    expect(s.segmentBudget!).toBeLessThan(15);
  });

  it("study mode carries no countdown", () => {
    const s = clockSummaryForAgent(createClock("study"));
    expect(PRESET_SPECS.study.totalMinutes).toBeNull();
    expect(s.minutesRemaining).toBe(0);
  });
});

describe("sub-minute ticking (regression)", () => {
  it("accumulates one-second ticks instead of rounding them away", () => {
    // The browser smoke test caught this: rounding the accumulator to 0.1 min
    // discarded every tick smaller than 6 seconds, so the clock never moved.
    let c = createClock("full_60");
    const oneSecond = 1 / 60;
    for (let i = 0; i < 30; i++) c = tick(c, oneSecond);
    expect(activeSegment(c)!.elapsedMinutes).toBeCloseTo(0.5, 2);
    expect(c.minutesRemaining).toBeCloseTo(59.5, 1);
  });

  it("a single one-second tick moves the clock at all", () => {
    const c = tick(createClock("full_60"), 1 / 60);
    expect(activeSegment(c)!.elapsedMinutes).toBeGreaterThan(0);
  });

  it("stays accurate over a full segment's worth of seconds", () => {
    let c = createClock("full_60");
    for (let i = 0; i < 18 * 60; i++) c = tick(c, 1 / 60);
    expect(activeSegment(c)!.elapsedMinutes).toBeCloseTo(18, 1);
    expect(activeSegment(c)!.overranBy).toBeCloseTo(0, 1);
  });
});

describe("the countdown is visible at one-second granularity (regression)", () => {
  it("minutesRemaining reflects a single second, not a 6-second quantum", () => {
    // Quantising stored figures to 0.1 min made the countdown appear frozen:
    // 60 - 0.0167 rounded back to 60.0 and the display never changed.
    const c = tick(createClock("full_60"), 1 / 60);
    expect(c.minutesRemaining).toBeLessThan(60);
    expect(c.minutesRemaining).toBeGreaterThan(59.9);
  });

  it("every second produces a distinct remaining value", () => {
    let c = createClock("full_60");
    const seen = new Set<number>();
    for (let i = 0; i < 5; i++) {
      c = tick(c, 1 / 60);
      seen.add(c.minutesRemaining);
    }
    expect(seen.size).toBe(5);
  });

  it("overrun accrues at one-second granularity too", () => {
    let c = tick(createClock("full_60"), 18); // exactly at budget
    expect(activeSegment(c)!.overranBy).toBe(0);
    c = tick(c, 1 / 60);
    expect(activeSegment(c)!.overranBy).toBeGreaterThan(0);
  });
});

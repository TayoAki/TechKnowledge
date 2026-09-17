import { describe, expect, it } from "vitest";
import {
  ALWAYS,
  certainNodes,
  enumerateVariants,
  excludedNodes,
  FORKS,
  nextQuestion,
  progress,
  remaining,
  undecidedNodes,
  type Answers,
} from "@/domain/variants";

const VARIANTS = enumerateVariants();

describe("the candidate space", () => {
  it("is non-trivial but enumerable", () => {
    // 2*2*2*2*3*2 = 96 before pruning; incompatibilities remove some.
    expect(VARIANTS.length).toBeGreaterThan(20);
    expect(VARIANTS.length).toBeLessThan(96);
  });

  it("gives every candidate exactly one answer per fork", () => {
    for (const v of VARIANTS) {
      for (const f of FORKS) expect(v.choices[f.id], `${v.id}/${f.id}`).toBeTruthy();
      expect(Object.keys(v.choices)).toHaveLength(FORKS.length);
    }
  });

  it("has unique candidate ids", () => {
    expect(new Set(VARIANTS.map((v) => v.id)).size).toBe(VARIANTS.length);
  });

  it("excludes the contradictory combinations", () => {
    // A tool you work inside cannot sit on a pre-computed read.
    expect(
      VARIANTS.some((v) => v.choices.serving === "report" && v.choices.surface === "app"),
    ).toBe(false);
    // Continuous ingest has no batch window to restate.
    expect(
      VARIANTS.some(
        (v) => v.choices.cadence === "continuous" && v.choices.correction === "restate",
      ),
    ).toBe(false);
  });

  it("keeps the spine in every candidate", () => {
    for (const v of VARIANTS) {
      for (const n of ALWAYS) expect(v.nodes, `${v.id} missing ${n}`).toContain(n);
    }
  });

  it("never lets a removal and its addition coexist", () => {
    for (const v of VARIANTS) {
      expect(v.nodes.includes("ingest_incremental") && v.nodes.includes("ingest_stream")).toBe(false);
      expect(v.nodes.includes("precomputed_read") && v.nodes.includes("whatif_endpoint")).toBe(false);
      const surfaces = ["surface_dashboard", "surface_app", "surface_nl_ask"].filter((s) =>
        v.nodes.includes(s as never),
      );
      expect(surfaces).toHaveLength(1);
    }
  });
});

describe("elimination", () => {
  it("narrows on each answer", () => {
    let answers: Answers = {};
    let last = VARIANTS.length;
    for (const fork of FORKS) {
      answers = { ...answers, [fork.id]: fork.options[0].id };
      const alive = remaining(VARIANTS, answers).length;
      expect(alive, `after ${fork.id}`).toBeLessThanOrEqual(last);
      last = alive;
    }
    expect(last).toBeGreaterThanOrEqual(0);
  });

  it("an answer can eliminate candidates across other forks", () => {
    // Choosing a report rules out the app surface entirely, not just serving.
    const alive = remaining(VARIANTS, { serving: "report" });
    expect(alive.length).toBeGreaterThan(0);
    expect(alive.every((v) => v.choices.surface !== "app")).toBe(true);
  });

  it("no answer leaves zero candidates", () => {
    for (const fork of FORKS) {
      for (const opt of fork.options) {
        expect(
          remaining(VARIANTS, { [fork.id]: opt.id }).length,
          `${fork.id}=${opt.id}`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("question selection by information gain", () => {
  it("asks something at the start", () => {
    expect(nextQuestion(VARIANTS, {})?.id).toBeTruthy();
  });

  it("never re-asks an answered fork", () => {
    const answers: Answers = { cadence: "deadline" };
    expect(nextQuestion(VARIANTS, answers)?.id).not.toBe("cadence");
  });

  it("skips a question every survivor already answers the same way", () => {
    // Once serving=report, surface=app is impossible; the surface question is
    // still informative (dashboard vs ask), so pick a fork that is genuinely
    // settled: after choosing continuous, correction is forced to overwrite.
    const answers: Answers = { cadence: "continuous" };
    const alive = remaining(VARIANTS, answers);
    expect(alive.every((v) => v.choices.correction === "overwrite")).toBe(true);
    // A settled fork must not be offered.
    let guard = 0;
    let a = answers;
    while (nextQuestion(VARIANTS, a) && guard++ < 10) {
      const q = nextQuestion(VARIANTS, a)!;
      expect(q.id).not.toBe("correction");
      a = { ...a, [q.id]: q.options.find((o) =>
        remaining(VARIANTS, { ...a, [q.id]: o.id }).length > 0)!.id };
    }
  });

  it("converges in about seven questions on every path", () => {
    // The point of the game: log2(candidates) questions, not one per fork.
    for (const start of FORKS[0].options) {
      let answers: Answers = { [FORKS[0].id]: start.id };
      let asked = 1;
      while (asked < 20) {
        const q = nextQuestion(VARIANTS, answers);
        if (!q) break;
        const viable = q.options.filter(
          (o) => remaining(VARIANTS, { ...answers, [q.id]: o.id }).length > 0,
        );
        answers = { ...answers, [q.id]: viable[0].id };
        asked++;
      }
      expect(remaining(VARIANTS, answers).length, `path from ${start.id}`).toBe(1);
      expect(asked, `questions from ${start.id}`).toBeLessThanOrEqual(7);
    }
  });
});

describe("progressive fill-in", () => {
  it("knows the spine before any question is asked", () => {
    const certain = certainNodes(VARIANTS, {});
    for (const n of ALWAYS) expect(certain).toContain(n);
  });

  it("nothing is excluded before any question", () => {
    // Every optional node appears in at least one candidate at the start.
    expect(excludedNodes(VARIANTS, {})).toEqual([]);
  });

  it("an answer moves nodes from undecided to certain", () => {
    const before = certainNodes(VARIANTS, {}).length;
    const after = certainNodes(VARIANTS, { cadence: "deadline" }).length;
    expect(after).toBeGreaterThan(before);
    expect(certainNodes(VARIANTS, { cadence: "deadline" })).toContain("ingest_incremental");
  });

  it("an answer moves nodes to excluded", () => {
    expect(excludedNodes(VARIANTS, { cadence: "deadline" })).toContain("ingest_stream");
  });

  it("certain, excluded and undecided always partition the node set", () => {
    const answers: Answers = { cadence: "deadline", serving: "simulate" };
    const c = certainNodes(VARIANTS, answers);
    const e = excludedNodes(VARIANTS, answers);
    const u = undecidedNodes(VARIANTS, answers);
    expect(c.length + e.length + u.length).toBe(19); // NODES.length
    expect(new Set([...c, ...e, ...u]).size).toBe(19);
  });

  it("leaves nothing undecided once converged", () => {
    let answers: Answers = {};
    while (true) {
      const q = nextQuestion(VARIANTS, answers);
      if (!q) break;
      const viable = q.options.filter(
        (o) => remaining(VARIANTS, { ...answers, [q.id]: o.id }).length > 0,
      );
      answers = { ...answers, [q.id]: viable[0].id };
    }
    const p = progress(VARIANTS, answers);
    expect(p.alive).toBe(1);
    expect(p.converged).not.toBeNull();
    expect(p.undecided).toEqual([]);
    expect(p.questionsLeftAtBest).toBe(0);
  });
});

describe("questions are answerable without knowing the architecture", () => {
  /**
   * Word-boundary matched, not substring: "a system upstream" is plain English
   * and must not trip on "stream". Stems that only ever appear in jargon
   * (idempot-, medallion) keep a trailing wildcard.
   */
  const JARGON = [
    /\bbatch(es|ing)?\b/,
    /\bstream(s|ing|ed)?\b/,
    /\bkafka\b/,
    /\bdelta\b/,
    /\bmedallion/,
    /\bendpoint(s)?\b/,
    /\bschema(s)?\b/,
    /\bpipelines?\b/,
    /\bwarehouse(s)?\b/,
    /\bcheckpoint(s|ing)?\b/,
    /\bpartition(s|ing|ed)?\b/,
    /\bidempot/,
    /\bETL\b/i,
    /\bCDC\b/i,
  ];

  it("no question text uses architecture jargon", () => {
    for (const f of FORKS) {
      for (const rx of JARGON) {
        expect(f.question, `${f.id}: "${f.question}" matched ${rx}`).not.toMatch(rx);
      }
    }
  });

  it("no answer text uses architecture jargon", () => {
    for (const f of FORKS) {
      for (const o of f.options) {
        for (const rx of JARGON) {
          expect(o.answer, `${f.id}/${o.id}: "${o.answer}" matched ${rx}`).not.toMatch(rx);
        }
      }
    }
  });

  it("the matcher itself still catches real jargon", () => {
    // Guard against the boundary fix quietly disabling the check.
    const bad = "Should ingestion be batch or streaming into the warehouse?";
    expect(JARGON.some((rx) => rx.test(bad))).toBe(true);
    const fine = "A system upstream starts sending something new.";
    expect(JARGON.some((rx) => rx.test(fine))).toBe(false);
  });

  it("every fork explains what it decided, in architecture terms", () => {
    for (const f of FORKS) expect(f.decides.length).toBeGreaterThan(10);
  });
});

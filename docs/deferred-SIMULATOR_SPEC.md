> **Deferred — not the current product line.**
>
> This schema belongs to the *simulator* mode (an adversarial interviewer that hides the
> answer key and grades you). The product pivoted to the **guided decomposition
> workbench** — see [`PLAN.md`](PLAN.md) and [`BRIEF_SPEC.md`](BRIEF_SPEC.md). Kept because
> the simulator is the natural second act: once a user has read 30 worked briefs, testing
> them is the obvious upsell, and the hidden-answer-key design still holds.

# `ScenarioSpec` — the scenario schema

A scenario is **not a prompt string**. It is a small public half and a large hidden half.

The hidden half is the product's core IP. It does three jobs at once:

1. It lets the interviewer be **principled rather than randomly evasive** — every answer it
   gives comes from a fixed table, so the same question gets the same answer in every session.
2. It gives the examiner **scenario-specific anchors**, so grading is a comparison against
   known structure rather than a vibe.
3. It makes the generator's output **mechanically validatable** — the gates in
   `PLAN.md` §6 are assertions over these fields.

Used as the structured-output schema for the generator (`output_config.format`), so the
same definition is the generation contract, the validation target, and the runtime type.

## Schema

```ts
import { z } from "zod";

export const SIGNALS = [
  "scopes_before_solving",
  "clean_decomposition",
  "failure_modes",
  "explicit_assumptions",
  "tradeoff_reasoning",
  "structured_communication",
  "end_user_orientation",
] as const;

const Level = z.enum(["weak", "adequate", "excellent"]);

export const ScenarioSpec = z.object({
  id: z.string(),
  specVersion: z.literal(1),

  seed: z.object({
    domain: z.string(),
    orgArchetype: z.string(),
    dataMess: z.string(),
    problemClass: z.string(),
    decisionOwner: z.string(),
  }),

  difficulty: z.number().int().min(1).max(5),
  expectedMinutes: z.number().int().min(30).max(75),

  // ───────────── PUBLIC: all the candidate is given ─────────────
  public: z.object({
    // Deliberately under-specified. No metrics, no numbers, no stated objective.
    prompt: z.string().max(600),
    // Named only. Shape, owner and freshness are hidden until asked.
    availableData: z.array(z.string()).min(2).max(6),
  }),

  // ───────────── HIDDEN: the answer key ─────────────
  hidden: z.object({
    // What the stakeholder actually wants. Absent from the public prompt by construction.
    trueObjective: z.string(),

    // The end user and the decision this enables. Unlocks the end_user_orientation signal.
    endUser: z.object({
      role: z.string(),
      decision: z.string(),
      // What makes the output useless to them even if technically correct.
      uselessIf: z.string(),
    }),

    // The reveal table. The interviewer answers ONLY from here, and only when triggered.
    hiddenConstraints: z.array(z.object({
      id: z.string(),
      fact: z.string(),
      // The question that unlocks it. Must be unique across the array.
      revealTrigger: z.string(),
      // How much it should reshape the design once known.
      impact: z.enum(["reframes_problem", "constrains_design", "detail"]),
      // If never asked, this is a named miss in the report.
      missIfUnasked: z.string(),
    })).min(3),

    // Valid ways to split the problem. At least one must be weak — a scenario where
    // every split works has no landmine and will not discriminate.
    decompositionAxes: z.array(z.object({
      axis: z.string(),
      quality: z.enum(["strong", "acceptable", "weak"]),
      why: z.string(),
    })).min(2),

    // 3–5 parts. The graph must be a real DAG with at least one fan-out, not a chain.
    workstreams: z.array(z.object({
      id: z.string(),
      name: z.string(),
      dependsOn: z.array(z.string()),
      // Why it sequences here — by risk or by value, stated.
      sequencingRationale: z.string(),
    })).min(3).max(5),

    // Attractive wrong turns, with the tell that the candidate has taken one.
    landmines: z.array(z.object({
      description: z.string(),
      tell: z.string(),
      // How the interviewer responds: never correct, only probe.
      probe: z.string(),
    })).min(2),

    // What should break. selfSurfaced=true means a strong candidate raises it unprompted.
    failureModes: z.array(z.object({
      mode: z.string(),
      detection: z.string(),
      degradation: z.string(),
      selfSurfaced: z.boolean(),
    })).min(2),

    // Key decisions. Both sides must carry a cost, or the pair is rejected.
    tradeoffPairs: z.array(z.object({
      decision: z.string(),
      optionA: z.object({ name: z.string(), cost: z.string() }),
      optionB: z.object({ name: z.string(), cost: z.string() }),
      axes: z.array(z.enum(["cost", "latency", "complexity", "maintainability", "risk"])).min(2),
      // Defensible either way, or is one clearly right here?
      defensibleEitherWay: z.boolean(),
    })).min(2),

    // Escalating follow-ups, scoped to a phase. Reframe → narrow → offer two directions.
    probeBank: z.array(z.object({
      phase: z.enum([
        "RESTATE_CLARIFY", "SUCCESS_CONSTRAINTS", "MAP_INPUTS",
        "DECOMPOSE", "SKELETON_THEN_DEEP", "TRADEOFFS_ITERATE",
      ]),
      escalation: z.number().int().min(1).max(3),
      probe: z.string(),
      targetsSignal: z.enum(SIGNALS),
    })).min(6),

    // What each level looks like FOR THIS SCENARIO. The anti-sycophancy anchor.
    rubricAnchors: z.record(z.enum(SIGNALS), z.record(Level, z.string())),
  }),
});

export type ScenarioSpec = z.infer<typeof ScenarioSpec>;
```

## Worked fragment

An original scenario from the seed
`(utilities, regulated monopoly, unlogged manual process, root-cause diagnosis, frontline operator)`.
Abbreviated to show the shape of the public/hidden split.

**Public prompt** — 41 words, no metric, no number, no objective:

> A regional water utility has seen customer complaints about low pressure roughly double
> over the last eighteen months. They have meter readings, a work-order system, and a
> pipe-asset register. How would you approach this?

**Hidden, in part:**

| Field | Value |
|---|---|
| `trueObjective` | Not complaint volume — the regulator fines them per *sustained* low-pressure event, so the real target is duration, and complaints are a lagging proxy |
| `endUser.role` | Control-room operator deciding which of six crews to dispatch each morning |
| `endUser.uselessIf` | It cannot be acted on before the 06:00 crew assignment |
| `hiddenConstraints[0]` | Meter readings are monthly, not continuous — triggered by asking about data freshness. `impact: reframes_problem` |
| `hiddenConstraints[1]` | Work orders are free-text and crews often log "pressure issue" for unrelated faults — triggered by asking about the shape or reliability of the work-order data |
| `hiddenConstraints[2]` | The asset register has no install dates for anything laid before 1998 — triggered by asking who owns the register or how complete it is |
| `decompositionAxes` | *strong:* more demand vs. reduced delivery capacity. *strong:* real events vs. reporting artefacts. *weak:* split by geography — cuts across both causes and explains nothing |
| `landmines[0]` | Building a complaint-prediction model. `tell:` proposes ML before asking what decision it feeds. `probe:` "Say it predicts perfectly — what does the operator do differently at 06:00?" |
| `failureModes[0]` | Complaint rate is confounded by a new app that made complaining easier. `selfSurfaced: true` for a strong candidate |

Note the structure: the doubled complaints may not be a real change in the physical system
at all, and the candidate who never asks about the reporting channel will diagnose the
wrong problem confidently. That's the discriminator — and it exists in the spec, not in the
interviewer's improvisation.

## Invariants the validator enforces

Deterministic code, run before any scenario is published:

- `hiddenConstraints` ≥ 3, and every `revealTrigger` distinct
- ≥ 1 `decompositionAxes` entry with `quality: "weak"`
- `workstreams` forms a DAG, 3–5 nodes, ≥ 1 node with ≥ 2 dependents
- `tradeoffPairs` ≥ 2, every `optionA.cost` and `optionB.cost` non-empty
- `probeBank` covers all six phases, with ≥ 1 entry at `escalation: 3`
- `rubricAnchors` has all 7 signals × 3 levels populated
- `public.prompt` ≤ 80 words and contains no digit, no `%`, and no substring from a
  metric-name blocklist (`p90`, `SLA`, `uptime`, …)
- `hidden.trueObjective` shares no distinctive noun phrase with `public.prompt`

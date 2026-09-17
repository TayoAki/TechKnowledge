# `DecompositionBrief` — the core object

One vague ask in, one filled brief out. The brief is built **progressively**, as the user
makes choices — it is not a document the model writes in one shot.

## The spine: every layer is a `Decision`

The product's whole claim is "it guides you through decisions." That has to be structural,
not a prompt instruction, or it degrades into a chatbot handing over an answer. So one
shape repeats at every layer: a question, 2–4 materially different options each carrying
its own trade, a recommendation with a reason, and room for the user to overrule it.

The options the user **didn't** pick are never discarded. They stay in the brief and stay
on screen. That is the difference between a study tool and an answer machine, and it's the
part a generic chatbot doesn't do.

## Mapping to the three competency areas

| Competency area | Layers |
|---|---|
| **Problem Decomposition (Business & Data)** | 1 Framing · 2 Metrics · 3 Constraints · 4 Entities |
| **Architecture & Governance** | 5 Architecture |
| **Product Definition (Scoping & MVP)** | 6 MVP slice |
| *Cross-cutting* | 7 Trade-offs & failure modes · 8 Talk track |

## Schema

```ts
import { z } from "zod";

// ───────── the spine ─────────

const Choice = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  optimizesFor: z.string(),
  assumes: z.array(z.string()).min(1),
  cannotAnswer: z.array(z.string()).min(1),
  effort: z.enum(["S", "M", "L", "XL"]),
  recommended: z.boolean(),
  rationale: z.string(),
});

const Decision = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(Choice).min(2).max(4),
  selectedId: z.string().nullable(),
  userOverride: z.string().nullable(),
});

// ───────── layer 2: metrics ─────────

const Metric = z.object({
  name: z.string(),
  kind: z.enum(["primary", "secondary", "guardrail_only"]),
  definition: z.string(),
  baseline: z.object({
    value: z.string().nullable(),
    howEstablished: z.string(),
    confidence: z.enum(["known", "estimable", "must_measure_first"]),
  }),
  target: z.object({ value: z.string(), basis: z.string() }),
  guardrail: z.object({
    metric: z.string(),
    threshold: z.string(),
    why: z.string(),
  }).nullable(),
});

// ───────── layer 4: entities ─────────

const Entity = z.object({
  name: z.string(),
  grain: z.string(),
  role: z.enum(["fact", "dimension", "exogenous", "operational"]),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    nullable: z.boolean(),
    note: z.string().nullable(),
  })).min(1),
  sourceSystem: z.string(),
  owner: z.string(),
  refresh: z.string(),
  joinKeys: z.array(z.string()),
  expectedProblems: z.array(z.string()),
  oftenForgotten: z.boolean(),
});

// ───────── layer 5: architecture ─────────

const ArchLayer = z.object({
  layer: z.enum([
    "ingestion", "landing", "conformed", "curated",
    "serving", "application", "orchestration",
  ]),
  decision: Decision,
  dataQualityChecks: z.array(z.object({
    check: z.string(),
    threshold: z.string(),
    owner: z.string(),
    onFail: z.string(),
  })),
  accessControl: z.string().nullable(),
  monitoring: z.array(z.string()),
  scalingNote: z.string().nullable(),
});

// ───────── layer 6: MVP ─────────

const MvpSlice = z.object({
  oneSentence: z.string(),
  provesWhat: z.string(),
  deliveryMechanism: z.string(),
  walkingSkeleton: z.array(z.string()).min(3),
  explicitlyOut: z.array(z.object({
    item: z.string(),
    whyCut: z.string(),
    revisitWhen: z.string(),
  })).min(3),
  timeline: z.array(z.object({
    period: z.string(),
    deliverable: z.string(),
    exitCriterion: z.string(),
  })).min(2),
  killCriterion: z.string(),
});

// ───────── the brief ─────────

export const DecompositionBrief = z.object({
  id: z.string(),
  briefVersion: z.literal(1),

  // Layer 0 — intake. Inferences are shown to the user and are editable.
  intake: z.object({
    rawAsk: z.string(),
    restatement: z.string(),
    inferred: z.object({
      domain: z.string(),
      orgType: z.string(),
      decisionOwner: z.string(),
      confirmed: z.boolean(),
    }),
  }),

  // Layer 1 — the framing menu. This is the "ways to make it granular" step.
  framing: Decision,
  concreteObjective: z.string().nullable(),   // resolves once framing is selected

  // Layer 2
  metrics: z.array(Metric).min(3),

  // Layer 3
  constraints: z.array(z.object({
    constraint: z.string(),
    kind: z.enum(["regulatory", "contractual", "physical", "budget", "org", "technical"]),
    hard: z.boolean(),
    implication: z.string(),
  })).min(2),
  assumptions: z.array(z.object({
    assumption: z.string(),
    howToValidate: z.string(),
    ifWrong: z.string(),
  })).min(3),
  openQuestions: z.array(z.object({
    question: z.string(),
    whyItMatters: z.string(),
    blocksWhat: z.string(),
  })).min(3),

  // Layer 4
  grainStatement: z.string(),
  entities: z.array(Entity).min(4),

  // Layer 5
  architecture: z.array(ArchLayer).min(4),

  // Layer 6
  mvp: MvpSlice,

  // Layer 7
  tradeoffs: z.array(z.object({
    decision: z.string(),
    optionA: z.object({ name: z.string(), cost: z.string() }),
    optionB: z.object({ name: z.string(), cost: z.string() }),
    axes: z.array(z.enum([
      "cost", "latency", "complexity", "maintainability", "risk", "trust",
    ])).min(2),
    lean: z.string(),
  })).min(2),
  failureModes: z.array(z.object({
    mode: z.string(),
    detection: z.string(),
    degradation: z.string(),
    blastRadius: z.enum(["cosmetic", "wrong_answer", "operational", "safety_or_legal"]),
  })).min(3),

  // Layer 8
  talkTrack: z.array(z.object({
    minuteRange: z.string(),
    move: z.string(),
    phrasing: z.string(),
  })).min(5),
});

export type DecompositionBrief = z.infer<typeof DecompositionBrief>;
```

## Invariants the validator enforces

Deterministic checks, run on every generated brief. These are the quality bar — a brief
that fails any of them is regenerated, not shipped.

- **Every `primary` metric has a non-null `guardrail`.** Optimising a metric without
  naming what you must not break is the single most common weak answer, and the guardrail
  is the highest-signal field in the whole brief.
- **`framing.options` ≥ 3, and no two share an `optimizesFor`.** Options that optimise the
  same thing are rewordings, not framings, and collapse the layer into theatre.
- **Exactly one `framing` option has `recommended: true`** — a menu with no recommendation
  pushes the judgment back onto the user, which is the job they came to outsource.
- **≥ 1 entity with `role: "exogenous"`.** Calendar, weather, local events, competitor
  activity. Forgetting the outside world is the classic data-model miss.
- **≥ 1 entity with `oftenForgotten: true`**, surfaced in the UI as a callout.
- **`mvp.explicitlyOut` ≥ 3, each with a non-empty `whyCut`.** Naming the cuts *is* the
  prioritisation skill; a scope section with nothing excluded hasn't prioritised anything.
- **`mvp.killCriterion` non-empty** — what result would make you stop.
- **Every `Decision` with a non-null `selectedId` references a real option id.**
- **`architecture` covers at least ingestion, curated, serving, application.** Stopping
  before the application layer is the most common architecture gap: the end user and the
  decision they make with it are the point.
- **`grainStatement` matches `/one row per/i`** — forcing the sentence that clarifies more
  than any diagram.

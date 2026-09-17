# `DecompositionBrief` — the core object

Three assessed areas, a clock per area, and two engineering tracks you must cover broadly
and go deep in one of. Process: [`FRAMEWORK.md`](FRAMEWORK.md). Flow:
[`FLOW.md`](FLOW.md).

## The three areas

| Area | What it assesses | Contains |
|---|---|---|
| **1 · Problem Decomposition** (Business & Data) | Turning an ambiguous request into a concrete technical roadmap | Triage · pain point & reframe · solution options · success metrics · constraints & assumptions · data entities |
| **2 · Architecture & Governance** | End-to-end design, ingestion through to the application layer where users act | Requirements · scale · components & flow · data quality, security, scaling, monitoring |
| **3 · Product Definition** (Scoping & MVP) | Ruthless prioritisation under a tight constraint | The MVP **cut line** through area 2 · bottlenecks · tech debt · deferrals · next MVPs |

### The 60-minute budget

Derived from the per-step budgets in [`FRAMEWORK.md`](FRAMEWORK.md), which sum to roughly
40 minutes of core work plus depth and follow-ups.

| Segment | Min | Cumulative | Why this much |
|---|---|---|---|
| **1 · Problem Decomposition** | 18 | 18 | Three steps live here (clarify 1–2, stakeholder 5–8, brainstorm 5) plus metrics and entities. The largest block, and correctly so — it's where the round is won |
| **2 · Architecture & Governance** | 15 | 33 | Design is 5 minutes of steps; governance (quality, security, scaling, monitoring) is the rest |
| **3 · Product Definition** | 10 | 43 | The cut line is fast once area 2 exists — that's the payoff of drawing it as a boundary rather than a second design |
| **Depth** | 15 | 58 | Matches the deep-dive budget. Where the depth-in-one-track bar is met |
| **Wrap** | 2 | 60 | Next MVPs, kill criterion |

**Overrun is borrowed, not absorbed.** Spend 25 minutes in area 1 and you have 35 left for
four segments — and the board shows that debt rather than silently resetting each timer.
Independent per-section stopwatches would hide exactly the failure this is meant to teach:
burning half the hour on requirements gathering and never reaching the application layer.

### Why the MVP is a cut line, not a separate design

Area 2 asks for an end-to-end system; area 3 asks for the thinnest slice. The step order in
the round scopes *before* designing, which argues for doing area 3 first — but then area 2's
"end-to-end" never gets drawn.

Both are satisfied by making area 3 **a boundary drawn through area 2's diagram**:
`mvpCutLine` is a subset of `components`. You design the target system, then draw the line.
The slice stays honest because it's expressed in the same components, and "what's deferred"
becomes visually obvious rather than a separate list to keep in sync.

## The two tracks

Breadth across both, depth in exactly one:

| Track | Topics |
|---|---|
| **Data Engineering** | pipelines · data quality · ingestion patterns · **schema evolution** |
| **Full Stack Engineering** | application architecture · **UX** · API design · frontend/backend interaction |

The two bolded topics are the ones candidates skip most, so they get their own coverage
challenges. Coverage is tracked live and spans all three areas — it is not a fourth section.

## The spine: every layer is a `Decision`

A question, 2–4 options each carrying its own trade, one recommendation with a rationale,
and the user's override. **Options not taken stay in the brief.**

## Schema

```ts
import { z } from "zod";

// ───────── clock: one 60-minute budget that spends down ─────────

export const AREAS = ["decomposition", "architecture", "product"] as const;

// The clock covers the whole session, not just the three assessed areas.
export const SEGMENTS = [
  "decomposition", "architecture", "product", "depth", "wrap",
] as const;

const Posture = z.enum(["pair", "draft", "blank"]);

const Segment = z.object({
  segment: z.enum(SEGMENTS),
  budgetMinutes: z.number().min(1),
  elapsedMinutes: z.number().min(0),
  // Recorded, never corrected. Running long is the signal.
  overranBy: z.number().min(0),
  posture: Posture,
});

const Clock = z.object({
  // full_60:   the real round. Default.
  // short_45:  the common shorter variant.
  // openai_40: 10 scoping / 20 whiteboard / 10 present-back.
  // drill_20:  a fast pass to make the framework automatic — too short for a
  //            challenge-and-respond cycle, so it runs blank and critiques at the buzzer.
  // study:     untimed.
  preset: z.enum(["full_60", "short_45", "openai_40", "drill_20", "study"]),
  totalMinutes: z.number().int().min(1).nullable(),   // null only for "study"
  segments: z.array(Segment).length(5),

  // Overrun is borrowed from what is left, not absorbed. This is the whole point:
  // burning 25 minutes on area 1 leaves 35 for three segments, and the board shows it.
  minutesRemaining: z.number(),
  debtMinutes: z.number().min(0),
});

// ───────── tracks: breadth in both, depth in one ─────────

export const TRACKS = ["data_engineering", "full_stack"] as const;

export const TRACK_TOPICS = {
  data_engineering: ["pipelines", "data_quality", "ingestion_patterns", "schema_evolution"],
  full_stack: ["application_architecture", "ux", "api_design", "frontend_backend_interaction"],
} as const;

const Coverage = z.object({
  track: z.enum(TRACKS),
  topicsTouched: z.array(z.string()),
  topicsMissed: z.array(z.string()),
  breadthMet: z.boolean(),
  isDepthTrack: z.boolean(),
  depthEvidence: z.string().nullable(),
});

// ───────── the spine ─────────

const Choice = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  optimizesFor: z.string(),
  usesResources: z.array(z.string()).min(1),
  requiresUnlistedResource: z.object({
    resource: z.string(),
    askThisWay: z.string(),
    fallbackIfNo: z.string(),
  }).nullable(),
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

// ───────── AREA 1: problem decomposition ─────────

const Triage = z.object({
  namedEntity: z.string(),
  actualStakeholder: z.string(),
  stakeholderGap: z.string().nullable(),
  stakeholderConfidence: z.enum(["stated", "inferred", "must_confirm"]),
  resourcesGiven: z.array(z.string()),
  resourcesToAskFor: z.array(z.object({
    resource: z.string(),
    whyItWouldHelp: z.string(),
    askThisWay: z.string(),
  })),
  timeBound: z.object({
    value: z.string().nullable(),
    source: z.enum(["stated", "must_ask"]),
  }),
  openingQuestions: z.array(z.object({
    question: z.string(),
    targets: z.enum(["stakeholder", "resources", "time_bound", "success"]),
    whyItMatters: z.string(),
  })).min(2),
});

const PainPoint = z.object({
  candidates: z.array(z.object({
    painPoint: z.string(),
    forWhom: z.string(),
  })).min(2),
  chosen: z.string(),
  whyThisOne: z.string(),
  currentWorkaround: z.object({
    whatTheyDoToday: z.string(),
    whereTimeIsActuallyLost: z.string(),
    questionsThatRevealIt: z.array(z.string()).min(2),
  }),
  reframe: z.object({
    broad: z.string(),
    sharpened: z.string(),
    whatThisChangesDownstream: z.string(),
  }),
});

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
  // The Goodhart closer. Required on every primary metric.
  guardrail: z.object({
    metric: z.string(),
    threshold: z.string(),
    why: z.string(),
  }).nullable(),
});

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
  // Schema evolution is a named track topic and the most-skipped one.
  schemaChangeRisk: z.string().nullable(),
  oftenForgotten: z.boolean(),
});

const Decomposition = z.object({
  triage: Triage,
  painPoint: PainPoint,
  solution: Decision,
  concreteObjective: z.string().nullable(),
  metrics: z.array(Metric).min(3),
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
  grainStatement: z.string(),
  entities: z.array(Entity).min(4),
});

// ───────── AREA 2: architecture & governance ─────────

const Component = z.object({
  id: z.string(),
  name: z.string(),
  layer: z.enum([
    "ingestion", "landing", "conformed", "curated",
    "serving", "api", "application", "orchestration",
  ]),
  role: z.string(),
  satisfiesRequirement: z.string(),
  narration: z.string(),
  // Which track this component is evidence for.
  track: z.enum(TRACKS).nullable(),
});

const Governance = z.object({
  dataQuality: z.array(z.object({
    check: z.string(),
    threshold: z.string(),
    owner: z.string(),
    onFail: z.string(),
  })).min(2),
  security: z.object({
    accessModel: z.string(),
    sensitiveData: z.string(),
    // Saying "no PII needed here" is a real answer and removes a compliance surface.
    piiInScope: z.boolean(),
  }),
  scaling: z.object({
    bindingConstraint: z.string(),
    headroom: z.string(),
  }),
  monitoring: z.array(z.object({
    signal: z.string(),
    alertsWhom: z.string(),
  })).min(2),
});

const Architecture = z.object({
  // 1-2 of each. More means area 3 under-scoped.
  requirements: z.array(z.object({
    id: z.string(),
    statement: z.string(),
    kind: z.enum(["functional", "non_functional"]),
  })).min(2).max(4),
  scale: z.object({
    qualitativePrior: z.string(),
    rulesOut: z.array(z.string()),
    needsArithmetic: z.boolean(),
    estimate: z.string().nullable(),
  }),
  components: z.array(Component).min(4),
  dataFlow: z.array(z.string()).min(3),
  governance: Governance,
});

// ───────── AREA 3: product definition ─────────

const Bottleneck = z.object({
  kind: z.enum(["coordination", "integration", "rollout"]),
  assessment: z.string(),
  costOfWindow: z.enum(["negligible", "some", "most", "blocks"]),
  narration: z.string(),
});

const Product = z.object({
  // The cut line: which of area 2's components ship first. A subset, by id.
  mvpCutLine: z.array(z.string()).min(2),
  shipsInWindow: z.string(),
  provesWhat: z.string(),
  deliveryMechanism: z.string(),
  bottlenecks: z.array(Bottleneck).length(3),
  deliberateTechDebt: z.array(z.object({
    shortcut: z.string(),
    whyAcceptable: z.string(),
    payBackWhen: z.string(),
  })),
  deferred: z.array(z.object({
    componentId: z.string().nullable(),
    item: z.string(),
    blockedBy: z.string(),
    impact: z.enum(["low", "medium", "high"]),
    landsInMvp: z.number().int().min(2),
  })).min(2),
  nextMvps: z.array(z.object({
    version: z.number().int().min(2),
    adds: z.string(),
    unblockedBy: z.string(),
    impact: z.enum(["low", "medium", "high"]),
  })).min(2),
  killCriterion: z.string(),
});

// ───────── endings ─────────

const DeepDive = z.object({
  area: z.string(),
  track: z.enum(TRACKS),
  chosenBecause: z.enum(["role_specialization", "most_complex", "own_spike"]),
  reasoning: z.string(),
  askPermissionLine: z.string(),
  template: z.enum([
    "pipelines", "data_quality", "ingestion", "schema_evolution",
    "app_architecture", "ux", "api_design", "frontend_backend",
  ]),
  depth: z.array(z.object({
    topic: z.string(),
    detail: z.string(),
    likelyProbe: z.string(),
    answer: z.string(),
  })).min(3),
});

const PresentBack = z.object({
  whatTheyCanNowDo: z.string(),
  jargonSwaps: z.array(z.object({ instead: z.string(), say: z.string() })).min(2),
  keyTradeoffs: z.array(z.object({
    decision: z.string(),
    chose: z.string(),
    because: z.string(),
  })).min(1).max(2),
  nextSteps: z.object({
    shipsFirst: z.string(),
    comesAfter: z.string(),
    needFromYou: z.string(),
  }),
});

// ───────── the brief ─────────

export const RUBRIC_DIMENSIONS = [
  "ambiguity_handling", "user_empathy", "outcome_orientation",
  "scrappy", "technical_depth", "collaboration",
] as const;

export const DecompositionBrief = z.object({
  id: z.string(),
  briefVersion: z.literal(3),

  rawAsk: z.string(),
  restatement: z.string(),
  companyMode: z.enum(["deep_dive", "present_back", "both"]),

  clock: Clock,

  decomposition: Decomposition,   // area 1
  architecture: Architecture,     // area 2
  product: Product,               // area 3

  coverage: z.array(Coverage).length(2),

  deepDive: DeepDive.nullable(),
  presentBack: PresentBack.nullable(),

  requirementChanges: z.array(z.object({
    change: z.string(),
    componentsAffected: z.array(z.string()).min(1),
    componentsUnchanged: z.array(z.string()),
    response: z.string(),
  })).min(2),

  rubricSelfCheck: z.array(z.object({
    dimension: z.enum(RUBRIC_DIMENSIONS),
    evidence: z.string(),
    unprompted: z.boolean(),
    challengesEngaged: z.number().int().min(0),
    challengesAbsorbedSilently: z.number().int().min(0),
    exercised: z.boolean(),
    stillOnYouInTheRoom: z.string(),
  })).length(6),

  talkTrack: z.array(z.object({
    minuteRange: z.string(),
    segment: z.enum(SEGMENTS),
    move: z.string(),
    phrasing: z.string(),
  })).min(6),
});

export type DecompositionBrief = z.infer<typeof DecompositionBrief>;
```

## Invariants the validator enforces

**Clock**
- `sum(segments[].budgetMinutes) === totalMinutes`, and
  `minutesRemaining === totalMinutes - sum(elapsedMinutes)`.
- `debtMinutes === sum(overranBy)` across **completed** segments. Overrun is borrowed from
  the remaining segments, never absorbed — the board must show area 1 eating area 3.
- `overranBy` is recorded and never corrected. Running long is a scored signal, not an error
  to hide.
- `preset: "openai_40"` → `companyMode: "present_back"`, and the shape is 10 / 20 / 10 across
  decomposition / (architecture + product) / depth.
- `preset: "drill_20"` → every segment `posture: "blank"`. Twenty minutes cannot host a
  challenge-and-respond cycle, so offering pair posture there would misrepresent the mode.
- `preset: "study"` → `totalMinutes: null`; budgets are advisory and `debtMinutes` is 0.

**Coverage — spans all three areas**
- Exactly one `Coverage` entry has `isDepthTrack: true`, and it has non-null `depthEvidence`.
- **Both** tracks must reach `breadthMet: true`. Depth in one does not excuse absence in the
  other — that's the explicit assessment bar.
- `breadthMet` is computed, never asserted: at least 3 of the track's 4 topics in
  `topicsTouched`. `schema_evolution` and `ux` each get their own challenge when missed,
  being the two most commonly skipped.
- `topicsTouched ∪ topicsMissed` equals that track's `TRACK_TOPICS` exactly.

**Area 1 — decomposition**
- `stakeholderGap` non-null whenever `namedEntity !== actualStakeholder`.
- Everything `must_ask` / `must_confirm` has a matching `openingQuestions` entry.
- `reframe.broad !== reframe.sharpened`, and `sharpened` is more specific.
- Solution options ≥ 2, no two sharing `optimizesFor`, exactly one `recommended`.
- **Every `primary` metric has a non-null `guardrail`.** Optimising a metric without naming
  what must not break is the most common weak answer.
- ≥ 1 entity with `role: "exogenous"`; ≥ 1 with `oftenForgotten: true`.
- ≥ 1 entity with non-null `schemaChangeRisk` — schema evolution is a named track topic.
- `grainStatement` matches `/one row per/i`.

**Area 2 — architecture & governance**
- 1–2 `functional` and 1–2 `non_functional`. **More than two of either is a hard fail**, and
  regeneration targets **area 3**, not area 2 — the fault is under-scoping.
- Every `component.satisfiesRequirement` matches a `requirements[].id`.
- ≥ 1 component with `layer: "application"` — stopping before the layer where the user acts
  is the most common architecture gap, and area 2 asks for end-to-end explicitly.
- ≥ 1 component with `layer: "api"` **or** a full-stack `frontend_backend_interaction` topic
  touched — otherwise the full-stack track has no evidence.
- `scale.estimate` non-null iff `scale.needsArithmetic`.
- `governance.dataQuality` ≥ 2 checks, each with a threshold **and** an owner. A check with
  no owner never runs.

**Area 3 — product definition**
- `mvpCutLine` is a strict, non-empty **subset** of `architecture.components[].id`, and every
  id resolves. The slice must be expressed in the same components as the design.
- `mvpCutLine` ⊊ components — a cut line containing everything isn't a cut.
- Every `deferred.componentId`, when non-null, is a component **outside** the cut line.
- Exactly three `bottlenecks`, one per kind, each with a non-empty `narration`; not all three
  `negligible`.
- `nextMvps` respects blocker order: an item cannot precede what it is `unblockedBy`.

**Endings**
- `companyMode` matches which of `deepDive` / `presentBack` are non-null.
- `deepDive.track` equals the `isDepthTrack` track — the depth you claim and the depth you
  demonstrate must be the same one.
- `presentBack.whatTheyCanNowDo` contains no term from the jargon blocklist.

**Self-check**
- All six dimensions present. `collaboration` and `user_empathy` require
  `exercised: true`, which needs a non-zero challenge count — only pair posture produces
  that. Sprint and draft sessions report them as not exercised rather than scoring them.
- A ghost suggestion rejected *with a reason* counts as engaged and scores above accepting
  one. Collaboration is not compliance.

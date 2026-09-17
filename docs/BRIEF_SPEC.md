# `DecompositionBrief` — the core object

One vague ask in, one filled brief out, built **progressively** as the user makes choices.
The layers follow the process in [`FRAMEWORK.md`](FRAMEWORK.md) in its own order —
notably **MVP scoping (L3) before high-level design (L4)**, which is the step ordering that
distinguishes a deliberate slice from a shrunken architecture.

## The spine: every layer is a `Decision`

"It guides you through decisions" has to be structural or it degrades into a chatbot with a
nice font. One shape repeats: a question, 2–4 options each carrying its own trade, one
recommendation with a rationale, and the user's override. **Options not taken stay in the
brief.** That is the difference between a study tool and an answer machine.

## Layers

| L | Layer | Framework step |
|---|---|---|
| 0 | Prompt triage — stakeholder, resources, time bound | 1 |
| 1 | Pain point excavation — current workaround → reframe | 2 |
| 2 | Solution options *(Decision)* | 3 |
| 3 | MVP scope — coordination / integration / rollout | 4 |
| 4 | High-level design — capped requirements, components | 5 |
| 5 | Deep dive **or** customer present-back, by company | 6a / 6b |
| 6 | Follow-up prep — next MVPs, requirement-change war-games | follow-ups |
| 7 | Rubric self-check | rubric |
| 8 | Talk track | — |

## Schema

```ts
import { z } from "zod";

// ───────── the spine ─────────

const Choice = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  optimizesFor: z.string(),
  usesResources: z.array(z.string()).min(1),
  // The step-3 move: if the better option needs something unlisted, ask — don't discard.
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

// ───────── L0: triage ─────────

const Triage = z.object({
  // The prompt names an entity; the stakeholder is often someone else entirely.
  namedEntity: z.string(),
  actualStakeholder: z.string(),
  stakeholderGap: z.string().nullable(),   // non-null when they differ, explaining why
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

  // Whatever is missing above becomes the opening questions. This is the brief's
  // first output, not a gap in it.
  openingQuestions: z.array(z.object({
    question: z.string(),
    targets: z.enum(["stakeholder", "resources", "time_bound", "success"]),
    whyItMatters: z.string(),
  })).min(2),
});

// ───────── L1: pain point ─────────

const PainPoint = z.object({
  candidates: z.array(z.object({
    painPoint: z.string(),
    forWhom: z.string(),
  })).min(2),
  chosen: z.string(),
  whyThisOne: z.string(),

  // The lever for the whole layer: what do they do today?
  currentWorkaround: z.object({
    whatTheyDoToday: z.string(),
    whereTimeIsActuallyLost: z.string(),
    questionsThatRevealIt: z.array(z.string()).min(2),
  }),

  // Broad complaint → targeted problem. The highest-value output in the brief.
  reframe: z.object({
    broad: z.string(),
    sharpened: z.string(),
    whatThisChangesDownstream: z.string(),
  }),
});

// ───────── L3: MVP ─────────

const Bottleneck = z.object({
  kind: z.enum(["coordination", "integration", "rollout"]),
  assessment: z.string(),
  costOfWindow: z.enum(["negligible", "some", "most", "blocks"]),
  // Say it out loud — silent reasoning scores nothing.
  narration: z.string(),
});

const MvpScope = z.object({
  shipsInWindow: z.string(),
  provesWhat: z.string(),
  deliveryMechanism: z.string(),
  // Build time is rarely the constraint. These three are.
  bottlenecks: z.array(Bottleneck).length(3),
  deliberateTechDebt: z.array(z.object({
    shortcut: z.string(),
    whyAcceptable: z.string(),
    payBackWhen: z.string(),
  })),
  deferred: z.array(z.object({
    item: z.string(),
    blockedBy: z.string(),
    impact: z.enum(["low", "medium", "high"]),
    landsInMvp: z.number().int().min(2),
  })).min(2),
});

// ───────── L4: design ─────────

const Requirement = z.object({
  statement: z.string(),
  kind: z.enum(["functional", "non_functional"]),
});

const Component = z.object({
  name: z.string(),
  role: z.string(),
  // Every component must earn its place against a requirement.
  satisfiesRequirement: z.string(),
  narration: z.string(),
});

const HighLevelDesign = z.object({
  // Capped at 1-2 each. More than that means L3 under-scoped.
  requirements: z.array(Requirement).min(2).max(4),
  scale: z.object({
    qualitativePrior: z.string(),
    rulesOut: z.array(z.string()),
    // A number only earns its place if the prior leaves a design fork open.
    needsArithmetic: z.boolean(),
    estimate: z.string().nullable(),
  }),
  components: z.array(Component).min(3),
  dataFlow: z.array(z.string()).min(3),
});

// ───────── L5: the two endings ─────────

const DeepDive = z.object({
  area: z.string(),
  chosenBecause: z.enum(["role_specialization", "most_complex", "own_spike"]),
  reasoning: z.string(),
  askPermissionLine: z.string(),
  // Pluggable by area: data-model, ml, app-performance, integration, security.
  template: z.enum(["data_model", "ml", "app_performance", "integration", "security"]),
  depth: z.array(z.object({
    topic: z.string(),
    detail: z.string(),
    likelyProbe: z.string(),
    answer: z.string(),
  })).min(3),
});

const PresentBack = z.object({
  // Customer's words, not the architecture. No jargon.
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

export const RUBRIC_SERVED = [
  "ambiguity_handling", "outcome_orientation", "scrappy", "technical_depth",
] as const;

export const DecompositionBrief = z.object({
  id: z.string(),
  briefVersion: z.literal(2),

  rawAsk: z.string(),
  restatement: z.string(),
  // Palantir/Databricks end in a deep dive; OpenAI in a present-back.
  companyMode: z.enum(["deep_dive", "present_back", "both"]),

  triage: Triage,                    // L0
  painPoint: PainPoint,              // L1
  solution: Decision,                // L2
  concreteObjective: z.string().nullable(),
  mvp: MvpScope,                     // L3
  design: HighLevelDesign,           // L4

  deepDive: DeepDive.nullable(),     // L5a
  presentBack: PresentBack.nullable(),// L5b

  // L6 — precomputed follow-ups. Cheap, and reliably asked.
  nextMvps: z.array(z.object({
    version: z.number().int().min(2),
    adds: z.string(),
    unblockedBy: z.string(),
    impact: z.enum(["low", "medium", "high"]),
  })).min(2),
  requirementChanges: z.array(z.object({
    change: z.string(),
    componentsAffected: z.array(z.string()).min(1),
    componentsUnchanged: z.array(z.string()),
    response: z.string(),
  })).min(2),

  // L7 — honest about what a document can and can't prepare.
  rubricSelfCheck: z.array(z.object({
    dimension: z.enum(RUBRIC_SERVED),
    whatTheBriefGivesYou: z.string(),
    stillOnYouInTheRoom: z.string(),
  })).length(4),

  // L8
  talkTrack: z.array(z.object({
    minuteRange: z.string(),
    step: z.number().int().min(1).max(6),
    move: z.string(),
    phrasing: z.string(),
  })).min(6),
});

export type DecompositionBrief = z.infer<typeof DecompositionBrief>;
```

## Invariants the validator enforces

Deterministic checks on every generated brief. A brief failing any of them is regenerated,
not shipped.

**Triage (L0)**
- `stakeholderGap` is non-null whenever `namedEntity !== actualStakeholder` — the whole
  point of the layer is surfacing that gap, not quietly resolving it.
- Every element with `source: "must_ask"` or `confidence: "must_confirm"` has a matching
  entry in `openingQuestions`. Nothing unknown goes unasked.

**Pain point (L1)**
- `reframe.broad !== reframe.sharpened`, and `sharpened` is longer and more specific.
  A reframe that restates the prompt is the layer failing silently.
- `currentWorkaround.questionsThatRevealIt` ≥ 2 — the reframe must be *reachable* by asking,
  not asserted from nowhere.

**Solution (L2)**
- ≥ 2 options, no two sharing an `optimizesFor` — otherwise they're rewordings.
- Exactly one `recommended: true`.
- ≥ 1 option with a non-null `requiresUnlistedResource`, whenever such a resource plausibly
  exists. Never asking for anything beyond the listed set forfeits a free upside.

**MVP (L3)**
- Exactly three `bottlenecks`, one of each kind, each with a non-empty `narration`.
- Not all three may be `negligible` — a one-week window always costs something somewhere,
  and a brief claiming otherwise hasn't scoped.
- `deferred` ≥ 2, every item with a non-empty `blockedBy`.

**Design (L4)**
- 1–2 `functional` and 1–2 `non_functional`. **More than two of either is a hard fail** —
  it means L3 under-scoped, and the fix is upstream, not here.
- Every `component.satisfiesRequirement` matches a `requirements[].statement`. A component
  satisfying nothing is unnecessary or reveals a missing requirement.
- `scale.estimate` is non-null iff `scale.needsArithmetic` — no ritual arithmetic when the
  qualitative prior already settles the design.

**Endings (L5)**
- `companyMode: "deep_dive"` → `deepDive` non-null; `"present_back"` → `presentBack`
  non-null; `"both"` → both.
- `presentBack.whatTheyCanNowDo` contains no term from the jargon blocklist (`vector store`,
  `embedding`, `Kafka`, `p99`, `sharding`, …). The layer's entire purpose is de-jargoning,
  so this is checkable rather than aspirational.
- `presentBack.keyTradeoffs` ≤ 2 — it's a summary, not a recap.

**Follow-ups (L6)**
- `nextMvps` sorted by blocker dependency first, impact second; an item cannot precede the
  thing it's `unblockedBy`.
- `requirementChanges[].componentsUnchanged` non-empty. A change that rewrites everything
  usually means the original design lacked seams.

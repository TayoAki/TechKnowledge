/**
 * The DecompositionBrief — the object the whole session builds.
 *
 * Three assessed areas, a clock, and two engineering tracks. The recurring
 * `Decision` shape is the spine: options not taken are preserved rather than
 * discarded, which is what separates a study tool from an answer machine.
 */

import { z } from "zod";
import { POSTURES, PRESETS, SEGMENTS } from "./segments";
import { TRACKS } from "./coverage";

const zSegment = z.enum(SEGMENTS);
const zPosture = z.enum(POSTURES);
const zTrack = z.enum(TRACKS);

// ───────────────────────── clock ─────────────────────────

export const SegmentClockSchema = z.object({
  segment: zSegment,
  budgetMinutes: z.number().min(1),
  elapsedMinutes: z.number().min(0),
  /** Recorded, never corrected. */
  overranBy: z.number().min(0),
  posture: zPosture,
});

export const ClockSchema = z.object({
  preset: z.enum(PRESETS),
  /** null only for untimed study mode. */
  totalMinutes: z.number().int().min(1).nullable(),
  segments: z.array(SegmentClockSchema).length(5),
  minutesRemaining: z.number(),
  debtMinutes: z.number().min(0),
});

// ───────────────────────── the spine ─────────────────────────

export const ChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string(),
  optimizesFor: z.string().min(1),
  usesResources: z.array(z.string()).min(1),
  /** The move that expands the resource set: ask, don't silently discard. */
  requiresUnlistedResource: z
    .object({
      resource: z.string().min(1),
      askThisWay: z.string().min(1),
      fallbackIfNo: z.string().min(1),
    })
    .nullable(),
  effort: z.enum(["S", "M", "L", "XL"]),
  recommended: z.boolean(),
  rationale: z.string().min(1),
});

export const DecisionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(ChoiceSchema).min(2).max(4),
  selectedId: z.string().nullable(),
  userOverride: z.string().nullable(),
});

// ───────────────────── area 1: decomposition ─────────────────────

export const TriageSchema = z.object({
  namedEntity: z.string().min(1),
  actualStakeholder: z.string().min(1),
  /** Non-null whenever the two differ — surfacing the gap is the point. */
  stakeholderGap: z.string().nullable(),
  stakeholderConfidence: z.enum(["stated", "inferred", "must_confirm"]),
  resourcesGiven: z.array(z.string()),
  resourcesToAskFor: z.array(
    z.object({
      resource: z.string().min(1),
      whyItWouldHelp: z.string().min(1),
      askThisWay: z.string().min(1),
    }),
  ),
  timeBound: z.object({
    value: z.string().nullable(),
    source: z.enum(["stated", "must_ask"]),
  }),
  openingQuestions: z
    .array(
      z.object({
        question: z.string().min(1),
        targets: z.enum(["stakeholder", "resources", "time_bound", "success"]),
        whyItMatters: z.string().min(1),
      }),
    )
    .min(2),
});

export const PainPointSchema = z.object({
  candidates: z
    .array(z.object({ painPoint: z.string().min(1), forWhom: z.string().min(1) }))
    .min(2),
  chosen: z.string().min(1),
  whyThisOne: z.string().min(1),
  /** The lever for the whole area: what do they do today? */
  currentWorkaround: z.object({
    whatTheyDoToday: z.string().min(1),
    whereTimeIsActuallyLost: z.string().min(1),
    questionsThatRevealIt: z.array(z.string()).min(2),
  }),
  /** Broad complaint -> targeted problem. The highest-value output. */
  reframe: z.object({
    broad: z.string().min(1),
    sharpened: z.string().min(1),
    whatThisChangesDownstream: z.string().min(1),
  }),
});

export const MetricSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["primary", "secondary", "guardrail_only"]),
  definition: z.string().min(1),
  baseline: z.object({
    value: z.string().nullable(),
    howEstablished: z.string().min(1),
    /** "I'd need 8 weeks of history" is a strong answer, not a gap. */
    confidence: z.enum(["known", "estimable", "must_measure_first"]),
  }),
  target: z.object({ value: z.string().min(1), basis: z.string().min(1) }),
  /** The Goodhart closer. Required on every primary metric. */
  guardrail: z
    .object({
      metric: z.string().min(1),
      threshold: z.string().min(1),
      why: z.string().min(1),
    })
    .nullable(),
});

export const EntitySchema = z.object({
  name: z.string().min(1),
  grain: z.string().min(1),
  role: z.enum(["fact", "dimension", "exogenous", "operational"]),
  fields: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        nullable: z.boolean(),
        note: z.string().nullable(),
      }),
    )
    .min(1),
  sourceSystem: z.string().min(1),
  owner: z.string().min(1),
  refresh: z.string().min(1),
  joinKeys: z.array(z.string()),
  expectedProblems: z.array(z.string()),
  /** Schema evolution is a named track topic and the most-skipped one. */
  schemaChangeRisk: z.string().nullable(),
  oftenForgotten: z.boolean(),
});

export const DecompositionSchema = z.object({
  triage: TriageSchema,
  painPoint: PainPointSchema,
  solution: DecisionSchema,
  concreteObjective: z.string().nullable(),
  metrics: z.array(MetricSchema).min(3),
  constraints: z
    .array(
      z.object({
        constraint: z.string().min(1),
        kind: z.enum([
          "regulatory",
          "contractual",
          "physical",
          "budget",
          "org",
          "technical",
        ]),
        hard: z.boolean(),
        implication: z.string().min(1),
      }),
    )
    .min(2),
  assumptions: z
    .array(
      z.object({
        assumption: z.string().min(1),
        howToValidate: z.string().min(1),
        ifWrong: z.string().min(1),
      }),
    )
    .min(3),
  grainStatement: z.string().min(1),
  entities: z.array(EntitySchema).min(4),
});

// ─────────────────── area 2: architecture & governance ───────────────────

export const COMPONENT_LAYERS = [
  "ingestion",
  "landing",
  "conformed",
  "curated",
  "serving",
  "api",
  "application",
  "orchestration",
] as const;

export const ComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  layer: z.enum(COMPONENT_LAYERS),
  role: z.string().min(1),
  /** Every component must earn its place against a requirement. */
  satisfiesRequirement: z.string().min(1),
  narration: z.string().min(1),
  track: zTrack.nullable(),
});

export const GovernanceSchema = z.object({
  dataQuality: z
    .array(
      z.object({
        check: z.string().min(1),
        threshold: z.string().min(1),
        /** A check with no owner never runs. */
        owner: z.string().min(1),
        onFail: z.string().min(1),
      }),
    )
    .min(2),
  security: z.object({
    accessModel: z.string().min(1),
    sensitiveData: z.string().min(1),
    /** "No PII needed here" is a real answer that removes a compliance surface. */
    piiInScope: z.boolean(),
  }),
  scaling: z.object({
    bindingConstraint: z.string().min(1),
    headroom: z.string().min(1),
  }),
  monitoring: z
    .array(z.object({ signal: z.string().min(1), alertsWhom: z.string().min(1) }))
    .min(2),
});

export const RequirementSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  kind: z.enum(["functional", "non_functional"]),
});

export const ArchitectureSchema = z.object({
  /** 1-2 of each kind. More means area 3 under-scoped. */
  requirements: z.array(RequirementSchema).min(2).max(4),
  scale: z.object({
    qualitativePrior: z.string().min(1),
    rulesOut: z.array(z.string()),
    /** A number only earns its place if the prior leaves a design fork open. */
    needsArithmetic: z.boolean(),
    estimate: z.string().nullable(),
  }),
  components: z.array(ComponentSchema).min(4),
  dataFlow: z.array(z.string()).min(3),
  governance: GovernanceSchema,
});

// ───────────────────── area 3: product definition ─────────────────────

export const BottleneckSchema = z.object({
  kind: z.enum(["coordination", "integration", "rollout"]),
  assessment: z.string().min(1),
  costOfWindow: z.enum(["negligible", "some", "most", "blocks"]),
  /** Silent reasoning scores nothing. */
  narration: z.string().min(1),
});

export const ProductSchema = z.object({
  /** The cut line: which of area 2's components ship first. A strict subset. */
  mvpCutLine: z.array(z.string()).min(2),
  shipsInWindow: z.string().min(1),
  provesWhat: z.string().min(1),
  deliveryMechanism: z.string().min(1),
  bottlenecks: z.array(BottleneckSchema).length(3),
  deliberateTechDebt: z.array(
    z.object({
      shortcut: z.string().min(1),
      whyAcceptable: z.string().min(1),
      payBackWhen: z.string().min(1),
    }),
  ),
  deferred: z
    .array(
      z.object({
        componentId: z.string().nullable(),
        item: z.string().min(1),
        blockedBy: z.string().min(1),
        impact: z.enum(["low", "medium", "high"]),
        landsInMvp: z.number().int().min(2),
      }),
    )
    .min(2),
  nextMvps: z
    .array(
      z.object({
        version: z.number().int().min(2),
        adds: z.string().min(1),
        unblockedBy: z.string().min(1),
        impact: z.enum(["low", "medium", "high"]),
      }),
    )
    .min(2),
  killCriterion: z.string().min(1),
});

// ───────────────────────── endings ─────────────────────────

export const DEEP_DIVE_TEMPLATES = [
  "pipelines",
  "data_quality",
  "ingestion",
  "schema_evolution",
  "app_architecture",
  "ux",
  "api_design",
  "frontend_backend",
] as const;

export const DeepDiveSchema = z.object({
  area: z.string().min(1),
  track: zTrack,
  chosenBecause: z.enum(["role_specialization", "most_complex", "own_spike"]),
  reasoning: z.string().min(1),
  askPermissionLine: z.string().min(1),
  template: z.enum(DEEP_DIVE_TEMPLATES),
  depth: z
    .array(
      z.object({
        topic: z.string().min(1),
        detail: z.string().min(1),
        likelyProbe: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .min(3),
});

export const PresentBackSchema = z.object({
  /** Customer's words, not the architecture. */
  whatTheyCanNowDo: z.string().min(1),
  jargonSwaps: z
    .array(z.object({ instead: z.string().min(1), say: z.string().min(1) }))
    .min(2),
  keyTradeoffs: z
    .array(
      z.object({
        decision: z.string().min(1),
        chose: z.string().min(1),
        because: z.string().min(1),
      }),
    )
    .min(1)
    .max(2),
  nextSteps: z.object({
    shipsFirst: z.string().min(1),
    comesAfter: z.string().min(1),
    needFromYou: z.string().min(1),
  }),
});

// ───────────────────────── coverage & rubric ─────────────────────────

export const CoverageSchema = z.object({
  track: zTrack,
  topicsTouched: z.array(z.string()),
  topicsMissed: z.array(z.string()),
  breadthMet: z.boolean(),
  isDepthTrack: z.boolean(),
  depthEvidence: z.string().nullable(),
});

export const RUBRIC_DIMENSIONS = [
  "ambiguity_handling",
  "user_empathy",
  "outcome_orientation",
  "scrappy",
  "technical_depth",
  "collaboration",
] as const;
export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number];

export const RubricCheckSchema = z.object({
  dimension: z.enum(RUBRIC_DIMENSIONS),
  evidence: z.string(),
  unprompted: z.boolean(),
  challengesEngaged: z.number().int().min(0),
  challengesAbsorbedSilently: z.number().int().min(0),
  /**
   * Only pair posture exercises collaboration and user empathy. Scoring a
   * dimension the session never tested is the sycophancy failure in new clothes.
   */
  exercised: z.boolean(),
  stillOnYouInTheRoom: z.string(),
});

// ───────────────────────── the brief ─────────────────────────

export const DecompositionBriefSchema = z.object({
  id: z.string().min(1),
  briefVersion: z.literal(3),

  rawAsk: z.string().min(1),
  restatement: z.string().min(1),
  companyMode: z.enum(["deep_dive", "present_back", "both"]),

  clock: ClockSchema,

  decomposition: DecompositionSchema,
  architecture: ArchitectureSchema,
  product: ProductSchema,

  coverage: z.array(CoverageSchema).length(2),

  deepDive: DeepDiveSchema.nullable(),
  presentBack: PresentBackSchema.nullable(),

  requirementChanges: z
    .array(
      z.object({
        change: z.string().min(1),
        componentsAffected: z.array(z.string()).min(1),
        componentsUnchanged: z.array(z.string()),
        response: z.string().min(1),
      }),
    )
    .min(2),

  rubricSelfCheck: z.array(RubricCheckSchema).length(6),

  talkTrack: z
    .array(
      z.object({
        minuteRange: z.string().min(1),
        segment: zSegment,
        move: z.string().min(1),
        phrasing: z.string().min(1),
      }),
    )
    .min(6),
});

export type DecompositionBrief = z.infer<typeof DecompositionBriefSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type Bottleneck = z.infer<typeof BottleneckSchema>;
export type ComponentLayer = (typeof COMPONENT_LAYERS)[number];

/** A brief under construction — every area optional until its segment runs. */
export type PartialBrief = {
  id: string;
  rawAsk: string;
  restatement?: string;
  companyMode: DecompositionBrief["companyMode"];
  decomposition?: Partial<z.infer<typeof DecompositionSchema>>;
  architecture?: Partial<z.infer<typeof ArchitectureSchema>>;
  product?: Partial<z.infer<typeof ProductSchema>>;
  deepDive?: z.infer<typeof DeepDiveSchema> | null;
  presentBack?: z.infer<typeof PresentBackSchema> | null;
};

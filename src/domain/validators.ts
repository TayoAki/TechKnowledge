/**
 * The invariants.
 *
 * Each validator emits BOTH forms of the same rule:
 *   - `message`   — the report / silent-regeneration form
 *   - `challenge` — the same rule as a question to the user, in pair posture
 *
 * That is the whole trick: one rule set, two delivery modes, nothing
 * maintained twice. The challenge library is not a separate artefact.
 */

import type { PartialBrief } from "./brief";
import { PRESET_SPECS, type SegmentId } from "./segments";
import type { ClockState } from "./clock";
import {
  MOST_SKIPPED,
  TOPIC_LABELS,
  TRACK_LABELS,
  TRACK_TOPICS,
  type TopicId,
  type TrackCoverage,
} from "./coverage";

export type Severity = "hard" | "soft";

export interface Issue {
  code: string;
  severity: Severity;
  /** Where the issue shows up. */
  segment: SegmentId;
  /**
   * Where the fix actually belongs. Differs from `segment` when the fault is
   * upstream — a third functional requirement surfaces in `architecture` but
   * means `product` under-scoped, so regeneration targets that.
   */
  regenerateSegment: SegmentId;
  message: string;
  challenge: string;
}

const JARGON_BLOCKLIST = [
  "vector store",
  "embedding",
  "kafka",
  "p99",
  "p95",
  "sharding",
  "idempotent",
  "denormalis",
  "denormaliz",
  "orm",
  "etl",
  "cdc",
];

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "to", "of", "and", "or", "in", "on", "for",
  "with", "that", "this", "it", "be", "too", "we", "our", "their", "they",
]);

function significantTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** A reframe that merely rewords the prompt is the layer failing silently. */
export function isReframeSubstantive(broad: string, sharpened: string): boolean {
  if (!broad || !sharpened) return false;
  if (broad.trim() === sharpened.trim()) return false;
  const b = new Set(significantTokens(broad));
  const s = significantTokens(sharpened);
  const added = s.filter((t) => !b.has(t));
  // It must contribute genuinely new substance, not just more words.
  return added.length >= 3;
}

// ───────────────────────── clock ─────────────────────────

export function validateClock(clock: ClockState): Issue[] {
  const out: Issue[] = [];
  const spec = PRESET_SPECS[clock.preset];
  const seg: SegmentId = "decomposition";

  const budgetSum = clock.segments.reduce((n, s) => n + s.budgetMinutes, 0);
  if (clock.totalMinutes !== null && budgetSum !== clock.totalMinutes) {
    out.push({
      code: "clock_budget_mismatch",
      severity: "hard",
      segment: seg,
      regenerateSegment: seg,
      message: `Segment budgets sum to ${budgetSum} but the session is ${clock.totalMinutes} minutes.`,
      challenge: "The segment budgets don't add up to the session length.",
    });
  }

  if (clock.preset === "study" && clock.totalMinutes !== null) {
    out.push({
      code: "clock_study_timed",
      severity: "hard",
      segment: seg,
      regenerateSegment: seg,
      message: "Study mode is untimed; totalMinutes must be null.",
      challenge: "Study mode shouldn't be running a countdown.",
    });
  }

  const doneDebt = clock.segments
    .filter((s) => s.status === "done")
    .reduce((n, s) => n + s.overranBy, 0);
  if (Math.abs(doneDebt - clock.debtMinutes) > 0.11) {
    out.push({
      code: "clock_debt_mismatch",
      severity: "hard",
      segment: seg,
      regenerateSegment: seg,
      message: `Debt is ${clock.debtMinutes} but completed segments overran by ${doneDebt.toFixed(1)}.`,
      challenge: "The borrowed-time figure doesn't match what the finished segments actually overran.",
    });
  }

  for (const s of clock.segments) {
    if (!spec.allowedPostures.includes(s.posture)) {
      out.push({
        code: "clock_posture_not_allowed",
        severity: "hard",
        segment: s.segment,
        regenerateSegment: s.segment,
        message: `Posture "${s.posture}" is not available in preset "${clock.preset}".`,
        challenge:
          clock.preset === "drill_20"
            ? "A 20-minute drill can't host a back-and-forth — it runs blank and critiques at the buzzer."
            : `That posture isn't available in ${spec.label}.`,
      });
    }
  }

  return out;
}

// ───────────────────────── coverage ─────────────────────────

export function validateCoverage(coverage: TrackCoverage[]): Issue[] {
  const out: Issue[] = [];
  const seg: SegmentId = "depth";

  const depth = coverage.filter((c) => c.isDepthTrack);
  if (depth.length !== 1) {
    out.push({
      code: "coverage_depth_track",
      severity: "hard",
      segment: seg,
      regenerateSegment: seg,
      message:
        depth.length === 0
          ? "No depth track claimed — the bar is depth in at least one."
          : "More than one depth track claimed; depth means one.",
      challenge:
        depth.length === 0
          ? "Which track are you going deep in? The bar is breadth in both and depth in one."
          : "You can't claim depth in both — pick the one you'd defend under probing.",
    });
  } else if (!depth[0].depthEvidence) {
    out.push({
      code: "coverage_depth_no_evidence",
      severity: "hard",
      segment: seg,
      regenerateSegment: seg,
      message: `Depth claimed in ${TRACK_LABELS[depth[0].track]} without evidence.`,
      challenge: `You've claimed depth in ${TRACK_LABELS[depth[0].track]} — what specifically demonstrates it?`,
    });
  }

  for (const c of coverage) {
    const topics = TRACK_TOPICS[c.track] as readonly TopicId[];
    const union = new Set([...c.topicsTouched, ...c.topicsMissed]);
    if (union.size !== topics.length) {
      out.push({
        code: "coverage_topic_set_mismatch",
        severity: "hard",
        segment: seg,
        regenerateSegment: seg,
        message: `${TRACK_LABELS[c.track]} touched+missed doesn't cover its topic list.`,
        challenge: "Coverage bookkeeping is inconsistent for this track.",
      });
    }

    if (!c.breadthMet) {
      const missing = c.topicsMissed.map((t) => TOPIC_LABELS[t as TopicId]).join(", ");
      out.push({
        code: "coverage_breadth_gap",
        severity: "hard",
        segment: seg,
        regenerateSegment: "architecture",
        message: `${TRACK_LABELS[c.track]} is below breadth — missing ${missing}. Depth elsewhere does not excuse it.`,
        challenge: `Nothing here covers ${missing}. Depth in the other track doesn't excuse silence in this one.`,
      });
    }

    for (const t of c.topicsMissed) {
      if (!MOST_SKIPPED.includes(t as TopicId)) continue;
      out.push({
        code: `coverage_skipped_${t}`,
        severity: "soft",
        segment: seg,
        regenerateSegment: t === "ux" ? "architecture" : "decomposition",
        message: `${TOPIC_LABELS[t as TopicId]} is untouched — one of the two most commonly skipped topics.`,
        challenge:
          t === "schema_evolution"
            ? "Nothing here says what happens when the source schema changes."
            : "Who looks at this, and on what screen?",
      });
    }
  }

  return out;
}

// ───────────────── area 1: problem decomposition ─────────────────

export function validateDecomposition(brief: PartialBrief): Issue[] {
  const out: Issue[] = [];
  const seg: SegmentId = "decomposition";
  const d = brief.decomposition;
  if (!d) return out;

  const push = (
    code: string,
    severity: Severity,
    message: string,
    challenge: string,
    regenerateSegment: SegmentId = seg,
  ) => out.push({ code, severity, segment: seg, regenerateSegment, message, challenge });

  const t = d.triage;
  if (t) {
    if (
      t.namedEntity &&
      t.actualStakeholder &&
      t.namedEntity.trim().toLowerCase() !== t.actualStakeholder.trim().toLowerCase() &&
      !t.stakeholderGap
    ) {
      push(
        "stakeholder_gap_unstated",
        "hard",
        "Named entity and actual stakeholder differ but the gap is unexplained.",
        "That's who's asking. Who actually changes what they do?",
      );
    }

    const needsAsking =
      t.stakeholderConfidence === "must_confirm" || t.timeBound?.source === "must_ask";
    if (needsAsking && (t.openingQuestions?.length ?? 0) === 0) {
      push(
        "unasked_unknown",
        "hard",
        "Something is marked must-ask but no opening question covers it.",
        "You've flagged that as unconfirmed — what's the question you'd actually ask?",
      );
    }

    if ((t.resourcesToAskFor?.length ?? 0) === 0) {
      push(
        "no_resources_requested",
        "soft",
        "Nothing is being asked for beyond the given resource set.",
        "The listed resources are rarely the whole set. What would you ask for?",
      );
    }
  }

  const p = d.painPoint;
  if (p) {
    if (!p.currentWorkaround?.whatTheyDoToday) {
      push(
        "no_current_workaround",
        "hard",
        "Pain point chosen with no account of what they do today.",
        "What do they do about this today?",
      );
    }
    if (p.reframe && !isReframeSubstantive(p.reframe.broad, p.reframe.sharpened)) {
      push(
        "reframe_restates",
        "hard",
        "The sharpened problem restates the broad one without adding substance.",
        "That's the same sentence reworded. What specifically is failing?",
      );
    }
  }

  const s = d.solution;
  if (s?.options) {
    const axes = s.options.map((o) => o.optimizesFor.trim().toLowerCase());
    if (new Set(axes).size !== axes.length) {
      push(
        "options_same_axis",
        "hard",
        "Two solution options optimise for the same thing — they are rewordings.",
        "Those optimise for the same thing. What's a genuinely different bet?",
      );
    }
    const recommended = s.options.filter((o) => o.recommended);
    if (recommended.length !== 1) {
      push(
        "options_recommendation",
        "hard",
        `${recommended.length} options marked recommended; exactly one is required.`,
        recommended.length === 0
          ? "Which of these would you actually pick, and why?"
          : "Only one can be the recommendation.",
      );
    }
    if (!s.options.some((o) => o.requiresUnlistedResource)) {
      push(
        "no_unlisted_resource_ask",
        "soft",
        "No option reaches for a resource outside the given set.",
        "Would any of these be stronger with something we weren't given? You're allowed to ask.",
      );
    }
  }

  for (const m of d.metrics ?? []) {
    if (m.kind === "primary" && !m.guardrail) {
      push(
        "primary_metric_no_guardrail",
        "hard",
        `Primary metric "${m.name}" has no guardrail.`,
        `If someone optimised ${m.name} as hard as they could, what would break?`,
      );
    }
  }

  const entities = d.entities ?? [];
  if (entities.length > 0) {
    if (!entities.some((e) => e.role === "exogenous")) {
      push(
        "no_exogenous_entity",
        "hard",
        "No exogenous entity — calendar, weather, events, competitor activity.",
        "What outside the organisation moves these numbers? Holidays, local events?",
      );
    }
    if (!entities.some((e) => e.schemaChangeRisk)) {
      push(
        "no_schema_change_risk",
        "soft",
        "No entity records a schema-change risk; schema evolution is a named track topic.",
        "What happens when one of these sources changes shape?",
      );
    }
    if (!entities.some((e) => e.oftenForgotten)) {
      push(
        "no_often_forgotten_entity",
        "soft",
        "Nothing flagged as commonly forgotten.",
        "Which of these would most people leave out?",
      );
    }
  }

  if (d.grainStatement && !/one row per/i.test(d.grainStatement)) {
    push(
      "grain_not_stated",
      "hard",
      'Grain statement should take the form "one row per ...".',
      'Finish this sentence: "one row per ..."',
    );
  }

  return out;
}

// ───────────── area 2: architecture & governance ─────────────

export function validateArchitecture(
  brief: PartialBrief,
  coverage: TrackCoverage[] = [],
): Issue[] {
  const out: Issue[] = [];
  const seg: SegmentId = "architecture";
  const a = brief.architecture;
  if (!a) return out;

  const push = (
    code: string,
    severity: Severity,
    message: string,
    challenge: string,
    regenerateSegment: SegmentId = seg,
  ) => out.push({ code, severity, segment: seg, regenerateSegment, message, challenge });

  const reqs = a.requirements ?? [];
  const functional = reqs.filter((r) => r.kind === "functional");
  const nonFunctional = reqs.filter((r) => r.kind === "non_functional");

  // The fault is upstream: too many requirements means the scope is too wide.
  if (functional.length > 2) {
    push(
      "too_many_functional",
      "hard",
      `${functional.length} functional requirements; the cap is 2. The scope is too wide.`,
      `That's F${functional.length}. Either it's out of scope, or the MVP cut was too generous — want to go back?`,
      "product",
    );
  }
  if (nonFunctional.length > 2) {
    push(
      "too_many_non_functional",
      "hard",
      `${nonFunctional.length} non-functional requirements; the cap is 2.`,
      "That's a third non-functional requirement. Which of these actually gates the MVP?",
      "product",
    );
  }
  if (functional.length === 0 && reqs.length > 0) {
    push(
      "no_functional_requirement",
      "hard",
      "No functional requirement — nothing states what the system must do.",
      "What must this system actually do?",
    );
  }

  const reqIds = new Set(reqs.map((r) => r.id));
  const components = a.components ?? [];
  for (const c of components) {
    if (!reqIds.has(c.satisfiesRequirement)) {
      push(
        "component_orphan",
        "hard",
        `Component "${c.name}" satisfies "${c.satisfiesRequirement}", which is not a requirement.`,
        `What does ${c.name} satisfy? If nothing, it either doesn't belong or you're missing a requirement.`,
      );
    }
  }

  if (components.length > 0) {
    if (!components.some((c) => c.layer === "application")) {
      push(
        "no_application_layer",
        "hard",
        "Nothing at the application layer — the design stops before the user acts on it.",
        "Who looks at this, and on what screen? The area asks for ingestion through to where users interact.",
      );
    }
    const fullStack = coverage.find((c) => c.track === "full_stack");
    const hasFrontBack = fullStack?.topicsTouched.includes(
      "frontend_backend_interaction",
    );
    if (!components.some((c) => c.layer === "api") && !hasFrontBack) {
      push(
        "no_api_surface",
        "soft",
        "No API layer and no frontend/backend topic — the full-stack track has no evidence.",
        "How does the output actually reach them? There's no interface or API here yet.",
      );
    }
  }

  if (a.scale) {
    const hasEstimate = a.scale.estimate !== null && a.scale.estimate !== undefined;
    if (a.scale.needsArithmetic !== hasEstimate) {
      push(
        "scale_estimate_mismatch",
        "hard",
        a.scale.needsArithmetic
          ? "Arithmetic is needed but no estimate is recorded."
          : "An estimate is recorded although the qualitative prior already settles the design.",
        a.scale.needsArithmetic
          ? "You said a number is needed here — what is it?"
          : "Does that number change any decision? If the prior already rules things out, skip it.",
      );
    }
  }

  for (const q of a.governance?.dataQuality ?? []) {
    if (!q.owner?.trim()) {
      push(
        "quality_check_unowned",
        "hard",
        `Data-quality check "${q.check}" has no owner.`,
        `Who owns "${q.check}"? A check with no owner never runs.`,
      );
    }
  }

  return out;
}

// ───────────── area 3: product definition ─────────────

export function validateProduct(brief: PartialBrief): Issue[] {
  const out: Issue[] = [];
  const seg: SegmentId = "product";
  const pr = brief.product;
  if (!pr) return out;

  const push = (
    code: string,
    severity: Severity,
    message: string,
    challenge: string,
    regenerateSegment: SegmentId = seg,
  ) => out.push({ code, severity, segment: seg, regenerateSegment, message, challenge });

  const componentIds = new Set((brief.architecture?.components ?? []).map((c) => c.id));
  const cut = pr.mvpCutLine ?? [];

  for (const id of cut) {
    if (componentIds.size > 0 && !componentIds.has(id)) {
      push(
        "cut_line_unknown_component",
        "hard",
        `Cut line references "${id}", which is not a component in the architecture.`,
        "The MVP has to be expressed in the same components as the design.",
      );
    }
  }

  if (componentIds.size > 0 && cut.length >= componentIds.size) {
    push(
      "cut_line_is_everything",
      "hard",
      "The cut line contains every component — that is not a cut.",
      "Everything's inside the line. What actually waits?",
    );
  }

  const cutSet = new Set(cut);
  for (const dfr of pr.deferred ?? []) {
    if (dfr.componentId && cutSet.has(dfr.componentId)) {
      push(
        "deferred_inside_cut_line",
        "hard",
        `"${dfr.item}" is deferred but its component is inside the cut line.`,
        "That's marked deferred but it's shipping. Which is it?",
      );
    }
  }

  const bn = pr.bottlenecks ?? [];
  const kinds = new Set(bn.map((b) => b.kind));
  if (bn.length > 0 && kinds.size !== 3) {
    push(
      "bottlenecks_incomplete",
      "hard",
      "All three bottlenecks — coordination, integration, rollout — must be assessed.",
      "You've costed some of the window. What about coordination, integration and rollout?",
    );
  }
  if (bn.length === 3 && bn.every((b) => b.costOfWindow === "negligible")) {
    push(
      "bottleneck_denial",
      "hard",
      "All three bottlenecks negligible — the window always costs something somewhere.",
      "A week always costs something. Is there a documented API for that source?",
    );
  }
  for (const b of bn) {
    if (!b.narration?.trim()) {
      push(
        "bottleneck_unnarrated",
        "soft",
        `Bottleneck "${b.kind}" has no narration.`,
        "Say that out loud — silent reasoning scores nothing.",
      );
    }
  }

  const next = pr.nextMvps ?? [];
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      if (next[i].unblockedBy && next[j].adds === next[i].unblockedBy) {
        push(
          "next_mvp_order",
          "hard",
          `MVP ${next[i].version} precedes what unblocks it.`,
          "That can't ship before the thing it depends on.",
        );
      }
    }
  }

  return out;
}

// ───────────────────────── endings ─────────────────────────

export function validateEndings(
  brief: PartialBrief,
  coverage: TrackCoverage[] = [],
): Issue[] {
  const out: Issue[] = [];
  const seg: SegmentId = "depth";

  const wantsDeep = brief.companyMode === "deep_dive" || brief.companyMode === "both";
  const wantsBack = brief.companyMode === "present_back" || brief.companyMode === "both";

  if (wantsDeep && !brief.deepDive) {
    out.push({
      code: "missing_deep_dive",
      severity: "hard",
      segment: seg,
      regenerateSegment: seg,
      message: "Company mode expects a deep dive but none is present.",
      challenge: "Where are you going deep?",
    });
  }
  if (wantsBack && !brief.presentBack) {
    out.push({
      code: "missing_present_back",
      severity: "hard",
      segment: seg,
      regenerateSegment: seg,
      message: "Company mode expects a present-back but none is present.",
      challenge: "Summarise this for the customer — what can they now do?",
    });
  }

  const depthTrack = coverage.find((c) => c.isDepthTrack)?.track;
  if (brief.deepDive && depthTrack && brief.deepDive.track !== depthTrack) {
    out.push({
      code: "depth_track_mismatch",
      severity: "hard",
      segment: seg,
      regenerateSegment: seg,
      message: `Depth is claimed in ${TRACK_LABELS[depthTrack]} but the deep dive is in ${TRACK_LABELS[brief.deepDive.track]}.`,
      challenge: "The track you claimed and the one you went deep in aren't the same.",
    });
  }

  if (brief.presentBack) {
    const text = brief.presentBack.whatTheyCanNowDo.toLowerCase();
    const found = JARGON_BLOCKLIST.filter((j) => text.includes(j));
    if (found.length > 0) {
      out.push({
        code: "present_back_jargon",
        severity: "hard",
        segment: seg,
        regenerateSegment: seg,
        message: `Customer summary contains jargon: ${found.join(", ")}.`,
        challenge: `"${found[0]}" is engineer language. What does it let them *do*?`,
      });
    }
  }

  return out;
}

// ───────────────────────── aggregate ─────────────────────────

export interface ValidationReport {
  issues: Issue[];
  hardCount: number;
  softCount: number;
  /** Which segments to regenerate, in session order. */
  regenerate: SegmentId[];
  ok: boolean;
}

export function validateBrief(
  brief: PartialBrief,
  clock: ClockState | null,
  coverage: TrackCoverage[] = [],
): ValidationReport {
  const issues: Issue[] = [
    ...(clock ? validateClock(clock) : []),
    ...validateDecomposition(brief),
    ...validateArchitecture(brief, coverage),
    ...validateProduct(brief),
    ...(coverage.length > 0 ? validateCoverage(coverage) : []),
    ...validateEndings(brief, coverage),
  ];

  const hard = issues.filter((i) => i.severity === "hard");
  const regenerate = [
    ...new Set(hard.map((i) => i.regenerateSegment)),
  ] as SegmentId[];

  return {
    issues,
    hardCount: hard.length,
    softCount: issues.length - hard.length,
    regenerate,
    ok: hard.length === 0,
  };
}

/** The same issues, filtered to what is worth saying out loud in a segment. */
export function challengesForSegment(
  report: ValidationReport,
  segment: SegmentId,
  opts: { max?: number; dismissed?: Set<string> } = {},
): Issue[] {
  const { max = 3, dismissed = new Set<string>() } = opts;

  // One per code. A rule that fires per item — three unnarrated bottlenecks,
  // say — would otherwise say the same sentence three times, which is the
  // fastest way to train someone to ignore the panel.
  const seen = new Set<string>();

  return report.issues
    .filter((i) => i.segment === segment && !dismissed.has(i.code))
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "hard" ? -1 : 1))
    .filter((i) => {
      if (seen.has(i.code)) return false;
      seen.add(i.code);
      return true;
    })
    .slice(0, max);
}

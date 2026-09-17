/**
 * The session clock.
 *
 * Overrun is BORROWED from the remaining segments, never absorbed. Spend 25
 * minutes in decomposition on a 60-minute budget and the later segments
 * visibly narrow. `overranBy` is recorded and never corrected — running long
 * is a scored signal, not an error to hide.
 *
 * This lives in client state and is only ever *reported into* agent context.
 * An agent-owned timer would stall on every model call and quietly hand back
 * the minutes the segment was meant to cost.
 */

import {
  PRESET_SPECS,
  SEGMENTS,
  type PresetId,
  type Posture,
  type SegmentId,
  segmentIndex,
} from "./segments";

export type SegmentStatus = "pending" | "active" | "done";

export interface SegmentState {
  segment: SegmentId;
  /** The planned budget. Never mutated — see `effectiveBudget`. */
  budgetMinutes: number;
  elapsedMinutes: number;
  overranBy: number;
  posture: Posture;
  status: SegmentStatus;
}

export interface ClockState {
  preset: PresetId;
  totalMinutes: number | null;
  segments: SegmentState[];
  minutesRemaining: number;
  debtMinutes: number;
}

/** Never shrink a segment below this, however much debt precedes it. */
const MIN_EFFECTIVE_MINUTES = 1;

export function createClock(preset: PresetId): ClockState {
  const spec = PRESET_SPECS[preset];
  const segments: SegmentState[] = SEGMENTS.map((segment, i) => ({
    segment,
    budgetMinutes: spec.budgets[segment],
    elapsedMinutes: 0,
    overranBy: 0,
    posture: spec.defaultPosture,
    status: i === 0 ? "active" : "pending",
  }));
  return recompute({
    preset,
    totalMinutes: spec.totalMinutes,
    segments,
    minutesRemaining: spec.totalMinutes ?? 0,
    debtMinutes: 0,
  });
}

/**
 * Debt is only real once a segment is *finished* over budget. A segment that is
 * currently over its budget is still running, so its overrun is shown live but
 * does not yet reallocate the rest of the session.
 */
function recompute(clock: ClockState): ClockState {
  const segments = clock.segments.map((s) => ({
    ...s,
    overranBy: Math.max(0, round1(s.elapsedMinutes - s.budgetMinutes)),
  }));

  const spent = segments.reduce((n, s) => n + s.elapsedMinutes, 0);
  const debtMinutes = segments
    .filter((s) => s.status === "done")
    .reduce((n, s) => n + s.overranBy, 0);

  return {
    ...clock,
    segments,
    debtMinutes: round1(debtMinutes),
    minutesRemaining:
      clock.totalMinutes === null ? 0 : round1(clock.totalMinutes - spent),
  };
}

/**
 * What a not-yet-finished segment actually has left, after debt from completed
 * segments is borrowed against it. Debt is shared in proportion to planned
 * budget, so a big block absorbs more of an earlier overrun than a small one.
 */
export function effectiveBudget(clock: ClockState, segment: SegmentId): number {
  const target = clock.segments.find((s) => s.segment === segment);
  if (!target) throw new Error(`unknown segment: ${segment}`);
  if (target.status === "done" || clock.debtMinutes === 0) {
    return target.budgetMinutes;
  }

  const open = clock.segments.filter((s) => s.status !== "done");
  const openBudget = open.reduce((n, s) => n + s.budgetMinutes, 0);
  if (openBudget === 0) return target.budgetMinutes;

  const share = (clock.debtMinutes * target.budgetMinutes) / openBudget;
  return round1(Math.max(MIN_EFFECTIVE_MINUTES, target.budgetMinutes - share));
}

/** Advance the session clock. `minutes` accrues to whichever segment is active. */
export function tick(clock: ClockState, minutes: number): ClockState {
  if (minutes < 0) throw new Error("tick cannot run backwards");
  const active = clock.segments.find((s) => s.status === "active");
  if (!active) return clock;
  return recompute({
    ...clock,
    segments: clock.segments.map((s) =>
      s.segment === active.segment
        ? { ...s, elapsedMinutes: round1(s.elapsedMinutes + minutes) }
        : s,
    ),
  });
}

/** Close the active segment and open the next. Terminal at the last segment. */
export function advance(clock: ClockState): ClockState {
  const i = clock.segments.findIndex((s) => s.status === "active");
  if (i === -1) return clock;
  return recompute({
    ...clock,
    segments: clock.segments.map((s, j) => {
      if (j === i) return { ...s, status: "done" as SegmentStatus };
      if (j === i + 1) return { ...s, status: "active" as SegmentStatus };
      return s;
    }),
  });
}

/**
 * Revisiting an earlier segment is permitted — it is a positive signal, not a
 * correction. The clock keeps running, which is the honest cost.
 */
export function goBackTo(clock: ClockState, segment: SegmentId): ClockState {
  const i = segmentIndex(segment);
  return recompute({
    ...clock,
    segments: clock.segments.map((s, j) => ({
      ...s,
      status: j === i ? "active" : j < i ? "done" : "pending",
    })),
  });
}

export function setPosture(
  clock: ClockState,
  segment: SegmentId,
  posture: Posture,
): ClockState {
  const allowed = PRESET_SPECS[clock.preset].allowedPostures;
  if (!allowed.includes(posture)) {
    throw new Error(
      `posture "${posture}" is not available in preset "${clock.preset}" (allowed: ${allowed.join(", ")})`,
    );
  }
  return {
    ...clock,
    segments: clock.segments.map((s) =>
      s.segment === segment ? { ...s, posture } : s,
    ),
  };
}

export function activeSegment(clock: ClockState): SegmentState | undefined {
  return clock.segments.find((s) => s.status === "active");
}

export function isOverrunning(clock: ClockState, segment: SegmentId): boolean {
  const s = clock.segments.find((x) => x.segment === segment);
  return !!s && s.elapsedMinutes > effectiveBudget(clock, segment);
}

/** Compact shape handed to the agent so it knows how much time is left. */
export function clockSummaryForAgent(clock: ClockState) {
  const active = activeSegment(clock);
  return {
    preset: clock.preset,
    activeSegment: active?.segment ?? null,
    posture: active?.posture ?? null,
    minutesRemaining: clock.minutesRemaining,
    debtMinutes: clock.debtMinutes,
    segmentBudget: active ? effectiveBudget(clock, active.segment) : null,
    segmentElapsed: active?.elapsedMinutes ?? null,
    overrunning: active ? isOverrunning(clock, active.segment) : false,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

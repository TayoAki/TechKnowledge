"use client";

/**
 * Session state: the clock, the brief under construction, and the challenges
 * derived from them.
 *
 * The clock lives here, in client state, and is only ever *reported into* agent
 * context. An agent-owned timer would stall on every model call and quietly
 * hand back the minutes the segment was meant to cost.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  activeSegment,
  advance,
  createClock,
  effectiveBudget,
  goBackTo,
  isOverrunning,
  setPosture,
  tick,
  type ClockState,
} from "@/domain/clock";
import type { PresetId, Posture, SegmentId } from "@/domain/segments";
import {
  computeCoverage,
  type TopicId,
  type TrackCoverage,
  type TrackId,
} from "@/domain/coverage";
import { challengesForSegment, validateBrief, type Issue } from "@/domain/validators";
import type { PartialBrief } from "@/domain/brief";

export interface SessionState {
  clock: ClockState;
  brief: PartialBrief;
  touchedTopics: TopicId[];
  depthTrack: TrackId | null;
  depthEvidence: string | null;
  dismissed: string[];
  /** Ghost suggestions the agent has offered, and what became of them. */
  ghosts: Ghost[];
  running: boolean;
}

export interface Ghost {
  id: string;
  segment: SegmentId;
  label: string;
  detail: string;
  /** Rejecting with a reason scores above accepting silently. */
  outcome: "pending" | "accepted" | "rejected";
  reason: string | null;
}

type Action =
  | { type: "tick"; minutes: number }
  | { type: "advance" }
  | { type: "goBack"; segment: SegmentId }
  | { type: "setPosture"; segment: SegmentId; posture: Posture }
  | { type: "setRunning"; running: boolean }
  | { type: "patchBrief"; patch: (b: PartialBrief) => PartialBrief }
  | { type: "touchTopic"; topic: TopicId }
  | { type: "claimDepth"; track: TrackId; evidence: string | null }
  | { type: "dismiss"; code: string }
  | { type: "offerGhost"; ghost: Omit<Ghost, "outcome" | "reason"> }
  | { type: "resolveGhost"; id: string; outcome: "accepted" | "rejected"; reason: string | null }
  | { type: "reset"; preset: PresetId; rawAsk: string };

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "tick":
      return { ...state, clock: tick(state.clock, action.minutes) };
    case "advance":
      return { ...state, clock: advance(state.clock) };
    case "goBack":
      return { ...state, clock: goBackTo(state.clock, action.segment) };
    case "setPosture":
      try {
        return {
          ...state,
          clock: setPosture(state.clock, action.segment, action.posture),
        };
      } catch {
        // The preset forbids it; leave state untouched rather than throwing
        // out of a reducer.
        return state;
      }
    case "setRunning":
      return { ...state, running: action.running };
    case "patchBrief":
      return { ...state, brief: action.patch(state.brief) };
    case "touchTopic":
      return state.touchedTopics.includes(action.topic)
        ? state
        : { ...state, touchedTopics: [...state.touchedTopics, action.topic] };
    case "claimDepth":
      return { ...state, depthTrack: action.track, depthEvidence: action.evidence };
    case "dismiss":
      return state.dismissed.includes(action.code)
        ? state
        : { ...state, dismissed: [...state.dismissed, action.code] };
    case "offerGhost":
      return {
        ...state,
        ghosts: [...state.ghosts, { ...action.ghost, outcome: "pending", reason: null }],
      };
    case "resolveGhost":
      return {
        ...state,
        ghosts: state.ghosts.map((g) =>
          g.id === action.id
            ? { ...g, outcome: action.outcome, reason: action.reason }
            : g,
        ),
      };
    case "reset":
      return initialState(action.preset, action.rawAsk);
  }
}

export function initialState(preset: PresetId, rawAsk: string): SessionState {
  return {
    clock: createClock(preset),
    brief: { id: crypto.randomUUID(), rawAsk, companyMode: "deep_dive" },
    touchedTopics: [],
    depthTrack: null,
    depthEvidence: null,
    dismissed: [],
    ghosts: [],
    running: false,
  };
}

const TICK_MS = 1000;

export function useSession(preset: PresetId, rawAsk: string) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(preset, rawAsk),
  );

  // The clock advances on a wall-clock interval, independent of any model call.
  const runningRef = useRef(state.running);
  runningRef.current = state.running;
  useEffect(() => {
    if (!state.running) return;
    const handle = setInterval(() => {
      if (runningRef.current) dispatch({ type: "tick", minutes: TICK_MS / 60000 });
    }, TICK_MS);
    return () => clearInterval(handle);
  }, [state.running]);

  const coverage: TrackCoverage[] = useMemo(
    () => computeCoverage(state.touchedTopics, state.depthTrack, state.depthEvidence),
    [state.touchedTopics, state.depthTrack, state.depthEvidence],
  );

  const report = useMemo(
    () => validateBrief(state.brief, state.clock, coverage),
    [state.brief, state.clock, coverage],
  );

  const current = activeSegment(state.clock);

  const challenges: Issue[] = useMemo(() => {
    if (!current) return [];
    // Blank posture means silence until asked.
    if (current.posture === "blank") return [];
    return challengesForSegment(report, current.segment, {
      max: 3,
      dismissed: new Set(state.dismissed),
    });
  }, [report, current, state.dismissed]);

  const budget = current ? effectiveBudget(state.clock, current.segment) : null;
  const overrunning = current ? isOverrunning(state.clock, current.segment) : false;

  return {
    state,
    coverage,
    report,
    challenges,
    segment: current?.segment ?? null,
    posture: current?.posture ?? null,
    budget,
    overrunning,
    // actions
    start: useCallback(() => dispatch({ type: "setRunning", running: true }), []),
    pause: useCallback(() => dispatch({ type: "setRunning", running: false }), []),
    advanceSegment: useCallback(() => dispatch({ type: "advance" }), []),
    goBack: useCallback((s: SegmentId) => dispatch({ type: "goBack", segment: s }), []),
    choosePosture: useCallback(
      (s: SegmentId, p: Posture) => dispatch({ type: "setPosture", segment: s, posture: p }),
      [],
    ),
    patchBrief: useCallback(
      (patch: (b: PartialBrief) => PartialBrief) => dispatch({ type: "patchBrief", patch }),
      [],
    ),
    touchTopic: useCallback((t: TopicId) => dispatch({ type: "touchTopic", topic: t }), []),
    claimDepth: useCallback(
      (track: TrackId, evidence: string | null) =>
        dispatch({ type: "claimDepth", track, evidence }),
      [],
    ),
    dismiss: useCallback((code: string) => dispatch({ type: "dismiss", code }), []),
    offerGhost: useCallback(
      (g: Omit<Ghost, "outcome" | "reason">) => dispatch({ type: "offerGhost", ghost: g }),
      [],
    ),
    resolveGhost: useCallback(
      (id: string, outcome: "accepted" | "rejected", reason: string | null) =>
        dispatch({ type: "resolveGhost", id, outcome, reason }),
      [],
    ),
    reset: useCallback(
      (p: PresetId, ask: string) => dispatch({ type: "reset", preset: p, rawAsk: ask }),
      [],
    ),
  };
}

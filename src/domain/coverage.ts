/**
 * Track coverage: breadth across BOTH engineering tracks, depth in exactly one.
 *
 * Coverage spans all three assessed areas — it is not a fourth section. Depth
 * in one track does not excuse silence in the other, so breadth is computed
 * from what was actually touched rather than asserted.
 */

export const TRACKS = ["data_engineering", "full_stack"] as const;
export type TrackId = (typeof TRACKS)[number];

export const TRACK_TOPICS = {
  data_engineering: [
    "pipelines",
    "data_quality",
    "ingestion_patterns",
    "schema_evolution",
  ],
  full_stack: [
    "application_architecture",
    "ux",
    "api_design",
    "frontend_backend_interaction",
  ],
} as const satisfies Record<TrackId, readonly string[]>;

export type TopicId =
  | (typeof TRACK_TOPICS)["data_engineering"][number]
  | (typeof TRACK_TOPICS)["full_stack"][number];

export const TRACK_LABELS: Record<TrackId, string> = {
  data_engineering: "Data Engineering",
  full_stack: "Full Stack Engineering",
};

export const TOPIC_LABELS: Record<TopicId, string> = {
  pipelines: "pipelines",
  data_quality: "data quality",
  ingestion_patterns: "ingestion patterns",
  schema_evolution: "schema evolution",
  application_architecture: "application architecture",
  ux: "UX",
  api_design: "API design",
  frontend_backend_interaction: "frontend/backend interaction",
};

/**
 * The two topics candidates skip most often, so they get their own challenges
 * rather than being folded into a generic breadth nudge.
 */
export const MOST_SKIPPED: readonly TopicId[] = ["schema_evolution", "ux"];

/** 3 of a track's 4 topics. Below that, the track has not been covered broadly. */
export const BREADTH_THRESHOLD = 3;

export interface TrackCoverage {
  track: TrackId;
  topicsTouched: TopicId[];
  topicsMissed: TopicId[];
  breadthMet: boolean;
  isDepthTrack: boolean;
  depthEvidence: string | null;
}

export function trackForTopic(topic: TopicId): TrackId {
  for (const track of TRACKS) {
    if ((TRACK_TOPICS[track] as readonly string[]).includes(topic)) return track;
  }
  throw new Error(`topic belongs to no track: ${topic}`);
}

export function computeCoverage(
  touched: Iterable<TopicId>,
  depthTrack: TrackId | null,
  depthEvidence: string | null = null,
): TrackCoverage[] {
  const touchedSet = new Set(touched);
  return TRACKS.map((track) => {
    const topics = TRACK_TOPICS[track] as readonly TopicId[];
    const topicsTouched = topics.filter((t) => touchedSet.has(t));
    const topicsMissed = topics.filter((t) => !touchedSet.has(t));
    const isDepthTrack = depthTrack === track;
    return {
      track,
      topicsTouched: [...topicsTouched],
      topicsMissed: [...topicsMissed],
      breadthMet: topicsTouched.length >= BREADTH_THRESHOLD,
      isDepthTrack,
      depthEvidence: isDepthTrack ? depthEvidence : null,
    };
  });
}

export interface CoverageVerdict {
  /** Both tracks broad AND exactly one depth track with evidence. */
  meetsBar: boolean;
  breadthGaps: { track: TrackId; missing: TopicId[] }[];
  depthTrack: TrackId | null;
  problems: string[];
}

export function assessCoverage(coverage: TrackCoverage[]): CoverageVerdict {
  const problems: string[] = [];

  const depthTracks = coverage.filter((c) => c.isDepthTrack);
  if (depthTracks.length === 0) {
    problems.push("No depth track claimed — the bar is depth in at least one.");
  } else if (depthTracks.length > 1) {
    problems.push(
      "More than one depth track claimed — depth means one, not a second breadth pass.",
    );
  } else if (!depthTracks[0].depthEvidence) {
    problems.push(
      `Depth claimed in ${TRACK_LABELS[depthTracks[0].track]} with no evidence for it.`,
    );
  }

  const breadthGaps = coverage
    .filter((c) => !c.breadthMet)
    .map((c) => ({ track: c.track, missing: c.topicsMissed }));

  for (const gap of breadthGaps) {
    problems.push(
      `${TRACK_LABELS[gap.track]} is below breadth — missing ${gap.missing
        .map((t) => TOPIC_LABELS[t])
        .join(", ")}. Depth in the other track does not excuse this.`,
    );
  }

  return {
    meetsBar: problems.length === 0,
    breadthGaps,
    depthTrack: depthTracks.length === 1 ? depthTracks[0].track : null,
    problems,
  };
}

/** Compact shape handed to the agent so it can challenge the gaps. */
export function coverageSummaryForAgent(coverage: TrackCoverage[]) {
  return coverage.map((c) => ({
    track: c.track,
    touched: c.topicsTouched,
    missed: c.topicsMissed,
    breadthMet: c.breadthMet,
    isDepthTrack: c.isDepthTrack,
    mostSkippedStillMissing: c.topicsMissed.filter((t) =>
      MOST_SKIPPED.includes(t),
    ),
  }));
}

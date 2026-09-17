"use client";

/**
 * Breadth in both tracks, depth in exactly one. Depth in one track never
 * excuses silence in the other, so both rows are always shown and the two
 * most-skipped topics are called out rather than folded into a count.
 */

import {
  assessCoverage,
  MOST_SKIPPED,
  TOPIC_LABELS,
  TRACK_LABELS,
  TRACK_TOPICS,
  type TopicId,
  type TrackCoverage,
} from "@/domain/coverage";

export function CoverageMeter({
  coverage,
  onToggleTopic,
}: {
  coverage: TrackCoverage[];
  onToggleTopic?: (t: TopicId) => void;
}) {
  const verdict = assessCoverage(coverage);

  return (
    <div className="coverage">
      {coverage.map((c) => {
        const topics = TRACK_TOPICS[c.track] as readonly TopicId[];
        const touched = new Set(c.topicsTouched as TopicId[]);
        return (
          <div className="cov-row" key={c.track}>
            <span className="cov-track">{TRACK_LABELS[c.track]}</span>
            {topics.map((t) => {
              const on = touched.has(t);
              return (
                <button
                  key={t}
                  className="topic"
                  data-on={on}
                  data-skipped={!on && MOST_SKIPPED.includes(t)}
                  onClick={() => onToggleTopic?.(t)}
                  title={
                    !on && MOST_SKIPPED.includes(t)
                      ? "One of the two most commonly skipped topics"
                      : undefined
                  }
                >
                  {TOPIC_LABELS[t]}
                  {on ? " ✓" : ""}
                </button>
              );
            })}
            <span className="badge" data-ok={c.breadthMet}>
              breadth {c.topicsTouched.length}/{topics.length}
            </span>
            {c.isDepthTrack && (
              <span className="badge" data-depth="true">
                depth
              </span>
            )}
          </div>
        );
      })}

      {!verdict.meetsBar && (
        <p className="quiet" style={{ marginTop: 8, marginBottom: 0 }}>
          {verdict.problems[0]}
        </p>
      )}
    </div>
  );
}

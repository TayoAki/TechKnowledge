"use client";

/**
 * The session clock. Segments size to their EFFECTIVE budget, so an earlier
 * overrun visibly narrows the blocks that follow — the whole reason this is one
 * budget rather than five stopwatches.
 */

import { effectiveBudget, type ClockState } from "@/domain/clock";
import { SEGMENT_LABELS, type SegmentId } from "@/domain/segments";

function mmss(minutes: number): string {
  const safe = Math.max(0, minutes);
  const m = Math.floor(safe);
  const s = Math.round((safe - m) * 60);
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, "0")}`;
}

export function ClockBar({
  clock,
  onJump,
}: {
  clock: ClockState;
  onJump: (s: SegmentId) => void;
}) {
  const untimed = clock.totalMinutes === null;

  return (
    <div className="clock">
      <div className="clock-head">
        <span className="clock-total">
          {untimed ? "untimed" : mmss(clock.minutesRemaining)}
        </span>
        <span className="hint">
          {untimed ? "study mode" : "remaining in the session"}
        </span>
        {clock.debtMinutes > 0 && (
          <span className="clock-debt" title="Borrowed from the segments that follow">
            +{mmss(clock.debtMinutes)} borrowed
          </span>
        )}
      </div>

      <div className="segbar">
        {clock.segments.map((s) => {
          const budget = effectiveBudget(clock, s.segment);
          const over = s.elapsedMinutes > budget;
          const shrunk = budget < s.budgetMinutes;
          const pct = budget > 0 ? Math.min(100, (s.elapsedMinutes / budget) * 100) : 0;
          return (
            <button
              key={s.segment}
              className="seg"
              data-status={s.status}
              data-over={over}
              onClick={() => onJump(s.segment)}
              style={{ flexGrow: Math.max(0.6, budget) }}
              title={
                shrunk
                  ? `Planned ${s.budgetMinutes} min, now ${budget} min after borrowing`
                  : `${s.budgetMinutes} min`
              }
            >
              <div className="seg-name">{SEGMENT_LABELS[s.segment]}</div>
              <div className={`seg-mins${shrunk ? " seg-shrunk" : ""}`}>
                {mmss(s.elapsedMinutes)} / {budget}m{shrunk ? " ↓" : ""}
              </div>
              <div className="seg-track">
                <div className="seg-fill" data-over={over} style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

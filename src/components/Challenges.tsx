"use client";

/**
 * The validators, spoken.
 *
 * Every rule that fires as a silent regeneration check on the auto-build path
 * appears here as a question instead. Capped and dismissable, because an AI
 * that questions every box becomes noise and gets ignored.
 */

import type { Issue } from "@/domain/validators";

export function Challenges({
  challenges,
  posture,
  onDismiss,
}: {
  challenges: Issue[];
  posture: string | null;
  onDismiss: (code: string) => void;
}) {
  if (posture === "blank") {
    return (
      <p className="quiet">
        Blank posture — silent until you ask. You will get the critique at the buzzer.
      </p>
    );
  }

  if (challenges.length === 0) {
    return (
      <p className="quiet">
        Nothing to push on. Silence is the correct output once the board is sound.
      </p>
    );
  }

  return (
    <div>
      {challenges.map((c) => (
        <div className="challenge" data-sev={c.severity} key={c.code}>
          <div className="challenge-text">{c.challenge}</div>
          <div className="challenge-acts">
            <button className="chip" onClick={() => onDismiss(c.code)}>
              dismiss
            </button>
            {c.regenerateSegment !== c.segment && (
              <span className="hint">fix belongs in {c.regenerateSegment}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

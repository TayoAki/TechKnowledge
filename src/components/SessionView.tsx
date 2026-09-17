"use client";

/**
 * The session.
 *
 * The AI draws the scaffold, the user fills it, the AI challenges what they put
 * down. Every CopilotKit hook here serves that division of labour:
 *   - useAgentContext  reports the board and the clock so the agent can react
 *   - useFrontendTool  lets the agent offer a ghost box or tag a component
 *   - useHumanInTheLoop pauses the agent at a gate until the user answers
 */

import { useMemo, useState } from "react";
import { z } from "zod";
import {
  useAgentContext,
  useFrontendTool,
  useHumanInTheLoop,
} from "@copilotkit/react-core/v2";
import { ToolCallStatus } from "@copilotkit/core";
import { ClockBar } from "./ClockBar";
import { CoverageMeter } from "./CoverageMeter";
import { Challenges } from "./Challenges";
import { Frame } from "./Frame";
import { ArchBoard } from "./ArchBoard";
import { MetricsGrid } from "./MetricsGrid";
import { WeekBar } from "./WeekBar";
import { useSession } from "@/hooks/useSession";
import { clockSummaryForAgent } from "@/domain/clock";
import { coverageSummaryForAgent, type TopicId, type TrackId } from "@/domain/coverage";
import { buildTurnContext } from "@/agent/prompts";
import { PRESET_SPECS, SEGMENT_LABELS, type PresetId, type Posture } from "@/domain/segments";

export function SessionView({ preset, rawAsk }: { preset: PresetId; rawAsk: string }) {
  const s = useSession(preset, rawAsk);
  const [depthDraft, setDepthDraft] = useState("");

  const clockSummary = useMemo(() => clockSummaryForAgent(s.state.clock), [s.state.clock]);
  const coverageSummary = useMemo(() => coverageSummaryForAgent(s.coverage), [s.coverage]);

  // ── what the agent can see ──────────────────────────────────────────
  // The clock is reported, never driven, by the agent.
  useAgentContext({
    description:
      "The live session: which segment is active, how much of the budget is left, " +
      "how much has been borrowed from later segments, and the current posture.",
    value: clockSummary,
  });

  useAgentContext({
    description:
      "Track coverage. Breadth is required in BOTH tracks and depth in exactly one; " +
      "depth in one never excuses silence in the other.",
    value: coverageSummary,
  });

  useAgentContext({
    description: "The board as it currently stands — the user's own work in progress.",
    value: s.state.brief as never,
  });

  useAgentContext({
    description:
      "Segment instructions and the pending challenges for this turn. Raise at most two, " +
      "in your own words. If the list is empty, stay quiet.",
    value: buildTurnContext({
      segment: s.segment ?? "decomposition",
      posture: s.posture ?? "pair",
      minutesRemaining: clockSummary.minutesRemaining,
      debtMinutes: clockSummary.debtMinutes,
      segmentBudget: clockSummary.segmentBudget,
      segmentElapsed: clockSummary.segmentElapsed,
      overrunning: clockSummary.overrunning,
      challenges: s.challenges.map((c) => ({
        code: c.code,
        challenge: c.challenge,
        severity: c.severity,
      })),
      coverageGaps: coverageSummary.flatMap((c) => c.missed),
    }),
  });

  // ── what the agent can do ───────────────────────────────────────────
  // Offer, never insert. A ghost stays dashed until the user rules on it.
  useFrontendTool(
    {
      name: "offerGhostComponent",
      description:
        "Offer a missing piece of the design as a dashed 'ghost' the user accepts or " +
        "rejects. Use when the board has a gap. Never use it to fill in work they have " +
        "not attempted.",
      parameters: z.object({
        label: z.string().describe("Short name for the component"),
        detail: z.string().describe("One sentence on why it is missing"),
      }),
      handler: async ({ label, detail }) => {
        s.offerGhost({
          id: crypto.randomUUID(),
          segment: s.segment ?? "architecture",
          label,
          detail,
        });
        return `Offered "${label}" as a ghost. The user decides.`;
      },
    },
    [s.segment],
  );

  useFrontendTool(
    {
      name: "markTopicCovered",
      description:
        "Record that a track topic has genuinely been addressed. Only call this when the " +
        "user has covered it, never to flatter the coverage meter.",
      parameters: z.object({
        topic: z.enum([
          "pipelines",
          "data_quality",
          "ingestion_patterns",
          "schema_evolution",
          "application_architecture",
          "ux",
          "api_design",
          "frontend_backend_interaction",
        ]),
      }),
      handler: async ({ topic }) => {
        s.touchTopic(topic as TopicId);
        return `Marked ${topic} as covered.`;
      },
    },
    [],
  );

  // ── the gate ────────────────────────────────────────────────────────
  // The agent pauses here; the run resumes only once the user answers.
  useHumanInTheLoop(
    {
      name: "confirmStakeholder",
      description:
        "Ask the user to confirm who they are actually designing for, when the prompt " +
        "names one party but the behaviour that must change belongs to another.",
      parameters: z.object({
        namedEntity: z.string(),
        proposedStakeholder: z.string(),
        why: z.string(),
      }),
      render: ({ args, status, respond }) => {
        if (status !== ToolCallStatus.Executing || !respond) {
          return <p className="hint">Checking who this is for…</p>;
        }
        return (
          <div className="challenge">
            <div className="challenge-text">
              <span className="struck">{args.namedEntity}</span> is who is asking.{" "}
              <strong>{args.proposedStakeholder}</strong> is whose behaviour has to change.{" "}
              {args.why}
            </div>
            <div className="challenge-acts">
              <button
                className="chip"
                onClick={() => respond({ confirmed: true, stakeholder: args.proposedStakeholder })}
              >
                yes, design for them
              </button>
              <button className="chip" onClick={() => respond({ confirmed: false })}>
                no, I will name it
              </button>
            </div>
          </div>
        );
      },
    },
    [],
  );

  const spec = PRESET_SPECS[s.state.clock.preset];
  const segment = s.segment;

  return (
    <div className="shell">
      <ClockBar clock={s.state.clock} onJump={s.goBack} />
      <CoverageMeter coverage={s.coverage} onToggleTopic={s.touchTopic} />

      <div className="controls" style={{ marginBottom: 16 }}>
        {s.state.running ? (
          <button className="btn" onClick={s.pause}>
            pause
          </button>
        ) : (
          <button className="btn" data-primary="true" onClick={s.start}>
            start the clock
          </button>
        )}
        <button className="btn" onClick={s.advanceSegment}>
          finish {segment ? SEGMENT_LABELS[segment] : "segment"} →
        </button>
        <label className="row" style={{ gap: 6 }}>
          <span className="hint">posture</span>
          <select
            value={s.posture ?? "pair"}
            onChange={(e) =>
              segment && s.choosePosture(segment, e.target.value as Posture)
            }
            style={{ width: "auto" }}
          >
            {spec.allowedPostures.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid">
        <div className="stack">
          <div className="panel">
            <div className="panel-title">
              {segment ? SEGMENT_LABELS[segment] : "session complete"}
            </div>

            {segment === "decomposition" && (
              <div className="stack">
                <Frame brief={s.state.brief} onEdit={s.patchBrief} />
                <div>
                  <div className="panel-title">Success metrics</div>
                  <MetricsGrid brief={s.state.brief} onEdit={s.patchBrief} />
                </div>
              </div>
            )}

            {(segment === "architecture" || segment === "product") && (
              <div className="stack">
                <ArchBoard
                  brief={s.state.brief}
                  ghosts={s.state.ghosts}
                  showCutLine={segment === "product"}
                  onResolveGhost={s.resolveGhost}
                />
                {segment === "product" && (
                  <div>
                    <div className="panel-title">Where the window goes</div>
                    <WeekBar brief={s.state.brief} onEdit={s.patchBrief} />
                  </div>
                )}
              </div>
            )}

            {segment === "depth" && (
              <div className="stack">
                <p className="hint">
                  You lead. Here the AI stops collaborating and probes — and it stays
                  inside the track you claim.
                </p>
                <div className="row">
                  {(["data_engineering", "full_stack"] as TrackId[]).map((t) => (
                    <button
                      key={t}
                      className="btn"
                      data-primary={s.state.depthTrack === t}
                      onClick={() => s.claimDepth(t, depthDraft || null)}
                    >
                      claim depth: {t.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="What specifically demonstrates that depth?"
                  value={depthDraft}
                  onChange={(e) => setDepthDraft(e.target.value)}
                  onBlur={() =>
                    s.state.depthTrack && s.claimDepth(s.state.depthTrack, depthDraft || null)
                  }
                />
              </div>
            )}

            {segment === "wrap" && (
              <p className="hint">
                Draft posture. Next MVPs rank by blocker then impact — mechanical once the
                content exists, so there is no skill being practised here.
              </p>
            )}

            {segment === null && (
              <p className="hint">Session complete. Nothing left on the clock.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel-title">The ask</div>
            <p style={{ margin: 0 }}>{s.state.brief.rawAsk}</p>
            {s.state.brief.decomposition?.painPoint?.reframe?.sharpened && (
              <p style={{ marginTop: 8, marginBottom: 0 }}>
                <span className="struck">{s.state.brief.rawAsk}</span>
                <br />→ <strong>{s.state.brief.decomposition.painPoint.reframe.sharpened}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="panel-title">Pushback</div>
            <Challenges
              challenges={s.challenges}
              posture={s.posture}
              onDismiss={s.dismiss}
            />
          </div>

          <div className="panel">
            <div className="panel-title">
              Board health · {s.report.hardCount} hard · {s.report.softCount} soft
            </div>
            {s.report.regenerate.length > 0 ? (
              <p className="hint" style={{ margin: 0 }}>
                Fixes belong in: {s.report.regenerate.join(", ")}
              </p>
            ) : (
              <p className="hint" style={{ margin: 0 }}>
                No hard issues outstanding.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

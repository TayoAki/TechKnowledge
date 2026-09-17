"use client";

import { useState } from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { SessionView } from "@/components/SessionView";
import { GuessBoard } from "@/components/GuessBoard";
import { PRESETS, PRESET_SPECS, type PresetId } from "@/domain/segments";

const EXAMPLE = "We want to analyze seat utilization and recommend better showtimes.";

type Mode = "pair" | "guess";

export default function Page() {
  const [ask, setAsk] = useState("");
  const [preset, setPreset] = useState<PresetId>("full_60");
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>("pair");

  // Guess mode needs no ask and no clock: the question engine is deterministic
  // and converges on its own, which is what makes it provably finishable.
  if (started && mode === "guess") {
    return (
      <div className="shell" data-sketch="on">
        <div className="guess-top">
          <div>
            <h1 style={{ fontSize: 20 }}>Guess the Architecture</h1>
            <p className="hint" style={{ margin: 0 }}>
              Answer in plain terms. Every answer rules designs out, and the board fills
              itself in as it narrows.
            </p>
          </div>
          <button className="btn" onClick={() => setStarted(false)}>
            ← back
          </button>
        </div>
        <GuessBoard />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="shell" style={{ maxWidth: 620, paddingTop: 72 }}>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>Paste a vague ask.</h1>
        <p className="hint" style={{ marginBottom: 20 }}>
          You will co-create the board across three assessed areas. The AI draws the
          scaffold and pushes back; you fill it in.
        </p>

        <div className="stack">
          <textarea
            placeholder={EXAMPLE}
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            style={{ minHeight: 96 }}
          />

          <label className="stack" style={{ gap: 4 }}>
            <span className="hint">session length</span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as PresetId)}
            >
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {PRESET_SPECS[p].label} — {PRESET_SPECS[p].note}
                </option>
              ))}
            </select>
          </label>

          <div className="controls">
            <button
              className="btn"
              data-primary="true"
              disabled={ask.trim().length === 0}
              onClick={() => {
                setMode("pair");
                setStarted(true);
              }}
            >
              pair-design it
            </button>
            <button className="btn" onClick={() => setAsk(EXAMPLE)}>
              use the example
            </button>
          </div>

          <div className="guess-pitch">
            <strong>Or play twenty questions.</strong>
            <p className="hint" style={{ margin: "4px 0 8px" }}>
              Don&apos;t know the architecture yet? Answer business questions and watch it
              resolve — no ask required.
            </p>
            <button
              className="btn"
              onClick={() => {
                setMode("guess");
                setStarted(true);
              }}
            >
              guess the architecture →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="default">
      <SessionView preset={preset} rawAsk={ask.trim()} />
      <CopilotSidebar
        labels={{
          title: "Your pair partner",
          initial:
            "I will draw the frame and push back on what you put in it. I will not fill it in for you.",
        }}
      />
    </CopilotKit>
  );
}

"use client";

import { useState } from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/v2/styles.css";
import { SessionView } from "@/components/SessionView";
import { PRESETS, PRESET_SPECS, type PresetId } from "@/domain/segments";

const EXAMPLE = "We want to analyze seat utilization and recommend better showtimes.";

export default function Page() {
  const [ask, setAsk] = useState("");
  const [preset, setPreset] = useState<PresetId>("full_60");
  const [started, setStarted] = useState(false);

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
              onClick={() => setStarted(true)}
            >
              begin
            </button>
            <button className="btn" onClick={() => setAsk(EXAMPLE)}>
              use the example
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

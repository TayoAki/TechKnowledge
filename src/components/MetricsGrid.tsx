"use client";

/**
 * Metric | Baseline | Target | Guardrail.
 *
 * The guardrail column is the highest-signal field on the board: optimising a
 * metric without naming what must not break is the most common weak answer.
 * A primary metric with an empty guardrail is flagged in place, not silently
 * accepted.
 *
 * A baseline of "must measure first" is a strong answer, not a gap — "I'd need
 * eight weeks of history" is the correct thing to say — so it is an explicit
 * option rather than something to apologise for.
 */

import type { Metric, PartialBrief } from "@/domain/brief";

const BASELINE_LABEL: Record<Metric["baseline"]["confidence"], string> = {
  known: "known",
  estimable: "estimable",
  must_measure_first: "must measure first",
};

export function MetricsGrid({
  brief,
  onEdit,
}: {
  brief: PartialBrief;
  onEdit: (patch: (b: PartialBrief) => PartialBrief) => void;
}) {
  const metrics = (brief.decomposition?.metrics ?? []) as Metric[];

  const addMetric = () =>
    onEdit((b) => {
      const existing = (b.decomposition?.metrics ?? []) as Metric[];
      const blank: Metric = {
        name: "",
        kind: existing.some((m) => m.kind === "primary") ? "secondary" : "primary",
        definition: "",
        baseline: { value: null, howEstablished: "", confidence: "must_measure_first" },
        target: { value: "", basis: "" },
        guardrail: null,
      };
      return {
        ...b,
        decomposition: {
          ...b.decomposition,
          metrics: [...existing, blank] as never,
        },
      };
    });

  const patchMetric = (i: number, patch: Partial<Metric>) =>
    onEdit((b) => {
      const existing = [...((b.decomposition?.metrics ?? []) as Metric[])];
      existing[i] = { ...existing[i], ...patch };
      return {
        ...b,
        decomposition: { ...b.decomposition, metrics: existing as never },
      };
    });

  return (
    <div className="stack">
      {metrics.length === 0 && (
        <p className="hint">
          No metrics yet. Whatever you put in the first column, you will be asked what
          must not break while you improve it.
        </p>
      )}

      {metrics.map((m, i) => {
        const needsGuardrail = m.kind === "primary" && !m.guardrail;
        return (
          <div className="metric" key={i} data-needs-guardrail={needsGuardrail}>
            <div className="metric-head">
              <input
                type="text"
                placeholder="metric"
                defaultValue={m.name}
                onBlur={(e) => patchMetric(i, { name: e.target.value })}
              />
              <select
                value={m.kind}
                onChange={(e) =>
                  patchMetric(i, { kind: e.target.value as Metric["kind"] })
                }
                style={{ width: "auto" }}
              >
                <option value="primary">primary</option>
                <option value="secondary">secondary</option>
                <option value="guardrail_only">guardrail only</option>
              </select>
            </div>

            <div className="metric-cells">
              <label className="cell">
                <span className="cell-label">Baseline</span>
                <select
                  value={m.baseline.confidence}
                  onChange={(e) =>
                    patchMetric(i, {
                      baseline: {
                        ...m.baseline,
                        confidence: e.target
                          .value as Metric["baseline"]["confidence"],
                      },
                    })
                  }
                >
                  {(
                    ["known", "estimable", "must_measure_first"] as const
                  ).map((c) => (
                    <option key={c} value={c}>
                      {BASELINE_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="cell">
                <span className="cell-label">Target</span>
                <input
                  type="text"
                  placeholder="+4pp on the worst daypart"
                  defaultValue={m.target.value}
                  onBlur={(e) =>
                    patchMetric(i, { target: { ...m.target, value: e.target.value } })
                  }
                />
              </label>

              <label className="cell">
                <span className="cell-label">
                  Guardrail{needsGuardrail ? " — what must not break?" : ""}
                </span>
                <input
                  type="text"
                  placeholder={
                    needsGuardrail ? "the thing this could quietly damage" : "optional"
                  }
                  defaultValue={m.guardrail?.metric ?? ""}
                  onBlur={(e) =>
                    patchMetric(i, {
                      guardrail: e.target.value
                        ? {
                            metric: e.target.value,
                            threshold: m.guardrail?.threshold ?? "must not regress",
                            why: m.guardrail?.why ?? "",
                          }
                        : null,
                    })
                  }
                />
              </label>
            </div>
          </div>
        );
      })}

      <div className="controls">
        <button className="btn" onClick={addMetric}>
          + metric
        </button>
      </div>
    </div>
  );
}

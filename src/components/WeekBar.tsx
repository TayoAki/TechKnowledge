"use client";

/**
 * The time bound as a single bar, with lanes that size to where the window
 * actually goes.
 *
 * Build time is rarely the constraint. You do not read that integration is
 * eating the week — you see it take two-thirds of the bar. That is the whole
 * argument for drawing this rather than listing it.
 */

import type { Bottleneck, PartialBrief } from "@/domain/brief";

const KINDS = ["coordination", "integration", "rollout"] as const;

const WEIGHT: Record<Bottleneck["costOfWindow"], number> = {
  negligible: 1,
  some: 3,
  most: 7,
  blocks: 10,
};

const COST_LABEL: Record<Bottleneck["costOfWindow"], string> = {
  negligible: "negligible",
  some: "some",
  most: "most of it",
  blocks: "blocks the window",
};

export function WeekBar({
  brief,
  onEdit,
}: {
  brief: PartialBrief;
  onEdit: (patch: (b: PartialBrief) => PartialBrief) => void;
}) {
  const existing = (brief.product?.bottlenecks ?? []) as Bottleneck[];

  const byKind = (k: Bottleneck["kind"]): Bottleneck =>
    existing.find((b) => b.kind === k) ?? {
      kind: k,
      assessment: "",
      costOfWindow: "negligible",
      narration: "",
    };

  const setCost = (k: Bottleneck["kind"], cost: Bottleneck["costOfWindow"]) =>
    onEdit((b) => {
      const list = KINDS.map((kind) => {
        const current =
          ((b.product?.bottlenecks ?? []) as Bottleneck[]).find((x) => x.kind === kind) ??
          { kind, assessment: "", costOfWindow: "negligible" as const, narration: "" };
        return kind === k ? { ...current, costOfWindow: cost } : current;
      });
      return { ...b, product: { ...b.product, bottlenecks: list as never } };
    });

  const lanes = KINDS.map((k) => byKind(k));
  const allNegligible = lanes.every((l) => l.costOfWindow === "negligible");
  const timeBound = brief.decomposition?.triage?.timeBound?.value;

  return (
    <div className="stack">
      <div className="row">
        <span className="panel-title" style={{ margin: 0 }}>
          {timeBound ? `the ${timeBound}` : "the window"}
        </span>
        {allNegligible && (
          <span className="hint" style={{ color: "var(--warn)" }}>
            a week always costs something somewhere
          </span>
        )}
      </div>

      <div className="weekbar">
        {lanes.map((l) => (
          <div
            className="lane"
            key={l.kind}
            data-cost={l.costOfWindow}
            style={{ flexGrow: WEIGHT[l.costOfWindow] }}
            title={COST_LABEL[l.costOfWindow]}
          >
            <span className="lane-name">{l.kind}</span>
          </div>
        ))}
      </div>

      <div className="stack" style={{ gap: 6 }}>
        {lanes.map((l) => (
          <label className="row" key={l.kind} style={{ gap: 8 }}>
            <span className="layer" style={{ minWidth: 108 }}>
              {l.kind}
            </span>
            <select
              value={l.costOfWindow}
              onChange={(e) =>
                setCost(l.kind, e.target.value as Bottleneck["costOfWindow"])
              }
              style={{ width: "auto" }}
            >
              {(Object.keys(WEIGHT) as Bottleneck["costOfWindow"][]).map((c) => (
                <option key={c} value={c}>
                  {COST_LABEL[c]}
                </option>
              ))}
            </select>
            {l.kind === "integration" && l.costOfWindow === "negligible" && (
              <span className="hint">is there a documented API?</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

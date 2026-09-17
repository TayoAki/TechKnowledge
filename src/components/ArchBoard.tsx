"use client";

/**
 * Architecture, with the MVP cut line drawn through it.
 *
 * Every component carries the requirement it satisfies. A component satisfying
 * nothing glows red — it either does not belong or reveals a requirement that
 * was never written down. Ghost boxes the agent offered render dashed until
 * accepted or rejected.
 */

import type { Component, PartialBrief } from "@/domain/brief";
import type { Ghost } from "@/hooks/useSession";

export function ArchBoard({
  brief,
  ghosts,
  showCutLine,
  onResolveGhost,
}: {
  brief: PartialBrief;
  ghosts: Ghost[];
  showCutLine: boolean;
  onResolveGhost: (id: string, outcome: "accepted" | "rejected", reason: string | null) => void;
}) {
  const reqs = brief.architecture?.requirements ?? [];
  const components = (brief.architecture?.components ?? []) as Component[];
  const reqIds = new Set(reqs.map((r) => r.id));
  const cut = new Set(brief.product?.mvpCutLine ?? []);

  const functional = reqs.filter((r) => r.kind === "functional");
  const nonFunctional = reqs.filter((r) => r.kind === "non_functional");

  const inside = components.filter((c) => cut.has(c.id));
  const outside = components.filter((c) => !cut.has(c.id));
  const pending = ghosts.filter((g) => g.outcome === "pending");

  const renderComponent = (c: Component, where: "inside" | "outside") => {
    const orphan = !reqIds.has(c.satisfiesRequirement);
    return (
      <div
        className="component"
        key={c.id}
        data-orphan={orphan}
        data-cut={showCutLine ? where : undefined}
      >
        <span className="layer">{c.layer}</span>
        <span style={{ flex: 1, minWidth: 0 }}>{c.name}</span>
        <span className="req" data-orphan={orphan} title={orphan ? "Satisfies nothing" : undefined}>
          {orphan ? "?" : c.satisfiesRequirement}
        </span>
      </div>
    );
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="badge" data-ok={functional.length <= 2 && functional.length > 0}>
          {functional.map((r) => r.id).join(" ") || "no F"}
        </span>
        <span className="badge" data-ok={nonFunctional.length <= 2}>
          {nonFunctional.map((r) => r.id).join(" ") || "no NF"}
        </span>
        {functional.length > 2 && (
          <span className="hint" style={{ color: "var(--danger)" }}>
            that is F{functional.length} — the scope is too wide, fix it in Product
          </span>
        )}
      </div>

      {components.length === 0 && (
        <p className="hint">
          Empty canvas. Place a component and you will be asked which requirement it
          satisfies.
        </p>
      )}

      <div className="components">
        {(showCutLine ? inside : components).map((c) =>
          renderComponent(c, "inside"),
        )}

        {showCutLine && <div className="cutline" />}

        {showCutLine && outside.map((c) => renderComponent(c, "outside"))}

        {pending.map((g) => (
          <div className="component" data-ghost="true" key={g.id}>
            <span className="layer">ghost</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              {g.label}
              <div className="hint">{g.detail}</div>
            </span>
            <button className="chip" onClick={() => onResolveGhost(g.id, "accepted", null)}>
              accept
            </button>
            <button
              className="chip"
              title="Rejecting with a reason scores above accepting silently"
              onClick={() =>
                onResolveGhost(g.id, "rejected", "not needed for this scope")
              }
            >
              reject
            </button>
          </div>
        ))}
      </div>

      {brief.architecture?.scale?.estimate && (
        <p className="hint" style={{ marginTop: 10 }}>
          {brief.architecture.scale.estimate}
        </p>
      )}
    </div>
  );
}

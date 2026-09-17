"use client";

/**
 * Hand-drawn borders over the fixed shapes.
 *
 * The board stays nine known shapes — that is what lets the agent read it and
 * what keeps every validator answerable ("which requirement does this box
 * satisfy?" has no meaning on an arbitrary canvas). This only changes how the
 * border is *stroked*, so the Excalidraw feel costs nothing structurally.
 *
 * The seed is derived from a stable key rather than random, so a given box
 * always draws the same wobble. Re-randomising on every render would make the
 * board jitter on every keystroke, which reads as broken rather than
 * hand-drawn.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs";

export type SketchTone = "neutral" | "accent" | "warn" | "danger" | "ghost";

const TONE_VAR: Record<SketchTone, string> = {
  neutral: "--line-strong",
  accent: "--accent",
  warn: "--warn",
  danger: "--danger",
  ghost: "--ghost",
};

/** Stable 32-bit hash so the same key yields the same wobble every time. */
function seedFrom(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}

function cssVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

export function Sketchy({
  sketchKey,
  tone = "neutral",
  dashed = false,
  fill = false,
  className,
  children,
}: {
  /** Stable identity for the wobble — a node id, not an index. */
  sketchKey: string;
  tone?: SketchTone;
  dashed?: boolean;
  fill?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const seed = useMemo(() => seedFrom(sketchKey), [sketchKey]);

  // Track the box the border has to wrap.
  useEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize((prev) =>
        prev && Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1
          ? prev
          : { w: r.width, h: r.height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const el = host.current;
    if (!svg || !el || !size || size.w < 4 || size.h < 4) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const stroke = cssVar(el, TONE_VAR[tone], "#888");
    const rc = rough.svg(svg, { options: { seed } });

    const inset = 1.5;
    const node = rc.rectangle(inset, inset, size.w - inset * 2, size.h - inset * 2, {
      stroke,
      strokeWidth: 1.4,
      roughness: 1.15,
      bowing: 1.1,
      seed,
      // A dashed sketch reads as provisional, which is what a ghost or an
      // unknown is. Solid reads as committed.
      strokeLineDash: dashed ? [7, 5] : undefined,
      fill: fill ? stroke : undefined,
      fillStyle: "hachure",
      hachureGap: 8,
      fillWeight: 0.6,
    });

    svg.appendChild(node);
  }, [size, tone, dashed, fill, seed]);

  return (
    <div ref={host} className={`sketchy${className ? ` ${className}` : ""}`}>
      <svg
        ref={svgRef}
        className="sketchy-svg"
        width={size?.w ?? 0}
        height={size?.h ?? 0}
        aria-hidden="true"
        focusable="false"
      />
      <div className="sketchy-content">{children}</div>
    </div>
  );
}

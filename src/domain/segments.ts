/**
 * Session segments and clock presets.
 *
 * The clock is ONE budget that spends down across five segments — not five
 * independent stopwatches. Per-segment timers that each reset would hide the
 * failure this is meant to teach: burning half the hour on requirements
 * gathering and never reaching the application layer.
 */

export const SEGMENTS = [
  "decomposition",
  "architecture",
  "product",
  "depth",
  "wrap",
] as const;
export type SegmentId = (typeof SEGMENTS)[number];

/** The three assessed areas. `depth` and `wrap` are session segments, not areas. */
export const AREAS = ["decomposition", "architecture", "product"] as const;
export type AreaId = (typeof AREAS)[number];

export const POSTURES = ["pair", "draft", "blank"] as const;
export type Posture = (typeof POSTURES)[number];

export const PRESETS = [
  "full_60",
  "short_45",
  "openai_40",
  "drill_20",
  "study",
] as const;
export type PresetId = (typeof PRESETS)[number];

export const SEGMENT_LABELS: Record<SegmentId, string> = {
  decomposition: "Problem Decomposition",
  architecture: "Architecture & Governance",
  product: "Product Definition",
  depth: "Depth",
  wrap: "Wrap",
};

export interface PresetSpec {
  id: PresetId;
  label: string;
  /** null for untimed study mode; budgets are then advisory. */
  totalMinutes: number | null;
  budgets: Record<SegmentId, number>;
  /**
   * Postures a preset permits. `drill_20` is too short to host a
   * challenge-and-respond cycle, so offering "pair" there would misrepresent
   * what the mode does.
   */
  allowedPostures: readonly Posture[];
  defaultPosture: Posture;
  note: string;
}

/**
 * Allocations derive from the round's per-step budgets: clarify 1-2, stakeholder
 * 5-8 and brainstorm 5 all land in `decomposition`, which is why it is the
 * largest block. `product` is cheap because the MVP is a cut line through an
 * architecture that already exists.
 */
export const PRESET_SPECS: Record<PresetId, PresetSpec> = {
  full_60: {
    id: "full_60",
    label: "Full round — 60 min",
    totalMinutes: 60,
    budgets: { decomposition: 18, architecture: 15, product: 10, depth: 15, wrap: 2 },
    allowedPostures: ["pair", "draft"],
    defaultPosture: "pair",
    note: "The real round.",
  },
  short_45: {
    id: "short_45",
    label: "Short round — 45 min",
    totalMinutes: 45,
    budgets: { decomposition: 14, architecture: 11, product: 8, depth: 10, wrap: 2 },
    allowedPostures: ["pair", "draft"],
    defaultPosture: "pair",
    note: "The common shorter variant.",
  },
  openai_40: {
    id: "openai_40",
    label: "Present-back — 40 min",
    totalMinutes: 40,
    budgets: { decomposition: 10, architecture: 12, product: 7, depth: 10, wrap: 1 },
    allowedPostures: ["pair", "draft"],
    defaultPosture: "pair",
    note: "10 scoping / 20 whiteboard / 10 present-back. Forces present-back mode.",
  },
  drill_20: {
    id: "drill_20",
    label: "Drill — 20 min",
    totalMinutes: 20,
    budgets: { decomposition: 6, architecture: 5, product: 3, depth: 5, wrap: 1 },
    allowedPostures: ["blank"],
    defaultPosture: "blank",
    note: "Fast pass to make the framework automatic. Runs blank, critiques at the buzzer.",
  },
  study: {
    id: "study",
    label: "Study — untimed",
    totalMinutes: null,
    budgets: { decomposition: 18, architecture: 15, product: 10, depth: 15, wrap: 2 },
    allowedPostures: ["pair", "draft", "blank"],
    defaultPosture: "pair",
    note: "No pressure. Budgets are advisory.",
  },
};

/** `openai_40` ends in a present-back rather than a deep dive. */
export function presetForcesPresentBack(preset: PresetId): boolean {
  return preset === "openai_40";
}

export function segmentIndex(segment: SegmentId): number {
  return SEGMENTS.indexOf(segment);
}

export function isArea(segment: SegmentId): segment is AreaId {
  return (AREAS as readonly string[]).includes(segment);
}

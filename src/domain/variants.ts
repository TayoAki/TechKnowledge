/**
 * Guess the Architecture — twenty questions over a space of candidate designs.
 *
 * The AI asks, the user answers in business terms, and each answer eliminates
 * architectures. Nodes present in EVERY surviving candidate are already
 * certain, so the board fills itself in progressively rather than only at the
 * end — that is what makes this feel like converging rather than form-filling.
 *
 * Questions are phrased in business language on purpose. "Is this a deadline
 * or a running feed?" is answerable by someone who does not know the
 * architecture; "batch or streaming?" is not. Translating the former into the
 * latter is the thing the round actually tests.
 */

export const NODES = [
  "ingest_incremental",
  "ingest_stream",
  "checkpointing",
  "raw_landing",
  "reconciliation_window",
  "conformed_showings",
  "capacity_history",
  "exogenous_calendar",
  "quality_gate_blocking",
  "quality_gate_warning",
  "schema_alert",
  "schema_rescue_column",
  "gold_utilization",
  "precomputed_read",
  "whatif_endpoint",
  "surface_dashboard",
  "surface_app",
  "surface_nl_ask",
  "governance_catalog",
] as const;
export type NodeId = (typeof NODES)[number];

/** Present in every candidate — the spine nobody's answers can remove. */
export const ALWAYS: NodeId[] = [
  "raw_landing",
  "conformed_showings",
  "capacity_history",
  "exogenous_calendar",
  "gold_utilization",
  "governance_catalog",
];

export interface ForkOption {
  id: string;
  /** How the user answers. Business language, no architecture jargon. */
  answer: string;
  adds: NodeId[];
  removes: NodeId[];
}

export interface Fork {
  id: string;
  /** Asked in business terms so it is answerable without knowing the design. */
  question: string;
  /** Revealed after answering — what the answer decided. */
  decides: string;
  options: ForkOption[];
}

export const FORKS: Fork[] = [
  {
    id: "cadence",
    question:
      "Is the decision made against a fixed deadline, or does someone watch it continuously?",
    decides: "Whether ingestion is incremental batch or a running stream.",
    options: [
      {
        id: "deadline",
        answer: "A deadline — it has to be right by a certain time each week",
        adds: ["ingest_incremental", "reconciliation_window"],
        removes: ["ingest_stream", "checkpointing"],
      },
      {
        id: "continuous",
        answer: "Continuously — people are watching it through the day",
        adds: ["ingest_stream", "checkpointing"],
        removes: ["ingest_incremental", "reconciliation_window"],
      },
    ],
  },
  {
    id: "correction",
    question:
      "If a number you already showed someone turns out to be wrong, should the old number change, or stay and get corrected openly?",
    decides: "Whether corrections restate history or overwrite it.",
    options: [
      {
        id: "restate",
        answer: "It should stay auditable — I need to explain what changed",
        adds: ["reconciliation_window"],
        removes: [],
      },
      {
        id: "overwrite",
        answer: "Just show the latest number",
        adds: [],
        removes: ["reconciliation_window"],
      },
    ],
  },
  {
    id: "severity",
    question:
      "If the data looks wrong an hour before the deadline, would you rather publish nothing or publish with a warning?",
    decides: "Whether quality gates block the run or flag it.",
    options: [
      {
        id: "block",
        answer: "Publish nothing — a wrong number is worse than no number",
        adds: ["quality_gate_blocking"],
        removes: [],
      },
      {
        id: "warn",
        answer: "Publish with a warning — the deadline matters more",
        adds: ["quality_gate_warning"],
        removes: ["quality_gate_blocking"],
      },
    ],
  },
  {
    id: "serving",
    question:
      "Do you need to see what happened, or to try a change and see what it would do?",
    decides: "Whether serving is a pre-computed read or a re-runnable endpoint.",
    options: [
      {
        id: "report",
        answer: "See what happened",
        adds: ["precomputed_read"],
        removes: ["whatif_endpoint"],
      },
      {
        id: "simulate",
        answer: "Try a change before committing to it",
        adds: ["whatif_endpoint"],
        removes: ["precomputed_read"],
      },
    ],
  },
  {
    id: "surface",
    question: "Where does the person making this decision want to do the work?",
    decides: "The shape of the layer where the decision actually gets made.",
    options: [
      {
        id: "dashboard",
        answer: "A screen they check",
        adds: ["surface_dashboard"],
        removes: ["surface_app", "surface_nl_ask"],
      },
      {
        id: "app",
        answer: "A tool they work inside",
        adds: ["surface_app"],
        removes: ["surface_dashboard", "surface_nl_ask"],
      },
      {
        id: "ask",
        answer: "Just asking a question in plain language",
        adds: ["surface_nl_ask"],
        removes: ["surface_dashboard", "surface_app"],
      },
    ],
  },
  {
    id: "schema",
    question:
      "When a system upstream quietly starts sending something new, would you rather everything stop so you find out straight away, or keep running and set the new thing aside?",
    decides: "The schema-change posture.",
    options: [
      {
        id: "loud",
        answer: "Stop — I want to know immediately",
        adds: ["schema_alert"],
        removes: ["schema_rescue_column"],
      },
      {
        id: "rescue",
        answer: "Keep running and set it aside for later",
        adds: ["schema_rescue_column"],
        removes: [],
      },
    ],
  },
];

export type Answers = Record<string, string>;

export interface Variant {
  id: string;
  choices: Answers;
  nodes: NodeId[];
}

/**
 * Combinations that cannot coexist. These are what make elimination cascade —
 * one answer can rule out candidates across several other forks at once.
 */
const INCOMPATIBLE: { when: Answers; because: string }[] = [
  {
    // An app whose purpose is trying a change needs something to re-run it.
    when: { serving: "report", surface: "app" },
    because:
      "A tool you work inside exists to try changes; a pre-computed read cannot answer them.",
  },
  {
    // Overwriting history cannot satisfy a demand for auditable corrections.
    when: { correction: "overwrite", severity: "block" },
    because:
      "Blocking on bad data protects a number you then overwrite silently — the two policies contradict.",
  },
  {
    // A running feed has nothing to reconcile in a nightly window.
    when: { cadence: "continuous", correction: "restate" },
    because:
      "Continuous ingestion has no batch window to restate; corrections have to stream too.",
  },
];

function violates(choices: Answers): string | null {
  for (const rule of INCOMPATIBLE) {
    const hits = Object.entries(rule.when).every(([k, v]) => choices[k] === v);
    if (hits) return rule.because;
  }
  return null;
}

function nodesFor(choices: Answers): NodeId[] {
  const set = new Set<NodeId>(ALWAYS);
  // Additions first, then removals, so a later fork's removal wins.
  for (const fork of FORKS) {
    const opt = fork.options.find((o) => o.id === choices[fork.id]);
    if (opt) for (const n of opt.adds) set.add(n);
  }
  for (const fork of FORKS) {
    const opt = fork.options.find((o) => o.id === choices[fork.id]);
    if (opt) for (const n of opt.removes) set.delete(n);
  }
  return [...set].sort();
}

/** Every internally consistent architecture. */
export function enumerateVariants(): Variant[] {
  let partial: Answers[] = [{}];
  for (const fork of FORKS) {
    const next: Answers[] = [];
    for (const base of partial) {
      for (const opt of fork.options) {
        const choices = { ...base, [fork.id]: opt.id };
        if (violates(choices)) continue;
        next.push(choices);
      }
    }
    partial = next;
  }
  return partial.map((choices) => ({
    id: FORKS.map((f) => choices[f.id]).join("/"),
    choices,
    nodes: nodesFor(choices),
  }));
}

export function remaining(variants: Variant[], answers: Answers): Variant[] {
  return variants.filter((v) =>
    Object.entries(answers).every(([fork, opt]) => v.choices[fork] === opt),
  );
}

/**
 * The next question, chosen by information gain: the fork whose answers split
 * the surviving candidates most evenly. Asking the most balanced question
 * first is what gets twenty questions down to about seven.
 */
export function nextQuestion(variants: Variant[], answers: Answers): Fork | null {
  const alive = remaining(variants, answers);
  if (alive.length <= 1) return null;

  let best: { fork: Fork; score: number } | null = null;

  for (const fork of FORKS) {
    if (answers[fork.id]) continue;

    const buckets = fork.options.map(
      (o) => alive.filter((v) => v.choices[fork.id] === o.id).length,
    );
    // A question every survivor answers the same way eliminates nothing.
    if (buckets.filter((n) => n > 0).length < 2) continue;

    // Entropy of the split; higher is a more balanced, more informative cut.
    const total = buckets.reduce((a, b) => a + b, 0);
    const score = -buckets
      .filter((n) => n > 0)
      .reduce((acc, n) => acc + (n / total) * Math.log2(n / total), 0);

    if (!best || score > best.score) best = { fork, score };
  }

  return best?.fork ?? null;
}

/** Nodes in EVERY surviving candidate — already decided, so draw them solid. */
export function certainNodes(variants: Variant[], answers: Answers): NodeId[] {
  const alive = remaining(variants, answers);
  if (alive.length === 0) return [];
  return NODES.filter((n) => alive.every((v) => v.nodes.includes(n)));
}

/** Nodes in NO surviving candidate — ruled out, so strike them through. */
export function excludedNodes(variants: Variant[], answers: Answers): NodeId[] {
  const alive = remaining(variants, answers);
  if (alive.length === 0) return [];
  return NODES.filter((n) => alive.every((v) => !v.nodes.includes(n)));
}

/** Still in play: neither certain nor excluded. Draw these ghosted. */
export function undecidedNodes(variants: Variant[], answers: Answers): NodeId[] {
  const certain = new Set(certainNodes(variants, answers));
  const excluded = new Set(excludedNodes(variants, answers));
  return NODES.filter((n) => !certain.has(n) && !excluded.has(n));
}

export interface GuessProgress {
  total: number;
  alive: number;
  asked: number;
  certain: NodeId[];
  excluded: NodeId[];
  undecided: NodeId[];
  converged: Variant | null;
  /** Upper bound on further questions if each is maximally informative. */
  questionsLeftAtBest: number;
}

export function progress(variants: Variant[], answers: Answers): GuessProgress {
  const alive = remaining(variants, answers);
  return {
    total: variants.length,
    alive: alive.length,
    asked: Object.keys(answers).length,
    certain: certainNodes(variants, answers),
    excluded: excludedNodes(variants, answers),
    undecided: undecidedNodes(variants, answers),
    converged: alive.length === 1 ? alive[0] : null,
    questionsLeftAtBest: alive.length <= 1 ? 0 : Math.ceil(Math.log2(alive.length)),
  };
}

export const NODE_LABELS: Record<NodeId, string> = {
  ingest_incremental: "incremental file ingest",
  ingest_stream: "streaming ingest",
  checkpointing: "checkpoint + watermark",
  raw_landing: "raw landing (immutable)",
  reconciliation_window: "late-arrival reconciliation",
  conformed_showings: "conformed showings",
  capacity_history: "capacity with history",
  exogenous_calendar: "calendar + events",
  quality_gate_blocking: "blocking quality gate",
  quality_gate_warning: "warning quality gate",
  schema_alert: "schema-change alert",
  schema_rescue_column: "rescued-data column",
  gold_utilization: "utilization by daypart",
  precomputed_read: "pre-computed read",
  whatif_endpoint: "what-if endpoint",
  surface_dashboard: "dashboard",
  surface_app: "app",
  surface_nl_ask: "natural-language ask",
  governance_catalog: "catalog + lineage",
};

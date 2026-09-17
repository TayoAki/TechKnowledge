/**
 * The target architecture catalogue.
 *
 * Each entry is a distinct end-state SHAPE an FDE would design on a lakehouse —
 * not a relabelling of the same pipeline. Guess mode picks one and works
 * backwards from its anchor; pair mode uses it as the target to chain against.
 *
 * Service names carry `verify: true` where the current Databricks product
 * label could not be confirmed (this was authored where docs.databricks.com is
 * unreachable). The CAPABILITY is what the design depends on and is stable;
 * the label moves — Delta Live Tables became Lakeflow Declarative Pipelines.
 * Run scripts/fetch-databricks-docs.mjs to resolve them mechanically.
 */

export type Track = "data_engineering" | "full_stack";

export interface Service {
  /** Capability first — this is what the architecture actually needs. */
  capability: string;
  /** Databricks product label, as best known. */
  product: string;
  /** True when the label needs confirming against the docs. */
  verify: boolean;
}

export interface TargetArchitecture {
  id: string;
  name: string;
  problemClass: string;
  /** The business promise the whole shape chains backwards from. */
  anchor: string;
  /** What makes this shape distinct from the others. */
  signature: string;
  services: Service[];
  /** The trade-offs that actually bite here, by fork id where one applies. */
  dominantForks: string[];
  /** The attractive wrong turn — what a plausible-sounding answer breaks. */
  landmine: string;
  trackEmphasis: Track[];
  difficulty: 1 | 2 | 3 | 4 | 5;
}

const DELTA: Service = {
  capability: "ACID table format with time travel",
  product: "Delta Lake",
  verify: false,
};
const CATALOG: Service = {
  capability: "governance, lineage and access control across assets",
  product: "Unity Catalog",
  verify: false,
};
const WAREHOUSE: Service = {
  capability: "SQL endpoint serving interactive queries",
  product: "Databricks SQL warehouse",
  verify: true,
};
const AUTOLOADER: Service = {
  capability: "incremental file discovery with durable state",
  product: "Auto Loader (cloudFiles)",
  verify: true,
};
const DECLARATIVE: Service = {
  capability: "declarative pipeline with dependency-derived execution graph",
  product: "Lakeflow Declarative Pipelines (formerly Delta Live Tables)",
  verify: true,
};
const EXPECTATIONS: Service = {
  capability: "row-level quality constraints with warn / drop / fail severity",
  product: "pipeline expectations",
  verify: true,
};
const STREAMING: Service = {
  capability: "stateful stream processing with checkpoints and watermarks",
  product: "Spark Structured Streaming",
  verify: false,
};
const JOBS: Service = {
  capability: "orchestrated task graphs on a schedule or trigger",
  product: "Databricks Jobs / Workflows",
  verify: true,
};
const APPS: Service = {
  capability: "hosted application serving a custom interface",
  product: "Databricks Apps",
  verify: true,
};
const MONITORING: Service = {
  capability: "drift and freshness monitoring over served tables",
  product: "Lakehouse Monitoring",
  verify: true,
};
const MODEL_SERVING: Service = {
  capability: "low-latency model inference behind an endpoint",
  product: "Mosaic AI Model Serving",
  verify: true,
};
const MLFLOW: Service = {
  capability: "experiment tracking and a model registry",
  product: "MLflow on Unity Catalog",
  verify: true,
};
const CDC: Service = {
  capability: "apply inserts, updates and deletes from a change feed",
  product: "APPLY CHANGES INTO / AUTO CDC",
  verify: true,
};
const VOLUMES: Service = {
  capability: "governed storage for non-tabular files",
  product: "Unity Catalog Volumes",
  verify: true,
};
const VECTOR: Service = {
  capability: "semantic retrieval over embedded content",
  product: "Mosaic AI Vector Search",
  verify: true,
};
const NL_ASK: Service = {
  capability: "natural-language question answering over governed tables",
  product: "AI/BI Genie",
  verify: true,
};
const SHARING: Service = {
  capability: "share live tables across organisational boundaries",
  product: "Delta Sharing",
  verify: false,
};
const CONNECT: Service = {
  capability: "managed connectors for SaaS and database sources",
  product: "Lakeflow Connect",
  verify: true,
};

export const ARCHITECTURES: TargetArchitecture[] = [
  {
    id: "deadline_decision",
    name: "Deadline-bound decision support",
    problemClass: "A person commits a recurring decision against a clock",
    anchor:
      "The decision owner commits on a fixed cadence and needs to test a change before committing it.",
    signature:
      "Batch medallion feeding a re-runnable serving path. The counterfactual — not the report — is what forces the endpoint.",
    services: [AUTOLOADER, DELTA, DECLARATIVE, EXPECTATIONS, WAREHOUSE, APPS, CATALOG],
    dominantForks: ["cadence", "serving", "surface"],
    landmine:
      "Reaching for streaming because 'real time' sounds stronger, when nothing downstream consumes sub-daily freshness.",
    trackEmphasis: ["data_engineering", "full_stack"],
    difficulty: 2,
  },
  {
    id: "telemetry_alerting",
    name: "Operational alerting on telemetry",
    problemClass: "Something must be noticed and acted on within minutes",
    anchor:
      "An operator is paged when a monitored condition holds, with few enough false alarms that they keep trusting it.",
    signature:
      "Stateful streaming with windowing, and alert suppression as a first-class component. The hard part is precision, not throughput.",
    services: [STREAMING, DELTA, EXPECTATIONS, MONITORING, CATALOG],
    dominantForks: ["cadence", "severity"],
    landmine:
      "Designing for detection and ignoring alert fatigue — an accurate alert nobody reads has failed.",
    trackEmphasis: ["data_engineering"],
    difficulty: 3,
  },
  {
    id: "multi_source_consolidation",
    name: "Many-source consolidation",
    problemClass: "Dozens to hundreds of disparate sources, no shared keys",
    anchor:
      "One trustworthy view of an entity that a downstream team will actually build on.",
    signature:
      "Per-source-type ingestion with a conformance layer that owns matching and survivorship rules. Federated ownership with central standards, because a central team becomes the bottleneck.",
    services: [CONNECT, AUTOLOADER, DELTA, DECLARATIVE, EXPECTATIONS, CATALOG, SHARING],
    dominantForks: ["schema", "severity"],
    landmine:
      "Treating it as N ingestion problems rather than one identity problem — the connectors are the easy half.",
    trackEmphasis: ["data_engineering"],
    difficulty: 4,
  },
  {
    id: "cdc_replication",
    name: "Operational replication via change feed",
    problemClass: "Analytics must reflect an operational system without touching it",
    anchor:
      "Analysts query current operational state without adding load to the system of record.",
    signature:
      "Change feed applied into slowly-changing dimensions. Ordering, late arrivals and deletes are the whole design.",
    services: [CONNECT, CDC, DELTA, DECLARATIVE, WAREHOUSE, CATALOG],
    dominantForks: ["correction", "schema"],
    landmine:
      "Ignoring deletes and out-of-order events, which silently resurrect rows that were removed upstream.",
    trackEmphasis: ["data_engineering"],
    difficulty: 4,
  },
  {
    id: "prediction_in_the_loop",
    name: "Prediction feeding a decision",
    problemClass: "A model output changes what someone or something does",
    anchor:
      "The prediction reaches the decision point early enough to change it, and its realised accuracy is measured afterwards.",
    signature:
      "Feature path shared between training and inference, plus a feedback loop comparing predicted against realised. The loop is what most designs omit.",
    services: [DELTA, MLFLOW, MODEL_SERVING, MONITORING, JOBS, CATALOG],
    dominantForks: ["serving", "cadence"],
    landmine:
      "Shipping the model with no path for outcomes to return — without it accuracy is unknowable and the model silently rots.",
    trackEmphasis: ["data_engineering", "full_stack"],
    difficulty: 4,
  },
  {
    id: "document_extraction",
    name: "Unstructured extraction and retrieval",
    problemClass: "Answers live in documents, not tables",
    anchor:
      "Someone asks a question in plain language and gets an answer they can trace to a source document.",
    signature:
      "Governed file storage, extraction into structured tables, and retrieval. Citation and access control are requirements, not features.",
    services: [VOLUMES, DELTA, VECTOR, MODEL_SERVING, APPS, CATALOG],
    dominantForks: ["surface", "schema"],
    landmine:
      "Building retrieval with no citation path or per-document access control, which makes it unusable for anything sensitive.",
    trackEmphasis: ["full_stack", "data_engineering"],
    difficulty: 4,
  },
  {
    id: "activation_writeback",
    name: "Activation back into the workflow",
    problemClass: "The insight has to land where the work already happens",
    anchor:
      "The curated result appears inside the tool the operator already uses, without them learning a new one.",
    signature:
      "Gold layer pushed outward to an operational system, with idempotent writes and reconciliation. Adoption is the hard requirement.",
    services: [DELTA, JOBS, WAREHOUSE, CATALOG],
    dominantForks: ["serving", "surface", "correction"],
    landmine:
      "Building a new dashboard when the operator's workflow lives elsewhere — a second tool nobody opens.",
    trackEmphasis: ["full_stack"],
    difficulty: 3,
  },
  {
    id: "auditable_reporting",
    name: "Auditable point-in-time reporting",
    problemClass: "A filing or report must be reproducible on demand",
    anchor:
      "Any published figure can be reproduced exactly, months later, with its inputs and lineage.",
    signature:
      "Restatement over update-in-place, immutable snapshots, and lineage as a deliverable rather than a nicety.",
    services: [DELTA, DECLARATIVE, EXPECTATIONS, CATALOG, WAREHOUSE],
    dominantForks: ["correction", "severity"],
    landmine:
      "Mutable gold tables — the moment a number changes underneath a published report, the audit trail is gone.",
    trackEmphasis: ["data_engineering"],
    difficulty: 3,
  },
  {
    id: "platform_chargeback",
    name: "Usage and cost attribution",
    problemClass: "Spend must be attributed to the team that caused it",
    anchor: "A budget owner sees their own cost and can act on it this month.",
    signature:
      "Platform telemetry joined to an ownership dimension nobody maintains. The mapping table is the real problem.",
    services: [DELTA, JOBS, WAREHOUSE, NL_ASK, CATALOG],
    dominantForks: ["surface", "cadence"],
    landmine:
      "Assuming a clean team-to-resource mapping exists; unattributed spend is usually the largest bucket.",
    trackEmphasis: ["data_engineering", "full_stack"],
    difficulty: 2,
  },
  {
    id: "migration_dual_run",
    name: "Migration with dual-run parity",
    problemClass: "A legacy system must be replaced without a trust gap",
    anchor:
      "Stakeholders accept the new numbers because parity with the old system was demonstrated, not asserted.",
    signature:
      "Both systems running in parallel with an automated reconciliation report, and an explicit cutover criterion.",
    services: [AUTOLOADER, DELTA, DECLARATIVE, EXPECTATIONS, JOBS, WAREHOUSE, CATALOG],
    dominantForks: ["correction", "severity", "schema"],
    landmine:
      "Planning the build with no parity evidence and no cutover criterion, so the legacy system never gets switched off.",
    trackEmphasis: ["data_engineering"],
    difficulty: 5,
  },
];

export function architectureById(id: string): TargetArchitecture | undefined {
  return ARCHITECTURES.find((a) => a.id === id);
}

export function byTrack(track: Track): TargetArchitecture[] {
  return ARCHITECTURES.filter((a) => a.trackEmphasis.includes(track));
}

export function byDifficulty(max: number): TargetArchitecture[] {
  return ARCHITECTURES.filter((a) => a.difficulty <= max);
}

/** Every distinct service across the catalogue, deduplicated by product. */
export function allServices(): Service[] {
  const seen = new Map<string, Service>();
  for (const a of ARCHITECTURES) {
    for (const s of a.services) if (!seen.has(s.product)) seen.set(s.product, s);
  }
  return [...seen.values()];
}

/** Product labels needing confirmation against the docs. */
export function servicesToVerify(): Service[] {
  return allServices().filter((s) => s.verify);
}

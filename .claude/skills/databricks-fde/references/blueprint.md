# The target blueprint

The end-state architecture you hold, chain backwards from, and mutate as trade-offs land.

Claims marked **`[verify]`** name a Databricks product whose current name should be confirmed
against the docs before asserting it. The *capability* is stable; the label moves.

## Node lifecycle

Every node sits in exactly one state, and the whiteboard renders each differently:

| State | Meaning | On the board |
|---|---|---|
| `target` | The end state needs it; the candidate has not reached it | ghosted outline |
| `confirmed` | Placed and justified against a requirement | solid |
| `displaced` | A trade-off removed it | struck through, kept visible |
| `deferred` | Real, but outside the first slice | below the cut line |

**Displaced nodes are never deleted.** The road not taken is the teaching material, and a
candidate who can say what their choice cost is demonstrating the thing being scored.

## The anchor

Chain backwards from the business promise, never forwards from the data:

> **The GM commits next week's grid on Thursday for a Friday publish, and needs to know what a
> proposed change does to utilization before committing it.**

Two properties fall straight out of that sentence and constrain everything upstream:

- **A deadline, not a latency SLA.** Thursday is a wall-clock commitment. This is the single
  most common misread in this scenario — candidates reach for streaming because "real time"
  sounds stronger, when nothing downstream consumes sub-daily freshness.
- **Counterfactual, not reporting.** "What would this change do" needs the measurement path to
  be re-runnable over a hypothetical grid, not just over history. That one word reshapes the
  serving layer.

## The target graph

Backwards from the anchor. Each node exists because the node to its right cannot work without it.

```
  sources        ingest         bronze      silver        gold         serve        act
 ─────────      ────────       ────────    ────────     ────────     ────────    ────────
  POS /     →   incremental  →  raw     →  conformed →  utilization → warehouse → GM's
  ticketing     file ingest     landing    showings     by daypart    endpoint    decision
                                                              │           │        surface
  screen /  →   catalog      →  ────────→  capacity   →  ─────┤           │
  seating       reference                  with history       │      what-if      │
                                                              │      re-run       │
  calendar  →   slow feed    →  ────────→  exogenous  →  ─────┘                   │
  + events                                 dimension                              │
                                                                                  │
  ── governance and quality span every column ────────────────────────────────────┘
     catalog + lineage + access · expectations at each boundary · monitoring
```

### Why each node exists

| Node | Exists because | Databricks |
|---|---|---|
| Incremental file ingest | POS drops files; re-reading everything nightly does not scale and loses arrival order | Auto Loader / `cloudFiles` **`[verify]`** |
| Raw landing | Refunds arrive *after* the showing, so history must be replayable rather than overwritten | Delta table, append-only |
| Conformed showings | The grain everything else joins on: one row per showing | Delta, declarative pipeline **`[verify]`** |
| Capacity with history | The denominator of every utilization number, and it changes on refurbishment | Delta dimension with validity periods |
| Exogenous dimension | Holidays, term dates, local events dominate the highest-value days; without it a holiday spike is attributed to the showtime | Delta, slow-changing |
| Utilization by daypart | The GM's actual unit of decision | Delta gold table |
| Warehouse endpoint | Something has to answer a query from an app or a dashboard | SQL warehouse **`[verify]`** |
| What-if re-run | The anchor says *counterfactual* — the same aggregation over a proposed grid | Parameterized job or serving endpoint |
| Decision surface | Where the GM acts. **Non-negotiable** — a blueprint ending at a gold table fails the round | Dashboard, app, or Genie-style ask **`[verify]`** |
| Governance | Multi-site access, lineage for "why did this number change" | Unity Catalog **`[verify]`** |
| Quality gates | A wrong denominator produces confident nonsense | Pipeline expectations **`[verify]`** |

## The forks

Each fork is a real trade-off that **changes the graph**. Present both sides, name the axes,
and apply the mutation out loud. A fork whose options produce the same graph is not a fork.

### F1 · Batch or streaming ingest
- **Hourly/nightly batch** → removes checkpoint and watermark nodes; **adds** late-arrival
  reconciliation. Matches the Thursday deadline.
- **Continuous streaming** → adds checkpointing, watermarking, and a restart story; **displaces**
  the nightly reconciliation window.
- *Axes:* cost, operational surface, freshness nobody downstream consumes.
- **Recommended:** batch. A candidate who reaches for streaming should be asked who reads it
  before Thursday.

### F2 · Restate or update in place
- **Restate the affected partition** → adds a reprocessing window; preserves reproducibility, so
  a number already shown to the exec never silently changes.
- **Update in place** → simpler; **displaces** reproducibility, and the non-functional
  requirement that numbers be auditable dies with it.
- *Axes:* trust, storage, complexity.
- **Recommended:** restate. This is the fork that most often exposes whether they understood
  their own non-functional requirement.

### F3 · Quality gate severity
- **Block the run** when capacity is null or non-positive → the denominator is non-negotiable.
- **Warn and publish with a flag** → keeps the deadline; risks confident nonsense.
- *Axes:* correctness, deadline pressure.
- **Recommended:** blocking for the denominator, warning for everything else. A uniform
  severity policy is the weak answer — severity should follow blast radius.

### F4 · Serving shape
- **Pre-computed gold table read by a dashboard** → adds nothing; **displaces** the what-if node,
  which breaks the anchor.
- **Parameterized re-run behind an endpoint** → satisfies the counterfactual; adds an API surface
  and an auth story.
- *Axes:* latency, cost per query, whether the anchor is actually met.
- **Recommended:** the endpoint, precisely because F4's first option quietly fails the promise.
  This is the best fork for teaching backwards-chaining — the local choice looks cheaper and
  breaks the end state.

### F5 · Decision surface
- **Dashboard** → fastest, no app to run; weakest fit for "test a change before committing".
- **Databricks App** **`[verify]`** → owns the what-if interaction; adds a frontend/backend
  boundary and a deployment story.
- **Natural-language ask over the gold layer** **`[verify]`** → lowest training cost; weakest
  determinism for a committing decision.
- *Axes:* adoption, determinism, build cost.
- **Recommended:** depends on the spike. Full-stack candidates should take the app and own the
  boundary; data-engineering candidates may take the dashboard and defer the app, provided they
  say so deliberately.

### F6 · Schema-change policy
- **Fail loudly on an unknown value** → adds an alert path; protects every number downstream.
- **Rescue into a side column and carry on** **`[verify]`** → keeps the deadline; risks a
  quarter of quietly understated revenue.
- *Axes:* deadline, silent-wrongness risk.
- **Recommended:** fail loudly for anything in a denominator or a revenue split; rescue for
  genuinely additive fields.

## Auditing against the target

At each stage boundary, produce three lists — and derive the next question from the second:

1. **Confirmed** — placed and justified.
2. **Unreached** — the end state needs it and they have not gone there. *Your question queue.*
3. **Displaced** — removed by a choice, with the cost they accepted.

Never state a node from list 2 above the candidate's guidance level. At Level 0 you may only
probe toward it; at Level 2 you may name it; at Level 3 you hand over the list.

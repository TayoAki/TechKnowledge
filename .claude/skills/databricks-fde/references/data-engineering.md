# Data Engineering spike

The four assessed topics, as they land on a lakehouse. Claims marked **`[verify]`** name a
product whose current label should be confirmed in the docs; the capability is stable.

Depth here means tracing a mechanism, not naming a service. "Use Auto Loader" is not depth.
"New files are discovered incrementally rather than by listing the whole prefix, and the
discovery state survives restart, which is why a re-run doesn't double-count" is depth.

## Pipelines

The decision is **declarative or imperative**, and it should follow from the transformation
shape rather than taste.

- **Declarative pipeline** **`[verify]`** — you define the tables and their dependencies, the
  platform derives the execution graph, and quality constraints attach to the table definition.
  Fits the medallion shape directly and makes lineage fall out for free.
- **Imperative job** — explicit tasks and ordering. Fits odd control flow, external calls,
  and anything that is not really a table transformation.

For the theater scenario the medallion path is declarative; the what-if re-run is a
parameterized job, because it is a function call over a hypothetical grid rather than a
standing table.

**Probes worth answering well:**

- *What happens on re-run?* The honest answer names idempotency: either the target is fully
  recomputed for the affected window, or writes are keyed so a replay converges. "It just
  re-runs" is where candidates lose this.
- *Where does the graph come from?* Declaratively, from table dependencies — which is also why
  adding a table mid-pipeline does not require rewiring orchestration.
- *Batch or streaming table?* Streaming tables process each input row once and keep state;
  materialized views recompute against current inputs. Choosing streaming for a nightly
  deadline buys state management nobody asked for. **`[verify]`**

## Data quality

Quality is a **gate with a severity and an owner**, not a dashboard you look at afterwards.

Pipeline expectations come in three strengths, and the whole skill is matching strength to
blast radius **`[verify]`**:

| Strength | Behaviour | Use when |
|---|---|---|
| Warn | Record the violation, keep the row | A field nothing critical depends on |
| Drop | Record it, drop the row | A row that would corrupt an aggregate but whose loss is tolerable |
| Fail | Stop the pipeline | The value is in a denominator or a revenue split |

**The theater-scenario mapping**, and the reason severity cannot be uniform:

- `capacity > 0` and non-null → **fail**. It is the denominator of every utilization number.
  Publishing with a broken denominator produces confident nonsense, which is worse than
  publishing nothing.
- Showings per screen per day within plausible bounds → **warn** and flag the partition.
- Refund rate inside its historical band → **warn**. It is a signal about the feed, not a
  reason to block a deadline.
- Calendar coverage 90 days forward → **warn**, alerting the data owner rather than the GM.

**Every check needs a named owner.** A check with no owner never runs, and a candidate who
lists checks without owners has described a wish rather than a control.

Beyond gates: drift and freshness monitoring on the served tables **`[verify]`** answers the
question the GM will actually ask — *"why did last week's number change?"* — which is a lineage
and restatement question, not a quality-check question.

## Ingestion patterns

Four patterns, and the choice is driven by arrival shape and ownership:

| Pattern | Fits | Cost |
|---|---|---|
| Incremental file ingest **`[verify]`** | Files landing in object storage, unknown arrival order | Discovery state to manage |
| Bulk load command **`[verify]`** | Idempotent re-loads of a known file set | Manual orchestration |
| Managed connector **`[verify]`** | A supported SaaS or database source | Less control over the read |
| Change feed / CDC apply **`[verify]`** | Upstream emits inserts, updates, deletes | Ordering and late-arrival handling |

For the theater chain: POS drops files, so incremental file ingest. **But the interesting part
is refunds** — they arrive *after* the showing, which makes this a late-arriving-fact problem
dressed as an ingestion problem. A candidate who only picks a connector has answered the easy
half.

**Probes:**

- *How are files discovered?* Incremental discovery with durable state, not re-listing the
  prefix. At scale, listing is the thing that breaks first.
- *What if a file is delivered twice?* Either discovery dedupes by path, or the target write is
  keyed. Say which.
- *What if a file arrives for a closed period?* The restatement window from fork F2 — and if
  they chose update-in-place there, this is where that choice comes due.

## Schema evolution

The most-skipped topic, and the one that distinguishes people who have operated a pipeline
from people who have drawn one.

Three mechanisms, each with a different failure posture:

- **Enforcement by default.** A write whose schema does not match is rejected. This is the
  desirable default and candidates often assume the opposite.
- **Explicit merge.** New columns are added when the write opts in. Additive only — a type
  change is still a break.
- **Rescue** **`[verify]`.** Data that does not fit the expected schema is captured into a side
  column instead of failing the batch. Keeps the deadline; hides the problem unless someone
  monitors it.

**The judgement — and this is fork F6 — is which posture per field:**

- A new **price class** appears mid-promo-cycle. Rescued or bucketed into "other", revenue per
  screen-hour is quietly understated and nobody finds out for a quarter. This must **fail
  loudly**.
- A screen is converted to recliners and **capacity drops 40%**. If capacity is a plain column
  rather than a dimension with validity periods, every historical comparison silently breaks the
  day a site refurbishes. This is a modelling failure that a schema mechanism cannot rescue.
- POS adds an **additive descriptive field**. Merge it and move on.

**Probes:**

- *A new enum value appears. What happens?* The strong answer distinguishes additive from
  semantic: additive fields merge, values feeding a denominator or a split fail loudly.
- *How do you find out it happened?* Rescued data with no alert is a silent failure with extra
  steps.
- *How do you backfill after fixing it?* Restatement window, again — the same mechanism fork F2
  established, which is the point of chaining backwards.

## What depth looks like here

Pick one of the four and trace it end to end: the mechanism, its state, its failure, how you
detect the failure, and how the system degrades. Four shallow topics score below one traced
mechanism, and this round is explicitly looking for a spike.

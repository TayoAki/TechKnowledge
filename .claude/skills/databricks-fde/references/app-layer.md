# Full Stack spike

The application layer over a lakehouse: the four assessed topics, and the reason this track
exists at all. **A design that stops at a gold table has not reached the decision.** The GM
does not query a table; they commit a grid.

Claims marked **`[verify]`** name a product whose current label should be confirmed in the docs.

## Application architecture

Three shapes for the decision surface, from fork F5:

| Shape | Owns | Weak at |
|---|---|---|
| Dashboard | Fast, no app to operate | Testing a change before committing — it reports, it does not simulate |
| Hosted app **`[verify]`** | The what-if interaction, custom layout, write-back | A frontend/backend boundary and a deploy story to own |
| Natural-language ask over the gold layer **`[verify]`** | Lowest training cost | Determinism, which a committing decision needs |

For the anchor — *test a proposed grid before publishing* — the dashboard quietly fails. That is
the teaching moment in this track: the cheapest local choice breaks the end-state promise, and
backwards-chaining is what catches it.

**Probes:**

- *Where does the app run, and against what compute?* An app process serving requests against a
  SQL warehouse is the common shape **`[verify]`**; the interesting part is who holds the
  connection and what happens when the warehouse is cold.
- *Cold start.* A serverless warehouse that has scaled to zero adds seconds to the first query.
  On a Thursday deadline that is acceptable; inside an interactive what-if loop it is not.
  Either keep it warm or make the interaction tolerate it — say which.
- *Where does state live?* A proposed grid the GM is iterating on is application state, not
  warehouse state, until they commit. Candidates who write every keystroke to a Delta table
  have not thought about it.

## UX

The most-skipped topic in the whole round, and the cheapest to do well because it is one
question: **what decision, by whom, at what moment?**

For this scenario: the regional programmer, Thursday afternoon, committing next week's grid.
Everything follows from that.

- **The unit of interaction is a proposed change, not a report.** "Move the 14:00 screening of
  title X to 15:30" — and the answer that matters is the delta, not the absolute.
- **Show the guardrail, not just the objective.** If utilization rises and admissions fall, the
  UI has to say so, or the product is actively harmful. This is where the guardrail from Stage 1
  becomes a screen element rather than a slide.
- **Failure has to be visible.** If the feed is stale or a quality gate flagged the partition,
  the number carries a confidence marker. A silently stale number in a committing decision is
  the worst outcome in this design.
- **Adoption beats elegance.** If the programmer builds the grid in a spreadsheet today, the
  first version that wins is the one that reads their spreadsheet, not the one that replaces it.

**Probe:** *What does the screen look like on the worst day?* Strong candidates describe the
degraded state — stale feed, flagged partition, no recommendation — because that is when trust
is won or lost.

## API design

The boundary between the decision surface and the lakehouse.

- **Shape.** One endpoint taking a proposed grid and returning predicted utilization per
  affected showing, plus the guardrail metrics. Returning only the objective is the mistake —
  the caller cannot enforce what it cannot see.
- **Synchronous or queued.** A what-if over a few thousand rows is synchronous. If the re-run
  grows to a full-chain optimization, it becomes a submitted job with a status poll, and that
  changes the UX from a loop into a wait. Name the threshold where it flips.
- **Idempotency.** The same proposed grid submitted twice must not produce two committed
  schedules. A client-supplied key on the commit call, not the preview call.
- **Statement-execution versus a custom service** **`[verify]`.** Querying the warehouse directly
  over HTTP removes a hop and a deployment; a service in front buys validation, constraint
  checking, and an auth boundary. For a *committing* action, put the constraint check somewhere
  the client cannot skip.
- **Errors that mean something.** "Violates distributor minimum for title X" is actionable.
  A 500 is not.

## Frontend/backend interaction

- **Identity.** The app acts either as itself or on behalf of the signed-in user
  **`[verify]`**. It matters: if the programmer should only see their region, on-behalf-of makes
  the catalog enforce it, while a service identity means the app enforces it — and an app that
  enforces its own row filtering will eventually get it wrong.
- **Authorization lives in the catalog.** Site managers see their site, regional programmers
  their region **`[verify]`**. Pushing this down beats re-implementing it per surface, and it is
  the answer to "what happens when someone builds a second dashboard".
- **Payload size.** Return the affected showings, not the grid. A full week across a region is
  bigger than it sounds and the interaction is per-change.
- **Optimistic or confirmed.** A preview can be optimistic; a commit cannot. Show the commit
  as pending until the constraint check returns, because a schedule that appears committed and
  is not is the failure the GM will remember.
- **No PII.** This design needs aggregate ticket counts, not customer records — worth saying out
  loud, because it removes a compliance surface rather than mitigating one.

## What depth looks like here

Trace one interaction end to end: the programmer drags a showtime, what the frontend sends,
what validates it, what the warehouse runs, what comes back, what renders, and what happens when
any hop fails or the warehouse is cold. One traced round-trip beats four named services.

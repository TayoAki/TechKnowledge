# Worked example — the quality bar

The brief the app should produce from a real vague ask. This is the reference output:
generated briefs are graded against this level of specificity, and the invariants in
[`BRIEF_SPEC.md`](BRIEF_SPEC.md) exist to enforce it.

> **Raw ask:** "We want to analyze seat utilization and recommend better showtimes."

---

## 0 · Restatement, and what I'm assuming

They want to change the showtime schedule so auditoriums run fuller. Note that one
sentence contains **two different deliverables**: a *measurement* system (what is
utilisation today, honestly) and a *decision* system (what should the schedule be). Most
of the risk is in the first one, and most of the excitement is in the second.

Assumed, editable, and worth confirming out loud: a regional exhibitor, 10–40 sites;
scheduling is done weekly by a human; a POS/ticketing system of record exists; distributor
contracts constrain what can be scheduled.

## 1 · Framing — four ways to make this granular

The app's first move is a menu, not an answer. These optimise for genuinely different
things, which is why the downstream system differs for each.

| | Framing | Optimises for | Assumes | Can't answer | Effort |
|---|---|---|---|---|---|
| **A** ✅ | **Utilisation truth set + constrained schedule recommender** | Load factor and revenue per screen-hour | The schedule is the lever | Whether the wrong *titles* were booked | M |
| B | Demand forecast per title × daypart; humans still schedule | Forecast accuracy | Schedulers will trust and use it | What the optimal schedule actually is | M |
| C | Joint yield optimisation — price × showtime together | Revenue per screen-hour, directly | Dynamic pricing is contractually and politically possible | Little, if pricing is fixed by distributor terms | L |
| D | Screen/format allocation — which titles get which screens at all | Portfolio mix | Booking decisions are in scope | Within-day placement | L |

**Recommended: A.** It's what was asked, and it builds the measurement foundation that B,
C, and D all silently depend on. You cannot optimise a schedule against a load-factor
number you don't trust yet.

**Raise D anyway, even though you're not picking it.** If utilisation is bad because the
wrong titles are on the wrong screens, showtime placement is the wrong lever and no
schedule change will fix it. Naming that the request may be aimed at the wrong thing — and
then proceeding with what was asked — is the move that separates a strong answer from a
compliant one.

### Concrete objective (resolves from A)

Build a utilisation truth set at showing grain — title, theatre, screen, format, showtime,
seating capacity, tickets sold by price class, refunds and exchanges, plus calendar and
local-event effects. From it compute load factor by daypart, revenue per screen-hour, and
sellout/turnaway frequency. Then generate schedule recommendations under hard constraints
(distributor minimums, print/format availability, staffing, turnaround and cleaning time),
delivered into the scheduler's existing weekly workflow.

## 2 · Success metrics

| Metric | Baseline | Target | Guardrail |
|---|---|---|---|
| **Load factor** (tickets ÷ capacity), by daypart | **Must measure first** — needs ~8 weeks of POS history; expect wide daypart variance | +4pp on weekday matinee, the worst daypart | **Total admissions must not fall.** Load factor is trivially "improved" by cutting showings — that's the Goodhart trap and the guardrail closes it |
| **Revenue per screen-hour** | Estimable from POS × screen-hours once grain is fixed | +3% chain-wide | **Concession revenue per admission must not drop.** Shifting audiences to late showings changes the spend mix |
| **Sellout / turnaway frequency** | Count of showings ≥95% sold | Reduce turnaways on peak titles | **Not a target of zero.** Some sellouts are correct pricing; this is a floor, not something to eliminate |
| Schedule churn | n/a | — | **Cap weekly changes per site.** Churn has real costs: staff rescheduling, customer confusion, marketing reprints |
| Distributor minimum showings | Contractual, per title | — | **Hard breach — never.** Violating a minimum-showings clause is a legal problem, not a metric regression |

The guardrail column is the part that's hard to fake and the part interviewers listen for.
Two of these are non-obvious enough that a generic answer misses them: the admissions
guardrail (the metric is gameable in the exact direction the project pushes) and the
distributor clause (domain knowledge, not analytics).

## 3 · Constraints, assumptions, open questions

**Hard constraints:** distributor minimum showings and hold-over terms; physical
turnaround time between showings (cleaning, ingress/egress); format availability (one IMAX
screen can't run two titles at once); staffing rosters and labour rules; a fixed number of
screens per site.

**Assumptions to state and label as such:**

| Assumption | How I'd validate | If wrong |
|---|---|---|
| Schedule is set weekly, per site, by a person | Interview two schedulers, watch one do it | If it's centralised and quarterly, the delivery mechanism and cadence both change |
| POS captures capacity per screen reliably | Reconcile against the seating-plan system | Load factor's denominator is wrong and every number above is meaningless |
| Refunds/exchanges are a small fraction | Refund rate by daypart from POS | Late refunds inflate load factor on exactly the days we're optimising |

**Open questions, ranked by what they block:** Is pricing in scope, or fixed? (Decides
whether framing C is even available.) Who owns the booking decision vs. the scheduling
decision? (Decides whether D is reachable.) What does the scheduler do *today* — what's
the baseline human process we have to beat?

## 4 · Data model

**Grain: one row per showing — theatre × screen × scheduled start time.** Fixing this
sentence early prevents most downstream confusion.

| Entity | Role | Notes |
|---|---|---|
| `Showing` | fact | The grain. Scheduled vs. actual start, cancellation flag |
| `TicketSale` | fact | Per price class — utilisation without price class is misleading |
| `Refund` / `Exchange` | fact | ⚠️ Arrives *after* the showing; late-arriving facts break naive load factor |
| `Screen` | dimension | Seating capacity, format, turnaround minutes. Capacity changes on refurbishment — needs history |
| `Theatre` | dimension | Site, region, market size |
| `Title` | dimension | Runtime (drives how many showings fit), distributor, release date |
| `PriceClass` | dimension | Concession, matinee, premium |
| `Calendar` | **exogenous** | ⚠️ Holidays, school terms, local events, competing fixtures. The most-forgotten entity, and it dominates the highest-value days |
| `StaffRoster` | operational | ⚠️ Needed to cost the churn guardrail — a recommendation nobody can staff is not a recommendation |

The three flagged entities are the ones a generic answer omits, and each one changes a
number rather than just adding detail.

## 5 · Architecture

| Layer | Decision | Alternative considered |
|---|---|---|
| Ingestion | Nightly batch from POS — schedules change weekly, so nightly is ample | CDC/streaming: real cost, no decision benefit at weekly cadence |
| Landing | Immutable raw zone, partitioned by business date | Straight-to-warehouse: loses replay when refunds arrive late |
| Conformed | Showing-grain fact with conformed screen/title/calendar dimensions; **late-arriving refunds handled by restatement, not update-in-place** | Mutable rows: breaks reproducibility of any number already reported |
| Curated | Daypart load factor, revenue per screen-hour, turnaway proxy | — |
| Serving | Batch-generated weekly recommendation set, with the constraint set versioned alongside it | Live optimisation service: unjustifiable at weekly cadence |
| **Application** | **Into the scheduler's existing weekly workflow** — recommendations with the reason and the constraints they respect, and the ability to reject with a captured reason | A new dashboard: a second tool nobody opens |

**Data quality checks**, each with a threshold, an owner, and a failure action: capacity
non-null and > 0 for every active screen (blocks the run); showings-per-screen-per-day
within plausible bounds (alerts); refund rate within historical band (flags the affected
partition); calendar coverage for the next 90 days (alerts the data owner).

**Access:** site managers see their own site; regional schedulers see their region;
no PII needed at all for this problem — worth saying, because it removes a whole
compliance surface.

**Monitoring:** feed freshness and row-count deltas, recommendation acceptance rate,
realised vs. predicted load factor per accepted recommendation.

That last one matters most — the rejection reasons the app captures are the training signal
for everything after the MVP.

## 6 · MVP — the thinnest slice that proves value

**One sentence:** for three theatres in one region, using eight weeks of history, recommend
weekday-matinee showtime changes and deliver them as a weekly file to the regional
scheduler.

**Proves:** that recommendations beat the scheduler's own picks on held-out weeks. That's
the only claim worth testing first.

**Delivery:** a weekly spreadsheet and a short email. **Not an app.** Building UI before
the recommendation has beaten a human is how these projects die.

**Explicitly out of scope, with the reason:**

| Cut | Why | Revisit when |
|---|---|---|
| Pricing | Doubles the problem and may be contractually impossible | Framing C, after pricing scope is confirmed |
| Booking / title selection | Different decision owner entirely | After the scheduling loop is trusted |
| All dayparts, all sites | Weekday matinee is worst-performing and lowest-risk to change | Once accepted recommendations beat baseline |
| Real-time anything | Weekly decision cadence | Never, probably |
| A UI | No value until the recommendation is trusted | Once acceptance rate justifies it |

**Kill criterion:** if recommendations don't beat the scheduler's own picks on held-out
weeks after two cycles, stop — the schedule is not the binding constraint, and that result
is itself worth reporting.

## 7 · Trade-offs and failure modes

**Trade-offs:** optimise per-site (respects local demand, no chain-wide view) vs.
chain-wide (portfolio effects, ignores local nuance) — lean per-site first, on *trust*.
Recommend-and-approve (slow, builds trust, generates rejection data) vs. auto-apply (fast,
one bad week destroys credibility) — lean recommend-and-approve, on *risk*.

**Failure modes:**

| Mode | Detection | Degradation | Blast radius |
|---|---|---|---|
| Late refunds inflate load factor on holidays | Refund-lag distribution monitor | Report holiday figures with a lag and a confidence note | wrong answer |
| POS feed gap on a peak day | Freshness + row-count check | Suppress the week's recommendation rather than emit one from partial data | wrong answer |
| Recommends a schedule nobody can staff | Validate against `StaffRoster` before emitting | Drop the infeasible option, emit the next-best | operational |
| **Cannibalisation** between adjacent showings of the same title | Compare per-showing vs. per-site-per-day totals | Constrain minimum gap between same-title showings | wrong answer |
| Breaches a distributor minimum | Hard pre-emit constraint check | Refuse to emit; alert | **safety or legal** |

Cannibalisation is the sophisticated one: a recommender optimising each showing
independently can find a local optimum that splits one audience across two half-empty
screenings and reports both as improvements.

## 8 · Talk track (45 minutes)

| Minutes | Move | Phrasing that works |
|---|---|---|
| 0–5 | Restate; split measurement from decision | "There are two systems in this ask — one that tells us what utilisation *is*, and one that changes the schedule. The second depends on the first." |
| 5–10 | Name the framings; pick one; flag D | "Before I design — is pricing in scope, or fixed? And is booking someone else's decision? That changes which problem I should be solving." |
| 10–15 | Metrics, and lead with the guardrail | "The risk with load factor is that you can improve it by cutting showings, so I'd pair it with total admissions as a guardrail." |
| 15–22 | Grain, then entities; call out calendar | "One row per showing. And I'd want a calendar dimension early — holidays and local events will dominate the days that matter most." |
| 22–32 | End-to-end thin path, then go deep on one | "Let me sketch ingestion through to the scheduler's desk first, then go deep on the recommendation constraints — that's where this succeeds or fails." |
| 32–40 | MVP and the cuts | "Three theatres, one daypart, eight weeks, delivered as a file. No UI until it beats the human." |
| 40–45 | Failure modes and the kill criterion | "This breaks if refunds arrive late on exactly the holidays we're optimising. And if we can't beat the scheduler in two cycles, the schedule isn't the constraint." |

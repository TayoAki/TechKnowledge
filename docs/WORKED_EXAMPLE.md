# Worked example — the quality bar

Reference output. Generated briefs are graded against this level of specificity, and the
invariants in [`BRIEF_SPEC.md`](BRIEF_SPEC.md) enforce it.

> **Raw ask:** "We want to analyze seat utilization and recommend better showtimes."

Note what the prompt doesn't give: no stakeholder beyond "we", no named data sources, no time
bound. All three become opening questions — the brief's first output, not a gap in it.

**Clock:** `full_60` · **Company mode:** deep dive · **Depth track:** data engineering

---

# ① Problem Decomposition · 18 min

## Triage

| Element | Reading |
|---|---|
| **Named entity** | "We" — the exhibitor, presumably a regional chain |
| **Actual stakeholder** | The **regional programmer/scheduler** who publishes the weekly grid |
| **The gap** | The exec asking feels the revenue pain; the scheduler's behaviour is what has to change. Design for the exec and nothing ships. `must_confirm` |
| **Resources given** | None named. Ticketing/POS is *implied*, not stated |
| **Time bound** | Absent → ask. **Confirmed: one week** |

**Resources to ask for** — the listed set is rarely the whole set:

| Resource | Why | How to ask |
|---|---|---|
| Distributor contract terms | Minimum-showings clauses are *hard*; breaching one is worse than useless | "Are there contractual minimums per title we'd have to respect?" |
| Local events / term dates | Dominates the highest-value days | "Anything on local events or school calendars?" |
| Seating-plan system | POS capacity goes stale after refurbishment | "Where does authoritative seat count per screen live?" |

## Pain point, and the reframe

**Candidates:** the exec wants revenue per screen-hour up · the scheduler is guessing ·
marketing wants to know what to promote. **Chosen: the scheduler is guessing** — the only
lever whose movement changes anything.

**What they do today:** copy last week's grid, adjust by gut, distributor pressure, and a
spreadsheet of last week's per-showing sales. What's lost isn't analysis *time* — it's that
there's **no per-daypart view** and **no way to sanity-check a grid before publishing**.
Once it's out, a bad week is a bad week.

*Questions that reveal it:* "Walk me through how next week's grid gets made." · "When you
move a showtime, how do you find out whether it worked?"

> ~~seat utilisation is low~~ → **the scheduler can't test a proposed grid before publishing it**

**What this changes downstream:** the ask sounds like an optimiser. The reframe says
decision-support. Materially cheaper, faster, and more adoptable — the difference between
shipping in a week and shipping in a quarter.

## Options

| | Option | Optimises for | Needs unlisted? | Effort |
|---|---|---|---|---|
| A | Truth set + weekly daypart report | Visibility | — | S |
| **B** ✅ | **Truth set + what-if checker** | Confidence before publishing | Contract terms | M |
| C | Constrained optimiser generating the grid | Theoretical best grid | Terms, staffing | L |
| D | Screen/format allocation, upstream | Portfolio mix | Booking data | L |

**Recommended: B** — not because it's the middle option, but because the reframe points at
it. A optimises nothing; C solves a problem the scheduler didn't report and will distrust in
week one.

**Raise D anyway:** if the wrong titles are on the wrong screens, showtimes are the wrong
lever entirely. Naming that the request may be aimed at the wrong thing, then proceeding
with what was asked, is what separates a strong answer from a compliant one.

## Success metrics

| Metric | Baseline | Target | Guardrail |
|---|---|---|---|
| **Load factor** by daypart | **Must measure first** — ~8 weeks of POS history | +4pp on weekday matinee, the worst daypart | **Total admissions must not fall.** Load factor improves trivially by cutting showings — the guardrail closes the Goodhart trap the project itself pushes toward |
| **Revenue per screen-hour** | Estimable once grain is fixed | +3% chain-wide | **Concession revenue per admission must not drop** — later showings change the spend mix |
| Sellout / turnaway frequency | Showings ≥95% sold | Fewer turnaways on peak titles | **Not a target of zero** — some sellouts are correct pricing |
| Schedule churn | n/a | — | **Cap weekly changes per site** — staff rescheduling, customer confusion, reprints |
| Distributor minimums | Contractual | — | **Hard breach, never.** A legal problem, not a metric regression |

Two of these are non-obvious enough that a generic answer misses them: the admissions
guardrail, and the distributor clause — domain knowledge, not analytics knowledge.

## Data model

**Grain: one row per showing — theatre × screen × scheduled start.**

| Entity | Role | The catch | Schema-change risk |
|---|---|---|---|
| `Showing` | fact | Scheduled vs. actual start; cancellations | POS adds format codes without notice |
| `TicketSale` | fact | Per price class — utilisation without it misleads | New price classes appear each promo cycle → **unknown enum, must fail loudly not silently bucket** |
| `Refund` / `Exchange` | fact | ⚠️ **Late-arriving** — lands after the showing, inflating load factor on exactly the days being optimised | — |
| `Screen` | dimension | ⚠️ Capacity **changes** on refurbishment; needs history | Seat-count column becomes a range on recliner conversion |
| `Calendar` | **exogenous** | ⚠️ Holidays, term dates, local events. Most-forgotten entity, dominates peak days | — |
| `StaffRoster` | operational | ⚠️ A recommendation nobody can staff isn't one | — |

---

# ② Architecture & Governance · 15 min

**Functional (2):** load factor by daypart per theatre from POS and capacity, weekly ·
given a proposed showtime change, return predicted load factor.

**Non-functional (2):** delivered before the weekly grid deadline — a *deadline*, not a
latency SLA · numbers reproducible after the fact, since refunds arrive late.

**Scale — where a number earns its place:** 3 theatres × ~8 screens × ~5 showings/day ×
8 weeks ≈ **7,000 rows**. Decisive rather than ritual: rules out streaming, a warehouse, and
distributed anything. It fits in a spreadsheet, and saying so out loud beats any diagram.

| Component | Layer | Satisfies | Track | Narration |
|---|---|---|---|---|
| Nightly POS CSV drop | ingestion | F1 | data eng | "Immutable raw, partitioned by business date — so late refunds get restated, not overwritten." |
| Capacity reference | conformed | F1 | data eng | "The denominator of every number here. Stale capacity makes the whole report wrong." |
| Daypart aggregation job | curated | F1 | data eng | "Weekly cadence matches the decision cadence. Nothing needs to beat the grid deadline." |
| Prediction function | serving | F2 | data eng | "Same aggregation on a hypothetical grid — which is why F2 is nearly free once F1 exists." |
| What-if endpoint | **api** | F2 | full stack | "One POST with a proposed grid, back comes predicted load. Keeps the door open for a UI later without committing to one now." |
| **Scheduler's view** | **application** | NF1 | full stack | "Lands in their inbox Thursday for a Friday deadline. This is where the decision actually gets made, so it's the component I'd cut last." |

The last two exist because area 2 asks for ingestion *through to where end users interact*.
A board stopping at the curated table fails the area however good the pipeline is.

## Governance

**Data quality** — each with a threshold *and an owner*, because a check with no owner never
runs:

| Check | Threshold | Owner | On fail |
|---|---|---|---|
| Capacity non-null and > 0 per active screen | 100% | Data eng | **Block the run** — the denominator is non-negotiable |
| Showings per screen per day within bounds | 1–8 | Data eng | Alert, publish with a flag |
| Refund rate within historical band | ±2σ | Analyst | Flag the affected partition |
| Calendar coverage forward | 90 days | Ops | Alert the data owner |

**Security:** site managers see their own site, regional schedulers their region. **No PII
needed at all** for this problem — worth saying, because it removes a whole compliance
surface rather than mitigating one.

**Scaling:** the binding constraint isn't volume, it's the weekly deadline. Headroom is
enormous — a year of chain-wide data is still small.

**Monitoring:** feed freshness and row-count deltas *(→ data eng)* · recommendation
acceptance rate *(→ the product owner)* · realised vs. predicted load per accepted change
*(→ everyone)*. That last one is the training signal for everything after the MVP.

---

# ③ Product Definition · 10 min

**The cut line**, drawn through the diagram above:

```
CSV drop ──▶ capacity ref ──▶ aggregation ──▶ prediction ┃──▶ what-if endpoint ──▶ UI
   ✓              ✓               ✓              ✓        ┃        ····              ····
                                                          ┃   deferred: manual email
                                              MVP CUT ────┛   round-trip in v1
```

Inside the line ships. The what-if *endpoint* and the *view* are deferred — v1 is the
scheduler emailing a proposed change and getting a number back by hand. The prediction logic
is the same either way, which is what makes the cut cheap.

**Ships:** truth set for three theatres, weekday-matinee daypart report, manual what-if.
**Proves:** predicted load is close enough that the scheduler would act on it.
**Delivery:** a spreadsheet and an email. No UI.

**Where the week goes** — build time is not the constraint:

| Bottleneck | Cost | Narration |
|---|---|---|
| Coordination | some | "POS data sits with a team we already work with, so access is a conversation. Two sessions with the scheduler is the real ask." |
| **Integration** | **most** | "No documented POS export API, so it's a connector or a negotiated nightly CSV. That eats most of the week and it's what I'd de-risk on day one." |
| Rollout | negligible | "A spreadsheet to one person. No deployment story in v1 — which is exactly why I'd keep it that way." |

**Deliberate tech debt:** hardcoded seat counts *(pay back when a fourth site joins)* ·
nightly CSV instead of a connector *(pay back if this survives the pilot)*.

**Next:** 2.0 distributor-minimum checks *(unblocked by obtaining contract terms)* · 3.0 the
endpoint and UI *(unblocked by the manual version proving useful)* · 4.0 the optimiser
*(unblocked by 3.0 being trusted, plus the realised-vs-predicted feedback loop)*. 4.0 is
high-impact but can't come first — it depends on trust the earlier versions build.

**Kill criterion:** if predicted load doesn't beat the scheduler's own picks on held-out
weeks after two cycles, the schedule isn't the binding constraint — and that's worth
reporting.

---

# Depth · 15 min · data engineering → schema evolution

*"The part most likely to make this silently **wrong** rather than just slow is the data
model — specifically what happens when the POS feed changes shape. I'd like to go deep
there. Does that work?"*

| Probe | Answer |
|---|---|
| "How do you handle refunds landing after the showing?" | Restatement, not update-in-place. Report with a stated lag and a confidence note, so a number already shown to the exec never silently changes underneath them. |
| "POS adds a new price class mid-quarter. What happens?" | The unknown enum **fails loudly** rather than bucketing into "other". Silently absorbing it understates revenue per screen-hour and nobody finds out for a quarter. |
| "They convert a screen to recliners — capacity drops 40%." | Capacity is dimension-with-history. Old weeks keep their old denominator; without that, every historical comparison breaks the day a site refurbishes. |
| "What if capacity is just wrong?" | It's the denominator, so it's a blocking check — not an alert. The run doesn't publish. |

## Coverage

```
DATA ENG    pipelines ✓  quality ✓  ingestion ✓  schema evolution ✓   breadth 4/4 ✓
FULL STACK  app arch ✓   UX ○       API ✓        front/back ✓         breadth 3/4 ✓
                                                 depth ▸ DATA ENG ▓▓▓▓▓
```

Both tracks meet breadth; depth is claimed and demonstrated in the same track. **UX is the
honest gap** — the delivery mechanism is an email, so there's no interface to reason about.
Defensible here, and worth naming out loud rather than leaving the board to imply coverage
that isn't there.

---

# Wrap · 2 min

| Change | Affected | Unchanged | Response |
|---|---|---|---|
| "Roll out to another region" | Capacity reference | Aggregation, prediction, report | Swap hardcoded capacities for a seating-plan sync — the tech debt coming due, on schedule |
| "Site loses connectivity" | Report delivery | Everything upstream | Cache the last published report. The requirement is about *reaching* the user, not producing the answer |

## Rubric self-check

| Dimension | Evidence | Still on you in the room |
|---|---|---|
| **Ambiguity handling** | Three elements triaged, stakeholder gap named, four opening questions | Asking them out loud before designing |
| **User empathy** | The workaround question, and where time is actually lost | Asking it *before* being prompted — the session records which |
| **Outcome orientation** | Every choice traces to the scheduler's Friday deadline | Resisting the optimiser: more impressive build, wrong instinct |
| **Scrappy** | Cut line drawn, three bottlenecks costed, debt named | Holding "spreadsheet, no UI" when it feels unambitious |
| **Technical depth** | Schema-evolution depth, four probes answered | Going deeper when pushed twice |
| **Collaboration** | Capacity-reference ghost box offered and accepted at ② | Rejecting one *with a reason* — collaboration is not compliance |

The last two rows are only scorable because the board was co-created in pair posture. Run in
draft or `drill_20`, they report as *not exercised* rather than scored.

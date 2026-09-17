# Worked example — the quality bar

The brief the app should produce. Reference output: generated briefs are graded against this
level of specificity, and the invariants in [`BRIEF_SPEC.md`](BRIEF_SPEC.md) enforce it.

> **Raw ask:** "We want to analyze seat utilization and recommend better showtimes."

Note what this prompt *doesn't* give you: no stakeholder beyond "we", no named data sources,
no time bound. All three are missing, so all three become opening questions — which is the
brief's first output, not a gap in it.

---

## L0 · Triage

| Element | Reading |
|---|---|
| **Named entity** | "We" — the exhibitor, presumably a regional chain |
| **Actual stakeholder** | The **regional programmer/scheduler** who publishes the weekly grid |
| **The gap** | The exec asking feels the revenue pain; the person whose behaviour has to change is the scheduler. Design for the scheduler or nothing ships. `must_confirm` |
| **Resources given** | None named. Ticketing/POS data is *implied*, not stated |
| **Time bound** | Absent → ask. **Confirmed: one week** |

**Resources to ask for** — never assume the listed set is the whole set:

| Resource | Why | How to ask |
|---|---|---|
| Distributor contract terms | Minimum-showings clauses are a *hard* constraint; a recommendation that breaches one is worse than useless | "Are there contractual minimums per title we'd have to respect?" |
| Local events / school calendar | Dominates the highest-value days | "Do we have anything on local events or term dates?" |
| Seating-plan system | POS capacity may be stale after refurbishments | "Where does authoritative seat count per screen live?" |

**Opening questions:** Who actually sets the schedule today, and would they use this? · What's the timeline to ship something? · Are contractual minimums in play? · Is pricing in scope or fixed?

## L1 · Pain point — and the reframe

**Candidates:** the exec wants revenue per screen-hour up · the scheduler is guessing ·
marketing wants to know what to promote.

**Chosen: the scheduler is guessing** — they're the decision owner, and their behaviour is
the only lever that changes anything.

**What they do today** *(the highest-leverage question in the whole interview)*: they copy
last week's grid and adjust by gut, distributor pressure, and a spreadsheet of last week's
per-showing sales. What's actually lost isn't analysis *time* — it's that they have **no
per-daypart view** and **no way to sanity-check a proposed grid before publishing it.**
Once published, a bad week is a bad week.

*Questions that reveal this:* "Walk me through how next week's grid gets made." · "When you
change a showtime, how do you know afterwards whether it worked?"

**The reframe:**

> "Seat utilisation is low" → **"The scheduler has no reliable per-daypart load signal, and
> no way to test a proposed change before committing to it."**

**What this changes downstream:** the ask sounds like an optimiser. The reframe says it's a
*decision-support and what-if* tool. That is a materially cheaper, faster, more adoptable
build — and it's the difference between shipping in a week and shipping in a quarter.

## L2 · Solution options

| | Option | Optimises for | Needs unlisted? | Effort |
|---|---|---|---|---|
| A | Truth set + weekly daypart report (measure only) | Visibility | — | S |
| **B** ✅ | **Truth set + what-if checker** — scheduler proposes a change, tool predicts load | Decision confidence before publishing | Distributor terms | M |
| C | Constrained optimiser that generates the grid | Theoretical best grid | Distributor terms, staffing | L |
| D | Screen/format allocation, upstream of showtimes | Portfolio mix | Booking data | L |

**Recommended: B.** Not because it's the middle option — because the reframe points at it.
The pain is "I can't check before I commit", not "I can't compute an optimum". A optimises
nothing; C solves a problem the scheduler didn't report and will distrust on week one.

**Raise D anyway.** If utilisation is bad because the wrong titles are on the wrong screens,
showtimes are the wrong lever entirely. Naming that the request may be aimed at the wrong
thing — then proceeding with what was asked — is the move that separates a strong answer
from a compliant one.

## L3 · MVP in one week

**Ships:** utilisation truth set for three theatres, weekday-matinee daypart report, and a
**manually-run** what-if: the scheduler emails a proposed change, we return predicted load.

**Proves:** that the predicted load is close enough that the scheduler would act on it.

**Delivery:** a spreadsheet and an email. No UI.

**Where the week actually goes** — build time is not the constraint:

| Bottleneck | Cost | Narration |
|---|---|---|
| **Coordination** | some | "The POS data sits with a team we already work with, so access is a conversation not a project. I need two sessions with the scheduler — that's the real ask." |
| **Integration** | **most** | "There's no documented POS export API, so we'd build a connector or negotiate a nightly CSV drop. That eats most of the week, and it's the thing I'd de-risk on day one." |
| **Rollout** | negligible | "It's a spreadsheet to one person, so there's no deployment story at all in v1 — which is exactly why I'd keep it that way." |

**Deliberate tech debt:** hardcode the three theatres' seat counts rather than syncing the
seating-plan system (pay back when a fourth site joins) · nightly CSV drop instead of a
connector (pay back when this survives past a pilot).

**Deferred:** distributor-minimum checking *(blocked on getting contract terms)* ·
self-serve what-if UI *(blocked on the manual version proving useful)* · all other dayparts
*(blocked on matinee results)*.

## L4 · High-level design

**Functional (2):** produce load factor by daypart per theatre from POS and capacity,
weekly · given a proposed showtime change, return a predicted load factor.

**Non-functional (2):** delivered before the weekly grid deadline — a *deadline*, not a
latency SLA · numbers reproducible after the fact, since refunds arrive late.

**Scale — and here a number earns its place:** three theatres × ~8 screens × ~5 showings/day
× 8 weeks ≈ **7,000 rows**. That's decisive rather than ritual: it rules out streaming, a
warehouse, and distributed anything. The whole thing fits in a spreadsheet, and saying so
out loud is worth more than any architecture diagram.

| Component | Satisfies | Narration |
|---|---|---|
| Nightly POS CSV drop → landing store | F1 | "Immutable raw, partitioned by business date — so when refunds land late I restate rather than overwrite." |
| Capacity reference (hardcoded v1) | F1 | "The denominator of every number here. Stale capacity makes the whole report wrong, so it's explicit and versioned." |
| Daypart aggregation job | F1 | "Weekly cadence matches the decision cadence. Nothing here needs to be faster than the grid deadline." |
| Prediction function | F2 | "Same aggregation, run on a hypothetical grid. Reusing the measurement path is why F2 is nearly free once F1 exists." |
| Weekly report + what-if reply | NF1 | "Lands Thursday for a Friday deadline." |

## L5a · Deep dive — data model

*Chosen because this is where the solution lives or dies: every number depends on a
denominator nobody has validated. "The data model is the part most likely to make this
wrong rather than just slow — I'd like to go deep there. Does that work?"*

**Grain: one row per showing — theatre × screen × scheduled start.**

| Entity | Role | The catch |
|---|---|---|
| `Showing` | fact | Scheduled vs. actual start; cancellations |
| `TicketSale` | fact | Per price class — utilisation without price class misleads |
| `Refund` / `Exchange` | fact | ⚠️ **Late-arriving.** Lands after the showing, so naive load factor is inflated on exactly the days being optimised |
| `Screen` | dimension | ⚠️ Capacity **changes** on refurbishment — needs history, or old weeks get scored against today's seat count |
| `Calendar` | **exogenous** | ⚠️ Holidays, term dates, local events. The most-forgotten entity, and it dominates peak days |
| `StaffRoster` | operational | ⚠️ A recommendation nobody can staff isn't a recommendation |

**Likely probes, and answers:**

- *"How do you handle the late refunds?"* — Restatement, not update-in-place. Report with a
  stated lag and a confidence note, so a number already shown to the exec never silently changes.
- *"What if capacity is wrong?"* — It's the denominator, so it's a blocking quality check:
  non-null and > 0 for every active screen, or the run doesn't publish.
- *"Why is calendar a separate entity?"* — Because the highest-value days are the ones it
  explains, and without it the model attributes a holiday spike to the showtime.

## L6 · Follow-ups, pre-answered

**What ships next** — ranked by blocker first, impact second:

| | Adds | Unblocked by | Impact |
|---|---|---|---|
| 2.0 | Distributor-minimum constraint checking | Obtaining contract terms | high |
| 3.0 | Self-serve what-if UI | 2.0 accepted and used | medium |
| 4.0 | Grid optimiser (framing C) | 3.0 trusted; feedback loop of realised vs. predicted load | high |

Note 4.0 is high-impact but can't be sequenced first — it depends on the trust that 2.0 and
3.0 build. That ordering *is* the answer to this follow-up.

**Requirement-change war-games:**

| Change | Affected | Unchanged | Response |
|---|---|---|---|
| "Roll it out to another region" | Capacity reference | Aggregation job, prediction function, report | Swap hardcoded capacities for a sync from the seating-plan system. That's the tech debt coming due, on schedule |
| "Must work if the site loses connectivity" | Report delivery | Everything upstream | Add a local cache of the last published report. Generation is untouched — the requirement is about *reaching* the user, not producing the answer |

## L7 · Rubric self-check

Scored from what the session observed, in rubric order. "Unprompted" is the column that
matters — doing the right thing after being asked to scores below doing it first.

| Dimension | Evidence from this session | Still on you in the room |
|---|---|---|
| **Ambiguity handling** | All three elements triaged; stakeholder gap named; four opening questions | Asking them out loud before designing |
| **User empathy** | The workaround question, and where the time actually goes | Asking it *before* the AI prompts you — the session records which |
| **Outcome orientation** | The reframe ties every choice to the scheduler's Friday deadline | Resisting the optimiser: it's the more impressive build and the wrong instinct |
| **Scrappy** | Three bottlenecks costed, tech debt named, deferrals with blockers | Holding "spreadsheet, no UI" when it feels unambitious |
| **Technical depth** | Data-model depth, probes pre-answered | Going deeper than the board when pushed twice |
| **Collaboration** | Ghost box (capacity reference) offered and accepted at ⑤ | Rejecting one *with a reason* — collaboration is not compliance |

The last two rows are only scorable because the board was co-created in **pair** posture.
Run in draft, they report as *not exercised* rather than scored.

## L8 · Talk track (45 min)

| Min | Step | Move | Phrasing |
|---|---|---|---|
| 0–2 | 1 | Triage all three elements | "Before I design — who sets the schedule today, what data do we have, and what's the window to ship?" |
| 2–10 | 2 | Excavate the workaround | "Walk me through how next week's grid actually gets made. And when you move a showtime, how do you find out if it worked?" |
| 10–15 | 3 | Options; ask for the unlisted | "My instinct is a what-if checker rather than an optimiser. Are there contractual minimums we'd need to respect?" |
| 15–20 | 4 | Scope against bottlenecks | "Build isn't the constraint — integration is. No documented POS API, so a connector eats most of the week." |
| 20–25 | 5 | Requirements, then the number | "Two functional, two non-functional. And it's ~7,000 rows, so this fits in a spreadsheet — that rules out most of the architecture I might otherwise reach for." |
| 25–40 | 6a | Deep dive, with permission | "The data model is where this gets *wrong* rather than just slow. I'd like to go deep there — does that work?" |
| 40–45 | — | Next MVPs and the kill criterion | "If predicted load doesn't beat the scheduler's own picks in two cycles, the schedule isn't the binding constraint — and that's worth reporting." |

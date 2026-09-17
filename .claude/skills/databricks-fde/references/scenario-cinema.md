# Scenario: national movie theater chain

Internal operations. The reveal table is what keeps the interviewer principled rather than
randomly evasive — **answer only what is asked, from this table, and the same way every time.**

## The prompt as given

> A national movie theater chain wants to optimize weekly film-to-screen scheduling,
> auditorium utilization, and concessions staffing.

Deliberately under-specified. Three things are missing and each becomes an opening question:
who decides, what data exists, and what the window to ship is.

## Stakeholder

| | |
|---|---|
| **Named** | "the chain" — corporate, whoever is asking |
| **Actual** | the **regional programmer** who publishes the weekly grid |
| **Why it matters** | Corporate feels the revenue pain; the programmer's behaviour is what must change. Design for corporate and nothing ships. |

The candidate acts as the **GM's technical partner**. If they design for an analyst or an
executive, that is the first correction — at whatever level they are on.

## Reveal table

Answer only when asked. `reframes` items change the shape of the design; `detail` items do not.

| Fact | Unlocked by asking | Weight |
|---|---|---|
| Grid is set weekly per site by a person, who copies last week and adjusts by judgement | How does scheduling work today? | reframes |
| They have no per-daypart view and no way to test a change before publishing | How do they know a change worked? | reframes |
| POS/ticketing exports files nightly; there is no documented API | What data do we have, and how do we get it? | reframes |
| Refunds and exchanges land *after* the showing | How clean is the sales data? | reframes |
| Distributor contracts set minimum showings per title per week | Are there contractual constraints? | constrains |
| Seat counts change on refurbishment and POS may hold a stale value | Where does capacity come from? | constrains |
| Concessions staffing is set by a different team on a different cadence | Who owns staffing? | constrains |
| Trailer and advertising windows add fixed minutes before each feature | What bounds showings per screen per day? | detail |
| ~10–40 sites, ~8 screens each | How big is the chain? | detail |
| One week to ship something | What's the timeline? | constrains |

## Scale prior

Three theatres × ~8 screens × ~5 showings/day × 8 weeks ≈ **7,000 rows** for a pilot; a
full chain-year is still small. This is decisive rather than ritual: it rules out streaming, a
separate warehouse tier, and anything distributed. A candidate who runs this number and then
proposes a streaming architecture has not used their own estimate.

## Landmines

| Landmine | The tell | Probe |
|---|---|---|
| Optimizing utilization with no guardrail | Objective stated, nothing about admissions | "If someone improved utilization as hard as possible, what breaks?" |
| Reaching for streaming | "real-time" with a Thursday deadline | "Who reads this before Thursday?" |
| Stopping at a gold table | Design ends at the curated layer | "Who looks at this, and on what screen?" |
| Treating capacity as static | No validity periods on the dimension | "A site converts to recliners. What happens to last quarter's numbers?" |
| Building an optimizer first | Jumps to solving the schedule | "The programmer doesn't trust it yet. What do they do with the output on Monday?" |
| Ignoring concessions staffing | Answers only the scheduling half | "Staffing was in the ask. In or out of scope, and why?" |

The last one is a scoping test, not a trap — declaring it out of scope *with a reason* scores
above quietly dropping it.

## The honest gap

Concessions staffing depends on predicted attendance, which depends on the utilization model
being trusted. It is genuinely a later phase. A candidate who says that has sequenced by
dependency, which is the skill; a candidate who silently ignores it has not.

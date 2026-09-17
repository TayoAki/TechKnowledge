# The flow — what the user sees

One input. The whiteboard gets drawn in front of you, pausing only where a choice actually
changes what comes next.

Worked with the seat-utilisation ask throughout. The board's states map to the layers in
[`BRIEF_SPEC.md`](BRIEF_SPEC.md); the process is [`FRAMEWORK.md`](FRAMEWORK.md).

## The interaction principle: three gates, not nine

The board auto-builds and streams. It **stops for your input exactly three times** — at the
decisions where a wrong answer invalidates everything downstream:

| Gate | Why it must stop |
|---|---|
| **Is this the right stakeholder?** | Every later layer is derived from it. Wrong here, wrong everywhere |
| **Which solution?** | Determines the MVP and the entire architecture |
| **Which deep-dive area?** *(or present-back)* | Determines what depth gets prepared |

Everything else generates and is **editable in place**. Gating all nine layers is tedious
and people start clicking through without reading; gating none loses the guidance that is
the product. Three is the number that earns its interruptions.

---

## Beat 0 · Empty board

A single box: *"Paste the ask — a sentence or two is enough."* Optional selectors for target
company (sets the ending) and a domain hint.

You type: **"We want to analyze seat utilization and recommend better showtimes."**

## Beat 1 · The frame appears

Three boxes draw across the top of the board — the shape you'd chalk up first in a real
round:

```
┌─ STAKEHOLDER ────┐  ┌─ RESOURCES ──────┐  ┌─ TIME ──────┐
│ ~~the chain~~    │  │ POS/ticketing ?  │  │     ?       │
│ regional         │  │ ─────────────    │  │  must ask   │
│ SCHEDULER        │  │ ask for:         │  └─────────────┘
│ ⚠ confirm        │  │ · contract terms │
└──────────────────┘  │ · event calendar │
                      │ · seating plans  │
                      └──────────────────┘
```

Three things are doing work here. The named entity is **struck through** with the actual
stakeholder written beneath — the gap is the point, so it's drawn rather than resolved
silently. Unknowns are amber `?` chips, not blanks. And the resources box has a second
compartment: **things to ask for**, each with the phrasing, because the listed set is rarely
the whole set.

A questions rail populates alongside: *Who sets the schedule today, and would they use
this? · What's the window to ship? · Are there contractual minimums? · Is pricing in scope?*

**→ Gate 1.** "Building for the regional scheduler, not the exec who asked. Right?"
Confirm, or correct it and the board rebuilds from there.

## Beat 2 · The tree, and the reframe

A small tree grows below the frame: stakeholder at the root, three candidate pain points
branching out, the chosen one thickening while the others fade but stay.

Then a box labelled **TODAY** draws itself — *copies last week's grid, adjusts by gut and
distributor pressure* — and an arrow runs from it to a new statement written in a different
colour:

> ~~seat utilisation is low~~ → **the scheduler can't test a proposed grid before publishing it**

The reframe **replaces the original ask at the top of the board.** That single move is the
most valuable thing the product does, and making it a visible substitution is why: you see
the problem you were handed become the problem you're solving.

## Beat 3 · Option cards

Four cards lay out horizontally. Each shows what it optimises for and the resources it
consumes. Where an option needs something you don't have, that resource draws as a **dashed
box** with the ask attached:

```
┌─ A ─────────┐ ┌─ B  ★ ──────────┐ ┌─ C ─────────┐ ┌─ D ─────────┐
│ report only │ │ what-if checker │ │ optimiser   │ │ allocation  │
│ visibility  │ │ confidence      │ │ best grid   │ │ mix         │
│ effort S    │ │ effort M        │ │ effort L    │ │ effort L    │
│             │ │ ┌ ─ ─ ─ ─ ─ ┐   │ │ ┌ ─ ─ ─ ┐   │ │ ┌ ─ ─ ─ ┐   │
│             │ │ ╎ contracts ╎   │ │ ╎ staff ╎   │ │ ╎booking╎   │
└─────────────┘ └─┴─ ─ ─ ─ ─ ┴────┘ └─┴─ ─ ─ ─┴───┘ └─┴─ ─ ─ ─┴───┘
      ↑ recommended, because the reframe points at confidence, not optimality
```

**→ Gate 2.** Pick one. The rejected cards shrink and dock to the left margin — they don't
vanish. Hovering one shows what the board *would* have looked like, which is the study
mechanism: you can see the road not taken.

A callout flags option D separately: *worth raising even though you're not picking it — if
the wrong titles are on the wrong screens, showtimes are the wrong lever entirely.*

## Beat 4 · The week, as a bar

The board clears the lower half and draws a single horizontal bar: your time bound.
Segments size themselves to where the week actually goes.

```
├─ coord ─┼──────────── INTEGRATION ─────────────┼─ roll ─┤
  2 sessions   no documented POS export API        one email
  with the     → build a connector or negotiate    to one
  scheduler       a nightly CSV drop               person
─────────────────────────────────────────────────────────────
 below the line:  2.0 contract checks 🔒   3.0 what-if UI 🔒
```

You don't read that integration is the constraint — you **see** it eating two-thirds of the
bar. That's the whole argument for a whiteboard over a document. Deferred items sit below
the line with padlocks naming their blockers.

## Beat 5 · The architecture

The classic boxes and arrows, drawn left to right. Every box carries the tag of the
requirement it satisfies:

```
CSV drop ──▶ landing ──▶ aggregation ──▶ report
  [F1]        [F1]          [F1]         [NF1]
                  ▲
            capacity ref        prediction fn ──▶ what-if reply
              [F1]                  [F2]              [F2]
```

Requirements pin to the corner, capped and counted: **F1, F2 · NF1, NF2**. Add a third
functional requirement and the counter turns red with *"this means the scope is too wide —
fix beat 4"*, because the fault is upstream, not here.

**A box with no requirement tag glows red.** It either doesn't belong or reveals a
requirement you never wrote down.

The scale read prints beneath: *~7,000 rows → rules out streaming, warehouse, distributed
anything.* When the qualitative prior settles it, no arithmetic appears at all.

## Beat 6 · Depth, or the customer view

**→ Gate 3.** Pick where to go deep, or switch to present-back mode.

*Deep dive (Palantir, Databricks):* the chosen box **expands in place** into its own
sub-diagram, exactly as a whiteboard does when someone says "go deeper on that." Entities,
grain, and the catches as red callouts — late-arriving refunds, capacity history, the
forgotten calendar. Each with a likely probe and the answer.

*Present-back (OpenAI):* the board **flips**. Same system, customer-facing: what they can
now do, jargon swaps shown as strikethroughs, two trade-offs, next steps. Checked against a
jargon blocklist, since de-jargoning is the layer's entire purpose.

## Beat 7 · War-games

Two chips appear: *"another region wants it"* · *"site loses connectivity."*

Click one and the **existing diagram highlights only what changes** — one box lights up,
the rest dim. That's the insight made visual: a requirement change is usually one or two
components, and a change that repaints the whole board means the design lacked seams.

## Beat 8 · The rail

A talk track docks to the right: minute ranges, step numbers, and phrasing. Scroll it and
the matching region of the board highlights. Export takes the board plus the rail.

Two rubric dimensions are marked **unservable** here rather than quietly padded —
collaboration and most of user empathy belong to the live conversation, and the board can
only hand you the questions that make them possible.

---

## How it's built

Mapping to the primitives in [`PLAN.md`](PLAN.md) §5:

| Beat | Primitive |
|---|---|
| Board contents, streaming in | `useAgent()` → `agent.state`, with state streaming so boxes land as they generate |
| Gates 1–3 | `useHumanInTheLoop` — agent pauses in `Executing`, resumes on `respond()` |
| Agent drawing a node | `useFrontendTool`, Zod `parameters`, handler mutates board state |
| Your in-place edits feeding later beats | `useAgentContext({ description, value })` |
| Nudges when you stall at a gate | `useConfigureSuggestions` |
| Saved boards | `useThreads` + a durable `AgentRunner` |

**The board is a constrained diagram, not a freeform canvas.** Nine known states with known
shapes — frame, tree, cards, bar, boxes-and-arrows, expansion, overlay. That's what makes it
buildable as declarative layout driven by agent state, and it's why the agent can draw it
reliably. A general-purpose drawing surface would be a much larger product and a much worse
one for this job.

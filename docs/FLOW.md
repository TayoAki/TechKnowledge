# The flow — 60 minutes, three areas, co-created

Three assessed areas plus depth and wrap, on **one 60-minute budget that spends down**. In
each segment the AI owns the **scaffold**, you own the **content**, and the AI **challenges**
what you put down.

Worked with the seat-utilisation ask. Schema: [`BRIEF_SPEC.md`](BRIEF_SPEC.md). Process:
[`FRAMEWORK.md`](FRAMEWORK.md).

## The division of labour

> **The AI draws the frame. You fill it. The AI pushes back.**

If the AI fills the board you learn nothing usable in a room where nobody fills it for you.
If it stays silent you're drawing alone. The pushback is the product.

It also reaches two rubric dimensions a finished document can't. **Collaboration** and most
of **user empathy** are properties of a live exchange — co-creating rehearses the exchange
directly, so both become observable. Six servable dimensions instead of four, with the
caveat enforced in the schema: only in pair posture.

### Three postures, per segment

| Posture | Who fills it | Use when |
|---|---|---|
| **Pair** *(default)* | You lead, AI challenges and offers gaps you accept or reject | Practising — where doing it yourself *is* the skill |
| **Draft** | AI fills, you edit | Wrap, and when you're short on time |
| **Blank** | You fill, AI silent until asked | Self-testing, and forced in `drill_20` |

## The clock

```
◷ 60:00 ── total remaining 41:48 ────────────────── debt +3:12 ⚠
┌──────────────────┬──────────────┬─────────┬──────────┬────┐
│ ① DECOMPOSITION  │ ② ARCH+GOV   │ ③ MVP   │  DEPTH   │ WR │
│ 18m  ▓▓▓▓▓▓▓▓░░  │ 15m          │ 10m     │  15m     │ 2m │
│ 21:12 elapsed ⚠  │              │         │          │    │
└──────────────────┴──────────────┴─────────┴──────────┴────┘
                     ↑ shrinks as area ① overruns
```

**Overrun is borrowed, not absorbed.** Spend 25 minutes in area 1 and you have 35 left for
four segments — and the later blocks visibly narrow. Independent per-section stopwatches
would hide the exact failure this is meant to teach: burning half the hour on requirements
and never reaching the application layer.

`overranBy` is recorded and never corrected. Running long is a scored signal.

**Presets:** `full_60` (default) · `short_45` · `openai_40` (10 / 20 / 10, sets present-back
mode) · `drill_20` (fast pass to make the framework automatic — too short for a
challenge-and-respond cycle, so it runs blank and critiques at the buzzer) · `study`
(untimed).

Going back is always allowed. Revisiting a decision when new information arrives is a
positive signal, and the clock keeps running — which is the honest cost.

## The coverage meter

Always on screen, spanning all three areas. **Breadth in both tracks, depth in one.**

```
DATA ENG    pipelines ✓   quality ✓   ingestion ✓   schema evolution ○   ← breadth 3/4 ✓
FULL STACK  app arch ✓    UX ○        API ✓         front/back ○         ← breadth 2/4 ✗
                                                    depth ▸ DATA ENG ▓▓▓▓▓
```

Depth in one track does **not** excuse absence in the other — the bar is both-plus-one. So
gaps get their own challenges, and the two most-skipped topics get the loudest: *"nothing
here says what happens when the source schema changes"* and *"who looks at this, and on
what screen?"*

The depth track you claim and the deep dive you run must be the same one. Claiming data
engineering and then going deep on API design fails validation.

### The challenge library

The cheap part of the build, and most of the felt value: **the validators are the dialogue.**
Every invariant in `BRIEF_SPEC.md` fires as a silent regeneration check on the auto-build
path, and as a question to you in pair mode.

| Challenge | Fires when |
|---|---|
| Named-vs-actual | Stakeholder = the entity the prompt named |
| Ask-for-it | A useful resource isn't in the given set |
| Workaround gap | Pain point set with no `today` |
| Restated reframe | Sharpened ≈ broad |
| Same-axis options | Two options optimise for one thing |
| Goodhart | A primary metric with no guardrail |
| Exogenous gap | No entity for calendar, weather, events |
| **Schema drift** | No entity carries a `schemaChangeRisk` |
| Requirement orphan | A component tagged to nothing |
| Scope creep | A third functional requirement |
| **Dead end** | No component at the application layer |
| Over-engineering | Component heavier than the scale read |
| Unowned check | A data-quality check with no owner |
| Cut-line bloat | The MVP contains every component |
| Bottleneck denial | All three bottlenecks called negligible |

---

## ① Problem Decomposition · 18 min

**Frame** *(≈2 min)* — AI draws three empty boxes: STAKEHOLDER, RESOURCES, TIME. You type
"the cinema chain" → *"That's who's asking. Who changes what they do on Monday morning?"*
Your first answer stays struck through above the revision. Then *"the prompt named no data
at all — what would you want, and what would you ask for?"*

**Pain point** *(≈7 min)* — AI draws the tree rooted at your stakeholder. It asks the
workaround question every time: *"What does the scheduler do about this today?"* **You write
the reframe yourself** — in pair posture the AI only tells you when yours is the original
sentence reworded. When you land it, it replaces the ask at the top of the board:

> ~~seat utilisation is low~~ → **the scheduler can't test a proposed grid before publishing**

**Options** *(≈4 min)* — you propose; *"A and B both optimise for visibility — what's a
different bet?"* Stop at two and a **ghost card** appears, marked AI-added.

**Metrics** *(≈3 min)* — the `Metric | Baseline | Target | Guardrail` grid, empty. You fill
it. Every primary metric with an empty guardrail triggers: *"if someone optimised load
factor hard, what breaks?"* → total admissions, because you can always improve a ratio by
cutting showings. Baselines are allowed to be `must_measure_first`; "I'd need eight weeks of
history" is a strong answer, not a gap.

**Entities** *(≈2 min)* — you write the grain sentence first (*one row per showing*), then
place entities. Challenges: the exogenous gap, and the schema-drift one that feeds the
data-engineering track.

## ② Architecture & Governance · 15 min

**Requirements first.** F1, F2, NF1, NF2 — and a third functional triggers *"that's F3.
Either it's out of scope, or area 1 was too generous."*

**Then components, one at a time**, and per box: *"which requirement does this satisfy?"*
No answer → it glows red and stays red. An orphan box either doesn't belong or reveals a
requirement you never wrote down.

```
CSV drop ──▶ landing ──▶ aggregation ──▶ API ──▶ scheduler's view
  [F1]        [F1]          [F1]        [F2]        [NF1] ← application layer
                  ▲
            capacity ref  ← ghost box you accepted
              [F1]
```

**The application layer is not optional.** Area 2 asks for ingestion *through to where end
users interact*, so a board that stops at a curated table triggers the dead-end challenge:
*"who looks at this, and on what screen?"* This is also where the full-stack track earns its
breadth.

**Governance is the second half of the segment**, not a footnote — four sub-panels for data
quality, security, scaling, monitoring. Each quality check needs a threshold **and an
owner**; a check with no owner never runs. Saying "no PII in scope here" is a real answer
and removes a whole compliance surface.

## ③ Product Definition · 10 min

**You draw a line through area 2's diagram.** Everything inside ships in the window;
everything outside is deferred with a blocker. That's why this segment is only 10 minutes —
the design already exists, so the cut is fast.

```
CSV drop ──▶ landing ──▶ aggregation ┃──▶ API ──▶ scheduler's view
                             ╵        ┃    ····      ············
            capacity ref ────╯        ┃   deferred: blocked on the
                                      ┃   manual version proving useful
                            MVP CUT ──┛
```

A cut line containing every component isn't a cut, and triggers a challenge. Then the
week-bar: three lanes — coordination, integration, rollout. *"You've sized integration at
nothing. Is there a documented POS export API?"* There isn't; the lane grows to two-thirds
and the board writes the narration, because silent reasoning scores nothing.

## Depth · 15 min

You pick the area and lead. **Here the AI stops collaborating and probes**, scoped to this
one segment — which is what the round does. It must be within your claimed depth track.

*Present-back mode instead:* the board flips to the customer view, and every blocklisted
term is flagged as you type.

## Wrap · 2 min · *draft posture*

Next MVPs ranked blocker-then-impact, the kill criterion, requirement-change chips. Then the
self-check across all six dimensions, with `collaboration` scored from ghost boxes rejected
*with a reason* versus accepted silently — collaboration is not compliance.

---

## How it's built

| Need | Primitive |
|---|---|
| Board state, streaming | `useAgent()` → `agent.state` |
| Segment gates, ghost accept/reject | `useHumanInTheLoop` — pauses in `Executing`, resumes on `respond()` |
| Agent placing a ghost box or tagging one of yours | `useFrontendTool`, Zod params |
| **The agent seeing your board as you draw** | `useAgentContext({ description, value })` — load-bearing |
| Segment-appropriate nudges | `useConfigureSuggestions` |
| Saved boards, resume mid-segment | `useThreads` + durable `AgentRunner` |

**The clock is client-side state, not agent state.** It must keep running while a model call
is in flight, so it lives in the React tree and is *reported into* `useAgentContext` — never
driven by the agent. An agent-owned timer would stall on every request and quietly hand back
the minutes the segment was meant to cost.

**Cost shape.** Co-creation means the agent runs on board edits, not just messages. Two
tiers: a debounced `claude-haiku-4-5` watcher (~2s after you stop editing) for the structural
challenges — orphan box, same-axis options, scope creep, missing owner — and one
`claude-opus-5` reviewer per segment exit for the judgment calls: is the reframe real, does
the cut line actually ship, does the design match the scale read. Five Opus calls a session,
with the cheap model absorbing the chatter.

**Challenge budget.** An AI questioning every box becomes noise. Cap per segment, never
repeat a dismissed challenge, and stay quiet once the board is sound.

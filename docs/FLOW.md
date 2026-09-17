# The flow — phases, and co-creating the architecture

Eight phases you advance through deliberately. In each one the AI owns the **scaffold**, you
own the **content**, and the AI **challenges** what you put down.

Worked with the seat-utilisation ask. Layers: [`BRIEF_SPEC.md`](BRIEF_SPEC.md). Process:
[`FRAMEWORK.md`](FRAMEWORK.md).

## The division of labour

> **The AI draws the frame. You fill it. The AI pushes back.**

This is the whole design. If the AI fills the board you learn nothing and can't use it in a
room where nobody fills it for you. If the AI stays silent you're just drawing alone. The
value is in the third move — the pushback — and that's what a solo whiteboard can't give you.

It also fixes a gap I'd previously called unfixable. Two of the six scored dimensions,
**collaboration** and most of **user empathy**, are properties of a live exchange: no
document can prepare them. Co-creating means you're rehearsing them directly. That takes the
product from four servable dimensions to six.

### Three postures, per phase

| Posture | Who fills it | Use when |
|---|---|---|
| **Pair** *(default)* | You lead, AI challenges and fills gaps you accept | Practising. The phases where doing it yourself *is* the skill |
| **Draft** | AI fills, you edit | The mechanical phases — follow-ups, talk track — and when you're short on time |
| **Blank** | You fill, AI silent until asked | Self-testing. Reveal-and-diff at the end |

Default is **pair** for phases 1–6 and **draft** for 7–8. A "fill this for me" escape hatch
on every phase, because sometimes you're studying, not training. The blank-mode feature I'd
planned separately is just the third posture — same mechanic, no extra machinery.

### The challenge library

Here's the part that makes this cheap to build: **the validators become the dialogue.** Every
invariant in `BRIEF_SPEC.md` was written as a silent regeneration check. In pair mode the
same rule fires as a question to you instead.

| Challenge | Fires when | Roughly |
|---|---|---|
| Named-vs-actual | Stakeholder = the entity the prompt named | "That's who's asking. Who has to change what they do?" |
| Ask-for-it | A useful resource isn't in the given set | "Would contract terms help? You're allowed to ask." |
| Workaround gap | Pain point set with no `today` | "What do they do about this now?" |
| Restated reframe | Sharpened ≈ broad | "That's the same sentence. What specifically is failing?" |
| Same-axis options | Two options optimise for one thing | "Those both optimise for visibility. What's a different bet?" |
| Alternative | You've offered fewer than 2 real options | Adds a ghost card, marked AI-added |
| Bottleneck denial | All three bottlenecks called negligible | "A week always costs something. Is there a documented API?" |
| Requirement orphan | A component tagged to nothing | Box glows red — "what does this satisfy?" |
| Scope creep | A third functional requirement | "That's F3. Either it's out of scope, or phase 4 was too generous." |
| Over-engineering | Component heavier than the scale read | "At ~7,000 rows, does this need a queue?" |
| Goodhart | A metric set with no guardrail | "If someone optimised that hard, what breaks?" |

One rule set, two delivery modes. Nothing is maintained twice.

---

## The phase bar

Always on screen:

```
① frame ─ ② pain ─ ③ options ─ ④ MVP ─ ⑤ arch ─ ⑥ depth ─ ⑦ next ─ ⑧ review
                              ▲ 4:12 / 5:00        posture: pair ▾
```

Elapsed against the step's budget, because time allocation is itself scored. **Going back is
always allowed** — revisiting an earlier decision when new information appears is a positive
signal, not a correction, so the bar never locks a phase behind you.

## ① Frame · 1–2 min

**AI draws:** three empty boxes — STAKEHOLDER, RESOURCES, TIME — and an empty question rail.

**You fill:** who you're building for, what you've got, how long you have.

**AI challenges:** you type "the cinema chain" → *"That's who's asking. Who actually changes
what they do on Monday morning?"* You revise to the scheduler; the board strikes through your
first answer and keeps it visible. Then: *"The prompt named no data at all — what would you
want, and what would you ask for?"* And: *"No time bound. That's a question, not an
assumption."*

**Ends when:** all three hold a value or an explicit question. Unknowns leave as amber chips,
which is correct — they become your opening questions.

## ② Pain point · 5–8 min

**AI draws:** a tree rooted at your stakeholder, branches empty.

**You fill:** candidate pain points. Pick one.

**AI challenges:** the workaround question, every time, because it's the highest-leverage
question in the round — *"What does the scheduler do about this today?"* You answer: copies
last week's grid, adjusts by gut. *"So where does the time actually go — the analysis, or
something else?"*

**You write the reframe yourself.** The AI will not write it for you in pair mode; it only
tells you when yours is still the original sentence in different words. When you land it, the
new statement replaces the original ask at the top of the board:

> ~~seat utilisation is low~~ → **the scheduler can't test a proposed grid before publishing**

**Ends when:** sharpened ≠ broad, and you've said what it changes downstream.

## ③ Options · 5 min

**AI draws:** empty card slots.

**You fill:** your solution options — what each optimises for, what it uses.

**AI challenges:** *"A and B both optimise for visibility — what's a genuinely different
bet?"* If you stop at two, it adds a **ghost card** marked AI-added, so you always know what
was yours. And: *"Does any of these need something we weren't given?"* — which is how the
dashed-box resource ask gets drawn.

**Ends when:** you pick one and say why. Rejected cards dock to the margin; hover shows the
board they'd have produced.

## ④ MVP · 5 min

**AI draws:** your time bound as an empty bar with three lanes — coordination, integration,
rollout.

**You fill:** drag each lane's size. Name the tech debt you're taking.

**AI challenges:** *"You've sized integration at nothing. Is there a documented POS export
API?"* You check: there isn't. The lane grows to two-thirds of the bar and the board writes
the narration line, because reasoning silently scores nothing.

**Ends when:** all three costed, at least one non-negligible, deferred items below the line
with their blockers.

## ⑤ Architecture · the co-creation centrepiece · 5 min

This is the phase the whole design is for.

**AI draws:** an empty requirements corner and an empty canvas.

**You fill:** requirements first — F1, F2, NF1, NF2. Then you place components, one at a time.

**AI challenges, per box:**

- *"Which requirement does this satisfy?"* No answer → the box glows red and stays red. An
  orphan box either doesn't belong or reveals a requirement you never wrote down.
- *"You have nothing producing the denominator for F1."* → offers a **ghost box** (capacity
  reference). You accept or reject; accepted ghosts stop being ghosts.
- *"At ~7,000 rows, does the aggregation need a queue?"* → over-engineering, checked against
  the scale read you established.
- You type a third functional requirement → *"That's F3. Either it's out of scope, or phase 4
  was too generous — want to go back?"* The fix is upstream, and the bar lets you.

```
CSV drop ──▶ landing ──▶ aggregation ──▶ report
  [F1]        [F1]          [F1]         [NF1]
                  ▲
            capacity ref        prediction fn ──▶ what-if reply
           [F1] ← ghost,         [F2]                [F2]
              you accepted
```

**Ends when:** every box carries a requirement tag and the flow connects end to end.

## ⑥ Depth, or the customer view · 15 / 10 min

You pick the area and you lead. **Here the AI stops being a collaborator and probes** —
scoped to this one phase, which is exactly what happens in the round.

*Deep dive:* your chosen box expands in place. The AI asks the probes a real interviewer
would (*"how do you handle refunds that land after the showing?"*) and tells you when an
answer hand-waves.

*Present-back:* the board flips to the customer view. You write the summary; the AI flags
every term from the jargon blocklist as you type, since de-jargoning is the layer's whole
purpose.

## ⑦ Next · 5 min · *draft posture*

**AI drafts**, you reorder — ranking by blocker-then-impact is mechanical once the content
exists, so there's no skill being practised. Requirement-change chips appear; click one and
only the affected components light up.

## ⑧ Review

The talk track rail, the export, and a self-check across **all six** dimensions — including
the two that only co-creation can evidence:

| Dimension | Evidenced by |
|---|---|
| Ambiguity handling | What you triaged unprompted vs. what the AI had to ask for |
| User empathy | Whether you asked the workaround question or waited to be asked |
| Outcome orientation | Whether your components traced to requirements first time |
| Scrappy | Whether you cut before or after being challenged |
| Technical depth | How many probes you answered without hand-waving |
| **Collaboration** | Ghost boxes accepted vs. rejected with a reason; challenges you engaged vs. absorbed silently |

That last row is only measurable because you built it together. Rejecting a ghost box *with
a reason* scores higher than accepting it — collaboration is not compliance.

---

## How it's built

| Need | Primitive |
|---|---|
| Board state, streaming | `useAgent()` → `agent.state` |
| Phase gates, ghost-box accept/reject | `useHumanInTheLoop` — pauses in `Executing`, resumes on `respond()` |
| Agent placing a ghost box or tagging one of yours | `useFrontendTool`, Zod params, handler mutates board |
| **The agent seeing your board as you draw** | `useAgentContext({ description, value })` — the load-bearing one |
| Phase-appropriate nudges | `useConfigureSuggestions` |
| Saved boards, resume mid-phase | `useThreads` + durable `AgentRunner` |

### The reactive loop, and its cost

Co-creation means the agent runs on **board changes**, not just your messages — which is a
different cost shape from the auto-build flow. Two tiers:

- **Watcher** — `claude-haiku-4-5`, debounced ~2s after you stop editing. Cheap, fires the
  narrow challenges (orphan box, same-axis options, scope creep). These are near-deterministic
  checks on structure, so they don't need a large model.
- **Reviewer** — `claude-opus-5` on phase-exit, once. Judges the things that need judgment:
  is the reframe real, is the MVP actually shippable, does the design match the scale read.

Without the split, every keystroke pays Opus prices. With it, the expensive model runs eight
times per session and the cheap one absorbs the chatter.

**The board stays a constrained diagram** — eight known shapes, not a freeform canvas. That's
what lets the agent read your board reliably enough to challenge it. You cannot write
"which requirement does this satisfy?" against arbitrary shapes on an infinite canvas.

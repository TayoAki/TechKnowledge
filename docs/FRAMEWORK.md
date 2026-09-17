# The process model

The canonical spec the generator follows. Every brief is an instance of this, and the
validators in [`BRIEF_SPEC.md`](BRIEF_SPEC.md) are assertions against it.

Reference: Exponent's FDE course (decomposition lessons and rubric), plus Palantir's public
guidance on open-ended questions. **We encode the process; we don't redistribute the source
text.** Our rubric descriptors and all scenario content are written from scratch — see
§Provenance.

## What a decomp prompt is

A decomp prompt asks you to design a solution **for a stakeholder, using given resources,
within a time bound**. Three elements, and identifying them is the first move:

| Element | Why it matters | Failure mode |
|---|---|---|
| **Stakeholder** | Points at the pain point, and therefore shapes the whole solution | Taking the *named* entity as the stakeholder |
| **Resources** | What you're allowed to build with — data sources, technologies | Assuming the listed set is the complete set |
| **Time bound** | Forces a real MVP rather than a wish list | Designing a production system for a one-week window |

**The stakeholder is frequently not the entity named in the prompt.** "A major city wants to
reduce 911 response times" names the city; the stakeholder is the emergency response units.
Getting specific here is what makes the pain point concrete, so the triage layer models
`namedEntity` and `actualStakeholder` as separate fields and shows the gap.

Prompts vary in how much they spell out. A tidy one gives all three; most give one or two.
**Whatever is missing becomes an opening question** — that's not a gap in the brief, it's
the brief's first output.

## The six steps

Time budgets are for a 45–60 minute round.

| # | Step | Budget | What it produces |
|---|---|---|---|
| 1 | **Clarify the constraints** | 1–2 min | Stakeholder, resources, time bound — confirmed out loud, not assumed |
| 2 | **Understand the stakeholder** | 5–8 min | The primary pain point, *and how they handle it today* → a sharpened problem |
| 3 | **Brainstorm the solution** | 5 min | 2+ options against the resources; ask for resources not listed |
| 4 | **Scope the MVP** | 5 min | What ships in the window, what defers and why |
| 5 | **Design the high-level system** | 5 min | Capped requirements, a scale read, components mapped to requirements |
| 6a | **Go deep on one area** | 15 min | Depth in one vertical — Palantir, Databricks |
| 6b | **Present back to the customer** | 10 min | De-jargoned summary, key trade-offs, next steps — OpenAI |

Four things in this ordering are easy to get wrong, and each is worth a validator:

**Step 2 is the highest-leverage step, and the lever is the current workaround.** Asking
what the stakeholder does *today* is what converts a broad complaint into a targeted
problem. If dispatch is already fast and the delay is travel time in traffic, then
"response times are too slow" becomes "cut ambulance travel time after dispatch" — and
that reframe changes every downstream decision. A brief without a current-workaround field
cannot produce this, so the schema requires one.

**Step 3 should reach for resources that weren't offered.** If the better solution needs
live video feeds and the prompt never mentioned them, the move is to ask, not to silently
discard the idea. A no costs nothing; a yes expands the resource set. So each solution
option carries `requiresUnlistedResource` and the exact question to ask for it.

**Step 4 comes *before* step 5.** Scope first, then design only what you scoped. Designing
the full system and then trimming produces an MVP that's a shrunken architecture rather
than a deliberate slice.

**Step 4's bottleneck is not build time.** With AI assistance, writing core logic or a
simple interface is often the cheap part. What actually consumes a one-week window:

- **Coordination** — how many teams must be looped in before you can move
- **Integration** — is there a documented API, or do you build a connector and chase access
- **Rollout** — how does this reach the field, especially on offline devices

These get named and estimated explicitly, because the reasoning is what's being scored.
Reasoning silently and presenting only the final scope gives the interviewer nothing to
evaluate. The brief therefore carries a narration line per bottleneck, not just a number.

**Step 5 caps requirements at 1–2 functional and 1–2 non-functional.** More than that means
step 4 under-scoped, so the cap is a hard validator rather than a guideline. Every component
in the design must map to a requirement it satisfies; a component that maps to nothing is
either unnecessary or evidence of a missing requirement.

On scale: the prompt usually carries a qualitative prior — "a major city", "an internal tool
for one team" — which is often enough to rule out expensive architectures without any
arithmetic. A back-of-envelope number earns its place only when the prior leaves a genuine
design fork open. The brief records the prior, and whether a number is actually needed.

## Step 6 is two different rounds

The ending differs by company, and it changes what the brief needs to prepare.

**6a — deep dive** (Palantir, Databricks). The interviewer probes one area, and you can
steer which. Choose by, in priority order: (1) a stated specialization for the role — an AI
role means the AI component, and this overrides everything else; (2) otherwise the most
complex or important part of the design; (3) otherwise wherever your own depth is. Then say
which and why, and ask to proceed. This is reportedly the best place in the loop to show a
spike, so the brief prepares depth in a chosen area rather than even coverage.

**6b — customer present-back** (OpenAI, and customer-engineering-leaning loops; roughly
10 min scoping / 20 min whiteboarding / 10 min present-back). Not a technical spike — a test
of whether it lands for a non-technical stakeholder. Three things, in order: what they can
now do that they couldn't before (in their words, no jargon — "a way to search past cases by
meaning, not just keywords", not "a vector store"); the one or two trade-offs that most
shaped the solution; and what ships next and what you need from them. Concise, not a recap.

The brief generates whichever the user's target company uses, and can generate both.

## Follow-ups the brief should pre-answer

Two come up reliably, and both are cheap to precompute — which makes them ideal cheat-sheet
material:

- **"What ships next?"** The deferred list from step 4, plus anything surfaced during the
  deep dive. Ranked by **blockers first, then impact** — a high-impact item can't be
  sequenced ahead of the thing it depends on. This is also where the feedback loop belongs:
  outcomes from the field flowing back into the model.
- **"Let's change a requirement."** Tests whether you can trace a requirement change through
  to a concrete design change. Usually it's swapping or adding one or two components, with
  everything upstream untouched. Losing connectivity at the dispatch centre adds a local
  cache at the serving layer; the scheduled job and the model don't change. The brief
  war-games two or three plausible changes in advance.

## The rubric

Six dimensions, each scored **strong no hire / no hire / hire / strong hire**. Descriptors
below are ours; the dimension set is the course's.

| Dimension | What it rewards | The distinctive failure |
|---|---|---|
| **Ambiguity handling** | Bringing definition to a vague problem — stakeholder, pain point, resources, timeline confirmed before designing | Treating the vagueness as an error in the question rather than the substance of the test |
| **User empathy** | Pulling the thread until the real bottleneck surfaces, not the first plausible one | Curiosity that stops at the presenting symptom |
| **Outcome orientation** | Every design choice tied back to what success means for the stakeholder | Optimising something technically impressive that nobody asked for — shaving latency without saying why it matters |
| **Scrappy** | A genuinely shippable first slice, with deferrals and deliberate tech debt named | An "MVP" that is still too large for the window, or a production-grade system from the start |
| **Technical depth** | Real depth in at least one area that holds up under probing | Even, shallow coverage everywhere; buzzwords instead of mechanism |
| **Collaboration** | Using the interviewer as a thought partner — picking up cues, folding in their input | Treating them as an examiner or an audience; working silently |

Two of these — **collaboration** and much of **user empathy** — are properties of a live
exchange rather than of an artefact. A brief handed to you finished cannot supply them; it
can only prepare the questions that make them possible.

**Co-creating the board reaches them anyway.** When you build the architecture with the AI
pushing back, you are rehearsing the exchange itself, so both become observable: whether you
asked the workaround question before being prompted, whether you engaged a challenge or
absorbed it silently, whether you rejected a suggestion *with a reason*. See
[`FLOW.md`](FLOW.md). The honest caveat is that this only holds in **pair** posture — a
session run in draft posture has not exercised them, and the self-check reports them as not
exercised rather than scoring them.

## Provenance

The process above is a factual description of how this interview round works, drawn from a
paid third-party course the user has access to. Two rules for the product:

1. **Never ship the source text.** No lesson prose, no rubric descriptors, no worked
   narration copied through into briefs, prompts, marketing, or domain packs. Our rubric
   wording above is original and is the version the product uses.
2. **Never ship their prompt bank.** Scenario and example content is generated from our own
   taxonomy. Reusing a competitor's paid question list is both a legal problem and a bad
   product — the value is in decomposing *the user's own* vague ask.

Worth a lawyer's hour before launch, and worth keeping the reference list in-repo so the
provenance of each idea stays traceable.

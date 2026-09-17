# Decomp — paste a vague ask, get a defensible roadmap

Give it the kind of under-specified request a client, an exec, or an interviewer actually
hands you:

> "We want to analyze seat utilization and recommend better showtimes."

It walks that down to a concrete objective, a metrics table **with guardrails**, a data
model, an end-to-end architecture, and a ruthlessly cut MVP — presenting the two to four
legitimate ways to go at every layer, recommending one with a reason, and keeping the paths
you didn't take visible.

Not a simulator, not a grader. The thing you work *through*.

Built on [CopilotKit](https://www.copilotkit.ai/) — the decision gates are
`useHumanInTheLoop`, the brief is streamed shared state — and the Claude API for
layer-by-layer generation.

## Docs

| Doc | What's in it |
|---|---|
| [`docs/WORKED_EXAMPLE.md`](docs/WORKED_EXAMPLE.md) | **Start here.** A full brief for the seat-utilisation ask. The clearest statement of what this product is, and the quality bar for generated output. |
| [`docs/FLOW.md`](docs/FLOW.md) | The flow, phase by phase — how you and the AI co-create the board, the three postures, and the challenge library |
| [`docs/FRAMEWORK.md`](docs/FRAMEWORK.md) | The process model the generator follows — the three elements, the six steps, the two company endings, the rubric, and the provenance rules |
| [`docs/PLAN.md`](docs/PLAN.md) | Product and operating plan — interaction model, CopilotKit architecture, generation pipeline, domain packs, economics, milestones, risks |
| [`docs/BRIEF_SPEC.md`](docs/BRIEF_SPEC.md) | The `DecompositionBrief` schema and the invariants a generated brief must satisfy |
| [`docs/deferred-SIMULATOR_SPEC.md`](docs/deferred-SIMULATOR_SPEC.md) | Deferred: the adversarial-interviewer mode, kept as act two |

## What a brief contains

Three assessed areas on a **60-minute budget that spends down**, plus depth and wrap.
Overrun in one area visibly eats the others — independent stopwatches would hide the exact
failure this teaches.

| Segment | Min | Covers |
|---|---|---|
| **① Problem Decomposition** (Business & Data) | 18 | Stakeholder triage · pain point and reframe · solution options · success metrics with guardrails · constraints · data entities |
| **② Architecture & Governance** | 15 | Requirements · scale read · components ingestion→application layer · data quality, security, scaling, monitoring |
| **③ Product Definition** (Scoping & MVP) | 10 | The MVP as a **cut line through ②'s diagram** · coordination/integration/rollout bottlenecks · tech debt · next MVPs |
| **Depth** | 15 | Deep dive in your claimed track, or the customer present-back |
| **Wrap** | 2 | Requirement-change war-games, kill criterion, self-check |

Cutting across all three — **breadth in both tracks, depth in exactly one:**

| Track | Topics |
|---|---|
| **Data Engineering** | pipelines · data quality · ingestion patterns · schema evolution |
| **Full Stack Engineering** | application architecture · UX · API design · frontend/backend interaction |

Coverage is tracked live. Depth in one track doesn't excuse silence in the other, so gaps get
challenged — *schema evolution* and *UX* loudest, being the two most commonly skipped.

## Status

Planning — nothing is built. Start at **M0** in `docs/PLAN.md`: one week, no UI, ten briefs
generated and read against the worked example. The only question that matters first is
whether the guardrails and entities come out domain-specific or generic.

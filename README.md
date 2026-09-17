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
| [`docs/PLAN.md`](docs/PLAN.md) | Product and operating plan — interaction model, CopilotKit architecture, generation pipeline, domain packs, economics, milestones, risks |
| [`docs/BRIEF_SPEC.md`](docs/BRIEF_SPEC.md) | The `DecompositionBrief` schema and the invariants a generated brief must satisfy |
| [`docs/deferred-SIMULATOR_SPEC.md`](docs/deferred-SIMULATOR_SPEC.md) | Deferred: the adversarial-interviewer mode, kept as act two |

## The three competency areas it covers

| Area | What the brief produces |
|---|---|
| **Problem Decomposition (Business & Data)** | Concrete objective from a vague ask, success metrics with guardrails, constraints and labelled assumptions, the data entities that power the solution |
| **Architecture & Governance** | Ingestion through to the application layer where the end user actually decides something — plus data quality, access, scaling, monitoring |
| **Product Definition (Scoping & MVP)** | The thinnest slice that proves value, the cuts with their reasons, and a kill criterion |

## Status

Planning — nothing is built. Start at **M0** in `docs/PLAN.md`: one week, no UI, ten briefs
generated and read against the worked example. The only question that matters first is
whether the guardrails and entities come out domain-specific or generic.

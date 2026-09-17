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
| [`docs/FRAMEWORK.md`](docs/FRAMEWORK.md) | The process model the generator follows — the three elements, the six steps, the two company endings, the rubric, and the provenance rules |
| [`docs/PLAN.md`](docs/PLAN.md) | Product and operating plan — interaction model, CopilotKit architecture, generation pipeline, domain packs, economics, milestones, risks |
| [`docs/BRIEF_SPEC.md`](docs/BRIEF_SPEC.md) | The `DecompositionBrief` schema and the invariants a generated brief must satisfy |
| [`docs/deferred-SIMULATOR_SPEC.md`](docs/deferred-SIMULATOR_SPEC.md) | Deferred: the adversarial-interviewer mode, kept as act two |

## What a brief contains

Nine layers, following the decomp round's own step order — note that **MVP scoping comes
before high-level design**, which is what separates a deliberate slice from a shrunken
architecture.

| Layer | Output |
|---|---|
| **Triage** | The entity the prompt names vs. the actual stakeholder, resources given **and worth asking for**, the time bound — and the opening questions for whatever's missing |
| **Pain point** | Candidates, the one to pursue, what they do today, and the reframe from broad complaint to targeted problem |
| **Solutions** | 2–4 options optimising for different things, including any that need a resource the prompt never offered, and how to ask for it |
| **MVP scope** | What ships in the window, costed against coordination / integration / rollout — not build time |
| **Design** | 1–2 functional and 1–2 non-functional requirements, a scale read, every component mapped to a requirement |
| **Deep dive** *or* **present-back** | Depth with pre-answered probes (Palantir, Databricks), or a de-jargoned customer summary (OpenAI) |
| **Follow-ups** | Next MVPs ranked by blocker then impact, plus requirement-change war-games |
| **Self-check** | The rubric dimensions a document can genuinely prepare — and the two it can't |
| **Talk track** | The 45-minute runsheet, timed to the steps |

## Status

Planning — nothing is built. Start at **M0** in `docs/PLAN.md`: one week, no UI, ten briefs
generated and read against the worked example. The only question that matters first is
whether the guardrails and entities come out domain-specific or generic.

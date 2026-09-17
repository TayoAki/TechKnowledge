# Decomp — decomposition interview practice, generated and graded

A SaaS that **generates** open-ended "decomposition" interview scenarios (the Palantir /
forward-deployed-engineer open-ended round), **conducts** them live as an adversarial
interviewer, and **grades** the transcript against a published rubric with evidence.

Built on [CopilotKit](https://www.copilotkit.ai/) for the agent↔UI layer (generative UI,
shared state, human-in-the-loop) and the Claude API for the three model roles.

## Why this round

The decomposition round eliminates more otherwise-qualified candidates than any other
stage in an FDE loop, and it is the hardest to prepare for: the problem is deliberately
under-specified, there is no model answer, and the thing being scored is *how you move*
rather than where you land. Solo rehearsal cannot reproduce live ambiguity, and a human
partner who knows the answer cannot withhold it convincingly.

## Docs

| Doc | What's in it |
|---|---|
| [`docs/PLAN.md`](docs/PLAN.md) | The product and operating plan — architecture, the three AI roles, generation pipeline, scoring, unit economics, milestones, risks |
| [`docs/SCENARIO_SPEC.md`](docs/SCENARIO_SPEC.md) | The `ScenarioSpec` schema — the public prompt and the hidden answer key that drives both the interviewer and the grader |

## Status

Planning. Nothing is built yet. Start at Milestone 0 in `docs/PLAN.md` — it deliberately
ships no UI, because the only question that matters first is whether the interviewer holds
its line and the grader discriminates.

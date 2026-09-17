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

## Two modes

**Pair-design** — paste a vague ask and co-create the board across three assessed areas on a
60-minute clock. The AI draws the scaffold, you fill it, it pushes back.

**Guess the Architecture** — twenty questions against the design space. The AI asks in plain
business language, every answer eliminates candidate architectures, and any component shared
by every survivor is already certain, so the board fills itself in as it narrows. No ask
required, and you don't need to know the answer to play.

```
40 architectures -> 16 -> 8 -> 4 -> 2 -> 1     (five questions)
```

Questions are ordered by information gain — the most balanced split first — which is why it
converges in about five rather than one-per-fork. Question wording is checked against a
jargon blocklist in CI: "is this a deadline or does someone watch it continuously?" is
answerable without knowing the architecture, "batch or streaming?" is not. Translating the
first into the second is the thing the round actually tests.

## Running it

```bash
npm install --legacy-peer-deps      # see the note below
cp .env.example .env.local          # add an ANTHROPIC_API_KEY
npm run dev                         # http://localhost:3000
```

```bash
npm run verify                      # typecheck + 96 tests + production build
npm run smoke                       # browser smoke test (needs a running server)
```

The board, clock and coverage meter work without an API key; only the pair
partner needs one.

**Install note.** `@copilotkit/runtime` pulls in `@copilotkit/channels-intelligence`,
which publishes `vitest` as a *peer dependency*. That crashes npm's dependency
resolver outright (`Cannot read properties of null (reading 'edgesOut')`), so
`--legacy-peer-deps` is required — and because that skips peers, `vite` is
installed explicitly for vitest to run. TypeScript is pinned to 6 because
Next 15 rejects TypeScript 7, and the `@` alias is set in `next.config.mjs`
rather than inferred from tsconfig paths, which webpack did not pick up.

## What's built

| Layer | State |
|---|---|
| `src/domain/` — clock, coverage, schema, validators, worked-example fixture | Complete, 96 tests |
| `app/api/copilotkit/` — runtime endpoint on `BuiltInAgent` | Complete |
| `src/agent/prompts.ts` — pair-partner prompt and per-turn context | Complete |
| `src/components/` — clock bar, coverage meter, frame, architecture + cut line, metrics grid, week bar, pushback rail | Complete |
| Export, threads/persistence, present-back panel | Not built |

The agent loop is wired but **unexercised** — running it needs an API key this
environment does not have. Everything else is verified by test or by browser.

### Two bugs the browser caught that the unit tests could not

Worth knowing, because both are the kind that hide behind green tests:

- **The clock was frozen.** Storing elapsed minutes rounded to 0.1 meant a
  one-second tick (0.0167 min) rounded to zero every time. 87 tests passed
  because they all ticked in whole minutes. Fixing the accumulator wasn't
  enough either — `minutesRemaining` was rounded the same way, so the display
  still sat at 60:00. State keeps full precision now; only the display rounds.
- **The pushback panel repeated itself.** A per-item rule (three unnarrated
  bottlenecks) printed the same sentence three times — exactly the challenge
  fatigue the plan warns about. Challenges are now deduped by code for display
  while the report keeps every instance.

## Status

Planning — nothing is built. Start at **M0** in `docs/PLAN.md`: one week, no UI, ten briefs
generated and read against the worked example. The only question that matters first is
whether the guardrails and entities come out domain-specific or generic.

# Decomp — product & operating plan

## 1. Thesis

Sell **repeatable exposure to live ambiguity**, graded.

Candidates preparing for an open-ended round have no way to practise the thing being
tested. Static question lists don't work, because the difficulty isn't the prompt — it's
that the interviewer withholds information and pushes back. A human practice partner can't
withhold convincingly once they've read the answer. An LLM can, *if* it is architected to.

The product is three capabilities, in dependency order:

1. **Generate** scenarios that are genuinely under-specified but still gradeable.
2. **Conduct** a 45–60 minute session as an interviewer who reveals only what is asked.
3. **Grade** the transcript against an explicit rubric, citing evidence.

(2) and (3) are what people pay for. (1) is what makes it a product instead of a demo,
because content is the thing that runs out.

## 2. The design problem to solve first

> "I'm thinking the AI will follow this process to a T."

Half right, and the half that's wrong is the whole product.

The six-step framework (restate/clarify → success & constraints → map inputs → decompose →
skeleton-then-deep → trade-offs & iterate) is **the candidate's job, not the interviewer's**.
An interviewer that follows it to a T narrates the structure the candidate was supposed to
supply, and the exercise collapses. The single most-scored signal — *did you scope before
solving* — is unmeasurable if the interviewer scopes for you.

So "follow it to a T" applies to two of the three roles and is actively harmful in the third:

| Role | Follows the framework? | Objective |
|---|---|---|
| **Generator** | Yes, rigidly | Build a scenario whose hidden structure supports all six steps |
| **Interviewer** | **No — withholds it** | Stay vague, answer only what's asked, push back, never volunteer |
| **Examiner** | Yes, rigidly | Score the transcript against the rubric with cited evidence |

These three must be **separate model calls with no shared context**. If the interviewer also
grades, rapport leaks into the score and everyone gets told they did great.

### Process as state machine, not as prompt

The second failure mode is drift. Given the framework in a system prompt and 40 turns, a
model reliably: collapses phases, volunteers the answer when the candidate stalls, praises
everything, and loses the thread by minute 30.

The fix is that **the process lives in server-side state, and the model never owns phase
transitions.** Each turn the orchestrator resolves the current phase and hands the model a
narrow, phase-scoped instruction. Advancement is gated by exit criteria evaluated outside
the interviewer. The candidate cannot be advanced by the model deciding to be generous.

This is also what makes the UI good: the phase machine's state *is* the thing rendered as
the live progress rail, canvas, and rubric meter. CopilotKit's shared state makes that
a subscription rather than a sync problem.

## 3. Domain model

```
ScenarioSpec   public prompt + hidden answer key          (generated offline, versioned)
   └─ Session  one attempt: phase machine + transcript    (live, durable)
        ├─ Transcript   turns, each with a span id + timestamps
        ├─ Canvas       candidate's logic tree / workstreams / IPO map
        ├─ Reveals      which hidden constraints were unlocked, and by which question
        └─ Scorecard    per-signal level + evidence spans + misses   (post-hoc)
```

`ScenarioSpec` is the core IP and is specified in [`SCENARIO_SPEC.md`](SCENARIO_SPEC.md).
The short version: a scenario is *not* a prompt string. It is a small public half and a
large hidden half. The hidden half is what lets the interviewer be principled rather than
randomly evasive — it answers only from a fixed table of constraints, each with a
`reveal_trigger` naming the question that unlocks it.

## 4. The phase machine

Six phases, each with an entry instruction, exit criteria, and a soft time budget.

| # | Phase | Exits when | Budget |
|---|---|---|---|
| 1 | `RESTATE_CLARIFY` | Candidate paraphrased the problem **and** asked ≥2 questions that target goal/user/constraint | 5–8 min |
| 2 | `SUCCESS_CONSTRAINTS` | A named success metric **and** ≥1 hard constraint are on the record | 5–8 min |
| 3 | `MAP_INPUTS` | ≥3 concrete inputs named with owner/shape/freshness attached | 5–8 min |
| 4 | `DECOMPOSE` | 3–5 workstreams, non-overlapping, with a stated dependency order | 10–15 min |
| 5 | `SKELETON_THEN_DEEP` | A thin end-to-end path exists, **then** one component chosen for depth | 10–15 min |
| 6 | `TRADEOFFS_ITERATE` | ≥2 decisions each with two named options compared on ≥2 axes, plus ≥1 failure mode | 8–12 min |

Rules that make it behave like an interview rather than a checklist:

- **Exit criteria are evaluated by a cheap classifier, not the interviewer.** One
  `claude-haiku-4-5` call per turn returns booleans against the current phase's criteria.
  Deterministic and separable from the conversation.
- **Budget overrun does not force advancement.** Running long in phase 1 is itself a
  signal; the interviewer applies time pressure ("we have about 20 minutes left") and the
  examiner scores the allocation. Only a hard stop at the session limit ends it.
- **Skipping backwards is a positive signal.** Revisiting an earlier assumption when new
  information appears is rewarded, not penalised. The machine allows re-entry and records it.
- **Phase instructions are injected as mid-conversation system messages**, appended to
  `messages[]` rather than edited into the top-level `system` field. On `claude-opus-5` this
  preserves the cached prefix across every transition and is the injection-resistant
  operator channel — a candidate message cannot forge one.

## 5. The interviewer

One system prompt, frozen, cached. Per-turn variation comes from the phase instruction and
the reveal table, never from rewriting the prompt.

Hard constraints, stated as absolutes because they're what makes the product work:

- Never state a hidden constraint that has not been unlocked by its `reveal_trigger`.
- Never name a decomposition axis, workstream, or trade-off before the candidate does.
- Never evaluate ("good question", "exactly") — evaluation is the examiner's job and
  in-session praise both biases the candidate and teaches nothing.
- When the candidate stalls, escalate from the `probe_bank` — reframe, then narrow, then
  offer a choice of two directions. Never supply the content.
- Answer a direct factual question about the scenario truthfully and briefly. Evasion when
  *asked* is the failure mode that makes practice tools feel broken.

The last two are in tension and the tension is the craft: withhold what wasn't asked,
answer plainly what was. The reveal table is what keeps that consistent across sessions
instead of depending on the model's mood.

### Difficulty dial

One parameter, `pressure: 1–5`, controlling probe aggression, how literally reveal triggers
must be matched, and whether the interviewer volunteers time checks. Ship 3 as default,
expose the dial, and offer **coach mode** (interviewer breaks character to explain what it
was looking for, mid-session) as a distinct product surface from **exam mode**. Beginners
bounce off exam mode; experienced candidates find coach mode useless. Both are needed.

## 6. Scenario generation pipeline

This is where "follow best practices to a T" belongs, and it should not be one prompt.
A single generate call produces plausible-looking scenarios that quietly fail to
discriminate between a strong and a weak candidate — which is the only property that matters.

Six stages, all offline, all cheap:

**1. Seed from a taxonomy.** Sample a tuple rather than free-generating, or the model
collapses onto "build a data platform" every time:

| Axis | Values (starting set) |
|---|---|
| Domain | public sector, healthcare, finance, logistics, retail, manufacturing, energy, telecom |
| Org archetype | post-M&A conglomerate, single-site operator, regulated monopoly, high-growth startup, government agency |
| Data mess | inconsistent labels, no shared keys, 500 sources, real-time + batch mix, legacy mainframe, unlogged manual process |
| Problem class | root-cause diagnosis, resource positioning, unify-and-forecast, detect anomalies, agent/automation rollout, first-90-days scoping, low-level object design |
| Decision owner | frontline operator, analyst, exec, downstream ML system, external regulator |

Cross-product is ~8×5×6×7×5 ≈ 8,400 seeds. Content is not the bottleneck; *quality gating* is.

**2. Draft.** `claude-opus-5`, structured outputs (`output_config.format`) against the
`ScenarioSpec` schema, adaptive thinking, `effort: high`. One call, full spec.

**3. Validate deterministically.** Code, not a model. Reject on any of:
- Fewer than 3 hidden constraints, or two constraints sharing a `reveal_trigger`
- Fewer than 2 valid decomposition axes, or no axis marked weak (a scenario with only good
  splits has no landmine)
- Workstream graph is a chain or fully disconnected — it must be a real DAG with ≥1 fan-out
- Fewer than 2 trade-off pairs, or any pair missing a cost on either side
- Public prompt leaks a number, a metric name, or the true objective
- Public prompt is over ~80 words (long prompts specify the problem away)

**4. Adversarial critique.** A second call whose *only* job is to argue the scenario is
solvable as stated or has one obvious right answer. Reject if the argument lands.

**5. Discrimination gate — the eval that matters.** Run two synthetic candidates through
the full interviewer + examiner loop: one that follows the framework, one that jumps
straight to a solution and never scopes. If their scorecards aren't clearly separated, the
scenario doesn't discriminate and is rejected regardless of how good it reads.

**6. Publish** to the bank with difficulty, tags, and a spec version.

Stages 2–5 run through the **Message Batches API at 50% cost**, off the request path.
Generation is a nightly job, not a user-facing feature. Budget ~$1.50–4 of model spend per
*published* scenario after rejections, which is irrelevant against its reuse.

## 7. Scoring

Seven signals, each scored weak / adequate / excellent:

| Signal | Scored on |
|---|---|
| `scopes_before_solving` | Clarifying questions targeting goal, user, constraint **before** any design statement |
| `clean_decomposition` | Non-overlapping parts that together cover the problem; named, not gestured at |
| `failure_modes` | Breakage and degradation treated as first-class, ideally self-surfaced |
| `explicit_assumptions` | Assumptions stated *and labelled as such*, then revisited |
| `tradeoff_reasoning` | Two named options compared on cost / latency / complexity / maintainability |
| `structured_communication` | Structure survives as the problem grows; narrates approach, not every thought |
| `end_user_orientation` | Returns to who uses this and what decision it enables |

### Deterministic metrics first

Several signals are measurable in code, and code doesn't flatter anyone. Compute these
before any model call and feed them to the examiner as facts:

- `time_to_first_clarifying_question` and `time_to_first_solution_proposal` — the ordering
  and gap between these two is the sharpest available proxy for the top rejection reason
- `clarifying_questions_before_first_design_statement` (count)
- Phase time allocation vs. budget
- Depth/breadth ratio — turns spent on the deep-dive component vs. all others (catches
  polishing one box while the rest is untouched)
- Reveal efficiency — hidden constraints unlocked ÷ constraints available
- Longest silence, and count of gaps over 20s *(voice only — see §11)*

### Anti-sycophancy

The default failure of an LLM grader is that everyone scores well, which destroys the
product's only claim. Four mechanisms:

1. **Scenario-specific anchors.** The examiner scores against `rubric_anchors` written into
   that scenario's spec — what weak/adequate/excellent look like *here* — never against a
   general sense of impressiveness.
2. **Mandatory evidence.** Every level must cite transcript span ids. A level with no
   citation is rejected by the response validator and re-requested.
3. **Mandatory counter-case.** For every `excellent`, the examiner must also state what
   would have made it `weak`. Cheap, and it collapses reflexive top marks.
4. **Calibration set.** 5–10 human-graded transcripts per scenario archetype, re-run on
   every prompt or model change. Assert level agreement within one step and correct ordering
   between the strong and weak reference transcripts.

### Report

The value is the diff against the hidden spec, which no human practice partner can produce:
what the candidate surfaced, what was available and never unlocked, which landmines they
stepped on, and the trade-offs they asserted without alternatives. Plus an explicit pass
over the known rejection causes (jumped to a solution, skipped clarifying, never
decomposed, polished one component, stayed abstract, went silent, asserted one best answer,
ignored failure modes) as a checklist with evidence.

## 8. Architecture on CopilotKit

CopilotKit is the **agent↔UI layer**: generative UI, shared state, human-in-the-loop, and
multi-surface delivery. It is not the domain. The phase machine, scenario bank, examiner,
and eval harness are ours, and the framework choice must not be allowed to shape them.

Verified against CopilotKit `main` (`8f7c566`). The v2 hooks import from
`@copilotkit/react-core/v2` and take Zod schemas.

```
Next.js app ──► CopilotRuntime (Hono)  ──►  BuiltInAgent (claude-opus-5)
  useAgent            AgentRunner              ▲
  useAgentContext     (Sqlite → Postgres)      │ phase instruction injected per turn
  useFrontendTool                              │
  useHumanInTheLoop                    Orchestrator: phase machine,
  useConfigureSuggestions              reveal table, exit classifier
                                               │
                                       Examiner (separate call, no shared context)
```

| Need | Primitive |
|---|---|
| Interview chat | `<CopilotChat>` / `<CopilotPanel>` (`@copilotkit/react-ui`) |
| Live phase rail, timer, rubric meter | `useAgent()` → subscribe to `agent.state` and render in the main view |
| Candidate's canvas (logic tree, workstream board, IPO map) visible to the agent | `useAgentContext({ description, value })` |
| Interviewer writes to the canvas | `useFrontendTool` — Zod `parameters`, `handler` mutates canvas state |
| Structured reveal: constraint unlocked, shown as a card the candidate must acknowledge | `useHumanInTheLoop` — agent pauses in `Executing`, resumes on `respond()` |
| Phase-5 commitment gate ("which component are you going deep on?") | `useHumanInTheLoop` — forces an explicit choice on the record |
| Nudge chips when stalled | `useConfigureSuggestions` (dynamic, `available: "always"`) |
| Session list / resume | `useThreads` + a durable `AgentRunner` |
| Async drills in Slack / Teams | `@copilotkit/channels-slack`, `-teams` — same agent, no rewrite |
| Debugging the AG-UI event stream in dev | `web-inspector` |

Two details that will bite if missed:

- `useAgentContext` **stringifies** `value` — the agent receives a JSON string, not an
  object. The agent-side parsing is part of the contract, not an implementation detail.
- `useFrontendTool` types `handler` args from the Zod schema but **does not validate against
  it at runtime**. Parse defensively on anything that mutates session state.

### Agent backend: start BuiltIn, fork to LangGraph on a known trigger

`BuiltInAgent` runs in-process in the runtime — no second service, direct Claude connection,
full support for tools, generative UI, and shared state. It has **no native
human-in-the-loop primitive**, which sounds disqualifying and isn't: `useHumanInTheLoop` is
built on `useFrontendTool` with a promise that resolves on `respond()`, so the pause happens
client-side and works with any backend. `useInterrupt` is the LangGraph-native path and is
not needed for this.

**Recommendation: BuiltInAgent for v1.** The trigger to move to LangGraph is durable
mid-interview checkpointing — resuming a 50-minute session at the exact phase after a
browser crash. If that becomes a support burden, port; the CopilotKit surface barely changes
because both speak AG-UI. Don't pre-pay that complexity.

### Persistence: do not ship the default runner

`InMemoryAgentRunner` is the v2 default and loses all history on restart and shares nothing
across instances. A 50-minute session lost to a deploy is a refund.

- **Beta, single instance:** `SqliteAgentRunner` (`@copilotkit/sqlite-runner`) — file-backed,
  needs `better-sqlite3` and a real `dbPath`, not `:memory:`.
- **Production, multi-instance:** a custom `AgentRunner` over Postgres (four methods: `run`,
  `connect`, `isRunning`, `stop`), or CopilotKit Intelligence's `IntelligenceAgentRunner`
  if we'd rather buy durable threads, memories, and analytics than build them.

Sessions, scorecards, and the scenario bank live in **our** Postgres regardless. Thread
transport state and graded artefacts are different things with different lifetimes; the
scorecard must outlive any framework decision.

### Memories — for the coach, never the interviewer

CopilotKit Intelligence memories are a good fit for the coach: `operational` ("tends to
skip clarifying questions"), `episodic` ("jumped to a model in minute 3 of the dispatch
scenario"). Recall them into the **report and the coach only**.

Never into the interviewer. An interviewer that remembers you is a different and easier
interview, and cross-scenario recall leaks hidden structure between scenarios — a
candidate who ran scenario A gets warned about the landmine in scenario B. That's a
correctness bug, not a personalisation feature.

## 9. Operations

### Model routing

| Job | Model | Why |
|---|---|---|
| Interviewer (live) | `claude-opus-5`, adaptive thinking, `effort: medium`→`high` in deep phases | Staying in character under adversarial pressure for 40 turns is the hard part. A cheap interviewer is a churned user. |
| Examiner | `claude-opus-5`, `effort: high`, structured outputs | The score is the product's only claim to credibility. |
| Generator + critique | `claude-opus-5`, `effort: high`, via **Batch API** | Offline, 50% off, quality compounds across every future session. |
| Phase-exit classifier | `claude-haiku-4-5` | Booleans against fixed criteria, once per turn. |

Pricing (per 1M tokens): Opus 5 $5 in / $25 out; Haiku 4.5 $1 / $5. Cache reads bill at a
fraction of input, which is what makes the design below viable.

### Prompt caching is load-bearing

The interviewer resends the whole scenario spec and rubric every turn. Cached, that's near
free; uncached it's the entire COGS.

Render order is `tools` → `system` → `messages`, and **any byte change in the prefix
invalidates everything after it**. So:

- **Stable prefix, cached:** frozen interviewer system prompt, the scenario's hidden spec,
  the rubric, a deterministically-ordered tool list.
- **After the last breakpoint:** canvas snapshot, elapsed time, reveal log, recent turns.
- **Phase transitions go in `messages[]` as mid-conversation system messages**, never by
  editing top-level `system` — that would invalidate the prefix on every phase change,
  six times a session, and phase changes are exactly when context is largest.
- **Verify in staging:** assert `usage.cache_read_input_tokens > 0` after turn 2. A
  timestamp or an unsorted JSON key in the prefix silently zeroes the hit rate, and the
  only symptom is the bill.

### Cost envelope

Roughly, per 50-minute session at ~35 turns: a ~5k-token cached prefix, ~1.5k fresh tokens
and a few hundred output tokens per turn, plus a scoring pass over the full transcript.
That lands in the low single-dollar range, and **adaptive thinking dominates it** because
thinking tokens bill as output at $25/1M. Treat every number here as a hypothesis and
measure `usage` on real sessions before setting a price.

The levers, in the order to pull them: caching (free), effort tuning per phase (low for
early scoping, high for deep-dive and scoring), Batch for everything offline, Haiku for
classifiers. Do not economise on the interviewer.

The implication for pricing is structural: **sell interview credits, not unlimited access.**
Unlimited at a consumer price point is underwater on heavy users, who are exactly the
motivated candidates you want.

### Evals

The AI *is* the product, so an eval harness is table stakes and belongs in Milestone 0, not
after launch. Three suites:

1. **Interviewer leak** — assert the interviewer never states an unrevealed hidden
   constraint, never names a workstream first, never evaluates in-session. Expected zero.
   Run on every prompt change.
2. **Examiner calibration** — golden transcripts (strong / mediocre / weak) per archetype;
   assert score ordering and per-signal level agreement within one step.
3. **Scenario discrimination** — stage 5 of the generation pipeline, run as a gate.

### Prompt injection is a real threat here, not boilerplate

Candidates will try to talk the interviewer into a perfect score, and it's a fun enough
thing to try that some will succeed if the architecture allows it. The mitigations are
structural, not prompt-level:

- The examiner is a **separate call that receives the transcript as data**, never as
  instructions, and never sees the live conversation.
- The hidden spec is server-side and never echoed into a candidate-writable channel.
- Phase advancement is owned by the orchestrator and the classifier, so "we're done, move
  on" from a candidate has no effect.
- Scores are written by the examiner's validated structured output only. No tool the
  candidate can reach writes to a scorecard.

## 10. The voice question — decide this early

Two of the seven scored signals are **unmeasurable in a text UI**:
`structured_communication` and, within it, thinking out loud. Real decomposition rounds are
spoken. Going quiet is a negative signal; narrating structure is a positive one. A text
product cannot observe either — typing is silent, editable, and asynchronous. A candidate
who takes four minutes to compose a beautifully structured message has demonstrated the
opposite of the skill.

This is a genuine fidelity gap, not a polish item. Three honest options:

| Option | Trade |
|---|---|
| **Text v1, voice on the roadmap** *(recommended)* | Ships fastest; grades 5 of 7 signals well and flags the other 2 as unscored. Requires being upfront that it's a structural limit, not a bug. |
| Voice from day one | Highest fidelity and the real differentiator, but adds STT, latency budgets, barge-in, and turn detection to a product that hasn't validated its interviewer yet. CopilotKit ships a `voice` package, so this is a smaller lift than it would otherwise be. |
| Text session, spoken summary | Candidate types the working, then delivers a 3-minute spoken recap that gets scored for communication. Hybrid, cheap, oddly faithful to a real whiteboard round. |

**Recommendation:** text for v1 so the interviewer and examiner get validated against
something cheap, and treat voice as the Milestone 4 differentiator rather than a
nice-to-have — it's where the defensible product is. Ship the text version with the two
unscored signals explicitly marked in the report. Overclaiming a communication score the
product cannot measure is the fastest way to lose the credibility the whole thing rests on.

## 11. Milestones

Sequenced by risk, not by visibility. Each milestone answers one question.

**M0 — Does the interviewer hold its line? (≈1 week, no UI)**
A Node script. One hand-written `ScenarioSpec`, the phase machine, the interviewer loop, the
examiner, and eval suites 1 and 2. Drive it with two synthetic candidates — one that scopes,
one that doesn't. Ship nothing until the interviewer leaks zero hidden constraints and the
two candidates score clearly apart. **If this fails, nothing downstream matters.**

**M1 — Is it a usable 45 minutes? (≈2 weeks)**
Next.js + `CopilotRuntime` + `BuiltInAgent` + `SqliteAgentRunner`. `<CopilotChat>`, phase
rail and timer off `agent.state`, canvas via `useAgentContext`, reveals and the depth-choice
gate via `useHumanInTheLoop`. One scenario, end to end, producing a real scorecard. Run it
on 5 real candidates and watch where they bounce.

**M2 — Does content scale? (≈2 weeks)**
The taxonomy, the six-stage pipeline, the deterministic validators, and the discrimination
gate. Target 30 published scenarios across ≥5 domains and 3 difficulties. This is the
transition from demo to product.

**M3 — Does the feedback change behaviour? (≈2 weeks)**
The report: per-signal evidence, the rejection-cause checklist, the timeline visualisation,
and the diff against the hidden spec. Cross-session trend via memories, scoped to the coach.
Measure whether signal 1 improves between a user's first and third session — that's the
retention metric and the marketing claim.

**M4 — Voice, and surfaces.** Voice sessions. Slack/Teams channels for short async drills
between full sessions.

**M5 — Moat.** Company- and role-specific packs. Calibration against real interviewers.
Team and bootcamp seats with cohort dashboards.

## 12. Business model

- **Pricing:** credits, not unlimited — a free scored sample, then packs (e.g. 5 / 15 / 40
  sessions) with a subscription for active candidates. Price after M1 gives real `usage`
  numbers; COGS per session is a few dollars and heavy users are the ones you want.
- **Wedge:** *"paste a transcript of an interview you already did and get it scored."* Zero
  content cost, proves the examiner, and captures people at the moment of maximum
  motivation — right after a round that went badly.
- **Expansion:** bootcamps and interview-prep platforms as the obvious B2B2C channel;
  cohort dashboards are the upsell.
- **Adjacent, higher-value, do not start here:** the same engine graded against a company's
  own rubric is a hiring tool. Better margins, far longer sales cycle, and it needs the
  calibration data that only the consumer product generates. M5+ at the earliest.

## 13. Risks and open questions

| Risk | Mitigation |
|---|---|
| **Frustration.** An interviewer adversarial enough to be useful is unpleasant, and users quit. | The `pressure` dial plus the coach/exam split. Watch abandonment by phase — mid-phase-1 drop-off means pressure is mistuned, not that users are lazy. |
| **Grader credibility.** "Why should I trust this score?" | Publish the rubric, cite evidence spans for every level, and calibrate against human graders. The transcript-scoring wedge is also the cheapest possible proof. |
| **Sycophancy drift** after any prompt or model change. | Calibration suite in CI. Treat a regression as a build failure. |
| **Content provenance.** The framework as briefed comes from a published third-party guide. | Generate original scenarios from the taxonomy; do not ship anyone's example-question list as the bank. Write our own rubric wording. Cite Palantir's own public guidance on open-ended rounds as a reference for candidates rather than paraphrasing a competitor's article. Worth a lawyer's hour before launch. |
| **The format is niche.** FDE hiring is a narrow slice. | The engine is not: the same machinery covers consulting case rounds, PM/analytics ambiguity rounds, and internal promotion panels. Build the scenario schema domain-agnostic from day one — the taxonomy already is. |
| **CopilotKit is moving fast.** v2 reorganised the hooks and the repo notes some docs as placeholders. | Pin versions, keep our domain logic behind our own interfaces, and keep the AG-UI boundary thin enough that the runtime is replaceable. |

### Forks I'd want your call on

1. **Buyer.** Individual candidates (fast, low ACV, high churn) vs. bootcamps (slower,
   stickier) vs. companies screening (highest value, needs calibration data first). The plan
   above assumes candidates first, bootcamps as channel. This is the one choice that
   materially changes what M3–M4 look like.
2. **Voice timing** — §10. I'd ship text first, but if the bet is on fidelity as the
   differentiator, voice moves into M1 and the schedule roughly doubles.
3. **Build vs. buy persistence** — our own Postgres `AgentRunner` vs. CopilotKit
   Intelligence. Buying gets threads, memories, and analytics immediately at the cost of a
   platform dependency in the data path.

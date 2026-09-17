# Decomp — product & operating plan

## 1. Thesis

**Paste a vague ask. Get a defensible technical roadmap, one decision at a time.**

The app takes an under-specified request — the kind a client, an exec, or an interviewer
actually hands you — and walks it down to a concrete objective, a metrics table with
guardrails, a data model, an end-to-end architecture, and a ruthlessly cut MVP. At every
layer it presents the **two to four legitimate ways to go**, recommends one with a reason,
and keeps the paths you didn't take visible.

It is not a simulator and not a grader. It's the thing you work *through*.

## 2. What changed, and the honest trade

The earlier design was an adversarial interviewer that hid the answer and scored you. This
is the inverse: it hands you the answer, structured. Three things get better and one gets
worse, and the worse one is worth naming.

**Better:** value on turn one instead of after a 50-minute commitment. No adversarial-drift
problem and no anti-sycophancy grading problem — the two hardest engineering risks in the
old plan simply disappear. And the output is a shareable artefact, which the old one wasn't.

**Worse:** a cheat sheet doesn't build the skill the way being pushed on does, and **you
cannot use it during a live interview.** So the job-to-be-done changes: this is a
*preparation and real-work* tool, not an in-room crutch. The way it builds skill is
exposure — read thirty worked decompositions with the decision points made explicit and
the framework becomes automatic, which is exactly what frees up working memory in the room.

Two things follow from that, and both are cheap:

- **Blank mode.** Same template, empty, with the prompts showing. You fill it, then reveal
  the generated version and diff. Same schema, no new machinery, and it's the bridge from
  reading to doing.
- **The simulator becomes act two,** not a dead branch. Once someone has read thirty briefs,
  testing them is the obvious upsell — see [`deferred-SIMULATOR_SPEC.md`](deferred-SIMULATOR_SPEC.md).

### The repositioning worth considering

Interview prep is the obvious wedge, but the tool is arguably *more* valuable to someone
facing a real vague ask on a real engagement — a forward-deployed engineer in week one at a
client, a consultant scoping a statement of work, a data lead handed "we want to use AI."
Same product, same output, bigger market, much higher willingness to pay, and no seasonality.
Interview prep has the better funnel; real work has the better economics. Worth deciding
deliberately rather than drifting into one. See §12.

## 3. The interaction model

One box on the landing page. Everything else unfolds from it.

1. **Paste the ask.** "We want to analyze seat utilization and recommend better showtimes."
2. **Triage.** It separates the entity the prompt *names* from the actual stakeholder,
   lists the resources given **and the ones worth asking for**, and pins the time bound.
   Whatever's missing becomes the opening questions. This is the strongest single screen in
   the product: from one sentence you get who you're really building for and the four
   questions to ask before designing anything.
3. **Pain-point excavation.** Candidate pain points, the one to pursue, and — the highest
   -leverage field in the brief — **what the stakeholder does today**, which is what turns a
   broad complaint into a targeted problem. The reframe it produces changes every
   downstream layer.
4. **The solution menu.** Two to four options that optimise for materially different things,
   each naming the resources it uses and any resource it needs that the prompt never
   offered, with the exact way to ask for it. One is recommended, with the reason.
5. **The brief builds beside the chat**, layer by layer, streaming so sections materialise
   rather than appearing in one burst. Each layer is another decision gate.
6. **Every layer keeps a "what else / why this" toggle.** The options not taken stay in the
   document. This is the learning mechanism and the thing a generic chatbot doesn't do.
7. **Everything is editable**, and edits propagate — change the metric and the MVP's exit
   criterion should follow.
8. **Export** the filled brief, and save it to a personal library.

The process being encoded is specified in [`FRAMEWORK.md`](FRAMEWORK.md) and the layer
schema in [`BRIEF_SPEC.md`](BRIEF_SPEC.md).

### Company modes

The round doesn't end the same way everywhere, and that changes what the brief must prepare.
Palantir and Databricks close with a **deep dive** — the interviewer probes one area, and you
steer which. OpenAI and customer-engineering-leaning loops close with a **present-back**,
where you summarise the solution to the interviewer as the non-technical customer.

So the user picks a target company and the brief generates the matching ending: a chosen
depth area with pre-answered probes, or a de-jargoned summary with two trade-offs and next
steps. It's one conditional layer to build, and it's the most concrete "this was made for my
interview" signal the product can send.

The deep-dive layer is **pluggable by area** (data model, ML, app performance, integration,
security), which is where domain depth lives. That matches how the round actually works:
depth is chosen to match your spike, not spread evenly. The output quality bar is
[`WORKED_EXAMPLE.md`](WORKED_EXAMPLE.md) — read that first; it's the clearest statement of
what this product is.

## 4. The `Decision` spine

The claim "it guides you through decisions" has to be structural or it degrades into a
chatbot with a nice font. So one shape repeats at every layer: a question, 2–4 options each
carrying its own trade, one recommendation with a rationale, and the user's override.

Three rules keep it honest, all enforced in code rather than asked for in a prompt:

- **No two options at the same gate may optimise for the same thing.** Otherwise they're
  rewordings and the gate is theatre.
- **Exactly one option is recommended.** A menu with no recommendation pushes the judgment
  back onto the user, which is the job they came to outsource.
- **Rejected options are never deleted.** They're part of the artefact.

## 5. Architecture on CopilotKit

Verified against CopilotKit `main` (`8f7c566`); v2 hooks import from
`@copilotkit/react-core/v2` and take Zod schemas.

The pivot makes CopilotKit fit *better* than it did before. `useHumanInTheLoop` is no longer
a garnish for occasional confirmations — the agent pausing at a decision gate and resuming
on the user's pick **is the core loop of the product**.

```
Next.js ──► CopilotRuntime (Hono) ──► BuiltInAgent (claude-opus-5)
  useHumanInTheLoop   ← decision gates: agent pauses, user picks, run resumes
  useAgent            ← the brief itself, as streamed shared state
  useAgentContext     ← user edits, so downstream layers respect them
  useFrontendTool     ← write/revise a specific brief section
  useThreads          ← the brief library
       │
  AgentRunner (Sqlite → Postgres)     Layer generators: one structured-output call per layer
```

| Need | Primitive |
|---|---|
| Decision gate: pause, present 2–4 option cards, resume on pick | `useHumanInTheLoop` — pauses in `Executing`, resumes on `respond()` |
| The brief, materialising section by section | `useAgent()` → `agent.state`, with state streaming so long fields assemble token-by-token |
| User edits feeding back into later layers | `useAgentContext({ description, value })` |
| "Revise the metrics table with a cost guardrail" | `useFrontendTool`, Zod `parameters` |
| Suggested next moves when the user stalls | `useConfigureSuggestions` (dynamic) |
| Brief library, resume a half-finished brief | `useThreads` + a durable `AgentRunner` |
| Async drills / quick asks from Slack or Teams | `@copilotkit/channels-slack`, `-teams` |
| Debugging the AG-UI event stream in dev | `web-inspector` |

Three upstream details that will cost a day each if missed:

- `useAgentContext` **stringifies** `value` — the agent receives a JSON string. Parsing is
  part of the contract.
- `useFrontendTool` types handler args from the Zod schema but **does not validate at
  runtime**. Parse defensively on anything that mutates the brief.
- `InMemoryAgentRunner` is the v2 default and loses everything on restart. Ship
  `SqliteAgentRunner` (`@copilotkit/sqlite-runner`, needs `better-sqlite3` and a real
  `dbPath`) for single-instance, then a custom Postgres `AgentRunner` — four methods:
  `run`, `connect`, `isRunning`, `stop`. Briefs live in **our** Postgres regardless; a saved
  brief must outlive any framework decision.

**`BuiltInAgent` for v1.** In-process, no second service. It has no native HITL primitive,
which doesn't matter: `useHumanInTheLoop` is built on `useFrontendTool` with a promise that
resolves client-side, so it works with any backend. Move to LangGraph only if durable
mid-generation checkpointing becomes a real support burden.

## 6. Generation

Eight layers, **one structured-output call each**, not one giant call. Three reasons: the UI
can stream a layer as it lands, the user can intervene between layers, and each call gets a
tight schema it can actually satisfy.

Generation is now **in the request path**, which is the biggest operational change from the
old plan — it was a nightly batch job before. Implications:

- **Prompt caching is the whole game.** The framework template, the layer instructions, and
  the domain pack are a stable prefix, cached once per brief and read by all eight calls.
  The user's ask and accepted choices go *after* the last breakpoint. Render order is
  `tools` → `system` → `messages`, and any byte change in the prefix invalidates everything
  after it — so accepted choices are appended, never spliced in.
- **Layer instructions go in `messages[]` as mid-conversation system messages** on
  `claude-opus-5`, not by editing top-level `system`. Eight layers means eight
  invalidations otherwise.
- **Validate, then regenerate.** The invariants in `BRIEF_SPEC.md` are assertions. Three
  functional requirements, or a reframe that merely restates the prompt, fails and
  re-requests that layer — the user never sees it.
- **The requirements cap is an upstream signal.** More than two functional requirements at
  L4 means L3 under-scoped, so the regeneration targets **L3**, not L4. Getting this wrong
  produces briefs that trim the design instead of tightening the scope.
- **Perceived latency is a product surface.** A brief is ~8 sequential calls with thinking
  on the judgment-heavy layers. Stream everything, render each layer the moment it lands,
  and let the user start reading layer 1 while layer 4 is still generating.

| Layer | Model | Note |
|---|---|---|
| L0 Triage, L1 Pain point, L2 Solutions | `claude-opus-5`, adaptive thinking, `effort: high` | The judgment-heavy layers. The stakeholder gap and the reframe are the highest-signal outputs in the brief — never economise here |
| L3 MVP, L4 Design, L5 Deep dive | `claude-opus-5`, `effort: medium` | Structured expansion, strongly shaped by the domain pack |
| L6 Follow-ups, L7 Self-check, L8 Talk track | `claude-sonnet-5` | Largely mechanical once the earlier layers are fixed |

Pricing per 1M tokens: Opus 5 $5 in / $25 out; Sonnet 5 $2 / $10. Cache reads bill at a
fraction of input. Expect a brief to land well under a dollar of model spend — output
tokens dominate, and thinking bills as output. **Measure `usage` on real briefs before
pricing anything**, and assert `cache_read_input_tokens > 0` after the first layer in
staging; a timestamp in the prefix silently zeroes the hit rate and the only symptom is the bill.

## 7. Why this isn't just a prompt

The obvious objection: a generic chatbot produces a decent decomposition. This is the
central strategic question of the pivot, and there are five real answers.

1. **The template is fixed, complete, and validated.** Every brief triages all three
   elements, separates the named entity from the actual stakeholder, costs all three
   scoping bottlenecks, caps requirements at two, and maps every component to one.
   Enforced in code. A chatbot gives you whatever shape it felt like that day — and the
   things it quietly skips (the stakeholder gap, the current workaround, the resource it
   should have asked for) are exactly the ones that carry the signal.
2. **Domain packs.** Guardrails and entity models that are *correct* for cinema exhibition,
   emergency dispatch, claims processing, field logistics. That distributor-minimum-showings
   constraint isn't analytics knowledge, it's domain knowledge, and it's the difference
   between an answer that lands and one that's recognisably generic. This is the moat. See §8.
3. **Alternatives are preserved.** You see the three framings you didn't pick and why. That's
   what makes it a study tool rather than an answer.
4. **Same structure every time,** so you internalise it. A chatbot's variance is the enemy
   of a framework becoming automatic.
5. **A library you can diff.** Fifty saved briefs, searchable, and you can compare how a
   root-cause problem decomposes against a forecasting one.

Nothing here depends on having a better model than anyone else, which is the point.

## 8. Domain packs — the moat

A pack is curated, versioned, human-reviewed knowledge injected into the stable cached
prefix for a matched domain:

- **Guardrail library** — the Goodhart traps specific to that domain. Optimise seat
  utilisation and you'll cut showings. Optimise 911 response time and you'll strand a
  district. These are the non-obvious, high-signal items and they don't generalise.
- **Constraint library** — contractual, regulatory, physical, union.
- **Entity skeletons** — including the exogenous and operational entities everyone forgets.
- **Failure-mode library** — late-arriving facts, confounded denominators, cannibalisation.

Start with four packs covering the domains that actually come up (public sector, healthcare
payers, logistics, retail/hospitality), plus a generic fallback. Ten good packs is a
defensible product; a thousand thin ones is not. Pack quality is reviewable by a human
expert, which means it's improvable without touching a prompt.

## 9. Operations

- **Quality evals.** The AI is the product. Three suites: (a) **invariant** — every
  generated brief passes every assertion in `BRIEF_SPEC.md`; (b) **specificity** — a
  golden-brief comparison against `WORKED_EXAMPLE.md`, asserting domain-specific guardrails
  and at least one often-forgotten entity rather than generic filler; (c) **framing
  distinctness** — no two options at a gate optimising for the same thing. Run on every
  prompt or pack change; treat regressions as build failures.
- **The generic-output failure is the one that kills it.** A brief full of "ensure data
  quality" and "consider scalability" is worse than nothing: in an interview it reads as a
  memorised framework, which is itself a rejection cause. Suite (b) is not optional polish.
- **Prompt injection.** Lower stakes than the simulator — there's no score to forge — but
  the pasted ask is untrusted input that flows into a cached prefix. Keep it after the
  breakpoint, treat it as data, and never let it reach the pack-selection or validator logic.
- **Feedback loop.** Log which framing option users pick vs. which was recommended. A
  recommendation users consistently overrule is a pack bug, and that's the highest-value
  signal the product generates.

## 10. Milestones

**M0 — Is the output actually good? (≈1 week, no UI)**
A script: vague ask in, full brief out, one domain pack, all eight layers, validators
enforced. Generate briefs for ten real vague asks and read them next to
`WORKED_EXAMPLE.md`. **The only question that matters: are the guardrails and entities
domain-specific, or generic mush?** If generic, fix the packs before building any UI —
no amount of interface saves a weak brief.

**M1 — Does the guided flow feel better than a chat box? (≈2 weeks)**
Next.js + `CopilotRuntime` + `BuiltInAgent` + `SqliteAgentRunner`. Framing gate via
`useHumanInTheLoop`, brief streaming into the canvas off `agent.state`, edits via
`useAgentContext`, export. One domain. Put it in front of ten people and watch whether they
engage with the alternatives or just scroll to the end — that behaviour decides whether the
`Decision` spine is real value or ceremony.

**M2 — Does it hold up across domains? (≈2 weeks)**
Four packs plus the generic fallback. Pack authoring tooling, so a domain expert can improve
a pack without touching prompts. Specificity evals per pack.

**M3 — Does it build the skill? (≈2 weeks)**
Blank mode and the reveal-diff. The brief library with search and compare. Cross-brief trend:
are the user's own drafts getting closer to the generated version over time? That's both the
retention metric and the marketing claim.

**M4 — Surfaces.** Slack/Teams for quick asks. Team libraries and shared packs.

**M5 — Act two.** The simulator, as the graded upsell on top of a corpus of briefs the user
has already read.

## 11. Business model

- **Free:** two full briefs, no signup wall until export. The product demos itself; the
  first brief is the pitch.
- **Paid:** subscription for unlimited briefs plus library and blank mode. Per-brief COGS is
  well under a dollar, so unlimited is viable here in a way it wasn't for the simulator.
- **Teams:** shared libraries and private domain packs — a consultancy encoding its own
  scoping methodology as a pack is a genuinely sticky product.
- **Wedge:** the free brief is inherently shareable. Someone posts their filled brief, and
  the template is the advertisement.

## 12. Risks and open questions

| Risk | Mitigation |
|---|---|
| **Generic output.** The failure that kills the product. | Domain packs, specificity evals in CI, and a human-reviewable pack authoring path. Treat "could this sentence appear in any brief?" as a bug. |
| **"I could just ask a chatbot."** | §7. Lead with the triage screen and the reframe — the stakeholder gap, the resource you should have asked for, the current workaround. A chat transcript doesn't reliably surface any of them, and they're what the round actually scores. |
| **It hands you fish.** | Blank mode; positioning as prep-and-real-work rather than in-room. Be straight about this — overclaiming is how you lose the users who'd pay most. |
| **Perceived latency** — eight sequential calls. | Stream per layer, render on arrival, let reading start at layer 1. Never a single spinner. |
| **Pack maintenance** doesn't scale with headcount. | Ten good packs, not a thousand thin ones. Mine the override log — users tell you what's wrong for free. |
| **CopilotKit moves fast**; v2 reorganised the hooks and some docs are placeholders. | Pin versions, keep domain logic behind our own interfaces, keep the AG-UI boundary thin. |
| **Content provenance — the sharpest legal risk.** The process model is drawn from a *paid* third-party course, which makes this materially more acute than working from a public post. | Encode the process; never ship the source text — no lesson prose, rubric descriptors, or worked narration copied through into briefs, prompts, packs, or marketing. Our rubric wording is original. Never ship their prompt bank: briefs decompose *the user's own* ask, which is both safer and the better product. Keep the reference list in-repo so each idea's provenance stays traceable. See [`FRAMEWORK.md`](FRAMEWORK.md) §Provenance, and spend a lawyer's hour before launch. |

### Forks I'd want your call on

1. **Interview prep or real work?** (§2.) Same product, different funnel, wildly different
   ACV and seasonality. Prep has the better viral loop; real work has the better economics
   and no January cliff. I'd build prep-first and instrument for real-work usage — but if
   you want the consulting/FDE market, the packs and the pricing both change now, not later.
2. **Which four domain packs.** This is the actual v1 content decision and it should follow
   whichever answer you give to (1).
3. **Does blank mode ship in M1 or M3?** It's the honest answer to "it hands you fish," and
   it's cheap. I've put it in M3 to keep M1 focused, but there's a real case for M1 — it
   changes what the product *is*, and that's not usually a thing to defer.

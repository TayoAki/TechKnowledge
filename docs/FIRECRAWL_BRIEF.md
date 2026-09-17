# Firecrawl brief

What to gather, and why. Written because `docs.databricks.com` and
`api.firecrawl.dev` are both blocked from the environment this project was built
in, so 14 product labels in `src/domain/architectures.ts` are marked
`verify: true` and the architecture catalogue is unvalidated.

**Total target: ~120 pages.** Priorities are ordered — P1 alone unblocks the most.

---

## P1 · Resolve 14 product labels *(highest value, smallest crawl)*

The **capability** in each row is what the architecture depends on and is stable.
The **label** is what I need confirmed, because Databricks renames often and
inventing a service name is disqualifying in an FDE interview.

For each row I need: the current official product name, whether my guess is
stale/renamed/wrong, and the canonical docs URL.

| Capability the design needs | My current label | Confirmed name? | Docs URL |
|---|---|---|---|
| SQL endpoint serving interactive queries | Databricks SQL warehouse | | |
| Incremental file discovery with durable state | Auto Loader (`cloudFiles`) | | |
| Declarative pipeline, execution graph derived from table dependencies | Lakeflow Declarative Pipelines (formerly Delta Live Tables) | | |
| Row-level quality constraints with warn / drop / fail severity | pipeline expectations | | |
| Orchestrated task graphs on a schedule or trigger | Databricks Jobs / Workflows | | |
| Hosted application serving a custom interface | Databricks Apps | | |
| Drift and freshness monitoring over served tables | Lakehouse Monitoring | | |
| Low-latency model inference behind an endpoint | Mosaic AI Model Serving | | |
| Experiment tracking and a model registry | MLflow on Unity Catalog | | |
| Apply inserts, updates and deletes from a change feed | `APPLY CHANGES INTO` / AUTO CDC | | |
| Governed storage for non-tabular files | Unity Catalog Volumes | | |
| Semantic retrieval over embedded content | Mosaic AI Vector Search | | |
| Natural-language question answering over governed tables | AI/BI Genie | | |
| Managed connectors for SaaS and database sources | Lakeflow Connect | | |

**Best sources for this** — nav/index pages carry current names densely:

```
https://docs.databricks.com/aws/en/                          depth 1
https://docs.databricks.com/aws/en/data-engineering/         depth 1
https://docs.databricks.com/aws/en/release-notes/            depth 1   ← renames land here
```

If a rename happened, the release notes or a "formerly known as" note is the
proof I want, not just the new page existing.

---

## P2 · The two assessed tracks *(~60 pages)*

### Data Engineering — pipelines, data quality, ingestion, schema evolution

```
https://docs.databricks.com/aws/en/data-engineering/     limit 40, depth 3
```

Extract, per topic:

- **Pipelines** — declarative vs imperative: what each is for, how the execution
  graph is derived, and what re-running does (idempotency / recomputed window).
- **Data quality** — the exact severity levels and their behaviour on violation.
  I have warn / drop / fail; confirm the real names and semantics.
- **Ingestion** — the distinct patterns and when each applies: incremental file
  ingest, bulk load, managed connector, change feed. How files are *discovered*
  and whether that survives restart.
- **Schema evolution** — enforcement default, explicit merge, and rescue
  behaviour. Specifically: what happens to an **unknown enum value** and to a
  **column type change**, and whether rescued data raises anything by default.

### Full Stack — application architecture, UX, API design, frontend/backend

```
https://docs.databricks.com/aws/en/lakehouse-architecture/reference    limit 25, depth 2
```

Extract:

- The **reference architecture** diagrams and their named layers, verbatim layer
  names.
- How an app authenticates: **as itself vs on behalf of the signed-in user**, and
  which one lets the catalog enforce row/region scoping.
- Querying over HTTP — the statement-execution style API: sync vs async, and any
  documented result-size or timeout limits.
- **Cold start** on a serverless SQL warehouse: documented behaviour and any
  stated latency.

---

## P3 · Reference architectures to validate the catalogue *(~25 pages)*

I have 10 target architectures in `src/domain/architectures.ts`:
deadline-bound decision support · telemetry alerting · many-source consolidation ·
CDC replication · prediction in the loop · document extraction and retrieval ·
activation writeback · auditable point-in-time reporting · usage/cost attribution ·
migration with dual-run parity.

```
https://docs.databricks.com/aws/en/lakehouse-architecture/     limit 25, depth 2
https://www.databricks.com/solutions                           limit 15, depth 1
```

What I want back:

1. Which of my 10 map onto a **published** Databricks pattern, and its real name.
2. Any **common pattern I've missed** — I'd rather find a gap now than ship a
   catalogue with a hole in it.
3. Any of my 10 that Databricks would express **differently enough that my shape
   is wrong**, not just differently named.

---

## P4 · FDE role content *(~15 pages, lowest priority)*

Grounding for the interview framing. Public sources only.

```
https://www.palantir.com/careers/getting-hired/         limit 6, depth 2
```
Plus, via search rather than crawl: current **Databricks** job postings titled
*Forward Deployed Engineer* / *Solutions Architect* / *Delivery Solutions
Architect* — I want the **assessed competencies** as written, to check my three
areas and two tracks against real postings.

---

## Output format

Per page, a markdown file with the source URL as the first line:

```
<!-- source: https://docs.databricks.com/aws/en/... -->

# Page title
...
```

Laid out as:

```
databricks-source/
  p1-names/          nav, index, release notes
  p2-data-eng/
  p2-full-stack/
  p3-architectures/
  p4-fde-role/
  manifest.json      { url, title, priority, fetchedAt } per page
```

**Most valuable single thing you could add:** the P1 table above with the
"Confirmed name?" and "Docs URL" columns filled in. That's 14 rows and it
resolves every `verify: true` in the codebase. If you run an LLM over the crawl
to fill it, note any row where the docs were ambiguous rather than guessing — a
wrong-but-confident label is worse than a flagged unknown.

## Ready to run

`scripts/fetch-databricks-docs.mjs` implements P1–P3. Run it anywhere the hosts
resolve:

```bash
FIRECRAWL_API_KEY=fc-... node scripts/fetch-databricks-docs.mjs
```

It writes the layout above and prints which `verify: true` labels it found
literal matches for in the crawled text — a first pass at the table, not a
substitute for reading it.

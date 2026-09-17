# Verification manifest

Every claim below names a Databricks capability whose **current product name** could not be
confirmed from this environment: the egress policy returns 403 for both `docs.databricks.com`
and `api.firecrawl.dev`. The capability described is what matters and is stable; the label
moves, and Databricks renames often — Delta Live Tables became Lakeflow Declarative Pipelines.

Run `scripts/fetch-databricks-docs.mjs` where those hosts are reachable, then resolve each row.
Until then the skill instructs the model to state the capability rather than assert a name,
because inventing a service name is disqualifying in this round.


**25 claims to verify.**

| File | Line | Claim |
|---|---|---|
| `references/app-layer.md` | 16 | Hosted app **`[verify]`** \| The what-if interaction, custom layout, write-back \| A frontend/backend boundary and a deploy story to own \| |
| `references/app-layer.md` | 17 | Natural-language ask over the gold layer **`[verify]`** \| Lowest training cost \| Determinism, which a committing decision needs \| |
| `references/app-layer.md` | 26 | SQL warehouse is the common shape **`[verify]`**; the interesting part is who holds the |
| `references/app-layer.md` | 70 | **Statement-execution versus a custom service** **`[verify]`.** Querying the warehouse directly |
| `references/app-layer.md` | 80 | *`[verify]`**. It matters: if the programmer should only see their region, on-behalf-of makes |
| `references/app-layer.md` | 84 | their region **`[verify]`**. Pushing this down beats re-implementing it per surface, and it is |
| `references/blueprint.md` | 62 | Incremental file ingest \| POS drops files; re-reading everything nightly does not scale and loses arrival order \| Auto Loader / `cloudFiles` **`[verify]`** \| |
| `references/blueprint.md` | 64 | Conformed showings \| The grain everything else joins on: one row per showing \| Delta, declarative pipeline **`[verify]`** \| |
| `references/blueprint.md` | 68 | Warehouse endpoint \| Something has to answer a query from an app or a dashboard \| SQL warehouse **`[verify]`** \| |
| `references/blueprint.md` | 70 | Decision surface \| Where the GM acts. **Non-negotiable** — a blueprint ending at a gold table fails the round \| Dashboard, app, or Genie-style ask **`[verify]`* |
| `references/blueprint.md` | 71 | Governance \| Multi-site access, lineage for "why did this number change" \| Unity Catalog **`[verify]`** \| |
| `references/blueprint.md` | 72 | Quality gates \| A wrong denominator produces confident nonsense \| Pipeline expectations **`[verify]`** \| |
| `references/blueprint.md` | 116 | **Databricks App** **`[verify]`** → owns the what-if interaction; adds a frontend/backend |
| `references/blueprint.md` | 118 | **Natural-language ask over the gold layer** **`[verify]`** → lowest training cost; weakest |
| `references/blueprint.md` | 127 | **Rescue into a side column and carry on** **`[verify]`** → keeps the deadline; risks a |
| `references/data-engineering.md` | 15 | **Declarative pipeline** **`[verify]`** — you define the tables and their dependencies, the |
| `references/data-engineering.md` | 34 | deadline buys state management nobody asked for. **`[verify]`** |
| `references/data-engineering.md` | 41 | blast radius **`[verify]`**: |
| `references/data-engineering.md` | 62 | Beyond gates: drift and freshness monitoring on the served tables **`[verify]`** answers the |
| `references/data-engineering.md` | 72 | Incremental file ingest **`[verify]`** \| Files landing in object storage, unknown arrival order \| Discovery state to manage \| |
| `references/data-engineering.md` | 73 | Bulk load command **`[verify]`** \| Idempotent re-loads of a known file set \| Manual orchestration \| |
| `references/data-engineering.md` | 74 | Managed connector **`[verify]`** \| A supported SaaS or database source \| Less control over the read \| |
| `references/data-engineering.md` | 75 | Change feed / CDC apply **`[verify]`** \| Upstream emits inserts, updates, deletes \| Ordering and late-arrival handling \| |
| `references/data-engineering.md` | 102 | **Rescue** **`[verify]`.** Data that does not fit the expected schema is captured into a side |
| `references/guidance-levels.md` | 91 | `[verify]` convention in [blueprint.md](blueprint.md). |

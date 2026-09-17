/**
 * Fetch the Databricks docs that ground the FDE skill's domain logic.
 *
 * This environment's egress policy blocks both api.firecrawl.dev and
 * docs.databricks.com (403 at the gateway), so the skill was written from
 * platform knowledge with `[verify]` markers on every product name. Run this
 * where the hosts are reachable to resolve them.
 *
 *   FIRECRAWL_API_KEY=fc-... node scripts/fetch-databricks-docs.mjs
 *
 * The key is read from the environment and never written to disk. If yours was
 * ever pasted into a chat or a commit, rotate it.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const KEY = process.env.FIRECRAWL_API_KEY;
if (!KEY) {
  console.error("Set FIRECRAWL_API_KEY. Do not hardcode it.");
  process.exit(1);
}

const OUT = process.env.OUT_DIR ?? "docs/databricks-source";

/** Mapped to the two assessed tracks in the skill. */
const TARGETS = [
  {
    track: "data-engineering",
    url: "https://docs.databricks.com/aws/en/data-engineering/",
    covers: ["pipelines", "data quality", "ingestion patterns", "schema evolution"],
  },
  {
    track: "full-stack",
    url: "https://docs.databricks.com/aws/en/lakehouse-architecture/reference",
    covers: ["application architecture", "UX", "API design", "frontend/backend interaction"],
  },
];

async function crawl(target) {
  const res = await fetch("https://api.firecrawl.dev/v1/crawl", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: target.url,
      limit: 80,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });

  if (!res.ok) {
    throw new Error(`crawl ${target.url} -> ${res.status} ${await res.text()}`);
  }

  const { id } = await res.json();
  if (!id) throw new Error(`no crawl id returned for ${target.url}`);

  // Poll until the crawl completes.
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await fetch(`https://api.firecrawl.dev/v1/crawl/${id}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (!s.ok) throw new Error(`status ${id} -> ${s.status}`);
    const body = await s.json();
    if (body.status === "completed") return body.data ?? [];
    if (body.status === "failed") throw new Error(`crawl ${id} failed`);
    process.stdout.write(`\r${target.track}: ${body.completed ?? 0}/${body.total ?? "?"} pages`);
  }
  throw new Error(`crawl ${id} did not finish in time`);
}

await mkdir(OUT, { recursive: true });

for (const target of TARGETS) {
  console.log(`\n→ ${target.track}: ${target.url}`);
  const pages = await crawl(target);
  const dir = join(OUT, target.track);
  await mkdir(dir, { recursive: true });

  for (const page of pages) {
    const url = page.metadata?.sourceURL ?? page.url ?? "unknown";
    const name =
      url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 120) + ".md";
    await writeFile(
      join(dir, name),
      `<!-- source: ${url} -->\n\n${page.markdown ?? ""}\n`,
      "utf8",
    );
  }

  await writeFile(
    join(dir, "_index.json"),
    JSON.stringify(
      {
        track: target.track,
        url: target.url,
        covers: target.covers,
        fetchedAt: new Date().toISOString(),
        pages: pages.length,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\n  ${pages.length} pages -> ${dir}`);
}

console.log(
  "\nNext: resolve the [verify] markers listed in " +
    ".claude/skills/databricks-fde/references/VERIFY.md against what was fetched.",
);

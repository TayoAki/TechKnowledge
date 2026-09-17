/**
 * Fetch the Databricks docs that ground this project's domain logic.
 *
 * Implements P1-P3 of docs/FIRECRAWL_BRIEF.md. The environment this project
 * was built in blocks docs.databricks.com and api.firecrawl.dev, so 14 product
 * labels in src/domain/architectures.ts are marked verify:true. Run this
 * anywhere the hosts resolve.
 *
 *   FIRECRAWL_API_KEY=fc-... node scripts/fetch-databricks-docs.mjs
 *
 * The key is read from the environment and written nowhere. If yours has been
 * pasted into a chat, rotate it.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const KEY = process.env.FIRECRAWL_API_KEY;
if (!KEY) {
  console.error("Set FIRECRAWL_API_KEY. Do not hardcode it.");
  process.exit(1);
}

const OUT = process.env.OUT_DIR ?? "docs/databricks-source";
const API = "https://api.firecrawl.dev/v1";

/** Ordered by value: P1 alone resolves the product labels. */
const TARGETS = [
  { dir: "p1-names", url: "https://docs.databricks.com/aws/en/", limit: 25, depth: 1 },
  { dir: "p1-names", url: "https://docs.databricks.com/aws/en/release-notes/", limit: 15, depth: 1 },
  { dir: "p2-data-eng", url: "https://docs.databricks.com/aws/en/data-engineering/", limit: 40, depth: 3 },
  { dir: "p2-full-stack", url: "https://docs.databricks.com/aws/en/lakehouse-architecture/reference", limit: 25, depth: 2 },
  { dir: "p3-architectures", url: "https://docs.databricks.com/aws/en/lakehouse-architecture/", limit: 25, depth: 2 },
];

/**
 * The labels needing confirmation, read straight out of the source so this
 * script and the codebase cannot drift apart.
 */
async function labelsToVerify() {
  const src = await readFile("src/domain/architectures.ts", "utf8");
  const re =
    /const \w+: Service = \{\s*capability:\s*"([^"]+)",\s*product:\s*"([^"]+)",\s*verify:\s*true,/g;
  const rows = [];
  let m;
  while ((m = re.exec(src))) rows.push({ capability: m[1], product: m[2] });
  return rows;
}

async function crawl({ url, limit, depth }) {
  const res = await fetch(`${API}/crawl`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      limit,
      maxDepth: depth,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!res.ok) throw new Error(`crawl ${url} -> ${res.status} ${await res.text()}`);

  const { id } = await res.json();
  if (!id) throw new Error(`no crawl id for ${url}`);

  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await fetch(`${API}/crawl/${id}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (!s.ok) throw new Error(`status ${id} -> ${s.status}`);
    const body = await s.json();
    if (body.status === "completed") return body.data ?? [];
    if (body.status === "failed") throw new Error(`crawl ${id} failed`);
    process.stdout.write(`\r  ${body.completed ?? 0}/${body.total ?? "?"} pages`);
  }
  throw new Error(`crawl ${id} did not finish in time`);
}

function fileNameFor(url) {
  return (
    url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 120) + ".md"
  );
}

const manifest = [];
const corpus = [];

await mkdir(OUT, { recursive: true });

for (const target of TARGETS) {
  console.log(`\n→ [${target.dir}] ${target.url}`);
  let pages = [];
  try {
    pages = await crawl(target);
  } catch (err) {
    // One failed root should not lose the rest of the crawl.
    console.error(`\n  FAILED: ${err.message}`);
    manifest.push({ url: target.url, priority: target.dir, error: String(err.message) });
    continue;
  }

  const dir = join(OUT, target.dir);
  await mkdir(dir, { recursive: true });

  for (const page of pages) {
    const url = page.metadata?.sourceURL ?? page.url ?? "unknown";
    const md = page.markdown ?? "";
    await writeFile(join(dir, fileNameFor(url)), `<!-- source: ${url} -->\n\n${md}\n`, "utf8");
    manifest.push({
      url,
      title: page.metadata?.title ?? null,
      priority: target.dir,
      fetchedAt: new Date().toISOString(),
    });
    corpus.push(md.toLowerCase());
  }
  console.log(`\n  ${pages.length} pages -> ${dir}`);
}

await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

// ── first pass at the P1 table ────────────────────────────────────────────
// A literal hit means the label still appears in current docs. A miss is a
// strong hint of a rename, NOT proof — read the page before editing the code.
const haystack = corpus.join("\n");
const rows = await labelsToVerify();
const report = ["# P1 — label check (first pass)", "", "| Label | Appears in crawl? | Capability |", "|---|---|---|"];

let found = 0;
for (const r of rows) {
  // Match the distinctive head of the label, not the parenthetical aside.
  const probe = r.product.split(/[(/]/)[0].trim().toLowerCase();
  const hit = haystack.includes(probe);
  if (hit) found++;
  report.push(`| ${r.product} | ${hit ? "yes" : "**NO — likely renamed**"} | ${r.capability} |`);
}

report.push(
  "",
  `${found}/${rows.length} labels appear literally in the crawled text.`,
  "",
  "A miss suggests a rename. Confirm against the release notes before changing",
  "`verify: true` to `false` in `src/domain/architectures.ts` — a wrong-but-confident",
  "label is worse than one still flagged.",
);

await writeFile(join(OUT, "P1-label-check.md"), report.join("\n") + "\n", "utf8");

console.log(`\n${manifest.filter((m) => !m.error).length} pages written to ${OUT}`);
console.log(`P1 first pass: ${found}/${rows.length} labels matched — see ${OUT}/P1-label-check.md`);

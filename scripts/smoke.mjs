/**
 * Browser smoke test.
 *
 * Renders the app in both colour schemes, drives the intake, runs the clock
 * past a segment budget so the borrowing behaviour is visible rather than only
 * asserted in a unit test, and fails on any console or page error.
 *
 *   npx next build && npx next start -p 3100 &
 *   node scripts/smoke.mjs ./shots
 */
import { chromium } from "playwright";

const OUT = process.argv[2];
// The preinstalled Chromium build may not match what this playwright version
// expects, so point at it explicitly rather than downloading another copy.
const EXECUTABLE =
  process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: EXECUTABLE });
const errors = [];

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: scheme,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${scheme}] pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${scheme}] console: ${m.text()}`);
  });

  await page.goto("http://127.0.0.1:3100/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/01-intake-${scheme}.png` });

  // Drive the intake: load the example ask, then begin.
  await page.getByRole("button", { name: "use the example" }).click();
  await page.getByRole("button", { name: "begin" }).click();
  await page.waitForSelector(".segbar", { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/02-board-${scheme}.png` });

  if (scheme === "light") {
    // Start the clock and let it run past the decomposition budget so the
    // borrowing behaviour is visible rather than merely asserted in a test.
    await page.getByRole("button", { name: "start the clock" }).click();
    await page.waitForTimeout(2500);
    const remaining = await page.locator(".clock-total").innerText();

    // Finish segment one, which turns any overrun into borrowed time.
    await page.getByRole("button", { name: /^finish/ }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/03-architecture-light.png` });

    // Toggle two track topics to move the coverage meter.
    await page.getByRole("button", { name: /pipelines/ }).click();
    await page.getByRole("button", { name: /API design/ }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/04-coverage-light.png` });

    console.log("clock ticked to:", remaining);
    console.log("segments rendered:", await page.locator(".seg").count());
    console.log("coverage rows:", await page.locator(".cov-row").count());
    console.log("challenges shown:", await page.locator(".challenge").count());
    console.log("active segment:", await page.locator('.seg[data-status="active"] .seg-name').innerText());
  }

  await ctx.close();
}

await browser.close();

/**
 * Without a real ANTHROPIC_API_KEY the agent cannot initialise, so CopilotKit's
 * calls to the runtime fail — as does its external update check, which this
 * environment blocks anyway. Those are expected and are not UI defects. Any
 * other error is.
 */
const EXPECTED_WITHOUT_AGENT = [
  /Failed to fetch/i,
  /Failed to load resource/i,
  /Failed to check for updates/i,
];

const real = errors.filter(
  (e) => !EXPECTED_WITHOUT_AGENT.some((rx) => rx.test(e)),
);

if (errors.length > real.length) {
  console.log(
    `\n${errors.length - real.length} expected network error(s) ignored ` +
      "(no API key: agent cannot initialise).",
  );
}

if (real.length) {
  console.log("\n--- UNEXPECTED BROWSER ERRORS ---");
  for (const e of real.slice(0, 12)) console.log(e);
  process.exit(1);
}
console.log("\nno unexpected browser errors");

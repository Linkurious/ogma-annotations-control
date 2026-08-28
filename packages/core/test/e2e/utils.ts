import { Ogma, OgmaParameters } from "@linkurious/ogma";
import getPort from "get-port";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import { preview, build } from "vite";
import type { InlineConfig, PreviewServer } from "vite";
import { onTestFailed, onTestFinished } from "vitest";

declare global {
  function createOgma(options: OgmaParameters): Ogma;
  function createEditor(): import("../../src").Control;
  function wait(ms: number): Promise<void>;
  let ogma: Ogma;
  let editor: import("../../src").Control;
  let createArrow: typeof import("../../src").createArrow;
  let createPolygon: typeof import("../../src").createPolygon;
  let createText: typeof import("../../src").createText;
  let demoStyles: import("./pages/types").DemoStyles;
}

export class BrowserSession {
  public server!: PreviewServer;
  public browser!: Browser;
  public page!: Page;
  public port!: number;

  // Overridable at the CLI without touching any test file:
  //   E2E_HEADFUL=1 npx vitest run -c test/e2e/vitest.config.mts <file>
  //   E2E_SLOWMO=500 npx vitest run -c test/e2e/vitest.config.mts <file>
  // The explicit `headless` param still wins over the env var when a test
  // passes one deliberately (e.g. session.start(false)).
  async start(
    headless = process.env.E2E_HEADFUL !== "1",
    options: InlineConfig = {}
  ) {
    this.port = await getPort();
    await build({
      root: "test/e2e/pages",
      ...options
    });
    this.server = await preview({
      root: "test/e2e/pages",
      preview: { port: this.port },
      ...options
    });
    this.browser = await chromium.launch({
      headless,
      devtools: false,
      slowMo: Number(process.env.E2E_SLOWMO ?? 100)
    });
    this.page = await this.browser.newPage();
    await this.page.goto(`http://localhost:${this.port}`);
    await this.waitForReady();
  }

  async close() {
    await this.browser.close();
    await new Promise<void>((resolve, reject) => {
      this.server.httpServer.close((error) =>
        error ? reject(error) : resolve()
      );
    });
  }
  async emptyPage() {
    await this.page.evaluate(() => {
      document.getElementById("ogma")!.innerHTML = "";
      document.getElementById("timeline")!.innerHTML = "";
    });
  }
  async refresh() {
    await this.page.reload();
    await this.waitForReady();
  }

  /**
   * `page.goto`/`page.reload()` resolving (even on the `load` event, which
   * is supposed to wait for module-script execution) isn't a reliable
   * guarantee that the demo page's own bootstrap script has actually run
   * and defined its globals (createOgma et al.) - under CPU contention
   * (e.g. several e2e test files building their own preview server
   * concurrently in CI), that gap has been wide enough to lose the race,
   * causing a `createOgma is not defined` failure in whatever runs right
   * after. Wait for the actual readiness signal instead of trusting the
   * navigation lifecycle event.
   */
  private async waitForReady() {
    await this.page.waitForFunction(() => typeof createOgma === "function");
  }

  /**
   * Ad-hoc screenshot at any point in a test, saved under
   * reports/e2e-screenshots/ (gitignored, same as the rest of reports/).
   * Filenames aren't unique across calls with the same label - pass a
   * distinct label per call site if you're taking more than one.
   */
  async screenshot(label: string) {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    const path = `${SCREENSHOT_DIR}/${sanitize(label)}.png`;
    await this.page.screenshot({ path });
    return path;
  }
}

const SCREENSHOT_DIR = "reports/e2e-screenshots";

function sanitize(name: string) {
  return name.replace(/[^a-z0-9-]+/gi, "_").slice(0, 120);
}

/**
 * Auto-captures a screenshot when the currently-running test fails (and,
 * with E2E_SCREENSHOT=always, on every test regardless of outcome) - call
 * once per file, from `beforeEach`, after the session/page for that test
 * exists. Screenshots land in reports/e2e-screenshots/<describe>/<test
 * name>[.failed].png.
 *
 * Controlled by E2E_SCREENSHOT: "failure" (default) | "always" | "off".
 */
export function captureScreenshotOnTestEnd(
  session: BrowserSession,
  suiteLabel: string
) {
  const mode = process.env.E2E_SCREENSHOT ?? "failure";
  if (mode === "off") return;

  onTestFailed(async (ctx) => {
    try {
      await session.screenshot(
        `${suiteLabel}/${ctx.task.name}.failed`
      );
    } catch {
      // The page/browser may already be gone (e.g. a crashed session) -
      // the failure itself is what matters, don't mask it with a
      // secondary error from trying to screenshot a dead page.
    }
  });

  if (mode === "always") {
    onTestFinished(async (ctx) => {
      if (ctx.task.result?.state === "fail") return; // already captured above
      try {
        await session.screenshot(`${suiteLabel}/${ctx.task.name}`);
      } catch {
        // See onTestFailed above.
      }
    });
  }
}

export function compareDates(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

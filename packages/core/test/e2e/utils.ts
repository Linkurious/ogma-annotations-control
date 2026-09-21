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
  function screenToPage(p: { x: number; y: number }): { x: number; y: number };
  function containerToPage(p: { x: number; y: number }): {
    x: number;
    y: number;
  };
  let ogma: Ogma;
  let editor: import("../../src").Control;
  let Control: typeof import("../../src").Control;
  let createArrow: typeof import("../../src").createArrow;
  let createBox: typeof import("../../src").createBox;
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
   *
   * Explicit `timeout` matching `hookTimeout` (vitest.config.mts) - this
   * call's own default is Playwright's, 30s, which is *not* the same
   * budget as the 60s `hookTimeout` was raised to for exactly this kind
   * of contention. Left at the default, this still throws at 30s
   * regardless of hookTimeout, and since `start()` runs inside
   * `beforeAll`, vitest's `retry` never gets a chance to retry it - a
   * `beforeAll` failure fails every test in the file outright. Observed
   * in CI as `TimeoutError: page.waitForFunction: Timeout 30000ms
   * exceeded` in test/e2e/snapping.test.ts.
   */
  private async waitForReady() {
    await this.page.waitForFunction(() => typeof createOgma === "function", undefined, {
      timeout: 60000
    });
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

/**
 * Non-zero, asymmetric default so a swapped x/y coordinate-transform
 * regression would also be caught, not just "container isn't at (0,0)".
 * #graph-container is 512x512 (pages/index.html) inside Playwright's default
 * 1280x720 viewport, so this offset still leaves it fully on-screen.
 */
export const DEFAULT_CONTAINER_OFFSET = { left: 137, top: 83 };

/**
 * Shifts #graph-container off the viewport's (0,0) origin - every e2e
 * fixture otherwise sits flush at the origin (page body has margin:0),
 * which hid a class of coordinate-transform bugs where library code assumed
 * container.getBoundingClientRect().left/top were always 0 (see
 * src/utils/utils.ts's containerToClientPosition/containerToClientPosition
 * call sites). Call from beforeEach, before createOgma, so every
 * create/edit gesture in a spec also exercises an embedded, non-fullscreen,
 * offset container instead of only the flush-at-origin case. Drive the
 * mouse via the page-side screenToPage()/containerToPage() globals (see
 * pages/index.ts) afterwards, not raw graphToScreenCoordinates results or
 * literal pixel positions - those assume the container sits at (0,0).
 */
export async function offsetGraphContainer(
  session: BrowserSession,
  margin: { left: number; top: number } = DEFAULT_CONTAINER_OFFSET
) {
  await session.page.evaluate((m) => {
    const container = document.getElementById("graph-container")!;
    container.style.marginLeft = `${m.left}px`;
    container.style.marginTop = `${m.top}px`;
  }, margin);
}

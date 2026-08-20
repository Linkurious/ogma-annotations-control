import { Ogma, OgmaParameters } from "@linkurious/ogma";
import getPort from "get-port";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import { preview, build } from "vite";
import type { InlineConfig, PreviewServer } from "vite";

declare global {
  function createOgma(options: OgmaParameters): Ogma;
  function createEditor(): import("../../src").Control;
  function wait(ms: number): Promise<void>;
  let ogma: Ogma;
  let editor: import("../../src").Control;
  let createArrow: typeof import("../../src").createArrow;
  let createPolygon: typeof import("../../src").createPolygon;
}

export class BrowserSession {
  public server!: PreviewServer;
  public browser!: Browser;
  public page!: Page;
  public port!: number;

  async start(headless = true, options: InlineConfig = {}) {
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
      slowMo: 100
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

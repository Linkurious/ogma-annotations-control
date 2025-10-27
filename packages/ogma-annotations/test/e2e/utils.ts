import Ogma, { OgmaParameters } from "@linkurious/ogma";
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

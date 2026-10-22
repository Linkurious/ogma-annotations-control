/**
 * Vitest globalSetup for the e2e suite: builds the demo page, serves it and
 * launches Chromium exactly once per run, shared by every test file.
 *
 * Previously each file's beforeAll did its own `vite build` + `preview` +
 * `chromium.launch`. Besides costing 10x the setup time, all those builds
 * wrote into (and emptied) the same test/e2e/pages/dist while other files'
 * preview servers were serving it and reloading the page before every test -
 * a race that surfaced in CI as `createOgma is not defined` and beforeAll
 * timeouts under load.
 *
 * Each file still gets its own isolated BrowserContext (see utils.ts).
 */
import getPort from "get-port";
import { chromium } from "playwright";
import { build, preview } from "vite";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    e2eBaseUrl: string;
    e2eWsEndpoint: string;
  }
}

const root = "test/e2e/pages";

export default async function setup(project: TestProject) {
  await build({ root, logLevel: "warn" });
  const port = await getPort();
  const server = await preview({ root, preview: { port } });
  const browserServer = await chromium.launchServer({
    headless: process.env.E2E_HEADFUL !== "1"
  });

  project.provide("e2eBaseUrl", `http://localhost:${port}`);
  project.provide("e2eWsEndpoint", browserServer.wsEndpoint());

  return async () => {
    await browserServer.close();
    await new Promise<void>((resolve, reject) => {
      server.httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  };
}

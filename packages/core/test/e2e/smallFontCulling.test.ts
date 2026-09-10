import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession, captureScreenshotOnTestEnd } from "./utils";

describe("Small on-screen font size culling", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    captureScreenshotOnTestEnd(session, "smallFontCulling");
    await session.refresh();
    await session.page.evaluate(async () => {
      const ogma = createOgma({});
      await ogma.view.locateGraph();
      createEditor();
    });
  });

  it("hides a scalable Text's content once zoomed out past the default threshold, keeping its box, and still exports it in full", async () => {
    const setup = await session.page.evaluate(async () => {
      await ogma.view.setZoom(1);
      // Wide enough that the fontSize-20 content never wraps - keeps the
      // exported SVG's <text> a single unbroken run for a simple substring
      // assertion below.
      const text = createText(
        0,
        0,
        600,
        100,
        "ZoomCullTestContent",
        { fontSize: 20 }
      );
      editor.add(text);
      return { id: text.id };
    });

    // At zoom 1, 20px content is well above the default 2px threshold.
    await session.page.waitForFunction(
      () => document.querySelectorAll(".annotation-text > text").length > 0
    );

    // Zoom out far enough that 20px * zoom drops under the default
    // minReadableFontSize (2) - see Control.ts's defaultOptions.
    await session.page.evaluate(() => ogma.view.setZoom(0.05));

    await session.page.waitForFunction(
      () => document.querySelectorAll(".annotation-text > text").length === 0
    );
    const boxStillThere = await session.page.evaluate(
      () => !!document.querySelector(".annotation-text rect")
    );
    expect(boxStillThere).toBe(true);

    // Exporting at this same zoomed-out state must not silently drop the
    // text - the isExporting bypass should still render it in the output.
    const svg = await session.page.evaluate(() =>
      ogma.export.svg({ clip: true, download: false })
    );
    expect(svg).toContain("ZoomCullTestContent");
  }, 15000);

  it("never hides fixedSize text, regardless of zoom", async () => {
    await session.page.evaluate(async (fontSize) => {
      await ogma.view.setZoom(1);
      const text = createText(0, 0, 200, 100, "FixedSizeAlwaysVisible", {
        fontSize,
        fixedSize: true
      });
      editor.add(text);
    }, 20);

    await session.page.waitForFunction(
      () => document.querySelectorAll(".annotation-text > text").length > 0
    );

    await session.page.evaluate(() => ogma.view.setZoom(0.001));
    // Give the throttled render a moment to settle at the new zoom - since
    // nothing should change, there's no state to waitForFunction on here.
    await session.page.waitForTimeout(150);

    const stillVisible = await session.page.evaluate(
      () => document.querySelectorAll(".annotation-text > text").length > 0
    );
    expect(stillVisible).toBe(true);
  }, 15000);
});

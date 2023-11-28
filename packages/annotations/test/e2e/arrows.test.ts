import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import { BrowserSession } from "./utils";

describe('Arrows', () => {
  const session = new BrowserSession();
  beforeAll(async () => {
    await session.start(false);
  });

  afterAll(async () => {
    await session.close();
  });
  beforeEach(async () => {
    await session.refresh();
  });
  it('should add an arrow', async () => {
    const id = await session.page.evaluate(() => {
      const ogma = createOgma({});
      ogma.addNode({ id: 'test' });
      return ogma.getNodes().get(0).getId();
    });
    expect(id).toBe('test');
    await new Promise<void>((resolve) => setTimeout(resolve, 10000));
  });

});
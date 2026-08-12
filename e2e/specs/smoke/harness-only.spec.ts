import { test, expect } from "@playwright/test";
import { createCrudResource } from "../../fixtures/crud-resource";
import { loadProjectConfig } from "../../fixtures/load-config";

/**
 * Smoke A — harness-only (no real UI required).
 * VI: Chứng minh crud-resource + config load chạy được sau init.
 * EN: Proves crud-resource + config load work after init.
 */
test.describe("smoke / harness-only", () => {
  test("loads project config", () => {
    const cfg = loadProjectConfig();
    expect(cfg.project.code).toBeTruthy();
    expect(cfg.web.http_port).toBeGreaterThan(0);
  });

  test("crud-resource seeds and filters list payload shape", async () => {
    const resource = createCrudResource({
      path: "/demo-items",
      primary: true,
      seedCount: 5,
      seed: (i) => ({ id: i, name: `Item ${i}` }),
      writableFields: ["name"],
    });
    expect(resource.store).toHaveLength(5);

    const handled: unknown[] = [];
    const fakeRoute = {
      fulfill: async (opts: { body: string }) => {
        handled.push(JSON.parse(opts.body));
      },
    };

    const url = new URL("http://api.test/demo-items?pageNumber=1&pageSize=2&keyword=Item%203");
    const ok = await resource.handle(
      fakeRoute as never,
      url,
      "GET",
      { resourceType: () => "xhr", postDataJSON: () => null } as never,
    );
    expect(ok).toBe(true);
    expect(handled[0]).toMatchObject({
      data: { totalCount: 1, items: [{ id: 3, name: "Item 3" }] },
    });
  });
});

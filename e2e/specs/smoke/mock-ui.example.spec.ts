import fs from "node:fs";
import { test, expect } from "../../fixtures/domains/example-crud";
import { loadProjectConfig, resolveWebDir } from "../../fixtures/load-config";

/**
 * Smoke B — mock UI example.
 * VI: Cần web sibling đang chạy (webServer trong playwright.config).
 *     Sau init, đổi domains/example-crud.ts cho khớp app thật.
 * EN: Needs sibling web running (playwright webServer).
 *     After init, retarget domains/example-crud.ts to a real page.
 *     On Base template (no web_dir) this test is skipped.
 */
test.describe("smoke / mock-ui example", () => {
  test("goto app with mock session installed", async ({ page, goto, mock }) => {
    const cfg = loadProjectConfig();
    const webAbs = resolveWebDir(cfg);
    test.skip(
      !cfg.paths.web_dir || !webAbs || !fs.existsSync(webAbs),
      "web_dir missing — clone → init-quality.sh first (skipped on Base)",
    );

    expect(mock.store.length).toBeGreaterThan(0);
    await goto();
    // Soft assertion: page loaded under configured base path (or root).
    await expect(page).toHaveURL(new RegExp(cfg.web.base_path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "|^/$"));
  });
});

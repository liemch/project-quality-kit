import { test, expect } from "@playwright/test";
import { createCrudResource } from "../../fixtures/crud-resource";
import { makeListItem, padCode, seedMany } from "../../fixtures/factories/seed";
import { antd } from "../../fixtures/ui/antd";

/**
 * Golden QC patterns — copy when implementing Excel TCs.
 *
 * VI: 3 case Pass thật (expect meaningful), chạy trên Base không cần FE sibling.
 * EN: Three real-Pass examples; Base-safe (no web sibling).
 *
 * Run:
 *   npx playwright test e2e/specs/golden --project=mock
 *   npm run qc:run -- --id TC_GOLDEN.1   # after catalog contains these ids (clone)
 */

test.describe("golden / QC patterns", () => {
  test("TC_GOLDEN.1 seed factory + crud list filter @qc @golden", async () => {
    test.info().annotations.push({ type: "qcId", description: "TC_GOLDEN.1" });

    const seed = seedMany(5, (i) =>
      makeListItem({
        id: i,
        code: i === 2 ? "00280129" : padCode("TPL", i),
        name: `Template ${i}`,
        keywordFields: ["code", "name"],
      }),
    );
    expect(seed[1].searchText).toContain("00280129");

    const resource = createCrudResource({
      path: "/golden-templates",
      primary: true,
      seedCount: 0,
      seed: () => ({}),
      writableFields: ["name"],
      keywordField: "searchText",
    });
    resource.store = seed;

    const bodies: unknown[] = [];
    const fakeRoute = {
      fulfill: async (opts: { body: string }) => {
        bodies.push(JSON.parse(opts.body));
      },
    };
    const url = new URL("http://api.test/golden-templates?pageNumber=1&pageSize=10&keyword=00280129");
    const ok = await resource.handle(
      fakeRoute as never,
      url,
      "GET",
      { resourceType: () => "xhr", postDataJSON: () => null } as never,
    );
    expect(ok).toBe(true);
    expect(bodies[0]).toMatchObject({
      data: { totalCount: 1, items: [{ code: "00280129" }] },
    });
  });

  test("TC_GOLDEN.2 AntD table helpers on fixture DOM @qc @golden", async ({ page }) => {
    test.info().annotations.push({ type: "qcId", description: "TC_GOLDEN.2" });

    await page.setContent(`
      <!DOCTYPE html><html><body>
        <table class="ant-table"><tbody class="ant-table-tbody">
          <tr class="ant-table-row"><td>Alpha-001</td></tr>
          <tr class="ant-table-row"><td>Beta-002</td></tr>
        </tbody></table>
        <div class="ant-message"><div class="ant-message-notice">
          <div class="ant-message-notice-content">
            <div class="ant-message-custom-content ant-message-success">
              <span>Saved successfully</span>
            </div>
          </div>
        </div></div>
      </body></html>
    `);

    await expect(antd.tableRows(page)).toHaveCount(2);
    await expect(antd.tableRowByText(page, "Alpha-001")).toBeVisible();
    await antd.expectMessageSuccess(page, /Saved successfully/i);
  });

  test("TC_GOLDEN.3 AntD form + drawer helpers on fixture DOM @qc @golden", async ({ page }) => {
    test.info().annotations.push({ type: "qcId", description: "TC_GOLDEN.3" });

    await page.setContent(`
      <!DOCTYPE html><html><body>
        <div class="ant-drawer-open">
          <div class="ant-drawer-content-wrapper">
            <button class="ant-drawer-close" type="button">×</button>
            <form class="ant-form">
              <div class="ant-form-item">
                <label>Code</label>
                <input class="ant-input" value="" />
              </div>
              <div class="ant-form-item">
                <label>Name</label>
                <input class="ant-input" value="" />
              </div>
            </form>
          </div>
        </div>
      </body></html>
    `);

    await expect(antd.drawer(page)).toBeVisible();
    await antd.fillFormField(page, /Code/i, "TPL-0007");
    await antd.fillFormField(page, /Name/i, "Golden drawer");
    await expect(antd.formInput(page, /Code/i)).toHaveValue("TPL-0007");
    await expect(antd.formInput(page, /Name/i)).toHaveValue("Golden drawer");
    await expect(antd.drawerClose(page)).toBeVisible();
  });
});

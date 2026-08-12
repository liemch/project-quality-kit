import { defineDomainHarness } from "../harness";
import { loadProjectConfig } from "../load-config";
import { makeListItem, padCode } from "../factories/seed";

/**
 * Demo domain — used by smoke UI test when the target app is NOT wired yet.
 * VI: Thay file này bằng domain thật của dự án (path API + functionCode + URL trang).
 * EN: Replace with a real project domain (API path + functionCode + page URL).
 */

const cfg = loadProjectConfig();
const base = cfg.web.base_path.replace(/\/$/, "") || "";

export const { test, expect, makeRecords } = defineDomainHarness({
  url: `${base}/`,
  ready: async (page) => {
    await page.waitForLoadState("domcontentloaded");
  },
  functionCode: `${cfg.project.code}.DEMO.CRUD`,
  resources: {
    demo: {
      path: "/demo-items",
      primary: true,
      seedCount: 3,
      keywordField: "searchText",
      seed: (i) =>
        makeListItem({
          id: i,
          code: padCode("DEMO", i),
          name: `Demo item ${String(i).padStart(2, "0")}`,
          isActive: true,
          keywordFields: ["code", "name"],
        }),
    },
  },
});

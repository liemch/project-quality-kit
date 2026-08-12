import { defineDomainHarness } from "../harness";
import { loadProjectConfig } from "../load-config";

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
    // Harness-level ready: just wait for document; UI smoke may assert more.
    await page.waitForLoadState("domcontentloaded");
  },
  functionCode: `${cfg.project.code}.DEMO.CRUD`,
  resources: {
    demo: {
      path: "/demo-items",
      primary: true,
      seedCount: 3,
      seed: (i) => ({
        id: i,
        name: `Demo item ${String(i).padStart(2, "0")}`,
        isActive: true,
      }),
      writableFields: ["name", "isActive"],
    },
  },
});

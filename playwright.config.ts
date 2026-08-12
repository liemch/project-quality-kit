/// <reference types="node" />
import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loadProjectConfig, resolveWebDir, webBaseURL } from "./e2e/fixtures/load-config";

const cfg = loadProjectConfig();
const PORT = cfg.web.http_port;
const BASE_PATH = cfg.web.base_path || "/";
const WEB_DIR = resolveWebDir(cfg);
const OBSERVE = !!process.env.PW_OBSERVE;
const HAS_WEB = !!WEB_DIR && fs.existsSync(WEB_DIR);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }], ["./e2e/qc/qc-reporter.ts"]],
  timeout: 90_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: webBaseURL(cfg),
    trace: OBSERVE ? "on" : "on-first-retry",
    screenshot: OBSERVE ? "on" : "only-on-failure",
    video: OBSERVE ? "on" : "retain-on-failure",
    locale: process.env.PW_LOCALE || "vi-VN",
    timezoneId: process.env.PW_TZ || "Asia/Ho_Chi_Minh",
    ignoreHTTPSErrors: true,
    viewport: OBSERVE ? null : { width: 1440, height: 900 },
    launchOptions: {
      slowMo: Number(process.env.PW_SLOWMO ?? 0),
      args: OBSERVE ? ["--start-maximized"] : [],
    },
  },

  projects: [
    {
      name: "mock",
      use: { browserName: "chromium" },
      testMatch: /.*\.(mock\.)?spec\.ts/,
      testIgnore: [/.*\.real\.spec\.ts/, /auth\.setup\.ts/],
    },
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        storageState: fs.existsSync("playwright/.auth/user.json")
          ? "playwright/.auth/user.json"
          : undefined,
      },
      testIgnore: [/.*\.mock\.spec\.ts/, /auth\.setup\.ts/, /harness-only\.spec\.ts/],
    },
  ],

  webServer: HAS_WEB
    ? {
        command: cfg.web.dev_command || "npm run dev",
        cwd: WEB_DIR,
        url: `${webBaseURL(cfg)}${BASE_PATH.endsWith("/") ? BASE_PATH : BASE_PATH + "/"}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
        // Vite/npm often ignore plain close — force teardown after the run.
        gracefulShutdown: { signal: "SIGTERM", timeout: 3_000 },
      }
    : undefined,
});

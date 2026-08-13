/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loadProjectConfig, resolveWebDir, webBaseURL } from "./e2e/fixtures/load-config";

const cfg = loadProjectConfig();
const BASE_PATH = cfg.web.base_path || "/";
const WEB_DIR = resolveWebDir(cfg);
const OBSERVE = !!process.env.PW_OBSERVE;
const HAS_WEB = !!WEB_DIR && fs.existsSync(WEB_DIR);
const SKIP_WEBSERVER = process.env.PW_SKIP_WEBSERVER === "1" || process.env.PW_SKIP_WEBSERVER === "true";
const REAL_MODE = process.env.PLAYWRIGHT_MODE === "real";
const AUTH_FILE = path.resolve("playwright/.auth/user.json");
const WEBSERVER_TIMEOUT = Number(process.env.PW_WEBSERVER_TIMEOUT_MS || 120_000);

/**
 * Playwright wipes `outputDir` at the START of every run. With a shared
 * `test-results/`, a later smoke run therefore deletes screenshots/video/trace
 * of an earlier QC wave. So each run gets its own dir + a `latest` pointer,
 * and only the oldest runs beyond PW_KEEP_RUNS are pruned.
 */
const ARTIFACT_ROOT = process.env.PW_ARTIFACT_ROOT || "test-results";
const RUN_ID = process.env.PW_RUN_ID || new Date().toISOString().replace(/[:.]/g, "-");
const OUTPUT_DIR = process.env.PW_OUTPUT_DIR || path.join(ARTIFACT_ROOT, `run-${RUN_ID}`);
const KEEP_RUNS = Number(process.env.PW_KEEP_RUNS ?? 10);

function prepareArtifactDirs(): void {
  try {
    fs.mkdirSync(path.resolve(OUTPUT_DIR), { recursive: true });
    if (KEEP_RUNS > 0 && !process.env.PW_OUTPUT_DIR) {
      const runs = fs
        .readdirSync(path.resolve(ARTIFACT_ROOT), { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith("run-"))
        .map((e) => e.name)
        .sort();
      for (const stale of runs.slice(0, Math.max(0, runs.length - KEEP_RUNS))) {
        fs.rmSync(path.resolve(ARTIFACT_ROOT, stale), { recursive: true, force: true });
        console.log(`[playwright] pruned old artifacts: ${ARTIFACT_ROOT}/${stale}`);
      }
    }
    const latest = path.resolve(ARTIFACT_ROOT, "latest");
    fs.rmSync(latest, { recursive: true, force: true });
    fs.symlinkSync(path.basename(OUTPUT_DIR), latest, "dir");
  } catch (e) {
    console.log(`[playwright] artifact dir setup skipped: ${(e as Error).message}`);
  }
}
prepareArtifactDirs();
console.log(`[playwright] artifacts → ${OUTPUT_DIR} (keep last ${KEEP_RUNS} run(s), latest → ${ARTIFACT_ROOT}/latest)`);

const desktopChrome = {
  ...devices["Desktop Chrome"],
  viewport: OBSERVE ? null : ({ width: 1440, height: 900 } as const),
};

function webServerConfig() {
  if (!HAS_WEB || SKIP_WEBSERVER) {
    if (SKIP_WEBSERVER) {
      console.log("[playwright] PW_SKIP_WEBSERVER=1 — not starting FE");
    } else if (!HAS_WEB) {
      console.log("[playwright] No web_dir — webServer disabled");
    }
    return undefined;
  }
  const url = `${webBaseURL(cfg)}${BASE_PATH.endsWith("/") ? BASE_PATH : BASE_PATH + "/"}`;
  console.log(`[playwright] webServer → ${cfg.web.dev_command || "npm run dev"} @ ${url}`);
  return {
    command: cfg.web.dev_command || "npm run dev",
    cwd: WEB_DIR,
    url,
    reuseExistingServer: !process.env.CI,
    timeout: WEBSERVER_TIMEOUT,
    stdout: (process.env.PW_WEBSERVER_LOG === "1" ? "pipe" : "ignore") as "pipe" | "ignore",
    stderr: "pipe" as const,
    gracefulShutdown: { signal: "SIGTERM" as const, timeout: 3_000 },
  };
}

const mockProject = {
  name: "mock",
  use: {
    browserName: "chromium" as const,
    ...desktopChrome,
  },
  testMatch: /.*\.(mock\.)?spec\.ts/,
  testIgnore: [/.*\.real\.spec\.ts/, /auth\.setup\.ts/],
};

const projects = REAL_MODE
  ? [
      {
        name: "setup",
        testMatch: /auth\.setup\.ts/,
        use: { browserName: "chromium" as const, ...desktopChrome },
      },
      {
        name: "chromium",
        dependencies: ["setup"],
        use: {
          browserName: "chromium" as const,
          ...desktopChrome,
          storageState: AUTH_FILE,
        },
        testIgnore: [/.*\.mock\.spec\.ts/, /auth\.setup\.ts/, /harness-only\.spec\.ts/],
      },
    ]
  : [mockProject];

export default defineConfig({
  testDir: "./e2e",
  outputDir: OUTPUT_DIR,
  preserveOutput: "failures-only",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }], ["./e2e/qc/qc-reporter.ts"]],
  timeout: 90_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: webBaseURL(cfg),
    trace: OBSERVE ? "on" : "retain-on-failure",
    screenshot: OBSERVE ? "on" : "only-on-failure",
    video: OBSERVE ? "on" : "retain-on-failure",
    locale: process.env.PW_LOCALE || "vi-VN",
    timezoneId: process.env.PW_TZ || "Asia/Ho_Chi_Minh",
    ignoreHTTPSErrors: true,
    launchOptions: {
      slowMo: Number(process.env.PW_SLOWMO ?? 0),
      args: OBSERVE ? ["--start-maximized"] : [],
    },
  },

  projects,
  webServer: webServerConfig(),
});

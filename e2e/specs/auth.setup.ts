/**
 * Real-mode auth setup — generates playwright/.auth/user.json for the `chromium` project.
 *
 * Enable:
 *   1. Fill auth.real.* in _meta/project.yml
 *   2. Implement authenticateReal in adapters/auth.real.stub.ts (or rename to auth.real.ts)
 *   3. PLAYWRIGHT_MODE=real npm run test:e2e-real
 *
 * See docs/auth-real.md
 */
import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { authenticateReal } from "../fixtures/adapters/auth.real.stub";

const AUTH_FILE = path.resolve("playwright/.auth/user.json");

setup("authenticate (real)", async ({ page, context }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await authenticateReal(page, context);
  await context.storageState({ path: AUTH_FILE });
});

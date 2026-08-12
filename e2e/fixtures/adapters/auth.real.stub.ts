/**
 * Real-mode auth adapter (STUB).
 * VI: Đội dự án điền login_url / token_endpoint trong `_meta/project.yml` rồi implement hàm dưới.
 * EN: Fill login_url / token_endpoint in `_meta/project.yml`, then implement the helpers below.
 *
 * Suggested flow:
 * 1. POST token_endpoint (or open login_url + SSO) → access token
 * 2. Write playwright/.auth/user.json via storageState
 * 3. chromium project depends on auth.setup.ts which calls `authenticateReal`
 */

import type { BrowserContext, Page } from "@playwright/test";
import { loadProjectConfig } from "../load-config";

export async function authenticateReal(page: Page, context: BrowserContext): Promise<string> {
  const cfg = loadProjectConfig();
  const endpoint = cfg.auth.real.token_endpoint;
  const loginUrl = cfg.auth.real.login_url;

  if (!endpoint && !loginUrl) {
    throw new Error(
      "[auth.real.stub] Set auth.real.token_endpoint or auth.real.login_url in _meta/project.yml before running real mode.",
    );
  }

  // --- Team implements project-specific login here ---
  // Example (token endpoint):
  //   const res = await fetch(endpoint, { method: "POST", body: JSON.stringify({ email }) });
  //   const token = (await res.json()).data.accessToken;
  //   await context.addCookies([{ name: cfg.auth.cookie_name, value: token, domain: "localhost", path: "/" }]);
  //   return token;

  void page;
  void context;
  throw new Error("[auth.real.stub] Not implemented for this project yet.");
}

/**
 * Real-mode auth adapter (STUB + env token shortcut).
 * Prefer E2E_REAL_TOKEN (or auth.real.token_env); otherwise implement login UI/API.
 * See docs/auth-real.md
 */

import type { BrowserContext, Page } from "@playwright/test";
import { loadProjectConfig, webBaseURL } from "../load-config";

export async function authenticateReal(page: Page, context: BrowserContext): Promise<string> {
  const cfg = loadProjectConfig();
  const tokenEnv = cfg.auth?.real?.token_env || "E2E_REAL_TOKEN";
  const envToken = process.env[tokenEnv] || process.env.E2E_REAL_TOKEN;
  const endpoint = cfg.auth?.real?.token_endpoint || "";
  const loginUrl = cfg.auth?.real?.login_url || "";
  const cookieName = cfg.auth?.cookie_name || "access_token";
  const keys = cfg.auth?.local_storage_keys?.length
    ? cfg.auth.local_storage_keys
    : ["ACCESS_TOKEN", "access_token", "token"];

  if (envToken) {
    await context.addCookies([
      { name: cookieName, value: envToken, domain: "localhost", path: "/" },
      { name: cookieName, value: envToken, domain: "127.0.0.1", path: "/" },
    ]);
    await context.addInitScript(
      ({ authToken, storageKeys }) => {
        for (const k of storageKeys) window.localStorage.setItem(k, authToken);
      },
      { authToken: envToken, storageKeys: keys },
    );
    const basePath = cfg.web?.base_path || "/";
    await page.goto(webBaseURL(cfg) + (basePath.endsWith("/") ? basePath : `${basePath}/`));
    return envToken;
  }

  if (!endpoint && !loginUrl) {
    throw new Error(
      `[auth.real] Set ${tokenEnv} env, or auth.real.token_endpoint / login_url in _meta/project.yml. See docs/auth-real.md`,
    );
  }

  void page;
  void context;
  void endpoint;
  void loginUrl;
  throw new Error(
    "[auth.real] No E2E_REAL_TOKEN — implement authenticateReal for token_endpoint / login_url (docs/auth-real.md).",
  );
}

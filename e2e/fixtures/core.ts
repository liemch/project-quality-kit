import fs from "node:fs";
import path from "node:path";
import { type BrowserContext, type Route } from "@playwright/test";
import { loadProjectConfig, webDevHost, type ProjectConfig } from "./load-config";

/**
 * Session / transport layer — domain-agnostic.
 * VI: Bypass auth + mock session endpoints + CORS + fallback.
 * EN: Auth bypass + mock session endpoints + CORS + harmless fallback.
 */

export const PLAYWRIGHT_MODE = process.env.PLAYWRIGHT_MODE || "mock";
export const IS_MOCK = PLAYWRIGHT_MODE === "mock";

export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "*",
} as const;

const VPN = { isGranted: true, isWeekendBlock: false, startTime: null, endTime: null };

const DEFAULT_PROFILE = {
  roles: ["E2E_USER"],
  userInfo: {
    id: 1,
    userName: "e2e.tester",
    fullName: "E2E Tester",
    email: "e2e.tester@example.com",
    phone: null,
    positionName: null,
    address: null,
    departmentName: null,
    departmentCode: null,
    divisionName: null,
  },
};

export type PermissionEntry = { functionCode: string; actions: string[] };

export async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: { ...CORS_HEADERS },
    body: JSON.stringify(body),
  });
}

function endsWithPath(pathname: string, suffix: string): boolean {
  const norm = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return pathname === norm || pathname.endsWith(norm);
}

/** cookie-fake (default) or storage-state token from env / playwright/.auth */
export async function addAuthCookie(context: BrowserContext, cfg: ProjectConfig = loadProjectConfig()): Promise<void> {
  const envName = cfg.auth.real.token_env || "E2E_REAL_TOKEN";
  let token = process.env[envName];

  if (!token) {
    try {
      const authPath = path.resolve(process.cwd(), "playwright/.auth/user.json");
      if (fs.existsSync(authPath)) {
        const authData = JSON.parse(fs.readFileSync(authPath, "utf8")) as {
          cookies?: Array<{ name: string; value: string }>;
        };
        const cookie = authData.cookies?.find((c) => c.name === cfg.auth.cookie_name);
        if (cookie?.value && cookie.value !== "e2e-fake-token") token = cookie.value;
      }
    } catch {
      /* ignore */
    }
  }

  token = token || "e2e-fake-token";
  const name = cfg.auth.cookie_name || "access_token";

  await context.addCookies([
    { name, value: token, domain: "localhost", path: "/" },
    { name, value: token, domain: "127.0.0.1", path: "/" },
  ]);

  const keys = cfg.auth.local_storage_keys?.length
    ? cfg.auth.local_storage_keys
    : ["ACCESS_TOKEN", "access_token", "token"];

  await context.addInitScript(
    ({ authToken, storageKeys }) => {
      for (const k of storageKeys) window.localStorage.setItem(k, authToken);
    },
    { authToken: token, storageKeys: keys },
  );
}

/** Serve configurable session endpoints. Returns true if handled. */
export async function handleSession(
  route: Route,
  url: URL,
  getPermissions: () => PermissionEntry[],
  cfg: ProjectConfig = loadProjectConfig(),
): Promise<boolean> {
  const p = url.pathname;
  const s = cfg.session;

  if (endsWithPath(p, s.me)) {
    await fulfillJson(route, { data: DEFAULT_PROFILE });
    return true;
  }
  if (endsWithPath(p, s.permissions)) {
    const permissions = [
      ...getPermissions().map((e) => ({ functionCode: e.functionCode, vpnAccess: VPN, actions: e.actions })),
      {
        functionCode: s.baseline_permission.function_code,
        vpnAccess: VPN,
        actions: s.baseline_permission.actions,
      },
    ];
    await fulfillJson(route, { data: { appCode: s.app_code, permissions } });
    return true;
  }
  if (endsWithPath(p, s.functions)) {
    await fulfillJson(route, { data: [] });
    return true;
  }
  if (endsWithPath(p, s.my_apps)) {
    await fulfillJson(route, { data: { items: null } });
    return true;
  }
  if (endsWithPath(p, s.check_session)) {
    await fulfillJson(route, { data: true });
    return true;
  }
  return false;
}

/** Same-origin assets continue; other backend calls get a harmless stub. */
export async function handleFallback(
  route: Route,
  url: URL,
  cfg: ProjectConfig = loadProjectConfig(),
): Promise<boolean> {
  if (url.host === webDevHost(cfg)) {
    await route.continue();
    return true;
  }
  await fulfillJson(route, { data: { items: [], totalCount: 0 } });
  return true;
}

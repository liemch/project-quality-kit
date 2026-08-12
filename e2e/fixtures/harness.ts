import { test as base, expect, type Page, type Request, type Route } from "@playwright/test";
import { addAuthCookie, CORS_HEADERS, handleFallback, handleSession, type PermissionEntry } from "./core";
import { createCrudResource, type CrudCounts, type CrudResource, type CrudResourceConfig } from "./crud-resource";
import { loadProjectConfig } from "./load-config";

type Rec = Record<string, unknown>;

export type ReadySpec = { columnheader: string } | ((page: Page) => Promise<void>);

export type DomainHarnessConfig = {
  url: string;
  ready: ReadySpec;
  functionCode: string;
  defaultActions?: string[];
  extraPermissions?: PermissionEntry[];
  resources: Record<string, CrudResourceConfig<Rec>>;
  extraRoutes?: (route: Route, url: URL, method: string, req: Request, mock: MockState) => Promise<boolean>;
};

export type MockState = {
  permActions: string[];
  resources: Record<string, CrudResource<Rec>>;
  store: Rec[];
  counts: CrudCounts;
  listDelayMs: number;
  holdListForPage: (n: number) => void;
  releaseList: () => void;
};

const DEFAULT_ACTIONS = ["VIEW", "CREATE", "UPDATE", "DELETE"];

export function defineDomainHarness(config: DomainHarnessConfig) {
  const keys = Object.keys(config.resources);
  const primaryKey = keys.find((k) => config.resources[k].primary) ?? keys[0];
  const projectCfg = loadProjectConfig();

  const test = base.extend<{ mock: MockState; goto: () => Promise<void> }>({
    mock: async ({ context }, use) => {
      const resources: Record<string, CrudResource<Rec>> = {};
      for (const k of keys) resources[k] = createCrudResource(config.resources[k]);
      const primary = resources[primaryKey];

      const state = {
        permActions: [...(config.defaultActions ?? DEFAULT_ACTIONS)],
        resources,
        counts: primary.counts,
        holdListForPage: (n: number) => primary.holdListForPage(n),
        releaseList: () => primary.releaseList(),
      } as MockState;

      Object.defineProperty(state, "store", {
        enumerable: true,
        get: () => primary.store,
        set: (v: Rec[]) => {
          primary.store = v;
        },
      });
      Object.defineProperty(state, "listDelayMs", {
        enumerable: true,
        get: () => primary.listDelayMs,
        set: (v: number) => {
          primary.listDelayMs = v;
        },
      });

      const getPermissions = (): PermissionEntry[] => [
        { functionCode: config.functionCode, actions: state.permActions },
        ...(config.extraPermissions ?? []),
      ];

      await addAuthCookie(context, projectCfg);
      await context.route("**/*", async (route) => {
        const req = route.request();
        const method = req.method();
        const url = new URL(req.url());

        if (method === "OPTIONS") {
          await route.fulfill({ status: 204, headers: { ...CORS_HEADERS }, body: "" });
          return;
        }
        if (await handleSession(route, url, getPermissions, projectCfg)) return;
        if (config.extraRoutes && (await config.extraRoutes(route, url, method, req, state))) return;
        for (const k of keys) {
          if (await resources[k].handle(route, url, method, req)) return;
        }
        await handleFallback(route, url, projectCfg);
      });
      await use(state);
    },

    goto: async ({ page, mock }, use) => {
      void mock;
      await use(async () => {
        await page.goto(config.url);
        if (typeof config.ready === "function") await config.ready(page);
        else await page.getByRole("columnheader", { name: config.ready.columnheader }).waitFor();
      });
    },
  });

  const primarySeed = config.resources[primaryKey].seed;
  const makeRecords = (n: number): Rec[] =>
    primarySeed ? Array.from({ length: n }, (_, i) => primarySeed(i + 1)) : [];

  return { test, expect, makeRecords };
}

/** Tag a Playwright test with a QC Excel Testcase ID (e.g. TC_03.1). */
export function qcId(testFn: typeof base, id: string): void {
  const annotationType = loadProjectConfig().qc.annotation_type || "qcId";
  testFn.info().annotations.push({ type: annotationType, description: id });
}

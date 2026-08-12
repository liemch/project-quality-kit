import { type Request, type Route } from "@playwright/test";
import { fulfillJson } from "./core";
import { loadProjectConfig } from "./load-config";

/** One stateful CRUD resource (list + optional detail + create/update/delete). */
export type CrudResourceConfig<T> = {
  path: string;
  primary?: boolean;
  seedCount?: number;
  seed?: (index1Based: number) => T;
  writableFields?: (keyof T)[];
  idField?: keyof T;
  hasDetail?: boolean;
  /** Field used for keyword filter (default: name) */
  keywordField?: keyof T;
};

export type CrudCounts = { list: number; create: number; update: number; remove: number; detail: number };

export type CrudResource<T> = {
  store: T[];
  counts: CrudCounts;
  listDelayMs: number;
  holdListForPage: (pageNumber: number) => void;
  releaseList: () => void;
  seedRecords: (n: number) => T[];
  handle: (route: Route, url: URL, method: string, req: Request) => Promise<boolean>;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createCrudResource<T extends Record<string, unknown>>(config: CrudResourceConfig<T>): CrudResource<T> {
  const cfg = loadProjectConfig();
  const envelope = cfg.dto.data_envelope || "data";
  const itemsKey = cfg.dto.list_items_key || "items";
  const totalKey = cfg.dto.list_total_key || "totalCount";

  const idField = (config.idField ?? "id") as keyof T;
  const keywordField = (config.keywordField ?? "name") as string;
  const seed = config.seed ?? ((i: number) => ({ [idField]: i }) as unknown as T);
  const writable = (config.writableFields ?? []) as (keyof T)[];
  const seedRecords = (n: number): T[] => Array.from({ length: n }, (_, i) => seed(i + 1));
  const re = new RegExp(`${escapeRegExp(config.path)}(?:/(\\d+))?$`);

  let gate: Promise<void> | null = null;
  let release: (() => void) | null = null;
  let holdPage: number | null = null;

  const wrap = (payload: unknown) => ({ [envelope]: payload });

  const res: CrudResource<T> = {
    store: seedRecords(config.seedCount ?? 0),
    counts: { list: 0, create: 0, update: 0, remove: 0, detail: 0 },
    listDelayMs: 0,
    holdListForPage(pageNumber) {
      holdPage = pageNumber;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    releaseList() {
      release?.();
      release = null;
      gate = null;
      holdPage = null;
    },
    seedRecords,
    async handle(route, url, method, req) {
      if (req.resourceType() === "document") return false;
      const m = url.pathname.match(re);
      if (!m) return false;
      const id = m[1] ? Number(m[1]) : null;

      if (id === null && method === "GET") {
        res.counts.list++;
        const kw = (url.searchParams.get("keyword") ?? "").trim().toLowerCase();
        const pageNumber = Number(url.searchParams.get("pageNumber") ?? "1");
        const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
        if (gate && holdPage === pageNumber) {
          const g = gate;
          gate = null;
          await g;
        } else if (res.listDelayMs > 0) {
          await new Promise((r) => setTimeout(r, res.listDelayMs));
        }
        const filtered = kw
          ? res.store.filter((t) => String(t[keywordField] ?? "").toLowerCase().includes(kw))
          : res.store;
        const start = (pageNumber - 1) * pageSize;
        await fulfillJson(
          route,
          wrap({ [itemsKey]: filtered.slice(start, start + pageSize), [totalKey]: filtered.length }),
        );
        return true;
      }

      if (id !== null && method === "GET" && config.hasDetail) {
        res.counts.detail++;
        await fulfillJson(route, wrap(res.store.find((t) => Number(t[idField]) === id) ?? null));
        return true;
      }

      if (id === null && method === "POST") {
        res.counts.create++;
        const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
        const newId = res.store.reduce((mx, t) => Math.max(mx, Number(t[idField])), 0) + 1;
        const rec: Record<string, unknown> = { [idField as string]: newId };
        for (const f of writable) rec[f as string] = body[f as string];
        rec.createdBy = "e2e.tester";
        rec.transactionDate = new Date().toISOString();
        rec.updatedBy = null;
        rec.updatedDate = null;
        res.store.unshift(rec as T);
        await fulfillJson(route, wrap(newId));
        return true;
      }

      if (id !== null && method === "PUT") {
        res.counts.update++;
        const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
        const t = res.store.find((x) => Number(x[idField]) === id) as Record<string, unknown> | undefined;
        if (t) {
          for (const f of writable) t[f as string] = body[f as string];
          t.updatedBy = "e2e.tester";
          t.updatedDate = new Date().toISOString();
        }
        await fulfillJson(route, wrap(id));
        return true;
      }

      if (id !== null && method === "DELETE") {
        res.counts.remove++;
        const i = res.store.findIndex((x) => Number(x[idField]) === id);
        if (i >= 0) res.store.splice(i, 1);
        await fulfillJson(route, wrap(id));
        return true;
      }

      return false;
    },
  };
  return res;
}

import fs from "node:fs";
import path from "node:path";
import type { FullConfig, FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { findKitRoot, loadProjectConfig } from "../fixtures/load-config";

type QcRow = {
  qcId: string;
  title: string;
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  file: string;
  durationMs: number;
  error?: string;
  attachments?: string[];
  attachmentsMissing?: boolean;
  updatedAt?: string;
};

/**
 * Collects Playwright results keyed by qcId for Excel export / coverage.
 *
 * Merge policy (default):
 *   - Load existing qc/results.json
 *   - Upsert rows from this run by qcId (latest wins for that id)
 *   - Keep other qcIds untouched (smoke / partial run must NOT wipe a sheet wave)
 *
 * Replace-all: QC_RESULTS_REPLACE=1
 * Base template: skip write (no leak).
 */
class QcReporter implements Reporter {
  private rows: QcRow[] = [];
  private annotationType = "qcId";

  onBegin(_config: FullConfig): void {
    try {
      this.annotationType = loadProjectConfig().qc.annotation_type || "qcId";
    } catch {
      this.annotationType = "qcId";
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const ann = test.annotations.find((a) => a.type === this.annotationType);
    if (!ann?.description) return;
    const attachments = (result.attachments || [])
      .filter((a) => a.path)
      .map((a) => `${a.name}:${a.path}`);
    this.rows.push({
      qcId: ann.description,
      title: test.title,
      status: result.status,
      file: test.location.file,
      durationMs: result.duration,
      error: result.error?.message,
      attachments: attachments.length ? attachments : undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  onEnd(_result: FullResult): void {
    if (!this.rows.length) return;
    const kitRoot = findKitRoot();
    if (path.basename(kitRoot) === "project-quality-kit" && process.env.QUALITY_ALLOW_BASE_INIT !== "1") {
      console.log("[qc-reporter] skip write on Base template (no qc/results.json leak)");
      return;
    }
    const cfg = loadProjectConfig(kitRoot);
    const out = path.resolve(kitRoot, cfg.qc.results_out || "qc/results.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });

    const replaceAll = process.env.QC_RESULTS_REPLACE === "1" || process.env.QC_RESULTS_REPLACE === "true";
    const byId = new Map<string, QcRow>();

    if (!replaceAll && fs.existsSync(out)) {
      try {
        const prev = JSON.parse(fs.readFileSync(out, "utf8")) as { rows?: QcRow[] };
        for (const row of prev.rows || []) {
          if (!row?.qcId) continue;
          const gone = (row.attachments || []).some((a) => {
            const p = a.slice(a.indexOf(":") + 1);
            return p && !fs.existsSync(p);
          });
          byId.set(row.qcId, gone ? { ...row, attachmentsMissing: true } : row);
        }
      } catch (e) {
        console.warn("[qc-reporter] could not read previous results — writing this run only:", (e as Error).message);
      }
    }

    for (const row of this.rows) {
      byId.set(row.qcId, row);
    }

    const merged = [...byId.values()].sort((a, b) => a.qcId.localeCompare(b.qcId, undefined, { numeric: true }));
    const payload = {
      generatedAt: new Date().toISOString(),
      count: merged.length,
      merge: !replaceAll,
      lastRunCount: this.rows.length,
      rows: merged,
    };
    fs.writeFileSync(out, JSON.stringify(payload, null, 2));
    console.log(
      `[qc-reporter] ${replaceAll ? "replaced" : "merged"} ${this.rows.length} run row(s) → ${merged.length} total @ ${out}`,
    );
  }
}

export default QcReporter;

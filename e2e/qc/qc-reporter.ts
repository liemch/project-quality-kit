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
};

/**
 * Collects Playwright results keyed by qcId annotation for Excel export.
 * On failure, records screenshot/video/trace attachment paths when present.
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
    });
  }

  onEnd(_result: FullResult): void {
    if (!this.rows.length) return;
    const kitRoot = findKitRoot();
    const cfg = loadProjectConfig(kitRoot);
    const out = path.resolve(kitRoot, cfg.qc.results_out || "qc/results.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(
      out,
      JSON.stringify({ generatedAt: new Date().toISOString(), count: this.rows.length, rows: this.rows }, null, 2),
    );
    console.log(`[qc-reporter] wrote ${this.rows.length} row(s) → ${out}`);
  }
}

export default QcReporter;

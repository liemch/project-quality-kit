import { test, expect } from "@playwright/test";

/**
 * Example: bind a Playwright test to a QC Excel Testcase ID.
 * VI: Dùng annotation type `qcId` (cấu hình ở _meta/project.yml#qc.annotation_type).
 * EN: Use annotation type `qcId` (see _meta/project.yml#qc.annotation_type).
 *
 * Run only this QC id:
 *   npm run qc:run -- --id TC_03.1
 */
test("TC_03.1 example binding @qc", async () => {
  test.info().annotations.push({ type: "qcId", description: "TC_03.1" });
  // Replace with real steps mapped from Excel Pre-condition / Test Steps / Expected Result.
  expect("TC_03.1").toMatch(/^TC_/);
});

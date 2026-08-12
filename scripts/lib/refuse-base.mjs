#!/usr/bin/env node
/**
 * Shared guard: refuse project-mutating operations inside the Base template.
 * Escape: QUALITY_ALLOW_BASE_INIT=1 (maintainer tests only).
 */
import path from "node:path";

export function assertNotBaseTemplate(kitRoot, label = "quality") {
  if (
    path.basename(path.resolve(kitRoot)) === "project-quality-kit" &&
    process.env.QUALITY_ALLOW_BASE_INIT !== "1"
  ) {
    console.error(
      `[${label}] Refusing to mutate the Base template '${kitRoot}'. ` +
        `Clone/copy to '<project>-quality' first. Maintainer override: QUALITY_ALLOW_BASE_INIT=1.`,
    );
    process.exit(1);
  }
}

import "server-only";
import { readdir, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function removeAbandonedReportTemporaryFiles() {
  const directory = tmpdir();
  const entries = await readdir(directory, { withFileTypes: true });
  const candidates = entries.filter(
    (entry) =>
      entry.isDirectory() && /^sme-report-[A-Za-z0-9]+$/.test(entry.name),
  );
  let removed = 0;
  for (const entry of candidates) {
    if (removed >= 10) {
      break;
    }
    const path = join(directory, entry.name);
    const metadata = await stat(path).catch(() => null);
    // A running worker is bounded to 90 seconds, with a 180-second lease.
    // A one-hour retention boundary avoids deleting an active export.
    if (metadata && metadata.mtimeMs < Date.now() - 60 * 60 * 1000) {
      await rm(path, { recursive: true, force: true });
      removed++;
    }
  }
  return removed;
}

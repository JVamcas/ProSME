import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

type RenderEvidence = {
  deduplication: { readsWithMemoization: number };
  publication: boolean;
  preview: boolean;
  buildFallback: boolean;
  persistentCache: boolean;
  resourcePagination: boolean;
  restartIsolation: boolean;
};

let evidence: RenderEvidence;

beforeAll(() => {
  const fixture = fileURLToPath(new URL("../../support/ContentServerRenderFixture.mjs", import.meta.url));
  const output = execFileSync(process.execPath, ["--conditions=react-server", fixture], {
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, NODE_ENV: "development", SKIP_CMS_PRERENDER: "0" },
  });
  evidence = JSON.parse(output);
}, 35_000);

describe("CMS reads in the real React server renderer", () => {
  it("coalesces concurrent and sequential identical reads while separating slugs", () => {
    expect(evidence.deduplication.readsWithMemoization).toBe(17);
  });

  it("reads new publications and excludes unpublished pages, resources and feeds on the next request", () => {
    expect(evidence.publication).toBe(true);
  });

  it("isolates authorized previews from public, mismatched and disabled sessions across requests", () => {
    expect(evidence.preview).toBe(true);
  });

  it("defers build reads and ignores leaked placeholder flags at runtime", () => {
    expect(evidence.buildFallback).toBe(true);
  });

  it("uses the installed Next cache across requests and expires pages on CMS/media events", () => {
    expect(evidence.persistentCache).toBe(true);
  });

  it("separates pagination keys and expires every resource page with its counts", () => {
    expect(evidence.resourcePagination).toBe(true);
  });

  it("excludes unpublished content after a restart with old cache files and lost tags", () => {
    expect(evidence.restartIsolation).toBe(true);
  });
});

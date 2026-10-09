import { globSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../config/load-environment.js", () => ({
  loadEnvironment: () => undefined,
}));

import config from "../../../next.config.mjs";

const applicationRoot = fileURLToPath(new URL("../../../", import.meta.url));
const requireFromApplication = createRequire(
  path.join(applicationRoot, "package.json"),
);

describe("reporting PostgreSQL parser packaging", () => {
  it("preserves native package loading after Payload wraps the config", () => {
    expect(config.serverExternalPackages).toContain("libpg-query");
    expect(config.serverExternalPackages).toContain("graphql");
  });

  it("explicitly traces the WASM file beside the native package loader", () => {
    const loader = requireFromApplication.resolve("libpg-query");
    const wasm = path.join(path.dirname(loader), "libpg-query.wasm");
    const includes = config.outputFileTracingIncludes?.["/*"] ?? [];
    const tracedFiles = globSync(includes, { cwd: applicationRoot }).map(
      (file) => path.resolve(applicationRoot, file),
    );

    expect(config.output).toBe("standalone");
    expect(tracedFiles).toContain(wasm);
  });

  it("initializes the native WASM parser and parses a PostgreSQL statement", async () => {
    const { parse } = requireFromApplication("libpg-query") as typeof import("libpg-query");
    const result = await parse("SELECT 1 AS value");

    expect(result.stmts).toHaveLength(1);
    expect(result.stmts[0].stmt).toHaveProperty("SelectStmt");
  });
});

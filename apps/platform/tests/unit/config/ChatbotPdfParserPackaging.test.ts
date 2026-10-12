import { globSync } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../config/load-environment.js", () => ({
  loadEnvironment: () => undefined,
}));

import config from "../../../next.config.mjs";

const applicationRoot = fileURLToPath(new URL("../../../", import.meta.url));
const repositoryRoot = path.resolve(applicationRoot, "../..");

describe("chatbot PDF parser packaging", () => {
  it("extracts PDF text in an isolated runtime with the traced canvas assets", async () => {
    const includes =
      config.outputFileTracingIncludes?.[
        "/api/admin/chatbot/knowledge/documents"
      ] ?? [];
    const tracedFiles = globSync(includes, { cwd: applicationRoot }).map(
      (file) => path.resolve(applicationRoot, file),
    );

    expect(config.output).toBe("standalone");
    expect(config.serverExternalPackages).toContain("pdf-parse");
    expect(tracedFiles).toContain(
      path.join(repositoryRoot, "node_modules/@napi-rs/canvas/index.js"),
    );
    expect(tracedFiles.some((file) => file.endsWith(".node"))).toBe(true);

    const runtimeRoot = await mkdtemp(path.join(tmpdir(), "chatbot-pdf-"));
    try {
      // Regular imports supply these packages. Canvas must come from tracing
      // because PDF.js discovers it using process.getBuiltinModule at runtime.
      for (const packageName of ["pdf-parse", "pdfjs-dist"]) {
        await cp(
          path.join(repositoryRoot, "node_modules", packageName),
          path.join(runtimeRoot, "node_modules", packageName),
          { recursive: true },
        );
      }
      for (const file of tracedFiles) {
        const destination = path.join(
          runtimeRoot,
          path.relative(repositoryRoot, file),
        );
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(file, destination);
      }
      await copyFile(
        path.join(
          applicationRoot,
          "tests/fixtures/chatbot/documents/programme-guide.pdf",
        ),
        path.join(runtimeRoot, "guide.pdf"),
      );

      const parserUrl = pathToFileURL(
        path.join(
          runtimeRoot,
          "node_modules/pdf-parse/dist/pdf-parse/esm/index.js",
        ),
      );
      const { PDFParse } = await import(/* @vite-ignore */ parserUrl.href);
      const parser = new PDFParse({
        data: await readFile(path.join(runtimeRoot, "guide.pdf")),
      });
      try {
        expect((await parser.getText()).text).toContain(
          "approved public policy for small businesses",
        );
      } finally {
        await parser.destroy();
      }
    } finally {
      await rm(runtimeRoot, { recursive: true, force: true });
    }
  }, 20000);
});

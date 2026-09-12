import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve(import.meta.dirname, "../../../src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(entryPath);
    }

    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

function read(relativePath: string) {
  return readFileSync(path.join(sourceRoot, relativePath), "utf8");
}

describe("client data-access boundaries", () => {
  it("keeps fetch calls out of client components", () => {
    const componentFiles = sourceFiles(path.join(sourceRoot, "components"));

    for (const file of componentFiles) {
      const source = readFileSync(file, "utf8");
      if (source.startsWith('"use client"')) {
        expect(source, file).not.toMatch(/\bfetch\s*\(/);
      }
    }
  });

  it("keeps server data modules out of client components", () => {
    const componentFiles = sourceFiles(path.join(sourceRoot, "components"));
    const forbiddenImport = /from ["'](?:@\/db|@payload-config|firebase-admin|server-only)/;

    for (const file of componentFiles) {
      const source = readFileSync(file, "utf8");
      if (source.startsWith('"use client"')) {
        expect(source, file).not.toMatch(forbiddenImport);
      }
    }
  });

  it("provides TanStack Query outside Payload only", () => {
    const platformLayouts = [
      "app/(auth)/layout.tsx",
      "app/(operations)/admin/layout.tsx",
      "app/(portal)/portal/layout.tsx",
      "app/(public)/layout.tsx",
    ];

    for (const layout of platformLayouts) {
      expect(read(layout), layout).toContain("<QueryProvider>");
    }

    expect(read("app/(payload)/layout.tsx")).not.toContain("QueryProvider");
  });
});

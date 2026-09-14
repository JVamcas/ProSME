import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve(import.meta.dirname, "../../../src");

const forbiddenGenericComponentFolders = [
  "application",
  "businesses",
  "dashboard",
  "eligibility",
  "profile",
];

const servicePairs = [
  ["applications", "Application"],
  ["businesses", "Business"],
  ["engagement", "Engagement"],
  ["funding-opportunities", "FundingOpportunity"],
  ["profiles", "Profile"],
] as const;

describe("P3.2.1 source ownership convention", () => {
  it("does not hide feature ownership in generic component folders", () => {
    for (const folder of forbiddenGenericComponentFolders) {
      expect(existsSync(path.join(sourceRoot, "components", folder))).toBe(false);
    }
  });

  it("does not turn application states or route groups into file families", () => {
    const ownedRoots = [
      path.join(sourceRoot, "components/applicant"),
      path.join(sourceRoot, "components/admin"),
      path.join(sourceRoot, "modules"),
    ];
    const files = ownedRoots.flatMap((root) =>
      readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name),
    );

    expect(files).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Draft|^Operations/),
      ]),
    );
  });

  it("names flattened client and server services explicitly", () => {
    for (const [domain, name] of servicePairs) {
      const directory = path.join(sourceRoot, "modules", domain);
      expect(existsSync(path.join(directory, `Client${name}Service.ts`))).toBe(true);
      expect(existsSync(path.join(directory, `Server${name}Service.ts`))).toBe(true);
    }
  });

  it("keeps client services browser-only and server services server-only", () => {
    for (const [domain, name] of servicePairs) {
      const directory = path.join(sourceRoot, "modules", domain);
      const client = readFileSync(path.join(directory, `Client${name}Service.ts`), "utf8");
      const server = readFileSync(path.join(directory, `Server${name}Service.ts`), "utf8");
      expect(client.startsWith('"use client"')).toBe(true);
      expect(client).not.toMatch(/@\/db|server-only|firebase-admin/);
      expect(server).toContain('import "server-only"');
    }
  });

  it("uses explicit applicant and admin API namespaces", () => {
    expect(existsSync(path.join(sourceRoot, "app/api/applications"))).toBe(false);
    expect(existsSync(path.join(sourceRoot, "app/api/admin/applications/route.ts"))).toBe(true);
    expect(existsSync(path.join(sourceRoot, "app/api/portal/businesses/route.ts"))).toBe(true);
  });
});

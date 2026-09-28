import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const lifecycle = readFileSync(
  path.resolve(process.cwd(), "drizzle/0134_complete_funding_call_lifecycle.sql"),
  "utf8",
);
const coi = readFileSync(
  path.resolve(process.cwd(), "drizzle/0135_bind_workflow_coi_form.sql"),
  "utf8",
);

describe("remaining funding call lifecycle migrations", () => {
  it("adds narrow permissions for every exceptional command", () => {
    for (const code of ["suspend", "resume", "withdraw", "archive"]) {
      expect(lifecycle).toContain(`'funding.call.${code}'`);
    }
  });

  it("binds and audits the exact COI form version", () => {
    expect(coi).toContain("coi_form_version_id");
    expect(coi).toContain("app_workflow_application_coi_events");
    expect(coi).toContain("app_workflow_versions_coi_form_version_fk");
  });
});

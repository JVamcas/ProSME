import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const lifecycle = readFileSync(
  path.resolve(process.cwd(), "drizzle/0134_complete_funding_call_lifecycle.sql"),
  "utf8",
);
const coi = readFileSync(
  path.resolve(process.cwd(), "drizzle/0137_stage_bound_coi_forms.sql"),
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
    expect(coi).toContain("app_workflow_stage_definitions");
    expect(coi).toContain("app_workflow_application_coi_events");
    expect(coi).toContain("app_workflow_stages_coi_form_version_fk");
    expect(coi).toContain(
      "PRIMARY KEY (application_id, user_id, form_version_id)",
    );
    expect(coi).toMatch(
      /DISABLE TRIGGER app_workflow_stages_immutable[\s\S]+UPDATE app_workflow_stage_definitions[\s\S]+ENABLE TRIGGER app_workflow_stages_immutable/,
    );
  });
});

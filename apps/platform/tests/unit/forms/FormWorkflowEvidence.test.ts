import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
import { getDatabase } from "@/db/client";
import { resolveFormEvidenceValues } from "@/modules/forms/infrastructure/FormWorkflowEvidenceRepository";
import type { FormField } from "@/modules/forms/FormTypes";

const execute = vi.fn();
const field: FormField = {
  key: "EVIDENCE_FIELD",
  sectionId: "section",
  label: "Evidence",
  type: "DOCUMENT",
  required: true,
  order: 1,
  columnSpan: 1,
  workflowDocument: {
    stableKey: "EVIDENCE",
    acceptedFileTypes: ["PDF"],
    maximumSizeMb: 10,
    expiryDays: null,
    requestOnStageActivation: false,
    uploader: "APPLICANT",
    verifier: "STAFF",
    templateReference: "",
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

describe("form workflow evidence resolution", () => {
  it("replaces browser document claims with evidence from this task and run", async () => {
    execute.mockResolvedValue({
      rows: [{ key: "EVIDENCE", id: "actual-version" }],
    });
    expect(
      await resolveFormEvidenceValues("task-id", [field], {
        EVIDENCE_FIELD: "forged-version",
        NOTES: "note",
      }),
    ).toEqual({ EVIDENCE_FIELD: "actual-version", NOTES: "note" });
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
    expect(query.params).toContain("task-id");
    expect(query.sql).toContain(
      "requirement.task_definition_id = task.workflow_task_definition_id",
    );
    expect(query.sql).toContain(
      "document_owner.stage_instance_id = document_target.stage_instance_id",
    );
    expect(query.sql).toContain(
      "newer_version.version_number > candidate.version_number",
    );
  });
  it("removes forged evidence when no current upload exists", async () => {
    execute.mockResolvedValue({ rows: [] });
    expect(
      await resolveFormEvidenceValues("task-id", [field], {
        EVIDENCE_FIELD: "forged-version",
      }),
    ).toEqual({});
  });
  it("avoids database reads for ordinary forms", async () => {
    expect(
      await resolveFormEvidenceValues("task-id", [], { NAME: "name" }),
    ).toEqual({ NAME: "name" });
    expect(execute).not.toHaveBeenCalled();
  });
});

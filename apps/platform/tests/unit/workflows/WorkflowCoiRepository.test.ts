import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readTaskCoiGate } from "@/modules/workflows/infrastructure/WorkflowCoiRepository";

const actorId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const execute = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue({ rows: [] });
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

describe("workflow COI gate projection", () => {
  it("reuses clearance only for the same application, reviewer and form", async () => {
    await expect(readTaskCoiGate(actorId, taskId)).resolves.toBeNull();

    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("app_workflow_application_coi");
    expect(query.sql).toContain(
      "clearance.application_id = workflow.application_id",
    );
    expect(query.sql).toContain("clearance.user_id =");
    expect(query.sql).toContain(
      "clearance.form_version_id = stage_definition.coi_form_version_id",
    );
    expect(query.params).toContain(actorId);
    expect(query.params).toContain(taskId);
  });
});

describe("atomic COI answer capture", () => {
  async function write(patch: Record<string, unknown> = {}) {
    const { changeTaskCoi } = await import("@/modules/workflows/infrastructure/WorkflowCoiRepository");
    const values = { HAS_CONFLICT: false, SIGNATURE: "Reviewer", CONSENT: true, TOTAL: 0, OPTIONAL: false };
    const form = { displayMode: "SINGLE_PAGE" as const, fields: [], sections: [], instructions: null,
      submitLabel: "Declare", versionId: "33333333-3333-4333-8333-333333333333", versionNumber: 2 };
    execute.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{
      applicationId: "44444444-4444-4444-8444-444444444444",
      assignedUserId: actorId, coiFormVersionId: form.versionId,
      gated: true, rowVersion: 2, state: null, status: "PENDING", ...patch,
    }] });
    const transaction = vi.fn(async (callback) => callback({ execute }));
    vi.mocked(getDatabase).mockReturnValue({ transaction } as never);
    const result = await changeTaskCoi({
      actorId, taskId, expectedRowVersion: 2, decision: "NO_CONFLICT", independentReview: false,
      declaration: { formVersionId: form.versionId, values, form },
    });
    return { result, transaction, values, form };
  }

  it("writes the full answers and exact version snapshot with the clearance in one transaction", async () => {
    const { result, transaction, values, form } = await write();
    expect(result).toEqual({ state: "CLEARED_NO_CONFLICT" });
    expect(transaction).toHaveBeenCalledTimes(1);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[3]![0]);
    expect(query.sql).toContain("form_values, form_definition_snapshot");
    expect(query.params).toContain(JSON.stringify(values));
    expect(query.params).toContain(JSON.stringify(form));
    expect(query.params).toContain(form.versionId);
  });

  it.each([
    { coiFormVersionId: "55555555-5555-4555-8555-555555555555" },
    { assignedUserId: "55555555-5555-4555-8555-555555555555" },
    { state: "PENDING_REVIEW" },
    { rowVersion: 3 },
  ])("rejects changed context under the transaction lock: %j", async (patch) => {
    const { result } = await write(patch);
    expect(result).toBeNull();
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

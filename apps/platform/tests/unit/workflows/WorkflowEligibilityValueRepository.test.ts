import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { readEligibilityQuestionResponseRecords } from "@/modules/workflows/infrastructure/WorkflowEligibilityValueRepository";

const applicationId = "10000000-0000-4000-8000-000000000001";
const questionId = "20000000-0000-4000-8000-000000000001";
const responseId = "30000000-0000-4000-8000-000000000001";

const request = {
  applicationId,
  binding: {
    sourceDefinitionId: questionId,
    sourceKey: "ENTITY_REGISTERED",
    sourceKind: "ELIGIBILITY_QUESTION_RESPONSE" as const,
    sourceVersionId: "40000000-0000-4000-8000-000000000001",
    valuePath: "value",
  },
  evaluatedAt: new Date("2026-09-26T09:00:00.000Z"),
  input: {} as never,
};

describe("eligibility question response projection", () => {
  it("binds the executing task as the response scope", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const taskId = "50000000-0000-4000-8000-000000000001";
    await readEligibilityQuestionResponseRecords(
      [request],
      { execute } as never,
      taskId,
    );
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("response.workflow_task_id = $3::uuid");
    expect(query.params).toEqual([applicationId, taskId, taskId, questionId]);
  });
  it("reads the ruleset-bound form response for the application, including a draft", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          code: "ENTITY_REGISTERED",
          questionId,
          responseId,
          value: "YES",
          versionId: request.binding.sourceVersionId,
        },
      ],
    });
    const records = await readEligibilityQuestionResponseRecords([request], {
      execute,
    } as never);

    expect(records).toEqual([
      {
        sourceDefinitionId: questionId,
        sourceKey: "ENTITY_REGISTERED",
        sourceRecordId: responseId,
        sourceVersionId: request.binding.sourceVersionId,
        values: { value: "YES" },
      },
    ]);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("app_eligibility_rule_set_verification_forms");
    expect(query.sql).toContain(
      "response.form_version_id = verification.form_version_id",
    );
    expect(query.sql).toContain("response.status IN ('DRAFT', 'COMPLETED')");
    expect(query.sql).toContain("WHERE application.id =");
    expect(query.params).toContain(applicationId);
    expect(query.params).toContain(questionId);
    expect(query.sql).toContain("binding.question_id IN ($4::uuid)");
  });

  it("binds multiple question ids as UUID values rather than a SQL tuple", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const anotherId = "20000000-0000-4000-8000-000000000002";

    await readEligibilityQuestionResponseRecords(
      [
        request,
        {
          ...request,
          binding: { ...request.binding, sourceDefinitionId: anotherId },
        },
      ],
      { execute } as never,
    );

    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("binding.question_id IN ($4::uuid, $5::uuid)");
    expect(query.params).toEqual([
      applicationId,
      null,
      null,
      questionId,
      anotherId,
    ]);
  });
});

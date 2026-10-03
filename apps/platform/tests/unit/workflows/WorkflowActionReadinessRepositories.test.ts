import { describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { loadRequiredTaskCompletions } from "@/modules/workflows/infrastructure/StageCompletionRepository";
import { evaluateStageQuorum } from "@/modules/workflows/infrastructure/WorkflowQuorumRepository";
import { readWorkflowActionTaskReadiness } from "@/modules/workflows/infrastructure/WorkflowActionTaskReadinessRepository";
import type { QuorumRule } from "@/modules/workflows/domain/runtime/Quorum";

const rule: QuorumRule = {
  population: "REGISTERED",
  minimumCount: 1,
  minimumPercentage: null,
  rounding: "CEIL",
  chairRequired: true,
  recusalDenominator: "EXCLUDE",
  freeze: "AT_DECISION",
  abstentionsCountAsPresent: true,
};
const input = {
  actorId: "actor",
  stageDefinitionId: "stage-definition",
  stageInstanceId: "stage-instance",
};

function quorumDatabase() {
  const where = vi.fn().mockResolvedValue([
    { id: "registered", quorumRule: rule },
    { id: "assigned", quorumRule: { ...rule, population: "ASSIGNED_TASKS" } },
  ]);
  const values = vi.fn().mockResolvedValue(undefined);
  const database = {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })),
    execute: vi.fn().mockResolvedValue({ rows: [
      {
        taskDefinitionId: "registered",
        userId: "chair",
        isChair: true,
        attendance: "PRESENT",
        coiCleared: true,
        abstained: false,
      },
      {
        taskDefinitionId: "assigned",
        userId: "other-chair",
        isChair: true,
        attendance: "PRESENT",
        coiCleared: true,
        abstained: false,
      },
    ] }),
    insert: vi.fn(() => ({ values })),
  };
  return { database, values, where };
}

describe("workflow action quorum reads", () => {
  it("batches populations and leaves audit records untouched during availability", async () => {
    const { database } = quorumDatabase();
    expect(await evaluateStageQuorum(database as never, {
      ...input,
      recordEvaluation: false,
    })).toBe(true);
    expect(database.execute).toHaveBeenCalledOnce();
    expect(database.insert).not.toHaveBeenCalled();
    const query = new PgDialect().sqlToQuery(database.execute.mock.calls[0][0]);
    expect(query.sql).toContain("UNION ALL");
    expect(query.sql).toContain("successor.supersedes_task_id = task.id");
    expect(query.sql).toContain("app_user.status = 'active'");
    expect(query.params).toContain("assigned");
    expect(query.params).toContain("registered");
  });

  it("keeps participants scoped to their definition and records failed quorum at execution", async () => {
    const { database, values } = quorumDatabase();
    database.execute.mockResolvedValue({ rows: [] });
    expect(await evaluateStageQuorum(database as never, input)).toBe(false);
    expect(values).toHaveBeenCalledTimes(2);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      taskDefinitionId: "assigned",
      satisfied: false,
      presentUserIds: [],
    }));
  });

  it("denies a definition with no rule", async () => {
    const { database, where } = quorumDatabase();
    where.mockResolvedValue([{ id: "invalid", quorumRule: null }] as never);
    expect(await evaluateStageQuorum(database as never, {
      ...input,
      recordEvaluation: false,
    })).toBe(false);
    expect(database.execute).not.toHaveBeenCalled();
  });

  it("allows stages without a quorum definition", async () => {
    const { database, where } = quorumDatabase();
    where.mockResolvedValue([]);
    expect(await evaluateStageQuorum(database as never, input)).toBe(true);
    expect(database.execute).not.toHaveBeenCalled();
    expect(database.insert).not.toHaveBeenCalled();
  });
});

describe("workflow action task readiness reads", () => {
  it.each([
    ["STAGE_DECISION", {}, false, true, true],
    ["STAGE_DECISION", {}, false, false, false],
    ["CONTRIBUTING", {}, false, true, false],
    ["STAGE_DECISION", {}, true, true, false],
    ["STAGE_DECISION", {
      command: "AUTHORITATIVE_ELIGIBILITY",
      reevaluationPolicy: "WHEN_EVIDENCE_CHANGED",
    }, false, true, false],
    ["STAGE_DECISION", {
      formPurpose: "ELIGIBILITY_VERIFICATION",
    }, false, true, false],
  ])(
    "previews form submission only for decision work: %s %s %s %s",
    async (taskType, config, hasChecklist, preview, expected) => {
      const limit = vi.fn().mockResolvedValue([{
        taskType,
        config,
        hasChecklist,
        formRequired: true,
        formCompleted: false,
        result: {},
      }]);
      const database = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({ limit })),
            })),
          })),
        })),
      };
      expect(await readWorkflowActionTaskReadiness(
        database as never,
        "task",
        preview,
      )).toEqual({ hasOpenRfi: false, workReady: expected });
    },
  );

  it.each([
    [[], { hasOpenRfi: false, workReady: false }],
    [[{ config: {}, formRequired: true, formCompleted: false, hasChecklist: false, result: {} }],
      { hasOpenRfi: false, workReady: false }],
    [[{ config: {}, formRequired: true, formCompleted: true, hasChecklist: false, result: {}, hasOpenRfi: true }],
      { hasOpenRfi: true, workReady: true }],
    [[{ config: {}, formRequired: false, hasChecklist: false, result: {},
      documentRequirements: [{ mandatory: true, evidenceUploaded: false }] }],
      { hasOpenRfi: false, workReady: false }],
    [[{ config: {}, formRequired: false, hasChecklist: false, result: {},
      documentRequirements: [{ mandatory: true, evidenceUploaded: true }] }],
      { hasOpenRfi: false, workReady: true }],
  ])("reports missing work and open requests: %s", async (rows, expected) => {
    const limit = vi.fn().mockResolvedValue(rows);
    const where = vi.fn(() => ({ limit }));
    const database = {
      select: vi.fn<(projection: Record<string, SQL>) => unknown>().mockReturnValue({
        from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where })) })),
      }),
    };
    expect(await readWorkflowActionTaskReadiness(database as never, "task")).toEqual(expected);
    const projection = database.select.mock.calls[0][0];
    const dialect = new PgDialect();
    expect(dialect.sqlToQuery(projection.hasOpenRfi).sql).toContain("rfi.status = 'OPEN'");
    expect(dialect.sqlToQuery(projection.documentRequirements).sql)
      .toContain("app_workflow_task_document_evidence");
    expect(dialect.sqlToQuery(projection.formCompleted).sql).toContain("evaluatedFormValues");
    expect(dialect.sqlToQuery(projection.formCompleted).sql).toContain("'formPurpose' = 'ELIGIBILITY_VERIFICATION'");
    expect(limit).toHaveBeenCalledWith(1);
  });
});


describe("prospective stage completion projection", () => {
  it("scopes form submission preview to the selected non-eligibility decision task", async () => {
    const database = { execute: vi.fn().mockResolvedValue({ rows: [] }) };
    await loadRequiredTaskCompletions(database as never, "stage", "decision-task", true);
    const query = new PgDialect().sqlToQuery(database.execute.mock.calls[0][0]);
    expect(query.params).toContain(true);
    expect(query.params).toContain("decision-task");
    expect(query.sql).toContain("definition.task_type = 'STAGE_DECISION'");
    expect(query.sql).toContain("ELIGIBILITY_VERIFICATION");
    expect(query.sql).toContain("response.status = 'COMPLETED'");
    expect(query.sql).toContain("app_workflow_task_coi_cleared");
    expect(query.sql).toContain("successor.supersedes_task_id = task.id");
  });

  it("counts only completed work or the current pending task with clearance and form evidence", async () => {
    const database = { execute: vi.fn().mockResolvedValue({ rows: [] }) };
    await loadRequiredTaskCompletions(database as never, "stage", "current-task");
    const query = new PgDialect().sqlToQuery(database.execute.mock.calls[0][0]);
    expect(query.params).toContain("current-task");
    expect(query.params).toContain("stage");
    expect(query.sql).toContain("task.status IN ('PENDING', 'IN_PROGRESS')");
    expect(query.sql).toContain("app_workflow_task_coi_cleared(task.id, task.assigned_user_id)");
    expect(query.sql).toContain("successor.supersedes_task_id = task.id");
    expect(query.sql).toContain("response.status = 'COMPLETED'");
    expect(query.sql).toContain('AS "completedCount"');
    expect(query.sql).toContain("definition.config ->> 'formPurpose' = 'ELIGIBILITY_VERIFICATION'");
    expect(query.sql).toContain("definition.required = TRUE");
  });
});

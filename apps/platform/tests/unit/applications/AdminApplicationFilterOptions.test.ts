import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { getDatabase } from "@/platform/database/client";
import { readAdminApplicationFilterOptions } from "@/modules/applications/infrastructure/AdminApplicationFilterOptionsRepository";
import { getAdminApplicationFilterOptions } from "@/modules/applications/ServerAdminApplicationService";
import { permissionCodes } from "@/auth/authorization/permissions";
import { workflowTaskActorFixture } from "../../support/WorkflowTaskServiceFixture";
const execute = vi.fn();
const actorId = "20000000-0000-4000-8000-000000000002";
function actor(codes: string[]) {
  return {
    ...workflowTaskActorFixture,
    id: actorId,
    capabilities: new Set(codes),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
  execute.mockResolvedValue({
    rows: [
      {
        kind: "call",
        id: "30000000-0000-4000-8000-000000000003",
        label: "Growth call",
      },
      { kind: "stage", id: "Screening", label: "Screening" },
    ],
  });
});
it("selects distinct options in SQL within the actor's assignment scope", async () => {
  const options = await readAdminApplicationFilterOptions({
    actorId,
    visibility: "assigned",
  });
  expect(options.fundingCalls).toEqual([
    { id: "30000000-0000-4000-8000-000000000003", label: "Growth call" },
  ]);
  expect(options.stages).toEqual([{ id: "Screening", label: "Screening" }]);
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
  expect(query.sql).toContain("GROUP BY call_id");
  expect(query.sql).toContain("SELECT DISTINCT 'stage'");
  expect(query.sql).toContain("FROM app_workflow_stage_definitions");
  expect(query.sql).not.toContain("current_stage_instance_id");
  expect(query.sql).toContain("ORDER BY label DESC, id DESC");
  expect(query.sql).toContain("visible_task.assigned_user_id");
  expect(query.sql).toMatch(
    /LEFT JOIN app_workflow_instances workflow\s+ON workflow.application_id = application.id/,
  );
  expect(query.sql).toContain(
    "visible_stage.workflow_instance_id = workflow.id",
  );
  expect(query.params).toContain(actorId);
  expect(execute).toHaveBeenCalledTimes(1);
});
it("denies options without application access before querying", async () => {
  await expect(getAdminApplicationFilterOptions(actor([]))).rejects.toThrow();
  expect(execute).not.toHaveBeenCalled();
});
it.each([
  [permissionCodes.workflowTaskAssignedRead, true],
  [permissionCodes.fundingApplicationAllRead, false],
] as const)("uses appropriate option scope for %s", async (code, assigned) => {
  await getAdminApplicationFilterOptions(actor([code]));
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
  expect(query.sql.includes("visible_task.assigned_user_id")).toBe(assigned);
  if (!assigned) {
    expect(query.sql).toContain("AND TRUE");
    expect(query.params).not.toContain(actorId);
  }
});

import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readWorkflowTakenPaths } from "@/modules/workflows/infrastructure/WorkflowProgressRepository";

const pathWhere = vi.fn();
const pathLeftJoin = vi.fn(() => ({
  leftJoin: pathLeftJoin,
  where: pathWhere,
}));
const pathFrom = vi.fn(() => ({ leftJoin: pathLeftJoin }));
const selectDistinct = vi.fn(() => ({ from: pathFrom }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ selectDistinct } as never);
});

describe("workflow taken path projection", () => {
  it("selects distinct executed branches in the instance scope and excludes unsuccessful targets", async () => {
    const paths = [
      { transitionId: "route-one", targetStageKey: "technical" },
      { transitionId: "terminal-route", targetStageKey: null },
    ];
    pathWhere.mockResolvedValue(paths);
    await expect(readWorkflowTakenPaths("instance-id")).resolves.toEqual(paths);
    expect(selectDistinct).toHaveBeenCalledWith({
      transitionId: expect.anything(),
      targetStageKey: expect.anything(),
    });
    const query = new PgDialect().sqlToQuery(pathWhere.mock.calls[0][0]);
    expect(query.sql).toContain(
      '"app_workflow_transition_executions"."workflow_instance_id"',
    );
    expect(query.params).toEqual([
      "instance-id",
      "ACTIVATED",
      "ALREADY_ACTIVE",
      "JOIN_PENDING",
      "WORKFLOW_COMPLETED",
      "WORKFLOW_REJECTED",
    ]);
    expect(query.params).not.toContain("ENTRY_CONDITION_FAILED");
    expect(query.params).not.toContain("RECORDED");
  });

  it("returns no highlighted paths before a transition has executed", async () => {
    pathWhere.mockResolvedValue([]);
    await expect(readWorkflowTakenPaths("instance-id")).resolves.toEqual([]);
  });
});
